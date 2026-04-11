// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

interface IVaultHubGuardianSetup {
    function guardianSetupComplete(address vault) external view returns (bool);
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
    uint8 public constant MAX_GUARDIANS = 20;

    address public immutable hub;
    address public immutable vfideToken;
    IProofLedger public immutable ledger;

    address public admin;
    address public pendingAdmin;
    address public activeWallet;

    uint64 public walletEpoch;
    uint256 public nextNonce;

    bool public paused;

    mapping(address => bool) public isGuardian;
    uint8 public guardianCount;
    uint8 public guardianThreshold;

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
    event GuardianChangeCancelled(address indexed guardian);

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
    event SpendLimitsSet(uint256 maxPerTransfer, uint256 dailyTransferLimit);
    event VaultApprove(address indexed spender, uint256 amount);
    event NativeRescue(address indexed to, uint256 amount);

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
                guardianCount++;
                emit GuardianSet(guardian, true);
            }
        }

        guardianThreshold = _guardianThreshold;
        emit GuardianThresholdSet(_guardianThreshold);
        emit SpendLimitsSet(_maxPerTransfer, _dailyTransferLimit);
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
        address g = pendingGuardianChange.guardian;
        delete pendingGuardianChange;
        emit GuardianChangeCancelled(g);
    }

    function _applyGuardianChange(address guardian, bool active) internal {
        if (isGuardian[guardian] == active) return;

        isGuardian[guardian] = active;
        if (active) {
            if (guardianCount >= MAX_GUARDIANS) revert CBV_InvalidThreshold();
            guardianCount++;
        } else {
            guardianCount--;
            if (guardianThreshold > guardianCount) {
                guardianThreshold = guardianCount;
                emit GuardianThresholdSet(guardianThreshold);
            }
        }

        if (guardianCount == 0 || guardianThreshold == 0) revert CBV_InvalidThreshold();
        emit GuardianSet(guardian, active);
    }

    /// @notice Legacy guardian mutator retained for bootstrap compatibility.
    /// @param guardian Guardian address to update.
    /// @param active True to set guardian active, false to remove.
    /// @dev Restricted to admin; prefer propose/apply guardian flow.
    function setGuardian(address guardian, bool active) external onlyAdmin {
        if (guardian == address(0)) revert CBV_Zero();
        _applyGuardianChange(guardian, active);
    }

    /// @notice Set required guardian approvals for sensitive wallet-rotation actions.
    /// @param threshold New guardian approval threshold.
    function setGuardianThreshold(uint8 threshold) external onlyAdmin {
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
        maxPerTransfer = _maxPerTransfer;
        dailyTransferLimit = _dailyTransferLimit;
        emit SpendLimitsSet(_maxPerTransfer, _dailyTransferLimit);
    }

    /// @notice Approve a spender to pull VFIDE from this vault (e.g., MerchantPortal).
    function approveVFIDE(address spender, uint256 amount) external onlyAdmin whenNotPaused {
        require(spender != address(0), "CBV: zero spender");
        IERC20(vfideToken).approve(spender, amount);
        emit VaultApprove(spender, amount);
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

        nextNonce += 1;

        // ── Large transfer queueing ─────────────────────────────
        // If a threshold is configured and the amount exceeds it,
        // queue the transfer with a 7-day delay instead of executing
        // immediately. This gives the owner or guardians time to
        // cancel if keys were compromised.
        if (largeTransferThreshold > 0 && amount >= largeTransferThreshold) {
            _queueWithdrawal(intent.toVault, amount, intent.nonce);
            emit VaultTransferAuthorized(signer, intent.toVault, amount, intent.nonce, intent.walletEpoch);
            _logTransfer(intent.toVault, amount);
            return;
        }

        // Small transfer — execute immediately
        spentToday += amount;
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
        largeTransferThreshold = _threshold;
        emit LargeTransferThresholdSet(_threshold);
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

        // Apply daily limit at execution time (not at queue time)
        _refreshDailyWindow();
        if (spentToday + w.amount > dailyTransferLimit) revert CBV_DailyLimit();

        w.executed = true;
        spentToday += w.amount;

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

    /// @notice Get total number of queued withdrawals (including processed).
    function queueLength() external view returns (uint256) {
        return withdrawalQueue.length;
    }

    function _queueWithdrawal(address toVault, uint256 amount, uint256 intentNonce) internal {
        // Count active (non-executed, non-cancelled) entries
        uint256 active = 0;
        for (uint256 i = 0; i < withdrawalQueue.length; i++) {
            if (!withdrawalQueue[i].executed && !withdrawalQueue[i].cancelled) active++;
        }
        if (active >= MAX_QUEUED) revert CBV_QueueFull();

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

        emit WithdrawalQueued(withdrawalQueue.length - 1, toVault, amount, executeAfter);
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

    /// @notice Rescue accidentally sent native token; vault custody remains token-based.
    function rescueNative(address payable to, uint256 amount) external onlyAdmin nonReentrant {
        if (to == address(0)) revert CBV_Zero();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert CBV_TransferFailed();
        emit NativeRescue(to, amount);
    }

    /// @notice CBV-05 FIX: Rescue accidentally sent non-VFIDE ERC20 tokens.
    /// @dev Prevents rescuing the primary VFIDE token to avoid misuse. All VFIDE
    ///      custody must flow through the normal vault transfer mechanism.
    function rescueERC20(address token, address to, uint256 amount) external onlyAdmin nonReentrant {
        if (to == address(0)) revert CBV_Zero();
        require(token != vfideToken, "CBV: cannot rescue VFIDE via rescueERC20");
        IERC20(token).safeTransfer(to, amount);
    }

    receive() external payable {}
}
