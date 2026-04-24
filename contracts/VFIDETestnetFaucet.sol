// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title VFIDETestnetFaucet
 * @notice Automated distribution of testnet VFIDE + gas ETH to new users
 *
 * HOW IT WORKS:
 *   1. Fund this contract with VFIDE tokens and ETH
 *   2. New user registers via the frontend (calls /api/faucet/claim)
 *   3. API backend calls claim(user, referrer) with the operator key
 *   4. User receives VFIDE + a small amount of gas ETH
 *   5. Referrer is recorded on-chain for headhunter rewards
 *   6. User's vault is auto-created by the VFIDE transfer
 *
 * ANTI-ABUSE:
 *   - Each address can only claim once
 *   - Only authorized operators can trigger claims (prevents direct calls)
 *   - Daily claim cap prevents draining
 *   - Per-claim amount is fixed
 */

interface IEcosystemVault_Faucet {
    function registerUserReferral(address referrer, address user) external;
}

error Faucet_Zero();
error Faucet_AlreadyClaimed();
error Faucet_NotOperator();
error Faucet_DailyCapReached();
error Faucet_InsufficientVFIDE();
error Faucet_InsufficientETH();
error Faucet_ETHTransferFailed();
error Faucet_UnsupportedChain();
error Faucet_ReferrerNotEligible();
error Faucet_OperatorDailyCapReached();
error Faucet_NoPendingWithdraw();
error Faucet_WithdrawTimelockActive();

contract VFIDETestnetFaucet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint64 public constant WITHDRAW_DELAY = 24 hours;

    IERC20 public immutable vfideToken;
    
    address public owner;
    mapping(address => bool) public operators;      // Backend wallets that can trigger claims
    mapping(address => bool) public hasClaimed;     // One claim per address
    mapping(address => address) public referredBy;   // Who invited this user
    mapping(address => uint256) public operatorClaimsToday;
    mapping(address => uint256) public operatorDayStart;
    
    uint256 public claimAmountVFIDE = 1000e18;      // 1,000 VFIDE per new user
    uint256 public claimAmountETH = 0.005 ether;    // 0.005 ETH for gas (~50 transactions)
    
    uint256 public dailyClaimCap = 100;             // Max 100 claims per day
    uint256 public operatorDailyClaimCap = 20;      // Max claims per operator per day
    uint256 public claimsToday;
    uint256 public dayStart;
    
    uint256 public totalClaimed;
    uint256 public totalUsers;
    address public ecosystemVault;
    address public pendingWithdrawRecipient;
    uint64 public pendingWithdrawAt;
    
    event Claimed(address indexed user, address indexed referrer, uint256 vfideAmount, uint256 ethAmount);
    event BatchClaimProcessed(address indexed user, address indexed referrer, uint256 vfideAmount, uint256 ethAmount, bool ethTransferFailed);
    event OperatorSet(address indexed operator, bool active);
    event ClaimAmountsSet(uint256 vfide, uint256 eth);
    event DailyCapSet(uint256 cap);
    event OperatorDailyCapSet(uint256 cap);
    event EcosystemVaultSet(address indexed ecosystemVault);
    event ETHDeposited(address indexed depositor, uint256 amount);
    event WithdrawScheduled(address indexed recipient, uint64 executeAfter);
    event WithdrawCancelled(address indexed recipient);
    event WithdrawExecuted(address indexed recipient, uint256 vfideAmount, uint256 ethAmount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Faucet: not owner");
        _;
    }
    
    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner) revert Faucet_NotOperator();
        _;
    }
    
    constructor(address _vfideToken, address _owner) {
        if (_vfideToken == address(0) || _owner == address(0)) revert Faucet_Zero();
        if (!_isSupportedTestnetChain(block.chainid)) revert Faucet_UnsupportedChain();
        vfideToken = IERC20(_vfideToken);
        owner = _owner;
        operators[_owner] = true;
        dayStart = block.timestamp;
        operatorDayStart[_owner] = block.timestamp;
    }
    
    /// @notice Claim testnet VFIDE + gas ETH for a new user
    /// @param user The new user's address
    /// @param referrer Who invited them (address(0) if no referrer)
    /// @dev Only callable by operators (backend API wallet)
    function claim(address user, address referrer) external onlyOperator nonReentrant {
        if (user == address(0)) revert Faucet_Zero();
        if (hasClaimed[user]) revert Faucet_AlreadyClaimed();
        
        // Daily cap
        _refreshDay();
        _refreshOperatorDay(msg.sender);
        if (claimsToday >= dailyClaimCap) revert Faucet_DailyCapReached();
        if (operatorClaimsToday[msg.sender] >= operatorDailyClaimCap) revert Faucet_OperatorDailyCapReached();
        
        // Check balances
        uint256 vfideBalance = vfideToken.balanceOf(address(this));
        if (vfideBalance < claimAmountVFIDE) revert Faucet_InsufficientVFIDE();
        if (address(this).balance < claimAmountETH) revert Faucet_InsufficientETH();
        
        // Mark claimed
        hasClaimed[user] = true;
        claimsToday++;
        operatorClaimsToday[msg.sender]++;
        totalClaimed += claimAmountVFIDE;
        totalUsers++;
        
        // Record referral
        if (referrer != address(0)) {
            if (referrer == user || !hasClaimed[referrer]) revert Faucet_ReferrerNotEligible();
            referredBy[user] = referrer;
            _registerReferral(referrer, user);
        }
        
        // Send VFIDE (this triggers vault auto-creation via ensureVault)
        vfideToken.safeTransfer(user, claimAmountVFIDE);
        
        // Send gas ETH
        (bool sent, ) = user.call{value: claimAmountETH}("");
        if (!sent) revert Faucet_ETHTransferFailed();
        
        emit Claimed(user, referrer, claimAmountVFIDE, claimAmountETH);
    }
    
    /// @notice Batch claim for multiple users at once
    /// @param users Array of user addresses
    /// @param referrers Array of referrer addresses (same length, address(0) for no referrer)
    // slither-disable-next-line reentrancy-benign
    function batchClaim(address[] calldata users, address[] calldata referrers) external onlyOperator nonReentrant {
        require(users.length == referrers.length, "Faucet: length mismatch");
        require(users.length <= 50, "Faucet: batch too large");
        
        _refreshDay();
        _refreshOperatorDay(msg.sender);
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (user == address(0) || hasClaimed[user]) continue;
            if (claimsToday >= dailyClaimCap) break;
            if (operatorClaimsToday[msg.sender] >= operatorDailyClaimCap) break;
            
            uint256 vfideBalance = vfideToken.balanceOf(address(this));
            if (vfideBalance < claimAmountVFIDE) break;
            if (address(this).balance < claimAmountETH) break;
            
            hasClaimed[user] = true;
            claimsToday++;
            operatorClaimsToday[msg.sender]++;
            totalClaimed += claimAmountVFIDE;
            totalUsers++;
            
            if (referrers[i] != address(0)) {
                if (referrers[i] == user || !hasClaimed[referrers[i]]) revert Faucet_ReferrerNotEligible();
                referredBy[user] = referrers[i];
                _registerReferral(referrers[i], user);
            }
            
            vfideToken.safeTransfer(user, claimAmountVFIDE);
            (bool sent, ) = user.call{value: claimAmountETH}("");
            // Don't revert on ETH failure in batch — record the outcome and continue.
            emit BatchClaimProcessed(user, referrers[i], claimAmountVFIDE, claimAmountETH, !sent);
        }
    }
    
    // ── Admin ────────────────────────────────────────────────
    
    function setOperator(address operator, bool active) external onlyOwner {
        if (operator == address(0)) revert Faucet_Zero();
        operators[operator] = active;
        emit OperatorSet(operator, active);
    }
    
    function setClaimAmounts(uint256 _vfide, uint256 _eth) external onlyOwner {
        require(_vfide > 0, "Faucet: zero VFIDE");
        claimAmountVFIDE = _vfide;
        claimAmountETH = _eth;
        emit ClaimAmountsSet(_vfide, _eth);
    }
    
    function setDailyCap(uint256 _cap) external onlyOwner {
        dailyClaimCap = _cap;
        emit DailyCapSet(_cap);
    }

    function setOperatorDailyCap(uint256 _cap) external onlyOwner {
        require(_cap > 0, "Faucet: zero cap");
        operatorDailyClaimCap = _cap;
        emit OperatorDailyCapSet(_cap);
    }

    // slither-disable-next-line missing-zero-check
    function setEcosystemVault(address _ecosystemVault) external onlyOwner {
        ecosystemVault = _ecosystemVault;
        emit EcosystemVaultSet(_ecosystemVault);
    }
    
    /// @notice Queue a faucet withdrawal behind a short timelock.
    function scheduleWithdraw(address to) external onlyOwner {
        if (to == address(0)) revert Faucet_Zero();
        pendingWithdrawRecipient = to;
        pendingWithdrawAt = uint64(block.timestamp) + WITHDRAW_DELAY;
        emit WithdrawScheduled(to, pendingWithdrawAt);
    }

    function cancelWithdraw() external onlyOwner {
        address recipient = pendingWithdrawRecipient;
        if (pendingWithdrawAt == 0) revert Faucet_NoPendingWithdraw();
        delete pendingWithdrawRecipient;
        delete pendingWithdrawAt;
        emit WithdrawCancelled(recipient);
    }

    /// @notice Withdraw remaining funds (owner only) after the timelock elapses.
    // slither-disable-next-line reentrancy-events
    function withdraw() external onlyOwner {
        if (pendingWithdrawAt == 0) revert Faucet_NoPendingWithdraw();
        if (block.timestamp < pendingWithdrawAt) revert Faucet_WithdrawTimelockActive();
        address to = pendingWithdrawRecipient;

        uint256 vfideBal = vfideToken.balanceOf(address(this));
        if (vfideBal > 0) vfideToken.safeTransfer(to, vfideBal);
        uint256 ethBal = address(this).balance;
        if (ethBal > 0) { (bool ok, ) = to.call{value: ethBal}(""); require(ok); }

        delete pendingWithdrawRecipient;
        delete pendingWithdrawAt;
        emit WithdrawExecuted(to, vfideBal, ethBal);
    }
    
    // ── View ─────────────────────────────────────────────────
    
    function getRemainingToday() external view returns (uint256) {
        if (block.timestamp >= dayStart + 1 days) return dailyClaimCap;
        if (claimsToday >= dailyClaimCap) return 0;
        return dailyClaimCap - claimsToday;
    }
    
    function getFaucetStatus() external view returns (
        uint256 vfideBalance,
        uint256 ethBalance,
        uint256 _totalUsers,
        uint256 _totalClaimed,
        uint256 _claimsToday,
        uint256 _dailyCap,
        uint256 _claimVFIDE,
        uint256 _claimETH
    ) {
        return (
            vfideToken.balanceOf(address(this)),
            address(this).balance,
            totalUsers,
            totalClaimed,
            block.timestamp >= dayStart + 1 days ? 0 : claimsToday,
            dailyClaimCap,
            claimAmountVFIDE,
            claimAmountETH
        );
    }
    
    function _refreshDay() internal {
        if (block.timestamp >= dayStart + 1 days) {
            dayStart = block.timestamp;
            claimsToday = 0;
        }
    }

    function _refreshOperatorDay(address operator) internal {
        if (block.timestamp >= operatorDayStart[operator] + 1 days) {
            operatorDayStart[operator] = block.timestamp;
            operatorClaimsToday[operator] = 0;
        }
    }

    function _registerReferral(address referrer, address user) internal {
        address vault = ecosystemVault;
        if (vault == address(0)) return;

        try IEcosystemVault_Faucet(vault).registerUserReferral(referrer, user) {
        } catch {
        }
    }

    function _isSupportedTestnetChain(uint256 chainId) internal pure returns (bool) {
        return (
            chainId == 84532 ||   // Base Sepolia
            chainId == 80002 ||   // Polygon Amoy
            chainId == 300 ||     // zkSync Sepolia
            chainId == 11155111 ||// Ethereum Sepolia
            chainId == 421614 ||  // Arbitrum Sepolia
            chainId == 11155420   // Optimism Sepolia
        );
    }
    
    receive() external payable {
        emit ETHDeposited(msg.sender, msg.value);
    }
}
