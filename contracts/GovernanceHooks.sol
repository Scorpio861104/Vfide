// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title GovernanceHooks
 * @notice Callback hooks for DAO events with SeerGuardian integration
 * 
 * Integrates mutual checks:
 * - Seer can flag/delay suspicious proposals via SeerGuardian
 * - DAO actions are logged and can trigger automatic enforcement
 */

interface IProofLedger_GH { function logSystemEvent(address who, string calldata action, address by) external; }
interface ISeer_GH { 
    function punish(address subject, uint16 delta, string calldata reason) external; 
    function reward(address subject, uint16 delta, string calldata reason) external;
    function getScore(address) external view returns (uint16);
    function minForGovernance() external view returns (uint16);
}

interface ISeerGuardian_GH {
    function autoCheckProposer(uint256 proposalId, address proposer) external;
    function isProposalBlocked(uint256 proposalId) external view returns (bool blocked, string memory reason);
    function canParticipateInGovernance(address subject) external view returns (bool);
    function recordViolation(address subject, uint8 vtype, string calldata reason) external;
}

contract GovernanceHooks is ReentrancyGuard {
    address public owner;
    address public dao; // DAO contract that can call hooks
    IProofLedger_GH public ledger; // optional
    ISeer_GH public seer;          // optional
    ISeerGuardian_GH public guardian; // SeerGuardian for mutual checks

    event ModulesSet(address ledger, address seer, address guardian);
    event DAOSet(address indexed dao);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProposalAutoChecked(uint256 indexed proposalId, address indexed proposer, bool flagged);
    event VoterRestricted(address indexed voter, string reason);
    event GovernanceViolation(address indexed user, string violation);

    error GH_NotAuthorized();
    error GH_ProposalBlocked(string reason);
    error GH_VoterRestricted();

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier onlyDAO() { if (msg.sender != dao) revert GH_NotAuthorized(); _; }

    constructor(address _ledger, address _seer, address _dao) { 
        require(_dao != address(0), "zero dao");
        owner = msg.sender;
        dao = _dao;
        ledger=IProofLedger_GH(_ledger); 
        seer=ISeer_GH(_seer); 
        emit ModulesSet(_ledger,_seer, address(0));
        emit DAOSet(_dao);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function setDAO(address _dao) external onlyDAO nonReentrant {
        require(_dao != address(0), "zero dao");
        dao = _dao;
        emit DAOSet(_dao);
    }

    function setModules(address _ledger, address _seer, address _guardian) external onlyOwner nonReentrant { 
        require(_seer != address(0), "zero seer");
        ledger=IProofLedger_GH(_ledger); 
        seer=ISeer_GH(_seer);
        guardian = ISeerGuardian_GH(_guardian);
        emit ModulesSet(_ledger,_seer, _guardian); 
    }

    function transferOwnership(address newOwner) external onlyOwner nonReentrant {
        require(newOwner != address(0), "zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Called when a new proposal is created
     * @dev Automatically checks proposer via SeerGuardian
     */
    function onProposalCreated(uint256 id, address proposer) external onlyDAO nonReentrant {
        _log("gh_proposal_created");
        
        // Auto-check proposer via SeerGuardian
        if (address(guardian) != address(0)) {
            try guardian.autoCheckProposer(id, proposer) {
                emit ProposalAutoChecked(id, proposer, true);
            } catch {
                emit ProposalAutoChecked(id, proposer, false);
            }
        }
    }

    /**
     * @notice Called before proposal execution - checks Seer flags
     * @dev Reverts if proposal is blocked by SeerGuardian
     */
    function onProposalQueued(uint256 id, address /*target*/, uint256 /*value*/) external onlyDAO nonReentrant {
        _log("gh_queued");
        
        // Check if Seer has flagged this proposal
        if (address(guardian) != address(0)) {
            (bool blocked, string memory reason) = guardian.isProposalBlocked(id);
            if (blocked) {
                revert GH_ProposalBlocked(reason);
            }
        }
    }
    
    /**
     * @notice Called when a vote is cast
     * @dev Checks voter restrictions and rewards participation
     */
    function onVoteCast(uint256 /*id*/, address voter, bool /*support*/) external onlyDAO nonReentrant {
        _log("gh_vote");
        
        // Check if voter is restricted by SeerGuardian
        if (address(guardian) != address(0)) {
            if (!guardian.canParticipateInGovernance(voter)) {
                emit VoterRestricted(voter, "governance_banned");
                revert GH_VoterRestricted();
            }
        }
        
        // Reward governance participation
        if (address(seer) != address(0)) {
            try seer.reward(voter, 5, "governance_vote") {} catch {}
        }
    }
    
    function onFinalized(uint256 /*id*/, bool passed) external onlyDAO nonReentrant {
        _log(passed ? "gh_passed" : "gh_failed");
    }
    
    /**
     * @notice Report a governance abuse for SeerGuardian tracking
     * @param user The abusing user
     * @param description What happened
     */
    function reportGovernanceAbuse(address user, string calldata description) external onlyDAO nonReentrant {
        emit GovernanceViolation(user, description);
        
        if (address(guardian) != address(0)) {
            // ViolationType.GovernanceAbuse = 5
            try guardian.recordViolation(user, 5, description) {} catch {}
        }
        
        // Also punish via Seer
        if (address(seer) != address(0)) {
            try seer.punish(user, 50, description) {} catch {}
        }
        
        _log("governance_abuse_reported");
    }

    function _log(string memory action) internal { if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} } }
}