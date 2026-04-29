// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

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

    string public constant NAME = "CardBoundVault";
    string public constant VERSION = "1";

    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant TRANSFER_INTENT_TYPEHASH = keccak256(
        "TransferIntent(address vault,address toVault,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)"
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
    ISeerAutonomousVault public seerAutonomous;

    address public admin;
    address public pendingAdmin;
    address public activeWallet;

    uint64 public walletEpoch;
    uint256 public nextNonce;

    bool public paused;

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

    // ── Withdrawal Queue (large transfer protection) ────────────
    uint256 public constant WITHDRAWAL_DELAY = 7 days;
    uint8 public constant MAX_QUEUED = 20; // Max pending per vault

    struct QueuedWithdrawal {
        address toVault;
        uint256 amount;
        uint64 requestTime;
        uint64 executeAfter;
        bool executed;
        bool cancelled;
        uint256 intentNonce; // Links back to the signed intent
    }

    QueuedWithdrawal[] public withdrawalQueue;
    uint8 public activeQueuedWithdrawals;
    uint256 public largeTransferThreshold; // Transfers above this get queued

    struct WalletRotation {
        address newWallet;
        uint64 activateAt;
        uint8 approvals;
        uint256 proposalNonce;
    }

    WalletRotation public pendingRotation;
    uint256 public rotationNonce;
    mapping(address => mapping(uint256 => bool)) public rotationApprovalByGuardian;

    // CBV-03: Timelock for guardian changes
    struct PendingGuardianChange {
        address guardian;
        bool active;
        uint64 effectiveAt;
    }
    PendingGuardianChange public pendingGuardianChange;

    struct PendingSpendLimitChange {
        uint256 maxPerTransfer;
        uint256 dailyTransferLimit;
        uint64 executeAfter;
    }

    struct PendingLargeTransferThresholdChange {
        uint256 threshold;
        uint64 executeAfter;
    }

    struct PendingERC20Rescue {
        address token;
        address to;
        uint256 amount;
        uint64 executeAfter;
    }

    struct PendingNativeRescue {
        address payable to;
        uint256 amount;
        uint64 executeAfter;
    }

    struct PendingTokenApproval {
        address token;
        address spender;
        uint256 amount;
        uint64 executeAfter;
    }

    PendingSpendLimitChange public pendingSpendLimitChange;
    PendingLargeTransferThresholdChange public pendingLargeTransferThresholdChange;
    PendingERC20Rescue public pendingERC20Rescue;
    PendingNativeRescue public pendingNativeRescue;
    PendingTokenApproval public pendingTokenApproval;

    struct TransferIntent {
        address vault;
        address toVault;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }

    event AdminTransferStarted(address indexed oldAdmin, address indexed newAdmin);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

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
    event SpendLimitsSet(uint256 maxPerTransfer, uint256 dailyTransferLimit);
    event VaultApprove(address indexed spender, uint256 amount);
    event NativeRescue(address indexed to, uint256 amount);
    event NativeReceived(address indexed sender, uint256 amount);

    // Withdrawal queue events
    event WithdrawalQueued(uint256 indexed queueIndex, address indexed toVault, uint256 amount, uint64 executeAfter);
    event WithdrawalExecuted(uint256 indexed queueIndex, address indexed toVault, uint256 amount);
    event WithdrawalCancelled(uint256 indexed queueIndex, address indexed cancelledBy);
    event LargeTransferThresholdSet(uint256 threshold);

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
    error CBV_SeerBlocked();
    /// @notice C-7 FIX: Destination vault cannot receive transfer (unguarded and cap would be exceeded).
    error CBV_ReceiverNeedsGuardian();

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
        emit AdminTransferred(old, admin);
    }

    /// @notice Propose a guardian change with 24-hour timelock (CBV-03)
    function proposeGuardianChange(address guardian, bool active) external onlyAdmin {
        if (guardian == address(0)) revert CBV_Zero();
        // M-7 FIX: Prevent silently clobbering an existing pending change
        require(pendingGuardianChange.effectiveAt == 0, "CBV: pending change exists");
        pendingGuardianChange = PendingGuardianChange(guardian, active, uint64(block.timestamp) + 1 days);
        emit GuardianChangeProposed(guardian, active, uint64(block.timestamp) + 1 days);
    }

    /// @notice Apply a previously proposed guardian change after timelock expires (CBV-03)
    function applyGuardianChange() external onlyAdmin {
        PendingGuardianChange memory p = pendingGuardianChange;
        if (p.effectiveAt == 0 || block.timestamp < p.effectiveAt) revert CBV_InvalidThreshold();
        delete pendingGuardianChange;
        _applyGuardianChange(p.guardian, p.active);
    }

    /// @notice Cancel a pending guardian change (CBV-03)
    function cancelGuardianChange() external onlyAdmin {
        PendingGuardianChange memory p = pendingGuardianChange;
        delete pendingGuardianChange;
        emit GuardianChangeCancelled(p.guardian, p.active);
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
        require(
            !IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this)),
            "CBV: use propose/apply after setup"
        );
        if (guardian == address(0)) revert CBV_Zero();
        _applyGuardianChange(guardian, active);
    }

    /// @notice Set required guardian approvals for sensitive wallet-rotation actions.
    /// @param threshold New guardian approval threshold.
    /// @dev C-2 FIX: Also gated to bootstrap-only to prevent instant threshold reduction.
    function setGuardianThreshold(uint8 threshold) external onlyAdmin {
        require(
            !IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this)),
            "CBV: use propose/apply after setup"
        );
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
            uint64 executeAfter = uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY;
            pendingSpendLimitChange = PendingSpendLimitChange({
                maxPerTransfer: _maxPerTransfer,
                dailyTransferLimit: _dailyTransferLimit,
                executeAfter: executeAfter
            });
            emit SpendLimitsChangeProposed(_maxPerTransfer, _dailyTransferLimit, executeAfter);
            return;
        }

        maxPerTransfer = _maxPerTransfer;
        dailyTransferLimit = _dailyTransferLimit;
        emit SpendLimitsSet(_maxPerTransfer, _dailyTransferLimit);
    }

    function applySpendLimits() external onlyAdmin {
        PendingSpendLimitChange memory pending = pendingSpendLimitChange;
        if (pending.executeAfter == 0 || block.timestamp < pending.executeAfter) revert CBV_Locked();
        delete pendingSpendLimitChange;
        maxPerTransfer = pending.maxPerTransfer;
        dailyTransferLimit = pending.dailyTransferLimit;
        emit SpendLimitsSet(pending.maxPerTransfer, pending.dailyTransferLimit);
    }

    function cancelSpendLimitsChange() external onlyAdmin {
        delete pendingSpendLimitChange;
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

    /// @notice Approve a spender to pull VFIDE from this vault (e.g., MerchantPortal).
    // slither-disable-next-line reentrancy-events
    function approveVFIDE(address spender, uint256 amount) external onlyAdmin whenNotPaused {
        require(spender != address(0), "CBV: zero spender");
        _validateApprovalAmount(amount);

        // Always queue approvals to avoid instant allowance grants during bootstrap.
        _queueTokenApproval(vfideToken, spender, amount);
    }

    /// @notice F-6 FIX: Approve a spender to pull any ERC20 from this vault.
    /// @dev Required for stablecoin payments through MerchantPortal.
    ///      Cannot approve VFIDE — use approveVFIDE for that.
    event ERC20Approve(address indexed token, address indexed spender, uint256 amount);

    // slither-disable-next-line reentrancy-events
    function approveERC20(address token, address spender, uint256 amount) external onlyAdmin whenNotPaused {
        require(token != vfideToken, "CBV: use approveVFIDE for VFIDE");
        require(spender != address(0), "CBV: zero spender");
        require(token != address(0), "CBV: zero token");
        _validateApprovalAmount(amount);

        // Always queue approvals to avoid instant allowance grants during bootstrap.
        _queueTokenApproval(token, spender, amount);
    }

    // slither-disable-next-line reentrancy-events
    function applyTokenApproval() external onlyAdmin whenNotPaused {
        PendingTokenApproval memory pending = pendingTokenApproval;
        if (pending.executeAfter == 0 || block.timestamp < pending.executeAfter) revert CBV_Locked();

        _validateApprovalAmount(pending.amount);

        delete pendingTokenApproval;
        IERC20(pending.token).forceApprove(pending.spender, pending.amount);

        if (pending.token == vfideToken) {
            emit VaultApprove(pending.spender, pending.amount);
        } else {
            emit ERC20Approve(pending.token, pending.spender, pending.amount);
        }
    }

    function cancelTokenApproval() external onlyAdmin {
        PendingTokenApproval memory pending = pendingTokenApproval;
        delete pendingTokenApproval;
        emit TokenApprovalCancelled(pending.token, pending.spender, pending.amount);
    }

    /// @notice Pause vault operations (admin or guardian emergency control).
    function pause() external {
        if (msg.sender != admin && !isGuardian[msg.sender]) {
            revert CBV_NotGuardian();
        }
        paused = true;
        emit PauseSet(true, msg.sender);
    }

    /// @notice Unpause vault operations (admin only).
    function unpause() external onlyAdmin {
        paused = false;
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
        if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
            revert CBV_GuardianSetupRequired();
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

    // ═══════════════════════════════════════════════════════════════
    //  WITHDRAWAL QUEUE — Large transfer protection
    // ═══════════════════════════════════════════════════════════════

    /// @notice Configure the threshold above which transfers are queued.
    /// @param _threshold Amount in VFIDE (with decimals). Set to 0 to disable queueing.
    /// @dev Example: 1000e18 = transfers of 1000+ VFIDE require a 7-day wait.
    function setLargeTransferThreshold(uint256 _threshold) external onlyAdmin {
        if (_guardianSetupComplete()) {
            uint64 executeAfter = uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY;
            pendingLargeTransferThresholdChange = PendingLargeTransferThresholdChange({
                threshold: _threshold,
                executeAfter: executeAfter
            });
            emit LargeTransferThresholdChangeProposed(_threshold, executeAfter);
            return;
        }

        largeTransferThreshold = _threshold;
        emit LargeTransferThresholdSet(_threshold);
    }

    function applyLargeTransferThresholdChange() external onlyAdmin {
        PendingLargeTransferThresholdChange memory pending = pendingLargeTransferThresholdChange;
        if (pending.executeAfter == 0 || block.timestamp < pending.executeAfter) revert CBV_Locked();
        delete pendingLargeTransferThresholdChange;
        largeTransferThreshold = pending.threshold;
        emit LargeTransferThresholdSet(pending.threshold);
    }

    function cancelLargeTransferThresholdChange() external onlyAdmin {
        delete pendingLargeTransferThresholdChange;
        emit LargeTransferThresholdChangeCancelled();
    }

    /// @notice Execute a previously queued large withdrawal after the delay period.
    /// @param queueIndex Index in the withdrawal queue.
    function executeQueuedWithdrawal(uint256 queueIndex)
        external
        nonReentrant
        whenNotPaused
    {
        if (queueIndex >= withdrawalQueue.length) revert CBV_QueueInvalidIndex();

        QueuedWithdrawal storage w = withdrawalQueue[queueIndex];
        if (w.executed || w.cancelled) revert CBV_QueueAlreadyProcessed();
        if (block.timestamp < w.executeAfter) revert CBV_QueueNotReady();

        // Only admin (vault owner) can execute
        if (msg.sender != admin) revert CBV_NotAdmin();

        // Apply daily limit at execution time as an additional guard.
        // H-5 FIX: spentToday was charged at queue time. Only re-charge if a new daily window
        // started since the withdrawal was queued (indicated by dayStart having advanced past
        // w.requestTime). If still in the same window, the amount is already committed to
        // spentToday and must not be added again.
        // F-48 FIX: Remove unreachable "same window" branch. WITHDRAWAL_DELAY = 7 days
        // guarantees _refreshDailyWindow() always advances dayStart past w.requestTime
        // well before executeAfter is reached. The "same window" path is dead code.
        // Invariant: block.timestamp >= w.executeAfter >= w.requestTime + 7 days,
        //            so dayStart > w.requestTime is always true here.
        _refreshDailyWindow();
        if (spentToday + w.amount > dailyTransferLimit) revert CBV_DailyLimit();

        _enforceSeerAction(admin, 0, w.amount, w.toVault);

        w.executed = true;
        if (activeQueuedWithdrawals > 0) {
            activeQueuedWithdrawals -= 1;
        }
        spentToday += w.amount;

        // C-7 FIX: Prevent queued withdrawal to an unguarded vault that would breach cap.
        if (!ICardBoundVaultView(w.toVault).canReceiveTransfer(w.amount)) revert CBV_ReceiverNeedsGuardian();

        IERC20(vfideToken).safeTransfer(w.toVault, w.amount);

        emit WithdrawalExecuted(queueIndex, w.toVault, w.amount);
        _logTransfer(w.toVault, w.amount);
    }

    /// @notice Cancel a queued withdrawal. Callable by admin OR any guardian.
    /// @param queueIndex Index in the withdrawal queue.
    /// @dev Guardians can cancel — this is the critical protection. If keys are stolen
    ///      and the thief queues a large withdrawal, a guardian can cancel it during
    ///      the 7-day waiting period.
    function cancelQueuedWithdrawal(uint256 queueIndex) external {
        if (msg.sender != admin && !isGuardian[msg.sender]) revert CBV_NotGuardian();
        if (queueIndex >= withdrawalQueue.length) revert CBV_QueueInvalidIndex();

        QueuedWithdrawal storage w = withdrawalQueue[queueIndex];
        if (w.executed || w.cancelled) revert CBV_QueueAlreadyProcessed();

        w.cancelled = true;
        if (activeQueuedWithdrawals > 0) {
            activeQueuedWithdrawals -= 1;
        }

        // H-02 FIX: Refund spentToday if the cancellation is within the same daily window
        // as the queue time, so the owner is not rate-limited for a transfer that never occurred.
        if (w.requestTime >= dayStart && spentToday >= w.amount) {
            spentToday -= w.amount;
        }

        emit WithdrawalCancelled(queueIndex, msg.sender);
    }

    /// @notice View all pending (not executed, not cancelled) queued withdrawals.
    /// @return indices Array of pending queue indices.
    /// @return amounts Array of corresponding amounts.
    /// @return executeAfters Array of corresponding execution timestamps.
    function getPendingQueuedWithdrawals()
        external view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters)
    {
        // Count pending
        uint256 pendingCount = 0;
        for (uint256 i = 0; i < withdrawalQueue.length; i++) {
            if (!withdrawalQueue[i].executed && !withdrawalQueue[i].cancelled) pendingCount++;
        }

        indices = new uint256[](pendingCount);
        amounts = new uint256[](pendingCount);
        executeAfters = new uint64[](pendingCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < withdrawalQueue.length; i++) {
            if (!withdrawalQueue[i].executed && !withdrawalQueue[i].cancelled) {
                indices[idx] = i;
                amounts[idx] = withdrawalQueue[i].amount;
                executeAfters[idx] = withdrawalQueue[i].executeAfter;
                idx++;
            }
        }
    }

    /// @notice Paginated pending withdrawal view to bound read-gas on long-lived vaults.
    /// @param start Inclusive queue index to start scanning from.
    /// @param limit Maximum queue slots to scan (not pending count).
    /// @return indices Pending queue indices found in the scan window.
    /// @return amounts Pending amounts found in the scan window.
    /// @return executeAfters Pending execution times found in the scan window.
    function getPendingQueuedWithdrawalsPaged(uint256 start, uint256 limit)
        external
        view
        returns (uint256[] memory indices, uint256[] memory amounts, uint64[] memory executeAfters)
    {
        uint256 len = withdrawalQueue.length;
        if (start >= len || limit == 0) {
            return (new uint256[](0), new uint256[](0), new uint64[](0));
        }

        uint256 end = start + limit;
        if (end > len) end = len;

        uint256 pendingCount = 0;
        for (uint256 i = start; i < end; i++) {
            if (!withdrawalQueue[i].executed && !withdrawalQueue[i].cancelled) pendingCount++;
        }

        indices = new uint256[](pendingCount);
        amounts = new uint256[](pendingCount);
        executeAfters = new uint64[](pendingCount);

        uint256 idx = 0;
        for (uint256 i = start; i < end; i++) {
            if (!withdrawalQueue[i].executed && !withdrawalQueue[i].cancelled) {
                indices[idx] = i;
                amounts[idx] = withdrawalQueue[i].amount;
                executeAfters[idx] = withdrawalQueue[i].executeAfter;
                idx++;
            }
        }
    }

    /// @notice Get total number of queued withdrawals (including processed).
    function queueLength() external view returns (uint256) {
        return withdrawalQueue.length;
    }

    function _queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce) internal {
        if (activeQueuedWithdrawals >= MAX_QUEUED) revert CBV_QueueFull();

        uint64 executeAfter = uint64(block.timestamp) + uint64(WITHDRAWAL_DELAY);

        withdrawalQueue.push(QueuedWithdrawal({
            toVault: toVault,
            amount: amount,
            requestTime: uint64(block.timestamp),
            executeAfter: executeAfter,
            executed: false,
            cancelled: false,
            intentNonce: intentNonce
        }));
        activeQueuedWithdrawals += 1;

        emit WithdrawalQueued(withdrawalQueue.length - 1, toVault, amount, executeAfter);
    }

    function _queueTokenApproval(address token, address spender, uint256 amount) internal {
        uint64 executeAfter = uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY;
        pendingTokenApproval = PendingTokenApproval({
            token: token,
            spender: spender,
            amount: amount,
            executeAfter: executeAfter
        });

        emit TokenApprovalProposed(token, spender, amount, executeAfter);
    }

    function _validateApprovalAmount(uint256 amount) internal view {
        if (amount > dailyTransferLimit) revert CBV_TransferLimit();
    }

    /// @notice Return EIP-712 domain separator used for transfer intent signing.
    function domainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Compute typed-data transfer digest for a transfer intent.
    /// @param intent Transfer intent payload.
    function transferDigest(TransferIntent calldata intent) external view returns (bytes32) {
        return _transferDigest(intent);
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

    function _recoverTransferSigner(TransferIntent calldata intent, bytes calldata signature)
        internal
        view
        returns (address)
    {
        if (signature.length != 65) revert CBV_InvalidSignature();

        bytes32 digest = _transferDigest(intent);

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

    function _logTransfer(address toVault, uint256 amount) internal {
        if (address(ledger) != address(0)) {
            try ledger.logTransfer(address(this), toVault, amount, "vault_to_vault") {} catch { emit LedgerLogFailed(address(this), "vault_to_vault"); }
        }
    }

    function _enforceSeerAction(address subject, uint8 action, uint256 amount, address counterparty) internal {
        if (address(seerAutonomous) == address(0)) return;
        try seerAutonomous.beforeAction(subject, action, amount, counterparty) returns (uint8 r) {
            if (r != 0) revert CBV_SeerBlocked();
        } catch {
            revert CBV_SeerBlocked();
        }
    }

    /// @notice Rescue accidentally sent native token; vault custody remains token-based.
    function rescueNative(address payable to, uint256 amount) external onlyAdmin nonReentrant {
        if (to == address(0)) revert CBV_Zero();

        uint64 executeAfter = uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY;
        pendingNativeRescue = PendingNativeRescue({
            to: to,
            amount: amount,
            executeAfter: executeAfter
        });
        emit NativeRescueProposed(to, amount, executeAfter);
    }

    function applyRescueNative() external onlyAdmin nonReentrant {
        PendingNativeRescue memory pending = pendingNativeRescue;
        if (pending.executeAfter == 0 || block.timestamp < pending.executeAfter) revert CBV_Locked();

        delete pendingNativeRescue;

        (bool ok, ) = pending.to.call{value: pending.amount, gas: 10_000}("");
        if (!ok) revert CBV_TransferFailed();
        emit NativeRescue(pending.to, pending.amount);
    }

    function cancelRescueNative() external onlyAdmin {
        PendingNativeRescue memory pending = pendingNativeRescue;
        delete pendingNativeRescue;
        emit NativeRescueCancelled(pending.to, pending.amount);
    }

    /// @notice CBV-05 FIX: Rescue accidentally sent non-VFIDE ERC20 tokens.
    /// @dev Prevents rescuing the primary VFIDE token to avoid misuse. All VFIDE
    ///      custody must flow through the normal vault transfer mechanism.
    function rescueERC20(address token, address to, uint256 amount) external onlyAdmin nonReentrant {
        if (to == address(0)) revert CBV_Zero();
        require(token != vfideToken, "CBV: cannot rescue VFIDE via rescueERC20");

        uint64 executeAfter = uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY;
        pendingERC20Rescue = PendingERC20Rescue({
            token: token,
            to: to,
            amount: amount,
            executeAfter: executeAfter
        });
        emit ERC20RescueProposed(token, to, amount, executeAfter);
    }

    function applyRescueERC20() external onlyAdmin nonReentrant {
        PendingERC20Rescue memory pending = pendingERC20Rescue;
        if (pending.executeAfter == 0 || block.timestamp < pending.executeAfter) revert CBV_Locked();
        delete pendingERC20Rescue;
        IERC20(pending.token).safeTransfer(pending.to, pending.amount);
    }

    function cancelRescueERC20() external onlyAdmin {
        PendingERC20Rescue memory pending = pendingERC20Rescue;
        delete pendingERC20Rescue;
        emit ERC20RescueCancelled(pending.token, pending.to, pending.amount);
    }

    // ═══════════════════════════════════════════════════════════════
    //  GUARDIAN-APPROVED RECOVERY ROTATION
    // ═══════════════════════════════════════════════════════════════

    event RecoveryRotationExecuted(address indexed oldWallet, address indexed newWallet, address indexed oldAdmin, address newAdmin);

    function executeRecoveryRotation(address newWallet) external {
        require(msg.sender == hub, "CBV: only hub");
        require(newWallet != address(0), "CBV: zero wallet");

        address oldWallet = activeWallet;
        address oldAdmin = admin;

        activeWallet = newWallet;
        walletEpoch += 1;
        admin = newWallet;
        pendingAdmin = address(0);
        paused = true;

        // N-H6/N-H10 FIX: Recovery rotation must clear ALL sensitive queued state so the
        // new admin cannot accidentally apply stale operations approved under the old wallet.
        delete pendingRotation;
        delete pendingGuardianChange;
        delete pendingSpendLimitChange;
        delete pendingLargeTransferThresholdChange;
        delete pendingERC20Rescue;
        delete pendingNativeRescue;
        delete pendingTokenApproval;
        delete withdrawalQueue;
        activeQueuedWithdrawals = 0;

        emit RecoveryRotationExecuted(oldWallet, newWallet, oldAdmin, newWallet);
        emit WalletRotated(oldWallet, newWallet, walletEpoch);
        emit AdminTransferred(oldAdmin, newWallet);
        emit PauseSet(true, msg.sender);
    }

    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }
}
