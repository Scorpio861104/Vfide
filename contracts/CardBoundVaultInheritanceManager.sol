// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

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

    error INH_NotGuardian();
    error INH_NotOwner();
    error INH_NotProofOfLifeWallet();
    error INH_WrongState(uint8 currentState, uint8 expectedState);
    error INH_CooldownActive(uint64 remaining);
    error INH_BasisPointsMustSumTo10000(uint256 actualSum);
    error INH_TooManyHeirs(uint256 provided, uint256 max);
    error INH_NoHeirsConfigured();
    error INH_HashAlreadyClaimed();
    error INH_InvalidSecret();
    error INH_InsufficientGuardianApprovals(uint256 current, uint256 needed);
    error INH_OwnerOverrideExpired();
    error INH_RecoveryInProgress();
    error INH_VaultPaused();
    error INH_PendingObligations();
    error INH_MemorialNotEnded(uint64 remaining);
    error INH_GuardianSnapshotOnly();
    error INH_DistributionNotFinalized();
    error INH_AlreadyRevealed();
    error INH_InvalidCommitment();

    modifier onlyVault() {
        if (msg.sender != vault) revert INH_NotOwner();
        _;
    }

    constructor(address vault_) {
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
        for (uint256 i = 0; i < MAX_HEIRS; i++) {
            delete pendingHeirGuardianByIndex[i];
            delete pendingHeirCommitmentByIndex[i];
        }

        for (uint256 i = 0; i < count; i++) {
            address guardian = heirGuardians[i];
            if (guardian == address(0) || !_isGuardian(guardian)) revert INH_NotGuardian();
            for (uint256 j = 0; j < i; j++) {
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

        for (uint256 i = 0; i < MAX_HEIRS; i++) {
            address oldGuardian = heirGuardianByIndex[i];
            if (oldGuardian != address(0)) {
                delete heirCommitmentByGuardian[oldGuardian];
                delete heirGuardianByIndex[i];
            }
        }

        for (uint256 i = 0; i < count; i++) {
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
        for (uint256 i = 0; i < MAX_HEIRS; i++) {
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
        for (uint256 i = 0; i < MAX_HEIRS; i++) {
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
        for (uint256 i = 0; i < MAX_HEIRS; i++) {
            delete pendingHeirGuardianByIndex[i];
            delete pendingHeirCommitmentByIndex[i];
        }
        pendingHeirCount = 0;
        pendingConfigVersion = inheritanceConfigVersion + 1;
        pendingHeirConfigEffectiveAt = uint64(block.timestamp + INHERITANCE_CONFIG_COOLDOWN);
        pendingConfigHash = keccak256(abi.encode(pendingConfigVersion, noHeirs, noCommitments));
        emit InheritanceConfigProposed(pendingConfigVersion, noHeirs, noCommitments, pendingHeirConfigEffectiveAt);
    }

    function setProofOfLifeWallet(address actor, address polWallet) external onlyVault {
        _requireAdmin(actor);
        proofOfLifeWallet = polWallet;
        emit ProofOfLifeWalletSet(polWallet);
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

        inheritanceClaimNonce += 1;
        uint256 nonce = inheritanceClaimNonce;

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
        vetoCount += 1;
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
        for (uint256 i = 0; i < heirCount; i++) {
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

        for (uint256 i = 0; i < revealedCount; i++) {
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
        withdrawnRevealerCount += 1;
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
