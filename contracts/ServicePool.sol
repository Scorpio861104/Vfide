// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

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

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    // ═══════════════════════════════════════════════════════════
    // PERIOD MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    IERC20 public immutable vfideToken;

    uint256 public constant PERIOD_DURATION = 30 days;
    uint256 public currentPeriod;
    uint256 public periodStartTime;
    uint256 public maxParticipants;     // Cap per pool (e.g. 12 for DAO)
    uint256 public maxPayoutPerPeriod;  // Safety cap

    // ═══════════════════════════════════════════════════════════
    // PER-PERIOD STATE
    // ═══════════════════════════════════════════════════════════

    // period => participant => contribution score
    mapping(uint256 => mapping(address => uint256)) public scores;
    // period => total score across all participants
    mapping(uint256 => uint256) public totalScores;
    // period => list of participants who scored > 0
    mapping(uint256 => address[]) internal _participants;
    // period => participant => whether already in the list
    mapping(uint256 => mapping(address => bool)) internal _isParticipant;
    // period => finalized
    mapping(uint256 => bool) public periodFinalized;
    // period => snapshot of balance at finalization
    mapping(uint256 => uint256) public periodPool;
    // period => participant => claimed
    mapping(uint256 => mapping(address => bool)) public claimed;

    // Lifetime tracking
    uint256 public totalPaidAllTime;
    uint256 public totalCommitted;  // Tokens promised to finalized periods but not yet claimed
    mapping(address => uint256) public totalEarnedByWorker;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    event PeriodStarted(uint256 indexed period, uint256 startTime);
    event ContributionRecorded(
        uint256 indexed period,
        address indexed participant,
        uint256 addedScore,
        uint256 newTotal
    );
    event PeriodFinalized(
        uint256 indexed period,
        uint256 participantCount,
        uint256 totalScore,
        uint256 poolAmount
    );
    event PaymentClaimed(
        uint256 indexed period,
        address indexed participant,
        uint256 amount,
        uint256 participantScore,
        uint256 totalScore
    );
    event FundingReceived(uint256 amount, uint256 newBalance);

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    error ZeroAddress();
    error ZeroAmount();
    error PeriodStillActive();
    error PeriodAlreadyFinalized();
    error PeriodNotFinalized();
    error AlreadyClaimed();
    error NoContribution();
    error NothingToClaim();
    error MaxParticipantsReached();

    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

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
    function _recordContribution(address participant, uint256 score) internal {
        if (participant == address(0)) revert ZeroAddress();
        if (score == 0) revert ZeroAmount();

        _advancePeriodIfNeeded();
        _recordContributionForCurrentPeriod(participant, score);
    }

    function _recordContributionForCurrentPeriod(address participant, uint256 score) internal {
        uint256 period = currentPeriod;

        // Register participant if new this period
        if (!_isParticipant[period][participant]) {
            if (_participants[period].length >= maxParticipants) revert MaxParticipantsReached();
            _participants[period].push(participant);
            _isParticipant[period][participant] = true;
        }

        scores[period][participant] += score;
        totalScores[period] += score;

        emit ContributionRecorded(
            period,
            participant,
            score,
            scores[period][participant]
        );
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
    function finalizePeriod(uint256 period) external nonReentrant {
        if (period >= currentPeriod) revert PeriodStillActive();
        if (periodFinalized[period]) revert PeriodAlreadyFinalized();

        uint256 participantCount = _participants[period].length;

        if (participantCount == 0 || totalScores[period] == 0) {
            // No work done — balance carries forward to next period
            periodFinalized[period] = true;
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

        emit PeriodFinalized(period, participantCount, totalScores[period], pool);
    }

    // ═══════════════════════════════════════════════════════════
    // CLAIM PAYMENT
    // ═══════════════════════════════════════════════════════════

    /// @notice Claim your proportional share of a finalized period's pool.
    ///         Payment = (your score / total score) * pool amount
    function claimPayment(uint256 period) external nonReentrant whenNotPaused {
        if (!periodFinalized[period]) revert PeriodNotFinalized();
        if (claimed[period][msg.sender]) revert AlreadyClaimed();

        uint256 myScore = scores[period][msg.sender];
        if (myScore == 0) revert NoContribution();

        uint256 pool = periodPool[period];
        if (pool == 0) revert NothingToClaim();

        // Proportional payment: (myScore / totalScore) * pool
        uint256 payment = (pool * myScore) / totalScores[period];
        if (payment == 0) revert NothingToClaim();

        claimed[period][msg.sender] = true;
        totalPaidAllTime += payment;
        totalEarnedByWorker[msg.sender] += payment;
        totalCommitted -= payment;

        vfideToken.safeTransfer(msg.sender, payment);

        emit PaymentClaimed(period, msg.sender, payment, myScore, totalScores[period]);
    }

    /// @notice Batch claim across multiple periods.
    function batchClaim(uint256[] calldata periods) external nonReentrant whenNotPaused {
        require(periods.length <= 50, "Batch too large");
        uint256 totalPayment = 0;

        for (uint256 i = 0; i < periods.length;) {
            uint256 period = periods[i];

            if (
                periodFinalized[period] &&
                !claimed[period][msg.sender] &&
                scores[period][msg.sender] > 0 &&
                periodPool[period] > 0
            ) {
                uint256 payment = (periodPool[period] * scores[period][msg.sender]) / totalScores[period];
                if (payment > 0) {
                    claimed[period][msg.sender] = true;
                    totalPayment += payment;
                    emit PaymentClaimed(period, msg.sender, payment, scores[period][msg.sender], totalScores[period]);
                }
            }

            unchecked { i++; }
        }

        if (totalPayment == 0) revert NothingToClaim();

        totalPaidAllTime += totalPayment;
        totalEarnedByWorker[msg.sender] += totalPayment;
        totalCommitted -= totalPayment;
        vfideToken.safeTransfer(msg.sender, totalPayment);
    }

    // ═══════════════════════════════════════════════════════════
    // FUNDING — FeeDistributor sends tokens here
    // ═══════════════════════════════════════════════════════════

    /// @notice Accept funding from FeeDistributor or bootstrap.
    function receiveFunding(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
        emit FundingReceived(amount, vfideToken.balanceOf(address(this)));
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════

    function setMaxParticipants(uint256 _max) external onlyRole(ADMIN_ROLE) {
        maxParticipants = _max;
    }

    function setMaxPayoutPerPeriod(uint256 _max) external onlyRole(ADMIN_ROLE) {
        maxPayoutPerPeriod = _max;
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function emergencyWithdraw(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        vfideToken.safeTransfer(to, vfideToken.balanceOf(address(this)));
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function getParticipants(uint256 period) external view returns (address[] memory) {
        return _participants[period];
    }

    function getParticipantCount(uint256 period) external view returns (uint256) {
        return _participants[period].length;
    }

    function availableBalance() external view returns (uint256) {
        return vfideToken.balanceOf(address(this));
    }

    function timeUntilPeriodEnd() external view returns (uint256) {
        uint256 end = periodStartTime + PERIOD_DURATION;
        if (block.timestamp >= end) return 0;
        return end - block.timestamp;
    }

    /// @notice Preview what a participant would earn if period finalized now.
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

    function _advancePeriodIfNeeded() internal {
        if (block.timestamp >= periodStartTime + PERIOD_DURATION) {
            uint256 elapsed = block.timestamp - periodStartTime;
            uint256 periods = Math.mulDiv(elapsed, 1, PERIOD_DURATION);
            currentPeriod += periods;
            periodStartTime += periods * PERIOD_DURATION;
            emit PeriodStarted(currentPeriod, block.timestamp);
        }
    }
}
