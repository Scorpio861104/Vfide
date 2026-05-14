// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";
import "./CardBoundVaultPaymentQueueManager.sol";
import "./CardBoundVaultWithdrawalQueueManager.sol";
import "./CardBoundVaultInheritanceManager.sol";
import "./CardBoundVaultAdminManager.sol";

interface IVaultHubGuardianSetup {
    function guardianSetupComplete(address vault) external view returns (bool);
    function invalidateGuardianSetup(address vault) external;
}

/// @dev C-7 FIX: Minimal interface for checking if a peer vault can accept an incoming transfer.
interface ICardBoundVaultView {
    function canReceiveTransfer(uint256 amount) external view returns (bool);
}

interface ISeerAutonomousVault {
    function beforeAction(address subject, uint8 action, uint256 amount, address counterparty) external returns (uint8);
}

interface IAdminManager {
    function proposeGuardianChange(address guardian, bool active) external;
    function applyGuardianChange() external returns (address guardian, bool active);
    function cancelGuardianChange() external returns (address guardian, bool active);
    function proposeSpendLimits(uint256 maxPerTransfer, uint256 dailyTransferLimit) external;
    function applySpendLimits() external returns (uint256 maxPerTransfer, uint256 dailyTransferLimit);
    function cancelSpendLimits() external;
    function proposeLargeTransferThreshold(uint256 threshold) external;
    function applyLargeTransferThreshold() external returns (uint256 threshold);
    function cancelLargeTransferThreshold() external;
    function proposeNativeRescue(address payable to, uint256 amount) external;
    function applyNativeRescue() external returns (address payable to, uint256 amount);
    function cancelNativeRescue() external returns (address payable to, uint256 amount);
    function proposeERC20Rescue(address token, address to, uint256 amount) external;
    function applyERC20Rescue() external returns (address token, address to, uint256 amount);
    function cancelERC20Rescue() external returns (address token, address to, uint256 amount);
    function proposeTokenApproval(address token, address spender, uint256 amount) external;
    function applyTokenApproval() external returns (address token, address spender, uint256 amount);
    function cancelTokenApproval() external returns (address token, address spender, uint256 amount);
    function clearOnRecovery() external;
    function pendingGuardianChange() external view returns (address guardian, bool active, uint64 effectiveAt);
    function pendingSpendLimitChange() external view returns (uint256 value1, uint256 value2, uint64 executeAfter);
    function pendingLargeTransferThresholdChange() external view returns (uint256 value, uint64 executeAfter);
    function pendingNativeRescue() external view returns (address addr, uint256 amount, uint64 executeAfter);
    function pendingERC20Rescue() external view returns (address token, address to, uint256 amount, uint64 executeAfter);
    function pendingTokenApproval() external view returns (address token, address spender, uint256 amount, uint64 executeAfter);
}

interface ICardBoundVaultInheritanceManager {
    function inheritanceState() external view returns (uint8 state, uint64 windowEnd);
    function proposeInheritanceConfig(address actor, address[] calldata heirGuardians, bytes32[] calldata heirCommitments) external;
    function confirmInheritanceConfig(address actor) external;
    function cancelInheritanceConfigChange(address actor) external;
    function clearAllHeirs(address actor) external;
    function setProofOfLifeWallet(address actor, address polWallet) external;
    function initiateInheritanceClaim(address actor, bytes32 reasonHash) external;
    function vetoInheritanceClaim(address actor) external;
    function ownerOverrideClaim(address actor) external;
    function claimHeirShare(address actor, bytes32 heirSecret, uint256 basisPoints) external;
    function finalizeInheritanceDistribution() external;
    function consumeHeirPayout(address actor) external returns (uint256 amount, uint256 finalBasisPoints, bool completed);
    function cleanupMemorialVault() external;
    function heirCount() external view returns (uint8);
    function inheritanceConfigVersion() external view returns (uint64);
    function hasVetoedClaim(address guardian) external view returns (bool);
    function hasRevealedClaim(address claimant) external view returns (bool);
    function isClaimedHash(bytes32 heirHash) external view returns (bool);
}

interface ICardBoundVaultPaymentQueueManager {
    function largePaymentThreshold() external view returns (uint256);
    function activeQueuedPayments() external view returns (uint8);
    function pendingLargePaymentThresholdChange() external view returns (uint256 threshold, uint64 executeAfter);
    function queueLength() external view returns (uint256);
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
    function queuePayment(address token, address merchant, address recipient, uint256 amount, uint256 intentNonce)
        external
        returns (uint256 queueIndex, uint64 executeAfter);
    function executeQueuedPayment(uint256 queueIndex, bool isAdmin)
        external
        returns (address token, address recipient, uint256 amount);
    function cancelQueuedPayment(uint256 queueIndex, bool authorized)
        external
        returns (uint64 requestTime, uint256 amount);
    function setLargePaymentThreshold(uint256 threshold, uint64 delay) external returns (uint64 executeAfter);
    function applyLargePaymentThreshold() external returns (uint256 oldThreshold, uint256 newThreshold);
    function clearOnRecovery() external;
}

interface ICardBoundVaultWithdrawalQueueManager {
    function activeQueuedWithdrawals() external view returns (uint8);
    function queueLength() external view returns (uint256);
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
    function getPendingQueuedWithdrawals()
        external
        view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters);
    function getPendingQueuedWithdrawalsPaged(uint256 start, uint256 limit)
        external
        view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters);
    function queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce)
        external
        returns (uint256 queueIndex, uint64 executeAfter);
    function executeQueuedWithdrawal(uint256 queueIndex, bool isAdmin)
        external
        returns (address toVault, uint256 amount);
    function cancelQueuedWithdrawal(uint256 queueIndex, bool authorized)
        external
        returns (uint64 requestTime, uint256 amount);
    function clearOnRecovery() external;
}

/**
 * @title CardBoundVault
 * @notice Active vault implementation — wallet is authorization-only (ATM-card model).
 *         Deployed via VaultHub.ensureVault() using CREATE2.
 * @dev Funds are always moved vault-to-vault. Wallet never holds custody.
 *      M-21: This is the primary vault. UserVaultLegacy in VaultInfrastructure.sol
 *      is retained only for backward compatibility with existing deployments.
 */
contract CardBoundVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    string private constant NAME = "CardBoundVault";
    string private constant VERSION = "1";

    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant TRANSFER_INTENT_TYPEHASH = keccak256(
        "TransferIntent(address vault,address toVault,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)"
    );
    bytes32 private constant PAY_INTENT_TYPEHASH = keccak256(
        "PayIntent(address vault,address merchantPortal,address token,address merchant,address recipient,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)"
    );

    // secp256k1n / 2
    uint256 private constant ECDSA_S_UPPER_BOUND =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    uint64 public constant MIN_ROTATION_DELAY = 10 minutes;
    uint64 public constant MAX_ROTATION_DELAY = 7 days;
    uint64 public constant SENSITIVE_ADMIN_DELAY = 7 days;
    uint8 public constant MAX_GUARDIANS = 20;

    address public immutable hub;
    address public immutable vfideToken;
    IProofLedger public immutable ledger;
    bytes32 private immutable _domainSeparator;
    ISeerAutonomousVault public seerAutonomous;

    // H4 FIX: Track when recovery leaves admin == activeWallet so the user can
    // restore cold/hot key separation after regaining control.
    bool public recoveryAdminUnseparated;
    uint64 public recoveryUnseparatedSince;

    address public admin;
    address public pendingAdmin;
    address public activeWallet;

    uint64 public walletEpoch;
    uint256 public nextNonce;

    bool public paused;
    uint64 public pauseUntil;
    uint64 public constant MAX_PAUSE_WINDOW = 7 days;
    uint256 public pauseNonce;
    mapping(address => mapping(uint256 => bool)) public pauseApprovalByGuardian;
    mapping(uint256 => uint8) public pauseApprovalCount;

    mapping(address => bool) public isGuardian;
    mapping(address => uint64) public guardianAddedAt;
    uint8 public guardianCount;
    uint8 public guardianThreshold;

    uint64 public constant GUARDIAN_MATURITY_PERIOD = 7 days;

    /// @notice C-7 FIX: Maximum VFIDE a vault may hold while guardian setup is incomplete.
    ///         Prevents a user who loses their phone before completing guardian setup from
    ///         losing more than this amount.  50,000 VFIDE (18 decimals).
    uint256 public constant MAX_VFIDE_WITHOUT_GUARDIAN = 50_000e18;

    uint256 public maxPerTransfer;
    uint256 public dailyTransferLimit;
    uint256 public spentToday;
    uint64 public dayStart;

    uint256 public largeTransferThreshold; // Transfers above this get queued
    address public paymentQueueManager;
    address public withdrawalQueueManager;
    address public adminManager;

    struct WalletRotation {
        address newWallet;
        uint64 activateAt;
        uint8 approvals;
        uint256 proposalNonce;
    }

    WalletRotation public pendingRotation;
    uint256 public rotationNonce;
    mapping(address => mapping(uint256 => bool)) public rotationApprovalByGuardian;

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

    event AdminTransferStarted(address indexed oldAdmin, address indexed newAdmin);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event RecoveryAdminUnseparated(address indexed wallet, uint64 since);
    event RecoveryAdminSeparated(address indexed activeWallet, address indexed newAdmin);
    event RecoverySplitReminderEmitted(address indexed wallet, uint64 daysUnseparated);

    event GuardianSet(address indexed guardian, bool active);
    event GuardianThresholdSet(uint8 threshold);
    event GuardianChangeProposed(address indexed guardian, bool active, uint64 effectiveAt);
    event GuardianChangeCancelled(address indexed guardian, bool active);
    event SpendLimitsChangeProposed(uint256 maxPerTransfer, uint256 dailyTransferLimit, uint64 executeAfter);
    event SpendLimitsChangeCancelled();
    event LargeTransferThresholdChangeProposed(uint256 threshold, uint64 executeAfter);
    event LargeTransferThresholdChangeCancelled();
    event ERC20RescueProposed(address indexed token, address indexed to, uint256 amount, uint64 executeAfter);
    event ERC20RescueCancelled(address indexed token, address indexed to, uint256 amount);
    event NativeRescueProposed(address indexed to, uint256 amount, uint64 executeAfter);
    event NativeRescueCancelled(address indexed to, uint256 amount);
    event TokenApprovalProposed(address indexed token, address indexed spender, uint256 amount, uint64 executeAfter);
    event TokenApprovalCancelled(address indexed token, address indexed spender, uint256 amount);

    event WalletRotationProposed(
        address indexed oldWallet,
        address indexed newWallet,
        uint64 activateAt,
        uint256 indexed proposalNonce
    );
    event WalletRotationApproved(address indexed guardian, uint256 indexed proposalNonce, uint8 approvals);
    event GuardianPauseApproved(address indexed guardian, uint256 indexed pauseNonce, uint8 approvals);
    event WalletRotated(address indexed oldWallet, address indexed newWallet, uint64 indexed newEpoch);

    event VaultTransferAuthorized(
        address indexed signer,
        address indexed toVault,
        uint256 amount,
        uint256 indexed nonce,
        uint64 walletEpoch
    );

    event PauseSet(bool paused, address indexed by);
    event SeerAutonomousSet(address indexed seerAutonomous);
    event ExternalCallFailed(string indexed context);
    event SpendLimitsSet(uint256 maxPerTransfer, uint256 dailyTransferLimit);
    event VaultApprove(address indexed spender, uint256 amount);
    event NativeRescue(address indexed to, uint256 amount);
    event NativeReceived(address indexed sender, uint256 amount);

    // Withdrawal queue events
    event WithdrawalQueued(uint256 indexed queueIndex, address indexed toVault, uint256 amount, uint64 executeAfter);
    event WithdrawalExecuted(uint256 indexed queueIndex, address indexed toVault, uint256 amount);
    event WithdrawalCancelled(uint256 indexed queueIndex, address indexed cancelledBy);
    event LargeTransferThresholdSet(uint256 threshold);
    event PaymentQueued(uint256 indexed queueIndex, address indexed token, address indexed merchant, address recipient, uint256 amount, uint64 executeAfter);
    event PaymentQueueExecuted(uint256 indexed queueIndex, address recipient, uint256 amount);
    event PaymentQueueCancelled(uint256 indexed queueIndex, address by);
    event LargePaymentThresholdSet(uint256 oldThreshold, uint256 newThreshold);
    event LargePaymentThresholdProposed(uint256 threshold, uint64 executeAfter);


    /// @notice GUARDIAN-WARN-1: emitted on every outgoing payment/transfer made before the
    /// vault has completed multi-guardian setup. The vault is operationally unprotected
    /// against key compromise during this window. Frontends MUST surface a persistent
    /// banner to the user until guardian setup is complete and indexers MUST track this
    /// event for monitoring/alerting. The MAX_VFIDE_WITHOUT_GUARDIAN cap on incoming
    /// transfers (50K VFIDE) limits peak loss exposure during this window.
    event GuardianSetupIncomplete_Payment(address indexed merchant, address indexed token, uint256 amount);
    event GuardianSetupIncomplete_Transfer(address indexed toVault, uint256 amount);

    error CBV_NotAdmin();
    error CBV_NotGuardian();
    error CBV_Zero();
    error CBV_InvalidThreshold();
    error CBV_Locked();
    error CBV_Paused();
    error CBV_NotVault();
    error CBV_Expired();
    error CBV_InvalidNonce();
    error CBV_InvalidEpoch();
    error CBV_InvalidChain();
    error CBV_InvalidSigner();
    error CBV_InvalidSignature();
    error CBV_TransferLimit();
    error CBV_DailyLimit();
    error CBV_RotationNotReady();
    error CBV_RotationInsufficientApprovals();
    error CBV_NoRotation();
    error CBV_OnlyHub();
    error CBV_TransferFailed();
    error CBV_GuardianSetupRequired();
    error CBV_QueueFull();
    error CBV_QueueInvalidIndex();
    error CBV_QueueNotReady();
    error CBV_QueueAlreadyProcessed();
    error CBV_PauseAlreadyApproved();
    error CBV_SeerBlocked();
    error CBV_NotMerchantPortal();
    error CBV_SameAdmin();
    error CBV_NoSeparationNeeded();
    error CBV_PayIntentInvalid();
    error CBV_PayIntentTokenInvalid(); // H2: intent.token must be vfideToken
    error CBV_PaymentQueueFull();
    error CBV_PaymentQueueInvalidIndex();
    error CBV_PaymentQueueAlreadyProcessed();
    error CBV_PaymentQueueNotReady();
    error CBV_NotAuthorized();
    error CBV_NoPending();
    error CBV_DelayActive();
    error CBV_PendingExists();
    error CBV_UseProposeApply();
    error CBV_InvalidToken();
    error CBV_InvalidRecoveryRotation();
    error CBV_InheritanceActive();
    /// @notice C-7 FIX: Destination vault cannot receive transfer (unguarded and cap would be exceeded).
    error CBV_ReceiverNeedsGuardian();

        /// @notice VAULT-01 FIX: Destination vault code has changed (replaced/self-destructed).
        error CBV_ReceiverChanged();


    modifier onlyAdmin() {
        if (msg.sender != admin) revert CBV_NotAdmin();
        _;
    }

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

        for (uint256 i = 0; i < _guardians.length; i++) {
            address guardian = _guardians[i];
            if (guardian == address(0)) revert CBV_Zero();
            if (!isGuardian[guardian]) {
                isGuardian[guardian] = true;
                guardianAddedAt[guardian] = uint64(block.timestamp);
                guardianCount++;
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
    function splitAdminFromActive(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert CBV_Zero();
        if (newAdmin == activeWallet) revert CBV_SameAdmin();
        if (!recoveryAdminUnseparated) revert CBV_NoSeparationNeeded();
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }

    /// @notice Propose a guardian change with 24-hour timelock (CBV-03)
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

    function _applyGuardianChange(address guardian, bool active) internal {
        if (isGuardian[guardian] == active) return;

        isGuardian[guardian] = active;
        if (active) {
            if (guardianCount >= MAX_GUARDIANS) revert CBV_InvalidThreshold();
            guardianAddedAt[guardian] = uint64(block.timestamp);
            guardianCount++;
        } else {
            delete guardianAddedAt[guardian];
            guardianCount--;
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

    function applySpendLimits() external onlyAdmin {
        (uint256 maxPT, uint256 dailyTL) = IAdminManager(adminManager).applySpendLimits();
        maxPerTransfer = maxPT;
        dailyTransferLimit = dailyTL;
        emit SpendLimitsSet(maxPT, dailyTL);
    }

    function cancelSpendLimitsChange() external onlyAdmin {
        IAdminManager(adminManager).cancelSpendLimits();
        emit SpendLimitsChangeCancelled();
    }

    function setSeerAutonomous(address _seerAutonomous) external onlyAdmin {
        seerAutonomous = ISeerAutonomousVault(_seerAutonomous);
        emit SeerAutonomousSet(_seerAutonomous);
    }

    /// @notice C-7 FIX: Returns true if this vault can receive `amount` more VFIDE without
    ///         guardian setup complete.  Once guardian setup is done the cap is lifted.
    function canReceiveTransfer(uint256 amount) external view returns (bool) {
        if (_guardianSetupComplete()) return true;
        uint256 currentBalance = IERC20(vfideToken).balanceOf(address(this));
        return currentBalance + amount <= MAX_VFIDE_WITHOUT_GUARDIAN;
    }

    function isGuardianMature(address guardian) external view returns (bool) {
        uint64 addedAt = guardianAddedAt[guardian];
        return addedAt != 0 && block.timestamp >= addedAt + GUARDIAN_MATURITY_PERIOD;
    }

    // slither-disable-next-line reentrancy-events
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
    event ERC20Approve(address indexed token, address indexed spender, uint256 amount);

    // slither-disable-next-line reentrancy-events
    function approveERC20(address token, address spender, uint256 amount) external onlyAdmin whenNotPaused {
        if (token == vfideToken) revert CBV_InvalidToken();
        if (spender == address(0)) revert CBV_Zero();
        if (token == address(0)) revert CBV_Zero();
        _validateApprovalAmount(amount);
        IAdminManager(adminManager).proposeTokenApproval(token, spender, amount);
        emit TokenApprovalProposed(token, spender, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    // slither-disable-next-line reentrancy-events
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

        rotationNonce++;
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
        walletEpoch += 1;

        delete pendingRotation;
        emit WalletRotated(oldWallet, activeWallet, walletEpoch);
    }

    // ── __forceSetOwner REMOVED ───────────────────────────────
    // No external entity can reassign vault ownership. Recovery
    // is ONLY through the user's own guardians via wallet rotation
    // or VaultRecoveryClaim. This makes the vault truly non-custodial.
    // ─────────────────────────────────────────────────────────

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

        nextNonce += 1;

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

        nextNonce += 1;
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

    /// @notice Execute a queued payment after the 7-day delay (admin only).
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

    function applyLargeTransferThresholdChange() external onlyAdmin {
        uint256 threshold = IAdminManager(adminManager).applyLargeTransferThreshold();
        largeTransferThreshold = threshold;
        emit LargeTransferThresholdSet(threshold);
    }

    function cancelLargeTransferThresholdChange() external onlyAdmin {
        IAdminManager(adminManager).cancelLargeTransferThreshold();
        emit LargeTransferThresholdChangeCancelled();
    }

    /// @notice Execute a previously queued large withdrawal after the delay period.
    /// @param queueIndex Index in the withdrawal queue.
    function executeQueuedWithdrawal(uint256 queueIndex)
        external
        nonReentrant
        whenNotPaused
    {
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
    function getPendingQueuedWithdrawals()
        external view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters)
    {
        return ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager).getPendingQueuedWithdrawals();
    }

    function _queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce) internal {
        (uint256 queueIndex, uint64 executeAfter) = ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager)
            .queueWithdrawal(toVault, amount, intentNonce);
        emit WithdrawalQueued(queueIndex, toVault, amount, executeAfter);
    }

    function _validateApprovalAmount(uint256 amount) internal view {
        if (amount > dailyTransferLimit) revert CBV_TransferLimit();
    }

    /// @notice Return EIP-712 domain separator used for transfer intent signing.
    function domainSeparator() public view returns (bytes32) {
        return _domainSeparator;
    }

    /// @notice Compute typed-data transfer digest for a transfer intent.
    /// @param intent Transfer intent payload.
    function transferDigest(TransferIntent calldata intent) external view returns (bytes32) {
        return _transferDigest(intent);
    }

    /// @notice Compute typed-data digest for a pay intent.
    /// @param intent Pay intent payload.
    function payDigest(PayIntent calldata intent) external view returns (bytes32) {
        return _payDigest(intent);
    }

    /// @notice Return remaining daily transfer capacity under current spend limits.
    function viewRemainingDailyCapacity() external view returns (uint256) {
        if (block.timestamp >= dayStart + 1 days) {
            return dailyTransferLimit;
        }
        if (spentToday >= dailyTransferLimit) {
            return 0;
        }
        return dailyTransferLimit - spentToday;
    }

    function _refreshDailyWindow() internal {
        if (block.timestamp >= dayStart + 1 days) {
            dayStart = uint64(block.timestamp);
            spentToday = 0;
        }
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature)
        internal
        pure
        returns (address)
    {
        if (signature.length != 65) revert CBV_InvalidSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;
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

    function _recoverTransferSigner(TransferIntent calldata intent, bytes calldata signature)
        internal
        view
        returns (address)
    {
        return _recoverSigner(_transferDigest(intent), signature);
    }

    function _recoverPaySigner(PayIntent calldata intent, bytes calldata signature)
        internal
        view
        returns (address)
    {
        return _recoverSigner(_payDigest(intent), signature);
    }

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

    function _logPayment(address recipient, uint256 amount) internal {
        if (address(ledger) != address(0)) {
            try ledger.logTransfer(address(this), recipient, amount, "merchant_pay") {} catch {}
        }
    }

    function _emitRecoverySplitReminder(address wallet) internal {
        if (!recoveryAdminUnseparated || recoveryUnseparatedSince == 0) {
            return;
        }

        uint64 daysSince = (uint64(block.timestamp) - recoveryUnseparatedSince) / 1 days;
        if (daysSince >= 7 && daysSince % 7 == 0) {
            emit RecoverySplitReminderEmitted(wallet, daysSince);
        }
    }

    function _logTransfer(address toVault, uint256 amount) internal {
        if (address(ledger) != address(0)) {
            try ledger.logTransfer(address(this), toVault, amount, "vault_to_vault") {} catch {}
        }
    }

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
    function rescueNative(address payable to, uint256 amount) external onlyAdmin {
        if (to == address(0)) revert CBV_Zero();
        IAdminManager(adminManager).proposeNativeRescue(to, amount);
        emit NativeRescueProposed(to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    function applyRescueNative() external onlyAdmin nonReentrant {
        (address payable to, uint256 amount) = IAdminManager(adminManager).applyNativeRescue();

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert CBV_TransferFailed();
        emit NativeRescue(to, amount);
    }

    function cancelRescueNative() external onlyAdmin {
        (address payable to, uint256 amount) = IAdminManager(adminManager).cancelNativeRescue();
        emit NativeRescueCancelled(to, amount);
    }

    function rescueERC20(address token, address to, uint256 amount) external onlyAdmin {
        if (to == address(0)) revert CBV_Zero();
        if (token == vfideToken) revert CBV_InvalidToken();
        IAdminManager(adminManager).proposeERC20Rescue(token, to, amount);
        emit ERC20RescueProposed(token, to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    function applyRescueERC20() external onlyAdmin nonReentrant {
        (address token, address to, uint256 amount) = IAdminManager(adminManager).applyERC20Rescue();
        IERC20(token).safeTransfer(to, amount);
    }

    function cancelRescueERC20() external onlyAdmin {
        (address token, address to, uint256 amount) = IAdminManager(adminManager).cancelERC20Rescue();
        emit ERC20RescueCancelled(token, to, amount);
    }

    // ═══════════════════════════════════════════════════════════════
    //  GUARDIAN-APPROVED RECOVERY ROTATION
    // ═══════════════════════════════════════════════════════════════

    event RecoveryRotationExecuted(address indexed oldWallet, address indexed newWallet, address indexed oldAdmin, address newAdmin);

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
        walletEpoch += 1;
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

        emit RecoveryRotationExecuted(oldWallet, newWallet, oldAdmin, newWallet);
        emit WalletRotated(oldWallet, newWallet, walletEpoch);
        emit AdminTransferred(oldAdmin, newWallet);
        emit RecoveryAdminUnseparated(newWallet, uint64(block.timestamp));
        emit PauseSet(true, msg.sender);
    }

    function setInheritanceManager(address manager) external onlyAdmin {
        inheritanceManager = manager;
    }

    function pendingRecoveryRotation() external view returns (bool) {
        return pendingRotation.newWallet != address(0);
    }

    function activeQueuedWithdrawals() external view returns (uint8) {
        return ICardBoundVaultWithdrawalQueueManager(withdrawalQueueManager).activeQueuedWithdrawals();
    }

    function proposeInheritanceConfig(address[] calldata heirGuardians, bytes32[] calldata heirCommitments) external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).proposeInheritanceConfig(msg.sender, heirGuardians, heirCommitments);
    }

    function confirmInheritanceConfig() external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).confirmInheritanceConfig(msg.sender);
    }

    function cancelInheritanceConfigChange() external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).cancelInheritanceConfigChange(msg.sender);
    }

    function clearAllHeirs() external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).clearAllHeirs(msg.sender);
    }

    function setProofOfLifeWallet(address polWallet) external onlyAdmin {
        ICardBoundVaultInheritanceManager(inheritanceManager).setProofOfLifeWallet(msg.sender, polWallet);
    }

    function initiateInheritanceClaim(bytes32 reasonHash) external onlyGuardian {
        ICardBoundVaultInheritanceManager(inheritanceManager).initiateInheritanceClaim(msg.sender, reasonHash);
    }

    function vetoInheritanceClaim() external onlyGuardian {
        ICardBoundVaultInheritanceManager(inheritanceManager).vetoInheritanceClaim(msg.sender);
    }

    function ownerOverrideClaim() external {
        ICardBoundVaultInheritanceManager(inheritanceManager).ownerOverrideClaim(msg.sender);
    }

    function claimHeirShare(bytes32 heirSecret, uint256 basisPoints) external nonReentrant {
        ICardBoundVaultInheritanceManager(inheritanceManager).claimHeirShare(msg.sender, heirSecret, basisPoints);
    }

    function finalizeInheritanceDistribution() external {
        ICardBoundVaultInheritanceManager(inheritanceManager).finalizeInheritanceDistribution();
    }

    function withdrawFinalHeirPayout() external nonReentrant {
        (uint256 amount,,) = ICardBoundVaultInheritanceManager(inheritanceManager).consumeHeirPayout(msg.sender);
        address heirVault = IVaultHub(hub).ensureVault(msg.sender);
        IERC20(vfideToken).safeTransfer(heirVault, amount);
    }

    function cleanupMemorialVault() external {
        ICardBoundVaultInheritanceManager(inheritanceManager).cleanupMemorialVault();
    }

    function inheritanceState() external view returns (uint8 state, uint64 windowEnd) {
        return ICardBoundVaultInheritanceManager(inheritanceManager).inheritanceState();
    }

    function inheritanceConfigVersion() external view returns (uint64) {
        return ICardBoundVaultInheritanceManager(inheritanceManager).inheritanceConfigVersion();
    }

    function _requireOperationalForOutboundTransfers() internal view {
        (uint8 state,) = ICardBoundVaultInheritanceManager(inheritanceManager).inheritanceState();
        if (state != 0) revert CBV_InheritanceActive();
    }

    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }
}
