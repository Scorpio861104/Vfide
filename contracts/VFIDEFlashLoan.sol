// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IERC20, ReentrancyGuard, SafeERC20 } from "./SharedInterfaces.sol";

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

/// @notice IERC3156FlashBorrower
/// @title IERC3156FlashBorrower
/// @author Vfide
interface IERC3156FlashBorrower {
    /// @notice onFlashLoan
    /// @param initiator initiator
    /// @param token token
    /// @param amount amount
    /// @param fee fee
    /// @param data data
    /// @return _bytes32 _bytes32
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

/// @dev External query interface for system exemption checks.
/// @notice ISystemExemptQuery
/// @title ISystemExemptQuery
/// @author Vfide
interface ISystemExemptQuery {
    /// @notice systemExempt
    /// @return _bool _bool
    function systemExempt(address) external view returns (bool);
}

/// @notice IFeeDistributor_FL
/// @title IFeeDistributor_FL
/// @author Vfide
interface IFeeDistributor_FL {
    /// @notice receiveFee
    /// @param amount amount
    function receiveFee(uint256 amount) external;
}

/// @notice IFraudRegistryFL
/// @title IFraudRegistryFL
/// @author Vfide
interface IFraudRegistryFL {
    /// @notice isServiceBanned
    /// @param user user
    /// @return _bool _bool
    function isServiceBanned(address user) external view returns (bool);
}

/// @notice ISeerFL
/// @title ISeerFL
/// @author Vfide
interface ISeerFL {
    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16);
    /// @notice reward
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function reward(address subject, uint16 delta, string calldata reason) external;
}

// ── Errors ──────────────────────────────────────────────────────────────────

/// @notice FL_ExceedsAvailable
error FL_ExceedsAvailable();
/// @notice FL_CallbackFailed
error FL_CallbackFailed();
/// @notice FL_InsufficientRepayment
error FL_InsufficientRepayment();
/// @notice FL_LenderPaused
error FL_LenderPaused();
/// @notice FL_Paused
error FL_Paused();
/// @notice FL_NotDAO
error FL_NotDAO();
/// @notice FL_Zero
error FL_Zero();
/// @notice FL_FeeTooHigh
error FL_FeeTooHigh();
/// @notice FL_CooldownActive
error FL_CooldownActive();
/// @notice FL_NotLender
error FL_NotLender();
/// @notice FL_InsufficientBalance
error FL_InsufficientBalance();
/// @notice FL_ExceedsOrphanBalance
error FL_ExceedsOrphanBalance();
/// @notice FL_MinInitialDeposit
error FL_MinInitialDeposit();
/// @notice FL_FeeExceeded
error FL_FeeExceeded();
/// @notice FL_UnsupportedTokenBehavior
error FL_UnsupportedTokenBehavior();

// ── Contract ────────────────────────────────────────────────────────────────

/// @notice VFIDEFlashLoan
/// @title VFIDEFlashLoan
/// @author Vfide
contract VFIDEFlashLoan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice CALLBACK_SUCCESS
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
    /// @dev Raised to harden against low-cost sybil slot exhaustion of MAX_LENDERS.
    uint256 public constant MIN_INITIAL_LENDER_DEPOSIT = 100 ether;

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

    /// @notice vfideToken
    IERC20 public immutable vfideToken;
    /// @notice dao
    address public dao;
    /// @notice fraudRegistry
    address public fraudRegistry; // FraudRegistry — banned addresses cannot use flash loans
    /// @notice seer
    ISeerFL public seer;
    /// @notice feeDistributor
    address public feeDistributor;

    /// @notice paused
    bool public paused;

    // C-2 FIX: Timelocked DAO rotation
    /// @notice pendingDAO
    address public pendingDAO;
    /// @notice pendingDAOAt
    uint64 public pendingDAOAt;
    /// @notice DAO_CHANGE_DELAY
    uint64 public constant DAO_CHANGE_DELAY = 48 hours;

    // L-2 FIX: Timelocked fraud registry change
    /// @notice pendingFraudRegistry
    address public pendingFraudRegistry;
    /// @notice pendingFraudRegistryAt
    uint64 public pendingFraudRegistryAt;
    /// @notice FRAUD_REGISTRY_DELAY
    uint64 public constant FRAUD_REGISTRY_DELAY = 24 hours;

    // TL-262 FIX: Timelocked seer + feeDistributor changes (#262)
    /// @notice pendingSeer
    address public pendingSeer;
    /// @notice pendingSeerAt
    uint64 public pendingSeerAt;
    /// @notice pendingFeeDistributor
    address public pendingFeeDistributor;
    /// @notice pendingFeeDistributorAt
    uint64 public pendingFeeDistributorAt;

    // TL-240 FIX: Timelocked orphan sweep (#240)
    /// @notice pendingSweepRecipient
    address public pendingSweepRecipient;
    /// @notice pendingSweepAmount
    uint256 public pendingSweepAmount;
    /// @notice pendingSweepAt
    uint64 public pendingSweepAt;

    /// @notice lenders
    mapping(address => LenderInfo) public lenders;
    /// @notice lenderList
    address[] public lenderList;
    /// @notice lenderListIndex
    mapping(address => uint256) private lenderListIndex;
    /// @notice lastFlashLoan
    mapping(address => uint256) public lastFlashLoan;
    
    // F-32 FIX: Volume tracking for reward gating
    /// @notice lenderVolumeSinceLastReward
    mapping(address => uint256) public lenderVolumeSinceLastReward;

    /// @notice totalTrackedBalance
    uint256 public totalTrackedBalance;
    /// @notice totalProtocolFees
    uint256 public totalProtocolFees;
    /// @notice totalVolume
    uint256 public totalVolume;
    /// @notice totalLoans
    uint256 public totalLoans;

    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice LenderDeposited
    /// @param lender lender
    /// @param amount amount
    /// @param newBalance newBalance
    event LenderDeposited(address indexed lender, uint256 amount, uint256 newBalance);
    /// @notice LenderWithdrawn
    /// @param lender lender
    /// @param amount amount
    /// @param newBalance newBalance
    event LenderWithdrawn(address indexed lender, uint256 amount, uint256 newBalance);
    /// @notice LenderFeeSet
    /// @param lender lender
    /// @param feeBps feeBps
    event LenderFeeSet(address indexed lender, uint256 feeBps);
    /// @notice LenderPaused
    /// @param lender lender
    /// @param isPaused isPaused
    event LenderPaused(address indexed lender, bool isPaused);
    /// @notice FlashLoanExecuted
    /// @param lender lender
    /// @param borrower borrower
    /// @param receiver receiver
    /// @param amount amount
    /// @param lenderFee lenderFee
    /// @param protocolFee protocolFee
    event FlashLoanExecuted(
        address indexed lender, address indexed borrower,
        address receiver, uint256 amount, uint256 lenderFee, uint256 protocolFee
    );
    /// @notice Paused
    /// @param isPaused isPaused
    event Paused(bool isPaused);
    /// @notice DAOSet
    /// @param newDao newDao
    event DAOSet(address indexed newDao);
    /// @notice DAOProposed
    /// @param newDao newDao
    /// @param effectiveAt effectiveAt
    event DAOProposed(address indexed newDao, uint64 effectiveAt);
    /// @notice DAOChangeCancelled
    event DAOChangeCancelled();
    /// @notice SeerProposed
    /// @param newSeer newSeer
    /// @param effectiveAt effectiveAt
    event SeerProposed(address indexed newSeer, uint64 effectiveAt);
    /// @notice SeerSet
    /// @param newSeer newSeer
    event SeerSet(address indexed newSeer);
    /// @notice SeerChangeCancelled
    event SeerChangeCancelled();
    /// @notice FeeDistributorProposed
    /// @param newFeeDistributor newFeeDistributor
    /// @param effectiveAt effectiveAt
    event FeeDistributorProposed(address indexed newFeeDistributor, uint64 effectiveAt);
    /// @notice FeeDistributorSet
    /// @param newFeeDistributor newFeeDistributor
    event FeeDistributorSet(address indexed newFeeDistributor);
    /// @notice FeeDistributorChangeCancelled
    event FeeDistributorChangeCancelled();
    /// @notice OrphanSweepProposed
    /// @param recipient recipient
    /// @param amount amount
    /// @param effectiveAt effectiveAt
    event OrphanSweepProposed(address indexed recipient, uint256 amount, uint64 effectiveAt);
    /// @notice OrphanSweepCancelled
    event OrphanSweepCancelled();
    /// @notice FraudRegistryProposed
    /// @param registry registry
    /// @param effectiveAt effectiveAt
    event FraudRegistryProposed(address indexed registry, uint64 effectiveAt);
    /// @notice FraudRegistrySet
    /// @param registry registry
    event FraudRegistrySet(address indexed registry);
    /// @notice FraudRegistryCancelled
    event FraudRegistryCancelled();
    /// @notice OrphanTokensSwept
    /// @param recipient recipient
    /// @param amount amount
    event OrphanTokensSwept(address indexed recipient, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice onlyDAO
    modifier onlyDAO() { if (msg.sender != dao) revert FL_NotDAO(); _; }
    /// @notice whenNotPaused
    modifier whenNotPaused() { if (paused) revert FL_Paused(); _; }

    /// @notice _checkFraudStatus
    /// @param subject subject
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
    /// @notice systemExemptConfirmed
    bool public systemExemptConfirmed;

    /// @notice SystemExemptConfirmed
    event SystemExemptConfirmed();

    /// @notice constructor
    /// @param _vfideToken _vfideToken
    /// @param _dao _dao
    /// @param _seer _seer
    /// @param _feeDistributor _feeDistributor
    constructor(address _vfideToken, address _dao, address _seer, address _feeDistributor) {
        if (_vfideToken == address(0) || _dao == address(0)) revert FL_Zero();
        vfideToken = IERC20(_vfideToken);
        dao = _dao;
        // slither-disable-next-line missing-zero-check  // _seer is optional; address(0) leaves seer unset
        if (_seer != address(0)) seer = ISeerFL(_seer);
        // slither-disable-next-line missing-zero-check  // _feeDistributor optional; address(0) routes fees per existing fallback
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
    // SLITHER FALSE POSITIVE (reentrancy-balance / reentrancy-no-eth):
    //   The function is `nonReentrant`, so the "stale balance" pattern Slither
    //   flags is not exploitable. The before/after balance compare against
    //   the requested `amount` is an intentional fee-on-transfer / rebasing-
    //   token guard: we reject any token whose actual transferred amount
    //   differs from what was requested. This is a strictly defensive check,
    //   not a vulnerable balance-read.
    // slither-disable-next-line reentrancy-balance,reentrancy-no-eth,reentrancy-benign,reentrancy-events
    /// @notice deposit
    /// @param amount amount
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

        uint256 beforeBalance = vfideToken.balanceOf(address(this));
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = vfideToken.balanceOf(address(this)) - beforeBalance;
        if (received != amount) revert FL_UnsupportedTokenBehavior();

        info.balance += amount;
        totalTrackedBalance += amount;
        emit LenderDeposited(msg.sender, amount, info.balance);
    }

    /// @notice Withdraw VFIDE — available anytime, no lockup
    /// @param amount amount
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
    /// @param feeBps feeBps
    function setFeeRate(uint256 feeBps) external {
        if (feeBps > MAX_LENDER_FEE_BPS) revert FL_FeeTooHigh();
        lenders[msg.sender].feeBps = feeBps;
        emit LenderFeeSet(msg.sender, feeBps);
    }

    /// @notice Pause/unpause your flash loan offering
    /// @param _paused _paused
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
     * @return _bool _bool
     */
    function flashLoan(
        address lender,
        IERC3156FlashBorrower receiver,
        uint256 amount,
        uint256 maxFeeBps,
        bytes calldata data
    ) external nonReentrant whenNotPaused returns (bool) {
        // SLITHER FALSE POSITIVES (suppressed via slither-disable-start below):
        //
        //   arbitrary-send-erc20:
        //     This is the *defining* mechanic of an ERC-3156 flash loan: at
        //     the end of the borrow callback the borrower MUST transfer back
        //     amount + fee. The borrower's `onFlashLoan` callback is required
        //     to call `vfideToken.approve(address(this), amount + fee)` before
        //     returning — this is part of the ERC-3156 contract. The "from"
        //     address is the borrower's own contract; if approval was not
        //     granted the entire flashLoan tx reverts atomically. No funds
        //     can be drained from an unrelated party.
        //
        //   reentrancy-balance:
        //     Function carries `nonReentrant`. The balance-before/after check
        //     is a defensive fee-on-transfer guard, not vulnerable to read
        //     manipulation: if balance does not increase by exactly
        //     amount + totalFee the call reverts and lender funds are
        //     restored. The "stale" `balBefore` is intentional — it's the
        //     pre-call snapshot we are deliberately comparing against.
        //
        // slither-disable-start arbitrary-send-erc20,reentrancy-balance,reentrancy-no-eth,reentrancy-benign,reentrancy-events
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
        ++info.loanCount;
        totalProtocolFees += protocolFee;
        totalVolume += amount;
        ++totalLoans;

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
        // slither-disable-end arbitrary-send-erc20,reentrancy-balance,reentrancy-no-eth,reentrancy-benign,reentrancy-events
    }

    /// @notice getOrphanBalance
    /// @return _uint256 _uint256
    function getOrphanBalance() public view returns (uint256) {
        uint256 contractBalance = vfideToken.balanceOf(address(this));
        return contractBalance > totalTrackedBalance ? contractBalance - totalTrackedBalance : 0;
    }

    /// @notice TL-240 FIX: Propose an orphan-balance sweep (48h timelock). (#240)
    /// @param recipient recipient
    /// @param amount amount
    function sweepOrphanBalance(address recipient, uint256 amount) external onlyDAO nonReentrant {
        if (recipient == address(0)) revert FL_Zero();
        if (amount == 0 || amount > getOrphanBalance()) revert FL_ExceedsOrphanBalance();
        require(pendingSweepAt == 0, "FL: sweep pending");
        uint64 effectiveAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        pendingSweepRecipient = recipient;
        pendingSweepAmount = amount;
        pendingSweepAt = effectiveAt;
        emit OrphanSweepProposed(recipient, amount, effectiveAt);
    }

    /// @notice Execute a previously proposed orphan-balance sweep after the 48h timelock.
    function applyOrphanSweep() external onlyDAO nonReentrant {
        require(pendingSweepAt != 0 && block.timestamp >= pendingSweepAt, "FL: timelock");
        address recipient = pendingSweepRecipient;
        uint256 amount = pendingSweepAmount;
        require(amount <= getOrphanBalance(), "FL: balance dropped");
        delete pendingSweepRecipient;
        delete pendingSweepAmount;
        delete pendingSweepAt;
        vfideToken.safeTransfer(recipient, amount);
        emit OrphanTokensSwept(recipient, amount);
    }

    /// @notice Cancel a pending orphan-balance sweep.
    function cancelOrphanSweep() external onlyDAO {
        require(pendingSweepAt != 0, "FL: no pending");
        delete pendingSweepRecipient;
        delete pendingSweepAmount;
        delete pendingSweepAt;
        emit OrphanSweepCancelled();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice How much a specific lender has available
    /// @param lender lender
    /// @return _uint256 _uint256
    function maxFlashLoan(address lender) external view returns (uint256) {
        LenderInfo storage info = lenders[lender];
        if (!info.registered || info.paused) return 0;
        return info.balance;
    }

    /// @notice Calculate total fee for borrowing from a specific lender
    /// @param lender lender
    /// @param amount amount
    /// @return _uint256 _uint256
    function flashFee(address lender, uint256 amount) external view returns (uint256) {
        return (amount * lenders[lender].feeBps) / 10000;
    }

    /// @notice Get full lender info
    /// @param lender lender
    /// @return balance balance
    /// @return feeBps feeBps
    /// @return earned earned
    /// @return volume volume
    /// @return loans loans
    /// @return isPaused isPaused
    /// @return isRegistered isRegistered
    function getLenderInfo(address lender) external view returns (
        uint256 balance, uint256 feeBps, uint256 earned,
        uint256 volume, uint256 loans, bool isPaused, bool isRegistered
    ) {
        LenderInfo storage i = lenders[lender];
        return (i.balance, i.feeBps, i.totalEarned, i.totalVolume, i.loanCount, i.paused, i.registered);
    }

    /// @notice Number of registered lenders
    /// @return _uint256 _uint256
    function lenderCount() external view returns (uint256) { return lenderList.length; }

    /// @notice Paginated lender list (for frontend discovery)
    /// @param offset offset
    /// @param limit limit
    /// @return result result
    function getLenders(uint256 offset, uint256 limit) external view returns (address[] memory result) {
        uint256 len = lenderList.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        if (end - offset > 100) end = offset + 100;
        result = new address[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            result[i - offset] = lenderList[i];
        }
    }

    /// @notice _deregisterLender
    /// @param lender lender
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
    /// @param amount amount
    /// @return best best
    /// @return bestFee bestFee
    function findBestLender(uint256 amount) external view returns (address best, uint256 bestFee) {
        bestFee = type(uint256).max;
        uint256 len = lenderList.length;
        for (uint256 i = 0; i < len; ++i) {
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

    /// @notice setPaused
    /// @param _paused _paused
    function setPaused(bool _paused) external onlyDAO { paused = _paused; emit Paused(_paused); }

    /// @notice Propose a DAO rotation with 48-hour timelock (C-2 FIX)
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert FL_Zero();
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit DAOProposed(_dao, pendingDAOAt);
    }

    /// @notice applyDAO
    function applyDAO() external onlyDAO {
        require(pendingDAOAt != 0 && block.timestamp >= pendingDAOAt, "FL: timelock");
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOSet(dao);
    }

    /// @notice cancelDAO
    function cancelDAO() external onlyDAO {
        require(pendingDAOAt != 0, "FL: no pending");
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOChangeCancelled();
    }

    /// @notice TL-262 FIX: Propose a seer change (48h timelock). (#262)
    /// @param _seer _seer
    function setSeer(address _seer) external onlyDAO {
        if (_seer == address(0)) revert FL_Zero();
        pendingSeer = _seer;
        pendingSeerAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit SeerProposed(_seer, pendingSeerAt);
    }

    /// @notice Apply a pending seer change after the 48h timelock.
    function applySeer() external onlyDAO {
        require(pendingSeerAt != 0 && block.timestamp >= pendingSeerAt, "FL: timelock");
        seer = ISeerFL(pendingSeer);
        emit SeerSet(pendingSeer);
        delete pendingSeer;
        delete pendingSeerAt;
    }

    /// @notice Cancel a pending seer change.
    function cancelSeer() external onlyDAO {
        require(pendingSeerAt != 0, "FL: no pending");
        delete pendingSeer;
        delete pendingSeerAt;
        emit SeerChangeCancelled();
    }

    /// @notice TL-262 FIX: Propose a feeDistributor change (48h timelock). (#262)
    /// @param _fd _fd
    function setFeeDistributor(address _fd) external onlyDAO {
        if (_fd == address(0)) revert FL_Zero();
        pendingFeeDistributor = _fd;
        pendingFeeDistributorAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit FeeDistributorProposed(_fd, pendingFeeDistributorAt);
    }

    /// @notice Apply a pending feeDistributor change after the 48h timelock.
    function applyFeeDistributor() external onlyDAO {
        require(pendingFeeDistributorAt != 0 && block.timestamp >= pendingFeeDistributorAt, "FL: timelock");
        feeDistributor = pendingFeeDistributor;
        emit FeeDistributorSet(pendingFeeDistributor);
        delete pendingFeeDistributor;
        delete pendingFeeDistributorAt;
    }

    /// @notice Cancel a pending feeDistributor change.
    function cancelFeeDistributor() external onlyDAO {
        require(pendingFeeDistributorAt != 0, "FL: no pending");
        delete pendingFeeDistributor;
        delete pendingFeeDistributorAt;
        emit FeeDistributorChangeCancelled();
    }

    /// @notice Propose a fraud registry change with 24-hour timelock (L-2 FIX)
    /// @param _fr _fr
    function setFraudRegistry(address _fr) external onlyDAO {
        if (_fr == address(0)) revert FL_Zero();
        pendingFraudRegistry = _fr;
        pendingFraudRegistryAt = uint64(block.timestamp) + FRAUD_REGISTRY_DELAY;
        emit FraudRegistryProposed(_fr, pendingFraudRegistryAt);
    }

    /// @notice applyFraudRegistry
    function applyFraudRegistry() external onlyDAO {
        require(pendingFraudRegistryAt != 0 && block.timestamp >= pendingFraudRegistryAt, "FL: timelock");
        fraudRegistry = pendingFraudRegistry;
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
        emit FraudRegistrySet(fraudRegistry);
    }

    /// @notice cancelFraudRegistry
    function cancelFraudRegistry() external onlyDAO {
        require(pendingFraudRegistryAt != 0, "FL: no pending");
        delete pendingFraudRegistry;
        delete pendingFraudRegistryAt;
        emit FraudRegistryCancelled();
    }
}
