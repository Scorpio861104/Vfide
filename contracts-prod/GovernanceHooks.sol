// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IProofLedger_GH { function logSystemEvent(address who, string calldata action, address by) external; }
interface ISeer_GH { function punish(address subject, uint16 delta, string calldata reason) external; function reward(address subject, uint16 delta, string calldata reason) external; }

contract GovernanceHooks {
    IProofLedger_GH public ledger; // optional
    ISeer_GH public seer;          // optional

    event ModulesSet(address ledger, address seer);

    constructor(address _ledger, address _seer) { ledger=IProofLedger_GH(_ledger); seer=ISeer_GH(_seer); emit ModulesSet(_ledger,_seer); }
    function setModules(address _ledger, address _seer) external { ledger=IProofLedger_GH(_ledger); seer=ISeer_GH(_seer); emit ModulesSet(_ledger,_seer); }

    function onProposalQueued(uint256 id, address target, uint256 value) external {
        _log("gh_queued");
        // (optional) seer.reward(targetOwner, ..) could be wired by policy later
    }
    function onVoteCast(uint256 id, address voter, bool support) external {
        _log("gh_vote");
        // (optional policy) seer.reward/punish(voter, delta, "governance_participation");
    }
    function onFinalized(uint256 id, bool passed) external {
        _log(passed ? "gh_passed" : "gh_failed");
    }

    function _log(string memory action) internal { if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} } }
}