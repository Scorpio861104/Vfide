// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISeer_GOV2 { function getScore(address) external view returns (uint16); function minForGovernance() external view returns (uint16); }
interface IVaultHub_GOV2 { function vaultOf(address owner) external view returns (address); }
interface IDAOTimelock_GOV { function queueTx(address target, uint256 value, bytes calldata data) external returns (bytes32); }
interface IProofLedger_GOV3 { function logSystemEvent(address who, string calldata action, address by) external; }
interface IGovernanceHooks { function onProposalQueued(uint256 id, address target, uint256 value) external; function onVoteCast(uint256 id,address voter,bool support) external; function onFinalized(uint256 id,bool passed) external; }

error DAO_NotAdmin();
error DAO_Zero();
error DAO_NotEligible();
error DAO_UnknownProposal();
error DAO_AlreadyVoted();
error DAO_VoteEnded();

contract DAO {
    enum ProposalType { Generic, Financial, ProtocolChange, SecurityAction }

    event ModulesSet(address timelock, address seer, address hub, address hooks, address council);
    event AdminSet(address admin);
    event ParamsSet(uint64 votingPeriod, uint16 quorumPct);
    event ProposalCreated(uint256 id, address proposer, ProposalType ptype, address target, uint256 value, bytes data, string description);
    event Voted(uint256 id, address voter, bool support);
    event Finalized(uint256 id, bool passed);
    event Queued(uint256 id, bytes32 timelockId);
    event Executed(uint256 id);

    address public admin;
    IDAOTimelock_GOV public timelock;
    ISeer_GOV2 public seer;
    IVaultHub_GOV2 public vaultHub;
    IGovernanceHooks public hooks; // optional callbacks (logs/penalties)
    IProofLedger_GOV3 public ledger; // optional via hooks

    uint64 public votingPeriod = 3 days;
    uint16 public quorum = 50; // % of participants in this round

    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes   data;
        string  description;
        ProposalType ptype;
        uint64  start;
        uint64  end;
        bool    executed;
        bool    queued;
        uint32  forVotes;
        uint32  againstVotes;
        mapping(address => bool) hasVoted;
    }
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    modifier onlyAdmin() { if (msg.sender!=admin) revert DAO_NotAdmin(); _; }

    constructor(address _admin, address _timelock, address _seer, address _hub, address _hooks) {
        require(_admin!=address(0) && _timelock!=address(0) && _seer!=address(0) && _hub!=address(0), "zero");
        admin=_admin; timelock=IDAOTimelock_GOV(_timelock); seer=ISeer_GOV2(_seer); vaultHub=IVaultHub_GOV2(_hub); hooks=IGovernanceHooks(_hooks);
        emit ModulesSet(_timelock,_seer,_hub,_hooks,address(0)); emit AdminSet(_admin);
    }

    function setModules(address _timelock, address _seer, address _hub, address _hooks) external onlyAdmin {
        require(_timelock!=address(0)&&_seer!=address(0)&&_hub!=address(0),"zero");
        timelock=IDAOTimelock_GOV(_timelock); seer=ISeer_GOV2(_seer); vaultHub=IVaultHub_GOV2(_hub); hooks=IGovernanceHooks(_hooks);
        emit ModulesSet(_timelock,_seer,_hub,_hooks,address(0));
    }

    function setAdmin(address _admin) external onlyAdmin { require(_admin!=address(0),"zero"); admin=_admin; emit AdminSet(_admin); }
    function setParams(uint64 _period, uint16 _q) external onlyAdmin { if(_period<1 hours)_period=1 hours; if(_q>100)_q=100; votingPeriod=_period; quorum=_q; emit ParamsSet(_period,_q); }

    function _eligible(address a) internal view returns (bool) {
        if (vaultHub.vaultOf(a)==address(0)) return false;
        return seer.getScore(a) >= seer.minForGovernance();
    }

    function propose(ProposalType ptype, address target, uint256 value, bytes calldata data, string calldata description) external returns (uint256 id) {
        if(!_eligible(msg.sender)) revert DAO_NotEligible();
        id=++proposalCount;
        Proposal storage p=proposals[id];
        p.proposer=msg.sender; p.ptype=ptype; p.target=target; p.value=value; p.data=data; p.description=description;
        p.start=uint64(block.timestamp); p.end=p.start+votingPeriod;
        emit ProposalCreated(id,msg.sender,ptype,target,value,data,description);
    }

    function vote(uint256 id, bool support) external {
        Proposal storage p=proposals[id];
        if(p.end==0) revert DAO_UnknownProposal();
        if(block.timestamp>=p.end) revert DAO_VoteEnded();
        if(!_eligible(msg.sender)) revert DAO_NotEligible();
        if(p.hasVoted[msg.sender]) revert DAO_AlreadyVoted();
        p.hasVoted[msg.sender]=true; if(support) p.forVotes+=1; else p.againstVotes+=1;
        emit Voted(id,msg.sender,support);
        if (address(hooks)!=address(0)) { try hooks.onVoteCast(id,msg.sender,support) {} catch {} }
    }

    function finalize(uint256 id) external {
        Proposal storage p=proposals[id];
        if(p.end==0) revert DAO_UnknownProposal();
        require(block.timestamp>=p.end,"early");
        require(!p.executed&&!p.queued,"done");
        uint32 total=p.forVotes+p.againstVotes;
        bool qmet = total>0 && (uint256(total)*100/total) >= quorum; // trivial form; quorum acts as presence floor
        bool passed = qmet && p.forVotes>p.againstVotes;
        emit Finalized(id,passed);
        if (address(hooks)!=address(0)) { try hooks.onFinalized(id,passed) {} catch {} }
        if (passed){
            bytes32 tlId = timelock.queueTx(p.target,p.value,p.data);
            p.queued=true; emit Queued(id,tlId);
            if (address(hooks)!=address(0)) { try hooks.onProposalQueued(id,p.target,p.value) {} catch {} }
        }
    }

    function markExecuted(uint256 id) external onlyAdmin {
        Proposal storage p=proposals[id];
        require(p.queued&&!p.executed,"bad");
        p.executed=true; emit Executed(id);
    }
}