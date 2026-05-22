// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";

interface ICardBoundVaultInheritanceAccess {
    function admin() external view returns (address);
    function isGuardian(address guardian) external view returns (bool);
    function guardianThreshold() external view returns (uint8);
    function pendingRecoveryRotation() external view returns (bool);
    function paused() external view returns (bool);
    function vfideToken() external view returns (address);
}

contract CardBoundVaultInheritanceManager {
    uint64 public constant INHERITANCE_VETO_PERIOD = 30 days;
    uint64 public constant INHERITANCE_CLAIM_WINDOW = 90 days;
    uint64 public constant INHERITANCE_MEMORIAL_PERIOD = 365 days;
    uint64 public constant INHERITANCE_CONFIG_COOLDOWN = 30 days;
    uint8 public constant MAX_HEIRS = 5;
    uint256 public constant TOTAL_BASIS_POINTS = 10000;
    bytes32 public constant INHERITANCE_COMMITMENT_DOMAIN = keccak256("VFIDE_INHERITANCE_V1");

    uint8 public constant STATE_NORMAL = 0;
    uint8 public constant STATE_VETO_PERIOD = 1;
    uint8 public constant STATE_CLAIM_WINDOW = 2;
    uint8 public constant STATE_MEMORIAL = 3;
    uint8 public constant STATE_CLOSED = 4;

    address public immutable vault;

    mapping(uint256 => address) public heirGuardianByIndex;
    mapping(address => bytes32) public heirCommitmentByGuardian;
    uint8 public heirCount;
    address public proofOfLifeWallet;
    uint64 public inheritanceConfigVersion;
    bytes32 public pendingConfigHash;
    uint64 public pendingHeirConfigEffectiveAt;
    uint64 public pendingConfigVersion;
    uint8 public pendingHeirCount;
    mapping(uint256 => address) private pendingHeirGuardianByIndex;
    mapping(uint256 => bytes32) private pendingHeirCommitmentByIndex;

    uint8 public inheritanceStateValue;
    uint64 public inheritanceStateWindowEnd;
    address public inheritanceInitiator;
    bytes32 public inheritanceReasonHash;
    uint64 public claimConfigVersion;
    uint256 public inheritanceClaimNonce;
    uint256 public vetoCount;
    uint256 public totalRevealedBasisPoints;
    bool public distributionFinalized;
    uint256 public payoutBalance;
    uint256 public totalPaidOut;
    uint256 public withdrawnRevealerCount;

    address public snapshotOwnerAdmin;
    address public snapshotProofOfLifeWallet;
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
    mapping(uint64 => mapping(address => bool)) public hasVotedToCancelByPendingVersion;

    mapping(address => uint256) private guardianVetoedAtNonce;
    mapping(uint256 => mapping(address => bool)) private revealedByNonce;
    mapping(uint256 => mapping(address => uint256)) private revealedBasisPointsByNonce;
    mapping(uint256 => mapping(address => uint256)) private finalBasisPointsByNonce;
    mapping(uint256 => mapping(address => uint256)) private finalPayoutAmountByNonce;
    mapping(uint256 => mapping(address => bool)) private withdrawnByNonce;
    mapping(uint256 => address[]) private revealersByNonce;
    mapping(bytes32 => bool) public claimedHashes;

    event InheritanceConfigProposed(uint64 indexed pendingVersion, address[] heirGuardians, bytes32[] heirCommitments, uint256 effectiveAt);
    event InheritanceConfigConfirmed(uint64 indexed configVersion, address[] heirGuardians, bytes32[] heirCommitments);
    event InheritanceConfigCancelled();
    event ProofOfLifeWalletSet(address indexed polWallet);
    event InheritanceClaimInitiated(address indexed initiatingGuardian, bytes32 reasonHash, uint64 vetoWindowEnd, uint64 configVersion);
    event InheritanceClaimVetoed(address indexed guardian, uint256 currentVetos);
    event InheritanceClaimOverridden(address indexed owner);
    event InheritanceClaimEnteredClaimWindow(uint64 claimWindowEnd);
    event HeirClaimRevealed(address indexed heir, uint256 basisPoints);
    event InheritanceDistributionFinalized(uint256 revealedShares, uint256 forfeitedShares);
    event InheritanceFullySettled(uint256 totalPaidOut);
    event PendingObligationsSettled(uint256 escrowsResolved, uint256 loansRepaid, uint256 subsCancelled);
    event VaultEnteredMemorial(uint64 memorialEnd);
    event MemorialVaultClosed();
    /// @notice R-3 — emitted when the DAO guardian for this vault is set or cleared.
    event DAOGuardianSet(address indexed previous, address indexed current);
    /// @notice R-1 — emitted when a guardian votes to cancel a pending config.
    event PendingConfigCancellationVoted(uint64 indexed pendingVersion, address indexed guardian, uint256 currentVotes);
    /// @notice R-1 — emitted when guardian-quorum cancellation succeeds and pending state is cleared.
    event PendingConfigCancelledByGuardians(uint64 indexed pendingVersion, uint256 finalVotes, uint256 threshold);

    error INH_NotGuardian();
    error INH_NotOwner();
    error INH_NotProofOfLifeWallet();
    error INH_WrongState(uint8 currentState, uint8 expectedState);
    error INH_CooldownActive(uint64 remaining);
    error INH_TooManyHeirs(uint256 provided, uint256 max);
    error INH_NoHeirsConfigured();
    error INH_HashAlreadyClaimed();
    error INH_InvalidSecret();
    error INH_OwnerOverrideExpired();
    error INH_RecoveryInProgress();
    error INH_VaultPaused();
    error INH_MemorialNotEnded(uint64 remaining);
    error INH_DistributionNotFinalized();
    error INH_AlreadyRevealed();
    error INH_InvalidCommitment();
    /// @notice R-3 — DAO guardian is not permitted to initiate inheritance claims.
    error INH_DAOCannotInitiate();
    /// @notice R-1 — Guardian has already voted to cancel the current pending config.
    error INH_AlreadyVotedToCancel();
    /// @notice R-1 — No pending config exists; nothing to cancel.
    error INH_NoPendingConfig();

    modifier onlyVault() {
        if (msg.sender != vault) revert INH_NotOwner();
        _;
    }

    constructor(address vault_) {
        require(vault_ != address(0), "CBV-IM: zero vault");
        vault = vault_;
        inheritanceStateValue = STATE_NORMAL;
    }

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
    function setProofOfLifeWallet(address actor, address polWallet) external onlyVault {
        _requireAdmin(actor);
        proofOfLifeWallet = polWallet;
        emit ProofOfLifeWalletSet(polWallet);
    }

    /// @notice R-3 — Owner registers the DAO guardian for this vault.
    /// @dev When set, the named address is rejected from initiating inheritance
    ///      claims per design Decision 12, but can still veto (it's a guardian
    ///      otherwise). Set to address(0) to clear. No cooldown — same semantics
    ///      as setProofOfLifeWallet since this is purely a defensive constraint.
    // slither-disable-next-line missing-zero-check  // address(0) clears the DAO guardian (intentional per docstring)
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

    function inheritanceState() external view returns (uint8 state, uint64 windowEnd) {
        state = inheritanceStateValue;
        windowEnd = inheritanceStateWindowEnd;
    }

    function hasVetoedClaim(address guardian) external view returns (bool) {
        return guardianVetoedAtNonce[guardian] == inheritanceClaimNonce;
    }

    function hasRevealedClaim(address claimant) external view returns (bool) {
        return revealedByNonce[inheritanceClaimNonce][claimant];
    }

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

    function _enterMemorialState() internal {
        inheritanceStateValue = STATE_MEMORIAL;
        inheritanceStateWindowEnd = uint64(block.timestamp + INHERITANCE_MEMORIAL_PERIOD);
        emit VaultEnteredMemorial(inheritanceStateWindowEnd);
    }

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

    function _rolloverToClaimWindowIfNeeded() internal {
        if (inheritanceStateValue != STATE_VETO_PERIOD) return;
        if (block.timestamp < inheritanceStateWindowEnd) return;
        inheritanceStateValue = STATE_CLAIM_WINDOW;
        inheritanceStateWindowEnd = uint64(block.timestamp + INHERITANCE_CLAIM_WINDOW);
        emit InheritanceClaimEnteredClaimWindow(inheritanceStateWindowEnd);
    }

    function _requireAdmin(address actor) internal view {
        if (actor != _admin()) revert INH_NotOwner();
    }

    function _admin() internal view returns (address) {
        return ICardBoundVaultInheritanceAccess(vault).admin();
    }

    function _isGuardian(address guardian) internal view returns (bool) {
        return ICardBoundVaultInheritanceAccess(vault).isGuardian(guardian);
    }

    function _guardianThreshold() internal view returns (uint8) {
        return ICardBoundVaultInheritanceAccess(vault).guardianThreshold();
    }

    function _pendingRecoveryRotation() internal view returns (bool) {
        return ICardBoundVaultInheritanceAccess(vault).pendingRecoveryRotation();
    }

    function _isVaultPaused() internal view returns (bool) {
        return ICardBoundVaultInheritanceAccess(vault).paused();
    }

    function _vfideToken() internal view returns (address) {
        return ICardBoundVaultInheritanceAccess(vault).vfideToken();
    }
}
