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
        uint64 previousStart = start;
        uint64 previousHandoverAt = handoverAt;
        start = 0;
        handoverAt = 0;
        extensionsUsed = 0;
        emit Disarmed(previousStart, previousHandoverAt);
        _log("handover_disarmed");
    }

    function setParams(uint64 _monthsDelay, uint16 _minAvg, uint8 _maxExt, uint64 _extSpan) external onlyDev {
        if (_monthsDelay<90 days) _monthsDelay=90 days;
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
        uint256 total;
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

    /// Transfer control to DAO (DAO becomes its own admin; timelock admin = DAO).
    function executeHandover(address newAdmin) external onlyDev {
        if (start == 0) revert SH_NotArmed();
        if (handoverExecuted) revert SH_AlreadyExecuted();
        if (block.timestamp < handoverAt) revert SH_TooEarly();
        if (newAdmin == address(0)) newAdmin = address(dao);

        // Best-effort direct updates for permissive bootstrap deployments.
        // In production, these may revert due to onlyTimelock / onlyTimelockSelf gates.
        try dao.setAdmin(newAdmin) {} catch {}
        try timelock.setAdmin(address(dao)) {} catch {}

        // Final state must still be correct before dev key burn.
        if (dao.admin() != newAdmin || timelock.admin() != address(dao)) {
            revert SH_GovernanceNotReady();
        }

        handoverExecuted = true;
        devMultisig = address(0);
        emit Executed(address(dao), address(timelock), newAdmin, extensionsUsed);
        _log("handover_executed");
    }

    function setLedger(address _ledger) external onlyDev { ledger=IProofLedger_SH(_ledger); emit LedgerSet(_ledger); }

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
}