// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * VFIDEFlashLoan — Peer-to-Peer Atomic Flash Loans
 * ────────────────────────────────────────────────────────
 *
 * Individual lenders offer their own VFIDE for flash loans.
 * Borrowers borrow from a specific lender. Fees go to that lender.
 * Everything is atomic — if the borrower doesn't repay, the tx reverts.
 * No protocol pool. No common fund. Pure peer-to-peer.
 *
 * HOWEY ANALYSIS:
 *   ✅ PRONG 1 (Investment of Money): FAILS — Each lender makes an
 *      individual decision to offer their own tokens. Not pooled.
 *      Analogous to renting out your own property, not investing
 *      in a rental fund.
 *   ✅ PRONG 2 (Common Enterprise): FAILS — No pooling of funds.
 *      Each lender's balance is isolated. Lender A's returns are
 *      completely independent of Lender B. No horizontal commonality.
 *   ✅ PRONG 3 (Expectation of Profits): FAILS — Lender sets their
 *      own fee rate, manages their own liquidity, can withdraw anytime.
 *      Returns depend on the lender's own effort and decisions, not
 *      on protocol appreciation or team efforts.
 *   ✅ PRONG 4 (Efforts of Others): FAILS — Lender's returns depend
 *      on their own choices (fee rate, amount offered, whether to
 *      participate at all). Not on VFIDE team's managerial efforts.
 *   RESULT: FAILS all 4 prongs → NOT A SECURITY.
 *
 * HOW IT WORKS:
 *   LENDER SIDE:
 *     1. Lender deposits VFIDE: deposit(amount)
 *     2. Lender sets their fee rate: setFeeRate(bps)  (within protocol caps)
 *     3. Lender can withdraw anytime: withdraw(amount)
 *     4. Lender can pause their offering: setLenderPaused(true)
 *
 *   BORROWER SIDE:
 *     1. Borrower picks a lender with enough liquidity (findBestLender)
 *     2. Borrower calls flashLoan(lender, receiver, amount, maxFeeBps, data)
 *     3. Contract sends `amount` to receiver
 *     4. Receiver.onFlashLoan() executes borrower's strategy
 *     5. Contract pulls `amount + fee` back from receiver
 *     6. Fee split: 90% to lender, 10% to protocol (FeeDistributor)
 *     7. If repayment fails → entire transaction reverts
 *
 *   The lender's funds are NEVER at risk. Atomic or nothing.
 */

// ── Interfaces ──────────────────────────────────────────────────────────────

interface IERC3156FlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

/// @dev External query interface for system exemption checks.
interface ISystemExemptQuery {
    function systemExempt(address) external view returns (bool);
}

interface IFeeDistributor_FL {
    function receiveFee(uint256 amount) external;
}

interface IFraudRegistryFL {
    function isServiceBanned(address user) external view returns (bool);
}

interface ISeerFL {
    function getScore(address subject) external view returns (uint16);
    function reward(address subject, uint16 delta, string calldata reason) external;
}

// ── Errors ──────────────────────────────────────────────────────────────────

error FL_ExceedsAvailable();
error FL_CallbackFailed();
error FL_InsufficientRepayment();
error FL_LenderPaused();
error FL_Paused();
error FL_NotDAO();
error FL_Zero();
error FL_FeeTooHigh();
error FL_CooldownActive();
error FL_NotLender();
error FL_InsufficientBalance();
error FL_ExceedsOrphanBalance();
error FL_MinInitialDeposit();
error FL_FeeExceeded();

// ── Contract ────────────────────────────────────────────────────────────────

contract VFIDEFlashLoan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════

    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    /// @notice Maximum fee a lender can charge (1% = 100 bps)
    uint256 public constant MAX_LENDER_FEE_BPS = 100;

    /// @notice Protocol's cut of each flash loan fee (10% of the fee)
    /// Goes to FeeDistributor → 5-way community split
    uint256 public constant PROTOCOL_CUT_PCT = 10;

    /// @notice Default fee if lender hasn't set one (0.09% = 9 bps)
    uint256 public constant DEFAULT_FEE_BPS = 9;

    /// @notice Minimum seconds between flash loans per borrower address (anti-spam).
    /// @dev 60 seconds matches typical block times on zkSync Era and mainnet chains.
    uint256 public constant BORROWER_COOLDOWN = 60;

    /// @notice ProofScore reward for lenders per loan facilitated (+0.1)
    uint16 public constant LENDER_REWARD = 1;

    /// @notice F-32 FIX: Volume-based reward gating — only reward after lender accumulates this much volume
    /// Prevents ProofScore pump via high-frequency low-value flash loans.
    /// 10,000 VFIDE = ~$10,000 at $1/token. One reward per $10k+ lent.
    uint256 public constant VOLUME_PER_REWARD = 10_000 * 1e18;

    /// @notice Cap on registered lenders for gas-safe iteration
    uint256 public constant MAX_LENDERS = 500;

    /// @notice Minimum first deposit required to register as a lender.
    /// @dev Prevents dust-amount sybil registrations from exhausting MAX_LENDERS.
    uint256 public constant MIN_INITIAL_LENDER_DEPOSIT = 1 ether;

    // ═══════════════════════════════════════════════════════════════════════
    //                              TYPES
    // ═══════════════════════════════════════════════════════════════════════

    struct LenderInfo {
        uint256 balance;          // VFIDE available for flash loans
        uint256 feeBps;           // Fee rate in basis points
        uint256 totalEarned;      // Lifetime fees earned
        uint256 totalVolume;      // Lifetime volume lent
        uint256 loanCount;        // Loans facilitated
        bool paused;              // Lender can pause
        bool registered;          // Has deposited at least once
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════

    IERC20 public immutable vfideToken;
    address public dao;
    address public fraudRegistry; // FraudRegistry — banned addresses cannot use flash loans
    ISeerFL public seer;
    address public feeDistributor;

    bool public paused;

    // C-2 FIX: Timelocked DAO rotation
    address public pendingDAO;
    uint64 public pendingDAOAt;
    uint64 public constant DAO_CHANGE_DELAY = 48 hours;

    // L-2 FIX: Timelocked fraud registry change
    address public pendingFraudRegistry;
    uint64 public pendingFraudRegistryAt;
    uint64 public constant FRAUD_REGISTRY_DELAY = 24 hours;

    mapping(address => LenderInfo) public lenders;
    address[] public lenderList;
    mapping(address => uint256) private lenderListIndex;
    mapping(address => uint256) public lastFlashLoan;
    
    // F-32 FIX: Volume tracking for reward gating
    mapping(address => uint256) public lenderVolumeSinceLastReward;

    uint256 public totalTrackedBalance;
    uint256 public totalProtocolFees;
    uint256 public totalVolume;
    uint256 public totalLoans;

    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event LenderDeposited(address indexed lender, uint256 amount, uint256 newBalance);
    event LenderWithdrawn(address indexed lender, uint256 amount, uint256 newBalance);
    event LenderFeeSet(address indexed lender, uint256 feeBps);
    event LenderPaused(address indexed lender, bool isPaused);
    event FlashLoanExecuted(
        address indexed lender, address indexed borrower,
        address receiver, uint256 amount, uint256 lenderFee, uint256 protocolFee
    );
    event Paused(bool isPaused);
    event DAOSet(address indexed newDao);
    event DAOProposed(address indexed newDao, uint64 effectiveAt);
    event DAOChangeCancelled();
    event SeerSet(address indexed newSeer);
    event FeeDistributorSet(address indexed newFeeDistributor);
    event FraudRegistryProposed(address indexed registry, uint64 effectiveAt);
    event FraudRegistrySet(address indexed registry);
    event FraudRegistryCancelled();
    event OrphanTokensSwept(address indexed recipient, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

    modifier onlyDAO() { if (msg.sender != dao) revert FL_NotDAO(); _; }
    modifier whenNotPaused() { if (paused) revert FL_Paused(); _; }

    function _checkFraudStatus(address subject) internal view {
        if (fraudRegistry == address(0)) return;
        try IFraudRegistryFL(fraudRegistry).isServiceBanned(subject) returns (bool banned) {
            if (banned) revert FL_Paused();
        } catch {
            revert FL_Paused();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    // H-18 FIX: Track whether the VFIDEToken has been told to systemExempt this contract.
    // flashLoan() and deposit() are gated on `systemExemptConfirmed` to close the deploy-time race.
    bool public systemExemptConfirmed;

    event SystemExemptConfirmed();

    constructor(address _vfideToken, address _dao, address _seer, address _feeDistributor) {
        if (_vfideToken == address(0) || _dao == address(0)) revert FL_Zero();
        vfideToken = IERC20(_vfideToken);
        dao = _dao;
        if (_seer != address(0)) seer = ISeerFL(_seer);
        feeDistributor = _feeDistributor;
    }

    /// @notice Call once after the VFIDEToken has granted systemExempt to this contract.
    ///         Only the DAO can call; prevents the window between deploy and exemption grant.
    function confirmSystemExempt() external {
        require(msg.sender == dao, "FL: not DAO");
        require(!systemExemptConfirmed, "FL: already confirmed");
        require(ISystemExemptQuery(address(vfideToken)).systemExempt(address(this)), "FL: not yet exempt");
        systemExemptConfirmed = true;
        emit SystemExemptConfirmed();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          LENDER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Deposit VFIDE to offer for flash loans
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        // H-18 FIX: Block deposits until DAO confirms systemExempt is set on VFIDEToken.
        require(systemExemptConfirmed, "FL: not initialized");
        _checkFraudStatus(msg.sender);
        if (amount == 0) revert FL_Zero();

        LenderInfo storage info = lenders[msg.sender];
        if (!info.registered) {
            if (amount < MIN_INITIAL_LENDER_DEPOSIT) revert FL_MinInitialDeposit();
            require(lenderList.length < MAX_LENDERS, "FL: lender cap");
            info.registered = true;
            info.feeBps = DEFAULT_FEE_BPS;
            lenderList.push(msg.sender);
            lenderListIndex[msg.sender] = lenderList.length; // 1-indexed
        }

        info.balance += amount;
        totalTrackedBalance += amount;
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
        emit LenderDeposited(msg.sender, amount, info.balance);
    }

    /// @notice Withdraw VFIDE — available anytime, no lockup
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert FL_Zero();
        _checkFraudStatus(msg.sender);
        LenderInfo storage info = lenders[msg.sender];
        if (amount > info.balance) revert FL_InsufficientBalance();

        info.balance -= amount;
        totalTrackedBalance -= amount;

        if (info.balance == 0 && info.registered) {
            _deregisterLender(msg.sender);
        }

        vfideToken.safeTransfer(msg.sender, amount);
        emit LenderWithdrawn(msg.sender, amount, info.balance);
    }

    /// @notice Set your flash loan fee rate (max 1%)
    function setFeeRate(uint256 feeBps) external {
        if (feeBps > MAX_LENDER_FEE_BPS) revert FL_FeeTooHigh();
        lenders[msg.sender].feeBps = feeBps;
        emit LenderFeeSet(msg.sender, feeBps);
    }

    /// @notice Pause/unpause your flash loan offering
    function setLenderPaused(bool _paused) external {
        lenders[msg.sender].paused = _paused;
        emit LenderPaused(msg.sender, _paused);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          FLASH LOAN EXECUTION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Borrow from a specific lender — atomic, same-transaction
     * @param lender Address of the lender to borrow from
     * @param receiver Contract implementing IERC3156FlashBorrower
     * @param amount Amount to borrow
    * @param maxFeeBps Maximum lender fee (bps) borrower is willing to pay
     * @param data Passed through to receiver.onFlashLoan()
     *
     * If receiver doesn't repay amount + fee, the entire tx reverts.
     * Lender funds are mathematically impossible to lose.
     */
    function flashLoan(
        address lender,
        IERC3156FlashBorrower receiver,
        uint256 amount,
        uint256 maxFeeBps,
        bytes calldata data
    ) external nonReentrant whenNotPaused returns (bool) {
        // H-18 FIX: Block flash loans until systemExempt is confirmed.
        require(systemExemptConfirmed, "FL: not initialized");
        if (amount == 0) revert FL_Zero();
        _checkFraudStatus(msg.sender);

        LenderInfo storage info = lenders[lender];
        if (!info.registered) revert FL_NotLender();
        if (info.paused) revert FL_LenderPaused();
        if (amount > info.balance) revert FL_ExceedsAvailable();
        if (info.feeBps > maxFeeBps) revert FL_FeeExceeded();

        // Anti-spam cooldown
        if (block.timestamp < lastFlashLoan[msg.sender] + BORROWER_COOLDOWN) revert FL_CooldownActive();
        lastFlashLoan[msg.sender] = block.timestamp;

        // Fee calculation: lender's rate applied to loan amount
        uint256 totalFee = (amount * info.feeBps) / 10000;
        uint256 protocolFee = (totalFee * PROTOCOL_CUT_PCT) / 100; // 10% of fee → protocol
        uint256 lenderFee = totalFee - protocolFee;                // 90% of fee → lender

        // ── ATOMIC EXECUTION ─────────────────────────────────────

        // Debit lender's tracked balance
        info.balance -= amount;

        // 1. Send tokens to receiver
        vfideToken.safeTransfer(address(receiver), amount);

        // 2. Callback — borrower executes strategy
        bytes32 cbResult = receiver.onFlashLoan(msg.sender, address(vfideToken), amount, totalFee, data);
        if (cbResult != CALLBACK_SUCCESS) revert FL_CallbackFailed();

        // 3. Pull repayment
        uint256 balBefore = vfideToken.balanceOf(address(this));
        vfideToken.safeTransferFrom(address(receiver), address(this), amount + totalFee);
        if (vfideToken.balanceOf(address(this)) < balBefore + amount + totalFee) revert FL_InsufficientRepayment();

        // ── SETTLEMENT ───────────────────────────────────────────

        // Credit lender: principal returned + their fee share
        info.balance += amount + lenderFee;
        totalTrackedBalance += lenderFee;

        // Protocol fee → FeeDistributor → 5-way community split
        if (protocolFee > 0 && feeDistributor != address(0)) {
            vfideToken.safeTransfer(feeDistributor, protocolFee);
            // H-7 FIX: Tokens are already at FeeDistributor; require the accounting
            // callback to succeed. If VFIDEFlashLoan is not in authorizedFeeSources
            // the deployment setup is misconfigured — surface it rather than silently
            // dropping protocol revenue.
            IFeeDistributor_FL(feeDistributor).receiveFee(protocolFee);
        }

        // ── BOOKKEEPING ──────────────────────────────────────────
        info.totalEarned += lenderFee;
        info.totalVolume += amount;
        info.loanCount++;
        totalProtocolFees += protocolFee;
        totalVolume += amount;
        totalLoans++;

        // F-32 FIX: Reward lender only after accumulated volume reaches threshold
        // Prevents ProofScore pump via frequent small flash loans.
        // Accumulate volume; reward only when VOLUME_PER_REWARD is crossed.
        lenderVolumeSinceLastReward[lender] += amount;
        if (lenderVolumeSinceLastReward[lender] >= VOLUME_PER_REWARD) {
            lenderVolumeSinceLastReward[lender] = 0;
            if (address(seer) != address(0)) {
                try seer.reward(lender, LENDER_REWARD, "flashloan_lender") {} catch {}
            }
        }

        emit FlashLoanExecuted(lender, msg.sender, address(receiver), amount, lenderFee, protocolFee);
        return true;
    }

    function getOrphanBalance() public view returns (uint256) {
        uint256 contractBalance = vfideToken.balanceOf(address(this));
        return contractBalance > totalTrackedBalance ? contractBalance - totalTrackedBalance : 0;
    }

    function sweepOrphanBalance(address recipient, uint256 amount) external onlyDAO nonReentrant {
        if (recipient == address(0)) revert FL_Zero();
        if (amount == 0 || amount > getOrphanBalance()) revert FL_ExceedsOrphanBalance();

        vfideToken.safeTransfer(recipient, amount);
        emit OrphanTokensSwept(recipient, amount);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice How much a specific lender has available
    function maxFlashLoan(address lender) external view returns (uint256) {
        LenderInfo storage info = lenders[lender];
        if (!info.registered || info.paused) return 0;
        return info.balance;
    }

    /// @notice Calculate total fee for borrowing from a specific lender
    function flashFee(address lender, uint256 amount) external view returns (uint256) {
        return (amount * lenders[lender].feeBps) / 10000;
    }

    /// @notice Get full lender info
    function getLenderInfo(address lender) external view returns (
        uint256 balance, uint256 feeBps, uint256 earned,
        uint256 volume, uint256 loans, bool isPaused, bool isRegistered
    ) {
        LenderInfo storage i = lenders[lender];
        return (i.balance, i.feeBps, i.totalEarned, i.totalVolume, i.loanCount, i.paused, i.registered);
    }

    /// @notice Number of registered lenders
    function lenderCount() external view returns (uint256) { return lenderList.length; }

    /// @notice Paginated lender list (for frontend discovery)
    function getLenders(uint256 offset, uint256 limit) external view returns (address[] memory result) {
        uint256 len = lenderList.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        if (end - offset > 100) end = offset + 100;
        result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = lenderList[i];
        }
    }

    function _deregisterLender(address lender) internal {
        uint256 idx = lenderListIndex[lender];
        if (idx == 0) return;

        uint256 arrayIdx = idx - 1;
        uint256 lastIdx = lenderList.length - 1;

        if (arrayIdx != lastIdx) {
            address lastLender = lenderList[lastIdx];
            lenderList[arrayIdx] = lastLender;
            lenderListIndex[lastLender] = idx;
        }

        lenderList.pop();
        delete lenderListIndex[lender];
        lenders[lender].registered = false;
        lenders[lender].paused = false;
    }

    /// @notice Find cheapest lender with enough liquidity
    function findBestLender(uint256 amount) external view returns (address best, uint256 bestFee) {
        bestFee = type(uint256).max;
        uint256 len = lenderList.length;
        for (uint256 i = 0; i < len && i < 200; i++) {
            LenderInfo storage info = lenders[lenderList[i]];
            if (!info.paused && info.balance >= amount && info.feeBps < bestFee) {
                best = lenderList[i];
                bestFee = info.feeBps;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          DAO ADMINISTRATION
    // ═══════════════════════════════════════════════════════════════════════

    function setPaused(bool _paused) external onlyDAO { paused = _paused; emit Paused(_paused); }

    /// @notice Propose a DAO rotation with 48-hour timelock (C-2 FIX)
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert FL_Zero();
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit DAOProposed(_dao, pendingDAOAt);
    }

    function applyDAO() external onlyDAO {
        require(pendingDAOAt != 0 && block.timestamp >= pendingDAOAt, "FL: timelock");
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOSet(dao);
    }

    function cancelDAO() external onlyDAO {
        require(pendingDAOAt != 0, "FL: no pending");
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOChangeCancelled();
    }

    /// @notice L-1 FIX: zero address check added
    function setSeer(address _seer) external onlyDAO {
        if (_seer == address(0)) revert FL_Zero();
        seer = ISeerFL(_seer);
        emit SeerSet(_seer);
    }

    /// @notice L-1 FIX: zero address check added
    function setFeeDistributor(address _fd) external onlyDAO {
        if (_fd == address(0)) revert FL_Zero();
        feeDistributor = _fd;
        emit FeeDistributorSet(_fd);
    }

    /// @notice Propose a fraud registry change with 24-hour timelock (L-2 FIX)
    function setFraudRegistry(address _fr) external onlyDAO {
        pendingFraudRegistry = _fr;
        pendingFraudRegistryAt = uint64(block.timestamp) + FRAUD_REGISTRY_DELAY;
        emit FraudRegistryProposed(_fr, pendingFraudRegistryAt);
    }

    function applyFraudRegistry() external onlyDAO {
        require(pendingFraudRegistryAt != 0 && block.timestamp >= pendingFraudRegistryAt, "FL: timelock");
        fraudRegistry = pendingFraudRegistry;
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
        emit FraudRegistrySet(fraudRegistry);
    }

    function cancelFraudRegistry() external onlyDAO {
        require(pendingFraudRegistryAt != 0, "FL: no pending");
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
        emit FraudRegistryCancelled();
    }
}
