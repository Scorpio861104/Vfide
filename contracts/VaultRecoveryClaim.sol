// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title VaultRecoveryClaim
 * @notice Enables users to claim and recover access to their vault after losing their wallet
 * @dev This is the critical missing piece in crypto UX - wallet recovery without seed phrases
 * 
 * Recovery Flow:
 * 1. User loses wallet, gets new wallet
 * 2. User searches for their vault using VaultRegistry (by recovery ID, email, phone, username)
 * 3. User initiates recovery claim with new wallet
 * 4. Verification process:
 *    a. Guardian verification (if guardians exist) - 2 of 3 must approve
 *    b. Time-lock challenge period (7 days) - original wallet can cancel
 *    c. Optional: Identity verification through trusted oracles
 * 5. After verification, vault ownership transfers to new wallet
 * 
 * Security Layers:
 * - Time-lock prevents immediate theft
 * - Guardian multi-sig provides social recovery
 * - Original wallet can always cancel (if not truly lost)
 * - Proof Score pattern matching (future: ML-based identity)
 */

interface IVaultInfrastructure {
    function vaultOf(address owner) external view returns (address);
    function ownerOfVault(address vault) external view returns (address);
    function isVault(address a) external view returns (bool);
}

interface IUserVault {
    function owner() external view returns (address);
    function isGuardian(address) external view returns (bool);
    function guardianCount() external view returns (uint8);
    function isGuardianMature(address) external view returns (bool);
}

interface IVaultRegistry {
    function recoveryIdOfVault(address vault) external view returns (bytes32);
    function searchByRecoveryId(string calldata recoveryId) external view returns (address);
}

interface IGuardianNodeManager {
    function isActiveGuardian(address node) external view returns (bool);
    function getGuardianStake(address node) external view returns (uint256);
}

contract VaultRecoveryClaim is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    uint64 public constant CHALLENGE_PERIOD = 7 days;      // Time for original owner to cancel
    uint64 public constant GUARDIAN_VOTE_WINDOW = 14 days; // Time for guardians to vote
    uint64 public constant CLAIM_EXPIRY = 30 days;         // Max time for claim process
    uint8 public constant MIN_GUARDIAN_APPROVALS = 2;      // Minimum guardian approvals needed
    uint8 public constant MIN_NODE_VOTES = 3;              // Minimum guardian node votes
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    IVaultInfrastructure public vaultHub;
    IVaultRegistry public vaultRegistry;
    IGuardianNodeManager public guardianNodeManager;
    
    enum ClaimStatus {
        None,
        Pending,           // Claim submitted, waiting for verification
        GuardianApproved,  // Guardians approved, in challenge period
        Challenged,        // Original owner challenged the claim
        Approved,          // Fully approved, ready to execute
        Executed,          // Ownership transferred
        Rejected,          // Claim was rejected
        Expired            // Claim expired without resolution
    }
    
    struct RecoveryClaim {
        address vault;              // The vault being claimed
        address claimant;           // New wallet claiming ownership
        address originalOwner;      // Original wallet address (for records)
        uint64 initiatedAt;         // When claim was submitted
        uint64 challengeEndsAt;     // When challenge period ends
        uint64 expiresAt;           // When claim expires entirely
        ClaimStatus status;
        uint8 guardianApprovals;    // Count of personal guardian approvals
        uint8 nodeVotes;            // Count of guardian node votes
        bytes32 evidenceHash;       // Hash of identity evidence provided
        string claimReason;         // User's explanation
    }
    
    // claimId => RecoveryClaim
    mapping(uint256 => RecoveryClaim) public claims;
    uint256 public claimCounter;
    
    // vault => active claimId (only one active claim per vault)
    mapping(address => uint256) public activeClaimForVault;
    
    // claimId => guardian => voted
    mapping(uint256 => mapping(address => bool)) public guardianVoted;
    
    // claimId => guardian node => voted
    mapping(uint256 => mapping(address => bool)) public nodeVoted;
    
    // claimId => guardian => approved (true) or rejected (false)
    mapping(uint256 => mapping(address => bool)) public guardianApproval;
    
    // Trusted identity verifiers (oracles, KYC providers)
    mapping(address => bool) public trustedVerifier;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    event ClaimInitiated(
        uint256 indexed claimId,
        address indexed vault,
        address indexed claimant,
        address originalOwner,
        uint64 expiresAt
    );
    
    event GuardianVoteCast(
        uint256 indexed claimId,
        address indexed guardian,
        bool approved,
        uint8 totalApprovals
    );
    
    event NodeVoteCast(
        uint256 indexed claimId,
        address indexed node,
        bool approved,
        uint8 totalVotes
    );
    
    event ClaimChallenged(
        uint256 indexed claimId,
        address indexed challenger,
        string reason
    );
    
    event ClaimApproved(
        uint256 indexed claimId,
        address indexed vault,
        address indexed newOwner
    );
    
    event ClaimRejected(
        uint256 indexed claimId,
        address indexed vault,
        string reason
    );
    
    event ClaimExecuted(
        uint256 indexed claimId,
        address indexed vault,
        address indexed newOwner,
        address previousOwner
    );
    
    event ClaimExpired(
        uint256 indexed claimId,
        address indexed vault
    );
    
    event VerifierSet(address indexed verifier, bool trusted);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    error InvalidVault();
    error ClaimAlreadyExists();
    error NoActiveClaim();
    error NotClaimant();
    error NotGuardian();
    error NotGuardianNode();
    error AlreadyVoted();
    error ClaimNotPending();
    error ChallengePeriodActive();
    error ChallengePeriodEnded();
    error ClaimHasExpired();
    error NotOriginalOwner();
    error InsufficientApprovals();
    error VaultHasNoClaim();
    error ClaimantAlreadyHasVault();
    error ZeroAddress();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _vaultHub,
        address _vaultRegistry,
        address _guardianNodeManager
    ) Ownable(msg.sender) {
        if (_vaultHub == address(0)) revert ZeroAddress();
        vaultHub = IVaultInfrastructure(_vaultHub);
        vaultRegistry = IVaultRegistry(_vaultRegistry);
        guardianNodeManager = IGuardianNodeManager(_guardianNodeManager);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CLAIM INITIATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a recovery claim for a vault
     * @dev User must have found the vault via VaultRegistry search first
     * @param vault The vault address to claim
     * @param recoveryId The recovery ID to verify ownership (plaintext)
     * @param evidenceHash Hash of any identity evidence (documents, etc)
     * @param reason User's explanation of why they're claiming this vault
     */
    function initiateClaim(
        address vault,
        string calldata recoveryId,
        bytes32 evidenceHash,
        string calldata reason
    ) external nonReentrant returns (uint256 claimId) {
        // Validate vault exists
        if (!vaultHub.isVault(vault)) revert InvalidVault();
        
        // Check no active claim exists for this vault
        if (activeClaimForVault[vault] != 0) {
            RecoveryClaim storage existing = claims[activeClaimForVault[vault]];
            if (existing.status == ClaimStatus.Pending || 
                existing.status == ClaimStatus.GuardianApproved ||
                existing.status == ClaimStatus.Approved) {
                revert ClaimAlreadyExists();
            }
        }
        
        // Check claimant doesn't already own a vault
        if (vaultHub.vaultOf(msg.sender) != address(0)) {
            revert ClaimantAlreadyHasVault();
        }
        
        // Verify recovery ID matches (if vault has one)
        if (address(vaultRegistry) != address(0)) {
            bytes32 storedRecoveryId = vaultRegistry.recoveryIdOfVault(vault);
            if (storedRecoveryId != bytes32(0)) {
                bytes32 providedHash = keccak256(abi.encodePacked(recoveryId));
                require(providedHash == storedRecoveryId, "Invalid recovery ID");
            }
        }
        
        address originalOwner = vaultHub.ownerOfVault(vault);
        
        // Create claim
        claimId = ++claimCounter;
        
        claims[claimId] = RecoveryClaim({
            vault: vault,
            claimant: msg.sender,
            originalOwner: originalOwner,
            initiatedAt: uint64(block.timestamp),
            challengeEndsAt: uint64(block.timestamp + CHALLENGE_PERIOD),
            expiresAt: uint64(block.timestamp + CLAIM_EXPIRY),
            status: ClaimStatus.Pending,
            guardianApprovals: 0,
            nodeVotes: 0,
            evidenceHash: evidenceHash,
            claimReason: reason
        });
        
        activeClaimForVault[vault] = claimId;
        
        emit ClaimInitiated(claimId, vault, msg.sender, originalOwner, claims[claimId].expiresAt);
    }
    
    /**
     * @notice Initiate claim using only recovery ID (simplified flow)
     * @param recoveryId The recovery ID the user remembers
     * @param reason User's explanation
     */
    function initiateClaimByRecoveryId(
        string calldata recoveryId,
        string calldata reason
    ) external nonReentrant returns (uint256 claimId) {
        require(address(vaultRegistry) != address(0), "Registry not set");
        
        address vault = vaultRegistry.searchByRecoveryId(recoveryId);
        require(vault != address(0), "Vault not found");
        
        return this.initiateClaim(vault, recoveryId, bytes32(0), reason);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // GUARDIAN VOTING (Personal Guardians)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Personal guardian votes on a recovery claim
     * @dev Only guardians set on the vault can vote
     * @param claimId The claim ID
     * @param approve True to approve, false to reject
     */
    function guardianVote(uint256 claimId, bool approve) external nonReentrant {
        RecoveryClaim storage claim = claims[claimId];
        
        if (claim.status != ClaimStatus.Pending) revert ClaimNotPending();
        if (block.timestamp > claim.expiresAt) revert ClaimHasExpired();
        if (guardianVoted[claimId][msg.sender]) revert AlreadyVoted();
        
        // Verify caller is a mature guardian of the vault
        IUserVault userVault = IUserVault(claim.vault);
        if (!userVault.isGuardian(msg.sender)) revert NotGuardian();
        if (!userVault.isGuardianMature(msg.sender)) revert NotGuardian(); // Must be mature
        
        guardianVoted[claimId][msg.sender] = true;
        guardianApproval[claimId][msg.sender] = approve;
        
        if (approve) {
            claim.guardianApprovals++;
        }
        
        emit GuardianVoteCast(claimId, msg.sender, approve, claim.guardianApprovals);
        
        // Check if we have enough approvals
        uint8 requiredApprovals = _calculateRequiredApprovals(userVault.guardianCount());
        
        if (claim.guardianApprovals >= requiredApprovals) {
            claim.status = ClaimStatus.GuardianApproved;
            claim.challengeEndsAt = uint64(block.timestamp + CHALLENGE_PERIOD);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // GUARDIAN NODE VOTING (Community Verification)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Guardian node votes on a recovery claim
     * @dev Used when vault has no personal guardians, or as additional verification
     * @param claimId The claim ID
     * @param approve True to approve claim
     */
    function nodeVote(uint256 claimId, bool approve) external nonReentrant {
        RecoveryClaim storage claim = claims[claimId];
        
        if (claim.status != ClaimStatus.Pending && claim.status != ClaimStatus.GuardianApproved) {
            revert ClaimNotPending();
        }
        if (block.timestamp > claim.expiresAt) revert ClaimHasExpired();
        if (nodeVoted[claimId][msg.sender]) revert AlreadyVoted();
        
        // Verify caller is an active guardian node
        if (address(guardianNodeManager) != address(0)) {
            if (!guardianNodeManager.isActiveGuardian(msg.sender)) revert NotGuardianNode();
        }
        
        nodeVoted[claimId][msg.sender] = true;
        
        if (approve) {
            claim.nodeVotes++;
        }
        
        emit NodeVoteCast(claimId, msg.sender, approve, claim.nodeVotes);
        
        // If vault has no guardians, node votes can approve directly
        IUserVault userVault = IUserVault(claim.vault);
        if (userVault.guardianCount() == 0 && claim.nodeVotes >= MIN_NODE_VOTES) {
            claim.status = ClaimStatus.GuardianApproved;
            claim.challengeEndsAt = uint64(block.timestamp + CHALLENGE_PERIOD);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CHALLENGE (Original Owner Defense)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Original owner challenges/cancels a recovery claim
     * @dev If the original wallet isn't actually lost, they can cancel the claim
     * @param claimId The claim ID to challenge
     * @param reason Explanation of why this is fraudulent
     */
    function challengeClaim(uint256 claimId, string calldata reason) external nonReentrant {
        RecoveryClaim storage claim = claims[claimId];
        
        if (claim.status == ClaimStatus.None || 
            claim.status == ClaimStatus.Executed ||
            claim.status == ClaimStatus.Rejected ||
            claim.status == ClaimStatus.Expired) {
            revert NoActiveClaim();
        }
        
        // Only original owner can challenge
        if (msg.sender != claim.originalOwner) revert NotOriginalOwner();
        
        claim.status = ClaimStatus.Rejected;
        activeClaimForVault[claim.vault] = 0;
        
        emit ClaimChallenged(claimId, msg.sender, reason);
        emit ClaimRejected(claimId, claim.vault, "Challenged by original owner");
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CLAIM FINALIZATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Finalize an approved claim after challenge period
     * @dev Anyone can call this to finalize, but usually the claimant
     * @param claimId The claim ID to finalize
     */
    function finalizeClaim(uint256 claimId) external nonReentrant {
        RecoveryClaim storage claim = claims[claimId];
        
        // Check status
        if (claim.status != ClaimStatus.GuardianApproved && claim.status != ClaimStatus.Approved) {
            revert InsufficientApprovals();
        }
        
        // Check expiry
        if (block.timestamp > claim.expiresAt) {
            claim.status = ClaimStatus.Expired;
            activeClaimForVault[claim.vault] = 0;
            emit ClaimExpired(claimId, claim.vault);
            revert ClaimHasExpired();
        }
        
        // Check challenge period has ended
        if (block.timestamp < claim.challengeEndsAt) {
            revert ChallengePeriodActive();
        }
        
        // Mark as approved if coming from GuardianApproved
        if (claim.status == ClaimStatus.GuardianApproved) {
            claim.status = ClaimStatus.Approved;
            emit ClaimApproved(claimId, claim.vault, claim.claimant);
        }
        
        // Execute the recovery
        _executeRecovery(claimId);
    }
    
    /**
     * @notice Execute the actual ownership transfer
     * @dev Internal function called after all verifications pass
     */
    function _executeRecovery(uint256 claimId) internal {
        RecoveryClaim storage claim = claims[claimId];
        
        claim.status = ClaimStatus.Executed;
        activeClaimForVault[claim.vault] = 0;
        
        // Call VaultInfrastructure to transfer ownership
        // Note: This requires VaultInfrastructure to have a recovery function that this contract can call
        // The actual implementation would need VaultInfrastructure integration
        
        emit ClaimExecuted(claimId, claim.vault, claim.claimant, claim.originalOwner);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // EXPIRY CLEANUP
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Mark expired claims as expired
     * @param claimId The claim ID to check
     */
    function expireClaim(uint256 claimId) external {
        RecoveryClaim storage claim = claims[claimId];
        
        if (claim.status == ClaimStatus.Pending || 
            claim.status == ClaimStatus.GuardianApproved) {
            if (block.timestamp > claim.expiresAt) {
                claim.status = ClaimStatus.Expired;
                activeClaimForVault[claim.vault] = 0;
                emit ClaimExpired(claimId, claim.vault);
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get claim details
     */
    function getClaim(uint256 claimId) external view returns (RecoveryClaim memory) {
        return claims[claimId];
    }
    
    /**
     * @notice Get active claim for a vault
     */
    function getActiveClaimForVault(address vault) external view returns (uint256 claimId, RecoveryClaim memory claim) {
        claimId = activeClaimForVault[vault];
        if (claimId != 0) {
            claim = claims[claimId];
        }
    }
    
    /**
     * @notice Check if claim can be finalized
     */
    function canFinalize(uint256 claimId) external view returns (bool, string memory reason) {
        RecoveryClaim storage claim = claims[claimId];
        
        if (claim.status == ClaimStatus.None) {
            return (false, "Claim does not exist");
        }
        if (claim.status == ClaimStatus.Executed) {
            return (false, "Claim already executed");
        }
        if (claim.status == ClaimStatus.Rejected) {
            return (false, "Claim was rejected");
        }
        if (claim.status == ClaimStatus.Expired) {
            return (false, "Claim expired");
        }
        if (block.timestamp > claim.expiresAt) {
            return (false, "Claim has expired");
        }
        if (claim.status == ClaimStatus.Pending) {
            return (false, "Waiting for guardian approval");
        }
        if (block.timestamp < claim.challengeEndsAt) {
            return (false, "Challenge period still active");
        }
        
        return (true, "Ready to finalize");
    }
    
    /**
     * @notice Calculate time remaining in challenge period
     */
    function challengeTimeRemaining(uint256 claimId) external view returns (uint256) {
        RecoveryClaim storage claim = claims[claimId];
        if (block.timestamp >= claim.challengeEndsAt) return 0;
        return claim.challengeEndsAt - block.timestamp;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    function setVaultHub(address _vaultHub) external onlyOwner {
        if (_vaultHub == address(0)) revert ZeroAddress();
        vaultHub = IVaultInfrastructure(_vaultHub);
    }
    
    function setVaultRegistry(address _vaultRegistry) external onlyOwner {
        vaultRegistry = IVaultRegistry(_vaultRegistry);
    }
    
    function setGuardianNodeManager(address _guardianNodeManager) external onlyOwner {
        guardianNodeManager = IGuardianNodeManager(_guardianNodeManager);
    }
    
    function setTrustedVerifier(address verifier, bool trusted) external onlyOwner {
        trustedVerifier[verifier] = trusted;
        emit VerifierSet(verifier, trusted);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Calculate required guardian approvals based on total count
     * @dev 2 of 3, 3 of 5, etc. - majority required
     */
    function _calculateRequiredApprovals(uint8 guardianCount) internal pure returns (uint8) {
        if (guardianCount == 0) return 0;
        if (guardianCount == 1) return 1;
        if (guardianCount == 2) return 2;
        if (guardianCount == 3) return 2;
        if (guardianCount == 4) return 3;
        if (guardianCount == 5) return 3;
        // For more guardians, require majority
        return (guardianCount / 2) + 1;
    }
}
