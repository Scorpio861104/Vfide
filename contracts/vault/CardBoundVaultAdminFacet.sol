// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ─────────────────────────────────────────────────────────────────────────────
// CardBoundVaultAdminFacet
//
// Delegatecall target for low-frequency administrative functions of
// CardBoundVault. Called via CBV's adminFacet fallback.
//
// SECURITY: This contract is NEVER called directly. Only CardBoundVault
// (via delegatecall) executes its code, so msg.sender is always the
// original caller and address(this) is always the CBV address.
//
// STORAGE LAYOUT: Must exactly mirror CardBoundVault storage order to ensure
// delegatecall slot alignment. Constants and immutables occupy no storage slots.
// ─────────────────────────────────────────────────────────────────────────────

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ── Interfaces (minimal, matching CBV) ───────────────────────────────────────

interface IVaultHubGuardianSetup_F {
    function guardianSetupComplete(address vault) external view returns (bool);
    function invalidateGuardianSetup(address vault) external;
}

interface IAdminManager_F {
    function proposeGuardianChange(address guardian, bool active) external;
    function applyGuardianChange() external returns (address guardian, bool active);
    function cancelGuardianChange() external returns (address guardian, bool active);
    function proposeTrusteeChange(address guardian, bool trustee) external;
    function applyTrusteeChange() external returns (address guardian, bool trustee);
    function cancelTrusteeChange() external returns (address guardian, bool trustee);
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
}

interface ICardBoundVaultInheritanceManager_F {
    function proposeInheritanceConfig(address actor, address[] calldata heirGuardians, bytes32[] calldata heirCommitments) external;
    function confirmInheritanceConfig(address actor) external;
    function cancelInheritanceConfigChange(address actor) external;
    function clearAllHeirs(address actor) external;
    function setProofOfLifeWallet(address actor, address polWallet) external;
    function setDAOGuardian(address actor, address dao) external;
    function cancelInheritanceConfigChangeByGuardians(address actor) external;
    function initiateInheritanceClaim(address actor, bytes32 reasonHash) external;
    function vetoInheritanceClaim(address actor) external;
    function ownerOverrideClaim(address actor) external;
}

// ── Events (must match CBV exactly for log compatibility) ────────────────────

event GuardianSet(address indexed guardian, bool active);
event GuardianThresholdSet(uint8 threshold);
event TrusteeRoleSet(address indexed guardian, bool trustee);
event SpendLimitsSet(uint256 maxPerTransfer, uint256 dailyTransferLimit);
event ChallengePeriodPreferenceSet(uint64 seconds_);
event SeerAutonomousSet(address seerAutonomous);
event TokenApprovalProposed(address indexed token, address indexed spender, uint256 amount, uint64 effectiveAt);
event VaultApprove(address indexed spender, uint256 amount);
event ERC20Approve(address indexed token, address indexed spender, uint256 amount);
event TokenApprovalCancelled(address indexed token, address indexed spender);
event PauseSet(bool paused, address indexed by);
event LargeTransferThresholdSet(uint256 threshold);
event LargePaymentThresholdSet(uint256 oldThreshold, uint256 newThreshold);
event LargePaymentThresholdProposed(uint256 newThreshold, uint64 executeAfter);
event LargePaymentThresholdCancelled(uint256 threshold, uint64 executeAfter);

event NativeRescueProposed(address indexed to, uint256 amount, uint64 effectiveAt);
event NativeRescue(address indexed to, uint256 amount);
event NativeRescueCancelled(address indexed to, uint256 amount);
event ERC20RescueProposed(address indexed token, address indexed to, uint256 amount, uint64 effectiveAt);
event ERC20Rescue(address indexed token, address indexed to, uint256 amount);
event ERC20RescueCancelled(address indexed token, address indexed to, uint256 amount);
event InheritanceManagerSet(address indexed manager);

// ── Errors ───────────────────────────────────────────────────────────────────

error CBV_NotAdmin();
error CBV_NotGuardian();
error CBV_Zero();
error CBV_InvalidThreshold();
error CBV_Paused();
error CBV_TransferLimit();
error CBV_UseProposeApply();
error CBV_TransferFailed();
error CBV_ChallengePeriodTooShort();
error CBV_ChallengePeriodTooLong();

// ── Storage layout mirror (MUST match CardBoundVault slot order) ──────────────

struct WalletRotation_F {
    address newWallet;
    uint64 activateAt;
    uint8 approvals;
    uint256 proposalNonce;
}

abstract contract CBVStorageLayout {
    // ── constants / immutables (no storage slots) ──
    // slot 0
    ISeerAutonomousVault_F public seerAutonomous;
    // slot 1-2 (bool + uint64 packed)
    bool public recoveryAdminUnseparated;
    uint64 public recoveryUnseparatedSince;
    // slot 3
    address public admin;
    // slot 4
    address public pendingAdmin;
    // slot 5
    address public activeWallet;
    // slot 6
    uint64 public walletEpoch;
    // slot 7
    uint256 public nextNonce;
    // slot 8 (bool + uint64 packed)
    bool public paused;
    uint64 public pauseUntil;
    // slot 9
    uint256 public pauseNonce;
    // slot 10
    mapping(address => mapping(uint256 => bool)) public pauseApprovalByGuardian;
    // slot 11
    mapping(uint256 => uint8) public pauseApprovalCount;
    // slot 12
    mapping(address => bool) public isGuardian;
    // slot 13
    mapping(address => uint64) public guardianAddedAt;
    // slot 14 (uint8 + uint8 packed)
    uint8 public guardianCount;
    uint8 public guardianThreshold;
    // slot 15
    mapping(address => bool) public isTrustee;
    // slot 16
    uint8 public trusteeCount;
    // slot 17
    uint64 public challengePeriodPreference;
    // slot 18
    uint256 public maxPerTransfer;
    // slot 19
    uint256 public dailyTransferLimit;
    // slot 20
    uint256 public spentToday;
    // slot 21
    uint64 public dayStart;
    // slot 22
    uint256 public largeTransferThreshold;
    // immutables (no slots): paymentQueueManager, withdrawalQueueManager, adminManager
    // slot 23 — pendingRotation struct (newWallet=addr, activateAt+approvals packed, proposalNonce)
    WalletRotation_F public pendingRotation;
    // slot 27
    uint256 public rotationNonce;
    // slot 28
    mapping(address => mapping(uint256 => bool)) public rotationApprovalByGuardian;
    // slot 29
    address public inheritanceManager;

    // ── Storage mirrors (set by CBV constructor for delegatecall-readable copies) ──
    // These are stored AFTER inheritanceManager so slot ordering matches CBV exactly.
    address internal _adminManagerStore;
    address internal _paymentQueueManagerStore;
    address internal _withdrawalQueueManagerStore;
    address internal _hubStore;
    address internal _vfideTokenStore;
}

interface ISeerAutonomousVault_F {
    // placeholder — facet doesn't call seerAutonomous directly
}

// ─────────────────────────────────────────────────────────────────────────────
// The Facet
// ─────────────────────────────────────────────────────────────────────────────

contract CardBoundVaultAdminFacet is CBVStorageLayout {
    using SafeERC20 for IERC20;

    uint64 public constant SENSITIVE_ADMIN_DELAY = 7 days;
    uint8  public constant MAX_GUARDIANS         = 20;
    uint64 public constant MIN_CHALLENGE_PERIOD  = 3 days;
    uint64 public constant MAX_CHALLENGE_PERIOD  = 30 days;

    // ── Storage mirror accessors (read CBV storage set in its constructor) ────
    // These vars live in CBV's storage; the facet reads them via delegatecall.
    // Declared in CBVStorageLayout — exposed via functions below for clarity.

    function _hub()                    internal view returns (address) { return _hubStore; }
    function _vfideToken()             internal view returns (address) { return _vfideTokenStore; }
    function _adminManager()           internal view returns (address) { return _adminManagerStore; }
    function _paymentQueueManager()    internal view returns (address) { return _paymentQueueManagerStore; }
    function _withdrawalQueueManager() internal view returns (address) { return _withdrawalQueueManagerStore; }

    // ── Access control ────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        if (msg.sender != admin) revert CBV_NotAdmin();
        _;
    }

    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert CBV_NotGuardian();
        _;
    }

    modifier whenNotPaused() {
        if (paused && pauseUntil != 0 && block.timestamp >= pauseUntil) {
            paused    = false;
            pauseUntil = 0;
            emit PauseSet(false, address(0));
        }
        if (paused) revert CBV_Paused();
        _;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _guardianSetupComplete() internal view returns (bool) {
        return IVaultHubGuardianSetup_F(_hub()).guardianSetupComplete(address(this));
    }

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
            try IVaultHubGuardianSetup_F(_hub()).invalidateGuardianSetup(address(this)) {} catch {}
        }
        emit GuardianSet(guardian, active);
    }

    function _applyTrusteeChange(address guardian, bool trustee) internal {
        if (isTrustee[guardian] == trustee) return;
        if (trustee && !isGuardian[guardian]) revert CBV_NotGuardian();
        isTrustee[guardian] = trustee;
        if (trustee) { ++trusteeCount; } else { --trusteeCount; }
        emit TrusteeRoleSet(guardian, trustee);
    }

    function _validateApprovalAmount(uint256 amount) internal view {
        if (amount > dailyTransferLimit) revert CBV_TransferLimit();
    }

        // ── Guardian management ───────────────────────────────────────────────────

    function proposeGuardianChange(address guardian, bool active) external onlyAdmin {
        IAdminManager_F(_adminManager()).proposeGuardianChange(guardian, active);
    }

    function applyGuardianChange() external onlyAdmin {
        (address guardian, bool active) = IAdminManager_F(_adminManager()).applyGuardianChange();
        _applyGuardianChange(guardian, active);
    }

    function cancelGuardianChange() external onlyAdmin {
        IAdminManager_F(_adminManager()).cancelGuardianChange();
    }

    function setGuardian(address guardian, bool active) external onlyAdmin {
        if (_guardianSetupComplete()) revert CBV_UseProposeApply();
        if (guardian == address(0)) revert CBV_Zero();
        _applyGuardianChange(guardian, active);
    }

    function setGuardianThreshold(uint8 threshold) external onlyAdmin {
        if (threshold == 0 || threshold > guardianCount) revert CBV_InvalidThreshold();
        guardianThreshold = threshold;
        emit GuardianThresholdSet(threshold);
    }

    // ── Trustee management ────────────────────────────────────────────────────

    function setTrustee(address guardian, bool trustee) external onlyAdmin {
        _applyTrusteeChange(guardian, trustee);
    }

    function proposeTrusteeChange(address guardian, bool trustee) external onlyAdmin {
        IAdminManager_F(_adminManager()).proposeTrusteeChange(guardian, trustee);
    }

    function applyTrusteeChange() external onlyAdmin {
        (address guardian, bool trustee) = IAdminManager_F(_adminManager()).applyTrusteeChange();
        _applyTrusteeChange(guardian, trustee);
    }

    function cancelTrusteeChange() external onlyAdmin {
        IAdminManager_F(_adminManager()).cancelTrusteeChange();
    }

    // ── Challenge period preference ───────────────────────────────────────────

    function setChallengePeriodPreference(uint64 seconds_) external onlyAdmin {
        if (seconds_ != 0 && seconds_ < MIN_CHALLENGE_PERIOD) revert CBV_ChallengePeriodTooShort();
        if (seconds_ > MAX_CHALLENGE_PERIOD) revert CBV_ChallengePeriodTooLong();
        challengePeriodPreference = seconds_;
        emit ChallengePeriodPreferenceSet(seconds_);
    }

    // ── Spend limits ──────────────────────────────────────────────────────────

    function setSpendLimits(uint256 _maxPerTransfer, uint256 _dailyTransferLimit) external onlyAdmin {
        if (_maxPerTransfer == 0 || _dailyTransferLimit == 0 || _maxPerTransfer > _dailyTransferLimit)
            revert CBV_TransferLimit();
        IAdminManager_F(_adminManager()).proposeSpendLimits(_maxPerTransfer, _dailyTransferLimit);
    }

    function applySpendLimits() external onlyAdmin {
        (uint256 maxPT, uint256 dailyTL) = IAdminManager_F(_adminManager()).applySpendLimits();
        maxPerTransfer     = maxPT;
        dailyTransferLimit = dailyTL;
        emit SpendLimitsSet(maxPT, dailyTL);
    }

    function cancelSpendLimitsChange() external onlyAdmin {
        IAdminManager_F(_adminManager()).cancelSpendLimits();
    }

    // ── Seer autonomous ───────────────────────────────────────────────────────

    function setSeerAutonomous(address _seerAutonomous) external onlyAdmin {
        seerAutonomous = ISeerAutonomousVault_F(_seerAutonomous);
        emit SeerAutonomousSet(_seerAutonomous);
    }

    // ── Token approvals ───────────────────────────────────────────────────────

    function approveVFIDE(address spender, uint256 amount) external onlyAdmin whenNotPaused {
        if (spender == address(0)) revert CBV_Zero();
        _validateApprovalAmount(amount);
        IAdminManager_F(_adminManager()).proposeTokenApproval(_vfideToken(), spender, amount);
        emit TokenApprovalProposed(_vfideToken(), spender, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    function approveERC20(address token, address spender, uint256 amount) external onlyAdmin whenNotPaused {
        if (token == address(0) || spender == address(0)) revert CBV_Zero();
        _validateApprovalAmount(amount);
        IAdminManager_F(_adminManager()).proposeTokenApproval(token, spender, amount);
        emit TokenApprovalProposed(token, spender, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    function applyTokenApproval() external onlyAdmin whenNotPaused {
        (address token, address spender, uint256 amount) = IAdminManager_F(_adminManager()).applyTokenApproval();
        _validateApprovalAmount(amount);
        IERC20(token).forceApprove(spender, amount);
        if (token == _vfideToken()) {
            emit VaultApprove(spender, amount);
        } else {
            emit ERC20Approve(token, spender, amount);
        }
    }

    function cancelTokenApproval() external onlyAdmin {
        (address token, address spender,) = IAdminManager_F(_adminManager()).cancelTokenApproval();
        emit TokenApprovalCancelled(token, spender);
    }

    // ── Unpause ───────────────────────────────────────────────────────────────

    function unpause() external onlyAdmin {
        paused    = false;
        pauseUntil = 0;
        emit PauseSet(false, msg.sender);
    }

    // ── Large-payment threshold ───────────────────────────────────────────────

    function setLargePaymentThreshold(uint256 _threshold) external onlyAdmin {
        uint64 executeAfter = ICardBoundVaultPaymentQueueManager_F(_paymentQueueManager())
            .setLargePaymentThreshold(_threshold, SENSITIVE_ADMIN_DELAY);
        emit LargePaymentThresholdProposed(_threshold, executeAfter);
    }

    function applyLargePaymentThreshold() external onlyAdmin {
        (uint256 oldThreshold, uint256 newThreshold) = ICardBoundVaultPaymentQueueManager_F(_paymentQueueManager())
            .applyLargePaymentThreshold();
        emit LargePaymentThresholdSet(oldThreshold, newThreshold);
    }

    function cancelLargePaymentThreshold() external onlyAdmin {
        (uint256 threshold, uint64 executeAfter) = ICardBoundVaultPaymentQueueManager_F(_paymentQueueManager())
            .cancelLargePaymentThreshold();
        emit LargePaymentThresholdCancelled(threshold, executeAfter);
    }

    // ── Large-transfer threshold ──────────────────────────────────────────────

    function setLargeTransferThreshold(uint256 _threshold) external onlyAdmin {
        IAdminManager_F(_adminManager()).proposeLargeTransferThreshold(_threshold);
    }

    function applyLargeTransferThresholdChange() external onlyAdmin {
        uint256 threshold = IAdminManager_F(_adminManager()).applyLargeTransferThreshold();
        largeTransferThreshold = threshold;
        emit LargeTransferThresholdSet(threshold);
    }

    function cancelLargeTransferThresholdChange() external onlyAdmin {
        IAdminManager_F(_adminManager()).cancelLargeTransferThreshold();
    }

    // ── Native rescue ─────────────────────────────────────────────────────────

    function rescueNative(address payable to, uint256 amount) external onlyAdmin {
        if (to == address(0)) revert CBV_Zero();
        IAdminManager_F(_adminManager()).proposeNativeRescue(to, amount);
        emit NativeRescueProposed(to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    function applyRescueNative() external onlyAdmin {
        (address payable to, uint256 amount) = IAdminManager_F(_adminManager()).applyNativeRescue();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert CBV_TransferFailed();
        emit NativeRescue(to, amount);
    }

    function cancelRescueNative() external onlyAdmin {
        (address payable to, uint256 amount) = IAdminManager_F(_adminManager()).cancelNativeRescue();
        emit NativeRescueCancelled(to, amount);
    }

    // ── ERC-20 rescue ─────────────────────────────────────────────────────────

    function rescueERC20(address token, address to, uint256 amount) external onlyAdmin {
        if (token == address(0) || to == address(0)) revert CBV_Zero();
        IAdminManager_F(_adminManager()).proposeERC20Rescue(token, to, amount);
        emit ERC20RescueProposed(token, to, amount, uint64(block.timestamp) + SENSITIVE_ADMIN_DELAY);
    }

    function applyRescueERC20() external onlyAdmin {
        (address token, address to, uint256 amount) = IAdminManager_F(_adminManager()).applyERC20Rescue();
        IERC20(token).safeTransfer(to, amount);
        emit ERC20Rescue(token, to, amount);
    }

    function cancelRescueERC20() external onlyAdmin {
        (address token, address to, uint256 amount) = IAdminManager_F(_adminManager()).cancelERC20Rescue();
        emit ERC20RescueCancelled(token, to, amount);
    }

    // ── Inheritance management ────────────────────────────────────────────────

    function setInheritanceManager(address manager) external onlyAdmin {
        inheritanceManager = manager;
        emit InheritanceManagerSet(manager);
    }

    function proposeInheritanceConfig(address[] calldata heirGuardians, bytes32[] calldata heirCommitments) external onlyAdmin {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).proposeInheritanceConfig(msg.sender, heirGuardians, heirCommitments);
    }

    function confirmInheritanceConfig() external onlyAdmin {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).confirmInheritanceConfig(msg.sender);
    }

    function cancelInheritanceConfigChange() external onlyAdmin {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).cancelInheritanceConfigChange(msg.sender);
    }

    function clearAllHeirs() external onlyAdmin {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).clearAllHeirs(msg.sender);
    }

    function setProofOfLifeWallet(address polWallet) external onlyAdmin {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).setProofOfLifeWallet(msg.sender, polWallet);
    }

    function setDAOGuardian(address dao) external onlyAdmin {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).setDAOGuardian(msg.sender, dao);
    }

    function cancelInheritanceConfigChangeByGuardians() external onlyGuardian {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).cancelInheritanceConfigChangeByGuardians(msg.sender);
    }

    function initiateInheritanceClaim(bytes32 reasonHash) external onlyGuardian {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).initiateInheritanceClaim(msg.sender, reasonHash);
    }

    function vetoInheritanceClaim() external onlyGuardian {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).vetoInheritanceClaim(msg.sender);
    }

    function ownerOverrideClaim() external onlyAdmin {
        ICardBoundVaultInheritanceManager_F(inheritanceManager).ownerOverrideClaim(msg.sender);
    }
}

// ── Payment queue interface stub (for threshold management) ──────────────────

interface ICardBoundVaultPaymentQueueManager_F {
    function largePaymentThreshold() external view returns (uint256);
    function setLargePaymentThreshold(uint256 threshold, uint64 delay) external returns (uint64 executeAfter);
    function applyLargePaymentThreshold() external returns (uint256 oldThreshold, uint256 newThreshold);
    function cancelLargePaymentThreshold() external returns (uint256 threshold, uint64 executeAfter);
}
