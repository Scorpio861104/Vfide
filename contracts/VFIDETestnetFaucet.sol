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

contract VFIDETestnetFaucet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable vfideToken;
    
    address public owner;
    mapping(address => bool) public operators;      // Backend wallets that can trigger claims
    mapping(address => bool) public hasClaimed;     // One claim per address
    mapping(address => address) public referredBy;   // Who invited this user
    
    uint256 public claimAmountVFIDE = 1000e18;      // 1,000 VFIDE per new user
    uint256 public claimAmountETH = 0.005 ether;    // 0.005 ETH for gas (~50 transactions)
    
    uint256 public dailyClaimCap = 100;             // Max 100 claims per day
    uint256 public claimsToday;
    uint256 public dayStart;
    
    uint256 public totalClaimed;
    uint256 public totalUsers;
    
    event Claimed(address indexed user, address indexed referrer, uint256 vfideAmount, uint256 ethAmount);
    event OperatorSet(address indexed operator, bool active);
    event ClaimAmountsSet(uint256 vfide, uint256 eth);
    event DailyCapSet(uint256 cap);
    event FundsDeposited(address indexed depositor, uint256 vfide, uint256 eth);
    
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
        vfideToken = IERC20(_vfideToken);
        owner = _owner;
        operators[_owner] = true;
        dayStart = block.timestamp;
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
        if (claimsToday >= dailyClaimCap) revert Faucet_DailyCapReached();
        
        // Check balances
        uint256 vfideBalance = vfideToken.balanceOf(address(this));
        if (vfideBalance < claimAmountVFIDE) revert Faucet_InsufficientVFIDE();
        if (address(this).balance < claimAmountETH) revert Faucet_InsufficientETH();
        
        // Mark claimed
        hasClaimed[user] = true;
        claimsToday++;
        totalClaimed += claimAmountVFIDE;
        totalUsers++;
        
        // Record referral
        if (referrer != address(0) && referrer != user) {
            referredBy[user] = referrer;
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
    function batchClaim(address[] calldata users, address[] calldata referrers) external onlyOperator nonReentrant {
        require(users.length == referrers.length, "Faucet: length mismatch");
        require(users.length <= 50, "Faucet: batch too large");
        
        _refreshDay();
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (user == address(0) || hasClaimed[user]) continue;
            if (claimsToday >= dailyClaimCap) break;
            
            uint256 vfideBalance = vfideToken.balanceOf(address(this));
            if (vfideBalance < claimAmountVFIDE) break;
            if (address(this).balance < claimAmountETH) break;
            
            hasClaimed[user] = true;
            claimsToday++;
            totalClaimed += claimAmountVFIDE;
            totalUsers++;
            
            if (referrers[i] != address(0) && referrers[i] != user) {
                referredBy[user] = referrers[i];
            }
            
            vfideToken.safeTransfer(user, claimAmountVFIDE);
            (bool sent, ) = user.call{value: claimAmountETH}("");
            // Don't revert on ETH failure in batch — skip and continue
            if (sent) {
                emit Claimed(user, referrers[i], claimAmountVFIDE, claimAmountETH);
            }
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
    
    /// @notice Withdraw remaining funds (owner only)
    function withdraw(address to) external onlyOwner {
        if (to == address(0)) revert Faucet_Zero();
        uint256 vfideBal = vfideToken.balanceOf(address(this));
        if (vfideBal > 0) vfideToken.safeTransfer(to, vfideBal);
        uint256 ethBal = address(this).balance;
        if (ethBal > 0) { (bool ok, ) = to.call{value: ethBal}(""); require(ok); }
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
    
    receive() external payable {
        emit FundsDeposited(msg.sender, 0, msg.value);
    }
}
