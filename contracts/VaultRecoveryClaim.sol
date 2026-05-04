// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IVaultHubRecovery {
    function vaultOf(address owner) external view returns (address);
    function ownerOfVault(address vault) external view returns (address);
    function isVault(address a) external view returns (bool);
    function executeRecoveryRotation(address vault, address newWallet) external;
    function guardianSetupComplete(address vault) external view returns (bool);
}

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

interface IUserVaultRecovery {
    function owner() external view returns (address);
    function isGuardian(address) external view returns (bool);
    function guardianCount() external view returns (uint8);
    function isGuardianMature(address) external view returns (bool);
}

interface IVaultRegistry {
    function recoveryIdOfVault(address vault) external view returns (bytes32);
    function searchByRecoveryId(string calldata recoveryId) external view returns (address);
}

contract VaultRecoveryClaim is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    uint64 public constant CHALLENGE_PERIOD = 7 days;      // Time for original owner to cancel (guardian path)
    uint64 public constant FINALIZATION_GRACE_PERIOD = 1 days;
    uint64 public constant GUARDIAN_VOTE_WINDOW = 14 days; // Time for guardians to vote
    uint64 public constant CLAIM_EXPIRY = 30 days;         // Max time for claim process
    uint64 public constant VERIFIER_CHANGE_DELAY = 1 days;
    uint64 public constant MODULE_CHANGE_DELAY = 48 hours;
    uint8 public constant MIN_GUARDIAN_APPROVALS = 2;      // Minimum guardian approvals needed
    uint8 public constant MIN_VERIFIER_VOTES = 3;          // Minimum trusted verifier votes (guardian path)
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    IVaultHubRecovery public vaultHub;
    IVaultRegistry public vaultRegistry;
    
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
        uint8 verifierVotes;        // Count of trusted verifier votes
        // H-5 FIX: Snapshot guardian count at initiation so runtime removal cannot lower
        // the required-approvals threshold or enable the verifier-fallback path mid-claim.
        uint8 guardianCountSnapshot;
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
    
    // claimId => trusted verifier => voted
    mapping(uint256 => mapping(address => bool)) public verifierVoted;
    
    // claimId => guardian => approved (true) or rejected (false)
    mapping(uint256 => mapping(address => bool)) public guardianApproval;
    
    // Trusted identity verifiers (oracles)
    mapping(address => bool) public trustedVerifier;

    struct PendingVerifierChange {
        address verifier;
        bool trusted;
        uint64 executeAfter;
    }

    struct PendingModuleChange {
        address newAddress;
        uint64 executeAfter;
    }

    PendingVerifierChange public pendingVerifierChange;
    PendingModuleChange public pendingVaultHubChange;
    PendingModuleChange public pendingVaultRegistryChange;

    // F-54 FIX: Track last vault activity to extend challenge window for active vaults.
    // Any on-chain vault activity within 30 days extends the challenge period to 14 days,
    // giving active owners more time to detect and challenge fraudulent claims.
    mapping(address => uint64) public vaultLastActivity;
    uint64 public constant ACTIVE_VAULT_CHALLENGE_PERIOD = 14 days;
    uint64 public constant VAULT_ACTIVITY_WINDOW = 30 days;
    
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

    // F-54: Emitted when vault activity is recorded (extends future challenge windows)
    event VaultActivityRecorded(address indexed vault, uint64 timestamp);

    event GuardianVoteCast(
        uint256 indexed claimId,
        address indexed guardian,
        bool approved,
        uint8 totalApprovals
    );
    
    event VerifierVoteCast(
        uint256 indexed claimId,
        address indexed verifier,
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
    event VerifierChangeQueued(address indexed verifier, bool trusted, uint64 executeAfter);
    event VerifierChangeCancelled(address indexed verifier, bool trusted);
    event VaultHubChangeQueued(address indexed newVaultHub, uint64 executeAfter);
    event VaultHubChangeApplied(address indexed oldVaultHub, address indexed newVaultHub);
    event VaultHubChangeCancelled(address indexed pendingVaultHub);
    event VaultRegistryChangeQueued(address indexed newVaultRegistry, uint64 executeAfter);
    event VaultRegistryChangeApplied(address indexed oldVaultRegistry, address indexed newVaultRegistry);
    event VaultRegistryChangeCancelled(address indexed pendingVaultRegistry);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    error InvalidVault();
    error ClaimAlreadyExists();
    error NoActiveClaim();
    error NotClaimant();
    error NotGuardian();
    error NotTrustedVerifier();
    error AlreadyVoted();
    error ClaimNotPending();
    error NoPendingVerifierChange();
    error VerifierChangeNotReady();
    error ChallengePeriodActive();
    error ChallengePeriodEnded();
    error ClaimHasExpired();
    error NotOriginalOwner();
    error InsufficientApprovals();
    error VaultHasNoClaim();
    error ClaimantAlreadyHasVault();
    error ZeroAddress();
    error ModuleChangePending();
    error ModuleChangeNotReady();
    error NoPendingModuleChange();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _vaultHub,
        address _vaultRegistry
    ) {
        if (_vaultHub == address(0)) revert ZeroAddress();
        vaultHub = IVaultHubRecovery(_vaultHub);
        vaultRegistry = IVaultRegistry(_vaultRegistry);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CLAIM INITIATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Record vault activity to extend the challenge window on future claims.
     * @dev F-54 FIX: Called by the vault itself (or its admin) on any significant action.
     *      Callable by vaultHub.ownerOfVault(vault) or the vault contract itself.
     */
    function recordVaultActivity(address vault) external {
        require(
            msg.sender == vault || msg.sender == vaultHub.ownerOfVault(vault),
            "VaultRecoveryClaim: not vault or owner"
        );
        vaultLastActivity[vault] = uint64(block.timestamp);
        emit VaultActivityRecorded(vault, uint64(block.timestamp));
    }

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
        return _initiateClaim(vault, recoveryId, evidenceHash, reason);
    }
    
    /**
     * @notice Internal implementation of claim initiation
     */
    function _initiateClaim(
        address vault,
        string calldata recoveryId,
        bytes32 evidenceHash,
        string calldata reason
    ) internal returns (uint256 claimId) {
        // Validate vault exists
        if (!vaultHub.isVault(vault)) revert InvalidVault();
        
        // C-2 FIX: Auto-expire stale claims and check for active ones
        // Also include Challenged status in blocking check
        if (activeClaimForVault[vault] != 0) {
            RecoveryClaim storage existing = claims[activeClaimForVault[vault]];
            // Auto-expire if past expiry time
            if (block.timestamp > existing.expiresAt && 
                (existing.status == ClaimStatus.Pending || 
                 existing.status == ClaimStatus.GuardianApproved ||
                 existing.status == ClaimStatus.Challenged)) {
                existing.status = ClaimStatus.Expired;
                activeClaimForVault[vault] = 0;
            } else if (existing.status == ClaimStatus.Pending || 
                existing.status == ClaimStatus.GuardianApproved ||
                existing.status == ClaimStatus.Approved ||
                existing.status == ClaimStatus.Challenged) {
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
        
        // F-54 FIX: Extend challenge period to 14 days when vault had activity within 30 days.
        // C-4 FIX: If guardian setup is not yet complete the vault has weaker access controls;
        //           use the extended challenge window to give the owner maximum reaction time.
        bool setupComplete = vaultHub.guardianSetupComplete(vault);
        uint64 effectiveChallengePeriod;
        if (!setupComplete) {
            // Guardian setup incomplete → use the extended window.
            effectiveChallengePeriod = ACTIVE_VAULT_CHALLENGE_PERIOD;  // 14 days
        } else if (vaultLastActivity[vault] != 0 &&
            block.timestamp - vaultLastActivity[vault] <= VAULT_ACTIVITY_WINDOW) {
            effectiveChallengePeriod = ACTIVE_VAULT_CHALLENGE_PERIOD;  // 14 days
        } else {
            effectiveChallengePeriod = CHALLENGE_PERIOD;               // 7 days
        }

        claims[claimId] = RecoveryClaim({
            vault: vault,
            claimant: msg.sender,
            originalOwner: originalOwner,
            initiatedAt: uint64(block.timestamp),
            challengeEndsAt: uint64(block.timestamp + effectiveChallengePeriod),
            expiresAt: uint64(block.timestamp + CLAIM_EXPIRY),
            status: ClaimStatus.Pending,
            guardianApprovals: 0,
            verifierVotes: 0,
            // H-5 FIX: Snapshot guardian count so mid-claim guardian removals cannot
            // lower the approval quorum or enable the verifier-fallback path.
            guardianCountSnapshot: IUserVaultRecovery(vault).guardianCount(),
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
        
        // Use internal function instead of external call to preserve msg.sender
        return _initiateClaim(vault, recoveryId, bytes32(0), reason);
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
        IUserVaultRecovery userVault = IUserVaultRecovery(claim.vault);
        if (!userVault.isGuardian(msg.sender)) revert NotGuardian();
        if (!userVault.isGuardianMature(msg.sender)) revert NotGuardian(); // Must be mature
        
        guardianVoted[claimId][msg.sender] = true;
        guardianApproval[claimId][msg.sender] = approve;
        
        if (approve) {
            claim.guardianApprovals++;
        }
        
        emit GuardianVoteCast(claimId, msg.sender, approve, claim.guardianApprovals);
        
        // Check if we have enough approvals — use snapshot, not live guardianCount.
        uint8 requiredApprovals = _calculateRequiredApprovals(claim.guardianCountSnapshot);
        
        if (claim.guardianApprovals >= requiredApprovals) {
            claim.status = ClaimStatus.GuardianApproved;
            claim.challengeEndsAt = uint64(block.timestamp + CHALLENGE_PERIOD);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // TRUSTED VERIFIER VOTING (Community Verification)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Trusted verifier votes on a recovery claim
     * @dev Used when vault has no personal guardians, or as additional verification
     * @param claimId The claim ID
     * @param approve True to approve claim
     */
    function verifierVote(uint256 claimId, bool approve) external nonReentrant {
        RecoveryClaim storage claim = claims[claimId];
        
        if (claim.status != ClaimStatus.Pending && claim.status != ClaimStatus.GuardianApproved) {
            revert ClaimNotPending();
        }
        if (block.timestamp > claim.expiresAt) revert ClaimHasExpired();
        if (verifierVoted[claimId][msg.sender]) revert AlreadyVoted();
        
        // Only trusted verifiers can vote
        if (!trustedVerifier[msg.sender]) revert NotTrustedVerifier();
        
        verifierVoted[claimId][msg.sender] = true;
        
        if (approve) {
            claim.verifierVotes++;
        }
        
        emit VerifierVoteCast(claimId, msg.sender, approve, claim.verifierVotes);
        
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

        if (claim.challengeEndsAt != 0 && block.timestamp > claim.challengeEndsAt + FINALIZATION_GRACE_PERIOD) {
            revert ChallengePeriodEnded();
        }
        
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
        
        // Give the original owner an additional grace window to challenge without a mempool race.
        if (block.timestamp < claim.challengeEndsAt + FINALIZATION_GRACE_PERIOD) {
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
     * @notice Execute the actual ownership transfer via guardian-approved rotation
     * @dev H-8 FIX: Uses VaultHub.executeRecoveryRotation instead of forceSetOwner.
     *      Non-custodial: only reachable after guardian approvals + 7-day challenge.
     */
    function _executeRecovery(uint256 claimId) internal {
        RecoveryClaim storage claim = claims[claimId];
        
        vaultHub.executeRecoveryRotation(claim.vault, claim.claimant);

        claim.status = ClaimStatus.Executed;
        activeClaimForVault[claim.vault] = 0;
        
        emit ClaimExecuted(claimId, claim.vault, claim.claimant, claim.originalOwner);
    }
    
    /// @notice Legacy finalization — no longer needed. Recovery completes in finalizeClaim.
    function finalizeExecution(uint256 claimId) external view {
        RecoveryClaim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Executed, "not executed");
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
    
    /// @notice Propose updating vaultHub after a 48h timelock.
    function setVaultHub(address _vaultHub) external onlyOwner {
        if (_vaultHub == address(0)) revert ZeroAddress();
        if (pendingVaultHubChange.executeAfter != 0) revert ModuleChangePending();
        uint64 executeAfter = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingVaultHubChange = PendingModuleChange({
            newAddress: _vaultHub,
            executeAfter: executeAfter
        });
        emit VaultHubChangeQueued(_vaultHub, executeAfter);
    }

    function applyVaultHub() external onlyOwner {
        PendingModuleChange memory pending = pendingVaultHubChange;
        if (pending.executeAfter == 0) revert NoPendingModuleChange();
        if (block.timestamp < pending.executeAfter) revert ModuleChangeNotReady();

        address oldVaultHub = address(vaultHub);
        vaultHub = IVaultHubRecovery(pending.newAddress);
        delete pendingVaultHubChange;
        emit VaultHubChangeApplied(oldVaultHub, pending.newAddress);
    }

    function cancelVaultHubChange() external onlyOwner {
        PendingModuleChange memory pending = pendingVaultHubChange;
        if (pending.executeAfter == 0) revert NoPendingModuleChange();
        delete pendingVaultHubChange;
        emit VaultHubChangeCancelled(pending.newAddress);
    }

    /// @notice Propose updating vaultRegistry after a 48h timelock.
    function setVaultRegistry(address _vaultRegistry) external onlyOwner {
        if (_vaultRegistry == address(0)) revert ZeroAddress();
        if (pendingVaultRegistryChange.executeAfter != 0) revert ModuleChangePending();
        uint64 executeAfter = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingVaultRegistryChange = PendingModuleChange({
            newAddress: _vaultRegistry,
            executeAfter: executeAfter
        });
        emit VaultRegistryChangeQueued(_vaultRegistry, executeAfter);
    }

    function applyVaultRegistry() external onlyOwner {
        PendingModuleChange memory pending = pendingVaultRegistryChange;
        if (pending.executeAfter == 0) revert NoPendingModuleChange();
        if (block.timestamp < pending.executeAfter) revert ModuleChangeNotReady();

        address oldVaultRegistry = address(vaultRegistry);
        vaultRegistry = IVaultRegistry(pending.newAddress);
        delete pendingVaultRegistryChange;
        emit VaultRegistryChangeApplied(oldVaultRegistry, pending.newAddress);
    }

    function cancelVaultRegistryChange() external onlyOwner {
        PendingModuleChange memory pending = pendingVaultRegistryChange;
        if (pending.executeAfter == 0) revert NoPendingModuleChange();
        delete pendingVaultRegistryChange;
        emit VaultRegistryChangeCancelled(pending.newAddress);
    }
    
    function setTrustedVerifier(address verifier, bool trusted) external onlyOwner {
        if (verifier == address(0)) revert ZeroAddress();

        uint64 executeAfter = uint64(block.timestamp) + VERIFIER_CHANGE_DELAY;
        pendingVerifierChange = PendingVerifierChange({
            verifier: verifier,
            trusted: trusted,
            executeAfter: executeAfter
        });
        emit VerifierChangeQueued(verifier, trusted, executeAfter);
    }

    function applyTrustedVerifierChange() external onlyOwner {
        PendingVerifierChange memory pending = pendingVerifierChange;
        if (pending.executeAfter == 0) revert NoPendingVerifierChange();
        if (block.timestamp < pending.executeAfter) revert VerifierChangeNotReady();

        delete pendingVerifierChange;
        trustedVerifier[pending.verifier] = pending.trusted;
        emit VerifierSet(pending.verifier, pending.trusted);
    }

    function cancelTrustedVerifierChange() external onlyOwner {
        PendingVerifierChange memory pending = pendingVerifierChange;
        if (pending.executeAfter == 0) revert NoPendingVerifierChange();
        delete pendingVerifierChange;
        emit VerifierChangeCancelled(pending.verifier, pending.trusted);
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
