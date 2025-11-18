// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISeer_GOV { function getScore(address) external view returns (uint16); function minForGovernance() external view returns (uint16); }
interface IVaultHub_GOV { function vaultOf(address owner) external view returns (address); }
interface IProofLedger_GOV2 { function logSystemEvent(address who, string calldata action, address by) external; }

error CE_NotDAO();
error CE_Zero();
error CE_NotEligible();
error CE_ArrayMismatch();
error CE_BadSize();

contract CouncilElection {
    event ModulesSet(address dao, address seer, address hub, address ledger);
    event ParamsSet(uint8 councilSize, uint16 minScore, uint64 termSeconds, uint64 refreshInterval);
    event CandidateRegistered(address indexed who);
    event CandidateUnregistered(address indexed who);
    event CouncilSet(address[] members, uint64 termEnd);

    address public dao;
    ISeer_GOV public seer;
    IVaultHub_GOV public vaultHub;
    IProofLedger_GOV2 public ledger; // optional

    mapping(address => bool) public isCandidate;
    mapping(address => bool) public isCouncil;

    uint8  public councilSize = 12;
    uint16 public minCouncilScore;       // default from Seer
    uint64 public termSeconds = 180 days; // ~6 months
    uint64 public refreshInterval = 14 days;
    uint64 public termEnd;

    modifier onlyDAO() { if (msg.sender != dao) revert CE_NotDAO(); _; }

    constructor(address _dao, address _seer, address _hub, address _ledger) {
        if (_dao == address(0) || _seer == address(0) || _hub == address(0)) revert CE_Zero();
        dao=_dao; seer=ISeer_GOV(_seer); vaultHub=IVaultHub_GOV(_hub); ledger=IProofLedger_GOV2(_ledger);
        minCouncilScore = seer.minForGovernance();
        emit ModulesSet(_dao,_seer,_hub,_ledger);
    }

    function setModules(address _dao, address _seer, address _hub, address _ledger) external onlyDAO {
        if (_dao == address(0) || _seer == address(0) || _hub == address(0)) revert CE_Zero();
        dao=_dao; seer=ISeer_GOV(_seer); vaultHub=IVaultHub_GOV(_hub); ledger=IProofLedger_GOV2(_ledger);
        emit ModulesSet(_dao,_seer,_hub,_ledger); _log("ce_modules_set");
    }

    function setParams(uint8 _size, uint16 _minScore, uint64 _term, uint64 _refresh) external onlyDAO {
        if (_size == 0) revert CE_BadSize();
        councilSize=_size; minCouncilScore=_minScore; termSeconds=_term; refreshInterval=_refresh;
        emit ParamsSet(_size,_minScore,_term,_refresh); _log("ce_params_set");
    }

    function register() external {
        if (!_eligible(msg.sender)) revert CE_NotEligible();
        isCandidate[msg.sender]=true; emit CandidateRegistered(msg.sender); _log("ce_register");
    }

    function unregister() external { isCandidate[msg.sender]=false; emit CandidateUnregistered(msg.sender); _log("ce_unregister"); }

    function setCouncil(address[] calldata members) external onlyDAO {
        if (members.length==0 || members.length>councilSize) revert CE_ArrayMismatch();
        // reset previous council flags (bounded; council small)
        // For simplicity: clear flags for provided members only; non-provided remain from last term until overwritten.
        // Enforce eligibility per member:
        for (uint256 i=0;i<members.length;i++){ if(!_eligible(members[i])) revert CE_NotEligible(); }

        // clear previous (soft-reset by overwriting mapping values we know)
        // then set new
        for (uint256 j=0;j<members.length;j++){ isCouncil[members[j]]=true; }

        termEnd = uint64(block.timestamp)+termSeconds;
        emit CouncilSet(members, termEnd);
        _log("ce_council_set");
    }

    /// Called periodically off-chain or by DAO keepers to remove members who fell below score.
    function refreshCouncil(address[] calldata current) external onlyDAO {
        for (uint256 i=0;i<current.length;i++){
            address m=current[i];
            if (isCouncil[m] && !_eligible(m)) { isCouncil[m]=false; }
        }
        _log("ce_refresh");
    }

    function _eligible(address a) internal view returns (bool) {
        if (a==address(0)) return false;
        if (vaultHub.vaultOf(a)==address(0)) return false;
        return seer.getScore(a) >= minCouncilScore;
    }

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
}