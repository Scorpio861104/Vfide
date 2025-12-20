// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IProofLedger_GH { function logSystemEvent(address who, string calldata action, address by) external; }
interface ISeer_GH { function punish(address subject, uint16 delta, string calldata reason) external; function reward(address subject, uint16 delta, string calldata reason) external; }

contract GovernanceHooks {
    address public owner;
    address public dao; // DAO contract that can call hooks
    IProofLedger_GH public ledger; // optional
    ISeer_GH public seer;          // optional

    event ModulesSet(address ledger, address seer);
    event DAOSet(address indexed dao);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error GH_NotAuthorized();

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier onlyDAO() { if (msg.sender != dao && msg.sender != owner) revert GH_NotAuthorized(); _; }

    constructor(address _ledger, address _seer, address _dao) { 
        owner = msg.sender;
        dao = _dao;
        ledger=IProofLedger_GH(_ledger); 
        seer=ISeer_GH(_seer); 
        emit ModulesSet(_ledger,_seer);
        emit DAOSet(_dao);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function setDAO(address _dao) external onlyOwner {
        dao = _dao;
        emit DAOSet(_dao);
    }

    function setModules(address _ledger, address _seer) external onlyOwner { 
        ledger=IProofLedger_GH(_ledger); 
        seer=ISeer_GH(_seer); 
        emit ModulesSet(_ledger,_seer); 
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function onProposalQueued(uint256 id, address target, uint256 value) external onlyDAO {
        _log("gh_queued");
        // (optional) seer.reward(targetOwner, ..) could be wired by policy later
    }
    function onVoteCast(uint256 id, address voter, bool support) external onlyDAO {
        _log("gh_vote");
        // (optional policy) seer.reward/punish(voter, delta, "governance_participation");
    }
    function onFinalized(uint256 id, bool passed) external onlyDAO {
        _log(passed ? "gh_passed" : "gh_failed");
    }

    function _log(string memory action) internal { if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} } }
}