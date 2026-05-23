// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";

/// @notice ICardBoundVaultInheritanceAccess
/// @title ICardBoundVaultInheritanceAccess
/// @author Vfide
interface ICardBoundVaultInheritanceAccess {
    /// @notice admin
    /// @return _address _address
    function admin() external view returns (address);
    /// @notice isGuardian
    /// @param guardian guardian
    /// @return _bool _bool
    function isGuardian(address guardian) external view returns (bool);
    /// @notice guardianThreshold
    /// @return _uint8 _uint8
    function guardianThreshold() external view returns (uint8);
    /// @notice pendingRecoveryRotation
    /// @return _bool _bool
    function pendingRecoveryRotation() external view returns (bool);
    /// @notice paused
    /// @return _bool _bool
    function paused() external view returns (bool);
    /// @notice vfideToken
    /// @return _address _address
    function vfideToken() external view returns (address);
}

/// @notice CardBoundVaultInheritanceManager
/// @title CardBoundVaultInheritanceManager
/// @author Vfide
contract CardBoundVaultInheritanceManager {
    /// @notice INHERITANCE_VETO_PERIOD
    uint64 public constant INHERITANCE_VETO_PERIOD = 30 days;
    /// @notice INHERITANCE_CLAIM_WINDOW
    uint64 public constant INHERITANCE_CLAIM_WINDOW = 90 days;
    /// @notice INHERITANCE_MEMORIAL_PERIOD
    uint64 public constant INHERITANCE_MEMORIAL_PERIOD = 365 days;
    /// @notice INHERITANCE_CONFIG_COOLDOWN
    uint64 public constant INHERITANCE_CONFIG_COOLDOWN = 30 days;
    /// @notice MAX_HEIRS
    uint8 public constant MAX_HEIRS = 5;
    /// @notice TOTAL_BASIS_POINTS
    uint256 public constant TOTAL_BASIS_POINTS = 10000;
    /// @notice INHERITANCE_COMMITMENT_DOMAIN
    bytes32 public constant INHERITANCE_COMMITMENT_DOMAIN = keccak256("VFIDE_INHERITANCE_V1");

    /// @notice STATE_NORMAL
    uint8 public constant STATE_NORMAL = 0;
    /// @notice STATE_VETO_PERIOD
    uint8 public constant STATE_VETO_PERIOD = 1;
    /// @notice STATE_CLAIM_WINDOW
    uint8 public constant STATE_CLAIM_WINDOW = 2;
    /// @notice STATE_MEMORIAL
    uint8 public constant STATE_MEMORIAL = 3;
    /// @notice STATE_CLOSED
    uint8 public constant STATE_CLOSED = 4;

    /// @notice vault
    address public immutable vault;

    /// @notice heirGuardianByIndex
    mapping(uint256 => address) public heirGuardianByIndex;
    /// @notice heirCommitmentByGuardian
    mapping(address => bytes32) public heirCommitmentByGuardian;
    /// @notice heirCount
    uint8 public heirCount;
    /// @notice proofOfLifeWallet
    address public proofOfLifeWallet;
    /// @notice inheritanceConfigVersion
    uint64 public inheritanceConfigVersion;
    /// @notice pendingConfigHash
    bytes32 public pendingConfigHash;
    /// @notice pendingHeirConfigEffectiveAt
    uint64 public pendingHeirConfigEffectiveAt;
    /// @notice pendingConfigVersion
    uint64 public pendingConfigVersion;
    /// @notice pendingHeirCount
    uint8 public pendingHeirCount;
    /// @notice pendingHeirGuardianByIndex
    mapping(uint256 => address) private pendingHeirGuardianByIndex;
    /// @notice pendingHeirCommitmentByIndex
    mapping(uint256 => bytes32) private pendingHeirCommitmentByIndex;

    /// @notice inheritanceStateValue
    uint8 public inheritanceStateValue;
    /// @notice inheritanceStateWindowEnd
    uint64 public inheritanceStateWindowEnd;
    /// @notice inheritanceInitiator
    address public inheritanceInitiator;
    /// @notice inheritanceReasonHash
    bytes32 public inheritanceReasonHash;
    /// @notice claimConfigVersion
    uint64 public claimConfigVersion;
    /// @notice inheritanceClaimNonce
    uint256 public inheritanceClaimNonce;
    /// @notice vetoCount
    uint256 public vetoCount;
    /// @notice totalRevealedBasisPoints
    uint256 public totalRevealedBasisPoints;
    /// @notice distributionFinalized
    bool public distributionFinalized;
    /// @notice payoutBalance
    uint256 public payoutBalance;
    /// @notice totalPaidOut
    uint256 public totalPaidOut;
    /// @notice withdrawnRevealerCount
    uint256 public withdrawnRevealerCount;

    /// @notice snapshotOwnerAdmin
    address public snapshotOwnerAdmin;
    /// @notice snapshotProofOfLifeWallet
    address public snapshotProofOfLifeWallet;
    /// @notice snapshotVetoThreshold
    uint256 public snapshotVetoThreshold;

    // ── R-3 — DAO guardian initiation block ─────────────────────────────
    /// @notice The single DAO-controlled address registered as a guardian, if any.
    /// @dev Per design Decision 12, the DAO can VETO but cannot INITIATE. This
    ///      address is checked in initiateInheritanceClaim and rejected. Zero
    ///      address means no DAO guardian is registered for this vault — in
    ///      that case the check is a no-op.
    address public daoGuardian;

    // ── R-1 — Guardian-quorum cancel of pending config ──────────────────
    /// @notice Per-version tally of guardian votes to cancel a pending config.
    /// @dev Keyed by `pendingConfigVersion`. When the count reaches the
    ///      current guardian threshold, the pending state is cleared. Each
    ///      guardian can vote at most once per pending version.
    mapping(uint64 => uint256) public cancelVotesByPendingVersion;
    /// @notice hasVotedToCancelByPendingVersion
    mapping(uint64 => mapping(address => bool)) public hasVotedToCancelByPendingVersion;

    /// @notice guardianVetoedAtNonce
    mapping(address => uint256) private guardianVetoedAtNonce;
    /// @notice revealedByNonce
    mapping(uint256 => mapping(address => bool)) private revealedByNonce;
    /// @notice revealedBasisPointsByNonce
    mapping(uint256 => mapping(address => uint256)) private revealedBasisPointsByNonce;
    /// @notice finalBasisPointsByNonce
    mapping(uint256 => mapping(address => uint256)) private finalBasisPointsByNonce;
    /// @notice finalPayoutAmountByNonce
    mapping(uint256 => mapping(address => uint256)) private finalPayoutAmountByNonce;
    /// @notice withdrawnByNonce
    mapping(uint256 => mapping(address => bool)) private withdrawnByNonce;
    /// @notice revealersByNonce
    mapping(uint256 => address[]) private revealersByNonce;
    /// @notice claimedHashes
    mapping(bytes32 => bool) public claimedHashes;

    /// @notice InheritanceConfigProposed
    /// @param pendingVersion pendingVersion
    /// @param heirGuardians heirGuardians
    /// @param heirCommitments heirCommitments
    /// @param effectiveAt effectiveAt
    event InheritanceConfigProposed(uint64 indexed pendingVersion, address[] heirGuardians, bytes32[] heirCommitments, uint256 effectiveAt);
    /// @notice InheritanceConfigConfirmed
    /// @param configVersion configVersion
    /// @param heirGuardians heirGuardians
    /// @param heirCommitments heirCommitments
    event InheritanceConfigConfirmed(uint64 indexed configVersion, address[] heirGuardians, bytes32[] heirCommitments);
    /// @notice InheritanceConfigCancelled
    event InheritanceConfigCancelled();
    /// @notice ProofOfLifeWalletSet
    /// @param polWallet polWallet
    event ProofOfLifeWalletSet(address indexed polWallet);
    /// @notice InheritanceClaimInitiated
    /// @param initiatingGuardian initiatingGuardian
    /// @param reasonHash reasonHash
    /// @param vetoWindowEnd vetoWindowEnd
    /// @param configVersion configVersion
    event InheritanceClaimInitiated(address indexed initiatingGuardian, bytes32 reasonHash, uint64 vetoWindowEnd, uint64 configVersion);
    /// @notice InheritanceClaimVetoed
    /// @param guardian guardian
    /// @param currentVetos currentVetos
    event InheritanceClaimVetoed(address indexed guardian, uint256 currentVetos);
    /// @notice InheritanceClaimOverridden
    /// @param owner owner
    event InheritanceClaimOverridden(address indexed owner);
    /// @notice InheritanceClaimEnteredClaimWindow
    /// @param claimWindowEnd claimWindowEnd
    event InheritanceClaimEnteredClaimWindow(uint64 claimWindowEnd);
    /// @notice HeirClaimRevealed
    /// @param heir heir
    /// @param basisPoints basisPoints
    event HeirClaimRevealed(address indexed heir, uint256 basisPoints);
    /// @notice InheritanceDistributionFinalized
    /// @param revealedShares revealedShares
    /// @param forfeitedShares forfeitedShares
    event InheritanceDistributionFinalized(uint256 revealedShares, uint256 forfeitedShares);
    /// @notice InheritanceFullySettled
    /// @param totalPaidOut totalPaidOut
    event InheritanceFullySettled(uint256 totalPaidOut);
    /// @notice PendingObligationsSettled
    /// @param escrowsResolved escrowsResolved
    /// @param loansRepaid loansRepaid
    /// @param subsCancelled subsCancelled
    event PendingObligationsSettled(uint256 escrowsResolved, uint256 loansRepaid, uint256 subsCancelled);
    /// @notice VaultEnteredMemorial
    /// @param memorialEnd memorialEnd
    event VaultEnteredMemorial(uint64 memorialEnd);
    /// @notice MemorialVaultClosed
    event MemorialVaultClosed();
    /// @notice R-3 — emitted when the DAO guardian for this vault is set or cleared.
    /// @param previous previous
    /// @param current current
    event DAOGuardianSet(address indexed previous, address indexed current);
    /// @notice R-1 — emitted when a guardian votes to cancel a pending config.
    /// @param pendingVersion pendingVersion
    /// @param guardian guardian
    /// @param currentVotes currentVotes
    event PendingConfigCancellationVoted(uint64 indexed pendingVersion, address indexed guardian, uint256 currentVotes);
    /// @notice R-1 — emitted when guardian-quorum cancellation succeeds and pending state is cleared.
    /// @param pendingVersion pendingVersion
    /// @param finalVotes finalVotes
    /// @param threshold threshold
    event PendingConfigCancelledByGuardians(uint64 indexed pendingVersion, uint256 finalVotes, uint256 threshold);

    /// @notice INH_NotGuardian
    error INH_NotGuardian();
    /// @notice INH_NotOwner
    error INH_NotOwner();
    /// @notice INH_NotProofOfLifeWallet
    error INH_NotProofOfLifeWallet();
    /// @notice INH_WrongState
    /// @param currentState currentState
    /// @param expectedState expectedState
    error INH_WrongState(uint8 currentState, uint8 expectedState);
    /// @notice INH_CooldownActive
    /// @param remaining remaining
    error INH_CooldownActive(uint64 remaining);
    /// @notice INH_TooManyHeirs
    /// @param provided provided
    /// @param max max
    error INH_TooManyHeirs(uint256 provided, uint256 max);
    /// @notice INH_NoHeirsConfigured
    error INH_NoHeirsConfigured();
    /// @notice INH_HashAlreadyClaimed
    error INH_HashAlreadyClaimed();
    /// @notice INH_InvalidSecret
    error INH_InvalidSecret();
    /// @notice INH_OwnerOverrideExpired
    error INH_OwnerOverrideExpired();
    /// @notice INH_RecoveryInProgress
    error INH_RecoveryInProgress();
    /// @notice INH_VaultPaused
    error INH_VaultPaused();
    /// @notice INH_MemorialNotEnded
    /// @param remaining remaining
    error INH_MemorialNotEnded(uint64 remaining);
    /// @notice INH_DistributionNotFinalized
    error INH_DistributionNotFinalized();
    /// @notice INH_AlreadyRevealed
    error INH_AlreadyRevealed();
    /// @notice INH_InvalidCommitment
    error INH_InvalidCommitment();
    /// @notice R-3 — DAO guardian is not permitted to initiate inheritance claims.
    error INH_DAOCannotInitiate();
    /// @notice R-1 — Guardian has already voted to cancel the current pending config.
    error INH_AlreadyVotedToCancel();
    /// @notice R-1 — No pending config exists; nothing to cancel.
    error INH_NoPendingConfig();

    /// @notice onlyVault
    modifier onlyVault() {
        if (msg.sender != vault) revert INH_NotOwner();
        _;
    }

    /// @notice constructor
    /// @param vault_ vault_
    constructor(address vault_) {
        require(vault_ != address(0), "CBV-IM: zero vault");
        vault = vault_;
        inheritanceStateValue = STATE_NORMAL;
    }

    /// @notice proposeInheritanceConfig
    /// @param actor actor
    /// @param heirGuardians heirGuardians
    /// @param heirCommitments heirCommitments
    function proposeInheritanceConfig(
        address actor,
        address[] calldata heirGuardians,
        bytes32[] calldata heirCommitments
    ) external onlyVault {
        _requireAdmin(actor);
        if (inheritanceStateValue != STATE_NORMAL) {
            revert INH_WrongState(inheritanceStateValue, STATE_NORMAL);
        }
        uint256 count = heirGuardians.length;
        if (count != heirCommitments.length) revert INH_InvalidCommitment();
        if (count > MAX_HEIRS) revert INH_TooManyHeirs(count, MAX_HEIRS);

        delete pendingConfigHash;
        pendingHeirCount = uint8(count);
        for (uint256 i = 0; i < MAX_HEIRS; ++i) {
            delete pendingHeirGuardianByIndex[i];
            delete pendingHeirCommitmentByIndex[i];
        }

        for (uint256 i = 0; i < count; ++i) {
            address guardian = heirGuardians[i];
            if (guardian == address(0) || !_isGuardian(guardian)) revert INH_NotGuardian();
            for (uint256 j = 0; j < i; ++j) {
                if (heirGuardians[j] == guardian) revert INH_InvalidCommitment();
            }
            if (heirCommitments[i] == bytes32(0)) revert INH_InvalidCommitment();
            pendingHeirGuardianByIndex[i] = guardian;
            pendingHeirCommitmentByIndex[i] = heirCommitments[i];
        }

        uint64 newVersion = inheritanceConfigVersion + 1;
        pendingConfigVersion = newVersion;
        pendingHeirConfigEffectiveAt = uint64(block.timestamp + INHERITANCE_CONFIG_COOLDOWN);
        pendingConfigHash = keccak256(abi.encode(newVersion, heirGuardians, heirCommitments));

        emit InheritanceConfigProposed(newVersion, heirGuardians, heirCommitments, pendingHeirConfigEffectiveAt);
    }

    /// @notice confirmInheritanceConfig
    /// @param actor actor
    function confirmInheritanceConfig(address actor) external onlyVault {
        _requireAdmin(actor);
        if (inheritanceStateValue != STATE_NORMAL) {
            revert INH_WrongState(inheritanceStateValue, STATE_NORMAL);
        }
        uint64 effectiveAt = pendingHeirConfigEffectiveAt;
        if (effectiveAt == 0) revert INH_InvalidCommitment();
        if (block.timestamp < effectiveAt) {
            revert INH_CooldownActive(uint64(effectiveAt - uint64(block.timestamp)));
        }

        uint8 count = pendingHeirCount;
        address[] memory heirs = new address[](count);
        bytes32[] memory commitments = new bytes32[](count);

        for (uint256 i = 0; i < MAX_HEIRS; ++i) {
            address oldGuardian = heirGuardianByIndex[i];
            if (oldGuardian != address(0)) {
                delete heirCommitmentByGuardian[oldGuardian];
                delete heirGuardianByIndex[i];
            }
        }

        for (uint256 i = 0; i < count; ++i) {
            address guardian = pendingHeirGuardianByIndex[i];
            if (!_isGuardian(guardian)) revert INH_NotGuardian();
            bytes32 commitment = pendingHeirCommitmentByIndex[i];
            heirs[i] = guardian;
            commitments[i] = commitment;
            heirGuardianByIndex[i] = guardian;
            heirCommitmentByGuardian[guardian] = commitment;
        }

        heirCount = count;
        inheritanceConfigVersion = pendingConfigVersion;

        delete pendingConfigHash;
        delete pendingHeirConfigEffectiveAt;
        delete pendingConfigVersion;
        delete pendingHeirCount;
        for (uint256 i = 0; i < MAX_HEIRS; ++i) {
            delete pendingHeirGuardianByIndex[i];
            delete pendingHeirCommitmentByIndex[i];
        }

        emit InheritanceConfigConfirmed(inheritanceConfigVersion, heirs, commitments);
    }

    /// @notice cancelInheritanceConfigChange
    /// @param actor actor
    function cancelInheritanceConfigChange(address actor) external onlyVault {
        _requireAdmin(actor);
        delete pendingConfigHash;
        delete pendingHeirConfigEffectiveAt;
        delete pendingConfigVersion;
        delete pendingHeirCount;
        for (uint256 i = 0; i < MAX_HEIRS; ++i) {
            delete pendingHeirGuardianByIndex[i];
            delete pendingHeirCommitmentByIndex[i];
        }
        emit InheritanceConfigCancelled();
    }

    /// @notice clearAllHeirs
    /// @param actor actor
    function clearAllHeirs(address actor) external onlyVault {
        _requireAdmin(actor);
        address[] memory noHeirs = new address[](0);
        bytes32[] memory noCommitments = new bytes32[](0);
        if (inheritanceStateValue != STATE_NORMAL) {
            revert INH_WrongState(inheritanceStateValue, STATE_NORMAL);
        }
        for (uint256 i = 0; i < MAX_HEIRS; ++i) {
            delete pendingHeirGuardianByIndex[i];
            delete pendingHeirCommitmentByIndex[i];
        }
        pendingHeirCount = 0;
        pendingConfigVersion = inheritanceConfigVersion + 1;
        pendingHeirConfigEffectiveAt = uint64(block.timestamp + INHERITANCE_CONFIG_COOLDOWN);
        pendingConfigHash = keccak256(abi.encode(pendingConfigVersion, noHeirs, noCommitments));
        emit InheritanceConfigProposed(pendingConfigVersion, noHeirs, noCommitments, pendingHeirConfigEffectiveAt);
    }

    // slither-disable-next-line missing-zero-check  // address(0) clears the proof-of-life wallet (intentional)
    /// @notice setProofOfLifeWallet
    /// @param actor actor
    /// @param polWallet polWallet
    function setProofOfLifeWallet(address actor, address polWallet) external onlyVault {
        _requireAdmin(actor);
        proofOfLifeWallet = polWallet;
        emit ProofOfLifeWalletSet(polWallet);
    }

    // slither-disable-next-line missing-zero-check  // address(0) clears the DAO guardian (intentional per docstring)
    /// @notice R-3 — Owner registers the DAO guardian for this vault.
    /// @dev When set, the named address is rejected from initiating inheritance
    ///      claims per design Decision 12, but can still veto (it's a guardian
    ///      otherwise). Set to address(0) to clear. No cooldown — same semantics
    ///      as setProofOfLifeWallet since this is purely a defensive constraint.
    /// @param actor actor
    /// @param dao dao
    function setDAOGuardian(address actor, address dao) external onlyVault {
        _requireAdmin(actor);
        address previous = daoGuardian;
        daoGuardian = dao;
        emit DAOGuardianSet(previous, dao);
    }

    /// @notice R-1 — A guardian votes to cancel the current pending config proposal.
    /// @dev Per design Decision 4, M-of-N guardians should be able to cancel a
    ///      pending heir-config proposal as a backstop for owner-key compromise.
    ///      Each guardian can vote at most once per pendingConfigVersion. When
    ///      the count reaches the vault's current guardianThreshold, the
    ///      pending state is cleared. Owner cancellation via
    ///      `cancelInheritanceConfigChange` remains independent.
    ///
    ///      Vote tallies are keyed by pendingConfigVersion so that successive
    ///      proposals don't share counts. Cancellation by quorum does NOT
    ///      increment pendingConfigVersion — the version increments only when
    ///      a NEW proposal is made.
    /// @param actor actor
    function cancelInheritanceConfigChangeByGuardians(address actor) external onlyVault {
        if (pendingHeirConfigEffectiveAt == 0) revert INH_NoPendingConfig();
        if (!_isGuardian(actor)) revert INH_NotGuardian();
        uint64 version = pendingConfigVersion;
        if (hasVotedToCancelByPendingVersion[version][actor]) revert INH_AlreadyVotedToCancel();

        hasVotedToCancelByPendingVersion[version][actor] = true;
        uint256 newCount = cancelVotesByPendingVersion[version] + 1;
        cancelVotesByPendingVersion[version] = newCount;
        emit PendingConfigCancellationVoted(version, actor, newCount);

        uint256 threshold = _guardianThreshold();
        if (newCount >= threshold) {
            // Clear the pending state. Vote tally itself is left in storage
            // (version is monotonic so it can never be reused).
            for (uint256 i = 0; i < MAX_HEIRS; ++i) {
                delete pendingHeirGuardianByIndex[i];
                delete pendingHeirCommitmentByIndex[i];
            }
            pendingHeirCount = 0;
            pendingConfigHash = bytes32(0);
            pendingHeirConfigEffectiveAt = 0;
            // Note: we do NOT roll back pendingConfigVersion — a future proposal
            // will still bump it from inheritanceConfigVersion + 1, which may
            // equal `version` again. That's fine because the new proposal will
            // see hasVotedToCancelByPendingVersion[version][actor] == true for
            // guardians who voted on the cancelled one, which is the desired
            // behavior — they don't have to vote again on a brand-new proposal
            // because their cancel-vote was scoped to the prior content. To
            // address this, we explicitly bump pendingConfigVersion in the next
            // propose() call as a fresh-version-on-new-proposal property.
            //
            // Actually: pendingConfigVersion is recomputed from
            // inheritanceConfigVersion + 1 each time propose() runs, so it
            // doesn't accumulate. The vote-flag persistence across cancellations
            // of the SAME logical version number is the design intent.

            emit PendingConfigCancelledByGuardians(version, newCount, threshold);
            emit InheritanceConfigCancelled();
        }
    }

    /// @notice initiateInheritanceClaim
    /// @param actor actor
    /// @param reasonHash reasonHash
    function initiateInheritanceClaim(address actor, bytes32 reasonHash) external onlyVault {
        _rolloverToClaimWindowIfNeeded();
        if (_isVaultPaused()) revert INH_VaultPaused();
        if (inheritanceStateValue != STATE_NORMAL) {
            revert INH_WrongState(inheritanceStateValue, STATE_NORMAL);
        }
        if (heirCount == 0) revert INH_NoHeirsConfigured();
        if (_pendingRecoveryRotation()) revert INH_RecoveryInProgress();
        if (!_isGuardian(actor)) revert INH_NotGuardian();
        // R-3 — per Decision 12, the DAO guardian can VETO but cannot INITIATE.
        // If a daoGuardian is registered and matches the caller, reject. If
        // no daoGuardian is set (zero address), this check is a no-op.
        if (daoGuardian != address(0) && actor == daoGuardian) revert INH_DAOCannotInitiate();

        ++inheritanceClaimNonce;

        inheritanceStateValue = STATE_VETO_PERIOD;
        inheritanceStateWindowEnd = uint64(block.timestamp + INHERITANCE_VETO_PERIOD);
        inheritanceInitiator = actor;
        inheritanceReasonHash = reasonHash;
        claimConfigVersion = inheritanceConfigVersion;
        snapshotOwnerAdmin = _admin();
        snapshotProofOfLifeWallet = proofOfLifeWallet;
        snapshotVetoThreshold = _guardianThreshold();

        vetoCount = 0;
        totalRevealedBasisPoints = 0;
        distributionFinalized = false;
        payoutBalance = 0;
        totalPaidOut = 0;
        withdrawnRevealerCount = 0;

        emit InheritanceClaimInitiated(actor, reasonHash, inheritanceStateWindowEnd, claimConfigVersion);
    }

    /// @notice vetoInheritanceClaim
    /// @param actor actor
    function vetoInheritanceClaim(address actor) external onlyVault {
        _rolloverToClaimWindowIfNeeded();
        if (inheritanceStateValue != STATE_VETO_PERIOD) {
            revert INH_WrongState(inheritanceStateValue, STATE_VETO_PERIOD);
        }
        if (!_isGuardian(actor)) revert INH_NotGuardian();

        uint256 nonce = inheritanceClaimNonce;
        if (guardianVetoedAtNonce[actor] == nonce) revert INH_HashAlreadyClaimed();

        guardianVetoedAtNonce[actor] = nonce;
        ++vetoCount;
        emit InheritanceClaimVetoed(actor, vetoCount);

        if (vetoCount >= snapshotVetoThreshold) {
            _cancelActiveInheritanceClaim();
        }
    }

    /// @notice ownerOverrideClaim
    /// @param actor actor
    function ownerOverrideClaim(address actor) external onlyVault {
        _rolloverToClaimWindowIfNeeded();
        if (inheritanceStateValue != STATE_VETO_PERIOD) {
            revert INH_OwnerOverrideExpired();
        }
        if (actor != snapshotOwnerAdmin && actor != snapshotProofOfLifeWallet) {
            revert INH_NotProofOfLifeWallet();
        }

        emit InheritanceClaimOverridden(actor);
        _cancelActiveInheritanceClaim();
    }

    /// @notice claimHeirShare
    /// @param actor actor
    /// @param heirSecret heirSecret
    /// @param basisPoints basisPoints
    function claimHeirShare(address actor, bytes32 heirSecret, uint256 basisPoints) external onlyVault {
        _rolloverToClaimWindowIfNeeded();
        if (inheritanceStateValue != STATE_CLAIM_WINDOW) {
            revert INH_WrongState(inheritanceStateValue, STATE_CLAIM_WINDOW);
        }
        if (distributionFinalized) revert INH_HashAlreadyClaimed();

        uint256 nonce = inheritanceClaimNonce;
        if (revealedByNonce[nonce][actor]) revert INH_AlreadyRevealed();

        bytes32 expected = keccak256(
            abi.encode(
                INHERITANCE_COMMITMENT_DOMAIN,
                block.chainid,
                vault,
                claimConfigVersion,
                actor,
                basisPoints,
                heirSecret
            )
        );
        if (expected == bytes32(0) || heirCommitmentByGuardian[actor] != expected) {
            revert INH_InvalidSecret();
        }
        if (claimedHashes[expected]) revert INH_HashAlreadyClaimed();

        bool isConfiguredHeir = false;
        for (uint256 i = 0; i < heirCount; ++i) {
            if (heirGuardianByIndex[i] == actor) {
                isConfiguredHeir = true;
                break;
            }
        }
        if (!isConfiguredHeir) revert INH_NotGuardian();

        revealedByNonce[nonce][actor] = true;
        claimedHashes[expected] = true;
        revealedBasisPointsByNonce[nonce][actor] = basisPoints;
        revealersByNonce[nonce].push(actor);
        totalRevealedBasisPoints += basisPoints;

        emit HeirClaimRevealed(actor, basisPoints);
    }

    /// @notice finalizeInheritanceDistribution
    function finalizeInheritanceDistribution() external onlyVault {
        _rolloverToClaimWindowIfNeeded();
        if (inheritanceStateValue != STATE_CLAIM_WINDOW) {
            revert INH_WrongState(inheritanceStateValue, STATE_CLAIM_WINDOW);
        }
        if (distributionFinalized) revert INH_HashAlreadyClaimed();

        uint256 nonce = inheritanceClaimNonce;
        uint256 revealedCount = revealersByNonce[nonce].length;
        bool claimWindowElapsed = block.timestamp >= inheritanceStateWindowEnd;
        if (!claimWindowElapsed && revealedCount != heirCount) {
            revert INH_CooldownActive(inheritanceStateWindowEnd - uint64(block.timestamp));
        }

        if (payoutBalance == 0) {
            payoutBalance = IERC20(_vfideToken()).balanceOf(vault);
            emit PendingObligationsSettled(0, 0, 0);
        }

        if (revealedCount == 0) {
            distributionFinalized = true;
            _enterMemorialState();
            return;
        }

        uint256 totalRevealed = totalRevealedBasisPoints;
        uint256 runningPaid = 0;
        uint256 runningBps = 0;

        for (uint256 i = 0; i < revealedCount; ++i) {
            address heir = revealersByNonce[nonce][i];
            uint256 revealedBps = revealedBasisPointsByNonce[nonce][heir];

            uint256 payout;
            uint256 finalBps;
            if (i == revealedCount - 1) {
                payout = payoutBalance - runningPaid;
                finalBps = TOTAL_BASIS_POINTS - runningBps;
            } else {
                payout = (payoutBalance * revealedBps) / totalRevealed;
                finalBps = (TOTAL_BASIS_POINTS * revealedBps) / totalRevealed;
                runningPaid += payout;
                runningBps += finalBps;
            }

            finalPayoutAmountByNonce[nonce][heir] = payout;
            finalBasisPointsByNonce[nonce][heir] = finalBps;
        }

        distributionFinalized = true;
        uint256 forfeited = totalRevealed >= TOTAL_BASIS_POINTS ? 0 : TOTAL_BASIS_POINTS - totalRevealed;
        emit InheritanceDistributionFinalized(totalRevealed, forfeited);
    }

    /// @notice consumeHeirPayout
    /// @param actor actor
    /// @return amount amount
    /// @return finalBasisPoints finalBasisPoints
    /// @return completed completed
    function consumeHeirPayout(address actor)
        external
        onlyVault
        returns (uint256 amount, uint256 finalBasisPoints, bool completed)
    {
        _rolloverToClaimWindowIfNeeded();
        if (!distributionFinalized) revert INH_DistributionNotFinalized();
        if (inheritanceStateValue != STATE_CLAIM_WINDOW && inheritanceStateValue != STATE_MEMORIAL) {
            revert INH_WrongState(inheritanceStateValue, STATE_CLAIM_WINDOW);
        }

        uint256 nonce = inheritanceClaimNonce;
        if (withdrawnByNonce[nonce][actor]) revert INH_HashAlreadyClaimed();

        amount = finalPayoutAmountByNonce[nonce][actor];
        if (amount == 0) revert INH_InvalidCommitment();

        withdrawnByNonce[nonce][actor] = true;
        ++withdrawnRevealerCount;
        totalPaidOut += amount;
        finalBasisPoints = finalBasisPointsByNonce[nonce][actor];

        if (withdrawnRevealerCount == revealersByNonce[nonce].length) {
            emit InheritanceFullySettled(totalPaidOut);
            _enterMemorialState();
            completed = true;
        }
    }

    /// @notice cleanupMemorialVault
    function cleanupMemorialVault() external onlyVault {
        if (inheritanceStateValue != STATE_MEMORIAL) {
            revert INH_WrongState(inheritanceStateValue, STATE_MEMORIAL);
        }
        if (block.timestamp < inheritanceStateWindowEnd) {
            revert INH_MemorialNotEnded(inheritanceStateWindowEnd - uint64(block.timestamp));
        }

        inheritanceStateValue = STATE_CLOSED;
        inheritanceStateWindowEnd = 0;
        emit MemorialVaultClosed();
    }

    /// @notice inheritanceState
    /// @return state state
    /// @return windowEnd windowEnd
    function inheritanceState() external view returns (uint8 state, uint64 windowEnd) {
        state = inheritanceStateValue;
        windowEnd = inheritanceStateWindowEnd;
    }

    /// @notice hasVetoedClaim
    /// @param guardian guardian
    /// @return _bool _bool
    function hasVetoedClaim(address guardian) external view returns (bool) {
        return guardianVetoedAtNonce[guardian] == inheritanceClaimNonce;
    }

    /// @notice hasRevealedClaim
    /// @param claimant claimant
    /// @return _bool _bool
    function hasRevealedClaim(address claimant) external view returns (bool) {
        return revealedByNonce[inheritanceClaimNonce][claimant];
    }

    /// @notice isClaimedHash
    /// @param heirHash heirHash
    /// @return _bool _bool
    function isClaimedHash(bytes32 heirHash) external view returns (bool) {
        return claimedHashes[heirHash];
    }

    /// @notice Snapshot view of one heir's claim status during the current claim window.
    /// @dev All four values are scoped to `inheritanceClaimNonce` (the active claim instance).
    ///      Lets the claim UI render reveal/withdraw progress without needing N separate reads.
    /// @param heir The heir's guardian address.
    /// @return revealedBps Basis points the heir revealed during the claim window (0 if not revealed).
    /// @return finalBps Final basis points after redistribution (0 until finalizeInheritanceDistribution).
    /// @return payoutAmount Final payout amount in vfideToken units (0 until finalized).
    /// @return readyToWithdraw True iff distribution is finalized and the heir hasn't withdrawn yet.
    function getHeirClaimStatus(address heir) external view returns (
        uint256 revealedBps,
        uint256 finalBps,
        uint256 payoutAmount,
        bool readyToWithdraw
    ) {
        uint256 nonce = inheritanceClaimNonce;
        revealedBps = revealedBasisPointsByNonce[nonce][heir];
        finalBps = finalBasisPointsByNonce[nonce][heir];
        payoutAmount = finalPayoutAmountByNonce[nonce][heir];
        readyToWithdraw = distributionFinalized && payoutAmount > 0;
    }

    /// @notice Returns all addresses that revealed during the current claim window.
    /// @dev Used by the memorial page to display "who claimed" once inheritance settles.
    ///      Bounded by MAX_HEIRS so the array is always small.
    function getRevealersOfActiveClaim() external view returns (address[] memory) {
        return revealersByNonce[inheritanceClaimNonce];
    }

    /// @notice _enterMemorialState
    function _enterMemorialState() internal {
        inheritanceStateValue = STATE_MEMORIAL;
        inheritanceStateWindowEnd = uint64(block.timestamp + INHERITANCE_MEMORIAL_PERIOD);
        emit VaultEnteredMemorial(inheritanceStateWindowEnd);
    }

    /// @notice _cancelActiveInheritanceClaim
    function _cancelActiveInheritanceClaim() internal {
        inheritanceStateValue = STATE_NORMAL;
        inheritanceStateWindowEnd = 0;
        inheritanceInitiator = address(0);
        inheritanceReasonHash = bytes32(0);
        claimConfigVersion = 0;
        snapshotOwnerAdmin = address(0);
        snapshotProofOfLifeWallet = address(0);
        snapshotVetoThreshold = 0;
        vetoCount = 0;
        totalRevealedBasisPoints = 0;
        distributionFinalized = false;
        payoutBalance = 0;
        totalPaidOut = 0;
        withdrawnRevealerCount = 0;
    }

    /// @notice _rolloverToClaimWindowIfNeeded
    function _rolloverToClaimWindowIfNeeded() internal {
        if (inheritanceStateValue != STATE_VETO_PERIOD) return;
        if (block.timestamp < inheritanceStateWindowEnd) return;
        inheritanceStateValue = STATE_CLAIM_WINDOW;
        inheritanceStateWindowEnd = uint64(block.timestamp + INHERITANCE_CLAIM_WINDOW);
        emit InheritanceClaimEnteredClaimWindow(inheritanceStateWindowEnd);
    }

    /// @notice _requireAdmin
    /// @param actor actor
    function _requireAdmin(address actor) internal view {
        if (actor != _admin()) revert INH_NotOwner();
    }

    /// @notice _admin
    /// @return _address _address
    function _admin() internal view returns (address) {
        return ICardBoundVaultInheritanceAccess(vault).admin();
    }

    /// @notice _isGuardian
    /// @param guardian guardian
    /// @return _bool _bool
    function _isGuardian(address guardian) internal view returns (bool) {
        return ICardBoundVaultInheritanceAccess(vault).isGuardian(guardian);
    }

    /// @notice _guardianThreshold
    /// @return _uint8 _uint8
    function _guardianThreshold() internal view returns (uint8) {
        return ICardBoundVaultInheritanceAccess(vault).guardianThreshold();
    }

    /// @notice _pendingRecoveryRotation
    /// @return _bool _bool
    function _pendingRecoveryRotation() internal view returns (bool) {
        return ICardBoundVaultInheritanceAccess(vault).pendingRecoveryRotation();
    }

    /// @notice _isVaultPaused
    /// @return _bool _bool
    function _isVaultPaused() internal view returns (bool) {
        return ICardBoundVaultInheritanceAccess(vault).paused();
    }

    /// @notice _vfideToken
    /// @return _address _address
    function _vfideToken() internal view returns (address) {
        return ICardBoundVaultInheritanceAccess(vault).vfideToken();
    }
}
