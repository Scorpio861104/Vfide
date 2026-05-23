// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable, ReentrancyGuard} from "./SharedInterfaces.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice IVaultHubRecovery
/// @title IVaultHubRecovery
/// @author Vfide
interface IVaultHubRecovery {
    /// @notice vaultOf
    /// @param owner owner
    /// @return _address _address
    function vaultOf(address owner) external view returns (address);
    /// @notice ownerOfVault
    /// @param vault vault
    /// @return _address _address
    function ownerOfVault(address vault) external view returns (address);
    /// @notice isVault
    /// @param a a
    /// @return _bool _bool
    function isVault(address a) external view returns (bool);
    /// @notice executeRecoveryRotation
    /// @param vault vault
    /// @param newWallet newWallet
    function executeRecoveryRotation(address vault, address newWallet) external;
    /// @notice guardianSetupComplete
    /// @param vault vault
    /// @return _bool _bool
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
 * @author Vfide
 */

interface IUserVaultRecovery {
    /// @notice owner
    /// @return _address _address
    function owner() external view returns (address);
    /// @notice isGuardian
    /// @return _bool _bool
    function isGuardian(address) external view returns (bool);
    /// @notice guardianCount
    /// @return _uint8 _uint8
    function guardianCount() external view returns (uint8);
    /// @notice isGuardianMature
    /// @return _bool _bool
    function isGuardianMature(address) external view returns (bool);
    // R-8: tiered guardian roles + per-vault configurable challenge window
    /// @notice isGuardianTrustee
    /// @return _bool _bool
    function isGuardianTrustee(address) external view returns (bool);
    /// @notice trusteeCountView
    /// @return _uint8 _uint8
    function trusteeCountView() external view returns (uint8);
    /// @notice challengePeriodPreferenceView
    /// @return _uint64 _uint64
    function challengePeriodPreferenceView() external view returns (uint64);
}

/// @notice IVaultRegistry
/// @title IVaultRegistry
/// @author Vfide
interface IVaultRegistry {
    /// @notice recoveryIdOfVault
    /// @param vault vault
    /// @return _bytes32 _bytes32
    function recoveryIdOfVault(address vault) external view returns (bytes32);
    /// @notice searchByRecoveryId
    /// @param recoveryId recoveryId
    /// @return _address _address
    function searchByRecoveryId(string calldata recoveryId) external view returns (address);
}

/// @notice VaultRecoveryClaim
/// @title VaultRecoveryClaim
/// @author Vfide
contract VaultRecoveryClaim is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice CHALLENGE_PERIOD
    uint64 public constant CHALLENGE_PERIOD = 7 days;      // Time for original owner to cancel (guardian path)
    /// @notice FINALIZATION_GRACE_PERIOD
    uint64 public constant FINALIZATION_GRACE_PERIOD = 1 days;
    /// @notice GUARDIAN_VOTE_WINDOW
    uint64 public constant GUARDIAN_VOTE_WINDOW = 14 days; // Time for guardians to vote
    /// @notice CLAIM_EXPIRY
    uint64 public constant CLAIM_EXPIRY = 30 days;         // Max time for claim process
    /// @notice VERIFIER_CHANGE_DELAY
    uint64 public constant VERIFIER_CHANGE_DELAY = 1 days;
    /// @notice MODULE_CHANGE_DELAY
    uint64 public constant MODULE_CHANGE_DELAY = 48 hours;
    /// @notice MIN_GUARDIAN_APPROVALS
    uint8 public constant MIN_GUARDIAN_APPROVALS = 2;      // Minimum guardian approvals needed
    /// @notice MIN_VERIFIER_VOTES
    uint8 public constant MIN_VERIFIER_VOTES = 3;          // Minimum trusted verifier votes (guardian path)
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice vaultHub
    IVaultHubRecovery public vaultHub;
    /// @notice vaultRegistry
    IVaultRegistry public vaultRegistry;

    enum ClaimStatus {
        None,
        Pending, // Claim submitted, waiting for verification
        GuardianApproved, // Guardians approved, in challenge period
        Challenged, // Original owner challenged the claim
        Approved, // Fully approved, ready to execute
        Executed, // Ownership transferred
        Rejected, // Claim was rejected
        Expired // Claim expired without resolution
    }

    struct RecoveryClaim {
        address vault; // The vault being claimed
        address claimant; // New wallet claiming ownership
        address originalOwner; // Original wallet address (for records)
        address initiator; // R-8: who called initiateClaim (claimant for self-init, trustee for guardian-init)
        uint64 initiatedAt; // When claim was submitted
        uint64 challengeEndsAt; // When challenge period ends
        uint64 expiresAt; // When claim expires entirely
        ClaimStatus status;
        uint8 guardianApprovals; // Count of personal guardian approvals
        uint8 verifierVotes; // Count of trusted verifier votes
        // H-5 FIX: Snapshot guardian count at initiation so runtime removal cannot lower
        // the required-approvals threshold or enable the verifier-fallback path mid-claim.
        uint8 guardianCountSnapshot;
        // R-8: Snapshot the user's challenge-period preference at initiation time.
        // A later setChallengePeriodPreference() call by a compromised owner key
        // CANNOT shrink an active window — the snapshot is what's enforced.
        uint64 challengePeriodSnapshot;
        bytes32 evidenceHash; // Hash of identity evidence provided
        string claimReason; // User's explanation
    }

    // claimId => RecoveryClaim
    /// @notice claims
    mapping(uint256 => RecoveryClaim) public claims;
    /// @notice claimCounter
    uint256 public claimCounter;

    // vault => active claimId (only one active claim per vault)
    /// @notice activeClaimForVault
    mapping(address => uint256) public activeClaimForVault;

    // claimId => guardian => voted
    /// @notice guardianVoted
    mapping(uint256 => mapping(address => bool)) public guardianVoted;

    // claimId => trusted verifier => voted
    /// @notice verifierVoted
    mapping(uint256 => mapping(address => bool)) public verifierVoted;

    // claimId => guardian => approved (true) or rejected (false)
    /// @notice guardianApproval
    mapping(uint256 => mapping(address => bool)) public guardianApproval;

    // Trusted identity verifiers (oracles)
    /// @notice trustedVerifier
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

    /// @notice pendingVerifierChange
    PendingVerifierChange public pendingVerifierChange;
    /// @notice pendingVaultHubChange
    PendingModuleChange public pendingVaultHubChange;
    /// @notice pendingVaultRegistryChange
    PendingModuleChange public pendingVaultRegistryChange;

    // F-54 FIX: Track last vault activity to extend challenge window for active vaults.
    // Any on-chain vault activity within 30 days extends the challenge period to 14 days,
    // giving active owners more time to detect and challenge fraudulent claims.
    /// @notice vaultLastActivity
    mapping(address => uint64) public vaultLastActivity;
    /// @notice ACTIVE_VAULT_CHALLENGE_PERIOD
    uint64 public constant ACTIVE_VAULT_CHALLENGE_PERIOD = 14 days;
    /// @notice VAULT_ACTIVITY_WINDOW
    uint64 public constant VAULT_ACTIVITY_WINDOW = 30 days;

    // ─────────────────────────────────────────────────────────────────
    // R-8: PER-INITIATOR COOLDOWN AFTER CANCELED RECOVERY
    // ─────────────────────────────────────────────────────────────────
    //
    // When the original owner cancels a recovery claim (via challengeClaim),
    // the initiator of that claim is locked out from re-initiating against
    // the same vault for INITIATOR_COOLDOWN seconds.
    //
    // SAFETY RATIONALE
    //   Without this cooldown, a rogue trustee whose first attempt was
    //   challenged could immediately initiate again, repeatedly, forcing the
    //   owner to spend their life vetoing harassment. The cooldown is
    //   PER-INITIATOR (not per-vault) — other trustees can still initiate
    //   legitimate recoveries during the cooldown window. This punishes the
    //   bad actor without punishing the owner.
    //
    //   30 days is long enough to make harassment expensive but short enough
    //   that an initiator who challenged in error (false alarm, genuine
    //   misunderstanding) can re-attempt within a reasonable timeframe.
    /// @notice initiatorCooldownUntil
    mapping(address => mapping(address => uint64)) public initiatorCooldownUntil; // vault => initiator => timestamp
    /// @notice INITIATOR_COOLDOWN
    uint64 public constant INITIATOR_COOLDOWN = 30 days;

    // ═══════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice ClaimInitiated
    /// @param claimId claimId
    /// @param vault vault
    /// @param claimant claimant
    /// @param originalOwner originalOwner
    /// @param expiresAt expiresAt
    event ClaimInitiated(
        uint256 indexed claimId,
        address indexed vault,
        address indexed claimant,
        address originalOwner,
        uint64 expiresAt
    );

    // F-54: Emitted when vault activity is recorded (extends future challenge windows)
    /// @notice VaultActivityRecorded
    /// @param vault vault
    /// @param timestamp timestamp
    event VaultActivityRecorded(address indexed vault, uint64 timestamp);

    /// @notice GuardianVoteCast
    /// @param claimId claimId
    /// @param guardian guardian
    /// @param approved approved
    /// @param totalApprovals totalApprovals
    event GuardianVoteCast(
        uint256 indexed claimId,
        address indexed guardian,
        bool approved,
        uint8 totalApprovals
    );
    
    
    /// @notice ClaimChallenged
    /// @param claimId claimId
    /// @param challenger challenger
    /// @param reason reason
    event ClaimChallenged(
        uint256 indexed claimId,
        address indexed challenger,
        string reason
    );
    
    /// @notice ClaimApproved
    /// @param claimId claimId
    /// @param vault vault
    /// @param newOwner newOwner
    event ClaimApproved(
        uint256 indexed claimId,
        address indexed vault,
        address indexed newOwner
    );
    
    /// @notice ClaimRejected
    /// @param claimId claimId
    /// @param vault vault
    /// @param reason reason
    event ClaimRejected(
        uint256 indexed claimId,
        address indexed vault,
        string reason
    );
    
    /// @notice ClaimExecuted
    /// @param claimId claimId
    /// @param vault vault
    /// @param newOwner newOwner
    /// @param previousOwner previousOwner
    event ClaimExecuted(
        uint256 indexed claimId,
        address indexed vault,
        address indexed newOwner,
        address previousOwner
    );
    
    /// @notice ClaimExpired
    /// @param claimId claimId
    /// @param vault vault
    event ClaimExpired(
        uint256 indexed claimId,
        address indexed vault
    );
    
    /// @notice VerifierSet
    /// @param verifier verifier
    /// @param trusted trusted
    event VerifierSet(address indexed verifier, bool trusted);
    /// @notice VerifierChangeQueued
    /// @param verifier verifier
    /// @param trusted trusted
    /// @param executeAfter executeAfter
    event VerifierChangeQueued(address indexed verifier, bool trusted, uint64 executeAfter);
    /// @notice VerifierChangeCancelled
    /// @param verifier verifier
    /// @param trusted trusted
    event VerifierChangeCancelled(address indexed verifier, bool trusted);
    /// @notice VaultHubChangeQueued
    /// @param newVaultHub newVaultHub
    /// @param executeAfter executeAfter
    event VaultHubChangeQueued(address indexed newVaultHub, uint64 executeAfter);
    /// @notice VaultHubChangeApplied
    /// @param oldVaultHub oldVaultHub
    /// @param newVaultHub newVaultHub
    event VaultHubChangeApplied(address indexed oldVaultHub, address indexed newVaultHub);
    /// @notice VaultHubChangeCancelled
    /// @param pendingVaultHub pendingVaultHub
    event VaultHubChangeCancelled(address indexed pendingVaultHub);
    /// @notice VaultRegistryChangeQueued
    /// @param newVaultRegistry newVaultRegistry
    /// @param executeAfter executeAfter
    event VaultRegistryChangeQueued(address indexed newVaultRegistry, uint64 executeAfter);
    /// @notice VaultRegistryChangeApplied
    /// @param oldVaultRegistry oldVaultRegistry
    /// @param newVaultRegistry newVaultRegistry
    event VaultRegistryChangeApplied(address indexed oldVaultRegistry, address indexed newVaultRegistry);
    /// @notice VaultRegistryChangeCancelled
    /// @param pendingVaultRegistry pendingVaultRegistry
    event VaultRegistryChangeCancelled(address indexed pendingVaultRegistry);

    // ═══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice InvalidVault
    error InvalidVault();
    /// @notice ClaimAlreadyExists
    error ClaimAlreadyExists();
    /// @notice NoActiveClaim
    error NoActiveClaim();
    /// @notice NotGuardian
    error NotGuardian();
    /// @notice AlreadyVoted
    error AlreadyVoted();
    /// @notice ClaimNotPending
    error ClaimNotPending();
    /// @notice NoPendingVerifierChange
    error NoPendingVerifierChange();
    /// @notice VerifierChangeNotReady
    error VerifierChangeNotReady();
    /// @notice ChallengePeriodActive
    error ChallengePeriodActive();
    /// @notice ChallengePeriodEnded
    error ChallengePeriodEnded();
    /// @notice ClaimHasExpired
    error ClaimHasExpired();
    /// @notice NotOriginalOwner
    error NotOriginalOwner();
    /// @notice InsufficientApprovals
    error InsufficientApprovals();
    /// @notice ClaimantAlreadyHasVault
    error ClaimantAlreadyHasVault();
    /// @notice ZeroAddress
    error ZeroAddress();
    /// @notice ModuleChangePending
    error ModuleChangePending();
    /// @notice ModuleChangeNotReady
    error ModuleChangeNotReady();
    /// @notice NoPendingModuleChange
    error NoPendingModuleChange();
    // R-8 (guardian-initiated recovery)
    /// @notice NotTrustee
    error NotTrustee();              // initiateClaim caller is not a trustee on the vault
    /// @notice InitiatorCooldownActive
    error InitiatorCooldownActive(); // initiator was challenged on this vault within the cooldown window

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice constructor
    /// @param _vaultHub _vaultHub
    /// @param _vaultRegistry _vaultRegistry
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
     * @param vault vault
     */
    function recordVaultActivity(address vault) external {
        require(msg.sender == vault || msg.sender == vaultHub.ownerOfVault(vault), "VaultRecoveryClaim: not vault or owner");
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
     * @return claimId claimId
     */
    function initiateClaim(address vault, string calldata recoveryId, bytes32 evidenceHash, string calldata reason) external nonReentrant returns (uint256 claimId) {
        return _initiateClaim(vault, recoveryId, evidenceHash, reason);
    }

    /**
     * @notice Internal implementation of claim initiation
     * @param vault vault
     * @param recoveryId recoveryId
     * @param evidenceHash evidenceHash
     * @param reason reason
     * @return claimId claimId
     */
    function _initiateClaim(address vault, string calldata recoveryId, bytes32 evidenceHash, string calldata reason) internal returns (uint256 claimId) {
        // Validate vault exists
        if (!vaultHub.isVault(vault)) revert InvalidVault();

        // C-2 FIX: Auto-expire stale claims and check for active ones
        // Also include Challenged status in blocking check
        if (activeClaimForVault[vault] != 0) {
            RecoveryClaim storage existing = claims[activeClaimForVault[vault]];
            // Auto-expire if past expiry time
            if (block.timestamp > existing.expiresAt && (existing.status == ClaimStatus.Pending || existing.status == ClaimStatus.GuardianApproved || existing.status == ClaimStatus.Challenged)) {
                existing.status = ClaimStatus.Expired;
                activeClaimForVault[vault] = 0;
            } else if (
                existing.status == ClaimStatus.Pending || existing.status == ClaimStatus.GuardianApproved || existing.status == ClaimStatus.Approved || existing.status == ClaimStatus.Challenged
            ) {
                revert ClaimAlreadyExists();
            }
        }

        // ─────────────────────────────────────────────────────────────
        // R-8: TRUSTEE GATING ON INITIATION
        // ─────────────────────────────────────────────────────────────
        // initiateClaim was previously callable by anyone. With tiered guardian
        // roles, we restrict it to:
        //   (a) trustees of the target vault (they have the user's explicit
        //       trust to start recovery on the user's behalf), OR
        //   (b) the claimant proving ownership another way — currently only
        //       (a) is supported. Future: passkey/email proofs as alt paths.
        //
        // RATIONALE: The previous "anyone can initiate" model was safe because
        // progression required guardian approvals anyway. But it allowed
        // griefing — any stranger could spam initiate-then-fail attempts,
        // notification spam to the owner. Trustee gating closes that vector
        // while keeping the legitimate guardian-helps-user flow open.
        //
        // SAFETY: We check is-trustee BUT NOT is-mature. Trustee status
        // already implies mature-guardian status (the vault's setTrustee
        // requires the address be a guardian, and the 7-day maturity period
        // applies to guardian-add not trustee-promotion). However we DO check
        // trusteeCount > 0 to give a clean error when the user simply has no
        // trustees configured — the frontend can prompt them to set some up.
        IUserVaultRecovery userVault = IUserVaultRecovery(vault);
        if (userVault.trusteeCountView() > 0) {
            // Vault has trustees configured — initiation is restricted to them.
            if (!userVault.isGuardianTrustee(msg.sender)) revert NotTrustee();
        }
        // If trusteeCount == 0, fall through — anyone can still initiate (the
        // pre-R8 behavior). This preserves the recovery path for users who
        // haven't configured trustees yet; warning is the frontend's job.

        // ─────────────────────────────────────────────────────────────
        // R-8: INITIATOR COOLDOWN
        // ─────────────────────────────────────────────────────────────
        // If this initiator was previously challenged on this vault, enforce
        // the 30-day cooldown. Note: cooldown is per (vault, initiator) pair —
        // other trustees on the same vault are unaffected.
        if (block.timestamp < initiatorCooldownUntil[vault][msg.sender]) {
            revert InitiatorCooldownActive();
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
        // R-8: Layer the user's per-vault preference on top of the activity/setup logic.
        //      Always use max() of (preference, activity-based-window) so the user's preference
        //      cannot SHRINK the protection provided by the activity-based extension. They can
        //      only EXTEND it. This prevents a compromised owner key from setting a very short
        //      preference to speed up a malicious recovery.
        bool setupComplete = vaultHub.guardianSetupComplete(vault);
        uint64 baseChallengePeriod;
        if (!setupComplete) {
            // Guardian setup incomplete → use the extended window.
            baseChallengePeriod = ACTIVE_VAULT_CHALLENGE_PERIOD; // 14 days
        } else if (vaultLastActivity[vault] != 0 && block.timestamp - vaultLastActivity[vault] <= VAULT_ACTIVITY_WINDOW) {
            baseChallengePeriod = ACTIVE_VAULT_CHALLENGE_PERIOD; // 14 days
        } else {
            baseChallengePeriod = CHALLENGE_PERIOD; // 7 days
        }

        // Read user preference (0 means "no preference, use base")
        uint64 userPreference = userVault.challengePeriodPreferenceView();
        uint64 effectiveChallengePeriod = userPreference > baseChallengePeriod ? userPreference : baseChallengePeriod;

        claims[claimId] = RecoveryClaim({
            vault: vault,
            claimant: msg.sender,
            originalOwner: originalOwner,
            initiator: msg.sender,
            initiatedAt: uint64(block.timestamp),
            challengeEndsAt: uint64(block.timestamp + effectiveChallengePeriod),
            expiresAt: uint64(block.timestamp + CLAIM_EXPIRY),
            status: ClaimStatus.Pending,
            guardianApprovals: 0,
            verifierVotes: 0,
            // H-5 FIX: Snapshot guardian count so mid-claim guardian removals cannot
            // lower the approval quorum or enable the verifier-fallback path.
            guardianCountSnapshot: userVault.guardianCount(),
            // R-8: Snapshot the effective challenge period so it cannot be shrunk
            // mid-claim by a setChallengePeriodPreference call from a compromised key.
            challengePeriodSnapshot: effectiveChallengePeriod,
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
     * @return claimId claimId
     */
    function initiateClaimByRecoveryId(string calldata recoveryId, string calldata reason) external nonReentrant returns (uint256 claimId) {
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
            ++claim.guardianApprovals;
        }

        emit GuardianVoteCast(claimId, msg.sender, approve, claim.guardianApprovals);

        // Check if we have enough approvals — use snapshot, not live guardianCount.
        uint8 requiredApprovals = _calculateRequiredApprovals(claim.guardianCountSnapshot);

        if (claim.guardianApprovals >= requiredApprovals) {
            claim.status = ClaimStatus.GuardianApproved;
            // R-8: Use the snapshotted challenge period (which already includes the
            // user's preference AND the activity-based extension). Pre-R8 this hard-coded
            // CHALLENGE_PERIOD which would override the user's longer-preference choice
            // and the activity extension when guardian approvals arrived after initiation.
            claim.challengeEndsAt = uint64(block.timestamp) + claim.challengePeriodSnapshot;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // TRUSTED VERIFIER VOTING (Community Verification)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Trusted verifier votes on a recovery claim
     * @dev Used when vault has no personal guardians, or as additional verification.
     *      DISABLED: The trusted-verifier vote path was never wired into finalizeClaim
     *      (MIN_VERIFIER_VOTES is declared but never checked). Rather than partially
     *      enabling it, this path is explicitly disabled. Recovery proceeds through the
     *      canonical guardian-approved path only (GuardianApproved → finalizeClaim).
     *      Re-enable in a future release after defining per-claim path semantics
     *      and updating finalizeClaim to enforce MIN_VERIFIER_VOTES on the verifier path.
     * @param claimId The claim ID
     * @param approve True to approve claim
     */
    function verifierVote(uint256 claimId, bool approve) external pure {
        // Suppress unused-parameter warnings while keeping disabled body clear.
        (claimId, approve);
        revert("VRC: verifier vote disabled");
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

        if (claim.status == ClaimStatus.None || claim.status == ClaimStatus.Executed || claim.status == ClaimStatus.Rejected || claim.status == ClaimStatus.Expired) {
            revert NoActiveClaim();
        }

        // Only original owner can challenge
        if (msg.sender != claim.originalOwner) revert NotOriginalOwner();

        if (claim.challengeEndsAt != 0 && block.timestamp > claim.challengeEndsAt + FINALIZATION_GRACE_PERIOD) {
            revert ChallengePeriodEnded();
        }

        claim.status = ClaimStatus.Rejected;
        activeClaimForVault[claim.vault] = 0;

        // R-8: Lock this initiator out for 30 days. Per-(vault, initiator) so
        // other trustees can still help if the original was a genuine mistake
        // and the user is in a real emergency. Punishes harassment without
        // punishing the user.
        initiatorCooldownUntil[claim.vault][claim.initiator] = uint64(block.timestamp) + INITIATOR_COOLDOWN;

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
    
    // slither-disable-next-line reentrancy-no-eth  // internal helper; only called from finalizeClaim (which has nonReentrant guard)
    /**
     * @notice Execute the actual ownership transfer via guardian-approved rotation
     * @dev H-8 FIX: Uses VaultHub.executeRecoveryRotation instead of forceSetOwner.
     *      Non-custodial: only reachable after guardian approvals + 7-day challenge.
     * @param claimId claimId
     */
    function _executeRecovery(uint256 claimId) internal {
        RecoveryClaim storage claim = claims[claimId];

        vaultHub.executeRecoveryRotation(claim.vault, claim.claimant);

        claim.status = ClaimStatus.Executed;
        activeClaimForVault[claim.vault] = 0;

        emit ClaimExecuted(claimId, claim.vault, claim.claimant, claim.originalOwner);
    }

    /// @notice Legacy finalization — no longer needed. Recovery completes in finalizeClaim.
    /// @param claimId claimId
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

        if (claim.status == ClaimStatus.Pending || claim.status == ClaimStatus.GuardianApproved) {
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
     * @param claimId claimId
     */
    function getClaim(uint256 claimId) external view returns (RecoveryClaim memory) {
        return claims[claimId];
    }

    /**
     * @notice Get active claim for a vault
     * @param vault vault
     * @return claimId claimId
     * @return claim claim
     */
    function getActiveClaimForVault(address vault) external view returns (uint256 claimId, RecoveryClaim memory claim) {
        claimId = activeClaimForVault[vault];
        if (claimId != 0) {
            claim = claims[claimId];
        }
    }

    /**
     * @notice Check if claim can be finalized
     * @param claimId claimId
     * @return reason reason
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
     * @param claimId claimId
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
    /// @param _vaultHub _vaultHub
    function setVaultHub(address _vaultHub) external onlyOwner {
        if (_vaultHub == address(0)) revert ZeroAddress();
        if (pendingVaultHubChange.executeAfter != 0) revert ModuleChangePending();
        uint64 executeAfter = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingVaultHubChange = PendingModuleChange({newAddress: _vaultHub, executeAfter: executeAfter});
        emit VaultHubChangeQueued(_vaultHub, executeAfter);
    }

    /// @notice applyVaultHub
    function applyVaultHub() external onlyOwner {
        PendingModuleChange memory pending = pendingVaultHubChange;
        if (pending.executeAfter == 0) revert NoPendingModuleChange();
        if (block.timestamp < pending.executeAfter) revert ModuleChangeNotReady();

        address oldVaultHub = address(vaultHub);
        vaultHub = IVaultHubRecovery(pending.newAddress);
        delete pendingVaultHubChange;
        emit VaultHubChangeApplied(oldVaultHub, pending.newAddress);
    }

    /// @notice cancelVaultHubChange
    function cancelVaultHubChange() external onlyOwner {
        PendingModuleChange memory pending = pendingVaultHubChange;
        if (pending.executeAfter == 0) revert NoPendingModuleChange();
        delete pendingVaultHubChange;
        emit VaultHubChangeCancelled(pending.newAddress);
    }

    /// @notice Propose updating vaultRegistry after a 48h timelock.
    /// @param _vaultRegistry _vaultRegistry
    function setVaultRegistry(address _vaultRegistry) external onlyOwner {
        if (_vaultRegistry == address(0)) revert ZeroAddress();
        if (pendingVaultRegistryChange.executeAfter != 0) revert ModuleChangePending();
        uint64 executeAfter = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingVaultRegistryChange = PendingModuleChange({newAddress: _vaultRegistry, executeAfter: executeAfter});
        emit VaultRegistryChangeQueued(_vaultRegistry, executeAfter);
    }

    /// @notice applyVaultRegistry
    function applyVaultRegistry() external onlyOwner {
        PendingModuleChange memory pending = pendingVaultRegistryChange;
        if (pending.executeAfter == 0) revert NoPendingModuleChange();
        if (block.timestamp < pending.executeAfter) revert ModuleChangeNotReady();

        address oldVaultRegistry = address(vaultRegistry);
        vaultRegistry = IVaultRegistry(pending.newAddress);
        delete pendingVaultRegistryChange;
        emit VaultRegistryChangeApplied(oldVaultRegistry, pending.newAddress);
    }

    /// @notice cancelVaultRegistryChange
    function cancelVaultRegistryChange() external onlyOwner {
        PendingModuleChange memory pending = pendingVaultRegistryChange;
        if (pending.executeAfter == 0) revert NoPendingModuleChange();
        delete pendingVaultRegistryChange;
        emit VaultRegistryChangeCancelled(pending.newAddress);
    }
    
    /// @notice setTrustedVerifier
    /// @param verifier verifier
    /// @param trusted trusted
    function setTrustedVerifier(address verifier, bool trusted) external onlyOwner {
        if (verifier == address(0)) revert ZeroAddress();

        uint64 executeAfter = uint64(block.timestamp) + VERIFIER_CHANGE_DELAY;
        pendingVerifierChange = PendingVerifierChange({verifier: verifier, trusted: trusted, executeAfter: executeAfter});
        emit VerifierChangeQueued(verifier, trusted, executeAfter);
    }

    /// @notice applyTrustedVerifierChange
    function applyTrustedVerifierChange() external onlyOwner {
        PendingVerifierChange memory pending = pendingVerifierChange;
        if (pending.executeAfter == 0) revert NoPendingVerifierChange();
        if (block.timestamp < pending.executeAfter) revert VerifierChangeNotReady();

        delete pendingVerifierChange;
        trustedVerifier[pending.verifier] = pending.trusted;
        emit VerifierSet(pending.verifier, pending.trusted);
    }

    /// @notice cancelTrustedVerifierChange
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
     * @param guardianCount guardianCount
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
