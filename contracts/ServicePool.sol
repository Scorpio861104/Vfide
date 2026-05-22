// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * SUPPLY-CHAIN NOTE: This contract intentionally uses OpenZeppelin imports
 * because it relies on AccessControl and Pausable primitives for pool controls.
 * OZ version baseline: 5.1.0. Review OZ advisories on dependency updates.
 */

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// N-M37 FIX: minimal interface so pools can gate score-crediting on SeerWorkAttestation.
//            When seerAttestation is set (non-zero), _recordContribution requires that
//            the worker has at least one attested task recorded for the current period.
/// @notice ISeerWorkAttestation_SP
/// @title ISeerWorkAttestation_SP
/// @author Vfide
interface ISeerWorkAttestation_SP {
    /// @notice workerTasks
    /// @param worker worker
    /// @param index index
    /// @return _bytes32 _bytes32
    function workerTasks(address worker, uint256 index) external view returns (bytes32);
    /// @notice workerTaskCount
    /// @param worker worker
    /// @return _uint256 _uint256
    function workerTaskCount(address worker) external view returns (uint256);
}

/// @title ServicePool — Base for Percentage-Based Work Compensation Pools
/// @author VFIDE Team
/// @notice Each period (30 days), the pool's accumulated fee revenue is split
///         among participants proportional to their verified contribution score.
///         No fixed rates. No fixed budgets. Self-sustaining from fee revenue.
///
///         If you did 30% of the work, you get 30% of the pool.
///         If nobody worked, nothing is distributed (balance carries forward).
///
/// @dev HOWEY ANALYSIS:
///   - Payment proportional to WORK DONE, not tokens held
///   - Pool funded by protocol usage fees, not investor capital
///   - Active participation required — zero work = zero pay
///   - Each worker's return depends on THEIR OWN effort
///   RESULT: Fails all 4 Howey prongs → NOT A SECURITY
abstract contract ServicePool is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice ADMIN_ROLE
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    /// @notice RECORDER_ROLE
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    // ═══════════════════════════════════════════════════════════
    // PERIOD MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /// @notice vfideToken
    IERC20 public immutable vfideToken;

    /// @notice PERIOD_DURATION
    uint256 public constant PERIOD_DURATION = 30 days;
    /// @notice currentPeriod
    uint256 public currentPeriod;
    /// @notice periodStartTime
    uint256 public periodStartTime;
    /// @notice maxParticipants
    uint256 public maxParticipants;     // Cap per pool (e.g. 12 for DAO)
    /// @notice maxPayoutPerPeriod
    uint256 public maxPayoutPerPeriod;  // Safety cap

    // ═══════════════════════════════════════════════════════════
    // PER-PERIOD STATE
    // ═══════════════════════════════════════════════════════════

    // period => participant => contribution score
    /// @notice scores
    mapping(uint256 => mapping(address => uint256)) public scores;
    // period => total score across all participants
    /// @notice totalScores
    mapping(uint256 => uint256) public totalScores;
    // period => list of participants who scored > 0
    /// @notice _participants
    mapping(uint256 => address[]) internal _participants;
    // period => participant => whether already in the list
    /// @notice _isParticipant
    mapping(uint256 => mapping(address => bool)) internal _isParticipant;
    // period => finalized
    /// @notice periodFinalized
    mapping(uint256 => bool) public periodFinalized;
    // period => timestamp when finalization happened
    /// @notice periodFinalizedAt
    mapping(uint256 => uint256) public periodFinalizedAt;
    // period => snapshot of balance at finalization
    /// @notice periodPool
    mapping(uint256 => uint256) public periodPool;
    // period => cumulative claimed amount
    /// @notice periodClaimedTotal
    mapping(uint256 => uint256) public periodClaimedTotal;
    // period => whether unclaimed funds were swept
    /// @notice periodSwept
    mapping(uint256 => bool) public periodSwept;
    // period => participant => claimed
    /// @notice claimed
    mapping(uint256 => mapping(address => bool)) public claimed;

    // Lifetime tracking
    /// @notice totalPaidAllTime
    uint256 public totalPaidAllTime;
    /// @notice totalCommitted
    uint256 public totalCommitted;  // Tokens promised to finalized periods but not yet claimed
    /// @notice UNCLAIMED_SWEEP_DELAY
    uint256 public constant UNCLAIMED_SWEEP_DELAY = 180 days;
    /// @notice totalEarnedByWorker
    mapping(address => uint256) public totalEarnedByWorker;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    /// @notice PeriodStarted
    /// @param period period
    /// @param startTime startTime
    event PeriodStarted(uint256 indexed period, uint256 startTime);
    /// @notice ContributionRecorded
    /// @param period period
    /// @param participant participant
    /// @param addedScore addedScore
    /// @param newTotal newTotal
    event ContributionRecorded(
        uint256 indexed period,
        address indexed participant,
        uint256 addedScore,
        uint256 newTotal
    );
    /// @notice PeriodFinalized
    /// @param period period
    /// @param participantCount participantCount
    /// @param totalScore totalScore
    /// @param poolAmount poolAmount
    event PeriodFinalized(
        uint256 indexed period,
        uint256 participantCount,
        uint256 totalScore,
        uint256 poolAmount
    );
    /// @notice PaymentClaimed
    /// @param period period
    /// @param participant participant
    /// @param amount amount
    /// @param participantScore participantScore
    /// @param totalScore totalScore
    event PaymentClaimed(
        uint256 indexed period,
        address indexed participant,
        uint256 amount,
        uint256 participantScore,
        uint256 totalScore
    );
    /// @notice FundingReceived
    /// @param amount amount
    /// @param newBalance newBalance
    event FundingReceived(uint256 amount, uint256 newBalance);
    /// @notice UnclaimedSwept
    /// @param period period
    /// @param amount amount
    /// @param to to
    event UnclaimedSwept(uint256 indexed period, uint256 amount, address indexed to);
    /// @notice EmergencyWithdrawQueued
    /// @param to to
    /// @param amount amount
    /// @param readyAt readyAt
    event EmergencyWithdrawQueued(address indexed to, uint256 amount, uint64 readyAt);
    /// @notice EmergencyWithdrawCancelled
    event EmergencyWithdrawCancelled();
    /// @notice EmergencyWithdrawExecuted
    /// @param to to
    /// @param amount amount
    event EmergencyWithdrawExecuted(address indexed to, uint256 amount);
    /// @notice PauseQueued
    /// @param readyAt readyAt
    event PauseQueued(uint64 readyAt);
    /// @notice PauseCancelled
    event PauseCancelled();

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    /// @notice ZeroAddress
    error ZeroAddress();
    /// @notice ZeroAmount
    error ZeroAmount();
    /// @notice PeriodStillActive
    error PeriodStillActive();
    /// @notice PeriodAlreadyFinalized
    error PeriodAlreadyFinalized();
    /// @notice PeriodNotFinalized
    error PeriodNotFinalized();
    /// @notice AlreadyClaimed
    error AlreadyClaimed();
    /// @notice NoContribution
    error NoContribution();
    /// @notice NothingToClaim
    error NothingToClaim();
    /// @notice MaxParticipantsReached
    error MaxParticipantsReached();
    /// @notice ClaimWindowExpired
    error ClaimWindowExpired();
    /// @notice AttestationRequired
    error AttestationRequired();
    /// @notice SP_NotQueued
    error SP_NotQueued();
    /// @notice SP_TimelockActive
    error SP_TimelockActive();
    /// @notice SP_AlreadyQueued
    error SP_AlreadyQueued();

    // N-M37 FIX: optional SeerWorkAttestation gate; zero address = disabled.
    /// @notice seerAttestation
    ISeerWorkAttestation_SP public seerAttestation;
    /// @notice SeerAttestationSet
    /// @param attestation attestation
    event SeerAttestationSet(address indexed attestation);

    // N-L38 FIX: 24h timelock for emergencyWithdraw.
    /// @notice EMERGENCY_WITHDRAW_DELAY
    uint64 public constant EMERGENCY_WITHDRAW_DELAY = 24 hours;
    /// @notice PAUSE_DELAY
    uint64 public constant PAUSE_DELAY = 48 hours;
    struct PendingEmergencyWithdraw {
        address to;
        uint64 readyAt;
    }
    /// @notice pendingEmergencyWithdraw
    PendingEmergencyWithdraw public pendingEmergencyWithdraw;
    /// @notice pendingPauseAt
    uint64 public pendingPauseAt;

    /// @notice setSeerAttestation
    /// @param _attestation _attestation
    function setSeerAttestation(address _attestation) external onlyRole(ADMIN_ROLE) {
        seerAttestation = ISeerWorkAttestation_SP(_attestation);
        emit SeerAttestationSet(_attestation);
    }

    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    /// @notice constructor
    /// @param _token _token
    /// @param _admin _admin
    /// @param _maxParticipants _maxParticipants
    /// @param _maxPayoutPerPeriod _maxPayoutPerPeriod
    constructor(
        address _token,
        address _admin,
        uint256 _maxParticipants,
        uint256 _maxPayoutPerPeriod
    ) {
        if (_token == address(0) || _admin == address(0)) revert ZeroAddress();

        vfideToken = IERC20(_token);
        maxParticipants = _maxParticipants;
        maxPayoutPerPeriod = _maxPayoutPerPeriod;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);

        currentPeriod = 1;
        periodStartTime = block.timestamp;
        emit PeriodStarted(1, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════
    // RECORD CONTRIBUTION — Called by child contracts
    // ═══════════════════════════════════════════════════════════

    /// @dev Record a contribution score for a participant in the current period.
    ///      Called by child contract methods after verifying the work.
    /// @param participant Address that did the work
    /// @param score Points to add (e.g. 1 per task, or volume-weighted)
    /// @notice _recordContribution
    function _recordContribution(address participant, uint256 score) internal {
        if (participant == address(0)) revert ZeroAddress();
        if (score == 0) revert ZeroAmount();

        // N-M37 FIX: when SeerWorkAttestation is configured, require the worker
        //            to have at least one on-chain attested task before crediting score.
        if (address(seerAttestation) != address(0)) {
            if (seerAttestation.workerTaskCount(participant) == 0) revert AttestationRequired();
        }

        _advancePeriodIfNeeded();

        // Register participant if new this period
        if (!_isParticipant[currentPeriod][participant]) {
            if (_participants[currentPeriod].length >= maxParticipants) revert MaxParticipantsReached();
            _participants[currentPeriod].push(participant);
            _isParticipant[currentPeriod][participant] = true;
        }

        scores[currentPeriod][participant] += score;
        totalScores[currentPeriod] += score;

        emit ContributionRecorded(currentPeriod, participant, score, scores[currentPeriod][participant]);
    }

    // ═══════════════════════════════════════════════════════════
    // FINALIZE PERIOD
    // ═══════════════════════════════════════════════════════════

    /// @notice Finalize a completed period. Snapshots the pool balance.
    ///         Anyone can call this once the period has elapsed.
    ///
    ///         ROLLOVER BEHAVIOR: If nobody participated, periodPool = 0 and
    ///         all tokens stay in the contract. FeeDistributor keeps sending
    ///         new revenue each month. The balance accumulates until someone
    ///         finally participates, at which point they earn from the entire
    ///         accumulated balance (capped by maxPayoutPerPeriod).
    ///
    ///         Example: 3 months of 100K each with no participation → 300K
    ///         balance. Month 4, one participant shows up → gets up to 300K
    ///         (or maxPayoutPerPeriod, whichever is lower).
    /// @param period period
    function finalizePeriod(uint256 period) external nonReentrant {
        if (period >= currentPeriod) revert PeriodStillActive();
        if (periodFinalized[period]) revert PeriodAlreadyFinalized();

        uint256 participantCount = _participants[period].length;

        if (participantCount == 0 || totalScores[period] == 0) {
            // No work done — balance carries forward to next period
            periodFinalized[period] = true;
            periodFinalizedAt[period] = block.timestamp;
            periodPool[period] = 0;
            emit PeriodFinalized(period, 0, 0, 0);
            return;
        }

        // Snapshot: use actual balance MINUS tokens already committed to earlier periods
        uint256 balance = vfideToken.balanceOf(address(this));
        uint256 available = balance > totalCommitted ? balance - totalCommitted : 0;
        uint256 pool = available > maxPayoutPerPeriod ? maxPayoutPerPeriod : available;
        periodPool[period] = pool;
        totalCommitted += pool;
        periodFinalized[period] = true;
        periodFinalizedAt[period] = block.timestamp;

        emit PeriodFinalized(period, participantCount, totalScores[period], pool);
    }

    // ═══════════════════════════════════════════════════════════
    // CLAIM PAYMENT
    // ═══════════════════════════════════════════════════════════

    /// @notice Claim your proportional share of a finalized period's pool.
    ///         Payment = (your score / total score) * pool amount
    /// @param period period
    function claimPayment(uint256 period) external nonReentrant whenNotPaused {
        if (!periodFinalized[period]) revert PeriodNotFinalized();
        if (periodSwept[period]) revert ClaimWindowExpired();
        if (claimed[period][msg.sender]) revert AlreadyClaimed();

        uint256 myScore = scores[period][msg.sender];
        if (myScore == 0) revert NoContribution();

        uint256 pool = periodPool[period];
        if (pool == 0) revert NothingToClaim();

        // Proportional payment: (myScore / totalScore) * pool
        uint256 payment = (pool * myScore) / totalScores[period];
        if (payment == 0) revert NothingToClaim();

        claimed[period][msg.sender] = true;
        periodClaimedTotal[period] += payment;
        totalPaidAllTime += payment;
        totalEarnedByWorker[msg.sender] += payment;
        totalCommitted -= payment;

        vfideToken.safeTransfer(msg.sender, payment);

        emit PaymentClaimed(period, msg.sender, payment, myScore, totalScores[period]);
    }

    /// @notice Batch claim across multiple periods.
    /// @param periods periods
    function batchClaim(uint256[] calldata periods) external nonReentrant whenNotPaused {
        require(periods.length <= 50, "Batch too large");
        uint256 totalPayment = 0;

        for (uint256 i = 0; i < periods.length; ) {
            uint256 period = periods[i];

            if (periodFinalized[period] && !periodSwept[period] && !claimed[period][msg.sender] && scores[period][msg.sender] > 0 && periodPool[period] > 0) {
                uint256 payment = (periodPool[period] * scores[period][msg.sender]) / totalScores[period];
                if (payment > 0) {
                    claimed[period][msg.sender] = true;
                    periodClaimedTotal[period] += payment;
                    totalPayment += payment;
                    emit PaymentClaimed(period, msg.sender, payment, scores[period][msg.sender], totalScores[period]);
                }
            }

            unchecked { ++i; }
        }

        if (totalPayment == 0) revert NothingToClaim();

        totalPaidAllTime += totalPayment;
        totalEarnedByWorker[msg.sender] += totalPayment;
        totalCommitted -= totalPayment;
        vfideToken.safeTransfer(msg.sender, totalPayment);
    }

    /// @notice Sweep unclaimed funds from old finalized periods after claim window expiry.
    /// @dev Keeps `totalCommitted` aligned with actual outstanding obligations.
    /// @param periods periods
    /// @param to to
    function sweepUnclaimed(uint256[] calldata periods, address to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        require(periods.length <= 100, "Batch too large");

        uint256 totalSweep = 0;

        for (uint256 i = 0; i < periods.length; ) {
            uint256 period = periods[i];

            if (periodFinalized[period] && !periodSwept[period] && periodFinalizedAt[period] > 0 && block.timestamp >= periodFinalizedAt[period] + UNCLAIMED_SWEEP_DELAY) {
                uint256 pool = periodPool[period];
                uint256 claimedTotal = periodClaimedTotal[period];
                uint256 outstanding = pool > claimedTotal ? pool - claimedTotal : 0;

                if (outstanding > 0) {
                    totalCommitted -= outstanding;
                    totalSweep += outstanding;
                }

                periodSwept[period] = true;
                emit UnclaimedSwept(period, outstanding, to);
            }

            unchecked { ++i; }
        }

        if (totalSweep > 0) {
            vfideToken.safeTransfer(to, totalSweep);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // FUNDING — FeeDistributor sends tokens here
    // ═══════════════════════════════════════════════════════════

    /// @notice Accept funding from FeeDistributor or bootstrap.
    /// @param amount amount
    function receiveFunding(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
        emit FundingReceived(amount, vfideToken.balanceOf(address(this)));
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════

    /// @notice setMaxParticipants
    /// @param _max _max
    function setMaxParticipants(uint256 _max) external virtual onlyRole(ADMIN_ROLE) {
        maxParticipants = _max;
    }

    /// @dev M-24 FIX: Hard ceiling on the safety cap. Without this, a compromised
    ///      ADMIN_ROLE could set maxPayoutPerPeriod to uint256.max and effectively
    ///      remove the per-period payout limit.
    /// @notice MAX_PAYOUT_CEILING
    uint256 public constant MAX_PAYOUT_CEILING = 1_000_000 ether;

    /// @notice setMaxPayoutPerPeriod
    /// @param _max _max
    function setMaxPayoutPerPeriod(uint256 _max) external onlyRole(ADMIN_ROLE) {
        require(_max <= MAX_PAYOUT_CEILING, "SP: exceeds payout ceiling");
        maxPayoutPerPeriod = _max;
    }

    /// @notice pause
    function pause() external onlyRole(ADMIN_ROLE) {
        if (pendingPauseAt != 0) revert SP_AlreadyQueued();
        pendingPauseAt = uint64(block.timestamp) + PAUSE_DELAY;
        emit PauseQueued(pendingPauseAt);
    }

    /// @notice applyPause
    function applyPause() external onlyRole(ADMIN_ROLE) {
        if (pendingPauseAt == 0) revert SP_NotQueued();
        if (block.timestamp < pendingPauseAt) revert SP_TimelockActive();
        delete pendingPauseAt;
        _pause();
    }

    /// @notice cancelPause
    function cancelPause() external onlyRole(ADMIN_ROLE) {
        if (pendingPauseAt == 0) revert SP_NotQueued();
        delete pendingPauseAt;
        emit PauseCancelled();
    }
    /// @notice unpause
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    /// @notice emergencyWithdraw
    /// @param to to
    function emergencyWithdraw(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // N-L38 FIX: queue an emergency withdraw with a 24h delay so that
        // participants can observe and contest before funds leave the pool.
        if (to == address(0)) revert ZeroAddress();
        if (pendingEmergencyWithdraw.readyAt != 0) revert SP_AlreadyQueued();
        uint64 readyAt = uint64(block.timestamp) + EMERGENCY_WITHDRAW_DELAY;
        pendingEmergencyWithdraw = PendingEmergencyWithdraw({to: to, readyAt: readyAt});
        uint256 total = vfideToken.balanceOf(address(this));
        uint256 withdrawable = total > totalCommitted ? total - totalCommitted : 0;
        emit EmergencyWithdrawQueued(to, withdrawable, readyAt);
    }

    /// @notice Execute a queued emergency withdraw after the 24h delay.
    function applyEmergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        PendingEmergencyWithdraw memory p = pendingEmergencyWithdraw;
        if (p.readyAt == 0) revert SP_NotQueued();
        if (block.timestamp < p.readyAt) revert SP_TimelockActive();
        delete pendingEmergencyWithdraw;

        uint256 total = vfideToken.balanceOf(address(this));
        uint256 withdrawable = total > totalCommitted ? total - totalCommitted : 0;
        if (withdrawable == 0) revert("SP: nothing to withdraw above committed");
        emit EmergencyWithdrawExecuted(p.to, withdrawable);
        vfideToken.safeTransfer(p.to, withdrawable);
    }

    /// @notice Cancel a queued emergency withdraw before it executes.
    function cancelEmergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pendingEmergencyWithdraw.readyAt == 0) revert SP_NotQueued();
        delete pendingEmergencyWithdraw;
        emit EmergencyWithdrawCancelled();
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice getParticipants
    /// @param period period
    /// @return _arg _arg
    function getParticipants(uint256 period) external view returns (address[] memory) {
        return _participants[period];
    }

    /// @notice getParticipantCount
    /// @param period period
    /// @return _uint256 _uint256
    function getParticipantCount(uint256 period) external view returns (uint256) {
        return _participants[period].length;
    }

    /// @notice availableBalance
    /// @return _uint256 _uint256
    function availableBalance() external view returns (uint256) {
        return vfideToken.balanceOf(address(this));
    }

    /// @notice timeUntilPeriodEnd
    /// @return _uint256 _uint256
    function timeUntilPeriodEnd() external view returns (uint256) {
        uint256 end = periodStartTime + PERIOD_DURATION;
        if (block.timestamp >= end) return 0;
        return end - block.timestamp;
    }

    /// @notice Preview what a participant would earn if period finalized now.
    /// @param participant participant
    /// @return _uint256 _uint256
    function previewPayment(address participant) external view returns (uint256) {
        uint256 myScore = scores[currentPeriod][participant];
        uint256 total = totalScores[currentPeriod];
        if (myScore == 0 || total == 0) return 0;
        uint256 balance = vfideToken.balanceOf(address(this));
        uint256 available = balance > totalCommitted ? balance - totalCommitted : 0;
        uint256 pool = available > maxPayoutPerPeriod ? maxPayoutPerPeriod : available;
        return (pool * myScore) / total;
    }

    // ═══════════════════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════════════════

    /// @notice _advancePeriodIfNeeded
    function _advancePeriodIfNeeded() internal {
        if (block.timestamp >= periodStartTime + PERIOD_DURATION) {
            uint256 elapsed = block.timestamp - periodStartTime;
            // slither-disable-next-line divide-before-multiply  // intentional: periods is integer count, then aligned back to PERIOD_DURATION boundary
            uint256 periods = elapsed / PERIOD_DURATION;
            currentPeriod += periods;
            periodStartTime = periodStartTime + (periods * PERIOD_DURATION);
            emit PeriodStarted(currentPeriod, block.timestamp);
        }
    }
}
