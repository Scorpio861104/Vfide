// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title CardBoundVaultAdminManager
/// @notice Holds all pending-state for timelocked admin operations on CardBoundVault.
///         Deployed by the vault constructor; the vault holds an immutable address and
///         delegates all propose/apply/cancel admin operations here.
///         The vault's own onlyAdmin modifier already verifies the caller; this contract
///         only needs to verify that msg.sender is the vault it was created for.
contract CardBoundVaultAdminManager {
    uint64 public constant SENSITIVE_ADMIN_DELAY = 7 days;
    uint64 public constant GUARDIAN_CHANGE_DELAY  = 1 days;

    struct PendingGuardianChange {
        address guardian;
        bool    active;
        uint64  effectiveAt;
    }

    struct PendingUint256x2 {
        uint256 value1;
        uint256 value2;
        uint64  executeAfter;
    }

    struct PendingUint256 {
        uint256 value;
        uint64  executeAfter;
    }

    struct PendingRescue {
        address addr;
        uint256 amount;
        uint64  executeAfter;
    }

    struct PendingERC20Rescue {
        address token;
        address to;
        uint256 amount;
        uint64  executeAfter;
    }

    struct PendingTokenApproval {
        address token;
        address spender;
        uint256 amount;
        uint64  executeAfter;
    }

    address public immutable vault;

    PendingGuardianChange  public pendingGuardianChange;
    PendingUint256x2       public pendingSpendLimitChange;
    PendingUint256         public pendingLargeTransferThresholdChange;
    PendingRescue          public pendingNativeRescue;
    PendingERC20Rescue     public pendingERC20Rescue;
    PendingTokenApproval   public pendingTokenApproval;

    error AM_OnlyVault();
    error AM_PendingExists();
    error AM_Locked();
    error AM_NoPending();

    modifier onlyVault() {
        if (msg.sender != vault) revert AM_OnlyVault();
        _;
    }

    constructor(address vault_) {
        vault = vault_;
    }

    // ── Guardian change ────────────────────────────────────────────
    function proposeGuardianChange(address guardian, bool active) external onlyVault {
        if (pendingGuardianChange.effectiveAt != 0) revert AM_PendingExists();
        pendingGuardianChange = PendingGuardianChange(
            guardian, active, uint64(block.timestamp) + GUARDIAN_CHANGE_DELAY
        );
    }

    function applyGuardianChange() external onlyVault returns (address guardian, bool active) {
        PendingGuardianChange memory p = pendingGuardianChange;
        if (p.effectiveAt == 0 || block.timestamp < p.effectiveAt) revert AM_Locked();
        delete pendingGuardianChange;
        return (p.guardian, p.active);
    }

    function cancelGuardianChange() external onlyVault returns (address guardian, bool active) {
        PendingGuardianChange memory p = pendingGuardianChange;
        if (p.effectiveAt == 0) revert AM_NoPending();
        delete pendingGuardianChange;
        return (p.guardian, p.active);
    }

    // ── Spend limits ───────────────────────────────────────────────
    function proposeSpendLimits(uint256 maxPerTransfer, uint256 dailyTransferLimit) external onlyVault {
        if (pendingSpendLimitChange.executeAfter != 0) revert AM_PendingExists();
        pendingSpendLimitChange = PendingUint256x2(
            maxPerTransfer, dailyTransferLimit, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY
        );
    }

    function applySpendLimits() external onlyVault returns (uint256 maxPerTransfer, uint256 dailyTransferLimit) {
        PendingUint256x2 memory p = pendingSpendLimitChange;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingSpendLimitChange;
        return (p.value1, p.value2);
    }

    function cancelSpendLimits() external onlyVault {
        if (pendingSpendLimitChange.executeAfter == 0) revert AM_NoPending();
        delete pendingSpendLimitChange;
    }

    // ── Large transfer threshold ───────────────────────────────────
    function proposeLargeTransferThreshold(uint256 threshold) external onlyVault {
        if (pendingLargeTransferThresholdChange.executeAfter != 0) revert AM_PendingExists();
        pendingLargeTransferThresholdChange = PendingUint256(
            threshold, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY
        );
    }

    function applyLargeTransferThreshold() external onlyVault returns (uint256 threshold) {
        PendingUint256 memory p = pendingLargeTransferThresholdChange;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingLargeTransferThresholdChange;
        return p.value;
    }

    function cancelLargeTransferThreshold() external onlyVault {
        if (pendingLargeTransferThresholdChange.executeAfter == 0) revert AM_NoPending();
        delete pendingLargeTransferThresholdChange;
    }

    // ── Native rescue ──────────────────────────────────────────────
    function proposeNativeRescue(address payable to, uint256 amount) external onlyVault {
        if (pendingNativeRescue.executeAfter != 0) revert AM_PendingExists();
        pendingNativeRescue = PendingRescue(to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    function applyNativeRescue() external onlyVault returns (address payable to, uint256 amount) {
        PendingRescue memory p = pendingNativeRescue;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingNativeRescue;
        return (payable(p.addr), p.amount);
    }

    function cancelNativeRescue() external onlyVault returns (address payable to, uint256 amount) {
        PendingRescue memory p = pendingNativeRescue;
        if (p.executeAfter == 0) revert AM_NoPending();
        delete pendingNativeRescue;
        return (payable(p.addr), p.amount);
    }

    // ── ERC20 rescue ───────────────────────────────────────────────
    function proposeERC20Rescue(address token, address to, uint256 amount) external onlyVault {
        if (pendingERC20Rescue.executeAfter != 0) revert AM_PendingExists();
        pendingERC20Rescue = PendingERC20Rescue(token, to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    function applyERC20Rescue() external onlyVault returns (address token, address to, uint256 amount) {
        PendingERC20Rescue memory p = pendingERC20Rescue;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingERC20Rescue;
        return (p.token, p.to, p.amount);
    }

    function cancelERC20Rescue() external onlyVault returns (address token, address to, uint256 amount) {
        PendingERC20Rescue memory p = pendingERC20Rescue;
        if (p.executeAfter == 0) revert AM_NoPending();
        delete pendingERC20Rescue;
        return (p.token, p.to, p.amount);
    }

    // ── Token approval ─────────────────────────────────────────────
    function proposeTokenApproval(address token, address spender, uint256 amount) external onlyVault {
        if (pendingTokenApproval.executeAfter != 0) revert AM_PendingExists();
        pendingTokenApproval = PendingTokenApproval(
            token, spender, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY
        );
    }

    function applyTokenApproval() external onlyVault returns (address token, address spender, uint256 amount) {
        PendingTokenApproval memory p = pendingTokenApproval;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingTokenApproval;
        return (p.token, p.spender, p.amount);
    }

    function cancelTokenApproval() external onlyVault returns (address token, address spender, uint256 amount) {
        PendingTokenApproval memory p = pendingTokenApproval;
        if (p.executeAfter == 0) revert AM_NoPending();
        delete pendingTokenApproval;
        return (p.token, p.spender, p.amount);
    }

    // ── Recovery clear ─────────────────────────────────────────────
    function clearOnRecovery() external onlyVault {
        delete pendingGuardianChange;
        delete pendingSpendLimitChange;
        delete pendingLargeTransferThresholdChange;
        delete pendingNativeRescue;
        delete pendingERC20Rescue;
        delete pendingTokenApproval;
    }
}
