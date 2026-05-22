// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20, ReentrancyGuard, SafeERC20} from "./SharedInterfaces.sol";

/**
 * PayrollManager — Streaming Salaries for Vfide
 * ---------------------------------------------
 * Allows employers to stream salaries to employees by the second.
 * - Zero legal risk (non-custodial, user-directed).
 * - Solves "Payday Lending" by giving access to earned wages instantly.
 * - Pause/resume functionality for disputes
 * - Rate modification support
 * - Emergency withdrawal capability
 * @notice IERC20_Pay
 * @title IERC20_Pay
 * @author Vfide
 */

interface IERC20_Pay {
    /// @notice transferFrom
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    /// @notice transfer
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transfer(address to, uint256 amount) external returns (bool);
    /// @notice balanceOf
    /// @param account account
    /// @return _uint256 _uint256
    function balanceOf(address account) external view returns (uint256);
}

// Seer interface for ProofScore
/// @notice ISeer_PM
/// @title ISeer_PM
/// @author Vfide
interface ISeer_PM {
    /// @notice reward
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function reward(address subject, uint16 delta, string calldata reason) external;
}

/// @notice PM_NotPayer
error PM_NotPayer();
/// @notice PM_NotPayee
error PM_NotPayee();
/// @notice PM_NotAuthorized
error PM_NotAuthorized();
/// @notice PM_StreamInactive
error PM_StreamInactive();
/// @notice PM_StreamPaused
error PM_StreamPaused();
/// @notice PM_Zero
error PM_Zero();
/// @notice PM_StreamNotPaused
error PM_StreamNotPaused();
/// @notice PM_InvalidRate
error PM_InvalidRate();
/// @notice PM_InvalidPayee
error PM_InvalidPayee();
/// @notice PM_InvalidDeposit
error PM_InvalidDeposit();
/// @notice PM_NothingDue
error PM_NothingDue();
/// @notice PM_StreamNotExpired
error PM_StreamNotExpired();

/// @notice PayrollManager
/// @title PayrollManager
/// @author Vfide
contract PayrollManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Events
    /// @notice StreamCreated
    /// @param streamId streamId
    /// @param payer payer
    /// @param payee payee
    /// @param rate rate
    event StreamCreated(
        uint256 indexed streamId,
        address indexed payer,
        address indexed payee,
        uint256 rate
    );
    /// @notice Withdraw
    /// @param streamId streamId
    /// @param payee payee
    /// @param amount amount
    event Withdraw(uint256 indexed streamId, address indexed payee, uint256 amount);
    /// @notice StreamCancelled
    /// @param streamId streamId
    event StreamCancelled(uint256 indexed streamId);
    /// @notice TopUp
    /// @param streamId streamId
    /// @param amount amount
    event TopUp(uint256 indexed streamId, uint256 amount);
    /// @notice StreamPaused
    /// @param streamId streamId
    /// @param pausedBy pausedBy
    event StreamPaused(uint256 indexed streamId, address indexed pausedBy);
    /// @notice StreamResumed
    /// @param streamId streamId
    /// @param resumedBy resumedBy
    event StreamResumed(uint256 indexed streamId, address indexed resumedBy);
    /// @notice RateModified
    /// @param streamId streamId
    /// @param oldRate oldRate
    /// @param newRate newRate
    event RateModified(uint256 indexed streamId, uint256 oldRate, uint256 newRate);
    /// @notice PayeeUpdated
    /// @param streamId streamId
    /// @param oldPayee oldPayee
    /// @param newPayee newPayee
    event PayeeUpdated(
        uint256 indexed streamId,
        address indexed oldPayee,
        address indexed newPayee
    );
    /// @notice EmergencyWithdraw
    /// @param streamId streamId
    /// @param to to
    /// @param amount amount
    event EmergencyWithdraw(uint256 indexed streamId, address indexed to, uint256 amount);
    /// @notice EmergencyWithdrawProposed
    /// @param streamId streamId
    /// @param to to
    /// @param amount amount
    /// @param executeAfter executeAfter
    event EmergencyWithdrawProposed(
        uint256 indexed streamId,
        address indexed to,
        uint256 amount,
        uint64 executeAfter
    );
    /// @notice EmergencyWithdrawCancelled
    /// @param streamId streamId
    /// @param to to
    event EmergencyWithdrawCancelled(uint256 indexed streamId, address indexed to);
    /// @notice StreamExpired
    /// @param streamId streamId
    /// @param reclaimedBy reclaimedBy
    /// @param amount amount
    event StreamExpired(uint256 indexed streamId, address indexed reclaimedBy, uint256 amount);
    /// @notice DAOSet
    /// @param dao dao
    event DAOSet(address indexed dao);
    /// @notice SupportedTokenSet
    /// @param token token
    /// @param supported supported
    event SupportedTokenSet(address indexed token, bool supported);
    /// @notice SeerChangeProposed
    /// @param pendingSeer pendingSeer
    /// @param effectiveAt effectiveAt
    event SeerChangeProposed(address indexed pendingSeer, uint64 effectiveAt);
    /// @notice SeerChangeCancelled
    /// @param pendingSeer pendingSeer
    event SeerChangeCancelled(address indexed pendingSeer);
    /// @notice SupportedTokenChangeProposed
    /// @param token token
    /// @param supported supported
    /// @param effectiveAt effectiveAt
    event SupportedTokenChangeProposed(address indexed token, bool supported, uint64 effectiveAt);
    /// @notice SupportedTokenChangeCancelled
    /// @param token token
    /// @param supported supported
    event SupportedTokenChangeCancelled(address indexed token, bool supported);

    struct Stream {
        address payer;
        address payee;
        address token;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 lastWithdrawTime;
        uint256 depositBalance; // Remaining balance
        bool active;
        bool paused; // NEW: Pause state
        uint256 pausedAt; // NEW: When paused
        uint256 pausedAccrued; // NEW: Accrued before pause
        uint256 expiryTime;
    }

    /// @notice streams
    mapping(uint256 => Stream) public streams;
    /// @notice nextStreamId
    uint256 public nextStreamId = 1;

    // H-27 FIX: Two-step payee update with 48h timelock to prevent instant address hijack on key compromise.
    struct PendingPayeeUpdate {
        address newPayee;
        uint256 validFrom; // block.timestamp at proposal + PAYEE_UPDATE_DELAY
    }
    /// @notice pendingPayeeUpdates
    mapping(uint256 => PendingPayeeUpdate) public pendingPayeeUpdates;
    /// @notice PAYEE_UPDATE_DELAY
    uint256 public constant PAYEE_UPDATE_DELAY = 48 hours;

    struct PendingEmergencyWithdraw {
        address to;
        uint64 executeAfter;
    }
    /// @notice pendingEmergencyWithdraws
    mapping(uint256 => PendingEmergencyWithdraw) public pendingEmergencyWithdraws;
    /// @notice EMERGENCY_WITHDRAW_DELAY
    uint64 public constant EMERGENCY_WITHDRAW_DELAY = 7 days;

    // NEW: DAO for emergency controls
    /// @notice dao
    address public dao;

    // ProofScore integration
    /// @notice seer
    ISeer_PM public seer;
    /// @notice PAYROLL_CREATE_REWARD
    uint16 public constant PAYROLL_CREATE_REWARD = 5; // +0.5 for creating stream
    /// @notice PAYROLL_WITHDRAW_REWARD
    uint16 public constant PAYROLL_WITHDRAW_REWARD = 1; // +0.1 per withdrawal

    /// @notice M-21 FIX: Payee may unilaterally resume a paused stream after this duration.
    /// @dev Prevents indefinite-pause griefing by an unresponsive payer.
    uint256 public constant MAX_PAUSE_DURATION = 30 days;
    /// @notice MAX_STREAM_DURATION
    uint256 public constant MAX_STREAM_DURATION = 365 days;

    // NEW: Track streams by payer and payee
    /// @notice payerStreams
    mapping(address => uint256[]) private payerStreams;
    /// @notice payeeStreams
    mapping(address => uint256[]) private payeeStreams;
    /// @notice activePayerStreamCount
    mapping(address => uint256) public activePayerStreamCount;
    /// @notice activePayeeStreamCount
    mapping(address => uint256) public activePayeeStreamCount;
    /// @notice supportedTokens
    mapping(address => bool) public supportedTokens;

    // TL-438 / TL-439 FIX: timelock sensitive module/config changes.
    /// @notice pendingSeer_PM
    address public pendingSeer_PM;
    /// @notice pendingSeerAt_PM
    uint64 public pendingSeerAt_PM;
    /// @notice SEER_CHANGE_DELAY_PM
    uint64 public constant SEER_CHANGE_DELAY_PM = 48 hours;

    struct PendingSupportedTokenChange {
        address token;
        bool supported;
        uint64 executeAfter;
        bool exists;
    }
    /// @notice pendingSupportedTokenChange
    PendingSupportedTokenChange public pendingSupportedTokenChange;
    /// @notice SUPPORTED_TOKEN_CHANGE_DELAY_PM
    uint64 public constant SUPPORTED_TOKEN_CHANGE_DELAY_PM = 24 hours;

    // H-2 FIX: Timelocked DAO rotation
    /// @notice pendingDAO_PM
    address public pendingDAO_PM;
    /// @notice pendingDAOAt_PM
    uint64 public pendingDAOAt_PM;
    /// @notice DAO_CHANGE_DELAY_PM
    uint64 public constant DAO_CHANGE_DELAY_PM = 48 hours;
    /// @notice DAOChangeProposed
    /// @param newDAO newDAO
    /// @param effectiveAt effectiveAt
    event DAOChangeProposed(address indexed newDAO, uint64 effectiveAt);
    /// @notice DAOChangeCancelled
    event DAOChangeCancelled();

    /// @notice onlyDAO
    modifier onlyDAO() {
        require(msg.sender == dao, "PM: not DAO");
        _;
    }

    /// @notice constructor
    /// @param _dao _dao
    /// @param _seer _seer
    constructor(address _dao, address _seer) {
        require(_dao != address(0), "PM: zero DAO");
        dao = _dao;
        if (_seer != address(0)) seer = ISeer_PM(_seer);
    }

    /// @notice setDAO
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDAO {
        require(_dao != address(0), "PM: zero DAO");
        pendingDAO_PM = _dao;
        pendingDAOAt_PM = uint64(block.timestamp) + DAO_CHANGE_DELAY_PM;
        emit DAOChangeProposed(_dao, pendingDAOAt_PM);
    }

    /// @notice applyDAO
    function applyDAO() external onlyDAO {
        require(pendingDAOAt_PM != 0 && block.timestamp >= pendingDAOAt_PM, "PM: timelock");
        dao = pendingDAO_PM;
        delete pendingDAO_PM;
        delete pendingDAOAt_PM;
        emit DAOSet(dao);
    }

    /// @notice cancelDAOChange
    function cancelDAOChange() external onlyDAO {
        require(pendingDAOAt_PM != 0, "PM: no pending");
        delete pendingDAO_PM;
        delete pendingDAOAt_PM;
        emit DAOChangeCancelled();
    }

    /// @notice setSeer
    /// @param _seer _seer
    function setSeer(address _seer) external onlyDAO {
        if (_seer == address(0)) revert PM_Zero();
        pendingSeer_PM = _seer;
        pendingSeerAt_PM = uint64(block.timestamp) + SEER_CHANGE_DELAY_PM;
        emit SeerChangeProposed(_seer, pendingSeerAt_PM);
    }

    /// @notice applySeer
    function applySeer() external onlyDAO {
        require(pendingSeerAt_PM != 0 && block.timestamp >= pendingSeerAt_PM, "PM: seer timelock");
        seer = ISeer_PM(pendingSeer_PM);
        delete pendingSeer_PM;
        delete pendingSeerAt_PM;
    }

    /// @notice cancelSeerChange
    function cancelSeerChange() external onlyDAO {
        require(pendingSeerAt_PM != 0, "PM: no pending seer");
        address oldPending = pendingSeer_PM;
        delete pendingSeer_PM;
        delete pendingSeerAt_PM;
        emit SeerChangeCancelled(oldPending);
    }

    /// @notice setSupportedToken
    /// @param token token
    /// @param supported supported
    function setSupportedToken(address token, bool supported) external onlyDAO {
        require(token != address(0), "PM: zero token");
        pendingSupportedTokenChange = PendingSupportedTokenChange({
            token: token,
            supported: supported,
            executeAfter: uint64(block.timestamp) + SUPPORTED_TOKEN_CHANGE_DELAY_PM,
            exists: true
        });
        emit SupportedTokenChangeProposed(
            token,
            supported,
            pendingSupportedTokenChange.executeAfter
        );
    }

    /// @notice applySupportedToken
    function applySupportedToken() external onlyDAO {
        PendingSupportedTokenChange memory pending = pendingSupportedTokenChange;
        require(pending.exists, "PM: no pending token");
        require(block.timestamp >= pending.executeAfter, "PM: token timelock");
        delete pendingSupportedTokenChange;
        supportedTokens[pending.token] = pending.supported;
        emit SupportedTokenSet(pending.token, pending.supported);
    }

    /// @notice cancelSupportedTokenChange
    function cancelSupportedTokenChange() external onlyDAO {
        PendingSupportedTokenChange memory pending = pendingSupportedTokenChange;
        require(pending.exists, "PM: no pending token");
        delete pendingSupportedTokenChange;
        emit SupportedTokenChangeCancelled(pending.token, pending.supported);
    }

    /**
     * @dev Safe transfer helper for IERC20_Pay tokens
     * @notice _safeTransferPay
     * @param token token
     * @param to to
     * @param amount amount
     */
    function _safeTransferPay(address token, address to, uint256 amount) internal {
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * Create a new salary stream.
     * @param payee Employee address
     * @param token Payment token (e.g. USDC, VFIDE)
     * @param rate Tokens per second (e.g. 3000 USDC / 30 days / 24h / 3600s)
     * @param initialDeposit Amount to deposit upfront
     * @notice createStream
     * @return _uint256 _uint256
     */
    function createStream(
        address payee,
        address token,
        uint256 rate,
        uint256 initialDeposit
    ) external nonReentrant returns (uint256) {
        if (payee == address(0)) revert PM_InvalidPayee();
        require(supportedTokens[token], "PM: unsupported token");
        if (rate == 0) revert PM_InvalidRate();
        require(rate >= 1e12, "PM: rate too low");
        if (initialDeposit == 0) revert PM_InvalidDeposit();

        uint256 id = nextStreamId++;
        streams[id] = Stream({
            payer: msg.sender,
            payee: payee,
            token: token,
            ratePerSecond: rate,
            startTime: block.timestamp,
            lastWithdrawTime: block.timestamp,
            depositBalance: initialDeposit,
            active: true,
            paused: false,
            pausedAt: 0,
            pausedAccrued: 0,
            expiryTime: block.timestamp + MAX_STREAM_DURATION
        });

        // Track streams for both parties (I-11: capped)
        require(activePayerStreamCount[msg.sender] < 200, "PM: payer stream cap");
        payerStreams[msg.sender].push(id);
        ++activePayerStreamCount[msg.sender];
        require(activePayeeStreamCount[payee] < 200, "PM: payee stream cap");
        payeeStreams[payee].push(id);
        ++activePayeeStreamCount[payee];

        emit StreamCreated(id, msg.sender, payee, rate);

        // M-4 FIX: Account for fee-on-transfer tokens by measuring actual received amount
        uint256 balBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), initialDeposit);
        uint256 actualDeposit = IERC20(token).balanceOf(address(this)) - balBefore;
        if (actualDeposit < initialDeposit) {
            streams[id].depositBalance = actualDeposit;
        }

        // Reward payer for creating payroll stream
        if (address(seer) != address(0)) {
            try seer.reward(msg.sender, PAYROLL_CREATE_REWARD, "payroll_created") {} catch {}
        }
        return id;
    }

    /**
     * Add more funds to an existing stream
     * @notice topUp
     * @param streamId streamId
     * @param amount amount
     */
    function topUp(uint256 streamId, uint256 amount) external nonReentrant {
        // slither-disable-start reentrancy-no-eth
        // function has nonReentrant guard; safeTransferFrom reverts atomically
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (msg.sender != s.payer) revert PM_NotPayer();
        if (amount == 0) revert PM_InvalidDeposit();

        uint256 balBefore = IERC20(s.token).balanceOf(address(this));
        IERC20(s.token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 actualReceived = IERC20(s.token).balanceOf(address(this)) - balBefore;
        s.depositBalance += actualReceived;
        emit TopUp(streamId, actualReceived);
        // slither-disable-end reentrancy-no-eth
    }

    /**
     * @notice Pause stream (payer or payee can pause)
     * @dev Useful for disputes, temporary suspension
     * @param streamId streamId
     */
    function pauseStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (s.paused) revert PM_StreamPaused();
        if (msg.sender != s.payer && msg.sender != s.payee) revert PM_NotAuthorized();

        // Store accrued amount before pausing
        s.pausedAccrued = claimable(streamId);
        s.paused = true;
        s.pausedAt = block.timestamp;

        emit StreamPaused(streamId, msg.sender);
    }

    /**
     * @notice Resume paused stream
     * @dev Both payer and payee must agree to resume (or DAO can force)
     *      For simplicity, payer can resume their own stream
     * DEEP-C-3 FIX: Don't clear pausedAccrued on resume - it needs to be claimed first
     * The pausedAccrued will be cleared when payee withdraws
     *
     * M-21 FIX: After MAX_PAUSE_DURATION (default 30 days) the payee may resume
     * the stream unilaterally. This closes the griefing vector where a payer
     * pauses the stream and disappears, leaving the payee unable to claim
     * future flow without DAO intervention.
     * @param streamId streamId
     */
    function resumeStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (!s.paused) revert PM_StreamNotPaused();

        bool isPayer = msg.sender == s.payer;
        bool isDao = msg.sender == dao;
        bool isPayee = msg.sender == s.payee;
        bool payeeResumeAllowed = isPayee && block.timestamp >= s.pausedAt + MAX_PAUSE_DURATION;

        if (!(isPayer || isDao || payeeResumeAllowed)) revert PM_NotAuthorized();

        // Resume from current time
        s.lastWithdrawTime = block.timestamp;
        s.paused = false;
        // DEEP-C-3 FIX: pausedAccrued is NOT cleared here - it represents
        // already-owed funds that payee can still claim. Clearing happens on withdraw.

        emit StreamResumed(streamId, msg.sender);
    }

    /**
     * @notice Modify stream rate (payer only)
     * @dev Settles current accrued before changing rate
     * @param streamId streamId
     * @param newRate newRate
     */
    function setRate(uint256 streamId, uint256 newRate) external nonReentrant {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (msg.sender != s.payer) revert PM_NotPayer();
        if (newRate == 0) revert PM_InvalidRate();
        uint256 oldRate = s.ratePerSecond;

        // Settle current accrued first
        uint256 due = claimable(streamId);
        s.ratePerSecond = newRate;
        if (due > 0 && !s.paused) {
            if (due > s.depositBalance) {
                due = s.depositBalance;
            }
            s.depositBalance -= due;
            s.lastWithdrawTime = block.timestamp;
            // M5e FIX: clear pausedAccrued because `due = claimable(streamId)` already includes it.
            // Without this, a pause→setRate→withdraw sequence double-counts the paused amount on next withdraw.
            s.pausedAccrued = 0;
            emit Withdraw(streamId, s.payee, due);
            _safeTransferPay(s.token, s.payee, due);
            // M-22 FIX: a settled withdrawal triggered by setRate now emits the same
            // Seer reward signal as a direct withdraw(), so trust accumulation is
            // consistent regardless of which code path settled the accrued amount.
            if (address(seer) != address(0)) {
                try seer.reward(s.payee, PAYROLL_WITHDRAW_REWARD, "payroll_received") {} catch {}
            }
        }

        emit RateModified(streamId, oldRate, newRate);
    }

    /**
     * @notice Update payee address (payee only)
     * @dev Useful if payee's wallet is compromised
     * @param streamId streamId
     * @param newPayee newPayee
     */
    function updatePayee(uint256 streamId, address newPayee) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (msg.sender != s.payee) revert PM_NotPayee();
        if (newPayee == address(0)) revert PM_InvalidPayee();

        // H-27 FIX: Propose with 48h timelock; apply separately.
        pendingPayeeUpdates[streamId] = PendingPayeeUpdate({
            newPayee: newPayee,
            validFrom: block.timestamp + PAYEE_UPDATE_DELAY
        });
        emit PayeeUpdated(streamId, s.payee, newPayee); // emitted at proposal not apply
    }

    /// @notice Apply a previously-proposed payee update after the 48h lock has elapsed.
    /// @param streamId streamId
    function applyPayeeUpdate(uint256 streamId) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        PendingPayeeUpdate storage p = pendingPayeeUpdates[streamId];
        require(p.validFrom != 0, "PM: no pending update");
        require(block.timestamp >= p.validFrom, "PM: timelock pending");
        require(msg.sender == s.payee || msg.sender == p.newPayee, "PM: not payee");
        require(activePayeeStreamCount[p.newPayee] < 200, "PM: payee stream cap");

        address oldPayee = s.payee;
        if (activePayeeStreamCount[oldPayee] > 0) {
            --activePayeeStreamCount[oldPayee];
        }
        ++activePayeeStreamCount[p.newPayee];
        s.payee = p.newPayee;
        delete pendingPayeeUpdates[streamId];
        emit PayeeUpdated(streamId, oldPayee, s.payee);
    }

    /// @notice Cancel a pending payee update (callable by current payee or payer).
    /// @param streamId streamId
    function cancelPayeeUpdate(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(msg.sender == s.payee || msg.sender == s.payer, "PM: not authorized");
        delete pendingPayeeUpdates[streamId];
    }

    /**
     * @notice Propose emergency withdraw by DAO (for contract migration or disputes)
     * @dev N-M38 FIX: execution is delayed by 7 days to prevent instant confiscation.
     * @dev #436 FIX: recipient must be the stream payer (prevents DAO draining to arbitrary address).
     * @param streamId streamId
     * @param to to
     */
    function emergencyWithdraw(uint256 streamId, address to) external onlyDAO {
        Stream storage s = streams[streamId];
        require(s.active, "PM: stream inactive");
        require(to != address(0), "PM: zero address");
        // #436 FIX: Funds must return to the payer, not an arbitrary DAO-chosen address.
        require(to == s.payer, "PM: recipient must be stream payer");

        PendingEmergencyWithdraw storage pending = pendingEmergencyWithdraws[streamId];
        require(pending.executeAfter == 0, "PM: pending emergency withdraw");

        uint64 executeAfter = uint64(block.timestamp) + EMERGENCY_WITHDRAW_DELAY;
        pendingEmergencyWithdraws[streamId] = PendingEmergencyWithdraw({
            to: to,
            executeAfter: executeAfter
        });

        emit EmergencyWithdrawProposed(streamId, to, s.depositBalance, executeAfter);
    }

    /// @notice applyEmergencyWithdraw
    /// @param streamId streamId
    function applyEmergencyWithdraw(uint256 streamId) external onlyDAO {
        Stream storage s = streams[streamId];
        require(s.active, "PM: stream inactive");

        PendingEmergencyWithdraw storage pending = pendingEmergencyWithdraws[streamId];
        require(pending.executeAfter != 0, "PM: no pending emergency withdraw");
        require(block.timestamp >= pending.executeAfter, "PM: emergency timelock");

        address to = pending.to;
        uint256 balance = s.depositBalance;
        s.depositBalance = 0;
        s.active = false;
        _decrementActiveCounts(s.payer, s.payee);
        delete pendingEmergencyWithdraws[streamId];

        emit EmergencyWithdraw(streamId, to, balance);

        _safeTransferPay(s.token, to, balance);
    }

    /// @notice cancelEmergencyWithdraw
    /// @param streamId streamId
    function cancelEmergencyWithdraw(uint256 streamId) external onlyDAO {
        PendingEmergencyWithdraw storage pending = pendingEmergencyWithdraws[streamId];
        require(pending.executeAfter != 0, "PM: no pending emergency withdraw");
        address to = pending.to;
        delete pendingEmergencyWithdraws[streamId];
        emit EmergencyWithdrawCancelled(streamId, to);
    }

    /**
     * Employee withdraws earned funds
     * Add nonReentrant to prevent reentrancy via malicious tokens
     * @notice withdraw
     * @param streamId streamId
     */
    function withdraw(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();

        uint256 amount = claimable(streamId);
        if (amount < 1) revert PM_NothingDue();

        // Safety cap
        if (amount > s.depositBalance) {
            amount = s.depositBalance;
        }

        s.depositBalance -= amount;
        s.lastWithdrawTime = block.timestamp;

        // DEEP-C-3 FIX: Clear paused accrued on ANY withdraw, not just while paused
        // This prevents double-counting: after resume, pausedAccrued persists in claimable()
        // but must be cleared once actually withdrawn
        if (s.pausedAccrued > 0) {
            s.pausedAccrued = 0;
        }

        emit Withdraw(streamId, s.payee, amount);
        _safeTransferPay(s.token, s.payee, amount);

        // Reward payee for successful withdrawal
        if (address(seer) != address(0)) {
            try seer.reward(s.payee, PAYROLL_WITHDRAW_REWARD, "payroll_received") {} catch {}
        }
    }

    /**
     * Calculate how much is currently claimable
     * @notice claimable
     * @param streamId streamId
     * @return _uint256 _uint256
     */
    function claimable(uint256 streamId) public view returns (uint256) {
        Stream storage s = streams[streamId];
        if (!s.active) return 0;

        // If paused, return the frozen accrued amount
        if (s.paused) {
            return s.pausedAccrued;
        }

        uint256 effectiveNow = block.timestamp;
        if (s.expiryTime > 0 && effectiveNow > s.expiryTime) {
            effectiveNow = s.expiryTime;
        }
        if (effectiveNow <= s.lastWithdrawTime) {
            return s.pausedAccrued;
        }

        uint256 timeDelta = effectiveNow - s.lastWithdrawTime;
        uint256 due = timeDelta * s.ratePerSecond;

        // Add any paused accrued (if resumed but not yet withdrawn)
        due += s.pausedAccrued;

        if (due > s.depositBalance) {
            return s.depositBalance;
        }
        return due;
    }

    /**
     * Cancel stream and return remaining funds to payer
     * Add nonReentrant to prevent reentrancy via malicious tokens
     * @notice cancelStream
     * @param streamId streamId
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (msg.sender != s.payer && msg.sender != s.payee) revert PM_NotAuthorized();
        if (!s.active) revert PM_StreamInactive();

        address token = s.token;
        address payee = s.payee;
        address payer = s.payer;

        // Settle pending
        uint256 due = claimable(streamId);
        if (due > s.depositBalance) {
            due = s.depositBalance;
        }

        uint256 remainder = s.depositBalance - due;
        s.depositBalance = 0;
        s.pausedAccrued = 0;
        s.active = false;
        _decrementActiveCounts(payer, payee);

        if (due > 0) {
            emit Withdraw(streamId, payee, due);
            _safeTransferPay(token, payee, due);
        }

        // Return remainder to payer
        if (remainder > 0) {
            _safeTransferPay(token, payer, remainder);
        }
        emit StreamCancelled(streamId);
    }

    /// @notice Reclaim remaining stream balance after hard expiry.
    /// @dev L-3 FIX: Restricted to payer or payee to prevent permissionless griefing.
    /// @param streamId streamId
    function claimExpiredStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (block.timestamp < s.expiryTime) revert PM_StreamNotExpired();
        require(msg.sender == s.payer || msg.sender == s.payee, "PM: not authorized");

        // Calculate payee's accrued wages (capped at expiry)
        uint256 payeeClaimable = claimable(streamId);
        uint256 remaining = s.depositBalance;
        s.depositBalance = 0;
        s.active = false;
        s.pausedAccrued = 0;
        _decrementActiveCounts(s.payer, s.payee);

        // Transfer payee's earned wages first
        if (payeeClaimable > 0) {
            _safeTransferPay(s.token, s.payee, payeeClaimable);
        }

        // Return remainder to payer
        uint256 toReturn = remaining > payeeClaimable ? remaining - payeeClaimable : 0;
        if (toReturn > 0) {
            _safeTransferPay(s.token, s.payer, toReturn);
        }
        emit StreamExpired(streamId, msg.sender, remaining);
    }

    /// @notice POW-13 FIX: Reclaim multiple expired streams in one call.
    ///         A power business that ran 200 payroll streams for a year
    ///         hits MAX_STREAM_DURATION and all streams expire. The
    ///         per-payer slot count (capped at 200) does NOT decrement
    ///         until each stream is individually claimed via
    ///         `claimExpiredStream`. Without a batch helper, the payer
    ///         had to send 200 individual transactions to free their
    ///         slots before they could start a new round of payroll.
    ///
    ///         This helper iterates the supplied stream IDs and reclaims
    ///         each that belongs to the caller and is past its expiry.
    ///         IDs that are not the caller's, not expired, or already
    ///         inactive are silently skipped (no revert) so a partially-
    ///         valid batch does not waste the entire transaction.
    ///
    ///         Bounded to 100 IDs per call to keep gas usage predictable.
    // slither-disable-start reentrancy-no-eth
    // function has nonReentrant guard; per-stream state updates are atomic
    /// @notice claimExpiredStreamBatch
    /// @param streamIds streamIds
    function claimExpiredStreamBatch(uint256[] calldata streamIds) external nonReentrant {
        require(streamIds.length <= 100, "PM: batch too large");
        for (uint256 i = 0; i < streamIds.length; ++i) {
            uint256 streamId = streamIds[i];
            Stream storage s = streams[streamId];
            if (!s.active) continue;
            if (block.timestamp < s.expiryTime) continue;
            if (msg.sender != s.payer && msg.sender != s.payee) continue;

            uint256 payeeClaimable = claimable(streamId);
            uint256 remaining = s.depositBalance;
            s.depositBalance = 0;
            s.active = false;
            s.pausedAccrued = 0;
            _decrementActiveCounts(s.payer, s.payee);

            if (payeeClaimable > 0) {
                _safeTransferPay(s.token, s.payee, payeeClaimable);
            }
            uint256 toReturn = remaining > payeeClaimable ? remaining - payeeClaimable : 0;
            if (toReturn > 0) {
                _safeTransferPay(s.token, s.payer, toReturn);
            }
            emit StreamExpired(streamId, msg.sender, remaining);
        }
    }
    // slither-disable-end reentrancy-no-eth

    // ═══════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get full stream info
     * @param streamId streamId
     * @return _arg _arg
     */
    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }

    /**
     * @notice Get stream status summary
     * @param streamId streamId
     * @return active active
     * @return paused paused
     * @return currentClaimable currentClaimable
     * @return remainingBalance remainingBalance
     * @return ratePerSecond ratePerSecond
     * @return runwaySeconds runwaySeconds
     */
    function getStreamStatus(
        uint256 streamId
    )
        external
        view
        returns (
            bool active,
            bool paused,
            uint256 currentClaimable,
            uint256 remainingBalance,
            uint256 ratePerSecond,
            uint256 runwaySeconds
        )
    {
        Stream storage s = streams[streamId];
        active = s.active;
        paused = s.paused;
        currentClaimable = claimable(streamId);
        remainingBalance = s.depositBalance;
        ratePerSecond = s.ratePerSecond;
        runwaySeconds = s.ratePerSecond > 0 ? s.depositBalance / s.ratePerSecond : 0;
    }

    /**
     * @notice Estimate when stream will run out of funds
     * @param streamId streamId
     * @return _uint256 _uint256
     */
    function estimateEndTime(uint256 streamId) external view returns (uint256) {
        Stream storage s = streams[streamId];
        if (!s.active || s.paused || s.ratePerSecond == 0) return 0;

        uint256 remaining = s.depositBalance;
        uint256 due = claimable(streamId);
        if (due >= remaining) return block.timestamp;

        remaining -= due;
        return block.timestamp + (remaining / s.ratePerSecond);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                     PAYER/PAYEE QUERY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get all stream IDs where user is payer (employer)
     * @param payer payer
     * @return _arg _arg
     */
    function getPayerStreams(address payer) external view returns (uint256[] memory) {
        return payerStreams[payer];
    }

    /**
     * @notice Get all stream IDs where user is payee (employee)
     * @param payee payee
     * @return _arg _arg
     */
    function getPayeeStreams(address payee) external view returns (uint256[] memory) {
        return payeeStreams[payee];
    }

    /**
     * @notice Get total obligations for a payer (total rate per second across all active streams)
     * @param payer payer
     * @return activeStreamCount activeStreamCount
     * @return totalRatePerSecond totalRatePerSecond
     * @return totalDeposited totalDeposited
     * @return totalClaimable totalClaimable
     */
    function getTotalObligations(
        address payer
    )
        external
        view
        returns (
            uint256 activeStreamCount,
            uint256 totalRatePerSecond,
            uint256 totalDeposited,
            uint256 totalClaimable
        )
    {
        uint256[] memory ids = payerStreams[payer];
        for (uint256 i = 0; i < ids.length; ++i) {
            Stream storage s = streams[ids[i]];
            if (s.active) {
                ++activeStreamCount;
                if (!s.paused) {
                    totalRatePerSecond += s.ratePerSecond;
                }
                totalDeposited += s.depositBalance;
                totalClaimable += claimable(ids[i]);
            }
        }
    }

    /**
     * @notice Get total earnings for a payee across all active streams
     * @param payee payee
     * @return activeStreamCount activeStreamCount
     * @return totalRatePerSecond totalRatePerSecond
     * @return totalClaimable totalClaimable
     */
    function getTotalEarnings(
        address payee
    )
        external
        view
        returns (uint256 activeStreamCount, uint256 totalRatePerSecond, uint256 totalClaimable)
    {
        uint256[] memory ids = payeeStreams[payee];
        for (uint256 i = 0; i < ids.length; ++i) {
            Stream storage s = streams[ids[i]];
            if (s.active) {
                ++activeStreamCount;
                if (!s.paused) {
                    totalRatePerSecond += s.ratePerSecond;
                }
                totalClaimable += claimable(ids[i]);
            }
        }
    }

    /**
     * @notice Batch get stream statuses
     * @param streamIds streamIds
     * @return results results
     */
    function getStreamsBatch(
        uint256[] calldata streamIds
    ) external view returns (Stream[] memory results) {
        results = new Stream[](streamIds.length);
        for (uint256 i = 0; i < streamIds.length; ++i) {
            results[i] = streams[streamIds[i]];
        }
    }

    /// @notice _decrementActiveCounts
    /// @param payer payer
    /// @param payee payee
    function _decrementActiveCounts(address payer, address payee) internal {
        if (activePayerStreamCount[payer] > 0) {
            --activePayerStreamCount[payer];
        }
        if (activePayeeStreamCount[payee] > 0) {
            --activePayeeStreamCount[payee];
        }
    }
}
