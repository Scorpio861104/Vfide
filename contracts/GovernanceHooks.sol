// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ReentrancyGuard } from "./SharedInterfaces.sol";

/**
 * @title GovernanceHooks
 * @notice Callback hooks for DAO events with SeerGuardian integration
 * 
 * Integrates mutual checks:
 * - Seer can flag/delay suspicious proposals via SeerGuardian
 * - DAO actions are logged and can trigger automatic enforcement
 * @author Vfide
 */

interface IProofLedger_GH {
    /// @notice logSystemEvent
    /// @param who who
    /// @param action action
    /// @param by by
    function logSystemEvent(address who, string calldata action, address by) external;
}
/// @notice ISeer_GH
/// @title ISeer_GH
/// @author Vfide
interface ISeer_GH { 
    /// @notice punish
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function punish(address subject, uint16 delta, string calldata reason) external; 
    /// @notice reward
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function reward(address subject, uint16 delta, string calldata reason) external;
    /// @notice getScore
    /// @return _uint16 _uint16
    function getScore(address) external view returns (uint16);
    /// @notice minForGovernance
    /// @return _uint16 _uint16
    function minForGovernance() external view returns (uint16);
}

/// @notice ISeerGuardian_GH
/// @title ISeerGuardian_GH
/// @author Vfide
interface ISeerGuardian_GH {
    /// @notice autoCheckProposer
    /// @param proposalId proposalId
    /// @param proposer proposer
    function autoCheckProposer(uint256 proposalId, address proposer) external;
    /// @notice isProposalBlocked
    /// @param proposalId proposalId
    /// @return blocked blocked
    /// @return reason reason
    function isProposalBlocked(uint256 proposalId) external view returns (bool blocked, string memory reason);
    /// @notice canParticipateInGovernance
    /// @param subject subject
    /// @return _bool _bool
    function canParticipateInGovernance(address subject) external view returns (bool);
    /// @notice recordViolation
    /// @param subject subject
    /// @param vtype vtype
    /// @param reason reason
    function recordViolation(address subject, uint8 vtype, string calldata reason) external;
}

/// @notice GovernanceHooks
/// @title GovernanceHooks
/// @author Vfide
contract GovernanceHooks is ReentrancyGuard {
    /// @notice owner
    address public owner;
    /// @notice dao
    address public dao; // DAO contract that can call hooks
    /// @notice ledger
    IProofLedger_GH public ledger; // optional
    /// @notice seer
    ISeer_GH public seer;          // optional
    /// @notice guardian
    ISeerGuardian_GH public guardian; // SeerGuardian for mutual checks

    /// @notice ModulesSet
    /// @param ledger ledger
    /// @param seer seer
    /// @param guardian guardian
    event ModulesSet(address ledger, address seer, address guardian);
    /// @notice DAOSet
    /// @param dao dao
    event DAOSet(address indexed dao);
    /// @notice OwnershipTransferred
    /// @param previousOwner previousOwner
    /// @param newOwner newOwner
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /// @notice ProposalAutoChecked
    /// @param proposalId proposalId
    /// @param proposer proposer
    /// @param flagged flagged
    event ProposalAutoChecked(uint256 indexed proposalId, address indexed proposer, bool flagged);
    /// @notice VoterRestricted
    /// @param voter voter
    /// @param reason reason
    event VoterRestricted(address indexed voter, string reason);
    /// @notice GovernanceViolation
    /// @param user user
    /// @param violation violation
    event GovernanceViolation(address indexed user, string violation);

    /// @notice GH_NotAuthorized
    error GH_NotAuthorized();
    /// @notice GH_ProposalBlocked
    /// @param reason reason
    error GH_ProposalBlocked(string reason);
    /// @notice GH_VoterRestricted
    error GH_VoterRestricted();
    /// @notice ModulesProposed
    /// @param ledger ledger
    /// @param seer seer
    /// @param guardian guardian
    /// @param effectiveAt effectiveAt
    event ModulesProposed(address ledger, address seer, address guardian, uint64 effectiveAt);
    /// @notice ModulesCancelled
    event ModulesCancelled();
    /// @notice OwnershipClaimedByDAO
    /// @param previousOwner previousOwner
    /// @param dao dao
    event OwnershipClaimedByDAO(address indexed previousOwner, address indexed dao);

    /// @notice GH_NoPending
    error GH_NoPending();
    /// @notice GH_DelayActive
    error GH_DelayActive();
    /// @notice GH_DAOAlreadyOwns
    error GH_DAOAlreadyOwns();

    // C3 FIX: 7-day timelock on module changes so DAO can veto a malicious swap.
    /// @notice MODULE_CHANGE_DELAY
    uint64 public constant MODULE_CHANGE_DELAY = 7 days;

    struct PendingModulesChange {
        address ledger;
        address seer;
        address guardian;
        uint64 effectiveAt;
    }
    /// @notice pendingModules
    PendingModulesChange public pendingModules;
    /// @notice hasPendingModules
    bool public hasPendingModules;

    /// @notice onlyOwner
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    /// @notice onlyDAO
    modifier onlyDAO() { if (msg.sender != dao) revert GH_NotAuthorized(); _; }

    /// @notice constructor
    /// @param _ledger _ledger
    /// @param _seer _seer
    /// @param _dao _dao
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

    /// @notice setDAO
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDAO nonReentrant {
        require(_dao != address(0), "zero dao");
        dao = _dao;
        emit DAOSet(_dao);
    }

    /// @notice Propose a module change. Takes effect after MODULE_CHANGE_DELAY.
    /// @dev C3 FIX: Timelock prevents instant malicious module swap.
    /// @param _ledger _ledger
    /// @param _seer _seer
    /// @param _guardian _guardian
    function proposeModules(address _ledger, address _seer, address _guardian)
        external onlyOwner nonReentrant
    {
        require(_seer != address(0), "zero seer");
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingModules = PendingModulesChange({
            ledger: _ledger,
            seer: _seer,
            guardian: _guardian,
            effectiveAt: effectiveAt
        });
        hasPendingModules = true;
        emit ModulesProposed(_ledger, _seer, _guardian, effectiveAt);
    }

    /// @notice Apply a previously proposed module change after the timelock.
    function applyModules() external nonReentrant {
        if (!hasPendingModules) revert GH_NoPending();
        if (block.timestamp < pendingModules.effectiveAt) revert GH_DelayActive();
        ledger = IProofLedger_GH(pendingModules.ledger);
        seer = ISeer_GH(pendingModules.seer);
        guardian = ISeerGuardian_GH(pendingModules.guardian);
        emit ModulesSet(pendingModules.ledger, pendingModules.seer, pendingModules.guardian);
        delete pendingModules;
        hasPendingModules = false;
    }

    /// @notice Legacy entrypoint retained for ABI compatibility.
    /// @dev Module changes are timelocked via proposeModules/applyModules.
    function setModules(address, address, address) external pure {
        revert("GH: use proposeModules/applyModules");
    }

    /// @notice Cancel a pending module change. Either owner or DAO may cancel.
    function cancelModules() external nonReentrant {
        require(msg.sender == owner || msg.sender == dao, "GH: not authorized");
        if (!hasPendingModules) revert GH_NoPending();
        delete pendingModules;
        hasPendingModules = false;
        emit ModulesCancelled();
    }

    /// @notice Permissionless DAO ownership claim. Eliminates "deployer forgot to transfer" foot-gun.
    /// @dev C3 FIX: After SystemHandover, the DAO calls this to take ownership on-chain.
    function claimOwnershipForDAO() external nonReentrant {
        require(msg.sender == dao, "GH: only DAO");
        require(dao != address(0), "GH: dao not set");
        if (owner == dao) revert GH_DAOAlreadyOwns();
        address previousOwner = owner;
        owner = dao;
        emit OwnershipTransferred(previousOwner, dao);
        emit OwnershipClaimedByDAO(previousOwner, dao);
    }

    /// @notice transferOwnership
    /// @param newOwner newOwner
    function transferOwnership(address newOwner) external onlyOwner nonReentrant {
        require(newOwner != address(0), "zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Called when a new proposal is created
     * @dev Automatically checks proposer via SeerGuardian
     * @param id id
     * @param proposer proposer
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
     * @param id id
     */
    function onProposalQueued(uint256 id, address /*target*/, uint256 /*value*/) external onlyDAO nonReentrant {
        _log("gh_queued");
        
        // #470 FIX: Wrap SeerGuardian check in try/catch so a failing guardian cannot brick DAO execution.
        if (address(guardian) != address(0)) {
            try guardian.isProposalBlocked(id) returns (bool blocked, string memory reason) {
                if (blocked) {
                    revert GH_ProposalBlocked(reason);
                }
            } catch {
                emit ProposalAutoChecked(id, address(0), false); // guardian unavailable; allow through
            }
        }
    }
    
    /**
     * @notice Called when a vote is cast
     * @dev Checks voter restrictions and rewards participation
     * @param voter voter
     */
    function onVoteCast(uint256 /*id*/, address voter, bool /*support*/) external onlyDAO nonReentrant {
        _log("gh_vote");
        
        // #471 FIX: Wrap guardian check in try/catch so guardian failure doesn't block all votes.
        if (address(guardian) != address(0)) {
            try guardian.canParticipateInGovernance(voter) returns (bool allowed) {
                if (!allowed) {
                    emit VoterRestricted(voter, "governance_banned");
                    revert GH_VoterRestricted();
                }
            } catch {
                // guardian unavailable — allow vote through, log it
                emit VoterRestricted(voter, "guardian_unavailable");
            }
        }
        
        // Reward governance participation
        if (address(seer) != address(0)) {
            try seer.reward(voter, 5, "governance_vote") {} catch {}
        }
    }
    
    /// @notice onFinalized
    /// @param passed passed
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

    /// @notice _log
    /// @param action action
    function _log(string memory action) internal { if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} } }
}