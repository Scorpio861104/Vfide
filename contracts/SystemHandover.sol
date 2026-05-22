// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice ISeer_SH
/// @title ISeer_SH
/// @author Vfide
interface ISeer_SH {
    /// @notice minForGovernance
    /// @return _uint16 _uint16
    function minForGovernance() external view returns (uint16);
    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16);
    /// @notice getCachedScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getCachedScore(address subject) external view returns (uint16);
}
/// @notice ICouncilElection_SH
/// @title ICouncilElection_SH
/// @author Vfide
interface ICouncilElection_SH {
    /// @notice getActualCouncilSize
    /// @return _uint256 _uint256
    function getActualCouncilSize() external view returns (uint256);
    /// @notice getCouncilMember
    /// @param index index
    /// @return _address _address
    function getCouncilMember(uint256 index) external view returns (address);
}
/// @notice IDAO_SH
/// @title IDAO_SH
/// @author Vfide
interface IDAO_SH {
    /// @notice setAdmin
    /// @param _admin _admin
    function setAdmin(address _admin) external;
    /// @notice admin
    /// @return _address _address
    function admin() external view returns (address);
}
/// @notice IDAOTimelock_SH
/// @title IDAOTimelock_SH
/// @author Vfide
interface IDAOTimelock_SH {
    /// @notice setAdmin
    /// @param _admin _admin
    function setAdmin(address _admin) external;
    /// @notice admin
    /// @return _address _address
    function admin() external view returns (address);
}
/// @notice IProofLedger_SH
/// @title IProofLedger_SH
/// @author Vfide
interface IProofLedger_SH {
    /// @notice logSystemEvent
    /// @param who who
    /// @param action action
    /// @param by by
    function logSystemEvent(address who, string calldata action, address by) external;
}

/// @notice SH_NotDev
error SH_NotDev();
/// @notice SH_TooEarly
error SH_TooEarly();
/// @notice SH_Zero
error SH_Zero();
/// @notice SH_NotArmed
error SH_NotArmed();
/// @notice SH_Armed
error SH_Armed();
/// @notice SH_AlreadyExecuted
error SH_AlreadyExecuted();
/// @notice SH_AuditorNotCouncil
error SH_AuditorNotCouncil();
// F-58 FIX: Named mismatch errors so operators can diagnose which admin failed to be pre-configured.
/// @notice SH_DAOAdminMismatch
/// @param expected expected
/// @param actual actual
error SH_DAOAdminMismatch(address expected, address actual);
/// @notice SH_TimelockAdminMismatch
/// @param expected expected
/// @param actual actual
error SH_TimelockAdminMismatch(address expected, address actual);
// H-03 FIX: disarm-count cap and arm-timestamp bounds prevent the dev multisig from
// indefinitely deferring handover via repeated arm/disarm cycles or wildly out-of-range t0.
/// @notice SH_DisarmExhausted
error SH_DisarmExhausted();
/// @notice SH_ArmTimestampOutOfRange
error SH_ArmTimestampOutOfRange();

/// @dev Fallback event when ledger logging fails
/// @notice LedgerLogFailed
/// @param source source
/// @param action action
event LedgerLogFailed(address indexed source, string action);

// ReentrancyGuard intentionally omitted: handover transitions update admin pointers and emit logs only.
/// @notice SystemHandover
/// @title SystemHandover
/// @author Vfide
contract SystemHandover {
    /// @notice Armed
    /// @param start start
    /// @param handoverAt handoverAt
    event Armed(uint64 start, uint64 handoverAt);
    /// @notice Disarmed
    /// @param previousStart previousStart
    /// @param previousHandoverAt previousHandoverAt
    event Disarmed(uint64 previousStart, uint64 previousHandoverAt);
    /// @notice ParamsSet
    /// @param monthsDelay monthsDelay
    /// @param minAvgCouncilScore minAvgCouncilScore
    /// @param maxExtensions maxExtensions
    /// @param extensionSpan extensionSpan
    event ParamsSet(uint64 monthsDelay, uint16 minAvgCouncilScore, uint8 maxExtensions, uint64 extensionSpan);
    /// @notice Executed
    /// @param dao dao
    /// @param timelock timelock
    /// @param newAdmin newAdmin
    /// @param extensionsUsed extensionsUsed
    event Executed(address dao, address timelock, address newAdmin, uint8 extensionsUsed);
    /// @notice LedgerSet
    /// @param ledger ledger
    event LedgerSet(address ledger);
    /// @notice DAOSet
    /// @param dao dao
    event DAOSet(address dao);
    /// @notice TimelockSet
    /// @param timelock timelock
    event TimelockSet(address timelock);
    /// @notice CouncilElectionSet
    /// @param councilElection councilElection
    event CouncilElectionSet(address councilElection);
    /// @notice OwnershipAuditMarked
    /// @param auditor auditor
    event OwnershipAuditMarked(address indexed auditor);
    /// @notice OwnershipAuditorQueued
    /// @param auditor auditor
    /// @param executeAfter executeAfter
    event OwnershipAuditorQueued(address indexed auditor, uint64 executeAfter);
    /// @notice OwnershipAuditorSet
    /// @param auditor auditor
    event OwnershipAuditorSet(address indexed auditor);
    /// @notice OwnershipAuditorCanceled
    /// @param auditor auditor
    event OwnershipAuditorCanceled(address indexed auditor);

    /// @notice devMultisig
    address public devMultisig;
    /// @notice dao
    IDAO_SH public dao;
    /// @notice timelock
    IDAOTimelock_SH public timelock;
    /// @notice seer
    ISeer_SH public immutable seer;
    /// @notice councilElection
    ICouncilElection_SH public councilElection;
    /// @notice ledger
    IProofLedger_SH public ledger; // optional

    /// @notice start
    uint64 public start;
    /// @notice handoverAt
    uint64 public handoverAt;
    /// @notice monthsDelay
    uint64 public monthsDelay = 180 days; // 6 months
    /// @notice minAvgCouncilScore
    uint16 public minAvgCouncilScore; // policy threshold
    /// @notice maxExtensions
    uint8 public maxExtensions = 1; // allow at most one deferral
    /// @notice extensionsUsed
    uint8 public extensionsUsed;
    /// @notice extensionSpan
    uint64 public extensionSpan = 60 days; // extra time if network trust too low
    /// @notice handoverExecuted
    bool public handoverExecuted;

    // H-03 FIX: Bound the dev multisig's ability to defer handover.
    // disarmCount caps the number of total disarms; once exhausted, the handover
    // clock cannot be cancelled. ARM_TIMESTAMP_WINDOW caps how far in either
    // direction arm()'s t0 may diverge from block.timestamp.
    /// @notice disarmCount
    uint8 public disarmCount;
    /// @notice MAX_DISARMS
    uint8 public constant MAX_DISARMS = 1;
    /// @notice ARM_TIMESTAMP_WINDOW
    uint64 public constant ARM_TIMESTAMP_WINDOW = 7 days;

    // F-22 FIX: Ownership audit flag — verification that all Ownable contracts have been transferred to DAO/timelock
    /// @notice ownershipAudited
    bool public ownershipAudited;
    /// @notice ownershipAuditor
    address public ownershipAuditor;
    /// @notice pendingOwnershipAuditor
    address public pendingOwnershipAuditor;
    /// @notice pendingOwnershipAuditorAt
    uint64 public pendingOwnershipAuditorAt;
    /// @notice OWNERSHIP_AUDITOR_DELAY
    uint64 public constant OWNERSHIP_AUDITOR_DELAY = 48 hours;

    /// @notice onlyDev
    modifier onlyDev() {
        _checkDev();
        _;
    }

    /// @notice notArmed
    modifier notArmed() {
        if (start != 0) revert SH_Armed();
        _;
    }

    /// @notice _checkDev
    function _checkDev() internal view {
        if (msg.sender != devMultisig) revert SH_NotDev();
    }

    /// @notice constructor
    /// @param _dev _dev
    /// @param _dao _dao
    /// @param _timelock _timelock
    /// @param _seer _seer
    /// @param _council _council
    /// @param _ledger _ledger
    constructor(address _dev, address _dao, address _timelock, address _seer, address _council, address _ledger) {
        if (_dev == address(0) || _dao == address(0) || _timelock == address(0) || _seer == address(0) || _council == address(0)) revert SH_Zero();
        devMultisig = _dev;
        dao = IDAO_SH(_dao);
        timelock = IDAOTimelock_SH(_timelock);
        seer = ISeer_SH(_seer);
        councilElection = ICouncilElection_SH(_council);
        ledger = IProofLedger_SH(_ledger);
        minAvgCouncilScore = seer.minForGovernance();
    }

    /// Arm handover countdown from an explicit launch timestamp.
    /// @notice arm
    /// @param t0 t0
    function arm(uint64 t0) external onlyDev {
        if (start != 0) return; // idempotent
        require(t0 != 0, "SH: zero timestamp");
        // H-03 FIX: t0 must be within ±ARM_TIMESTAMP_WINDOW of the current block timestamp.
        // This prevents far-future scheduling (silent indefinite deferral) and far-past
        // scheduling (would make handover immediate, defeating the cooling-off intent).
        uint64 nowTs = uint64(block.timestamp);
        if (t0 + ARM_TIMESTAMP_WINDOW < nowTs || t0 > nowTs + ARM_TIMESTAMP_WINDOW) {
            revert SH_ArmTimestampOutOfRange();
        }
        start = t0;
        handoverAt = start + monthsDelay;
        emit Armed(start, handoverAt);
        _log("handover_armed");
    }

    /// @notice Abort a previously armed handover countdown before execution.
    function disarm() external onlyDev {
        if (handoverExecuted) revert SH_AlreadyExecuted();
        if (start == 0) revert SH_NotArmed();
        // H-03 FIX: Cap total disarms. Once MAX_DISARMS is reached, the dev multisig
        // can no longer cancel the handover clock — closing the indefinite-defer loop
        // even when each individual disarm respects the 30-day proximity rule below.
        if (disarmCount >= MAX_DISARMS) revert SH_DisarmExhausted();
        // H-03 FIX: Block disarm within 30 days of scheduled handover to prevent indefinite deferral.
        require(block.timestamp < handoverAt - 30 days, "SH: too close to handover");
        uint64 previousStart = start;
        uint64 previousHandoverAt = handoverAt;
        start = 0;
        handoverAt = 0;
        ownershipAudited = false; // Reset audit flag on disarm
        unchecked {
            ++disarmCount;
        }
        emit Disarmed(previousStart, previousHandoverAt);
        _log("handover_disarmed");
    }

    /// @notice setParams
    /// @param _monthsDelay _monthsDelay
    /// @param _minAvg _minAvg
    /// @param _maxExt _maxExt
    /// @param _extSpan _extSpan
    function setParams(uint64 _monthsDelay, uint16 _minAvg, uint8 _maxExt, uint64 _extSpan) external onlyDev {
        if (_monthsDelay < 90 days) _monthsDelay = 90 days;
        // M-4 FIX: Once the handover is armed, the delay may only be extended, never shortened.
        // Without this guard the dev team could arm for 6 months then immediately reduce to 90 days.
        if (start != 0) require(_monthsDelay >= monthsDelay, "SH: cannot shorten after arm");
        monthsDelay = _monthsDelay;
        minAvgCouncilScore = _minAvg;
        maxExtensions = _maxExt;
        extensionSpan = _extSpan;
        if (start != 0) handoverAt = start + monthsDelay;
        emit ParamsSet(monthsDelay, minAvgCouncilScore, maxExtensions, extensionSpan);
        _log("handover_params");
    }

    /// @notice Replace bootstrap DAO address before handover is armed.
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDev notArmed {
        if (_dao == address(0)) revert SH_Zero();
        dao = IDAO_SH(_dao);
        emit DAOSet(_dao);
        _log("handover_dao_set");
    }

    /// @notice Replace bootstrap timelock address before handover is armed.
    /// @param _timelock _timelock
    function setTimelock(address _timelock) external onlyDev notArmed {
        if (_timelock == address(0)) revert SH_Zero();
        timelock = IDAOTimelock_SH(_timelock);
        emit TimelockSet(_timelock);
        _log("handover_timelock_set");
    }

    /// @notice Replace bootstrap council election module before handover is armed.
    /// @param _councilElection _councilElection
    function setCouncilElection(address _councilElection) external onlyDev notArmed {
        if (_councilElection == address(0)) revert SH_Zero();
        councilElection = ICouncilElection_SH(_councilElection);
        emit CouncilElectionSet(_councilElection);
        _log("handover_council_set");
    }

    /// If average council proof score is below threshold at deadline, dev can extend once (failsafe).
    /// @notice extendOnceIfNeeded
    function extendOnceIfNeeded() external onlyDev {
        require(extensionsUsed < maxExtensions, "no_ext_left");
        uint256 size = councilElection.getActualCouncilSize();
        require(size > 0, "SH: no council");
        uint256 total = 0;
        for (uint256 i = 0; i < size; ++i) {
            address member = councilElection.getCouncilMember(i);
            if (member != address(0)) {
                total += seer.getCachedScore(member);
            }
        }
        uint16 avgScore = uint16(total / size);
        if (avgScore < minAvgCouncilScore) {
            handoverAt += extensionSpan;
            ++extensionsUsed;
            _log("handover_extended");
        }
    }

    /// @notice Mark that ownership of all Ownable contracts has been audited and transferred to DAO/timelock
    /// @dev Called by the designated auditor after verifying all Ownable contracts have been transferred
    /// @param auditor_ The address of the ownership auditor (must be set by dev team)
    function setOwnershipAuditor(address auditor_) external onlyDev notArmed {
        if (auditor_ == address(0)) revert SH_Zero();
        require(auditor_ != devMultisig, "SH: auditor cannot be dev");
        if (!_isCouncilMember(auditor_)) revert SH_AuditorNotCouncil();
        pendingOwnershipAuditor = auditor_;
        pendingOwnershipAuditorAt = uint64(block.timestamp) + OWNERSHIP_AUDITOR_DELAY;
        emit OwnershipAuditorQueued(auditor_, pendingOwnershipAuditorAt);
        _log("ownership_auditor_queued");
    }

    /// @notice Apply a previously queued ownership auditor once timelock has elapsed.
    function applyOwnershipAuditor() external onlyDev notArmed {
        address pending = pendingOwnershipAuditor;
        require(pending != address(0), "SH: no pending auditor");
        require(block.timestamp >= pendingOwnershipAuditorAt, "SH: auditor timelock");
        if (!_isCouncilMember(pending)) revert SH_AuditorNotCouncil();

        ownershipAuditor = pending;
        delete pendingOwnershipAuditor;
        delete pendingOwnershipAuditorAt;
        ownershipAudited = false;
        emit OwnershipAuditorSet(ownershipAuditor);
        _log("ownership_auditor_set");
    }

    /// @notice Cancel a pending ownership auditor change before it is applied.
    function cancelOwnershipAuditor() external onlyDev notArmed {
        address pending = pendingOwnershipAuditor;
        require(pending != address(0), "SH: no pending auditor");
        delete pendingOwnershipAuditor;
        delete pendingOwnershipAuditorAt;
        emit OwnershipAuditorCanceled(pending);
        _log("ownership_auditor_canceled");
    }

    /// @notice Confirm that ownership of all Ownable contracts has been transferred to DAO/timelock
    /// @dev Can only be called by the designated auditor after verification script runs
    function markOwnershipAudited() external {
        require(msg.sender == ownershipAuditor, "SH: not auditor");
        require(ownershipAuditor != address(0), "SH: auditor not set");
        if (!_isCouncilMember(msg.sender)) revert SH_AuditorNotCouncil();
        ownershipAudited = true;
        emit OwnershipAuditMarked(msg.sender);
        _log("ownership_audited");
    }

    // slither-disable-next-line reentrancy-events
    /// Transfer control to DAO (DAO becomes its own admin; timelock admin = DAO).
    /// @notice executeHandover
    /// @param newAdmin newAdmin
    function executeHandover(address newAdmin) external onlyDev {
        if (start == 0) revert SH_NotArmed();
        if (handoverExecuted) revert SH_AlreadyExecuted();
        if (block.timestamp < handoverAt) revert SH_TooEarly();

        // F-22 FIX: Require ownership audit before handover to ensure all Ownable contracts
        // have transferred ownership to DAO/timelock
        require(ownershipAudited, "SH: ownership audit required");

        if (newAdmin == address(0)) newAdmin = address(dao);

        // Burn dev control before crossing external admin-update boundaries.
        // A revert later in this function restores the pre-handover state.
        handoverExecuted = true;
        devMultisig = address(0);

        // F-58 FIX: Remove best-effort silent try/catch. DAO admin and timelock admin must be
        // pre-configured via governance before executeHandover is called. If they are not
        // set correctly, emit a descriptive mismatch error that names the specific config failure.
        address actualDAOAdmin = dao.admin();
        address actualTimelockAdmin = timelock.admin();
        if (actualDAOAdmin != newAdmin) revert SH_DAOAdminMismatch(newAdmin, actualDAOAdmin);
        if (actualTimelockAdmin != address(dao)) revert SH_TimelockAdminMismatch(address(dao), actualTimelockAdmin);

        emit Executed(address(dao), address(timelock), newAdmin, extensionsUsed);
        _log("handover_executed");
    }

    /// @notice setLedger
    /// @param _ledger _ledger
    function setLedger(address _ledger) external onlyDev notArmed {
        ledger = IProofLedger_SH(_ledger);
        emit LedgerSet(_ledger);
    }

    /// @notice N-L36 FIX: Pre-flight dry-run for executeHandover.
    /// @dev    Call this before (or instead of) executeHandover to verify all
    ///         preconditions are satisfied without consuming the handover itself.
    ///         Governance runbook: after seating the final council and transferring
    ///         DAO/timelock adminship via governance proposals, call this view.
    ///         If it returns (true, ""), it is safe to call executeHandover.
    /// @param newAdmin The proposed new admin address (pass address(0) to use address(dao)).
    /// @return ok     True if executeHandover would succeed.
    /// @return reason Human-readable failure reason (empty when ok=true).
    function canExecuteHandover(address newAdmin) external view returns (bool ok, string memory reason) {
        if (start == 0) return (false, "handover not armed");
        if (handoverExecuted) return (false, "handover already executed");
        if (block.timestamp < handoverAt) return (false, "handover timelock still active");
        if (!ownershipAudited) return (false, "ownership audit not marked");

        address effectiveAdmin = newAdmin == address(0) ? address(dao) : newAdmin;

        address actualDAOAdmin = dao.admin();
        if (actualDAOAdmin != effectiveAdmin) {
            return (false, string(abi.encodePacked("DAO admin mismatch: expected ", _toHex(effectiveAdmin), " got ", _toHex(actualDAOAdmin))));
        }
        address actualTimelockAdmin = timelock.admin();
        if (actualTimelockAdmin != address(dao)) {
            return (false, string(abi.encodePacked("timelock admin mismatch: expected DAO got ", _toHex(actualTimelockAdmin))));
        }
        return (true, "");
    }

    /// @notice _toHex
    /// @param a a
    /// @return _string _string
    function _toHex(address a) internal pure returns (string memory) {
        bytes memory b = abi.encodePacked(a);
        bytes memory HEX = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; ++i) {
            str[2 + i * 2] = HEX[uint8(b[i]) >> 4];
            str[3 + i * 2] = HEX[uint8(b[i]) & 0xf];
        }
        return string(str);
    }

    // slither-disable-next-line reentrancy-events
    /// @notice _log
    /// @param action action
    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {
                emit LedgerLogFailed(address(this), action);
            }
        }
    }

    /// @notice _isCouncilMember
    /// @param candidate candidate
    /// @return _bool _bool
    function _isCouncilMember(address candidate) internal view returns (bool) {
        uint256 size = councilElection.getActualCouncilSize();
        for (uint256 i = 0; i < size; ++i) {
            if (councilElection.getCouncilMember(i) == candidate) {
                return true;
            }
        }
        return false;
    }
}
