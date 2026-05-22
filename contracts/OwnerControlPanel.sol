// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * OwnerControlPanel - Centralized Admin Interface
 * ----------------------------------------------------------
 * Single control panel for managing all VFIDE protocol contracts
 * Aggregates owner/admin functions for easy management and monitoring
 * 
 * SECURITY:
 * - All functions restricted to owner (multisig recommended)
 * - Read-only views for monitoring system state
 * - Emergency controls centralized
 * - No fund custody (just passes through calls)
 * @notice IUserVaultOCP
 * @title IUserVaultOCP
 * @author Vfide
 */

interface IUserVaultOCP {
    // setFrozen removed — non-custodial
    /// @notice setAbnormalTransactionThreshold
    /// @param threshold threshold
    function setAbnormalTransactionThreshold(uint256 threshold) external;
    /// @notice setWithdrawalCooldown
    /// @param cooldown cooldown
    function setWithdrawalCooldown(uint64 cooldown) external;
    /// @notice setLargeTransferThreshold
    /// @param threshold threshold
    function setLargeTransferThreshold(uint256 threshold) external;
    /// @notice frozen
    /// @return _bool _bool
    function frozen() external view returns (bool);
    /// @notice owner
    /// @return _address _address
    function owner() external view returns (address);
    /// @notice guardianCount
    /// @return _uint8 _uint8
    function guardianCount() external view returns (uint8);
}

// Interfaces for contracts with Howey-safe mode
// NOTE: The Howey-safe mode interface was removed — compliance is now hardcoded as a
// constant in every ecosystem contract.  There is no runtime setter.

/// @notice IEcosystemVaultAdmin
/// @title IEcosystemVaultAdmin
/// @author Vfide
interface IEcosystemVaultAdmin {
    /// @notice configureAutoSwap
    /// @param _router _router
    /// @param _stablecoin _stablecoin
    /// @param _enabled _enabled
    /// @param _maxSlippageBps _maxSlippageBps
    function configureAutoSwap(address _router, address _stablecoin, bool _enabled, uint16 _maxSlippageBps) external;
    /// @notice configureAutoWorkPayout
    /// @param enabled enabled
    /// @param merchantTxReward merchantTxReward
    /// @param merchantReferralReward merchantReferralReward
    /// @param userReferralReward userReferralReward
    function configureAutoWorkPayout(bool enabled, uint256 merchantTxReward, uint256 merchantReferralReward, uint256 userReferralReward) external;
    /// @notice setManager
    /// @param manager manager
    /// @param active active
    function setManager(address manager, bool active) external;
    /// @notice setAllocations
    /// @param _councilBps _councilBps
    /// @param _merchantBps _merchantBps
    /// @param _headhunterBps _headhunterBps
    function setAllocations(uint16 _councilBps, uint16 _merchantBps, uint16 _headhunterBps) external;
    /// @notice autoSwapEnabled
    /// @return _bool _bool
    function autoSwapEnabled() external view returns (bool);
    /// @notice swapRouter
    /// @return _address _address
    function swapRouter() external view returns (address);
    /// @notice preferredStablecoin
    /// @return _address _address
    function preferredStablecoin() external view returns (address);
    /// @notice maxSlippageBps
    /// @return _uint16 _uint16
    function maxSlippageBps() external view returns (uint16);
    /// @notice autoWorkPayoutEnabled
    /// @return _bool _bool
    function autoWorkPayoutEnabled() external view returns (bool);
    /// @notice autoMerchantTxReward
    /// @return _uint256 _uint256
    function autoMerchantTxReward() external view returns (uint256);
    /// @notice autoMerchantReferralReward
    /// @return _uint256 _uint256
    function autoMerchantReferralReward() external view returns (uint256);
    /// @notice autoUserReferralReward
    /// @return _uint256 _uint256
    function autoUserReferralReward() external view returns (uint256);
}

/// @notice IVFIDETokenEmergencyConfirm
/// @title IVFIDETokenEmergencyConfirm
/// @author Vfide
interface IVFIDETokenEmergencyConfirm {
    /// @notice confirmFeeBypass
    function confirmFeeBypass() external;
    /// @notice confirmCircuitBreaker
    function confirmCircuitBreaker() external;
}

/// @notice OwnerControlPanel
/// @title OwnerControlPanel
/// @author Vfide
contract OwnerControlPanel {
    using SafeERC20 for IERC20;

    /// @notice _reentrancyLock
    uint256 private _reentrancyLock;
    
    /// @notice owner
    address public owner;
    /// @notice pendingOwner
    address public pendingOwner;
    /// @notice ownershipTransferDeadline
    uint64 public ownershipTransferDeadline;

    /// @notice OwnershipTransferStarted
    /// @param previousOwner previousOwner
    /// @param newOwner newOwner
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    /// @notice OwnershipTransferred
    /// @param previousOwner previousOwner
    /// @param newOwner newOwner
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    /// @notice vfideToken
    IVFIDEToken public vfideToken;
    /// @notice vaultHub
    IVaultHub public vaultHub;
    /// @notice burnRouter
    IProofScoreBurnRouter public burnRouter;
    /// @notice seer
    ISeer public seer;
    /// @notice devReserveVault
    address public devReserveVault;
    
    // New contract references for enhanced configuration
    /// @notice ecosystemVault
    IEcosystemVaultAdmin public ecosystemVault;
    /// @notice panicGuard
    IPanicGuard public panicGuard; // OCP-05: route vault risk reports through PanicGuard (NOT custody freeze; see vault_reportRisk)

    /// @notice governanceDelay
    uint256 public governanceDelay = 1 days;
    /// @notice MIN_GOVERNANCE_DELAY
    uint256 public constant MIN_GOVERNANCE_DELAY = 24 hours;
    /// @notice MAX_GOVERNANCE_DELAY
    uint256 public constant MAX_GOVERNANCE_DELAY = 30 days;
    /// @notice GOVERNANCE_ACTION_EXPIRY
    uint256 public constant GOVERNANCE_ACTION_EXPIRY = 30 days;
    /// @notice DELAY_REDUCTION_COOLDOWN
    uint256 public constant DELAY_REDUCTION_COOLDOWN = 30 days;
    /// @notice lastGovernanceDelayReductionAt
    uint256 public lastGovernanceDelayReductionAt;

    /// @notice maxAutoSwapSlippageBps
    uint16 public maxAutoSwapSlippageBps = 500;
    /// @notice MAX_ALLOWED_AUTOSWAP_SLIPPAGE_BPS
    uint16 public constant MAX_ALLOWED_AUTOSWAP_SLIPPAGE_BPS = 2000;
    /// @notice DEV_RESERVE_SUPPLY
    uint256 public constant DEV_RESERVE_SUPPLY = 50_000_000e18;

    /// @notice minAutoWorkPayoutWei
    uint256 public minAutoWorkPayoutWei;
    /// @notice maxAutoWorkPayoutWei
    uint256 public maxAutoWorkPayoutWei = 10_000 ether;
    /// @notice MAX_ALLOWED_AUTO_WORK_PAYOUT_WEI
    uint256 public constant MAX_ALLOWED_AUTO_WORK_PAYOUT_WEI = 1_000_000 ether;

    /// @notice queuedActionEta
    mapping(bytes32 => uint256) public queuedActionEta;
    
    /// @notice ContractsUpdated
    /// @param token token
    /// @param vaultHub vaultHub
    /// @param burnRouter burnRouter
    /// @param seer seer
    event ContractsUpdated(address token, address vaultHub, address burnRouter, address seer);
    /// @notice EcosystemContractsUpdated
    /// @param ecosystemVault ecosystemVault
    event EcosystemContractsUpdated(address ecosystemVault);
    /// @notice PanicGuardUpdated
    /// @param panicGuard panicGuard
    event PanicGuardUpdated(address panicGuard);
    /// @notice EmergencyAction
    /// @param action action
    /// @param target target
    event EmergencyAction(string action, address target);
    /// @notice FeePolicyUpdated
    /// @param minBps minBps
    /// @param maxBps maxBps
    event FeePolicyUpdated(uint16 minBps, uint16 maxBps);
    /// @notice AntiWhaleUpdated
    /// @param maxTransfer maxTransfer
    /// @param maxWallet maxWallet
    /// @param dailyLimit dailyLimit
    /// @param cooldown cooldown
    event AntiWhaleUpdated(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown);
    /// @notice AutoSwapConfigured
    /// @param router router
    /// @param stablecoin stablecoin
    /// @param enabled enabled
    /// @param maxSlippageBps maxSlippageBps
    event AutoSwapConfigured(address router, address stablecoin, bool enabled, uint16 maxSlippageBps);
    /// @notice GovernanceActionQueued
    /// @param actionId actionId
    /// @param executeAfter executeAfter
    event GovernanceActionQueued(bytes32 indexed actionId, uint256 executeAfter);
    /// @notice GovernanceActionCancelled
    /// @param actionId actionId
    event GovernanceActionCancelled(bytes32 indexed actionId);
    /// @notice GovernanceActionExecuted
    /// @param actionId actionId
    event GovernanceActionExecuted(bytes32 indexed actionId);
    /// @notice GovernanceDelayUpdated
    /// @param oldDelay oldDelay
    /// @param newDelay newDelay
    event GovernanceDelayUpdated(uint256 oldDelay, uint256 newDelay);
    /// @notice AutoSwapSlippageLimitUpdated
    /// @param oldLimit oldLimit
    /// @param newLimit newLimit
    event AutoSwapSlippageLimitUpdated(uint16 oldLimit, uint16 newLimit);
    /// @notice AutoWorkPayoutBoundsUpdated
    /// @param minReward minReward
    /// @param maxReward maxReward
    event AutoWorkPayoutBoundsUpdated(uint256 minReward, uint256 maxReward);
    /// @notice DevReserveVaultUpdated
    /// @param previousVault previousVault
    /// @param newVault newVault
    event DevReserveVaultUpdated(address indexed previousVault, address indexed newVault);
    
    /// @notice OCP_NotOwner
    error OCP_NotOwner();
    /// @notice OCP_NotPendingOwner
    error OCP_NotPendingOwner();
    /// @notice OCP_Zero
    error OCP_Zero();
    /// @notice OCP_ReentrantCall
    error OCP_ReentrantCall();
    /// @notice OCP_InvalidRange
    error OCP_InvalidRange();
    /// @notice OCP_ActionNotQueued
    error OCP_ActionNotQueued();
    /// @notice OCP_ActionNotReady
    /// @param executeAfter executeAfter
    error OCP_ActionNotReady(uint256 executeAfter);
    /// @notice OCP_ActionExpired
    /// @param expiredAt expiredAt
    error OCP_ActionExpired(uint256 expiredAt);
    /// @notice OCP_OwnershipTransferExpired
    error OCP_OwnershipTransferExpired();
    /// @notice OCP_SlippageTooHigh
    error OCP_SlippageTooHigh();
        /// @notice OCP_CooldownActive
        error OCP_CooldownActive();
        /// @notice OCP_ReduceTooLarge
        error OCP_ReduceTooLarge();
        /// @notice OCP_PanicGuardNotSet
        error OCP_PanicGuardNotSet();
        /// @notice OCP_ETHTransferFailed
        error OCP_ETHTransferFailed();
            /// @notice OCP_DeprecatedView
            error OCP_DeprecatedView();
    
    /// @notice onlyOwner
    modifier onlyOwner() {
        if (msg.sender != owner) revert OCP_NotOwner();
        _;
    }

    /// @notice nonReentrant
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /// @notice _nonReentrantBefore
    function _nonReentrantBefore() private {
        if (_reentrancyLock == 1) revert OCP_ReentrantCall();
        _reentrancyLock = 1;
    }

    /// @notice _nonReentrantAfter
    function _nonReentrantAfter() private {
        _reentrancyLock = 0;
    }

    /// @notice Step 1: current owner nominates a new owner
    /// @param newOwner newOwner
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert OCP_Zero();
        pendingOwner = newOwner;
        ownershipTransferDeadline = uint64(block.timestamp + 7 days);
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @notice Step 2: nominated owner accepts — prevents fat-finger transfers
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert OCP_NotPendingOwner();
        if (block.timestamp > ownershipTransferDeadline) revert OCP_OwnershipTransferExpired();
        address previous = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        ownershipTransferDeadline = 0;
        emit OwnershipTransferred(previous, owner);
    }

    /// @notice _consumeQueuedAction
    /// @param actionId actionId
    function _consumeQueuedAction(bytes32 actionId) internal {
        uint256 eta = queuedActionEta[actionId];
        if (eta < 1) revert OCP_ActionNotQueued();
        if (block.timestamp < eta) revert OCP_ActionNotReady(eta);
        uint256 expiredAt = eta + GOVERNANCE_ACTION_EXPIRY;
        if (block.timestamp > expiredAt) {
            delete queuedActionEta[actionId];
            revert OCP_ActionExpired(expiredAt);
        }
        delete queuedActionEta[actionId];
        emit GovernanceActionExecuted(actionId);
    }

    /// @notice _queueAction
    /// @param actionId actionId
    /// @return eta eta
    function _queueAction(bytes32 actionId) internal returns (uint256 eta) {
        eta = block.timestamp + governanceDelay;
        queuedActionEta[actionId] = eta;
        emit GovernanceActionQueued(actionId, eta);
    }
    
    /// @notice constructor
    /// @param _owner _owner
    /// @param _token _token
    /// @param _vaultHub _vaultHub
    /// @param _burnRouter _burnRouter
    /// @param _seer _seer
    constructor(
        address _owner,
        address _token,
        address _vaultHub,
        address _burnRouter,
        address _seer
    ) {
        if (_owner == address(0)) revert OCP_Zero();
        owner = _owner;
        
        if (_token != address(0)) vfideToken = IVFIDEToken(_token);
        if (_vaultHub != address(0)) vaultHub = IVaultHub(_vaultHub);
        if (_burnRouter != address(0)) burnRouter = IProofScoreBurnRouter(_burnRouter);
        if (_seer != address(0)) seer = ISeer(_seer);
    }
    
    /**
     * @notice Update contract references (if contracts are redeployed)
     * @param _token _token
     * @param _vaultHub _vaultHub
     * @param _burnRouter _burnRouter
     * @param _seer _seer
     */
    function setContracts(
        address _token,
        address _vaultHub,
        address _burnRouter,
        address _seer
    ) external onlyOwner {
        _consumeQueuedAction(keccak256(abi.encode("setContracts", _token, _vaultHub, _burnRouter, _seer)));
        if (_token != address(0)) vfideToken = IVFIDEToken(_token);
        if (_vaultHub != address(0)) vaultHub = IVaultHub(_vaultHub);
        if (_burnRouter != address(0)) burnRouter = IProofScoreBurnRouter(_burnRouter);
        if (_seer != address(0)) seer = ISeer(_seer);
        emit ContractsUpdated(_token, _vaultHub, _burnRouter, _seer);
    }
    
    /**
     * @notice Update ecosystem contract references
     * @dev Call this after deploying ecosystem contracts
     * @param _ecosystemVault _ecosystemVault
     */
    function setEcosystemContracts(
        address _ecosystemVault
    ) external onlyOwner {
        _consumeQueuedAction(keccak256(abi.encode("setEcosystemContracts", _ecosystemVault)));
        if (_ecosystemVault != address(0)) ecosystemVault = IEcosystemVaultAdmin(_ecosystemVault);
        emit EcosystemContractsUpdated(_ecosystemVault);
    }

    // slither-disable-next-line missing-zero-check
    /**
     * @notice Set DevReserve vesting vault address for live monitoring views
     * @param _devReserveVault _devReserveVault
     */
    function setDevReserveVault(address _devReserveVault) external onlyOwner {
        _consumeQueuedAction(actionId_setDevReserveVault(_devReserveVault));
        address previous = devReserveVault;
        devReserveVault = _devReserveVault;
        emit DevReserveVaultUpdated(previous, _devReserveVault);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          GOVERNANCE GUARDRAILS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice governance_setDelay
    /// @param newDelay newDelay
    function governance_setDelay(uint256 newDelay) external onlyOwner {
        if (newDelay < MIN_GOVERNANCE_DELAY || newDelay > MAX_GOVERNANCE_DELAY) {
            revert OCP_InvalidRange();
        }
        uint256 oldDelay = governanceDelay;
        if (newDelay < oldDelay) {
            if (lastGovernanceDelayReductionAt != 0 &&
                    block.timestamp < lastGovernanceDelayReductionAt + DELAY_REDUCTION_COOLDOWN)
                revert OCP_CooldownActive();
            if (newDelay < oldDelay / 2) revert OCP_ReduceTooLarge();
            lastGovernanceDelayReductionAt = block.timestamp;
        }
        _consumeQueuedAction(actionId_governance_setDelay(newDelay));
        governanceDelay = newDelay;
        emit GovernanceDelayUpdated(oldDelay, newDelay);
    }

    /// @notice governance_setMaxAutoSwapSlippageBps
    /// @param newLimit newLimit
    function governance_setMaxAutoSwapSlippageBps(uint16 newLimit) external onlyOwner {
        if (newLimit > MAX_ALLOWED_AUTOSWAP_SLIPPAGE_BPS) revert OCP_InvalidRange();
        _consumeQueuedAction(actionId_governance_setMaxAutoSwapSlippageBps(newLimit));
        uint16 oldLimit = maxAutoSwapSlippageBps;
        maxAutoSwapSlippageBps = newLimit;
        emit AutoSwapSlippageLimitUpdated(oldLimit, newLimit);
    }

    /// @notice governance_setAutoWorkPayoutBounds
    /// @param minReward minReward
    /// @param maxReward maxReward
    function governance_setAutoWorkPayoutBounds(uint256 minReward, uint256 maxReward) external onlyOwner {
        if (minReward > maxReward || maxReward > MAX_ALLOWED_AUTO_WORK_PAYOUT_WEI) {
            revert OCP_InvalidRange();
        }
        _consumeQueuedAction(actionId_governance_setAutoWorkPayoutBounds(minReward, maxReward));
        minAutoWorkPayoutWei = minReward;
        maxAutoWorkPayoutWei = maxReward;
        emit AutoWorkPayoutBoundsUpdated(minReward, maxReward);
    }

    /// @notice governance_queueAction
    /// @param actionId actionId
    /// @return executeAfter executeAfter
    function governance_queueAction(bytes32 actionId) external onlyOwner returns (uint256 executeAfter) {
        executeAfter = _queueAction(actionId);
        emit EmergencyAction("gov_q", address(this));
    }

    /// @notice governance_cancelAction
    /// @param actionId actionId
    function governance_cancelAction(bytes32 actionId) external onlyOwner {
        if (queuedActionEta[actionId] == 0) revert OCP_ActionNotQueued();
        delete queuedActionEta[actionId];
        emit GovernanceActionCancelled(actionId);
    }

    /// @notice actionId_token_lockPolicy
    /// @return _bytes32 _bytes32
    function actionId_token_lockPolicy() private pure returns (bytes32) {
        return keccak256(abi.encode("token_lockPolicy"));
    }

    /// @notice actionId_autoSwap_configure
    /// @param router router
    /// @param stablecoin stablecoin
    /// @param enabled enabled
    /// @param maxSlippageBps maxSlippageBps
    /// @return _bytes32 _bytes32
    function actionId_autoSwap_configure(
        address router,
        address stablecoin,
        bool enabled,
        uint16 maxSlippageBps
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("autoSwap_configure", router, stablecoin, enabled, maxSlippageBps));
    }

    /// @notice actionId_autoSwap_quickSetupUSDC
    /// @param router router
    /// @param usdc usdc
    /// @return _bytes32 _bytes32
    function actionId_autoSwap_quickSetupUSDC(address router, address usdc) private pure returns (bytes32) {
        return keccak256(abi.encode("autoSwap_quickSetupUSDC", router, usdc));
    }

    /// @notice actionId_token_setVaultOnly
    /// @param enabled enabled
    /// @return _bytes32 _bytes32
    function actionId_token_setVaultOnly(bool enabled) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setVaultOnly", enabled));
    }

    /// @notice actionId_token_setCircuitBreaker
    /// @param active active
    /// @param duration duration
    /// @return _bytes32 _bytes32
    function actionId_token_setCircuitBreaker(bool active, uint256 duration) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setCircuitBreaker", active, duration));
    }

    /// @notice H-01 FIX: Action ID for confirming a pending circuit breaker activation.
    /// @return _bytes32 _bytes32
    function actionId_token_confirmCircuitBreaker() private pure returns (bytes32) {
        return keccak256(abi.encode("token_confirmCircuitBreaker"));
    }

    // actionId_token_setBlacklist removed — non-custodial, no blacklist

    /// @notice actionId_token_setModules
    /// @param hub hub
    /// @param ledger ledger
    /// @param router router
    /// @return _bytes32 _bytes32
    function actionId_token_setModules(
        address hub,
        address ledger,
        address router
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setModules", hub, ledger, router));
    }

    /// @notice actionId_token_setEmergencyBreaker
    /// @param breaker breaker
    /// @return _bytes32 _bytes32
    function actionId_token_setEmergencyBreaker(address breaker) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setEmergencyBreaker", breaker));
    }

    /// @notice actionId_token_setFraudRegistry
    /// @param registry registry
    /// @return _bytes32 _bytes32
    function actionId_token_setFraudRegistry(address registry) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setFraudRegistry", registry));
    }

    /// @notice actionId_token_setEcosystemDistributor
    /// @param distributor distributor
    /// @return _bytes32 _bytes32
    function actionId_token_setEcosystemDistributor(address distributor) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setEcosystemDistributor", distributor));
    }

    /// @notice actionId_token_setSeerAutonomous
    /// @param seerAutonomous seerAutonomous
    /// @return _bytes32 _bytes32
    function actionId_token_setSeerAutonomous(address seerAutonomous) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setSeerAutonomous", seerAutonomous));
    }

    /// @notice actionId_token_setSinks
    /// @param treasury treasury
    /// @param sanctum sanctum
    /// @return _bytes32 _bytes32
    function actionId_token_setSinks(address treasury, address sanctum) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setSinks", treasury, sanctum));
    }

    /// @notice actionId_token_proposeSystemExempt
    /// @param who who
    /// @param isExempt isExempt
    /// @return _bytes32 _bytes32
    function actionId_token_proposeSystemExempt(address who, bool isExempt) private pure returns (bytes32) {
        return keccak256(abi.encode("token_proposeSystemExempt", who, isExempt));
    }

    /// @notice actionId_token_proposeWhitelist
    /// @param addr addr
    /// @param status status
    /// @return _bytes32 _bytes32
    function actionId_token_proposeWhitelist(address addr, bool status) private pure returns (bytes32) {
        return keccak256(abi.encode("token_proposeWhitelist", addr, status));
    }

    /// @notice actionId_sustainability_setBurnLimits
    /// @param dailyBurnCap dailyBurnCap
    /// @param minimumSupplyFloor minimumSupplyFloor
    /// @param ecosystemMinBps ecosystemMinBps
    /// @return _bytes32 _bytes32
    function actionId_sustainability_setBurnLimits(
        uint256 dailyBurnCap,
        uint256 minimumSupplyFloor,
        uint16 ecosystemMinBps
    ) private pure returns (bytes32) {
        return keccak256(
            abi.encode("sustainability_setBurnLimits", dailyBurnCap, minimumSupplyFloor, ecosystemMinBps)
        );
    }

    /// @notice actionId_sustainability_setAdaptiveFees
    /// @param lowVolumeThreshold lowVolumeThreshold
    /// @param highVolumeThreshold highVolumeThreshold
    /// @param lowVolMultiplier lowVolMultiplier
    /// @param highVolMultiplier highVolMultiplier
    /// @param enabled enabled
    /// @return _bytes32 _bytes32
    function actionId_sustainability_setAdaptiveFees(
        uint256 lowVolumeThreshold,
        uint256 highVolumeThreshold,
        uint16 lowVolMultiplier,
        uint16 highVolMultiplier,
        bool enabled
    ) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                "sustainability_setAdaptiveFees",
                lowVolumeThreshold,
                highVolumeThreshold,
                lowVolMultiplier,
                highVolMultiplier,
                enabled
            )
        );
    }

    /// @notice actionId_seer_setThresholds
    /// @param lowTrust lowTrust
    /// @param highTrust highTrust
    /// @param minGovernance minGovernance
    /// @param minMerchant minMerchant
    /// @return _bytes32 _bytes32
    function actionId_seer_setThresholds(
        uint16 lowTrust,
        uint16 highTrust,
        uint16 minGovernance,
        uint16 minMerchant
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("seer_setThresholds", lowTrust, highTrust, minGovernance, minMerchant));
    }

    /// @notice actionId_governance_setDelay
    /// @param newDelay newDelay
    /// @return _bytes32 _bytes32
    function actionId_governance_setDelay(uint256 newDelay) private pure returns (bytes32) {
        return keccak256(abi.encode("governance_setDelay", newDelay));
    }

    /// @notice actionId_setDevReserveVault
    /// @param vault vault
    /// @return _bytes32 _bytes32
    function actionId_setDevReserveVault(address vault) private pure returns (bytes32) {
        return keccak256(abi.encode("setDevReserveVault", vault));
    }

    /// @notice actionId_vault_setModules
    /// @param token token
    /// @param ledger ledger
    /// @return _bytes32 _bytes32
    function actionId_vault_setModules(address token, address ledger) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_setModules", token, ledger));
    }

    /// @notice actionId_vault_setDAOMultisig
    /// @param multisig multisig
    /// @return _bytes32 _bytes32
    function actionId_vault_setDAOMultisig(address multisig) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_setDAOMultisig", multisig));
    }

    /// @notice actionId_vault_setRecoveryTimelock
    /// @param timelock timelock
    /// @return _bytes32 _bytes32
    function actionId_vault_setRecoveryTimelock(uint64 timelock) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_setRecoveryTimelock", timelock));
    }

    /// @notice actionId_setPanicGuard
    /// @param panicGuardAddr panicGuardAddr
    /// @return _bytes32 _bytes32
    function actionId_setPanicGuard(address panicGuardAddr) private pure returns (bytes32) {
        return keccak256(abi.encode("setPanicGuard", panicGuardAddr));
    }

    /// @notice actionId_production_setupSafeDefaults
    /// @return _bytes32 _bytes32
    function actionId_production_setupSafeDefaults() private pure returns (bytes32) {
        return keccak256(abi.encode("production_setupSafeDefaults"));
    }

    /// @notice actionId_production_setupWithAutoSwap
    /// @param dexRouter dexRouter
    /// @param usdc usdc
    /// @return _bytes32 _bytes32
    function actionId_production_setupWithAutoSwap(address dexRouter, address usdc) private pure returns (bytes32) {
        return keccak256(abi.encode("production_setupWithAutoSwap", dexRouter, usdc));
    }

    /// @notice actionId_governance_setMaxAutoSwapSlippageBps
    /// @param newLimit newLimit
    /// @return _bytes32 _bytes32
    function actionId_governance_setMaxAutoSwapSlippageBps(uint16 newLimit) private pure returns (bytes32) {
        return keccak256(abi.encode("governance_setMaxAutoSwapSlippageBps", newLimit));
    }

    /// @notice actionId_governance_setAutoWorkPayoutBounds
    /// @param minReward minReward
    /// @param maxReward maxReward
    /// @return _bytes32 _bytes32
    function actionId_governance_setAutoWorkPayoutBounds(uint256 minReward, uint256 maxReward) private pure returns (bytes32) {
        return keccak256(abi.encode("governance_setAutoWorkPayoutBounds", minReward, maxReward));
    }

    /// @notice actionId_emergency_pauseAll
    /// @return _bytes32 _bytes32
    function actionId_emergency_pauseAll() private pure returns (bytes32) {
        return keccak256(abi.encode("emergency_pauseAll"));
    }

    /// @notice actionId_emergency_resumeAll
    /// @return _bytes32 _bytes32
    function actionId_emergency_resumeAll() private pure returns (bytes32) {
        return keccak256(abi.encode("emergency_resumeAll"));
    }

    /// @notice actionId_ecosystem_setAllocations
    /// @param councilBps councilBps
    /// @param merchantBps merchantBps
    /// @param headhunterBps headhunterBps
    /// @return _bytes32 _bytes32
    function actionId_ecosystem_setAllocations(
        uint16 councilBps,
        uint16 merchantBps,
        uint16 headhunterBps
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("ecosystem_setAllocations", councilBps, merchantBps, headhunterBps));
    }

    /// @notice actionId_ecosystem_configureAutoWorkPayout
    /// @param enabled enabled
    /// @param merchantTxReward merchantTxReward
    /// @param merchantReferralReward merchantReferralReward
    /// @param userReferralReward userReferralReward
    /// @return _bytes32 _bytes32
    function actionId_ecosystem_configureAutoWorkPayout(
        bool enabled,
        uint256 merchantTxReward,
        uint256 merchantReferralReward,
        uint256 userReferralReward
    ) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                "ecosystem_configureAutoWorkPayout",
                enabled,
                merchantTxReward,
                merchantReferralReward,
                userReferralReward
            )
        );
    }

    /// @notice actionId_emergency_recoverETH
    /// @param recipient recipient
    /// @return _bytes32 _bytes32
    function actionId_emergency_recoverETH(address recipient) private pure returns (bytes32) {
        return keccak256(abi.encode("emergency_recoverETH", recipient));
    }

    /// @notice actionId_emergency_recoverTokens
    /// @param token token
    /// @param recipient recipient
    /// @param amount amount
    /// @return _bytes32 _bytes32
    function actionId_emergency_recoverTokens(
        address token,
        address recipient,
        uint256 amount
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("emergency_recoverTokens", token, recipient, amount));
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          TOKEN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Configure token modules (VaultHub, Ledger, Router)
     * @param hub hub
     * @param ledger ledger
     * @param router router
     */
    function token_setModules(
        address hub,
        address ledger,
        address router
    ) external onlyOwner {
        _consumeQueuedAction(actionId_token_setModules(hub, ledger, router));
        if (hub != address(0)) vfideToken.setVaultHub(hub);
        if (ledger != address(0)) vfideToken.setLedger(ledger);
        if (router != address(0)) vfideToken.setBurnRouter(router);
    }

    /// @notice token_applyModules
    function token_applyModules() external onlyOwner nonReentrant {
        vfideToken.applyVaultHub();
        vfideToken.applyLedger();
        vfideToken.applyBurnRouter();
        emit EmergencyAction("tma", address(vfideToken));
    }

    /// @notice token_setEmergencyBreaker
    /// @param breaker breaker
    function token_setEmergencyBreaker(address breaker) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_setEmergencyBreaker(breaker));
        vfideToken.setEmergencyBreaker(breaker);
        emit EmergencyAction("tok_brk_set", breaker);
    }

    /// @notice token_applyEmergencyBreaker
    function token_applyEmergencyBreaker() external onlyOwner nonReentrant {
        vfideToken.applyEmergencyBreaker();
        emit EmergencyAction("tok_brk_apply", address(vfideToken));
    }

    /// @notice token_setFraudRegistry
    /// @param registry registry
    function token_setFraudRegistry(address registry) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_setFraudRegistry(registry));
        vfideToken.setFraudRegistry(registry);
        emit EmergencyAction("tok_fraud_set", registry);
    }

    /// @notice token_applyFraudRegistry
    function token_applyFraudRegistry() external onlyOwner nonReentrant {
        vfideToken.applyFraudRegistry();
        emit EmergencyAction("tok_fraud_apply", address(vfideToken));
    }

    /// @notice token_setEcosystemDistributor
    /// @param distributor distributor
    function token_setEcosystemDistributor(address distributor) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_setEcosystemDistributor(distributor));
        vfideToken.setEcosystemDistributor(distributor);
        emit EmergencyAction("tok_eco_set", distributor);
    }

    /// @notice token_applyEcosystemDistributor
    function token_applyEcosystemDistributor() external onlyOwner nonReentrant {
        vfideToken.applyEcosystemDistributor();
        emit EmergencyAction("tok_eco_apply", address(vfideToken));
    }

    /// @notice token_setSeerAutonomous
    /// @param seerAutonomous seerAutonomous
    function token_setSeerAutonomous(address seerAutonomous) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_setSeerAutonomous(seerAutonomous));
        vfideToken.setSeerAutonomous(seerAutonomous);
        emit EmergencyAction("tok_seer_set", seerAutonomous);
    }

    /// @notice token_cancelModules
    function token_cancelModules() external onlyOwner nonReentrant {
        // Best-effort: cancel each pending module change if present.
        try vfideToken.cancelVaultHub() {} catch {}
        try vfideToken.cancelLedger() {} catch {}
        try vfideToken.cancelBurnRouter() {} catch {}
        emit EmergencyAction("tmc", address(vfideToken));
    }
    
    /**
     * @notice Configure token sinks (Treasury, Sanctum)
     * @param treasury treasury
     * @param sanctum sanctum
     */
    function token_setSinks(
        address treasury,
        address sanctum
    ) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_setSinks(treasury, sanctum));
        if (treasury != address(0)) vfideToken.setTreasurySink(treasury);
        if (sanctum != address(0)) vfideToken.setSanctumSink(sanctum);
        emit EmergencyAction("tss", address(vfideToken));
    }

    /// @notice token_applySinks
    function token_applySinks() external onlyOwner nonReentrant {
        vfideToken.applyTreasurySink();
        vfideToken.applySanctumSink();
        emit EmergencyAction("tsa", address(vfideToken));
    }
    
    /**
     * @notice Propose system exemption with 48-hour timelock
     * @dev Exempts address from vault-only enforcement and all fees
     * @param who who
     * @param isExempt isExempt
     */
    function token_proposeSystemExempt(address who, bool isExempt) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_proposeSystemExempt(who, isExempt));
        vfideToken.proposeSystemExempt(who, isExempt);
        emit EmergencyAction(isExempt ? "tok_exm_prop" : "tok_exm_unprop", who);
    }

    /**
     * @notice Confirm a pending system exemption after timelock elapses
     */
    function token_confirmSystemExempt() external onlyOwner nonReentrant {
        vfideToken.confirmSystemExempt();
        emit EmergencyAction("tok_exm_conf", address(vfideToken));
    }

    /**
     * @notice Cancel a pending system exemption proposal
     */
    function token_cancelPendingSystemExempt() external onlyOwner nonReentrant {
        vfideToken.cancelPendingExempt();
        emit EmergencyAction("tok_exm_cancel", address(vfideToken));
    }
    
    /**
     * @notice Propose whitelist entry with 48-hour timelock
     * @param addr addr
     * @param status status
     */
    function token_proposeWhitelist(address addr, bool status) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_proposeWhitelist(addr, status));
        vfideToken.proposeWhitelist(addr, status);
        emit EmergencyAction(status ? "tok_wl_prop" : "tok_wl_unprop", addr);
    }

    /**
     * @notice Confirm a pending whitelist change
     */
    function token_confirmWhitelist() external onlyOwner nonReentrant {
        vfideToken.confirmWhitelist();
        emit EmergencyAction("tok_wl_conf", address(vfideToken));
    }

    /**
     * @notice Cancel a pending whitelist change
     */
    function token_cancelPendingWhitelist() external onlyOwner nonReentrant {
        vfideToken.cancelPendingWhitelist();
        emit EmergencyAction("tok_wl_cancel", address(vfideToken));
    }
    
    /**
     * @notice Enable/disable vault-only enforcement
     * @param enabled enabled
     */
    function token_setVaultOnly(bool enabled) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_setVaultOnly(enabled));
        vfideToken.setVaultOnly(enabled);
        emit EmergencyAction(enabled ? "tok_vo_on" : "tok_vo_off", address(vfideToken));
    }
    
    /**
     * @notice Lock policy permanently (ONE-WAY - cannot be undone!)
     */
    function token_lockPolicy() external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_lockPolicy());
        vfideToken.lockPolicy();
        emit EmergencyAction("tpl", address(vfideToken));
    }
    
    /**
     * @notice Emergency circuit breaker (bypass SecurityHub/BurnRouter)
     * @param active True to enable, false to disable
     * @param duration Duration in seconds (max 7 days). Ignored when disabling.
     */
    function token_setCircuitBreaker(bool active, uint256 duration) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_setCircuitBreaker(active, duration));
        vfideToken.setCircuitBreaker(active, duration);
        emit EmergencyAction(active ? "cb_on" : "cb_off", address(vfideToken));
    }

    /// @notice H-01 FIX: Confirm a pending circuit breaker activation after its 48-hour timelock.
    /// @dev Must be called after `token_setCircuitBreaker(true, ...)` + 48h delay to complete activation.
    function token_confirmCircuitBreaker() external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_token_confirmCircuitBreaker());
        vfideToken.confirmCircuitBreaker();
        emit EmergencyAction("cb_conf", address(vfideToken));
    }
    
    /**
     * @notice Check if circuit breaker is currently active
     */
    // ── Blacklist functions REMOVED — non-custodial ──────────────
    // No entity can blacklist another user's address. Fraud is handled
    // through FraudRegistry (DAO-verified, 30-day escrow, service ban).
    // ───────────────────────────────────────────────────────────────
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          ANTI-WHALE PROTECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Configure anti-whale limits (set to 0 to disable any limit)
     * @param maxTransfer Max tokens per single transfer (0 = disabled)
     * @param maxWallet Max tokens per wallet (0 = disabled)
     * @param dailyLimit Max tokens transferred per 24h (0 = disabled)
     * @param cooldown Seconds between transfers (0 = disabled)
     */
    // F-14 FIX: actionId helpers for newly-queued functions
    /// @notice actionId_token_setAntiWhale
    /// @param maxTransfer maxTransfer
    /// @param maxWallet maxWallet
    /// @param dailyLimit dailyLimit
    /// @param cooldown cooldown
    /// @return _bytes32 _bytes32
    function actionId_token_setAntiWhale(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setAntiWhale", maxTransfer, maxWallet, dailyLimit, cooldown));
    }
    /// @notice actionId_token_setWhaleLimitExempt
    /// @param addr addr
    /// @param exempt exempt
    /// @return _bytes32 _bytes32
    function actionId_token_setWhaleLimitExempt(address addr, bool exempt) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setWhaleLimitExempt", addr, exempt));
    }

    /// @notice token_setAntiWhale
    /// @param maxTransfer maxTransfer
    /// @param maxWallet maxWallet
    /// @param dailyLimit dailyLimit
    /// @param cooldown cooldown
    function token_setAntiWhale(
        uint256 maxTransfer,
        uint256 maxWallet,
        uint256 dailyLimit,
        uint256 cooldown
    ) external onlyOwner nonReentrant {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_token_setAntiWhale(maxTransfer, maxWallet, dailyLimit, cooldown));
        vfideToken.setAntiWhale(maxTransfer, maxWallet, dailyLimit, cooldown);
        emit AntiWhaleUpdated(maxTransfer, maxWallet, dailyLimit, cooldown);
    }
    
    /**
     * @notice Exempt address from whale limits (for exchanges, liquidity pools)
     * @param addr addr
     * @param exempt exempt
     */
    function token_setWhaleLimitExempt(address addr, bool exempt) external onlyOwner nonReentrant {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_token_setWhaleLimitExempt(addr, exempt));
        vfideToken.setWhaleLimitExempt(addr, exempt);
        emit EmergencyAction(exempt ? "weo" : "wef", addr);
    }
    
    // slither-disable-next-line reentrancy-no-eth
    /**
     * @notice Batch exempt multiple addresses from whale limits
     * @param addrs addrs
     * @param exempt exempt
     */
    function token_batchWhaleLimitExempt(address[] calldata addrs, bool exempt) external onlyOwner nonReentrant {
        for (uint256 i = 0; i < addrs.length; ++i) {
            // F-14 FIX: require governance queue per-address before execution
            _consumeQueuedAction(actionId_token_setWhaleLimitExempt(addrs[i], exempt));
            vfideToken.setWhaleLimitExempt(addrs[i], exempt);
        }
        emit EmergencyAction(exempt ? "wbo" : "wbf", address(vfideToken));
    }

    /// @notice token_applyAntiWhale
    function token_applyAntiWhale() external onlyOwner nonReentrant {
        vfideToken.applyAntiWhale();
        emit EmergencyAction("taw", address(vfideToken));
    }

    /// @notice token_applyWhaleLimitExempt
    /// @param addr addr
    function token_applyWhaleLimitExempt(address addr) external onlyOwner nonReentrant {
        vfideToken.applyWhaleLimitExempt(addr);
        emit EmergencyAction("twa", addr);
    }

    /// @notice token_applyVaultOnlyDisable
    function token_applyVaultOnlyDisable() external onlyOwner nonReentrant {
        vfideToken.applyVaultOnlyDisable();
        emit EmergencyAction("tva", address(vfideToken));
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          FEE CURVE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set fee curve parameters (linear interpolation between min and max)
     * @param minBps Minimum fee in basis points (e.g., 25 = 0.25%) for high-trust users
     * @param maxBps Maximum fee in basis points (e.g., 500 = 5%) for low-trust users
     * @return _bytes32 _bytes32
     */
    function actionId_fees_setPolicy(uint16 minBps, uint16 maxBps) private pure returns (bytes32) {
        return keccak256(abi.encode("fees_setPolicy", minBps, maxBps));
    }

    /// @notice fees_setPolicy
    /// @param minBps minBps
    /// @param maxBps maxBps
    function fees_setPolicy(uint16 minBps, uint16 maxBps) external onlyOwner nonReentrant {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_fees_setPolicy(minBps, maxBps));
        burnRouter.setFeePolicy(minBps, maxBps);
        emit FeePolicyUpdated(minBps, maxBps);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      SUSTAINABILITY CONTROLS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice SustainabilityUpdated
    /// @param dailyBurnCap dailyBurnCap
    /// @param supplyFloor supplyFloor
    /// @param ecosystemMinBps ecosystemMinBps
    event SustainabilityUpdated(uint256 dailyBurnCap, uint256 supplyFloor, uint16 ecosystemMinBps);
    /// @notice AdaptiveFeesUpdated
    /// @param lowVolThreshold lowVolThreshold
    /// @param highVolThreshold highVolThreshold
    /// @param lowVolMult lowVolMult
    /// @param highVolMult highVolMult
    /// @param enabled enabled
    event AdaptiveFeesUpdated(uint256 lowVolThreshold, uint256 highVolThreshold, uint16 lowVolMult, uint16 highVolMult, bool enabled);
    
    /**
     * @notice Configure burn sustainability limits
     * @param dailyBurnCap Maximum tokens to burn per day (0 = unlimited)
     * @param minimumSupplyFloor Supply floor below which burns pause (0 = no floor)
     * @param ecosystemMinBps Minimum ecosystem fee in basis points (ensures funding)
     */
    function sustainability_setBurnLimits(
        uint256 dailyBurnCap,
        uint256 minimumSupplyFloor,
        uint16 ecosystemMinBps
    ) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_sustainability_setBurnLimits(dailyBurnCap, minimumSupplyFloor, ecosystemMinBps));
        burnRouter.setSustainability(dailyBurnCap, minimumSupplyFloor, ecosystemMinBps);
        emit SustainabilityUpdated(dailyBurnCap, minimumSupplyFloor, ecosystemMinBps);
    }
    
    /**
     * @notice Configure volume-adaptive fee parameters
     * @param lowVolumeThreshold Below this daily volume = low (fees increase)
     * @param highVolumeThreshold Above this daily volume = high (fees decrease)
     * @param lowVolMultiplier Multiplier for low volume (10000 = 1x, 12000 = 1.2x)
     * @param highVolMultiplier Multiplier for high volume (10000 = 1x, 8000 = 0.8x)
     * @param enabled Whether adaptive fees are enabled
     */
    function sustainability_setAdaptiveFees(
        uint256 lowVolumeThreshold,
        uint256 highVolumeThreshold,
        uint16 lowVolMultiplier,
        uint16 highVolMultiplier,
        bool enabled
    ) external onlyOwner nonReentrant {
        _consumeQueuedAction(
            actionId_sustainability_setAdaptiveFees(
                lowVolumeThreshold,
                highVolumeThreshold,
                lowVolMultiplier,
                highVolMultiplier,
                enabled
            )
        );
        burnRouter.setAdaptiveFees(
            lowVolumeThreshold,
            highVolumeThreshold,
            lowVolMultiplier,
            highVolMultiplier,
            enabled
        );
        emit AdaptiveFeesUpdated(lowVolumeThreshold, highVolumeThreshold, lowVolMultiplier, highVolMultiplier, enabled);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          PROOFSCORE THRESHOLDS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set ProofScore thresholds (governance, merchant, trust levels)
     * @param lowTrust lowTrust
     * @param highTrust highTrust
     * @param minGovernance minGovernance
     * @param minMerchant minMerchant
     */
    function seer_setThresholds(
        uint16 lowTrust,
        uint16 highTrust,
        uint16 minGovernance,
        uint16 minMerchant
    ) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_seer_setThresholds(lowTrust, highTrust, minGovernance, minMerchant));
        seer.setThresholds(lowTrust, highTrust, minGovernance, minMerchant);
        emit EmergencyAction("seer_thr_set", address(seer));
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          VAULT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Configure VaultHub modules
     * @param token token
     * @param ledger ledger
     */
    function vault_setModules(
        address token,
        address ledger
    ) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_vault_setModules(token, ledger));
        if (token != address(0)) vaultHub.setVFIDEToken(token);
        if (ledger != address(0)) vaultHub.setProofLedger(ledger);
        emit EmergencyAction("vault_mod_set", address(vaultHub));
    }
    
    /**
     * @notice Set DAO recovery multisig
     * @param multisig multisig
     */
    function vault_setDAOMultisig(address multisig) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_vault_setDAOMultisig(multisig));
        vaultHub.setDAORecoveryMultisig(multisig);
        emit EmergencyAction("vault_msig_set", multisig);
    }
    
    /**
     * @notice Set DAO recovery timelock duration
     * @param timelock timelock
     */
    function vault_setRecoveryTimelock(uint64 timelock) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_vault_setRecoveryTimelock(timelock));
        vaultHub.setRecoveryTimelock(timelock);
        emit EmergencyAction("vrt", address(vaultHub));
    }

    // NOTE — Removed in v19.13 cleanup (2026-05-19):
    //   vault_requestDAORecovery / vault_finalizeDAORecovery /
    //   vault_cancelDAORecovery / vault_freezeVault.
    // These were `revert OCP_RecoveryDisabled / OCP_DeprecatedVaultFreeze`
    // stubs retained for ABI compatibility. Per the non-custody guarantee
    // ("the functions to do it are not in the code"), the ABI itself must
    // not advertise freeze/seize/DAO-recovery selectors. Removed outright
    // so external audit readers see absence-of-code, not presence-with-revert.
    // No external caller existed at removal time; git history retains the
    // prior implementation if a future arbiter-based recovery product needs
    // a reference.

    /**
     * @notice Set the PanicGuard contract used as the destination for vault_reportRisk calls.
     * @dev PanicGuard receives risk signals only; it has no custody freeze authority.
     *      Per the non-custody guarantee, no contract on the V1 path can seize or freeze user tokens.
     * @param _panicGuard _panicGuard
     */
    function setPanicGuard(address _panicGuard) external onlyOwner {
        if (_panicGuard == address(0)) revert OCP_Zero();
        _consumeQueuedAction(actionId_setPanicGuard(_panicGuard));
        panicGuard = IPanicGuard(_panicGuard);
        emit PanicGuardUpdated(_panicGuard);
    }

    /// @notice N-H19 FIX: Explicit risk-reporting primitive replacing misleading "freeze" semantics.
    /// @dev This triggers PanicGuard risk handling; it is NOT a per-vault custody freeze.
    /// @param vault vault
    /// @param duration duration
    /// @param severity severity
    /// @param reason reason
    function vault_reportRisk(address vault, uint64 duration, uint8 severity, string calldata reason)
        external
        onlyOwner
        nonReentrant
    {
        _consumeQueuedAction(keccak256(abi.encode("vault_reportRisk", vault, duration, severity, reason)));
        if (address(panicGuard) == address(0)) revert OCP_PanicGuardNotSet();
        panicGuard.reportRisk(vault, duration, severity, reason);
        emit EmergencyAction("vault_risk", vault);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          MONITORING / VIEWS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get comprehensive token status
     * @return totalSupply totalSupply
     * @return devReserveBalance devReserveBalance
     * @return treasuryBalance treasuryBalance
     * @return vaultOnly vaultOnly
     * @return policyLocked policyLocked
     * @return circuitBreaker circuitBreaker
     */
    function getTokenStatus() external view returns (
        uint256 totalSupply,
        uint256 devReserveBalance,
        uint256 treasuryBalance,
        bool vaultOnly,
        bool policyLocked,
        bool circuitBreaker
    ) {
        totalSupply = vfideToken.totalSupply();
        vaultOnly = vfideToken.vaultOnly();
        policyLocked = vfideToken.policyLocked();
        circuitBreaker = vfideToken.isCircuitBreakerActive();
        if (devReserveVault != address(0)) {
            devReserveBalance = vfideToken.balanceOf(devReserveVault);
        } else {
            devReserveBalance = DEV_RESERVE_SUPPLY;
        }
        treasuryBalance = vfideToken.balanceOf(vfideToken.treasurySink());
    }
    
    /**
     * @notice Get vault system status
     * @return totalVaults totalVaults
     * @return specificVault specificVault
     * @return isVault isVault
     */
    function getVaultStatus() external view returns (
        uint256 totalVaults,
        address specificVault,
        bool isVault
    ) {
        totalVaults = vaultHub.totalVaultsCreated();
        specificVault = vaultHub.vaultOf(msg.sender);
        isVault = vaultHub.isVault(specificVault);
    }
    
    /**
     * @notice Get specific vault details
     * @param vaultAddress vaultAddress
     * @return vaultOwner vaultOwner
     * @return guardianCount guardianCount
     * @return frozen frozen
     * @return isValid isValid
     */
    function getVaultDetails(address vaultAddress) external view returns (
        address vaultOwner,
        uint8 guardianCount,
        bool frozen,
        bool isValid
    ) {
        isValid = vaultHub.isVault(vaultAddress);
        if (isValid) {
            IUserVaultOCP vault = IUserVaultOCP(vaultAddress);
            vaultOwner = vault.owner();
            guardianCount = vault.guardianCount();
            frozen = vault.frozen();
        }
    }
    
    /**
     * @notice Check if address owns a vault
     * @param user user
     * @return _bool _bool
     * @return _address _address
     */
    function hasVault(address user) external view returns (bool, address) {
        address vault = vaultHub.vaultOf(user);
        return (vault != address(0), vault);
    }
    
    /**
     * @notice Deprecated dashboard helper retained for ABI compatibility.
     * @return _bool _bool
     * @return _bool _bool
     * @return _string _string
     */
    function getSystemHealth() external pure returns (
        bool,
        bool,
        string memory
    ) {
        revert OCP_DeprecatedView();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                     HOWEY COMPLIANCE STATUS (READ-ONLY)
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Howey-safe mode is HARDCODED as a constant in every ecosystem contract.
    // There are no runtime setters — compliance cannot be toggled at all.
    // These view functions exist purely for dashboard status display.
    
    /**
     * @notice Returns the Howey-safe status for each ecosystem contract.
     * @dev Always (true, true, true, true) — hardcoded in each contract.
     * @return dutyDistributorSafe dutyDistributorSafe
     * @return councilSalarySafe councilSalarySafe
     * @return councilManagerSafe councilManagerSafe
     * @return liquidityIncentivesSafe liquidityIncentivesSafe
     */
    function howey_getStatus() external pure returns (
        bool dutyDistributorSafe,
        bool councilSalarySafe,
        bool councilManagerSafe,
        bool liquidityIncentivesSafe
    ) {
        return (true, true, true, true);
    }
    
    /**
     * @notice Returns true — Howey-safe mode is permanently hardcoded.
     * @return allSafe allSafe
     */
    function howey_areAllSafe() external pure returns (bool allSafe) {
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          AUTO-SWAP CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Configure automatic VFIDE to stablecoin conversion for rewards
     * @dev Simplifies EcosystemVault.configureAutoSwap() call
     * @param router DEX router address (Uniswap V2 compatible)
     * @param stablecoin Preferred stablecoin (USDC, USDT, DAI, etc.)
     * @param enabled Enable automatic conversion
     * @param maxSlippageBps Maximum slippage tolerance (100 = 1%, max 500 = 5%)
     */
    function autoSwap_configure(
        address router,
        address stablecoin,
        bool enabled,
        uint16 maxSlippageBps
    ) external onlyOwner nonReentrant {
        if (maxSlippageBps > maxAutoSwapSlippageBps) revert OCP_SlippageTooHigh();
        _consumeQueuedAction(actionId_autoSwap_configure(router, stablecoin, enabled, maxSlippageBps));
        ecosystemVault.configureAutoSwap(router, stablecoin, enabled, maxSlippageBps);
        emit AutoSwapConfigured(router, stablecoin, enabled, maxSlippageBps);
    }
    
    /**
     * @notice Quick enable/disable auto-swap (keeps existing config)
     * @param enabled True to enable, false to disable
     */
    function autoSwap_setEnabled(bool enabled) external onlyOwner nonReentrant {
        // F-14 FIX: use same actionId as autoSwap_configure (same config, just toggling enabled)
        address router = ecosystemVault.swapRouter();
        address stablecoin = ecosystemVault.preferredStablecoin();
        uint16 slippage = ecosystemVault.maxSlippageBps();
        _consumeQueuedAction(actionId_autoSwap_configure(router, stablecoin, enabled, slippage));
        ecosystemVault.configureAutoSwap(router, stablecoin, enabled, slippage);
        emit AutoSwapConfigured(router, stablecoin, enabled, slippage);
    }
    
    /**
     * @notice Get current auto-swap configuration
     * @return router router
     * @return stablecoin stablecoin
     * @return enabled enabled
     * @return maxSlippageBps maxSlippageBps
     */
    function autoSwap_getConfig() external view returns (
        address router,
        address stablecoin,
        bool enabled,
        uint16 maxSlippageBps
    ) {
        return (
            ecosystemVault.swapRouter(),
            ecosystemVault.preferredStablecoin(),
            ecosystemVault.autoSwapEnabled(),
            ecosystemVault.maxSlippageBps()
        );
    }
    
    /**
     * @notice Quick setup for common stablecoin (USDC)
     * @param router DEX router address
     * @param usdc USDC token address
     */
    function autoSwap_quickSetupUSDC(address router, address usdc) external onlyOwner nonReentrant {
        if (100 > maxAutoSwapSlippageBps) revert OCP_SlippageTooHigh();
        _consumeQueuedAction(actionId_autoSwap_quickSetupUSDC(router, usdc));
        ecosystemVault.configureAutoSwap(router, usdc, true, 100); // 1% slippage
        emit AutoSwapConfigured(router, usdc, true, 100);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          ECOSYSTEM VAULT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set manager permissions for EcosystemVault
     * @param manager Address to grant/revoke manager role
     * @param active True to grant, false to revoke
     * @return _bytes32 _bytes32
     */
    function actionId_ecosystem_setManager(address manager, bool active) private pure returns (bytes32) {
        return keccak256(abi.encode("ecosystem_setManager", manager, active));
    }

    /// @notice ecosystem_setManager
    /// @param manager manager
    /// @param active active
    function ecosystem_setManager(address manager, bool active) external onlyOwner nonReentrant {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_ecosystem_setManager(manager, active));
        ecosystemVault.setManager(manager, active);
        emit EmergencyAction(active ? "ecosystem_manager_set" : "ecosystem_manager_removed", manager);
    }
    
    /**
     * @notice Set allocation percentages for ecosystem pools
     * @param councilBps Council allocation (basis points, e.g., 2500 = 25%)
     * @param merchantBps Merchant allocation (basis points)
     * @param headhunterBps Headhunter allocation (basis points)
     * @dev Total must equal 10000 (100%)
     */
    function ecosystem_setAllocations(
        uint16 councilBps,
        uint16 merchantBps,
        uint16 headhunterBps
    ) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_ecosystem_setAllocations(councilBps, merchantBps, headhunterBps));
        ecosystemVault.setAllocations(councilBps, merchantBps, headhunterBps);
        emit EmergencyAction("eco_alloc_set", address(ecosystemVault));
    }

    /**
     * @notice Configure automatic fixed work payouts for verified events
     * @param enabled Toggle auto payout behavior
     * @param merchantTxReward Fixed amount paid for qualified merchant transactions
     * @param merchantReferralReward Fixed amount paid for verified merchant referrals
     * @param userReferralReward Fixed amount paid for verified user referrals
     */
    function ecosystem_configureAutoWorkPayout(
        bool enabled,
        uint256 merchantTxReward,
        uint256 merchantReferralReward,
        uint256 userReferralReward
    ) external onlyOwner nonReentrant {
        if (
            !_isAutoWorkRewardWithinBounds(merchantTxReward) ||
            merchantTxReward > maxAutoWorkPayoutWei ||
            !_isAutoWorkRewardWithinBounds(merchantReferralReward) ||
            merchantReferralReward > maxAutoWorkPayoutWei ||
            !_isAutoWorkRewardWithinBounds(userReferralReward) ||
            userReferralReward > maxAutoWorkPayoutWei
        ) {
            revert OCP_InvalidRange();
        }
        _consumeQueuedAction(
            actionId_ecosystem_configureAutoWorkPayout(
                enabled,
                merchantTxReward,
                merchantReferralReward,
                userReferralReward
            )
        );
        ecosystemVault.configureAutoWorkPayout(
            enabled,
            merchantTxReward,
            merchantReferralReward,
            userReferralReward
        );
        emit EmergencyAction(enabled ? "ecosystem_auto_work_enabled" : "ecosystem_auto_work_disabled", address(ecosystemVault));
    }

    /// @notice _isAutoWorkRewardWithinBounds
    /// @param rewardWei rewardWei
    /// @return _bool _bool
    function _isAutoWorkRewardWithinBounds(uint256 rewardWei) internal view returns (bool) {
        // Zero explicitly disables that payout category.
        if (rewardWei == 0) return true;
        return rewardWei >= minAutoWorkPayoutWei;
    }

    /**
     * @notice Get current automatic fixed work payout configuration
     * @return enabled enabled
     * @return merchantTxReward merchantTxReward
     * @return merchantReferralReward merchantReferralReward
     * @return userReferralReward userReferralReward
     */
    function ecosystem_getAutoWorkPayoutConfig() external view returns (
        bool enabled,
        uint256 merchantTxReward,
        uint256 merchantReferralReward,
        uint256 userReferralReward
    ) {
        return (
            ecosystemVault.autoWorkPayoutEnabled(),
            ecosystemVault.autoMerchantTxReward(),
            ecosystemVault.autoMerchantReferralReward(),
            ecosystemVault.autoUserReferralReward()
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          ONE-CLICK PRODUCTION SETUP
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Production setup with recommended safe defaults
     * @dev Disables auto-swap (safest starting configuration).
     *      Howey-safe mode is hardcoded — no calls needed.
     */
    function production_setupSafeDefaults() external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_production_setupSafeDefaults());
        // Disable auto-swap (start conservatively)
        if (address(ecosystemVault) != address(0)) {
            address router = ecosystemVault.swapRouter();
            address stablecoin = ecosystemVault.preferredStablecoin();
            uint16 slippage = ecosystemVault.maxSlippageBps();
            ecosystemVault.configureAutoSwap(router, stablecoin, false, slippage);
        }
        
        emit EmergencyAction("prod_safe_set", address(this));
    }
    
    /**
     * @notice Production setup with auto-swap enabled
     * @dev Enables auto-swap for stablecoin payments.
     *      Howey-safe mode is hardcoded — no calls needed.
     * @param dexRouter DEX router address for swaps
     * @param usdc USDC token address (or other preferred stablecoin)
     */
    function production_setupWithAutoSwap(address dexRouter, address usdc) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_production_setupWithAutoSwap(dexRouter, usdc));
        // Enable auto-swap with conservative 1% slippage
        if (address(ecosystemVault) != address(0)) {
            ecosystemVault.configureAutoSwap(dexRouter, usdc, true, 100);
        }
        
        emit EmergencyAction("prod_as_set", address(this));
    }
    
    /**
     * @notice Deprecated dashboard helper retained for ABI compatibility.
     * @return _bool _bool
     * @return _bool _bool
     * @return _bool _bool
     * @return _bool _bool
     * @return _bool _bool
     * @return _string _string
     */
    function system_getStatus() external pure returns (
        bool,
        bool,
        bool,
        bool,
        bool,
        string memory
    ) {
        revert OCP_DeprecatedView();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    // slither-disable-next-line reentrancy-events
    /**
     * @notice Emergency pause all systems
     * @dev Stage 1 only: proposes emergency flags on VFIDEToken.
     *      Call emergency_confirmPauseAll() after timelock elapses.
     */
    function emergency_pauseAll() external onlyOwner {
        _consumeQueuedAction(actionId_emergency_pauseAll());
        // SecurityHub bypass removed — non-custodial (no third-party locks to bypass)
        vfideToken.setFeeBypass(true, 1 days);
        // Queue circuit breaker activation (requires confirmCircuitBreaker() after 48h)
        vfideToken.setCircuitBreaker(true, 1 days);
        
        emit EmergencyAction("sys_pause_prop", address(this));
    }

    // slither-disable-next-line reentrancy-events
    /**
     * @notice Confirm emergency pause after timelock elapsed
     */
    function emergency_confirmPauseAll() external onlyOwner {
        IVFIDETokenEmergencyConfirm(address(vfideToken)).confirmFeeBypass();
        IVFIDETokenEmergencyConfirm(address(vfideToken)).confirmCircuitBreaker();

        emit EmergencyAction("sys_paused", address(this));
    }
    
    // slither-disable-next-line reentrancy-events
    /**
     * @notice Resume all systems
     */
    function emergency_resumeAll() external onlyOwner {
        _consumeQueuedAction(actionId_emergency_resumeAll());
        // SecurityHub bypass removed — non-custodial
        vfideToken.setFeeBypass(false, 0);
        vfideToken.setCircuitBreaker(false, 0);
        
        emit EmergencyAction("sys_resumed", address(this));
    }
    
    /**
     * @notice Recover ETH sent to this contract
     * @param recipient recipient
     */
    function emergency_recoverETH(address payable recipient) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_emergency_recoverETH(recipient));
        if (recipient == address(0)) revert OCP_Zero();
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = recipient.call{value: balance}("");
            if (!success) revert OCP_ETHTransferFailed();
            emit EmergencyAction("eth_recover", recipient);
        }
    }
    
    /**
     * @notice Recover ERC20 tokens sent to this contract
     * @param token token
     * @param recipient recipient
     * @param amount amount
     */
    function emergency_recoverTokens(address token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        _consumeQueuedAction(actionId_emergency_recoverTokens(token, recipient, amount));
        if (token == address(0) || recipient == address(0)) revert OCP_Zero();
        IERC20(token).safeTransfer(recipient, amount);
        emit EmergencyAction("tok_recover", token);
    }
    
    // Allow contract to receive ETH for emergency recovery
    /// @notice receive
    receive() external payable {}
}
