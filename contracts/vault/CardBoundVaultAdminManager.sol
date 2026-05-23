// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title CardBoundVaultAdminManager
/// @notice Holds all pending-state for timelocked admin operations on CardBoundVault.
///         Deployed by the vault constructor; the vault holds an immutable address and
///         delegates all propose/apply/cancel admin operations here.
///         The vault's own onlyAdmin modifier already verifies the caller; this contract
///         only needs to verify that msg.sender is the vault it was created for.
/// @author Vfide
contract CardBoundVaultAdminManager {
    /// @notice SENSITIVE_ADMIN_DELAY
    uint64 public constant SENSITIVE_ADMIN_DELAY = 7 days;
    /// @notice GUARDIAN_CHANGE_DELAY
    uint64 public constant GUARDIAN_CHANGE_DELAY = 1 days;

    struct PendingGuardianChange {
        address guardian;
        bool active;
        uint64 effectiveAt;
    }

    // R-8: Trustee role changes use the same 24-hour timelock as guardian changes.
    // Separate storage from PendingGuardianChange so a guardian add and a trustee
    // promotion can be pending at the same time (typical: add Alice as guardian,
    // wait for her to mature, then promote her to trustee).
    struct PendingTrusteeChange {
        address guardian;
        bool trustee;
        uint64 effectiveAt;
    }

    struct PendingUint256x2 {
        uint256 value1;
        uint256 value2;
        uint64 executeAfter;
    }

    struct PendingUint256 {
        uint256 value;
        uint64 executeAfter;
    }

    struct PendingRescue {
        address addr;
        uint256 amount;
        uint64 executeAfter;
    }

    struct PendingERC20Rescue {
        address token;
        address to;
        uint256 amount;
        uint64 executeAfter;
    }

    struct PendingTokenApproval {
        address token;
        address spender;
        uint256 amount;
        uint64 executeAfter;
    }

    /// @notice vault
    address public immutable vault;

    /// @notice pendingGuardianChange
    PendingGuardianChange public pendingGuardianChange;
    /// @notice pendingTrusteeChange
    PendingTrusteeChange public pendingTrusteeChange;
    /// @notice pendingSpendLimitChange
    PendingUint256x2 public pendingSpendLimitChange;
    /// @notice pendingLargeTransferThresholdChange
    PendingUint256 public pendingLargeTransferThresholdChange;
    /// @notice pendingNativeRescue
    PendingRescue public pendingNativeRescue;
    /// @notice pendingERC20Rescue
    PendingERC20Rescue public pendingERC20Rescue;
    /// @notice pendingTokenApproval
    PendingTokenApproval public pendingTokenApproval;

    /// @notice AM_OnlyVault
    error AM_OnlyVault();
    /// @notice AM_PendingExists
    error AM_PendingExists();
    /// @notice AM_Locked
    error AM_Locked();
    /// @notice AM_NoPending
    error AM_NoPending();

    /// @notice onlyVault
    modifier onlyVault() {
        if (msg.sender != vault) revert AM_OnlyVault();
        _;
    }

    /// @notice constructor
    /// @param vault_ vault_
    constructor(address vault_) {
        require(vault_ != address(0), "CBV-AM: zero vault");
        vault = vault_;
    }

    // ── Guardian change ────────────────────────────────────────────
    /// @notice proposeGuardianChange
    /// @param guardian guardian
    /// @param active active
    function proposeGuardianChange(address guardian, bool active) external onlyVault {
        if (pendingGuardianChange.effectiveAt != 0) revert AM_PendingExists();
        pendingGuardianChange = PendingGuardianChange(guardian, active, uint64(block.timestamp) + GUARDIAN_CHANGE_DELAY);
    }

    /// @notice applyGuardianChange
    /// @return guardian guardian
    /// @return active active
    function applyGuardianChange() external onlyVault returns (address guardian, bool active) {
        PendingGuardianChange memory p = pendingGuardianChange;
        if (p.effectiveAt == 0 || block.timestamp < p.effectiveAt) revert AM_Locked();
        delete pendingGuardianChange;
        return (p.guardian, p.active);
    }

    /// @notice cancelGuardianChange
    /// @return guardian guardian
    /// @return active active
    function cancelGuardianChange() external onlyVault returns (address guardian, bool active) {
        PendingGuardianChange memory p = pendingGuardianChange;
        if (p.effectiveAt == 0) revert AM_NoPending();
        delete pendingGuardianChange;
        return (p.guardian, p.active);
    }

    // ── Trustee change (R-8) ───────────────────────────────────────
    // Same 24-hour timelock as guardian changes. The vault validates that the
    // address is an existing guardian before calling propose; this contract
    // only holds state. The timelock exists so a compromised owner key cannot
    // instantly promote an attacker to trustee — other guardians (or the owner
    // from another device) have a day to cancel.
    /// @notice proposeTrusteeChange
    /// @param guardian guardian
    /// @param trustee trustee
    function proposeTrusteeChange(address guardian, bool trustee) external onlyVault {
        if (pendingTrusteeChange.effectiveAt != 0) revert AM_PendingExists();
        pendingTrusteeChange = PendingTrusteeChange(guardian, trustee, uint64(block.timestamp) + GUARDIAN_CHANGE_DELAY);
    }

    /// @notice applyTrusteeChange
    /// @return guardian guardian
    /// @return trustee trustee
    function applyTrusteeChange() external onlyVault returns (address guardian, bool trustee) {
        PendingTrusteeChange memory p = pendingTrusteeChange;
        if (p.effectiveAt == 0 || block.timestamp < p.effectiveAt) revert AM_Locked();
        delete pendingTrusteeChange;
        return (p.guardian, p.trustee);
    }

    /// @notice cancelTrusteeChange
    /// @return guardian guardian
    /// @return trustee trustee
    function cancelTrusteeChange() external onlyVault returns (address guardian, bool trustee) {
        PendingTrusteeChange memory p = pendingTrusteeChange;
        if (p.effectiveAt == 0) revert AM_NoPending();
        delete pendingTrusteeChange;
        return (p.guardian, p.trustee);
    }

    // ── Spend limits ───────────────────────────────────────────────
    /// @notice proposeSpendLimits
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyTransferLimit dailyTransferLimit
    function proposeSpendLimits(uint256 maxPerTransfer, uint256 dailyTransferLimit) external onlyVault {
        if (pendingSpendLimitChange.executeAfter != 0) revert AM_PendingExists();
        pendingSpendLimitChange = PendingUint256x2(maxPerTransfer, dailyTransferLimit, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    /// @notice applySpendLimits
    /// @return maxPerTransfer maxPerTransfer
    /// @return dailyTransferLimit dailyTransferLimit
    function applySpendLimits() external onlyVault returns (uint256 maxPerTransfer, uint256 dailyTransferLimit) {
        PendingUint256x2 memory p = pendingSpendLimitChange;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingSpendLimitChange;
        return (p.value1, p.value2);
    }

    /// @notice cancelSpendLimits
    function cancelSpendLimits() external onlyVault {
        if (pendingSpendLimitChange.executeAfter == 0) revert AM_NoPending();
        delete pendingSpendLimitChange;
    }

    // ── Large transfer threshold ───────────────────────────────────
    /// @notice proposeLargeTransferThreshold
    /// @param threshold threshold
    function proposeLargeTransferThreshold(uint256 threshold) external onlyVault {
        if (pendingLargeTransferThresholdChange.executeAfter != 0) revert AM_PendingExists();
        pendingLargeTransferThresholdChange = PendingUint256(threshold, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    /// @notice applyLargeTransferThreshold
    /// @return threshold threshold
    function applyLargeTransferThreshold() external onlyVault returns (uint256 threshold) {
        PendingUint256 memory p = pendingLargeTransferThresholdChange;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingLargeTransferThresholdChange;
        return p.value;
    }

    /// @notice cancelLargeTransferThreshold
    function cancelLargeTransferThreshold() external onlyVault {
        if (pendingLargeTransferThresholdChange.executeAfter == 0) revert AM_NoPending();
        delete pendingLargeTransferThresholdChange;
    }

    // ── Native rescue ──────────────────────────────────────────────
    /// @notice proposeNativeRescue
    /// @param to to
    /// @param amount amount
    function proposeNativeRescue(address payable to, uint256 amount) external onlyVault {
        if (pendingNativeRescue.executeAfter != 0) revert AM_PendingExists();
        pendingNativeRescue = PendingRescue(to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    /// @notice applyNativeRescue
    /// @return to to
    /// @return amount amount
    function applyNativeRescue() external onlyVault returns (address payable to, uint256 amount) {
        PendingRescue memory p = pendingNativeRescue;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingNativeRescue;
        return (payable(p.addr), p.amount);
    }

    /// @notice cancelNativeRescue
    /// @return to to
    /// @return amount amount
    function cancelNativeRescue() external onlyVault returns (address payable to, uint256 amount) {
        PendingRescue memory p = pendingNativeRescue;
        if (p.executeAfter == 0) revert AM_NoPending();
        delete pendingNativeRescue;
        return (payable(p.addr), p.amount);
    }

    // ── ERC20 rescue ───────────────────────────────────────────────
    /// @notice proposeERC20Rescue
    /// @param token token
    /// @param to to
    /// @param amount amount
    function proposeERC20Rescue(address token, address to, uint256 amount) external onlyVault {
        if (pendingERC20Rescue.executeAfter != 0) revert AM_PendingExists();
        pendingERC20Rescue = PendingERC20Rescue(token, to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    /// @notice applyERC20Rescue
    /// @return token token
    /// @return to to
    /// @return amount amount
    function applyERC20Rescue() external onlyVault returns (address token, address to, uint256 amount) {
        PendingERC20Rescue memory p = pendingERC20Rescue;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingERC20Rescue;
        return (p.token, p.to, p.amount);
    }

    /// @notice cancelERC20Rescue
    /// @return token token
    /// @return to to
    /// @return amount amount
    function cancelERC20Rescue() external onlyVault returns (address token, address to, uint256 amount) {
        PendingERC20Rescue memory p = pendingERC20Rescue;
        if (p.executeAfter == 0) revert AM_NoPending();
        delete pendingERC20Rescue;
        return (p.token, p.to, p.amount);
    }

    // ── Token approval ─────────────────────────────────────────────
    /// @notice proposeTokenApproval
    /// @param token token
    /// @param spender spender
    /// @param amount amount
    function proposeTokenApproval(address token, address spender, uint256 amount) external onlyVault {
        if (pendingTokenApproval.executeAfter != 0) revert AM_PendingExists();
        pendingTokenApproval = PendingTokenApproval(token, spender, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    /// @notice applyTokenApproval
    /// @return token token
    /// @return spender spender
    /// @return amount amount
    function applyTokenApproval() external onlyVault returns (address token, address spender, uint256 amount) {
        PendingTokenApproval memory p = pendingTokenApproval;
        if (p.executeAfter == 0 || block.timestamp < p.executeAfter) revert AM_Locked();
        delete pendingTokenApproval;
        return (p.token, p.spender, p.amount);
    }

    /// @notice cancelTokenApproval
    /// @return token token
    /// @return spender spender
    /// @return amount amount
    function cancelTokenApproval() external onlyVault returns (address token, address spender, uint256 amount) {
        PendingTokenApproval memory p = pendingTokenApproval;
        if (p.executeAfter == 0) revert AM_NoPending();
        delete pendingTokenApproval;
        return (p.token, p.spender, p.amount);
    }

    // ── Recovery clear ─────────────────────────────────────────────
    /// @notice clearOnRecovery
    function clearOnRecovery() external onlyVault {
        delete pendingGuardianChange;
        delete pendingSpendLimitChange;
        delete pendingLargeTransferThresholdChange;
        delete pendingNativeRescue;
        delete pendingERC20Rescue;
        delete pendingTokenApproval;
    }
}
