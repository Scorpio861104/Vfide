// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISeer_SH { function minForGovernance() external view returns (uint16); function getScore(address subject) external view returns (uint16); }
interface ICouncilElection_SH { function getActualCouncilSize() external view returns (uint256); function getCouncilMember(uint256 index) external view returns (address); }
interface IDAO_SH { function setAdmin(address _admin) external; function admin() external view returns (address); }
interface IDAOTimelock_SH { function setAdmin(address _admin) external; function admin() external view returns (address); }
interface IProofLedger_SH { function logSystemEvent(address who, string calldata action, address by) external; }

error SH_NotDev();
error SH_TooEarly();
error SH_Zero();
error SH_NotArmed();
error SH_Armed();
error SH_AlreadyExecuted();
error SH_GovernanceNotReady();
error SH_AuditorNotCouncil();
// F-58 FIX: Named mismatch errors so operators can diagnose which admin failed to be pre-configured.
error SH_DAOAdminMismatch(address expected, address actual);
error SH_TimelockAdminMismatch(address expected, address actual);

/// @dev Fallback event when ledger logging fails
event LedgerLogFailed(address indexed source, string action);

// ReentrancyGuard intentionally omitted: handover transitions update admin pointers and emit logs only.
contract SystemHandover {
    event Armed(uint64 start, uint64 handoverAt);
    event Disarmed(uint64 previousStart, uint64 previousHandoverAt);
    event ParamsSet(uint64 monthsDelay, uint16 minAvgCouncilScore, uint8 maxExtensions, uint64 extensionSpan);
    event Executed(address dao, address timelock, address newAdmin, uint8 extensionsUsed);
    event LedgerSet(address ledger);
    event DAOSet(address dao);
    event TimelockSet(address timelock);
    event CouncilElectionSet(address councilElection);
    event OwnershipAuditMarked(address indexed auditor);
    event OwnershipAuditorQueued(address indexed auditor, uint64 executeAfter);
    event OwnershipAuditorSet(address indexed auditor);
    event OwnershipAuditorCanceled(address indexed auditor);

    address public devMultisig;
    IDAO_SH public dao;
    IDAOTimelock_SH public timelock;
    ISeer_SH public seer;
    ICouncilElection_SH public councilElection;
    IProofLedger_SH public ledger; // optional

    uint64 public start;
    uint64 public handoverAt;
    uint64 public monthsDelay = 180 days;     // 6 months
    uint16 public minAvgCouncilScore;         // policy threshold
    uint8  public maxExtensions = 1;          // allow at most one deferral
    uint8  public extensionsUsed;
    uint64 public extensionSpan = 60 days;    // extra time if network trust too low
    bool public handoverExecuted;
    
    // F-22 FIX: Ownership audit flag — verification that all Ownable contracts have been transferred to DAO/timelock
    bool public ownershipAudited;
    address public ownershipAuditor;
    address public pendingOwnershipAuditor;
    uint64 public pendingOwnershipAuditorAt;
    uint64 public constant OWNERSHIP_AUDITOR_DELAY = 48 hours;

    modifier onlyDev() {
        _checkDev();
        _;
    }

    modifier notArmed() {
        if (start != 0) revert SH_Armed();
        _;
    }

    function _checkDev() internal view {
        if (msg.sender != devMultisig) revert SH_NotDev();
    }

    constructor(address _dev, address _dao, address _timelock, address _seer, address _council, address _ledger){
        if(_dev==address(0)||_dao==address(0)||_timelock==address(0)||_seer==address(0)||_council==address(0)) revert SH_Zero();
        devMultisig=_dev; dao=IDAO_SH(_dao); timelock=IDAOTimelock_SH(_timelock); seer=ISeer_SH(_seer); councilElection=ICouncilElection_SH(_council); ledger=IProofLedger_SH(_ledger);
        minAvgCouncilScore = seer.minForGovernance();
    }

    /// Arm handover countdown from an explicit launch timestamp.
    function arm(uint64 t0) external onlyDev {
        if (start!=0) return; // idempotent
        require(t0!=0,"SH: zero timestamp");
        start = t0;
        handoverAt = start + monthsDelay;
        emit Armed(start,handoverAt);
        _log("handover_armed");
    }

    /// @notice Abort a previously armed handover countdown before execution.
    function disarm() external onlyDev {
        if (handoverExecuted) revert SH_AlreadyExecuted();
        if (start == 0) revert SH_NotArmed();
        // H-03 FIX: Block disarm within 30 days of scheduled handover to prevent indefinite deferral.
        require(block.timestamp < handoverAt - 30 days, "SH: too close to handover");
        uint64 previousStart = start;
        uint64 previousHandoverAt = handoverAt;
        start = 0;
        handoverAt = 0;
        ownershipAudited = false;  // Reset audit flag on disarm
        emit Disarmed(previousStart, previousHandoverAt);
        _log("handover_disarmed");
    }

    function setParams(uint64 _monthsDelay, uint16 _minAvg, uint8 _maxExt, uint64 _extSpan) external onlyDev {
        if (_monthsDelay<90 days) _monthsDelay=90 days;
        // M-4 FIX: Once the handover is armed, the delay may only be extended, never shortened.
        // Without this guard the dev team could arm for 6 months then immediately reduce to 90 days.
        if (start != 0) require(_monthsDelay >= monthsDelay, "SH: cannot shorten after arm");
        monthsDelay=_monthsDelay; minAvgCouncilScore=_minAvg; maxExtensions=_maxExt; extensionSpan=_extSpan;
        if (start!=0) handoverAt = start + monthsDelay;
        emit ParamsSet(monthsDelay,minAvgCouncilScore,maxExtensions,extensionSpan);
        _log("handover_params");
    }

    /// @notice Replace bootstrap DAO address before handover is armed.
    function setDAO(address _dao) external onlyDev notArmed {
        if (_dao == address(0)) revert SH_Zero();
        dao = IDAO_SH(_dao);
        emit DAOSet(_dao);
        _log("handover_dao_set");
    }

    /// @notice Replace bootstrap timelock address before handover is armed.
    function setTimelock(address _timelock) external onlyDev notArmed {
        if (_timelock == address(0)) revert SH_Zero();
        timelock = IDAOTimelock_SH(_timelock);
        emit TimelockSet(_timelock);
        _log("handover_timelock_set");
    }

    /// @notice Replace bootstrap council election module before handover is armed.
    function setCouncilElection(address _councilElection) external onlyDev notArmed {
        if (_councilElection == address(0)) revert SH_Zero();
        councilElection = ICouncilElection_SH(_councilElection);
        emit CouncilElectionSet(_councilElection);
        _log("handover_council_set");
    }

    /// If average council proof score is below threshold at deadline, dev can extend once (failsafe).
    function extendOnceIfNeeded() external onlyDev {
        require(extensionsUsed < maxExtensions, "no_ext_left");
        uint256 size = councilElection.getActualCouncilSize();
        require(size > 0, "SH: no council");
        uint256 total = 0;
        for (uint256 i = 0; i < size; i++) {
            address member = councilElection.getCouncilMember(i);
            if (member != address(0)) {
                total += seer.getScore(member);
            }
        }
        uint16 avgScore = uint16(total / size);
        if (avgScore < minAvgCouncilScore) {
            handoverAt += extensionSpan;
            extensionsUsed += 1;
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

    /// Transfer control to DAO (DAO becomes its own admin; timelock admin = DAO).
    // slither-disable-next-line reentrancy-events
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

    function setLedger(address _ledger) external onlyDev notArmed { ledger=IProofLedger_SH(_ledger); emit LedgerSet(_ledger); }

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

    function _toHex(address a) internal pure returns (string memory) {
        bytes memory b = abi.encodePacked(a);
        bytes memory HEX = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0'; str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = HEX[uint8(b[i]) >> 4];
            str[3 + i * 2] = HEX[uint8(b[i]) & 0xf];
        }
        return string(str);
    }

    // slither-disable-next-line reentrancy-events
    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }

    function _isCouncilMember(address candidate) internal view returns (bool) {
        uint256 size = councilElection.getActualCouncilSize();
        for (uint256 i = 0; i < size; i++) {
            if (councilElection.getCouncilMember(i) == candidate) {
                return true;
            }
        }
        return false;
    }
}