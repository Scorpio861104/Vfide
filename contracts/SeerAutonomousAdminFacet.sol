// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ─────────────────────────────────────────────────────────────────────────────
//  SeerAutonomousAdminFacet
//
//  EIP-170 satellite for SeerAutonomous.  Contains the four largest DAO-only
//  administrative functions that are never called on hot paths:
//
//    • resolveChallenge          – DAO adjudication of user challenges
//    • daoOverride               – DAO clearance of a restriction
//    • daoSetThresholds          – DAO threshold tuning
//    • daoApplyMaxAutonomyProfile – DAO max-autonomy preset
//
//  Invoked exclusively via delegatecall from SeerAutonomous.  Executes in the
//  caller's storage context so all state reads/writes land on SeerAutonomous.
//
//  IMPORTANT: storage layout here must be IDENTICAL to SeerAutonomous up to
//  every slot that these functions touch.  New state variables must only be
//  appended at the END of SeerAutonomous, never inserted.
// ─────────────────────────────────────────────────────────────────────────────

import { SeerAutonomousLib } from "./SeerAutonomous.sol";

// ── Minimal interface reproductions (no imports to keep the facet self-contained) ──

interface IProofLedger_Facet {
    function logSystemEvent(address who, string calldata action, address by) external;
}

interface ISeer_Facet {
    function getScore(address subject) external view returns (uint16);
}

// ── Enums (must match SeerAutonomous exactly) ─────────────────────────────────

enum RestrictionLevel_F { None, Limited, Restricted, Suspended, Frozen }
enum ActionType_F       { Transfer, Vote, Endorse, Receive, Stake, Unstake, Borrow, Repay }
enum PatternType_F      { None, WashTrading, VoteSpam, EndorseSpam, RapidTransfer, Sybil }

// ── Error selectors (same 4-byte selectors as in SeerAutonomous) ─────────────

error SA_NotAuthorized();
error SA_NoChallenge();
error SA_InvalidThresholds();
error SA_InvalidSensitivity();

// ── Storage layout mirror  ────────────────────────────────────────────────────
//  Only the slots touched by the 4 extracted functions are declared here.
//  The layout MUST match SeerAutonomous slot-for-slot through these fields.

contract SeerAutonomousAdminFacet {

    // ── slot mirrors (order must match SeerAutonomous) ───────────────────────

    // slot 0 – ReentrancyGuard._status  (inherited, not accessed here)
    uint256 private _reentrancyStatus;

    // slots 1-4  – dao, seer, ledger, riskOracle, ecosystemVault
    address public dao;
    ISeer_Facet public seer;
    IProofLedger_Facet public ledger;
    address private riskOracle;
    address private ecosystemVault;

    // slot 5 – operators mapping (not accessed here)
    mapping(address => bool) private operators;

    // slots 6-7 – PendingRateLimitChange
    struct PendingRateLimitChange {
        RestrictionLevel_F level;
        ActionType_F       action;
        uint16             limit;
        uint64             executeAfter;
        bool               exists;
    }
    PendingRateLimitChange private pendingRateLimitChange;

    // slots 8 – PendingOperatorChange
    struct PendingOperatorChange {
        address operator;
        bool    authorized;
        uint64  executeAfter;
        bool    exists;
    }
    PendingOperatorChange private pendingOperatorChange;

    // user restriction state
    mapping(address => RestrictionLevel_F) public restrictionLevel;
    mapping(address => uint64)             public restrictionExpiry;
    mapping(address => bool)               public daoOverridden;
    mapping(address => uint64)             public daoOverrideExpiry;
    mapping(address => string)             public restrictionReason;

    struct PendingChallenge {
        uint64             deadline;
        RestrictionLevel_F targetLevel;
        string             reason;
        bool               exists;
    }
    mapping(address => PendingChallenge) public pendingChallenge;
    mapping(address => bool)             public challengeRequested;

    // activity tracking (not touched by these functions – padding only)
    struct ActivityWindow {
        uint64   windowStart;
        uint16   transferCount;
        uint16   voteCount;
        uint16   endorseCount;
        uint256  transferVolume;
        address[] recentCounterparties;
    }
    mapping(address => ActivityWindow) private activityWindows;
    mapping(address => uint8)          private recentCounterpartyRingIndex;

    // violation tracking (not touched)
    mapping(address => mapping(PatternType_F => uint8)) private patternViolations;
    mapping(address => uint64)  private lastViolationTime;
    mapping(address => uint16)  public  totalViolationScore;

    // dynamic thresholds
    uint16 public autoRestrictThreshold;
    uint16 public autoLiftThreshold;
    uint16 public rateLimitThreshold;
    uint16 public patternSensitivity;

    // rate limits
    mapping(address => mapping(ActionType_F => uint64))  private lastActionTime;
    mapping(address => mapping(ActionType_F => uint16))  private actionCountToday;
    mapping(address => uint64)                            private dailyResetTime;
    mapping(RestrictionLevel_F => mapping(ActionType_F => uint16)) public rateLimits;

    // ── Constants ────────────────────────────────────────────────────────────

    uint64 private constant DAO_OVERRIDE_DURATION = 30 days;

    // ── Events (identical selectors to SeerAutonomous) ───────────────────────

    event DAOThresholdsUpdated(
        uint16 oldAutoRestrict, uint16 newAutoRestrict,
        uint16 oldAutoLift,     uint16 newAutoLift,
        uint16 oldRateLimit,    uint16 newRateLimit,
        uint16 oldSensitivity,  uint16 newSensitivity
    );
    event DAORateLimitUpdated(RestrictionLevel_F level, ActionType_F action, uint16 oldLimit, uint16 newLimit);
    event DAOMaxAutonomyProfileApplied(address indexed by);
    event RestrictionApplied(address indexed subject, RestrictionLevel_F level, uint64 duration, string reason);
    event RestrictionAppliedCode(address indexed subject, RestrictionLevel_F level, uint16 indexed reasonCode, string reason);
    event RestrictionLifted(address indexed subject, RestrictionLevel_F oldLevel);
    event DAOOverride(address indexed subject, string reason);
    event ChallengeResolved(address indexed subject, bool upheld, string reason);
    event ChallengeResolvedCode(address indexed subject, bool upheld, uint16 indexed reasonCode, string reason);

    // ── Auth guard (mirrors onlyDAO in SeerAutonomous) ───────────────────────

    modifier onlyDAO() {
        if (msg.sender != dao) revert SA_NotAuthorized();
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EXTRACTED FUNCTION 1 – resolveChallenge
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice DAO resolves a pending challenge explicitly.
    /// @param subject The user under challenge.
    /// @param uphold  True to apply restriction; false to dismiss.
    function resolveChallenge(address subject, bool uphold) external onlyDAO {
        PendingChallenge storage ch = pendingChallenge[subject];
        if (!ch.exists) revert SA_NoChallenge();

        if (uphold) {
            restrictionLevel[subject]  = ch.targetLevel;
            restrictionExpiry[subject] = uint64(block.timestamp + 7 days);
            restrictionReason[subject] = ch.reason;
            emit RestrictionApplied(subject, ch.targetLevel, 7 days, ch.reason);
            emit RestrictionAppliedCode(subject, ch.targetLevel, 0, ch.reason);
            emit ChallengeResolved(subject, true, ch.reason);
            emit ChallengeResolvedCode(subject, true, 0, ch.reason);
        } else {
            emit ChallengeResolved(subject, false, ch.reason);
            emit ChallengeResolvedCode(subject, false, 0, ch.reason);
        }
        delete pendingChallenge[subject];
        delete challengeRequested[subject];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EXTRACTED FUNCTION 2 – daoOverride
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice DAO clears a subject's restriction and marks them as DAO-overridden.
    /// @param subject The user to clear.
    /// @param reason  Off-chain governance context (emitted in event).
    function daoOverride(address subject, string calldata reason) external onlyDAO {
        daoOverridden[subject]    = true;
        daoOverrideExpiry[subject] = uint64(block.timestamp + DAO_OVERRIDE_DURATION);

        RestrictionLevel_F old    = restrictionLevel[subject];
        restrictionLevel[subject]  = RestrictionLevel_F.None;
        restrictionExpiry[subject] = 0;
        restrictionReason[subject] = "dao_override";
        if (old != RestrictionLevel_F.None) {
            emit RestrictionLifted(subject, old);
        }
        emit DAOOverride(subject, reason);
        _log("dao_override");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EXTRACTED FUNCTION 3 – daoSetThresholds
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice DAO tunes the four dynamic enforcement thresholds.
    function daoSetThresholds(
        uint16 _autoRestrict,
        uint16 _autoLift,
        uint16 _rateLimit,
        uint16 _sensitivity
    ) external onlyDAO {
        if (_autoRestrict >= _autoLift) revert SA_InvalidThresholds();
        if (_sensitivity > 100)         revert SA_InvalidSensitivity();

        uint16 oldAutoRestrict = autoRestrictThreshold;
        uint16 oldAutoLift     = autoLiftThreshold;
        uint16 oldRateLimit    = rateLimitThreshold;
        uint16 oldSensitivity  = patternSensitivity;

        autoRestrictThreshold = _autoRestrict;
        autoLiftThreshold     = _autoLift;
        rateLimitThreshold    = _rateLimit;
        patternSensitivity    = _sensitivity;

        emit DAOThresholdsUpdated(
            oldAutoRestrict, _autoRestrict,
            oldAutoLift,     _autoLift,
            oldRateLimit,    _rateLimit,
            oldSensitivity,  _sensitivity
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EXTRACTED FUNCTION 4 – daoApplyMaxAutonomyProfile
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice DAO applies the maximum-autonomy enforcement preset in one call.
    function daoApplyMaxAutonomyProfile() external onlyDAO {
        uint16 oldAutoRestrict = autoRestrictThreshold;
        uint16 oldAutoLift     = autoLiftThreshold;
        uint16 oldRateLimit    = rateLimitThreshold;
        uint16 oldSensitivity  = patternSensitivity;

        autoRestrictThreshold = 4500;
        autoLiftThreshold     = 6200;
        rateLimitThreshold    = 5200;
        patternSensitivity    = 100;

        emit DAOThresholdsUpdated(
            oldAutoRestrict, autoRestrictThreshold,
            oldAutoLift,     autoLiftThreshold,
            oldRateLimit,    rateLimitThreshold,
            oldSensitivity,  patternSensitivity
        );

        SeerAutonomousLib.RateLimitEntry[48] memory profile = SeerAutonomousLib.getMaxAutonomyProfile();
        for (uint256 i = 0; i < 48; ++i) {
            _setRateLimitWithEvent(
                RestrictionLevel_F(profile[i].level),
                ActionType_F(profile[i].action),
                profile[i].limit
            );
        }
        emit DAOMaxAutonomyProfileApplied(msg.sender);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _setRateLimitWithEvent(RestrictionLevel_F level, ActionType_F action, uint16 limit) internal {
        uint16 oldLimit = rateLimits[level][action];
        rateLimits[level][action] = limit;
        if (oldLimit != limit) {
            emit DAORateLimitUpdated(level, action, oldLimit, limit);
        }
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }
}
