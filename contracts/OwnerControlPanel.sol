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
 */

interface IUserVaultOCP {
    function setFrozen(bool _frozen) external;
    function setAbnormalTransactionThreshold(uint256 threshold) external;
    function setWithdrawalCooldown(uint64 cooldown) external;
    function setLargeTransferThreshold(uint256 threshold) external;
    function frozen() external view returns (bool);
    function owner() external view returns (address);
    function guardianCount() external view returns (uint8);
}

// Interfaces for contracts with Howey-safe mode
// NOTE: The Howey-safe mode interface was removed — compliance is now hardcoded as a
// constant in every ecosystem contract.  There is no runtime setter.

interface IEcosystemVaultAdmin {
    function configureAutoSwap(address _router, address _stablecoin, bool _enabled, uint16 _maxSlippageBps) external;
    function configureAutoWorkPayout(bool enabled, uint256 merchantTxReward, uint256 merchantReferralReward, uint256 userReferralReward) external;
    function setManager(address manager, bool active) external;
    function setAllocations(uint16 _councilBps, uint16 _merchantBps, uint16 _headhunterBps) external;
    function autoSwapEnabled() external view returns (bool);
    function swapRouter() external view returns (address);
    function preferredStablecoin() external view returns (address);
    function maxSlippageBps() external view returns (uint16);
    function autoWorkPayoutEnabled() external view returns (bool);
    function autoMerchantTxReward() external view returns (uint256);
    function autoMerchantReferralReward() external view returns (uint256);
    function autoUserReferralReward() external view returns (uint256);
}

contract OwnerControlPanel {
    using SafeERC20 for IERC20;
    
    address public owner;
    address public pendingOwner;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    IVFIDEToken public vfideToken;
    IVaultHub public vaultHub;
    IProofScoreBurnRouter public burnRouter;
    ISeer public seer;
    address public devReserveVault;
    
    // New contract references for enhanced configuration
    IEcosystemVaultAdmin public ecosystemVault;
    IPanicGuard public panicGuard; // OCP-05: route vault freeze through PanicGuard

    uint256 public governanceDelay = 1 days;
    uint256 public constant MIN_GOVERNANCE_DELAY = 24 hours;
    uint256 public constant MAX_GOVERNANCE_DELAY = 30 days;
    uint256 public constant DELAY_REDUCTION_COOLDOWN = 30 days;
    uint256 public lastGovernanceDelayReductionAt;

    uint16 public maxAutoSwapSlippageBps = 500;
    uint16 public constant MAX_ALLOWED_AUTOSWAP_SLIPPAGE_BPS = 2000;
    uint256 public constant DEV_RESERVE_SUPPLY = 50_000_000e18;

    uint256 public minAutoWorkPayoutWei;
    uint256 public maxAutoWorkPayoutWei = 10_000 ether;
    uint256 public constant MAX_ALLOWED_AUTO_WORK_PAYOUT_WEI = 1_000_000 ether;

    mapping(bytes32 => uint256) public queuedActionEta;
    
    event ContractsUpdated(address token, address vaultHub, address burnRouter, address seer);
    event EcosystemContractsUpdated(address ecosystemVault);
    event PanicGuardUpdated(address panicGuard);
    event EmergencyAction(string action, address target);
    event FeePolicyUpdated(uint16 minBps, uint16 maxBps);
    event AntiWhaleUpdated(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown);
    event AutoSwapConfigured(address router, address stablecoin, bool enabled, uint16 maxSlippageBps);
    event GovernanceActionQueued(bytes32 indexed actionId, uint256 executeAfter);
    event GovernanceActionCancelled(bytes32 indexed actionId);
    event GovernanceActionExecuted(bytes32 indexed actionId);
    event GovernanceDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event AutoSwapSlippageLimitUpdated(uint16 oldLimit, uint16 newLimit);
    event AutoWorkPayoutBoundsUpdated(uint256 minReward, uint256 maxReward);
    event DevReserveVaultUpdated(address indexed previousVault, address indexed newVault);
    
    error OCP_NotOwner();
    error OCP_NotPendingOwner();
    error OCP_Zero();
    error OCP_InvalidRange();
    error OCP_ActionNotQueued();
    error OCP_ActionNotReady(uint256 executeAfter);
    error OCP_SlippageTooHigh();
        error OCP_CooldownActive();
        error OCP_ReduceTooLarge();
        error OCP_PanicGuardNotSet();
        error OCP_ETHTransferFailed();
            error OCP_UnfreezeViaDAO();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OCP_NotOwner();
        _;
    }

    /// @notice Step 1: current owner nominates a new owner
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert OCP_Zero();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @notice Step 2: nominated owner accepts — prevents fat-finger transfers
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert OCP_NotPendingOwner();
        address previous = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previous, owner);
    }

    function _consumeQueuedAction(bytes32 actionId) internal {
        uint256 eta = queuedActionEta[actionId];
        if (eta < 1) revert OCP_ActionNotQueued();
        if (block.timestamp < eta) revert OCP_ActionNotReady(eta);
        delete queuedActionEta[actionId];
        emit GovernanceActionExecuted(actionId);
    }

    function _queueAction(bytes32 actionId) internal returns (uint256 eta) {
        eta = block.timestamp + governanceDelay;
        queuedActionEta[actionId] = eta;
        emit GovernanceActionQueued(actionId, eta);
    }
    
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
     */
    function setEcosystemContracts(
        address _ecosystemVault
    ) external onlyOwner {
        _consumeQueuedAction(keccak256(abi.encode("setEcosystemContracts", _ecosystemVault)));
        if (_ecosystemVault != address(0)) ecosystemVault = IEcosystemVaultAdmin(_ecosystemVault);
        emit EcosystemContractsUpdated(_ecosystemVault);
    }

    /**
     * @notice Set DevReserve vesting vault address for live monitoring views
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

    function governance_setMaxAutoSwapSlippageBps(uint16 newLimit) external onlyOwner {
        if (newLimit > MAX_ALLOWED_AUTOSWAP_SLIPPAGE_BPS) revert OCP_InvalidRange();
        _consumeQueuedAction(actionId_governance_setMaxAutoSwapSlippageBps(newLimit));
        uint16 oldLimit = maxAutoSwapSlippageBps;
        maxAutoSwapSlippageBps = newLimit;
        emit AutoSwapSlippageLimitUpdated(oldLimit, newLimit);
    }

    function governance_setAutoWorkPayoutBounds(uint256 minReward, uint256 maxReward) external onlyOwner {
        if (minReward > maxReward || maxReward > MAX_ALLOWED_AUTO_WORK_PAYOUT_WEI) {
            revert OCP_InvalidRange();
        }
        _consumeQueuedAction(actionId_governance_setAutoWorkPayoutBounds(minReward, maxReward));
        minAutoWorkPayoutWei = minReward;
        maxAutoWorkPayoutWei = maxReward;
        emit AutoWorkPayoutBoundsUpdated(minReward, maxReward);
    }

    function governance_queueAction(bytes32 actionId) external onlyOwner returns (uint256 executeAfter) {
        return _queueAction(actionId);
    }

    function governance_cancelAction(bytes32 actionId) external onlyOwner {
        if (queuedActionEta[actionId] == 0) revert OCP_ActionNotQueued();
        delete queuedActionEta[actionId];
        emit GovernanceActionCancelled(actionId);
    }

    function actionId_token_lockPolicy() private pure returns (bytes32) {
        return keccak256(abi.encode("token_lockPolicy"));
    }

    function actionId_autoSwap_configure(
        address router,
        address stablecoin,
        bool enabled,
        uint16 maxSlippageBps
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("autoSwap_configure", router, stablecoin, enabled, maxSlippageBps));
    }

    function actionId_autoSwap_quickSetupUSDC(address router, address usdc) private pure returns (bytes32) {
        return keccak256(abi.encode("autoSwap_quickSetupUSDC", router, usdc));
    }

    function actionId_token_setVaultOnly(bool enabled) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setVaultOnly", enabled));
    }

    function actionId_token_setCircuitBreaker(bool active, uint256 duration) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setCircuitBreaker", active, duration));
    }

    /// @notice H-01 FIX: Action ID for confirming a pending circuit breaker activation.
    function actionId_token_confirmCircuitBreaker() private pure returns (bytes32) {
        return keccak256(abi.encode("token_confirmCircuitBreaker"));
    }

    function actionId_token_setBlacklist(address user, bool status) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setBlacklist", user, status));
    }

    function actionId_token_setModules(
        address hub,
        address security,
        address ledger,
        address router
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setModules", hub, security, ledger, router));
    }

    function actionId_token_setSinks(address treasury, address sanctum) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setSinks", treasury, sanctum));
    }

    function actionId_sustainability_setBurnLimits(
        uint256 dailyBurnCap,
        uint256 minimumSupplyFloor,
        uint16 ecosystemMinBps
    ) private pure returns (bytes32) {
        return keccak256(
            abi.encode("sustainability_setBurnLimits", dailyBurnCap, minimumSupplyFloor, ecosystemMinBps)
        );
    }

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

    function actionId_sustainability_setTokenReference(address token) private pure returns (bytes32) {
        return keccak256(abi.encode("sustainability_setTokenReference", token));
    }

    function actionId_seer_setThresholds(
        uint16 lowTrust,
        uint16 highTrust,
        uint16 minGovernance,
        uint16 minMerchant
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("seer_setThresholds", lowTrust, highTrust, minGovernance, minMerchant));
    }

    function actionId_vault_requestDAORecovery(address vault, address newOwner) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_requestDAORecovery", vault, newOwner));
    }

    function actionId_vault_finalizeDAORecovery(address vault) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_finalizeDAORecovery", vault));
    }

    function actionId_vault_cancelDAORecovery(address vault) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_cancelDAORecovery", vault));
    }

    function actionId_governance_setDelay(uint256 newDelay) private pure returns (bytes32) {
        return keccak256(abi.encode("governance_setDelay", newDelay));
    }

    function actionId_setDevReserveVault(address vault) private pure returns (bytes32) {
        return keccak256(abi.encode("setDevReserveVault", vault));
    }

    function actionId_vault_setModules(address token, address security, address ledger) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_setModules", token, security, ledger));
    }

    function actionId_vault_setDAOMultisig(address multisig) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_setDAOMultisig", multisig));
    }

    function actionId_vault_setRecoveryTimelock(uint64 timelock) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_setRecoveryTimelock", timelock));
    }

    function actionId_setPanicGuard(address panicGuardAddr) private pure returns (bytes32) {
        return keccak256(abi.encode("setPanicGuard", panicGuardAddr));
    }

    function actionId_vault_freezeVault(address vault, bool frozen) private pure returns (bytes32) {
        return keccak256(abi.encode("vault_freezeVault", vault, frozen));
    }

    function actionId_production_setupSafeDefaults() private pure returns (bytes32) {
        return keccak256(abi.encode("production_setupSafeDefaults"));
    }

    function actionId_production_setupWithAutoSwap(address dexRouter, address usdc) private pure returns (bytes32) {
        return keccak256(abi.encode("production_setupWithAutoSwap", dexRouter, usdc));
    }

    function actionId_governance_setMaxAutoSwapSlippageBps(uint16 newLimit) private pure returns (bytes32) {
        return keccak256(abi.encode("governance_setMaxAutoSwapSlippageBps", newLimit));
    }

    function actionId_governance_setAutoWorkPayoutBounds(uint256 minReward, uint256 maxReward) private pure returns (bytes32) {
        return keccak256(abi.encode("governance_setAutoWorkPayoutBounds", minReward, maxReward));
    }

    function actionId_emergency_pauseAll() private pure returns (bytes32) {
        return keccak256(abi.encode("emergency_pauseAll"));
    }

    function actionId_emergency_resumeAll() private pure returns (bytes32) {
        return keccak256(abi.encode("emergency_resumeAll"));
    }

    function actionId_ecosystem_setAllocations(
        uint16 councilBps,
        uint16 merchantBps,
        uint16 headhunterBps
    ) private pure returns (bytes32) {
        return keccak256(abi.encode("ecosystem_setAllocations", councilBps, merchantBps, headhunterBps));
    }

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

    function actionId_emergency_recoverETH(address recipient) private pure returns (bytes32) {
        return keccak256(abi.encode("emergency_recoverETH", recipient));
    }

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
     * @notice Configure token modules (VaultHub, SecurityHub, Ledger, Router)
     */
    function token_setModules(
        address hub,
        address security,
        address ledger,
        address router
    ) external onlyOwner {
        _consumeQueuedAction(actionId_token_setModules(hub, security, ledger, router));
        if (hub != address(0)) vfideToken.setVaultHub(hub);
        if (security != address(0)) vfideToken.setSecurityHub(security);
        if (ledger != address(0)) vfideToken.setLedger(ledger);
        if (router != address(0)) vfideToken.setBurnRouter(router);
    }

    function token_applyModules() external onlyOwner {
        vfideToken.applyVaultHub();
        vfideToken.applySecurityHub();
        vfideToken.applyLedger();
        vfideToken.applyBurnRouter();
    }

    function token_cancelModules() external onlyOwner {
        // Best-effort: cancel each pending module change if present.
        try vfideToken.cancelVaultHub() {} catch {}
        try vfideToken.cancelSecurityHub() {} catch {}
        try vfideToken.cancelLedger() {} catch {}
        try vfideToken.cancelBurnRouter() {} catch {}
    }
    
    /**
     * @notice Configure token sinks (Treasury, Sanctum)
     */
    function token_setSinks(
        address treasury,
        address sanctum
    ) external onlyOwner {
        _consumeQueuedAction(actionId_token_setSinks(treasury, sanctum));
        if (treasury != address(0)) vfideToken.setTreasurySink(treasury);
        if (sanctum != address(0)) vfideToken.setSanctumSink(sanctum);
    }
    
    /**
     * @notice Propose system exemption with 48-hour timelock
     * @dev Exempts address from vault-only enforcement and all fees
     */
    function token_proposeSystemExempt(address who, bool isExempt) external onlyOwner {
        vfideToken.proposeSystemExempt(who, isExempt);
    }

    /**
     * @notice Confirm a pending system exemption after timelock elapses
     */
    function token_confirmSystemExempt() external onlyOwner {
        vfideToken.confirmSystemExempt();
    }

    /**
     * @notice Cancel a pending system exemption proposal
     */
    function token_cancelPendingSystemExempt() external onlyOwner {
        vfideToken.cancelPendingExempt();
    }
    
    /**
     * @notice Propose whitelist entry with 48-hour timelock
     */
    function token_proposeWhitelist(address addr, bool status) external onlyOwner {
        vfideToken.proposeWhitelist(addr, status);
    }

    /**
     * @notice Confirm a pending whitelist change
     */
    function token_confirmWhitelist() external onlyOwner {
        vfideToken.confirmWhitelist();
    }

    /**
     * @notice Cancel a pending whitelist change
     */
    function token_cancelPendingWhitelist() external onlyOwner {
        vfideToken.cancelPendingWhitelist();
    }
    
    /**
     * @notice Enable/disable vault-only enforcement
     */
    function token_setVaultOnly(bool enabled) external onlyOwner {
        _consumeQueuedAction(actionId_token_setVaultOnly(enabled));
        vfideToken.setVaultOnly(enabled);
    }
    
    /**
     * @notice Lock policy permanently (ONE-WAY - cannot be undone!)
     */
    function token_lockPolicy() external onlyOwner {
        _consumeQueuedAction(actionId_token_lockPolicy());
        vfideToken.lockPolicy();
    }
    
    /**
     * @notice Emergency circuit breaker (bypass SecurityHub/BurnRouter)
     * @param active True to enable, false to disable
     * @param duration Duration in seconds (max 7 days). Ignored when disabling.
     */
    function token_setCircuitBreaker(bool active, uint256 duration) external onlyOwner {
        _consumeQueuedAction(actionId_token_setCircuitBreaker(active, duration));
        vfideToken.setCircuitBreaker(active, duration);
        emit EmergencyAction(active ? "circuit_breaker_on" : "circuit_breaker_off", address(vfideToken));
    }

    /// @notice H-01 FIX: Confirm a pending circuit breaker activation after its 48-hour timelock.
    /// @dev Must be called after `token_setCircuitBreaker(true, ...)` + 48h delay to complete activation.
    function token_confirmCircuitBreaker() external onlyOwner {
        _consumeQueuedAction(actionId_token_confirmCircuitBreaker());
        vfideToken.confirmCircuitBreaker();
        emit EmergencyAction("circuit_breaker_confirmed", address(vfideToken));
    }
    
    /**
     * @notice Check if circuit breaker is currently active
     */
    /**
     * @notice Blacklist address for compliance (sanctions)
     */
    function token_setBlacklist(address user, bool status) external onlyOwner {
        _consumeQueuedAction(actionId_token_setBlacklist(user, status));
        vfideToken.setBlacklist(user, status);
    }
    
    /**
     * @notice Batch blacklist multiple addresses
     * @dev Each address requires its own queued action to prevent timelock bypass
     */
    function token_batchBlacklist(address[] calldata users, bool status) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            _consumeQueuedAction(actionId_token_setBlacklist(users[i], status));
            vfideToken.setBlacklist(users[i], status);
        }
    }
    
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
    function actionId_token_setAntiWhale(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setAntiWhale", maxTransfer, maxWallet, dailyLimit, cooldown));
    }
    function actionId_token_setWhaleLimitExempt(address addr, bool exempt) private pure returns (bytes32) {
        return keccak256(abi.encode("token_setWhaleLimitExempt", addr, exempt));
    }

    function token_setAntiWhale(
        uint256 maxTransfer,
        uint256 maxWallet,
        uint256 dailyLimit,
        uint256 cooldown
    ) external onlyOwner {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_token_setAntiWhale(maxTransfer, maxWallet, dailyLimit, cooldown));
        vfideToken.setAntiWhale(maxTransfer, maxWallet, dailyLimit, cooldown);
    }
    
    /**
     * @notice Exempt address from whale limits (for exchanges, liquidity pools)
     */
    function token_setWhaleLimitExempt(address addr, bool exempt) external onlyOwner {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_token_setWhaleLimitExempt(addr, exempt));
        vfideToken.setWhaleLimitExempt(addr, exempt);
    }
    
    /**
     * @notice Batch exempt multiple addresses from whale limits
     */
    function token_batchWhaleLimitExempt(address[] calldata addrs, bool exempt) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            // F-14 FIX: require governance queue per-address before execution
            _consumeQueuedAction(actionId_token_setWhaleLimitExempt(addrs[i], exempt));
            vfideToken.setWhaleLimitExempt(addrs[i], exempt);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          FEE CURVE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set fee curve parameters (linear interpolation between min and max)
     * @param minBps Minimum fee in basis points (e.g., 25 = 0.25%) for high-trust users
     * @param maxBps Maximum fee in basis points (e.g., 500 = 5%) for low-trust users
     */
    function actionId_fees_setPolicy(uint16 minBps, uint16 maxBps) private pure returns (bytes32) {
        return keccak256(abi.encode("fees_setPolicy", minBps, maxBps));
    }

    function fees_setPolicy(uint16 minBps, uint16 maxBps) external onlyOwner {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_fees_setPolicy(minBps, maxBps));
        burnRouter.setFeePolicy(minBps, maxBps);
        emit FeePolicyUpdated(minBps, maxBps);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      SUSTAINABILITY CONTROLS
    // ═══════════════════════════════════════════════════════════════════════
    
    event SustainabilityUpdated(uint256 dailyBurnCap, uint256 supplyFloor, uint16 ecosystemMinBps);
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
    ) external onlyOwner {
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
    ) external onlyOwner {
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
    
    /**
     * @notice Set token reference on burn router (required for supply checks)
     */
    function sustainability_setTokenReference(address token) external onlyOwner {
        _consumeQueuedAction(actionId_sustainability_setTokenReference(token));
        burnRouter.setToken(token);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          PROOFSCORE THRESHOLDS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set ProofScore thresholds (governance, merchant, trust levels)
     */
    function seer_setThresholds(
        uint16 lowTrust,
        uint16 highTrust,
        uint16 minGovernance,
        uint16 minMerchant
    ) external onlyOwner {
        _consumeQueuedAction(actionId_seer_setThresholds(lowTrust, highTrust, minGovernance, minMerchant));
        seer.setThresholds(lowTrust, highTrust, minGovernance, minMerchant);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          VAULT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Configure VaultHub modules
     */
    function vault_setModules(
        address token,
        address security,
        address ledger
    ) external onlyOwner {
        _consumeQueuedAction(actionId_vault_setModules(token, security, ledger));
        if (token != address(0)) vaultHub.setVFIDEToken(token);
        if (security != address(0)) vaultHub.setSecurityHub(security);
        if (ledger != address(0)) vaultHub.setProofLedger(ledger);
    }
    
    /**
     * @notice Set DAO recovery multisig
     */
    function vault_setDAOMultisig(address multisig) external onlyOwner {
        _consumeQueuedAction(actionId_vault_setDAOMultisig(multisig));
        vaultHub.setDAORecoveryMultisig(multisig);
    }
    
    /**
     * @notice Set DAO recovery timelock duration
     */
    function vault_setRecoveryTimelock(uint64 timelock) external onlyOwner {
        _consumeQueuedAction(actionId_vault_setRecoveryTimelock(timelock));
        vaultHub.setRecoveryTimelock(timelock);
    }
    
    /**
     * @notice Initiate DAO emergency recovery for a vault
     */
    function vault_requestDAORecovery(address vault, address newOwner) external onlyOwner {
        _consumeQueuedAction(actionId_vault_requestDAORecovery(vault, newOwner));
        vaultHub.requestDAORecovery(vault, newOwner);
        emit EmergencyAction("dao_recovery_requested", vault);
    }
    
    /**
     * @notice Finalize DAO recovery after timelock
     */
    function vault_finalizeDAORecovery(address vault) external onlyOwner {
        _consumeQueuedAction(actionId_vault_finalizeDAORecovery(vault));
        vaultHub.finalizeDAORecovery(vault);
        emit EmergencyAction("dao_recovery_finalized", vault);
    }
    
    /**
     * @notice Cancel DAO recovery request
     */
    function vault_cancelDAORecovery(address vault) external onlyOwner {
        _consumeQueuedAction(actionId_vault_cancelDAORecovery(vault));
        vaultHub.cancelDAORecovery(vault);
    }
    
    /**
     * @notice Emergency freeze a specific vault (via vault owner)
     * @dev Requires vault owner cooperation or DAO recovery process
     */
    function setPanicGuard(address _panicGuard) external onlyOwner {
        if (_panicGuard == address(0)) revert OCP_Zero();
        _consumeQueuedAction(actionId_setPanicGuard(_panicGuard));
        panicGuard = IPanicGuard(_panicGuard);
        emit PanicGuardUpdated(_panicGuard);
    }

    /// @notice Freeze/unfreeze a vault via PanicGuard (does not call vault directly — OCP is not vault owner)
    /// @dev Freeze: reports high-severity risk to PanicGuard (panicGuard must be set). Unfreeze: clears via DAO process.
    function vault_freezeVault(address vault, bool frozen) external onlyOwner {
        _consumeQueuedAction(actionId_vault_freezeVault(vault, frozen));
        if (address(panicGuard) == address(0)) revert OCP_PanicGuardNotSet();
        if (frozen) {
            panicGuard.reportRisk(vault, 30 days, 100, "ocp_freeze");
        } else {
            // Unfreeze requires PanicGuard.clear() which is onlyDAO — emit for off-chain handling
            revert OCP_UnfreezeViaDAO();
        }
        emit EmergencyAction(frozen ? "vault_frozen" : "vault_unfrozen", vault);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          MONITORING / VIEWS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get comprehensive token status
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
        treasuryBalance = vfideToken.balanceOf(owner);
    }
    
    /**
     * @notice Get vault system status
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
     */
    function hasVault(address user) external view returns (bool, address) {
        address vault = vaultHub.vaultOf(user);
        return (vault != address(0), vault);
    }
    
    /**
     * @notice Get system health overview
     */
    function getSystemHealth() external view returns (
        bool tokenHealthy,
        bool vaultHealthy,
        string memory status
    ) {
        // Token health: has supply
        tokenHealthy = vfideToken.totalSupply() > 0;
        
        // Vault health: has vaults created
        vaultHealthy = vaultHub.totalVaultsCreated() > 0;
        
        if (tokenHealthy && vaultHealthy) {
            status = "All systems operational";
        } else if (!tokenHealthy) {
            status = "Token issue detected";
        } else {
            status = "Vault issue detected";
        }
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
    ) external onlyOwner {
        if (maxSlippageBps > maxAutoSwapSlippageBps) revert OCP_SlippageTooHigh();
        _consumeQueuedAction(actionId_autoSwap_configure(router, stablecoin, enabled, maxSlippageBps));
        ecosystemVault.configureAutoSwap(router, stablecoin, enabled, maxSlippageBps);
        emit AutoSwapConfigured(router, stablecoin, enabled, maxSlippageBps);
    }
    
    /**
     * @notice Quick enable/disable auto-swap (keeps existing config)
     * @param enabled True to enable, false to disable
     */
    function autoSwap_setEnabled(bool enabled) external onlyOwner {
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
    function autoSwap_quickSetupUSDC(address router, address usdc) external onlyOwner {
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
     */
    function actionId_ecosystem_setManager(address manager, bool active) private pure returns (bytes32) {
        return keccak256(abi.encode("ecosystem_setManager", manager, active));
    }

    function ecosystem_setManager(address manager, bool active) external onlyOwner {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_ecosystem_setManager(manager, active));
        ecosystemVault.setManager(manager, active);
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
    ) external onlyOwner {
        _consumeQueuedAction(actionId_ecosystem_setAllocations(councilBps, merchantBps, headhunterBps));
        ecosystemVault.setAllocations(councilBps, merchantBps, headhunterBps);
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
    ) external onlyOwner {
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
    }

    function _isAutoWorkRewardWithinBounds(uint256 rewardWei) internal view returns (bool) {
        // Zero explicitly disables that payout category.
        if (rewardWei == 0) return true;
        return rewardWei >= minAutoWorkPayoutWei;
    }

    /**
     * @notice Get current automatic fixed work payout configuration
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
    function production_setupSafeDefaults() external onlyOwner {
        _consumeQueuedAction(actionId_production_setupSafeDefaults());
        // Disable auto-swap (start conservatively)
        if (address(ecosystemVault) != address(0)) {
            address router = ecosystemVault.swapRouter();
            address stablecoin = ecosystemVault.preferredStablecoin();
            uint16 slippage = ecosystemVault.maxSlippageBps();
            ecosystemVault.configureAutoSwap(router, stablecoin, false, slippage);
        }
        
        emit EmergencyAction("production_safe_defaults_set", address(this));
    }
    
    /**
     * @notice Production setup with auto-swap enabled
     * @dev Enables auto-swap for stablecoin payments.
     *      Howey-safe mode is hardcoded — no calls needed.
     * @param dexRouter DEX router address for swaps
     * @param usdc USDC token address (or other preferred stablecoin)
     */
    function production_setupWithAutoSwap(address dexRouter, address usdc) external onlyOwner {
        _consumeQueuedAction(actionId_production_setupWithAutoSwap(dexRouter, usdc));
        // Enable auto-swap with conservative 1% slippage
        if (address(ecosystemVault) != address(0)) {
            ecosystemVault.configureAutoSwap(dexRouter, usdc, true, 100);
        }
        
        emit EmergencyAction("production_with_autoswap_set", address(this));
    }
    
    /**
     * @notice Get comprehensive system status
     * @return allHoweySafe Always true — Howey-safe mode is hardcoded
     * @return autoSwapEnabled True if auto-swap is enabled in EcosystemVault
     * @return tokenCircuitBreaker True if circuit breaker is active
     * @return tokenVaultOnly True if vault-only mode is enabled
     * @return tokenPolicyLocked True if token policy is locked
     * @return healthStatus Overall health status string
     */
    function system_getStatus() external view returns (
        bool allHoweySafe,
        bool autoSwapEnabled,
        bool tokenCircuitBreaker,
        bool tokenVaultOnly,
        bool tokenPolicyLocked,
        string memory healthStatus
    ) {
        // Howey-safe mode is hardcoded as a constant in every ecosystem contract.
        allHoweySafe = true;
        
        // Check auto-swap status
        autoSwapEnabled = address(ecosystemVault) != address(0) ? ecosystemVault.autoSwapEnabled() : false;
        
        // Check token settings
        tokenCircuitBreaker = vfideToken.isCircuitBreakerActive();
        tokenVaultOnly = vfideToken.vaultOnly();
        tokenPolicyLocked = vfideToken.policyLocked();
        
        // Determine health status
        if (!tokenCircuitBreaker) {
            healthStatus = "Production Ready - All Systems Safe";
        } else {
            healthStatus = "Circuit Breaker Active";
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Emergency pause all systems
     * @dev H-02 FIX: Explicitly activates security+fee bypass (circuit breaker no longer does this implicitly).
     *      Security and fee bypasses are instant; circuit breaker activation is queued (48h timelock).
     */
    function emergency_pauseAll() external onlyOwner {
        _consumeQueuedAction(actionId_emergency_pauseAll());
        // Immediately bypass SecurityHub checks and BurnRouter fees (independent controls per H-02)
        vfideToken.setSecurityBypass(true, 1 days);
        vfideToken.setFeeBypass(true, 1 days);
        // Queue circuit breaker activation (requires confirmCircuitBreaker() after 48h)
        vfideToken.setCircuitBreaker(true, 1 days);
        
        emit EmergencyAction("system_paused", address(this));
    }
    
    /**
     * @notice Resume all systems
     */
    function emergency_resumeAll() external onlyOwner {
        _consumeQueuedAction(actionId_emergency_resumeAll());
        // Disable all bypasses immediately
        vfideToken.setSecurityBypass(false, 0);
        vfideToken.setFeeBypass(false, 0);
        vfideToken.setCircuitBreaker(false, 0);
        
        emit EmergencyAction("system_resumed", address(this));
    }
    
    /**
     * @notice Recover ETH sent to this contract
     */
    function emergency_recoverETH(address payable recipient) external onlyOwner {
        _consumeQueuedAction(actionId_emergency_recoverETH(recipient));
        if (recipient == address(0)) revert OCP_Zero();
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = recipient.call{value: balance}("");
            if (!success) revert OCP_ETHTransferFailed();
            emit EmergencyAction("eth_recovered", recipient);
        }
    }
    
    /**
     * @notice Recover ERC20 tokens sent to this contract
     */
    function emergency_recoverTokens(address token, address recipient, uint256 amount) external onlyOwner {
        _consumeQueuedAction(actionId_emergency_recoverTokens(token, recipient, amount));
        if (token == address(0) || recipient == address(0)) revert OCP_Zero();
        IERC20(token).safeTransfer(recipient, amount);
        emit EmergencyAction("tokens_recovered", token);
    }
    
    // Allow contract to receive ETH for emergency recovery
    receive() external payable {}
}
