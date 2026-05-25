// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";
import "./CardBoundVaultPaymentQueueManager.sol";
import "./CardBoundVaultWithdrawalQueueManager.sol";
import "./CardBoundVaultInheritanceManager.sol";
import "./CardBoundVaultAdminManager.sol";

/// @notice IVaultHubGuardianSetup
/// @title IVaultHubGuardianSetup
/// @author Vfide
interface IVaultHubGuardianSetup {
    /// @notice guardianSetupComplete
    /// @param vault vault
    /// @return _bool _bool
    function guardianSetupComplete(address vault) external view returns (bool);
    /// @notice invalidateGuardianSetup
    /// @param vault vault
    function invalidateGuardianSetup(address vault) external;
}

/// @dev C-7 FIX: Minimal interface for checking if a peer vault can accept an incoming transfer.
/// @notice ICardBoundVaultView
/// @title ICardBoundVaultView
/// @author Vfide
interface ICardBoundVaultView {
    /// @notice canReceiveTransfer
    /// @param amount amount
    /// @return _bool _bool
    function canReceiveTransfer(uint256 amount) external view returns (bool);
}

/// @notice ISeerAutonomousVault
/// @title ISeerAutonomousVault
/// @author Vfide
interface ISeerAutonomousVault {
    /// @notice beforeAction
    /// @param subject subject
    /// @param action action
    /// @param amount amount
    /// @param counterparty counterparty
    /// @return _uint8 _uint8
    function beforeAction(address subject, uint8 action, uint256 amount, address counterparty) external returns (uint8);
}

/// @notice IAdminManager
/// @title IAdminManager
/// @author Vfide
interface IAdminManager {
    /// @notice proposeGuardianChange
    /// @param guardian guardian
    /// @param active active
    function proposeGuardianChange(address guardian, bool active) external;
    /// @notice applyGuardianChange
    /// @return guardian guardian
    /// @return active active
    function applyGuardianChange() external returns (address guardian, bool active);
    /// @notice cancelGuardianChange
    /// @return guardian guardian
    /// @return active active
    function cancelGuardianChange() external returns (address guardian, bool active);
    /// @notice proposeTrusteeChange
    /// @param guardian guardian
    /// @param trustee trustee
    function proposeTrusteeChange(address guardian, bool trustee) external;
    /// @notice applyTrusteeChange
    /// @return guardian guardian
    /// @return trustee trustee
    function applyTrusteeChange() external returns (address guardian, bool trustee);
    /// @notice cancelTrusteeChange
    /// @return guardian guardian
    /// @return trustee trustee
    function cancelTrusteeChange() external returns (address guardian, bool trustee);
    /// @notice proposeSpendLimits
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyTransferLimit dailyTransferLimit
    function proposeSpendLimits(uint256 maxPerTransfer, uint256 dailyTransferLimit) external;
    /// @notice applySpendLimits
    /// @return maxPerTransfer maxPerTransfer
    /// @return dailyTransferLimit dailyTransferLimit
    function applySpendLimits() external returns (uint256 maxPerTransfer, uint256 dailyTransferLimit);
    /// @notice cancelSpendLimits
    function cancelSpendLimits() external;
    /// @notice proposeLargeTransferThreshold
    /// @param threshold threshold
    function proposeLargeTransferThreshold(uint256 threshold) external;
    /// @notice applyLargeTransferThreshold
    /// @return threshold threshold
    function applyLargeTransferThreshold() external returns (uint256 threshold);
    /// @notice cancelLargeTransferThreshold
    function cancelLargeTransferThreshold() external;
    /// @notice proposeNativeRescue
    /// @param to to
    /// @param amount amount
    function proposeNativeRescue(address payable to, uint256 amount) external;
    /// @notice applyNativeRescue
    /// @return to to
    /// @return amount amount
    function applyNativeRescue() external returns (address payable to, uint256 amount);
    /// @notice cancelNativeRescue
    /// @return to to
    /// @return amount amount
    function cancelNativeRescue() external returns (address payable to, uint256 amount);
    /// @notice proposeERC20Rescue
    /// @param token token
    /// @param to to
    /// @param amount amount
    function proposeERC20Rescue(address token, address to, uint256 amount) external;
    /// @notice applyERC20Rescue
    /// @return token token
    /// @return to to
    /// @return amount amount
    function applyERC20Rescue() external returns (address token, address to, uint256 amount);
    /// @notice cancelERC20Rescue
    /// @return token token
    /// @return to to
    /// @return amount amount
    function cancelERC20Rescue() external returns (address token, address to, uint256 amount);
    /// @notice proposeTokenApproval
    /// @param token token
    /// @param spender spender
    /// @param amount amount
    function proposeTokenApproval(address token, address spender, uint256 amount) external;
    /// @notice applyTokenApproval
    /// @return token token
    /// @return spender spender
    /// @return amount amount
    function applyTokenApproval() external returns (address token, address spender, uint256 amount);
    /// @notice cancelTokenApproval
    /// @return token token
    /// @return spender spender
    /// @return amount amount
    function cancelTokenApproval() external returns (address token, address spender, uint256 amount);
    /// @notice clearOnRecovery
    function clearOnRecovery() external;
    /// @notice pendingGuardianChange
    /// @return guardian guardian
    /// @return active active
    /// @return effectiveAt effectiveAt
    function pendingGuardianChange() external view returns (address guardian, bool active, uint64 effectiveAt);
    /// @notice pendingSpendLimitChange
    /// @return value1 value1
    /// @return value2 value2
    /// @return executeAfter executeAfter
    function pendingSpendLimitChange() external view returns (uint256 value1, uint256 value2, uint64 executeAfter);
    /// @notice pendingLargeTransferThresholdChange
    /// @return value value
    /// @return executeAfter executeAfter
    function pendingLargeTransferThresholdChange() external view returns (uint256 value, uint64 executeAfter);
    /// @notice pendingNativeRescue
    /// @return addr addr
    /// @return amount amount
    /// @return executeAfter executeAfter
    function pendingNativeRescue() external view returns (address addr, uint256 amount, uint64 executeAfter);
    /// @notice pendingERC20Rescue
    /// @return token token
    /// @return to to
    /// @return amount amount
    /// @return executeAfter executeAfter
    function pendingERC20Rescue() external view returns (address token, address to, uint256 amount, uint64 executeAfter);
    /// @notice pendingTokenApproval
    /// @return token token
    /// @return spender spender
    /// @return amount amount
    /// @return executeAfter executeAfter
    function pendingTokenApproval() external view returns (address token, address spender, uint256 amount, uint64 executeAfter);
}

/// @notice ICardBoundVaultInheritanceManager
/// @title ICardBoundVaultInheritanceManager
/// @author Vfide
interface ICardBoundVaultInheritanceManager {
    /// @notice inheritanceState
    /// @return state state
    /// @return windowEnd windowEnd
    function inheritanceState() external view returns (uint8 state, uint64 windowEnd);
    /// @notice proposeInheritanceConfig
    /// @param actor actor
    /// @param heirGuardians heirGuardians
    /// @param heirCommitments heirCommitments
    function proposeInheritanceConfig(address actor, address[] calldata heirGuardians, bytes32[] calldata heirCommitments) external;
    /// @notice confirmInheritanceConfig
    /// @param actor actor
    function confirmInheritanceConfig(address actor) external;
    /// @notice cancelInheritanceConfigChange
    /// @param actor actor
    function cancelInheritanceConfigChange(address actor) external;
    /// @notice clearAllHeirs
    /// @param actor actor
    function clearAllHeirs(address actor) external;
    /// @notice setProofOfLifeWallet
    /// @param actor actor
    /// @param polWallet polWallet
    function setProofOfLifeWallet(address actor, address polWallet) external;
    /// @notice initiateInheritanceClaim
    /// @param actor actor
    /// @param reasonHash reasonHash
    function initiateInheritanceClaim(address actor, bytes32 reasonHash) external;
    /// @notice vetoInheritanceClaim
    /// @param actor actor
    function vetoInheritanceClaim(address actor) external;
    /// @notice ownerOverrideClaim
    /// @param actor actor
    function ownerOverrideClaim(address actor) external;
    /// @notice claimHeirShare
    /// @param actor actor
    /// @param heirSecret heirSecret
    /// @param basisPoints basisPoints
    function claimHeirShare(address actor, bytes32 heirSecret, uint256 basisPoints) external;
    /// @notice finalizeInheritanceDistribution
    function finalizeInheritanceDistribution() external;
    /// @notice consumeHeirPayout
    /// @param actor actor
    /// @return amount amount
    /// @return finalBasisPoints finalBasisPoints
    /// @return completed completed
    function consumeHeirPayout(address actor) external returns (uint256 amount, uint256 finalBasisPoints, bool completed);
    /// @notice cleanupMemorialVault
    function cleanupMemorialVault() external;
    /// @notice heirCount
    /// @return _uint8 _uint8
    function heirCount() external view returns (uint8);
    /// @notice inheritanceConfigVersion
    /// @return _uint64 _uint64
    function inheritanceConfigVersion() external view returns (uint64);
    /// @notice hasVetoedClaim
    /// @param guardian guardian
    /// @return _bool _bool
    function hasVetoedClaim(address guardian) external view returns (bool);
    /// @notice hasRevealedClaim
    /// @param claimant claimant
    /// @return _bool _bool
    function hasRevealedClaim(address claimant) external view returns (bool);
    /// @notice isClaimedHash
    /// @param heirHash heirHash
    /// @return _bool _bool
    function isClaimedHash(bytes32 heirHash) external view returns (bool);
    // R-3 — DAO guardian initiation block
    /// @notice setDAOGuardian
    /// @param actor actor
    /// @param dao dao
    function setDAOGuardian(address actor, address dao) external;
    // R-1 — Guardian-quorum cancel of pending config
    /// @notice cancelInheritanceConfigChangeByGuardians
    /// @param actor actor
    function cancelInheritanceConfigChangeByGuardians(address actor) external;
}

/// @notice ICardBoundVaultPaymentQueueManager
/// @title ICardBoundVaultPaymentQueueManager
/// @author Vfide
interface ICardBoundVaultPaymentQueueManager {
    /// @notice largePaymentThreshold
    /// @return _uint256 _uint256
    function largePaymentThreshold() external view returns (uint256);
    /// @notice activeQueuedPayments
    /// @return _uint8 _uint8
    function activeQueuedPayments() external view returns (uint8);
    /// @notice pendingLargePaymentThresholdChange
    /// @return threshold threshold
    /// @return executeAfter executeAfter
    function pendingLargePaymentThresholdChange() external view returns (uint256 threshold, uint64 executeAfter);
    /// @notice queueLength
    /// @return _uint256 _uint256
    function queueLength() external view returns (uint256);
    /// @notice paymentQueue
    /// @param index index
    /// @return token token
    /// @return merchant merchant
    /// @return recipient recipient
    /// @return amount amount
    /// @return requestTime requestTime
    /// @return executeAfter executeAfter
    /// @return executed executed
    /// @return cancelled cancelled
    /// @return intentNonce intentNonce
    /// @return recipientCodeHashAtQueue recipientCodeHashAtQueue
    function paymentQueue(uint256 index)
        external
        view
        returns (
            address token,
            address merchant,
            address recipient,
            uint256 amount,
            uint64 requestTime,
            uint64 executeAfter,
            bool executed,
            bool cancelled,
            uint256 intentNonce,
            bytes32 recipientCodeHashAtQueue
        );
    /// @notice queuePayment
    /// @param token token
    /// @param merchant merchant
    /// @param recipient recipient
    /// @param amount amount
    /// @param intentNonce intentNonce
    /// @return queueIndex queueIndex
    /// @return executeAfter executeAfter
    function queuePayment(address token, address merchant, address recipient, uint256 amount, uint256 intentNonce)
        external
        returns (uint256 queueIndex, uint64 executeAfter);
    /// @notice executeQueuedPayment
    /// @param queueIndex queueIndex
    /// @param isAdmin isAdmin
    /// @return token token
    /// @return recipient recipient
    /// @return amount amount
    function executeQueuedPayment(uint256 queueIndex, bool isAdmin)
        external
        returns (address token, address recipient, uint256 amount);
    /// @notice cancelQueuedPayment
    /// @param queueIndex queueIndex
    /// @param authorized authorized
    /// @return requestTime requestTime
    /// @return amount amount
    function cancelQueuedPayment(uint256 queueIndex, bool authorized)
        external
        returns (uint64 requestTime, uint256 amount);
    /// @notice setLargePaymentThreshold
    /// @param threshold threshold
    /// @param delay delay
    /// @return executeAfter executeAfter
    function setLargePaymentThreshold(uint256 threshold, uint64 delay) external returns (uint64 executeAfter);
    /// @notice applyLargePaymentThreshold
    /// @return oldThreshold oldThreshold
    /// @return newThreshold newThreshold
    function applyLargePaymentThreshold() external returns (uint256 oldThreshold, uint256 newThreshold);
    /// @notice R77: cancel a pending large-payment threshold change (completes apply+cancel symmetry)
    /// @return threshold threshold
    /// @return executeAfter executeAfter
    function cancelLargePaymentThreshold() external returns (uint256 threshold, uint64 executeAfter);
    /// @notice clearOnRecovery
    function clearOnRecovery() external;
}

/// @notice ICardBoundVaultWithdrawalQueueManager
/// @title ICardBoundVaultWithdrawalQueueManager
/// @author Vfide
interface ICardBoundVaultWithdrawalQueueManager {
    /// @notice activeQueuedWithdrawals
    /// @return _uint8 _uint8
    function activeQueuedWithdrawals() external view returns (uint8);
    /// @notice queueLength
    /// @return _uint256 _uint256
    function queueLength() external view returns (uint256);
    /// @notice withdrawalQueue
    /// @param index index
    /// @return toVault toVault
    /// @return amount amount
    /// @return requestTime requestTime
    /// @return executeAfter executeAfter
    /// @return executed executed
    /// @return cancelled cancelled
    /// @return intentNonce intentNonce
    /// @return toVaultCodeHashAtQueue toVaultCodeHashAtQueue
    function withdrawalQueue(uint256 index)
        external
        view
        returns (
            address toVault,
            uint256 amount,
            uint64 requestTime,
            uint64 executeAfter,
            bool executed,
            bool cancelled,
            uint256 intentNonce,
            bytes32 toVaultCodeHashAtQueue
        );
    /// @notice getPendingQueuedWithdrawals
    /// @return indices indices
    /// @return amounts amounts
    /// @return executeAfters executeAfters
    function getPendingQueuedWithdrawals()
        external
        view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters);
    /// @notice getPendingQueuedWithdrawalsPaged
    /// @param start start
    /// @param limit limit
    /// @return indices indices
    /// @return amounts amounts
    /// @return executeAfters executeAfters
    function getPendingQueuedWithdrawalsPaged(uint256 start, uint256 limit)
        external
        view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters);
    /// @notice queueWithdrawal
    /// @param toVault toVault
    /// @param amount amount
    /// @param intentNonce intentNonce
    /// @return queueIndex queueIndex
    /// @return executeAfter executeAfter
    function queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce)
        external
        returns (uint256 queueIndex, uint64 executeAfter);
    /// @notice executeQueuedWithdrawal
    /// @param queueIndex queueIndex
    /// @param isAdmin isAdmin
    /// @return toVault toVault
    /// @return amount amount
    function executeQueuedWithdrawal(uint256 queueIndex, bool isAdmin)
        external
        returns (address toVault, uint256 amount);
    /// @notice cancelQueuedWithdrawal
    /// @param queueIndex queueIndex
    /// @param authorized authorized
    /// @return requestTime requestTime
    /// @return amount amount
    function cancelQueuedWithdrawal(uint256 queueIndex, bool authorized)
        external
        returns (uint64 requestTime, uint256 amount);
    /// @notice clearOnRecovery
    function clearOnRecovery() external;
}

/**
 * @title CardBoundVault
 * @notice Active vault implementation — wallet is authorization-only (ATM-card model).
 *         Deployed via VaultHub.ensureVault() using CREATE2.
 * @dev Funds are always moved vault-to-vault. Wallet never holds custody.
 *      M-21: This is the primary vault. UserVaultLegacy in VaultInfrastructure.sol
 *      is retained only for backward compatibility with existing deployments.
 * @author Vfide
 */
contract CardBoundVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice NAME
    string public constant NAME = "CardBoundVault";
    /// @notice VERSION
    string public constant VERSION = "1";

    /// @notice EIP712_DOMAIN_TYPEHASH
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    /// @notice TRANSFER_INTENT_TYPEHASH
    bytes32 private constant TRANSFER_INTENT_TYPEHASH = keccak256(
        "TransferIntent(address vault,address toVault,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)"
    );
    /// @notice PAY_INTENT_TYPEHASH
    bytes32 private constant PAY_INTENT_TYPEHASH = keccak256(
        "PayIntent(address vault,address merchantPortal,address token,address merchant,address recipient,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)"
    );
    // Phase 3d Turn 3 (2026-05-15): typed-data for atomic escrow funding via executeFundEscrow.
    // Distinct typehash from PAY_INTENT_TYPEHASH so a signature minted for one intent type cannot
    // be replayed against the other — domain separation between merchant payments and escrow funding.
    /// @notice ESCROW_FUND_INTENT_TYPEHASH
    bytes32 private constant ESCROW_FUND_INTENT_TYPEHASH = keccak256(
        "EscrowFundIntent(address vault,address escrowContract,uint256 escrowId,address token,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)"
    );

    // secp256k1n / 2
    /// @notice ECDSA_S_UPPER_BOUND
    uint256 private constant ECDSA_S_UPPER_BOUND =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    /// @notice MIN_ROTATION_DELAY
    uint64 public constant MIN_ROTATION_DELAY = 10 minutes;
    /// @notice MAX_ROTATION_DELAY
    uint64 public constant MAX_ROTATION_DELAY = 7 days;
    /// @notice SENSITIVE_ADMIN_DELAY
    uint64 public constant SENSITIVE_ADMIN_DELAY = 7 days;
    /// @notice MAX_GUARDIANS
    uint8 public constant MAX_GUARDIANS = 20;
    /// @notice Withdrawal-queue delay surfaced for the user-facing API.
    /// @dev Mirrors CardBoundVaultWithdrawalQueueManager.WITHDRAWAL_DELAY and
    /// CardBoundVaultPaymentQueueManager.WITHDRAWAL_DELAY. Kept in sync with both.
    uint64 public constant WITHDRAWAL_DELAY = 7 days;

    /// @notice hub
    address public immutable hub;
    /// @notice vfideToken
    address public immutable vfideToken;
    /// @notice ledger
    IProofLedger public immutable ledger;
    /// @notice _domainSeparator
    bytes32 private immutable _domainSeparator;
    /// @notice seerAutonomous
    ISeerAutonomousVault public seerAutonomous;

    // H4 FIX: Track when recovery leaves admin == activeWallet so the user can
    // restore cold/hot key separation after regaining control.
    /// @notice recoveryAdminUnseparated
    bool public recoveryAdminUnseparated;
    /// @notice recoveryUnseparatedSince
    uint64 public recoveryUnseparatedSince;

    /// @notice admin
    address public admin;
    /// @notice pendingAdmin
    address public pendingAdmin;
    /// @notice activeWallet
    address public activeWallet;

    /// @notice walletEpoch
    uint64 public walletEpoch;
    /// @notice nextNonce
    uint256 public nextNonce;

    /// @notice paused
    bool public paused;
    /// @notice pauseUntil
    uint64 public pauseUntil;
    /// @notice MAX_PAUSE_WINDOW
    uint64 public constant MAX_PAUSE_WINDOW = 7 days;
    /// @notice pauseNonce
    uint256 public pauseNonce;
    /// @notice pauseApprovalByGuardian
    mapping(address => mapping(uint256 => bool)) public pauseApprovalByGuardian;
    /// @notice pauseApprovalCount
    mapping(uint256 => uint8) public pauseApprovalCount;

    /// @notice isGuardian
    mapping(address => bool) public isGuardian;
    /// @notice guardianAddedAt
    mapping(address => uint64) public guardianAddedAt;
    /// @notice guardianCount
    uint8 public guardianCount;
    /// @notice guardianThreshold
    uint8 public guardianThreshold;

    /// @notice GUARDIAN_MATURITY_PERIOD
    uint64 public constant GUARDIAN_MATURITY_PERIOD = 7 days;

    // ─────────────────────────────────────────────────────────────────
    // GUARDIAN ROLE TIERS (R-8 — recovery initiation power)
    // ─────────────────────────────────────────────────────────────────
    //
    // The vault separates two distinct powers a guardian can hold:
    //
    //   APPROVAL  (every guardian) — vote yes/no on a recovery initiated
    //              by someone else. Cannot start recoveries themselves.
    //              Quorum of approvals is needed to advance a claim.
    //
    //   TRUSTEE   (opt-in subset)  — same as approval, PLUS the power to
    //              initiate a recovery on the user's behalf when the user
    //              has lost their device and cannot start one themselves.
    //
    // SAFETY RATIONALE
    //   Trustee status is the most dangerous power on the vault: a rogue
    //   trustee can begin a recovery flow that drains the vault to an
    //   attacker-controlled address if the owner fails to veto within the
    //   challenge window. We therefore require this power to be EXPLICITLY
    //   granted per-guardian rather than inferred from guardian status.
    //   By default every guardian is approval-only.
    //
    //   Role changes pass through the same propose/timelock/apply pipeline
    //   as guardian add/remove (see AdminManager). A compromised owner key
    //   cannot promote an attacker to trustee instantly; the change must
    //   sit in the timelock window during which other guardians or the
    //   owner-from-another-device can cancel.
    /// @notice isTrustee
    mapping(address => bool) public isTrustee;
    /// @notice trusteeCount
    uint8 public trusteeCount;
    /// @notice TrusteeRoleSet
    /// @param guardian guardian
    /// @param isTrustee isTrustee
    event TrusteeRoleSet(address indexed guardian, bool isTrustee);

    // ─────────────────────────────────────────────────────────────────
    // CONFIGURABLE RECOVERY CHALLENGE WINDOW (R-8)
    // ─────────────────────────────────────────────────────────────────
    //
    // The challenge window is the time after a guardian-initiated recovery
    // begins during which the original owner can veto the claim by signing
    // a challengeClaim() transaction from their existing wallet.
    //
    // SAFETY RATIONALE
    //   Longer windows protect users who are unreachable (travel, illness,
    //   religious observance, family emergency). Shorter windows let real
    //   lost-device recovery complete faster. The user picks where on this
    //   spectrum they want to be — the vault honors their preference at
    //   claim-initiation time, snapshotted into the claim so subsequent
    //   preference changes cannot retroactively shrink an active window.
    //
    //   HARD MINIMUM (3 days) is enforced in the setter below regardless
    //   of the user's preference — below this, the protection is illusory
    //   for any user who travels or works full-time. The frontend layers
    //   warnings for choices below the recommended 7 days but the contract
    //   refuses anything under 3.
    //
    //   HARD MAXIMUM (30 days) is enforced to prevent the user from
    //   configuring themselves into a state where genuine recovery is
    //   slower than the typical CLAIM_EXPIRY in VaultRecoveryClaim. The
    //   activity-based extension (14 days when recently active) can still
    //   stack on top of the user's preference (we use max() of the two).
    /// @notice challengePeriodPreference
    uint64 public challengePeriodPreference; // 0 = use contract default (7 days)
    /// @notice MIN_CHALLENGE_PERIOD
    uint64 public constant MIN_CHALLENGE_PERIOD = 3 days;
    /// @notice MAX_CHALLENGE_PERIOD
    uint64 public constant MAX_CHALLENGE_PERIOD = 30 days;
    /// @notice ChallengePeriodPreferenceSet
    /// @param seconds_ seconds_
    event ChallengePeriodPreferenceSet(uint64 seconds_);

    /// @notice C-7 FIX: Maximum VFIDE a vault may hold while guardian setup is incomplete.
    ///         Prevents a user who loses their phone before completing guardian setup from
    ///         losing more than this amount.  50,000 VFIDE (18 decimals).
    uint256 public constant MAX_VFIDE_WITHOUT_GUARDIAN = 50_000e18;

    /// @notice maxPerTransfer
    uint256 public maxPerTransfer;
    /// @notice dailyTransferLimit
    uint256 public dailyTransferLimit;
    /// @notice spentToday
    uint256 public spentToday;
    /// @notice dayStart
    uint64 public dayStart;

    /// @notice largeTransferThreshold
    uint256 public largeTransferThreshold; // Transfers above this get queued
    /// @notice paymentQueueManager
    address public immutable paymentQueueManager;
    /// @notice withdrawalQueueManager
    address public immutable withdrawalQueueManager;
    /// @notice adminManager
    address public immutable adminManager;

    struct WalletRotation {
        address newWallet;
        uint64 activateAt;
        uint8 approvals;
        uint256 proposalNonce;
    }

    /// @notice pendingRotation
    WalletRotation public pendingRotation;
    /// @notice rotationNonce
    uint256 public rotationNonce;
    /// @notice rotationApprovalByGuardian
    mapping(address => mapping(uint256 => bool)) public rotationApprovalByGuardian;

    /// @notice inheritanceManager
    address public inheritanceManager;

    struct TransferIntent {
        address vault;
        address toVault;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }

    struct PayIntent {
        address vault;
        address merchantPortal;
        address token;
        address merchant;
        address recipient;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }

    /// @notice Phase 3d Turn 3: typed-data for atomic escrow funding.
    /// @dev Mirrors PayIntent but identifies an escrow contract (not a merchant portal) as the
    ///      gated caller. Used by executeFundEscrow. The escrowId is carried for event indexing
    ///      and is NOT verified by this contract — verification is the escrow contract's
    ///      responsibility (it knows what escrow id it just created).
    struct EscrowFundIntent {
        address vault;          // must equal address(this)
        address escrowContract; // must equal msg.sender
        uint256 escrowId;       // event-indexing only; not verified
        address token;          // must equal vfideToken
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }

    /// @notice AdminTransferStarted
    /// @param oldAdmin oldAdmin
    /// @param newAdmin newAdmin
    event AdminTransferStarted(address indexed oldAdmin, address indexed newAdmin);
    /// @notice AdminTransferred
    /// @param oldAdmin oldAdmin
    /// @param newAdmin newAdmin
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    /// @notice RecoveryAdminUnseparated
    /// @param wallet wallet
    /// @param since since
    event RecoveryAdminUnseparated(address indexed wallet, uint64 since);
    /// @notice RecoveryAdminSeparated
    /// @param activeWallet activeWallet
    /// @param newAdmin newAdmin
    event RecoveryAdminSeparated(address indexed activeWallet, address indexed newAdmin);
    /// @notice RecoverySplitReminderEmitted
    /// @param wallet wallet
    /// @param daysUnseparated daysUnseparated
    event RecoverySplitReminderEmitted(address indexed wallet, uint64 daysUnseparated);

    /// @notice GuardianSet
    /// @param guardian guardian
    /// @param active active
    event GuardianSet(address indexed guardian, bool active);
    /// @notice GuardianThresholdSet
    /// @param threshold threshold
    event GuardianThresholdSet(uint8 threshold);
    /// @notice GuardianChangeProposed
    /// @param guardian guardian
    /// @param active active
    /// @param effectiveAt effectiveAt
    event GuardianChangeProposed(address indexed guardian, bool active, uint64 effectiveAt);
    /// @notice TrusteeChangeProposed
    /// @param guardian guardian
    /// @param trustee trustee
    /// @param effectiveAt effectiveAt
    event TrusteeChangeProposed(address indexed guardian, bool trustee, uint64 effectiveAt);
    /// @notice TrusteeChangeCancelled
    /// @param guardian guardian
    /// @param trustee trustee
    event TrusteeChangeCancelled(address indexed guardian, bool trustee);
    // R-8: Emitted at recovery completion to prompt frontend "review your trust graph" UI
    /// @notice RecoveryReviewPrompt
    /// @param newOwner newOwner
    /// @param guardianCount guardianCount
    /// @param trusteeCount trusteeCount
    event RecoveryReviewPrompt(address indexed newOwner, uint8 guardianCount, uint8 trusteeCount);
    /// @notice GuardianChangeCancelled
    /// @param guardian guardian
    /// @param active active
    event GuardianChangeCancelled(address indexed guardian, bool active);
    /// @notice SpendLimitsChangeProposed
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyTransferLimit dailyTransferLimit
    /// @param executeAfter executeAfter
    event SpendLimitsChangeProposed(uint256 maxPerTransfer, uint256 dailyTransferLimit, uint64 executeAfter);
    /// @notice SpendLimitsChangeCancelled
    event SpendLimitsChangeCancelled();
    /// @notice LargeTransferThresholdChangeProposed
    /// @param threshold threshold
    /// @param executeAfter executeAfter
    event LargeTransferThresholdChangeProposed(uint256 threshold, uint64 executeAfter);
    /// @notice LargeTransferThresholdChangeCancelled
    event LargeTransferThresholdChangeCancelled();
    /// @notice ERC20RescueProposed
    /// @param token token
    /// @param to to
    /// @param amount amount
    /// @param executeAfter executeAfter
    event ERC20RescueProposed(address indexed token, address indexed to, uint256 amount, uint64 executeAfter);
    /// @notice ERC20RescueCancelled
    /// @param token token
    /// @param to to
    /// @param amount amount
    event ERC20RescueCancelled(address indexed token, address indexed to, uint256 amount);
    /// @notice NativeRescueProposed
    /// @param to to
    /// @param amount amount
    /// @param executeAfter executeAfter
    event NativeRescueProposed(address indexed to, uint256 amount, uint64 executeAfter);
    /// @notice NativeRescueCancelled
    /// @param to to
    /// @param amount amount
    event NativeRescueCancelled(address indexed to, uint256 amount);
    /// @notice TokenApprovalProposed
    /// @param token token
    /// @param spender spender
    /// @param amount amount
    /// @param executeAfter executeAfter
    event TokenApprovalProposed(address indexed token, address indexed spender, uint256 amount, uint64 executeAfter);
    /// @notice TokenApprovalCancelled
    /// @param token token
    /// @param spender spender
    /// @param amount amount
    event TokenApprovalCancelled(address indexed token, address indexed spender, uint256 amount);

    /// @notice WalletRotationProposed
    /// @param oldWallet oldWallet
    /// @param newWallet newWallet
    /// @param activateAt activateAt
    /// @param proposalNonce proposalNonce
    event WalletRotationProposed(
        address indexed oldWallet,
        address indexed newWallet,
        uint64 activateAt,
        uint256 indexed proposalNonce
    );
    /// @notice WalletRotationApproved
    /// @param guardian guardian
    /// @param proposalNonce proposalNonce
    /// @param approvals approvals
    event WalletRotationApproved(address indexed guardian, uint256 indexed proposalNonce, uint8 approvals);
    /// @notice GuardianPauseApproved
    /// @param guardian guardian
    /// @param pauseNonce pauseNonce
    /// @param approvals approvals
    event GuardianPauseApproved(address indexed guardian, uint256 indexed pauseNonce, uint8 approvals);
    /// @notice WalletRotated
    /// @param oldWallet oldWallet
    /// @param newWallet newWallet
    /// @param newEpoch newEpoch
    event WalletRotated(address indexed oldWallet, address indexed newWallet, uint64 indexed newEpoch);

    /// @notice VaultTransferAuthorized
    /// @param signer signer
    /// @param toVault toVault
    /// @param amount amount
    /// @param nonce nonce
    /// @param walletEpoch walletEpoch
    event VaultTransferAuthorized(
        address indexed signer,
        address indexed toVault,
        uint256 amount,
        uint256 indexed nonce,
        uint64 walletEpoch
    );

    /// @notice PauseSet
    /// @param paused paused
    /// @param by by
    event PauseSet(bool paused, address indexed by);
    /// @notice SeerAutonomousSet
    /// @param seerAutonomous seerAutonomous
    event SeerAutonomousSet(address indexed seerAutonomous);
    /// @notice ExternalCallFailed
    /// @param context context
    event ExternalCallFailed(string indexed context);
    /// @notice SpendLimitsSet
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyTransferLimit dailyTransferLimit
    event SpendLimitsSet(uint256 maxPerTransfer, uint256 dailyTransferLimit);
    /// @notice VaultApprove
    /// @param spender spender
    /// @param amount amount
    event VaultApprove(address indexed spender, uint256 amount);
    /// @notice NativeRescue
    /// @param to to
    /// @param amount amount
    event NativeRescue(address indexed to, uint256 amount);
    /// @notice NativeReceived
    /// @param sender sender
    /// @param amount amount
    event NativeReceived(address indexed sender, uint256 amount);

    // Withdrawal queue events
    /// @notice WithdrawalQueued
    /// @param queueIndex queueIndex
    /// @param toVault toVault
    /// @param amount amount
    /// @param executeAfter executeAfter
    event WithdrawalQueued(uint256 indexed queueIndex, address indexed toVault, uint256 amount, uint64 executeAfter);
    /// @notice WithdrawalExecuted
    /// @param queueIndex queueIndex
    /// @param toVault toVault
    /// @param amount amount
    event WithdrawalExecuted(uint256 indexed queueIndex, address indexed toVault, uint256 amount);
    /// @notice WithdrawalCancelled
    /// @param queueIndex queueIndex
    /// @param cancelledBy cancelledBy
    event WithdrawalCancelled(uint256 indexed queueIndex, address indexed cancelledBy);
    /// @notice LargeTransferThresholdSet
    /// @param threshold threshold
    event LargeTransferThresholdSet(uint256 threshold);
    /// @notice PaymentQueued
    /// @param queueIndex queueIndex
    /// @param token token
    /// @param merchant merchant
    /// @param recipient recipient
    /// @param amount amount
    /// @param executeAfter executeAfter
    event PaymentQueued(uint256 indexed queueIndex, address indexed token, address indexed merchant, address recipient, uint256 amount, uint64 executeAfter);
    /// @notice PaymentQueueExecuted
    /// @param queueIndex queueIndex
    /// @param recipient recipient
    /// @param amount amount
    event PaymentQueueExecuted(uint256 indexed queueIndex, address recipient, uint256 amount);
    /// @notice PaymentQueueCancelled
    /// @param queueIndex queueIndex
    /// @param by by
    event PaymentQueueCancelled(uint256 indexed queueIndex, address by);
    /// @notice LargePaymentThresholdSet
    /// @param oldThreshold oldThreshold
    /// @param newThreshold newThreshold
    event LargePaymentThresholdSet(uint256 oldThreshold, uint256 newThreshold);
    /// @notice LargePaymentThresholdProposed
    /// @param threshold threshold
    /// @param executeAfter executeAfter
    event LargePaymentThresholdProposed(uint256 threshold, uint64 executeAfter);
    /// @notice R77: emitted when a pending large-payment threshold change is cancelled.
    /// @param threshold threshold
    /// @param executeAfter executeAfter
    event LargePaymentThresholdCancelled(uint256 threshold, uint64 executeAfter);


    /// @notice GUARDIAN-WARN-1: emitted on every outgoing payment/transfer made before the
    /// vault has completed multi-guardian setup. The vault is operationally unprotected
    /// against key compromise during this window. Frontends MUST surface a persistent
    /// banner to the user until guardian setup is complete and indexers MUST track this
    /// event for monitoring/alerting. The MAX_VFIDE_WITHOUT_GUARDIAN cap on incoming
    /// transfers (50K VFIDE) limits peak loss exposure during this window.
    /// @param merchant merchant
    /// @param token token
    /// @param amount amount
    event GuardianSetupIncomplete_Payment(address indexed merchant, address indexed token, uint256 amount);
    /// @notice GuardianSetupIncomplete_Transfer
    /// @param toVault toVault
    /// @param amount amount
    event GuardianSetupIncomplete_Transfer(address indexed toVault, uint256 amount);

    /// @notice CBV_NotAdmin
    error CBV_NotAdmin();
    /// @notice CBV_NotGuardian
    error CBV_NotGuardian();
    /// @notice CBV_ChallengePeriodTooShort
    error CBV_ChallengePeriodTooShort();
    /// @notice CBV_ChallengePeriodTooLong
    error CBV_ChallengePeriodTooLong();
    /// @notice CBV_Zero
    error CBV_Zero();
    /// @notice CBV_InvalidThreshold
    error CBV_InvalidThreshold();
    /// @notice CBV_Paused
    error CBV_Paused();
    /// @notice CBV_NotVault
    error CBV_NotVault();
    /// @notice CBV_Expired
    error CBV_Expired();
    /// @notice CBV_InvalidNonce
    error CBV_InvalidNonce();
    /// @notice CBV_InvalidEpoch
    error CBV_InvalidEpoch();
    /// @notice CBV_InvalidChain
    error CBV_InvalidChain();
    /// @notice CBV_InvalidSigner
    error CBV_InvalidSigner();
    /// @notice CBV_InvalidSignature
    error CBV_InvalidSignature();
    /// @notice CBV_TransferLimit
    error CBV_TransferLimit();
    /// @notice CBV_DailyLimit
    error CBV_DailyLimit();
    /// @notice CBV_RotationNotReady
    error CBV_RotationNotReady();
    /// @notice CBV_RotationInsufficientApprovals
    error CBV_RotationInsufficientApprovals();
    /// @notice CBV_NoRotation
    error CBV_NoRotation();
    /// @notice CBV_OnlyHub
    error CBV_OnlyHub();
    /// @notice CBV_TransferFailed
    error CBV_TransferFailed();
    /// @notice CBV_GuardianSetupRequired
    error CBV_GuardianSetupRequired();
    /// @notice CBV_PauseAlreadyApproved
    error CBV_PauseAlreadyApproved();
    /// @notice CBV_SeerBlocked
    error CBV_SeerBlocked();
    /// @notice CBV_NotMerchantPortal
    error CBV_NotMerchantPortal();
    /// @notice CBV_NotEscrowContract
    error CBV_NotEscrowContract();
    /// @notice CBV_SameAdmin
    error CBV_SameAdmin();
    /// @notice CBV_NoSeparationNeeded
    error CBV_NoSeparationNeeded();
    /// @notice CBV_PayIntentInvalid
    error CBV_PayIntentInvalid();
    /// @notice CBV_PayIntentTokenInvalid
    error CBV_PayIntentTokenInvalid(); // H2: intent.token must be vfideToken
    /// @notice CBV_UseProposeApply
    error CBV_UseProposeApply();
    /// @notice CBV_InvalidToken
    error CBV_InvalidToken();
    /// @notice CBV_InvalidRecoveryRotation
    error CBV_InvalidRecoveryRotation();
    /// @notice CBV_InheritanceActive
    error CBV_InheritanceActive();
    /// @notice C-7 FIX: Destination vault cannot receive transfer (unguarded and cap would be exceeded).
    error CBV_ReceiverNeedsGuardian();

    /// @notice onlyAdmin
    modifier onlyAdmin() {
        if (msg.sender != admin) revert CBV_NotAdmin();
        _;
    }

    /// @notice onlyGuardian
    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert CBV_NotGuardian();
        _;
    }

    // ── notLocked modifier REMOVED ─────────────────────────────
    // No external SecurityHub can lock this vault. Protection is
    // through the user's own guardians calling pause(). The
    // whenNotPaused modifier provides equivalent protection under
    // the user's own control.
    // ─────────────────────────────────────────────────────────────

    /// @notice whenNotPaused
    modifier whenNotPaused() {
        // VAULT-EXT-01: Emergency pause expires automatically after 7 days.
        if (paused && pauseUntil != 0 && block.timestamp >= pauseUntil) {
            paused = false;
            pauseUntil = 0;
            emit PauseSet(false, address(0));
        }
        if (paused) revert CBV_Paused();
        _;
    }

    /// @notice constructor
    /// @param _hub _hub
    /// @param _vfideToken _vfideToken
    /// @param _admin _admin
    /// @param _activeWallet _activeWallet
    /// @param _guardians _guardians
    /// @param _guardianThreshold _guardianThreshold
    /// @param _maxPerTransfer _maxPerTransfer
    /// @param _dailyTransferLimit _dailyTransferLimit
    /// @param _ledger _ledger
    constructor(
        address _hub,
        address _vfideToken,
        address _admin,
        address _activeWallet,
        address[] memory _guardians,
        uint8 _guardianThreshold,
        uint256 _maxPerTransfer,
        uint256 _dailyTransferLimit,
        address _ledger
    ) {
        if (_hub == address(0) || _vfideToken == address(0) || _admin == address(0) || _activeWallet == address(0)) {
            revert CBV_Zero();
        }

        if (_guardians.length == 0 || _guardians.length > MAX_GUARDIANS) revert CBV_InvalidThreshold();
        if (_guardianThreshold == 0 || _guardianThreshold > _guardians.length) revert CBV_InvalidThreshold();
        if (_maxPerTransfer == 0 || _dailyTransferLimit == 0 || _maxPerTransfer > _dailyTransferLimit) {
            revert CBV_TransferLimit();
        }

        hub = _hub;
        vfideToken = _vfideToken;
        admin = _admin;
        activeWallet = _activeWallet;
        walletEpoch = 1;

        ledger = IProofLedger(_ledger);

        maxPerTransfer = _maxPerTransfer;
        dailyTransferLimit = _dailyTransferLimit;
        dayStart = uint64(block.timestamp);

        for (uint256 i = 0; i < _guardians.length; ++i) {
            address guardian = _guardians[i];
            if (guardian == address(0)) revert CBV_Zero();
            if (!isGuardian[guardian]) {
                isGuardian[guardian] = true;
                guardianAddedAt[guardian] = uint64(block.timestamp);
                ++guardianCount;
                emit GuardianSet(guardian, true);
            }
        }

        guardianThreshold = _guardianThreshold;
        emit GuardianThresholdSet(_guardianThreshold);

        // L-5 FIX: Enable withdrawal queue protection by default.
        // Any transfer >= dailyTransferLimit requires the 7-day queue, protecting
        // against compromised wallet keys.  The admin can adjust or disable this
        // via setLargeTransferThreshold() at any time.
        largeTransferThreshold = _dailyTransferLimit;
        emit LargeTransferThresholdSet(_dailyTransferLimit);

        // C1 FIX: payment threshold = 5x transfer threshold so daily payments
        // under that amount execute instantly while outliers are queued.
        uint256 initialPaymentThreshold = _dailyTransferLimit * 5;
        paymentQueueManager = address(new CardBoundVaultPaymentQueueManager(address(this), initialPaymentThreshold));
        emit LargePaymentThresholdSet(0, initialPaymentThreshold);

        withdrawalQueueManager = address(new CardBoundVaultWithdrawalQueueManager(address(this)));

        inheritanceManager = address(new CardBoundVaultInheritanceManager(address(this)));

        adminManager = address(new CardBoundVaultAdminManager(address(this)));

        _domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );

        emit SpendLimitsSet(_maxPerTransfer, _dailyTransferLimit);
    }

    /// @notice Get the current admin (owner) of this vault. Exposed for compatibility with VaultRecoveryClaim.
    /// @return _address _address
    function owner() external view returns (address) {
        return admin;
    }

    /// @notice Start two-step admin transfer for this vault.
    /// @param newAdmin Address that must call `acceptAdmin` to complete transfer.
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert CBV_Zero();
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }

    /// @notice Accept pending admin transfer initiated by current admin.
    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert CBV_NotAdmin();
        address old = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);

        if (recoveryAdminUnseparated && admin != activeWallet) {
            recoveryAdminUnseparated = false;
            recoveryUnseparatedSince = 0;
            emit RecoveryAdminSeparated(activeWallet, admin);
        }

        emit AdminTransferred(old, admin);
    }

    /// @notice Restore admin/activeWallet separation after a recovery.
    /// @param newAdmin newAdmin
    function splitAdminFromActive(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert CBV_Zero();
        if (newAdmin == activeWallet) revert CBV_SameAdmin();
        if (!recoveryAdminUnseparated) revert CBV_NoSeparationNeeded();
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }

    /// @notice Propose a guardian change with 24-hour timelock (CBV-03)
    /// @param guardian guardian
    /// @param active active
    function proposeGuardianChange(address guardian, bool active) external onlyAdmin {
        if (guardian == address(0)) revert CBV_Zero();
        IAdminManager(adminManager).proposeGuardianChange(guardian, active);
        emit GuardianChangeProposed(guardian, active, uint64(block.timestamp) + 1 days);
    }

    /// @notice Apply a previously proposed guardian change after timelock expires (CBV-03)
    function applyGuardianChange() external onlyAdmin {
        (address guardian, bool active) = IAdminManager(adminManager).applyGuardianChange();
        _applyGuardianChange(guardian, active);
    }

    /// @notice Cancel a pending guardian change (CBV-03)
    function cancelGuardianChange() external onlyAdmin {
        (address guardian, bool active) = IAdminManager(adminManager).cancelGuardianChange();
        emit GuardianChangeCancelled(guardian, active);
    }

    /// @notice _applyGuardianChange
    /// @param guardian guardian
    /// @param active active
    function _applyGuardianChange(address guardian, bool active) internal {
        if (isGuardian[guardian] == active) return;

        isGuardian[guardian] = active;
        if (active) {
            if (guardianCount >= MAX_GUARDIANS) revert CBV_InvalidThreshold();
            guardianAddedAt[guardian] = uint64(block.timestamp);
            ++guardianCount;
        } else {
            delete guardianAddedAt[guardian];
            --guardianCount;
            if (guardianThreshold > guardianCount) {
                guardianThreshold = guardianCount;
                emit GuardianThresholdSet(guardianThreshold);
            }
        }

        if (guardianCount == 0 || guardianThreshold == 0) revert CBV_InvalidThreshold();

        if (_guardianSetupComplete() && (guardianCount < 2 || guardianThreshold < 2)) {
            try IVaultHubGuardianSetup(hub).invalidateGuardianSetup(address(this)) {
                // keep hub guardian setup status aligned with the live vault invariants
            } catch {
                // tolerate older or misconfigured hubs rather than blocking guardian application
            }
        }

        emit GuardianSet(guardian, active);
    }

    /// @notice _guardianSetupComplete
    /// @return _bool _bool
    function _guardianSetupComplete() internal view returns (bool) {
        if (hub.code.length == 0) {
            return false;
        }

        try IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this)) returns (bool complete) {
            return complete;
        } catch {
            return false;
        }
    }

    /// @notice Legacy guardian mutator — ONLY usable during bootstrap (before guardianSetupComplete).
    /// @param guardian Guardian address to update.
    /// @param active True to set guardian active, false to remove.
    /// @dev C-2 FIX: After guardian setup is complete on VaultHub, admin must use
    ///      proposeGuardianChange + applyGuardianChange (24-hour timelock) instead.
    function setGuardian(address guardian, bool active) external onlyAdmin {
        // C-2 FIX: Block instant guardian changes after bootstrap
        if (IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) revert CBV_UseProposeApply();
        if (guardian == address(0)) revert CBV_Zero();
        _applyGuardianChange(guardian, active);
    }

    /// @notice Set required guardian approvals for sensitive wallet-rotation actions.
    /// @param threshold New guardian approval threshold.
    /// @dev C-2 FIX: Also gated to bootstrap-only to prevent instant threshold reduction.
    function setGuardianThreshold(uint8 threshold) external onlyAdmin {
        if (IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) revert CBV_UseProposeApply();
        if (threshold == 0 || threshold > guardianCount) revert CBV_InvalidThreshold();
        guardianThreshold = threshold;
        emit GuardianThresholdSet(threshold);
    }

    /// @notice Configure per-transfer and daily transfer limits.
    /// @param _maxPerTransfer Maximum VFIDE transferable in a single authorized transfer.
    /// @param _dailyTransferLimit Maximum VFIDE transferable during the active 24h window.
    function setSpendLimits(uint256 _maxPerTransfer, uint256 _dailyTransferLimit) external onlyAdmin {
        if (_maxPerTransfer == 0 || _dailyTransferLimit == 0 || _maxPerTransfer > _dailyTransferLimit) {
            revert CBV_TransferLimit();
        }

        if (_guardianSetupComplete()) {
            IAdminManager(adminManager).proposeSpendLimits(_maxPerTransfer, _dailyTransferLimit);
            emit SpendLimitsChangeProposed(_maxPerTransfer, _dailyTransferLimit, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
            return;
        }

        maxPerTransfer = _maxPerTransfer;
        dailyTransferLimit = _dailyTransferLimit;
        emit SpendLimitsSet(_maxPerTransfer, _dailyTransferLimit);
    }

    // ─────────────────────────────────────────────────────────────────
    // TRUSTEE ROLE MANAGEMENT (R-8)
    // ─────────────────────────────────────────────────────────────────

    /// @notice Grant or revoke trustee (recovery-initiation) power for a guardian.
    /// @param guardian An existing guardian on this vault.
    /// @param trustee True to grant initiation power, false to revoke.
    /// @dev SAFETY: Trustee status confers the power to start a recovery flow on
    ///      the user's behalf. Granting this is dangerous — a rogue trustee can
    ///      initiate recovery against a temporarily-unreachable owner. We
    ///      therefore:
    ///        1. Require the address to already be a mature guardian (7-day
    ///           maturity period prevents an instantly-added attacker guardian
    ///           from being instantly promoted to trustee).
    ///        2. Route the change through the same propose/timelock/apply
    ///           pipeline as guardian add/remove — see proposeTrusteeChange().
    ///           This direct setter is bootstrap-only (before guardianSetupComplete).
    function setTrustee(address guardian, bool trustee) external onlyAdmin {
        if (IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) revert CBV_UseProposeApply();
        if (guardian == address(0)) revert CBV_Zero();
        if (!isGuardian[guardian]) revert CBV_NotGuardian();
        _applyTrusteeChange(guardian, trustee);
    }

    /// @notice Propose a trustee role change (post-bootstrap, timelocked).
    /// @dev Reuses the AdminManager guardian-change pipeline by encoding the
    ///      role bit into the propose call. The same 24-hour timelock applies.
    /// @param guardian guardian
    /// @param trustee trustee
    function proposeTrusteeChange(address guardian, bool trustee) external onlyAdmin {
        if (guardian == address(0)) revert CBV_Zero();
        if (!isGuardian[guardian]) revert CBV_NotGuardian();
        IAdminManager(adminManager).proposeTrusteeChange(guardian, trustee);
        emit TrusteeChangeProposed(guardian, trustee, uint64(block.timestamp) + 1 days);
    }

    /// @notice Apply a previously proposed trustee change after timelock expires.
    function applyTrusteeChange() external onlyAdmin {
        (address guardian, bool trustee) = IAdminManager(adminManager).applyTrusteeChange();
        _applyTrusteeChange(guardian, trustee);
    }

    /// @notice Cancel a pending trustee change before it executes.
    function cancelTrusteeChange() external onlyAdmin {
        (address guardian, bool trustee) = IAdminManager(adminManager).cancelTrusteeChange();
        emit TrusteeChangeCancelled(guardian, trustee);
    }

    /// @notice _applyTrusteeChange
    /// @param guardian guardian
    /// @param trustee trustee
    function _applyTrusteeChange(address guardian, bool trustee) internal {
        if (isTrustee[guardian] == trustee) return;
        // SAFETY: A trustee MUST be an existing guardian. If the address has
        // been removed as a guardian since the proposal, refuse the role change
        // — re-add as guardian first, then re-propose trustee.
        if (trustee && !isGuardian[guardian]) revert CBV_NotGuardian();
        isTrustee[guardian] = trustee;
        if (trustee) {
            ++trusteeCount;
        } else {
            --trusteeCount;
        }
        emit TrusteeRoleSet(guardian, trustee);
    }

    /// @notice External view: is this address a trustee?
    /// @dev Used by VaultRecoveryClaim to gate initiateClaim. Returns false for
    ///      non-guardians automatically (isTrustee defaults to false).
    /// @param guardian guardian
    /// @return _bool _bool
    function isGuardianTrustee(address guardian) external view returns (bool) {
        return isTrustee[guardian];
    }

    /// @notice External view: how many trustees does this vault have?
    /// @return _uint8 _uint8
    function trusteeCountView() external view returns (uint8) {
        return trusteeCount;
    }

    // ─────────────────────────────────────────────────────────────────
    // CHALLENGE PERIOD PREFERENCE (R-8)
    // ─────────────────────────────────────────────────────────────────

    /// @notice Set the user's preferred veto window for guardian-initiated recovery.
    /// @param seconds_ Desired window in seconds. Bounded to [3 days, 30 days].
    /// @dev SAFETY:
    ///      1. HARD MINIMUM 3 days — even a fully-attentive user needs a few days
    ///         to notice and respond. Below this, the protection is illusory.
    ///      2. HARD MAXIMUM 30 days — keeps the window inside CLAIM_EXPIRY so
    ///         genuine recoveries can complete.
    ///      3. SNAPSHOT-SAFE — the preference is read once at claim initiation
    ///         time and snapshotted into the RecoveryClaim. Subsequent changes
    ///         to this preference do NOT shrink an in-progress challenge window.
    ///         An attacker who later compromises the owner key cannot use this
    ///         setter to retroactively close a running window.
    ///      4. STACKS with the activity-based extension — VaultRecoveryClaim
    ///         takes max(this preference, ACTIVE_VAULT_CHALLENGE_PERIOD) when
    ///         the vault has been recently active or guardian setup is
    ///         incomplete.
    ///      5. NO timelock on this setter because shortening the window only
    ///         affects FUTURE claims, never an active one. The protection comes
    ///         from the snapshot, not from a delay.
    function setChallengePeriodPreference(uint64 seconds_) external onlyAdmin {
        if (seconds_ != 0) {
            if (seconds_ < MIN_CHALLENGE_PERIOD) revert CBV_ChallengePeriodTooShort();
            if (seconds_ > MAX_CHALLENGE_PERIOD) revert CBV_ChallengePeriodTooLong();
        }
        challengePeriodPreference = seconds_;
        emit ChallengePeriodPreferenceSet(seconds_);
    }

    /// @notice External view: this vault's challenge period preference, or 0 if unset.
    /// @dev Called by VaultRecoveryClaim.initiateClaim. A return value of 0 means
    ///      "user has no preference; use the protocol default."
    /// @return _uint64 _uint64
    function challengePeriodPreferenceView() external view returns (uint64) {
        return challengePeriodPreference;
    }

    /// @notice applySpendLimits
    function applySpendLimits() external onlyAdmin {
        (uint256 maxPT, uint256 dailyTL) = IAdminManager(adminManager).applySpendLimits();
        maxPerTransfer = maxPT;
        dailyTransferLimit = dailyTL;
        emit SpendLimitsSet(maxPT, dailyTL);
    }

    /// @notice cancelSpendLimitsChange
    function cancelSpendLimitsChange() external onlyAdmin {
        IAdminManager(adminManager).cancelSpendLimits();
        emit SpendLimitsChangeCancelled();
    }

    /// @notice setSeerAutonomous
    /// @param _seerAutonomous _seerAutonomous
    function setSeerAutonomous(address _seerAutonomous) external onlyAdmin {
        seerAutonomous = ISeerAutonomousVault(_seerAutonomous);
        emit SeerAutonomousSet(_seerAutonomous);
    }

    /// @notice C-7 FIX: Returns true if this vault can receive `amount` more VFIDE without
    ///         guardian setup complete.  Once guardian setup is done the cap is lifted.
    /// @param amount amount
    /// @return _bool _bool
    function canReceiveTransfer(uint256 amount) external view returns (bool) {
        if (_guardianSetupComplete()) return true;
        uint256 currentBalance = IERC20(vfideToken).balanceOf(address(this));
        return currentBalance + amount <= MAX_VFIDE_WITHOUT_GUARDIAN;
    }

    /// @notice isGuardianMature
    /// @param guardian guardian
    /// @return _bool _bool
    function isGuardianMature(address guardian) external view returns (bool) {
        uint64 addedAt = guardianAddedAt[guardian];
        return addedAt != 0 && block.timestamp >= addedAt + GUARDIAN_MATURITY_PERIOD;
    }

    // slither-disable-next-line reentrancy-events
    /// @notice approveVFIDE
    /// @param spender spender
    /// @param amount amount
    function approveVFIDE(address spender, uint256 amount) external onlyAdmin whenNotPaused {
        if (spender == address(0)) revert CBV_Zero();
        _validateApprovalAmount(amount);
        IAdminManager(adminManager).proposeTokenApproval(vfideToken, spender, amount);
        emit TokenApprovalProposed(vfideToken, spender, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    /// @notice F-6 FIX: Approve a spender to pull any ERC20 from this vault.
    /// @dev Timelocked helper for explicit long-lived approvals.
    ///      Not intended for real-time merchant checkout flows.
    ///      Cannot approve VFIDE — use approveVFIDE for that.
    /// @param token token
    /// @param spender spender
    /// @param amount amount
    event ERC20Approve(address indexed token, address indexed spender, uint256 amount);

    // slither-disable-next-line reentrancy-events
    /// @notice approveERC20
    /// @param token token
    /// @param spender spender
    /// @param amount amount
    function approveERC20(address token, address spender, uint256 amount) external onlyAdmin whenNotPaused {
        if (token == vfideToken) revert CBV_InvalidToken();
        if (spender == address(0)) revert CBV_Zero();
        if (token == address(0)) revert CBV_Zero();
        _validateApprovalAmount(amount);
        IAdminManager(adminManager).proposeTokenApproval(token, spender, amount);
        emit TokenApprovalProposed(token, spender, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    // slither-disable-next-line reentrancy-events
    /// @notice applyTokenApproval
    function applyTokenApproval() external onlyAdmin whenNotPaused {
        (address token, address spender, uint256 amount) = IAdminManager(adminManager).applyTokenApproval();

        _validateApprovalAmount(amount);

        IERC20(token).forceApprove(spender, amount);

        if (token == vfideToken) {
            emit VaultApprove(spender, amount);
        } else {
            emit ERC20Approve(token, spender, amount);
        }
    }

    /// @notice cancelTokenApproval
    function cancelTokenApproval() external onlyAdmin {
        (address token, address spender, uint256 amount) = IAdminManager(adminManager).cancelTokenApproval();
        emit TokenApprovalCancelled(token, spender, amount);
    }

    /// @notice Pause vault operations (admin or guardian emergency control).
    function pause() external {
        if (msg.sender != admin && !isGuardian[msg.sender]) {
            revert CBV_NotGuardian();
        }

        if (msg.sender == admin) {
            paused = true;
            pauseUntil = uint64(block.timestamp + MAX_PAUSE_WINDOW);
            emit PauseSet(true, msg.sender);
            return;
        }

        uint256 currentPauseNonce = pauseNonce;
        if (pauseApprovalByGuardian[msg.sender][currentPauseNonce]) revert CBV_PauseAlreadyApproved();
        pauseApprovalByGuardian[msg.sender][currentPauseNonce] = true;
        uint8 approvals = pauseApprovalCount[currentPauseNonce] + 1;
        pauseApprovalCount[currentPauseNonce] = approvals;
        emit GuardianPauseApproved(msg.sender, currentPauseNonce, approvals);

        if (approvals < guardianThreshold) {
            return;
        }

        paused = true;
        pauseUntil = uint64(block.timestamp + MAX_PAUSE_WINDOW);
        pauseNonce = currentPauseNonce + 1;
        emit PauseSet(true, msg.sender);
    }

    /// @notice Unpause vault operations (admin only).
    function unpause() external onlyAdmin {
        paused = false;
        pauseUntil = 0;
        emit PauseSet(false, msg.sender);
    }

    /// @notice Propose active-wallet rotation with delay and guardian approvals.
    /// @param newWallet New wallet that will become active after finalization.
    /// @param delaySeconds Timelock delay before rotation can be finalized.
    function proposeWalletRotation(address newWallet, uint64 delaySeconds) external onlyAdmin {
        if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
            revert CBV_GuardianSetupRequired();
        }
        if (newWallet == address(0)) revert CBV_Zero();
        if (delaySeconds < MIN_ROTATION_DELAY || delaySeconds > MAX_ROTATION_DELAY) revert CBV_RotationNotReady();

        ++rotationNonce;
        pendingRotation = WalletRotation({
            newWallet: newWallet,
            activateAt: uint64(block.timestamp + delaySeconds),
            approvals: 0,
            proposalNonce: rotationNonce
        });

        emit WalletRotationProposed(activeWallet, newWallet, pendingRotation.activateAt, rotationNonce);
    }

    /// @notice Cast one guardian approval for the currently pending wallet rotation.
    function approveWalletRotation() external onlyGuardian {
        if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
            revert CBV_GuardianSetupRequired();
        }
        WalletRotation memory current = pendingRotation;
        if (current.newWallet == address(0)) revert CBV_NoRotation();

        if (rotationApprovalByGuardian[msg.sender][current.proposalNonce]) {
            revert CBV_RotationInsufficientApprovals();
        }

        rotationApprovalByGuardian[msg.sender][current.proposalNonce] = true;
        pendingRotation.approvals = current.approvals + 1;

        emit WalletRotationApproved(msg.sender, current.proposalNonce, pendingRotation.approvals);
    }

    /// @notice Finalize pending wallet rotation after delay and threshold approvals.
    function finalizeWalletRotation() external {
        if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
            revert CBV_GuardianSetupRequired();
        }
        if (msg.sender != admin && !isGuardian[msg.sender]) {
            revert CBV_NotGuardian();
        }

        WalletRotation memory current = pendingRotation;
        if (current.newWallet == address(0)) revert CBV_NoRotation();
        if (block.timestamp < current.activateAt) revert CBV_RotationNotReady();
        if (current.approvals < guardianThreshold) revert CBV_RotationInsufficientApprovals();

        address oldWallet = activeWallet;
        activeWallet = current.newWallet;
        ++walletEpoch;

        delete pendingRotation;
        emit WalletRotated(oldWallet, activeWallet, walletEpoch);
    }

    // ── __forceSetOwner REMOVED ───────────────────────────────
    // No external entity can reassign vault ownership. Recovery
    // is ONLY through the user's own guardians via wallet rotation
    // or VaultRecoveryClaim. This makes the vault truly non-custodial.
    // ─────────────────────────────────────────────────────────

    // slither-disable-start reentrancy-no-eth
    /// @notice Execute a signed transfer intent from this vault to another vault.
    /// @param intent Structured transfer intent signed by active wallet.
    /// @param signature ECDSA signature over the intent digest.
    function executeVaultToVaultTransfer(TransferIntent calldata intent, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
    {
        _requireOperationalForOutboundTransfers();
        // GUARDIAN-WARN-1 FIX: warn-instead-of-revert. See executePayMerchant for full rationale.
        // Recovery operations remain gated; everyday transfers are not.
        if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
            emit GuardianSetupIncomplete_Transfer(intent.toVault, intent.amount);
        }
        if (intent.vault != address(this)) revert CBV_InvalidSignature();
        if (intent.toVault == address(0) || intent.toVault == address(this) || intent.toVault == address(0x000000000000000000000000000000000000dEaD)) revert CBV_NotVault(); // CBV-02: block burn/dead addresses
        if (!IVaultHub(hub).isVault(intent.toVault)) revert CBV_NotVault();
        if (intent.chainId != block.chainid) revert CBV_InvalidChain();
        if (intent.walletEpoch != walletEpoch) revert CBV_InvalidEpoch();
        if (intent.deadline < block.timestamp) revert CBV_Expired();
        if (intent.nonce != nextNonce) revert CBV_InvalidNonce();

        uint256 amount = intent.amount;
        if (amount == 0 || amount > maxPerTransfer) revert CBV_TransferLimit();

        _refreshDailyWindow();
        if (spentToday + amount > dailyTransferLimit) revert CBV_DailyLimit();

        address signer = _recoverTransferSigner(intent, signature);
        if (signer != activeWallet) revert CBV_InvalidSigner();
        _emitRecoverySplitReminder(signer);

        _enforceSeerAction(admin, 0, amount, intent.toVault);

        ++nextNonce;

        // ── Large transfer queueing ─────────────────────────────
        // If a threshold is configured and the amount exceeds it,
        // queue the transfer with a 7-day delay instead of executing
        // immediately. This gives the owner or guardians time to
        // cancel if keys were compromised.
        if (largeTransferThreshold > 0 && amount >= largeTransferThreshold) {
            // H-5 FIX: Commit the daily spend budget at queue time, not only at execution time.
            // Without this, an attacker with a compromised key could queue MAX_QUEUED withdrawals
            // in a single day, each passing the spentToday + amount <= dailyTransferLimit check
            // since spentToday was never incremented, staging up to 20× the daily limit.
            spentToday += amount;
            _queueWithdrawal(intent.toVault, amount, intent.nonce);
            emit VaultTransferAuthorized(signer, intent.toVault, amount, intent.nonce, intent.walletEpoch);
            _logTransfer(intent.toVault, amount);
            return;
        }

        // Small transfer — execute immediately
        spentToday += amount;

        // C-7 FIX: Prevent pre-loading an unguarded destination vault beyond safe threshold.
        if (!ICardBoundVaultView(intent.toVault).canReceiveTransfer(amount)) revert CBV_ReceiverNeedsGuardian();

        IERC20(vfideToken).safeTransfer(intent.toVault, amount);

        emit VaultTransferAuthorized(signer, intent.toVault, amount, intent.nonce, intent.walletEpoch);
        _logTransfer(intent.toVault, amount);
    }
    // slither-disable-end reentrancy-no-eth

    // slither-disable-start reentrancy-no-eth
    /// @notice Execute a signed merchant payment intent from this vault.
    /// @param intent Structured payment intent signed by active wallet.
    /// @param signature ECDSA signature over the pay intent digest.
    function executePayMerchant(PayIntent calldata intent, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
    {
        _requireOperationalForOutboundTransfers();
        // GUARDIAN-WARN-1 FIX: Previously reverted with CBV_GuardianSetupRequired. That blocked
        // every merchant payment from new users until they had configured 2+ guardians with at
        // least one independent — a paralyzing UX hurdle for the protocol's core "tap to pay
        // at the food truck" flow. Replaced with a warning event so frontends and indexers can
        // surface a persistent banner. Peak loss exposure is bounded by MAX_VFIDE_WITHOUT_GUARDIAN
        // (50K VFIDE) on the incoming side, so a compromised key cannot drain more than the cap
        // before guardian setup catches up. Recovery operations (proposeWalletRotation,
        // approveWalletRotation, finalizeWalletRotation) remain gated because they fundamentally
        // require guardian quorum.
        if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
            emit GuardianSetupIncomplete_Payment(intent.merchant, intent.token, intent.amount);
        }
        if (msg.sender != intent.merchantPortal) revert CBV_NotMerchantPortal();
        if (intent.vault != address(this)) revert CBV_PayIntentInvalid();
        if (intent.merchantPortal == address(0)) revert CBV_PayIntentInvalid();
        if (intent.merchant == address(0)) revert CBV_PayIntentInvalid();
        if (intent.token != vfideToken) revert CBV_PayIntentTokenInvalid(); // H2 FIX: restrict to VFIDE only
        if (intent.recipient == address(0) || intent.recipient == address(this)) revert CBV_PayIntentInvalid();
        if (intent.chainId != block.chainid) revert CBV_InvalidChain();
        if (intent.walletEpoch != walletEpoch) revert CBV_InvalidEpoch();
        if (intent.deadline < block.timestamp) revert CBV_Expired();
        if (intent.nonce != nextNonce) revert CBV_InvalidNonce();

        uint256 amount = intent.amount;
        if (amount == 0 || amount > maxPerTransfer) revert CBV_TransferLimit();

        _refreshDailyWindow();
        if (spentToday + amount > dailyTransferLimit) revert CBV_DailyLimit();

        address signer = _recoverPaySigner(intent, signature);
        if (signer != activeWallet) revert CBV_InvalidSigner();
        _emitRecoverySplitReminder(signer);

        _enforceSeerAction(admin, 0, amount, intent.recipient);

        ++nextNonce;
        uint256 paymentThreshold = ICardBoundVaultPaymentQueueManager(paymentQueueManager).largePaymentThreshold();
        if (paymentThreshold > 0 && amount >= paymentThreshold) {
            spentToday += amount;
            (uint256 queueIndex, uint64 executeAfter) = ICardBoundVaultPaymentQueueManager(paymentQueueManager)
                .queuePayment(intent.token, intent.merchant, intent.recipient, amount, intent.nonce);
            emit PaymentQueued(queueIndex, intent.token, intent.merchant, intent.recipient, amount, executeAfter);
            _logPayment(intent.recipient, amount);
            return;
        }

        spentToday += amount;
        IERC20(intent.token).safeTransfer(intent.recipient, amount);
        _logPayment(intent.recipient, amount);
    }
    // slither-disable-end reentrancy-no-eth

    // slither-disable-start reentrancy-no-eth
    /// @notice Phase 3d Turn 3 — atomic escrow funding via signed intent.
    /// @dev Mirrors executePayMerchant's security pattern: nonce, walletEpoch, deadline, chainId,
    ///      activeWallet signature, daily + per-tx limits, pause + operational state, Seer enforcement.
    ///
    /// Differences from executePayMerchant:
    ///   - Gated to `msg.sender == intent.escrowContract` (not merchant portal).
    ///   - NO queueing branch — escrow funding is atomic by design. A queued fund would leave the
    ///     escrow contract in an inconsistent OPEN-but-pending state and break dispute timing.
    ///   - Transfers to intent.escrowContract (which then internally tracks the funded escrow id).
    ///   - Does NOT call _logPayment — escrow funding isn't a merchant payment for ProofLedger
    ///     accounting purposes; the escrow contract emits its own EscrowFunded event.
    ///
    /// Caller responsibility (CommerceEscrow): validate the merchant, create the escrow record,
    /// pass through this intent unchanged, and emit EscrowFunded once this returns.
    /// @param intent intent
    /// @param signature signature
    function executeFundEscrow(EscrowFundIntent calldata intent, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
    {
        // slither-disable-next-line reentrancy-no-eth  // function has nonReentrant guard; intent flow is atomic
        _requireOperationalForOutboundTransfers();
        // Mirrors GUARDIAN-WARN-1 FIX: warn instead of revert when guardians aren't set up. Same
        // rationale as executePayMerchant — recovery flows remain gated; everyday operations don't.
        if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
            emit GuardianSetupIncomplete_Payment(intent.escrowContract, intent.token, intent.amount);
        }
        if (msg.sender != intent.escrowContract) revert CBV_NotEscrowContract();
        if (intent.vault != address(this)) revert CBV_PayIntentInvalid();
        if (intent.escrowContract == address(0)) revert CBV_PayIntentInvalid();
        if (intent.token != vfideToken) revert CBV_PayIntentTokenInvalid(); // H2 FIX: VFIDE only
        if (intent.chainId != block.chainid) revert CBV_InvalidChain();
        if (intent.walletEpoch != walletEpoch) revert CBV_InvalidEpoch();
        if (intent.deadline < block.timestamp) revert CBV_Expired();
        if (intent.nonce != nextNonce) revert CBV_InvalidNonce();

        uint256 amount = intent.amount;
        if (amount == 0 || amount > maxPerTransfer) revert CBV_TransferLimit();

        _refreshDailyWindow();
        if (spentToday + amount > dailyTransferLimit) revert CBV_DailyLimit();

        address signer = _recoverFundEscrowSigner(intent, signature);
        if (signer != activeWallet) revert CBV_InvalidSigner();
        _emitRecoverySplitReminder(signer);

        _enforceSeerAction(admin, 0, amount, intent.escrowContract);

        ++nextNonce;
        spentToday += amount;
        IERC20(intent.token).safeTransfer(intent.escrowContract, amount);
    }
    // slither-disable-end reentrancy-no-eth

    /// @notice Execute a queued payment after the 7-day delay (admin only).
    /// @param queueIndex queueIndex
    function executeQueuedPayment(uint256 queueIndex)
        external
        nonReentrant
        whenNotPaused
    {
        _requireOperationalForOutboundTransfers();
        (address token, address recipient, uint256 amount) = ICardBoundVaultPaymentQueueManager(paymentQueueManager)
            .executeQueuedPayment(queueIndex, msg.sender == admin);

        _enforceSeerAction(admin, 0, amount, recipient);

        IERC20(token).safeTransfer(recipient, amount);
        emit PaymentQueueExecuted(queueIndex, recipient, amount);
        _logPayment(recipient, amount);
    }

    /// @notice Cancel a queued payment (admin or guardian).
    /// @param queueIndex queueIndex
    function cancelQueuedPayment(uint256 queueIndex) external {
        (uint64 requestTime, uint256 amount) = ICardBoundVaultPaymentQueueManager(paymentQueueManager)
            .cancelQueuedPayment(queueIndex, msg.sender == admin || isGuardian[msg.sender]);

        _refreshDailyWindow();
        if (requestTime >= dayStart && spentToday >= amount) {
            spentToday -= amount;
        }

        emit PaymentQueueCancelled(queueIndex, msg.sender);
    }

    /// @notice Propose a new large-payment threshold (timelocked).
    /// @param _threshold _threshold
    function setLargePaymentThreshold(uint256 _threshold) external onlyAdmin {
        uint64 executeAfter = ICardBoundVaultPaymentQueueManager(paymentQueueManager)
            .setLargePaymentThreshold(_threshold, SENSITIVE_ADMIN_DELAY);
        emit LargePaymentThresholdProposed(_threshold, executeAfter);
    }

    /// @notice Apply a pending large-payment threshold change.
    function applyLargePaymentThreshold() external onlyAdmin {
        (uint256 oldThreshold, uint256 newThreshold) = ICardBoundVaultPaymentQueueManager(paymentQueueManager)
            .applyLargePaymentThreshold();
        emit LargePaymentThresholdSet(oldThreshold, newThreshold);
    }

    /// @notice Cancel a pending large-payment threshold change (R77: completes apply+cancel symmetry).
    /// @dev Delegates to PaymentQueueManager.cancelLargePaymentThreshold().
    function cancelLargePaymentThreshold() external onlyAdmin {
        (uint256 threshold, uint64 executeAfter) = ICardBoundVaultPaymentQueueManager(paymentQueueManager)
            .cancelLargePaymentThreshold();
        emit LargePaymentThresholdCancelled(threshold, executeAfter);
    }
    // ═══════════════════════════════════════════════════════════════
    //  WITHDRAWAL QUEUE — Large transfer protection
    // ═══════════════════════════════════════════════════════════════

    /// @notice Configure the threshold above which transfers are queued.
    /// @param _threshold Amount in VFIDE (with decimals). Set to 0 to disable queueing.
    /// @dev Example: 1000e18 = transfers of 1000+ VFIDE require a 7-day wait.
    function setLargeTransferThreshold(uint256 _threshold) external onlyAdmin {
        if (_guardianSetupComplete()) {
            IAdminManager(adminManager).proposeLargeTransferThreshold(_threshold);
            emit LargeTransferThresholdChangeProposed(_threshold, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
            return;
        }

        largeTransferThreshold = _threshold;
        emit LargeTransferThresholdSet(_threshold);
    }

    /// @notice applyLargeTransferThresholdChange
    function applyLargeTransferThresholdChange() external onlyAdmin {
        uint256 threshold = IAdminManager(adminManager).applyLargeTransferThreshold();
        largeTransferThreshold = threshold;
        emit LargeTransferThresholdSet(threshold);
    }

    /// @notice cancelLargeTransferThresholdChange
    function cancelLargeTransferThresholdChange() external onlyAdmin {
        IAdminManager(adminManager).cancelLargeTransferThreshold();
        emit LargeTransferThresholdChangeCancelled();
    }

    // slither-disable-start reentrancy-no-eth
    /// @notice Execute a previously queued large withdrawal after the delay period.
    /// @param queueIndex Index in the withdrawal queue.
    function executeQueuedWithdrawal(uint256 queueIndex)
        external
        nonReentrant
        whenNotPaused
    {
        // slither-disable-next-line reentrancy-no-eth  // function has nonReentrant guard; queue manager is trusted internal module
        _requireOperationalForOutboundTransfers();
        if (msg.sender != admin) revert CBV_NotAdmin();

        (address toVault, uint256 amount) = ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager)
            .executeQueuedWithdrawal(queueIndex, true);

        // Apply daily limit at execution time as an additional guard.
        _refreshDailyWindow();
        if (spentToday + amount > dailyTransferLimit) revert CBV_DailyLimit();

        _enforceSeerAction(admin, 0, amount, toVault);

        spentToday += amount;

        // C-7 FIX: Prevent queued withdrawal to an unguarded vault that would breach cap.
        if (!ICardBoundVaultView(toVault).canReceiveTransfer(amount)) revert CBV_ReceiverNeedsGuardian();

        IERC20(vfideToken).safeTransfer(toVault, amount);

        emit WithdrawalExecuted(queueIndex, toVault, amount);
        _logTransfer(toVault, amount);
    }
    // slither-disable-end reentrancy-no-eth

    /// @notice Cancel a queued withdrawal. Callable by admin OR any guardian.
    /// @param queueIndex Index in the withdrawal queue.
    /// @dev Guardians can cancel — this is the critical protection. If keys are stolen
    ///      and the thief queues a large withdrawal, a guardian can cancel it during
    ///      the 7-day waiting period.
    function cancelQueuedWithdrawal(uint256 queueIndex) external {
        if (msg.sender != admin && !isGuardian[msg.sender]) revert CBV_NotGuardian();
        (uint64 requestTime, uint256 amount) = ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager)
            .cancelQueuedWithdrawal(queueIndex, true);

        // H-02 FIX: Refund spentToday if the cancellation is within the same daily window
        // as the queue time, so the owner is not rate-limited for a transfer that never occurred.
        if (requestTime >= dayStart && spentToday >= amount) {
            spentToday -= amount;
        }

        emit WithdrawalCancelled(queueIndex, msg.sender);
    }

    /// @notice View all pending (not executed, not cancelled) queued withdrawals.
    /// @return indices indices
    /// @return amounts amounts
    /// @return executeAfters executeAfters
    function getPendingQueuedWithdrawals()
        external view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters)
    {
        // slither-disable-next-line unused-return  // forwarding tuple return; values are returned to caller
        return ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager).getPendingQueuedWithdrawals();
    }

    /// @notice _queueWithdrawal
    /// @param toVault toVault
    /// @param amount amount
    /// @param intentNonce intentNonce
    function _queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce) internal {
        (uint256 queueIndex, uint64 executeAfter) = ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager)
            .queueWithdrawal(toVault, amount, intentNonce);
        emit WithdrawalQueued(queueIndex, toVault, amount, executeAfter);
    }

    /// @notice _validateApprovalAmount
    /// @param amount amount
    function _validateApprovalAmount(uint256 amount) internal view {
        if (amount > dailyTransferLimit) revert CBV_TransferLimit();
    }

    /// @notice Return EIP-712 domain separator used for transfer intent signing.
    /// @return _bytes32 _bytes32
    function domainSeparator() public view returns (bytes32) {
        return _domainSeparator;
    }

    /// @notice Compute typed-data transfer digest for a transfer intent.
    /// @param intent Transfer intent payload.
    /// @return _bytes32 _bytes32
    function transferDigest(TransferIntent calldata intent) external view returns (bytes32) {
        return _transferDigest(intent);
    }

    /// @notice Compute typed-data digest for a pay intent.
    /// @param intent Pay intent payload.
    /// @return _bytes32 _bytes32
    function payDigest(PayIntent calldata intent) external view returns (bytes32) {
        return _payDigest(intent);
    }

    /// @notice Phase 3d Turn 3 — companion view to fundEscrowDigest for off-chain signers.
    /// @param intent intent
    /// @return _bytes32 _bytes32
    function fundEscrowDigest(EscrowFundIntent calldata intent) external view returns (bytes32) {
        return _fundEscrowDigest(intent);
    }

    /// @notice Return remaining daily transfer capacity under current spend limits.
    /// @return _uint256 _uint256
    function viewRemainingDailyCapacity() external view returns (uint256) {
        if (block.timestamp >= dayStart + 1 days) {
            return dailyTransferLimit;
        }
        if (spentToday >= dailyTransferLimit) {
            return 0;
        }
        return dailyTransferLimit - spentToday;
    }

    /// @notice _refreshDailyWindow
    function _refreshDailyWindow() internal {
        if (block.timestamp >= dayStart + 1 days) {
            dayStart = uint64(block.timestamp);
            spentToday = 0;
        }
    }

    /// @notice _recoverSigner
    /// @param digest digest
    /// @param signature signature
    function _recoverSigner(bytes32 digest, bytes calldata signature)
        internal
        pure
        returns (address)
    {
        if (signature.length != 65) revert CBV_InvalidSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;
        // audit-ok(assembly): Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v != 27 && v != 28) revert CBV_InvalidSignature();
        if (uint256(s) > ECDSA_S_UPPER_BOUND) revert CBV_InvalidSignature();

        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert CBV_InvalidSignature();
        return recovered;
    }

    /// @notice _recoverTransferSigner
    /// @param intent intent
    /// @param signature signature
    function _recoverTransferSigner(TransferIntent calldata intent, bytes calldata signature)
        internal
        view
        returns (address)
    {
        return _recoverSigner(_transferDigest(intent), signature);
    }

    /// @notice _recoverPaySigner
    /// @param intent intent
    /// @param signature signature
    function _recoverPaySigner(PayIntent calldata intent, bytes calldata signature)
        internal
        view
        returns (address)
    {
        return _recoverSigner(_payDigest(intent), signature);
    }

    /// @notice Phase 3d Turn 3 — escrow-fund-intent signer recovery. Uses the same ECDSA machinery
    ///         as _recoverPaySigner; the only difference is which typed-data digest is verified.
    /// @param intent intent
    /// @param signature signature
    function _recoverFundEscrowSigner(EscrowFundIntent calldata intent, bytes calldata signature)
        internal
        view
        returns (address)
    {
        return _recoverSigner(_fundEscrowDigest(intent), signature);
    }

    /// @notice _transferDigest
    /// @param intent intent
    /// @return _bytes32 _bytes32
    function _transferDigest(TransferIntent calldata intent) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_INTENT_TYPEHASH,
                intent.vault,
                intent.toVault,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    /// @notice _payDigest
    /// @param intent intent
    /// @return _bytes32 _bytes32
    function _payDigest(PayIntent calldata intent) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                PAY_INTENT_TYPEHASH,
                intent.vault,
                intent.merchantPortal,
                intent.token,
                intent.merchant,
                intent.recipient,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    /// @notice Phase 3d Turn 3 — typed-data digest for EscrowFundIntent. Distinct from
    ///         _payDigest via separate typehash; cross-replay between intent types is impossible.
    /// @param intent intent
    /// @return _bytes32 _bytes32
    function _fundEscrowDigest(EscrowFundIntent calldata intent) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ESCROW_FUND_INTENT_TYPEHASH,
                intent.vault,
                intent.escrowContract,
                intent.escrowId,
                intent.token,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    /// @notice _logPayment
    /// @param recipient recipient
    /// @param amount amount
    function _logPayment(address recipient, uint256 amount) internal {
        if (address(ledger) != address(0)) {
            try ledger.logTransfer(address(this), recipient, amount, "merchant_pay") {} catch {}
        }
    }

    /// @notice _emitRecoverySplitReminder
    /// @param wallet wallet
    function _emitRecoverySplitReminder(address wallet) internal {
        if (!recoveryAdminUnseparated || recoveryUnseparatedSince == 0) {
            return;
        }

        uint64 daysSince = (uint64(block.timestamp) - recoveryUnseparatedSince) / 1 days;
        // SLITHER FALSE POSITIVE (weak-prng): block.timestamp modulo 7 here is a
        // deterministic time-based gate ("emit a reminder once per week") used
        // exclusively to decide whether to emit a notification event. There is
        // no randomness, no value transfer, and no security decision keyed on
        // this value. A miner manipulating timestamp by ~15s cannot affect the
        // weekly cadence in any meaningful way.
        // slither-disable-next-line weak-prng
        if (daysSince >= 7 && daysSince % 7 == 0) {
            emit RecoverySplitReminderEmitted(wallet, daysSince);
        }
    }

    /// @notice _logTransfer
    /// @param toVault toVault
    /// @param amount amount
    function _logTransfer(address toVault, uint256 amount) internal {
        if (address(ledger) != address(0)) {
            try ledger.logTransfer(address(this), toVault, amount, "vault_to_vault") {} catch {}
        }
    }

    /// @notice _enforceSeerAction
    /// @param subject subject
    /// @param action action
    /// @param amount amount
    /// @param counterparty counterparty
    function _enforceSeerAction(address subject, uint8 action, uint256 amount, address counterparty) internal {
        if (address(seerAutonomous) == address(0)) return;
        try seerAutonomous.beforeAction(subject, action, amount, counterparty) returns (uint8 r) {
            if (r != 0) revert CBV_SeerBlocked();
        } catch {
            // SEER-04 FIX (#179): Hook outages must not brick vault operations.
            emit ExternalCallFailed("seerAutonomous.beforeAction");
            return;
        }
    }

    /// @notice Rescue accidentally sent native token; vault custody remains token-based.
    /// @param to to
    /// @param amount amount
    function rescueNative(address payable to, uint256 amount) external onlyAdmin {
        if (to == address(0)) revert CBV_Zero();
        IAdminManager(adminManager).proposeNativeRescue(to, amount);
        emit NativeRescueProposed(to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    /// @notice applyRescueNative
    function applyRescueNative() external onlyAdmin nonReentrant {
        (address payable to, uint256 amount) = IAdminManager(adminManager).applyNativeRescue();

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert CBV_TransferFailed();
        emit NativeRescue(to, amount);
    }

    /// @notice cancelRescueNative
    function cancelRescueNative() external onlyAdmin {
        (address payable to, uint256 amount) = IAdminManager(adminManager).cancelNativeRescue();
        emit NativeRescueCancelled(to, amount);
    }

    /// @notice rescueERC20
    /// @param token token
    /// @param to to
    /// @param amount amount
    function rescueERC20(address token, address to, uint256 amount) external onlyAdmin {
        if (to == address(0)) revert CBV_Zero();
        if (token == vfideToken) revert CBV_InvalidToken();
        IAdminManager(adminManager).proposeERC20Rescue(token, to, amount);
        emit ERC20RescueProposed(token, to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    /// @notice applyRescueERC20
    function applyRescueERC20() external onlyAdmin nonReentrant {
        (address token, address to, uint256 amount) = IAdminManager(adminManager).applyERC20Rescue();
        IERC20(token).safeTransfer(to, amount);
    }

    /// @notice cancelRescueERC20
    function cancelRescueERC20() external onlyAdmin {
        (address token, address to, uint256 amount) = IAdminManager(adminManager).cancelERC20Rescue();
        emit ERC20RescueCancelled(token, to, amount);
    }

    // ═══════════════════════════════════════════════════════════════
    //  GUARDIAN-APPROVED RECOVERY ROTATION
    // ═══════════════════════════════════════════════════════════════

    /// @notice RecoveryRotationExecuted
    /// @param oldWallet oldWallet
    /// @param newWallet newWallet
    /// @param oldAdmin oldAdmin
    /// @param newAdmin newAdmin
    event RecoveryRotationExecuted(address indexed oldWallet, address indexed newWallet, address indexed oldAdmin, address newAdmin);

    /// @notice executeRecoveryRotation
    /// @param newWallet newWallet
    function executeRecoveryRotation(address newWallet) external {
        if (msg.sender != hub) revert CBV_OnlyHub();
        if (newWallet == address(0)) revert CBV_Zero();
        _requireOperationalForOutboundTransfers();

        // VAULT-EXT-02: Hub-triggered recovery must be pre-approved by vault guardians.
        WalletRotation memory staged = pendingRotation;
        if (staged.newWallet != newWallet) revert CBV_InvalidRecoveryRotation();
        if (staged.approvals < guardianThreshold) revert CBV_RotationInsufficientApprovals();
        if (staged.activateAt == 0 || block.timestamp < staged.activateAt) revert CBV_RotationNotReady();

        address oldWallet = activeWallet;
        address oldAdmin = admin;

        activeWallet = newWallet;
        ++walletEpoch;
        admin = newWallet;
        pendingAdmin = address(0);
        paused = true;

        recoveryAdminUnseparated = true;
        recoveryUnseparatedSince = uint64(block.timestamp);

        // N-H6/N-H10 FIX: Recovery rotation must clear ALL sensitive queued state so the
        // new admin cannot accidentally apply stale operations approved under the old wallet.
        delete pendingRotation;
        IAdminManager(adminManager).clearOnRecovery();
        ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager).clearOnRecovery();
        ICardBoundVaultPaymentQueueManager(paymentQueueManager).clearOnRecovery();
        pauseUntil = uint64(block.timestamp + MAX_PAUSE_WINDOW);

        // R-8: Signal to frontends that recovery just completed. We deliberately
        // do NOT clear guardian or trustee state — the new owner needs an
        // immediate recovery path themselves, and forcing re-designation right
        // after a stressful event is poor UX. The frontend should use this
        // event to prompt the user to review their trust graph at their leisure
        // (the user might want to remove a trustee who exercised the recovery,
        // for instance, but that's their choice not the protocol's).
        emit RecoveryReviewPrompt(newWallet, guardianCount, trusteeCount);

        emit RecoveryRotationExecuted(oldWallet, newWallet, oldAdmin, newWallet);
        emit WalletRotated(oldWallet, newWallet, walletEpoch);
        emit AdminTransferred(oldAdmin, newWallet);
        emit RecoveryAdminUnseparated(newWallet, uint64(block.timestamp));
        emit PauseSet(true, msg.sender);
    }

    // slither-disable-next-line missing-zero-check  // address(0) is a valid value to detach inheritance manager
    /// @notice setInheritanceManager
    /// @param manager manager
    function setInheritanceManager(address manager) external onlyAdmin {
        inheritanceManager = manager;
    }

    /// @notice pendingRecoveryRotation
    /// @return _bool _bool
    function pendingRecoveryRotation() external view returns (bool) {
        return pendingRotation.newWallet != address(0);
    }

    /// @notice activeQueuedWithdrawals
    /// @return _uint8 _uint8
    function activeQueuedWithdrawals() external view returns (uint8) {
        return ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager).activeQueuedWithdrawals();
    }

    /// @notice proposeInheritanceConfig
    /// @param heirGuardians heirGuardians
    /// @param heirCommitments heirCommitments
    function proposeInheritanceConfig(address[] calldata heirGuardians, bytes32[] calldata heirCommitments) external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).proposeInheritanceConfig(msg.sender, heirGuardians, heirCommitments);
    }

    /// @notice confirmInheritanceConfig
    function confirmInheritanceConfig() external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).confirmInheritanceConfig(msg.sender);
    }

    /// @notice cancelInheritanceConfigChange
    function cancelInheritanceConfigChange() external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).cancelInheritanceConfigChange(msg.sender);
    }

    /// @notice clearAllHeirs
    function clearAllHeirs() external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).clearAllHeirs(msg.sender);
    }

    /// @notice setProofOfLifeWallet
    /// @param polWallet polWallet
    function setProofOfLifeWallet(address polWallet) external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).setProofOfLifeWallet(msg.sender, polWallet);
    }

    /// @notice R-3 — Register the DAO guardian for this vault. Once set, that
    ///         address cannot initiate inheritance claims (only veto).
    /// @param dao dao
    function setDAOGuardian(address dao) external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).setDAOGuardian(msg.sender, dao);
    }

    /// @notice R-1 — Guardian votes to cancel the active pending heir-config
    ///         proposal. Reaching the vault's current guardian threshold
    ///         clears the proposal. Backstop for owner-key compromise.
    function cancelInheritanceConfigChangeByGuardians() external onlyGuardian {
        ICardBoundVaultInheritanceManager(inheritanceManager).cancelInheritanceConfigChangeByGuardians(msg.sender);
    }

    /// @notice initiateInheritanceClaim
    /// @param reasonHash reasonHash
    function initiateInheritanceClaim(bytes32 reasonHash) external onlyGuardian {
        ICardBoundVaultInheritanceManager(inheritanceManager).initiateInheritanceClaim(msg.sender, reasonHash);
    }

    /// @notice vetoInheritanceClaim
    function vetoInheritanceClaim() external onlyGuardian {
        ICardBoundVaultInheritanceManager(inheritanceManager).vetoInheritanceClaim(msg.sender);
    }

    /// @notice ownerOverrideClaim
    function ownerOverrideClaim() external {
        ICardBoundVaultInheritanceManager(inheritanceManager).ownerOverrideClaim(msg.sender);
    }

    /// @notice claimHeirShare
    /// @param heirSecret heirSecret
    /// @param basisPoints basisPoints
    function claimHeirShare(bytes32 heirSecret, uint256 basisPoints) external nonReentrant {
        ICardBoundVaultInheritanceManager(inheritanceManager).claimHeirShare(msg.sender, heirSecret, basisPoints);
    }

    /// @notice Emitted when finalizeInheritanceDistribution settles the
    ///         vault's local timelocked obligations. External obligations
    ///         (escrows, term loans, subscriptions) remain in their respective
    ///         contracts — see VFIDE_INHERITANCE_THREAT_MODEL.md R-4.
    /// @param withdrawalsCancelled withdrawalsCancelled
    /// @param paymentsCancelled paymentsCancelled
    event LocalObligationsCancelled(
        uint256 withdrawalsCancelled,
        uint256 paymentsCancelled
    );

    /// @notice Finalize the inheritance distribution.
    ///
    /// Three-step sequence:
    ///   1. Cancel all local timelocked obligations on the vault so the
    ///      balance reflects what's actually available for distribution.
    ///      We reuse `clearOnRecovery` on each sub-manager because
    ///      inheritance has identical "abandon pending state" semantics as
    ///      recovery — the admin is gone and no queued operation should
    ///      auto-apply post-mortem.
    ///   2. Emit a precise event with the cleared counts.
    ///   3. Delegate to the inheritance manager for the distribution math.
    ///
    /// External obligations (escrows, term loans, subscriptions) are NOT
    /// force-settled here. They remain in their respective contracts; the
    /// vault's outbound-transfer guard ensures funds cannot leak from the
    /// vault while inheritance is in flight, but it does not unwind
    /// existing positions. v1.1 will add cross-contract settlement hooks.
    /// Documented as residual risk R-4 in the threat model.
    function finalizeInheritanceDistribution() external {
        // Read counts BEFORE clearing so the event reflects what was cancelled.
        uint256 withdrawalsCount =
            ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager).activeQueuedWithdrawals();
        uint256 paymentsCount =
            ICardBoundVaultPaymentQueueManager(paymentQueueManager).activeQueuedPayments();

        IAdminManager(adminManager).clearOnRecovery();
        ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager).clearOnRecovery();
        ICardBoundVaultPaymentQueueManager(paymentQueueManager).clearOnRecovery();

        emit LocalObligationsCancelled(withdrawalsCount, paymentsCount);

        ICardBoundVaultInheritanceManager(inheritanceManager).finalizeInheritanceDistribution();
    }

    /// @notice withdrawFinalHeirPayout
    function withdrawFinalHeirPayout() external nonReentrant {
        // slither-disable-next-line unused-return  // 2nd & 3rd tuple elements (lastClaimedAt, totalClaimed) intentionally ignored
        (uint256 amount,,) = ICardBoundVaultInheritanceManager(inheritanceManager).consumeHeirPayout(msg.sender);
        address heirVault = IVaultHub(hub).ensureVault(msg.sender);
        IERC20(vfideToken).safeTransfer(heirVault, amount);
    }

    /// @notice cleanupMemorialVault
    function cleanupMemorialVault() external {
        ICardBoundVaultInheritanceManager(inheritanceManager).cleanupMemorialVault();
    }

    /// @notice inheritanceState
    /// @return state state
    /// @return windowEnd windowEnd
    function inheritanceState() external view returns (uint8 state, uint64 windowEnd) {
        // slither-disable-next-line unused-return  // forwarding tuple return; values are returned to caller
        return ICardBoundVaultInheritanceManager(inheritanceManager).inheritanceState();
    }

    /// @notice inheritanceConfigVersion
    /// @return _uint64 _uint64
    function inheritanceConfigVersion() external view returns (uint64) {
        return ICardBoundVaultInheritanceManager(inheritanceManager).inheritanceConfigVersion();
    }

    /// @notice _requireOperationalForOutboundTransfers
    function _requireOperationalForOutboundTransfers() internal view {
        // slither-disable-next-line unused-return  // 2nd tuple element (windowEnd) intentionally ignored — only state matters here
        (uint8 state,) = ICardBoundVaultInheritanceManager(inheritanceManager).inheritanceState();
        if (state != 0) revert CBV_InheritanceActive();
    }

    /// @notice receive
    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }
}
