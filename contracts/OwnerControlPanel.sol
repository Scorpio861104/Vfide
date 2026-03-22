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

interface IVFIDEPresaleOCP {
    function setPaused(bool _paused) external;
    function extendSale(uint256 additionalDays) external;
    function setMaxGasPrice(uint256 newMaxGasPrice) external;
    function withdrawUnsold(address recipient) external;
    function finalizePresale() external;
    function enableRefunds() external;
    function emergencyWithdraw() external;
    function fundRefunds() external payable;
    function depositTokens() external;
    function setStablecoinRegistry(address _registry) external;
    function setEthPrice(uint256 newPrice) external;
    function setEthAccepted(bool accepted) external;
    function setTierEnabled(uint8 tier, bool enabled) external;
    function fundStableRefunds(address stablecoin, uint256 amount) external;
    function recoverUnclaimedRefunds() external;
    function recoverUnclaimedStableRefunds(address stablecoin) external;
    function totalBaseSold() external view returns (uint256);
    function totalSold() external view returns (uint256);
    function paused() external view returns (bool);
    function finalized() external view returns (bool);
    function saleStartTime() external view returns (uint256);
    function saleEndTime() external view returns (uint256);
}

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
    IVFIDEPresaleOCP public presale;
    IVaultHub public vaultHub;
    IProofScoreBurnRouter public burnRouter;
    ISeer public seer;
    address public devReserveVault;
    
    // New contract references for enhanced configuration
    IEcosystemVaultAdmin public ecosystemVault;

    uint256 public governanceDelay = 1 days;
    uint256 public constant MIN_GOVERNANCE_DELAY = 1 hours;
    uint256 public constant MAX_GOVERNANCE_DELAY = 7 days;

    uint16 public maxAutoSwapSlippageBps = 500;
    uint16 public constant MAX_ALLOWED_AUTOSWAP_SLIPPAGE_BPS = 2000;
    uint256 public constant DEV_RESERVE_SUPPLY = 50_000_000e18;

    uint256 public minAutoWorkPayoutWei;
    uint256 public maxAutoWorkPayoutWei = 10_000 ether;
    uint256 public constant MAX_ALLOWED_AUTO_WORK_PAYOUT_WEI = 1_000_000 ether;

    mapping(bytes32 => uint256) public queuedActionEta;
    
    event ContractsUpdated(address token, address presale, address vaultHub, address burnRouter, address seer);
    event EcosystemContractsUpdated(address ecosystemVault);
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
        address _presale,
        address _vaultHub,
        address _burnRouter,
        address _seer
    ) {
        if (_owner == address(0)) revert OCP_Zero();
        owner = _owner;
        
        if (_token != address(0)) vfideToken = IVFIDEToken(_token);
        if (_presale != address(0)) presale = IVFIDEPresaleOCP(_presale);
        if (_vaultHub != address(0)) vaultHub = IVaultHub(_vaultHub);
        if (_burnRouter != address(0)) burnRouter = IProofScoreBurnRouter(_burnRouter);
        if (_seer != address(0)) seer = ISeer(_seer);
    }
    
    /**
     * @notice Update contract references (if contracts are redeployed)
     */
    function setContracts(
        address _token,
        address _presale,
        address _vaultHub,
        address _burnRouter,
        address _seer
    ) external onlyOwner {
        if (_token != address(0)) vfideToken = IVFIDEToken(_token);
        if (_presale != address(0)) presale = IVFIDEPresaleOCP(_presale);
        if (_vaultHub != address(0)) vaultHub = IVaultHub(_vaultHub);
        if (_burnRouter != address(0)) burnRouter = IProofScoreBurnRouter(_burnRouter);
        if (_seer != address(0)) seer = ISeer(_seer);
        emit ContractsUpdated(_token, _presale, _vaultHub, _burnRouter, _seer);
    }
    
    /**
     * @notice Update ecosystem contract references
     * @dev Call this after deploying ecosystem contracts
     */
    function setEcosystemContracts(
        address _ecosystemVault
    ) external onlyOwner {
        if (_ecosystemVault != address(0)) ecosystemVault = IEcosystemVaultAdmin(_ecosystemVault);
        emit EcosystemContractsUpdated(_ecosystemVault);
    }

    /**
     * @notice Set DevReserve vesting vault address for live monitoring views
     */
    function setDevReserveVault(address _devReserveVault) external onlyOwner {
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
        governanceDelay = newDelay;
        emit GovernanceDelayUpdated(oldDelay, newDelay);
    }

    function governance_setMaxAutoSwapSlippageBps(uint16 newLimit) external onlyOwner {
        if (newLimit > MAX_ALLOWED_AUTOSWAP_SLIPPAGE_BPS) revert OCP_InvalidRange();
        uint16 oldLimit = maxAutoSwapSlippageBps;
        maxAutoSwapSlippageBps = newLimit;
        emit AutoSwapSlippageLimitUpdated(oldLimit, newLimit);
    }

    function governance_setAutoWorkPayoutBounds(uint256 minReward, uint256 maxReward) external onlyOwner {
        if (minReward > maxReward || maxReward > MAX_ALLOWED_AUTO_WORK_PAYOUT_WEI) {
            revert OCP_InvalidRange();
        }
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

    function actionId_token_lockPolicy() public pure returns (bytes32) {
        return keccak256(abi.encode("token_lockPolicy"));
    }

    function actionId_autoSwap_configure(
        address router,
        address stablecoin,
        bool enabled,
        uint16 maxSlippageBps
    ) public pure returns (bytes32) {
        return keccak256(abi.encode("autoSwap_configure", router, stablecoin, enabled, maxSlippageBps));
    }

    function actionId_autoSwap_quickSetupUSDC(address router, address usdc) public pure returns (bytes32) {
        return keccak256(abi.encode("autoSwap_quickSetupUSDC", router, usdc));
    }

    function actionId_token_setVaultOnly(bool enabled) public pure returns (bytes32) {
        return keccak256(abi.encode("token_setVaultOnly", enabled));
    }

    function actionId_token_setCircuitBreaker(bool active, uint256 duration) public pure returns (bytes32) {
        return keccak256(abi.encode("token_setCircuitBreaker", active, duration));
    }

    function actionId_token_setBlacklist(address user, bool status) public pure returns (bytes32) {
        return keccak256(abi.encode("token_setBlacklist", user, status));
    }

    function actionId_emergency_pauseAll() public pure returns (bytes32) {
        return keccak256(abi.encode("emergency_pauseAll"));
    }

    function actionId_emergency_resumeAll() public pure returns (bytes32) {
        return keccak256(abi.encode("emergency_resumeAll"));
    }

    function actionId_ecosystem_setAllocations(
        uint16 councilBps,
        uint16 merchantBps,
        uint16 headhunterBps
    ) public pure returns (bytes32) {
        return keccak256(abi.encode("ecosystem_setAllocations", councilBps, merchantBps, headhunterBps));
    }

    function actionId_ecosystem_configureAutoWorkPayout(
        bool enabled,
        uint256 merchantTxReward,
        uint256 merchantReferralReward,
        uint256 userReferralReward
    ) public pure returns (bytes32) {
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

    function actionId_emergency_recoverETH(address recipient) public pure returns (bytes32) {
        return keccak256(abi.encode("emergency_recoverETH", recipient));
    }

    function actionId_emergency_recoverTokens(
        address token,
        address recipient,
        uint256 amount
    ) public pure returns (bytes32) {
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
        if (hub != address(0)) vfideToken.setVaultHub(hub);
        if (security != address(0)) vfideToken.setSecurityHub(security);
        if (ledger != address(0)) vfideToken.setLedger(ledger);
        if (router != address(0)) vfideToken.setBurnRouter(router);
    }
    
    /**
     * @notice Configure token sinks (Treasury, Sanctum)
     */
    function token_setSinks(
        address treasury,
        address sanctum
    ) external onlyOwner {
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
    
    /**
     * @notice Check if circuit breaker is currently active
     */
    function token_isCircuitBreakerActive() external view returns (bool) {
        return vfideToken.isCircuitBreakerActive();
    }
    
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
    function actionId_token_setAntiWhale(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown) public pure returns (bytes32) {
        return keccak256(abi.encode("token_setAntiWhale", maxTransfer, maxWallet, dailyLimit, cooldown));
    }
    function actionId_token_setWhaleLimitExempt(address addr, bool exempt) public pure returns (bytes32) {
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
    
    /**
     * @notice Get current anti-whale configuration
     */
    function token_getAntiWhaleConfig() external view returns (
        uint256 maxTransfer,
        uint256 maxWallet,
        uint256 dailyLimit,
        uint256 cooldown
    ) {
        return (
            vfideToken.maxTransferAmount(),
            vfideToken.maxWalletBalance(),
            vfideToken.dailyTransferLimit(),
            vfideToken.transferCooldown()
        );
    }
    
    /**
     * @notice Check if address is exempt from whale limits
     */
    function token_isWhaleLimitExempt(address addr) external view returns (bool) {
        return vfideToken.whaleLimitExempt(addr);
    }
    
    /**
     * @notice Check remaining daily transfer limit for address
     */
    function token_remainingDailyLimit(address addr) external view returns (uint256) {
        return vfideToken.remainingDailyLimit(addr);
    }
    
    /**
     * @notice Check cooldown remaining for address
     */
    function token_cooldownRemaining(address addr) external view returns (uint256) {
        return vfideToken.cooldownRemaining(addr);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          FEE CURVE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set fee curve parameters (linear interpolation between min and max)
     * @param minBps Minimum fee in basis points (e.g., 25 = 0.25%) for high-trust users
     * @param maxBps Maximum fee in basis points (e.g., 500 = 5%) for low-trust users
     */
    function actionId_fees_setPolicy(uint16 minBps, uint16 maxBps) public pure returns (bytes32) {
        return keccak256(abi.encode("fees_setPolicy", minBps, maxBps));
    }

    function fees_setPolicy(uint16 minBps, uint16 maxBps) external onlyOwner {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_fees_setPolicy(minBps, maxBps));
        burnRouter.setFeePolicy(minBps, maxBps);
        emit FeePolicyUpdated(minBps, maxBps);
    }
    
    /**
     * @notice Get current fee curve configuration
     */
    function fees_getPolicy() external view returns (uint16 minBps, uint16 maxBps) {
        return (burnRouter.minTotalBps(), burnRouter.maxTotalBps());
    }
    
    /**
     * @notice Preview fee for a specific ProofScore
     * @param score ProofScore (0-10000)
     * @return totalBps Total fee in basis points
     */
    function fees_previewForScore(uint16 score) external view returns (uint256 totalBps) {
        (totalBps,) = burnRouter.getFeeForScore(score);
    }
    
    /**
     * @notice Get effective fee rates for a user
     */
    function fees_getEffectiveRates(address user) external view returns (
        uint16 burnBps,
        uint16 sanctumBps,
        uint16 ecosystemBps
    ) {
        return burnRouter.getEffectiveBurnRate(user);
    }
    
    /**
     * @notice Preview fees for a transfer
     */
    function fees_previewTransfer(address user, uint256 amount) external view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        uint256 netAmount,
        uint16 score
    ) {
        return burnRouter.previewFees(user, amount);
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
        burnRouter.setToken(token);
    }
    
    /**
     * @notice Get current sustainability status
     */
    function sustainability_getStatus() external view returns (
        uint256 dailyBurned,
        uint256 burnCapacity,
        uint256 dailyVolume,
        uint16 volumeMultiplier,
        bool burnsPausedFlag,
        uint256 supplyFloor,
        uint256 currentSupply
    ) {
        return burnRouter.getSustainabilityStatus();
    }
    
    /**
     * @notice Get sustainability configuration
     */
    function sustainability_getConfig() external view returns (
        uint256 dailyBurnCap,
        uint256 minimumSupplyFloor,
        uint16 ecosystemMinBps,
        bool adaptiveEnabled,
        uint16 volumeMultiplier
    ) {
        return (
            burnRouter.dailyBurnCap(),
            burnRouter.minimumSupplyFloor(),
            burnRouter.ecosystemMinBps(),
            burnRouter.adaptiveFeesEnabled(),
            burnRouter.getVolumeMultiplier()
        );
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
        seer.setThresholds(lowTrust, highTrust, minGovernance, minMerchant);
    }
    
    /**
     * @notice Get current ProofScore thresholds
     */
    function seer_getThresholds() external view returns (
        uint16 lowTrust,
        uint16 highTrust,
        uint16 minGovernance,
        uint16 minMerchant
    ) {
        return (
            seer.lowTrustThreshold(),
            seer.highTrustThreshold(),
            seer.minForGovernance(),
            seer.minForMerchant()
        );
    }
    
    /**
     * @notice Get ProofScore for a user
     */
    function seer_getScore(address user) external view returns (uint16) {
        return seer.getScore(user);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          PRESALE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Pause/unpause presale
     */
    function presale_setPaused(bool paused) external onlyOwner {
        presale.setPaused(paused);
        emit EmergencyAction(paused ? "presale_paused" : "presale_unpaused", address(presale));
    }
    
    /**
     * @notice Extend presale duration (one-time, max 30 days)
     */
    function presale_extendSale(uint256 additionalDays) external onlyOwner {
        presale.extendSale(additionalDays);
    }
    
    /**
     * @notice Update max gas price circuit breaker
     */
    function presale_setMaxGasPrice(uint256 newMaxGasPrice) external onlyOwner {
        presale.setMaxGasPrice(newMaxGasPrice);
    }
    
    /**
     * @notice Withdraw unsold tokens + excess allocation to treasury
     */
    function presale_withdrawUnsold(address recipient) external onlyOwner {
        presale.withdrawUnsold(recipient);
    }
    
    /**
     * @notice Finalize presale
     * @dev Aligned with actual VFIDEPresale.finalizePresale() (no params)
     */
    function presale_finalize() external onlyOwner {
        presale.finalizePresale();
    }
    
    /**
     * @notice Enable refunds if presale failed to meet goal
     */
    function presale_enableRefunds() external onlyOwner {
        presale.enableRefunds();
        emit EmergencyAction("refunds_enabled", address(presale));
    }
    
    /**
     * @notice Verify token deposit in presale contract
     */
    function presale_depositTokens() external onlyOwner {
        presale.depositTokens();
    }
    
    /**
     * @notice Set stablecoin registry for presale
     */
    function presale_setStablecoinRegistry(address _registry) external onlyOwner {
        presale.setStablecoinRegistry(_registry);
    }
    
    /**
     * @notice Update ETH/USD price for ETH purchases
     */
    function actionId_presale_setEthPrice(uint256 newPrice) public pure returns (bytes32) {
        return keccak256(abi.encode("presale_setEthPrice", newPrice));
    }

    function presale_setEthPrice(uint256 newPrice) external onlyOwner {
        // F-14 FIX: require governance queue before execution
        _consumeQueuedAction(actionId_presale_setEthPrice(newPrice));
        presale.setEthPrice(newPrice);
    }
    
    /**
     * @notice Enable/disable ETH purchases
     */
    function presale_setEthAccepted(bool accepted) external onlyOwner {
        presale.setEthAccepted(accepted);
    }
    
    /**
     * @notice Enable/disable a presale tier
     */
    function presale_setTierEnabled(uint8 tier, bool enabled) external onlyOwner {
        presale.setTierEnabled(tier, enabled);
    }
    
    /**
     * @notice Fund stablecoin refunds
     */
    function presale_fundStableRefunds(address stablecoin, uint256 amount) external onlyOwner {
        presale.fundStableRefunds(stablecoin, amount);
    }
    
    /**
     * @notice Recover unclaimed ETH refunds after deadline
     */
    function presale_recoverUnclaimedRefunds() external onlyOwner {
        presale.recoverUnclaimedRefunds();
    }
    
    /**
     * @notice Recover unclaimed stablecoin refunds after deadline
     */
    function presale_recoverUnclaimedStableRefunds(address stablecoin) external onlyOwner {
        presale.recoverUnclaimedStableRefunds(stablecoin);
    }
    
    /**
     * @notice Emergency withdraw (only before sale or after finalization)
     */
    function presale_emergencyWithdraw() external onlyOwner {
        presale.emergencyWithdraw();
        emit EmergencyAction("emergency_withdraw", address(presale));
    }
    
    /**
     * @notice Fund refunds by sending ETH to presale contract
     */
    function presale_fundRefunds() external payable onlyOwner {
        presale.fundRefunds{value: msg.value}();
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
        if (token != address(0)) vaultHub.setVFIDEToken(token);
        if (security != address(0)) vaultHub.setSecurityHub(security);
        if (ledger != address(0)) vaultHub.setProofLedger(ledger);
    }
    
    /**
     * @notice Set DAO recovery multisig
     */
    function vault_setDAOMultisig(address multisig) external onlyOwner {
        vaultHub.setDAORecoveryMultisig(multisig);
    }
    
    /**
     * @notice Set DAO recovery timelock duration
     */
    function vault_setRecoveryTimelock(uint64 timelock) external onlyOwner {
        vaultHub.setRecoveryTimelock(timelock);
    }
    
    /**
     * @notice Initiate DAO emergency recovery for a vault
     */
    function vault_requestDAORecovery(address vault, address newOwner) external onlyOwner {
        vaultHub.requestDAORecovery(vault, newOwner);
        emit EmergencyAction("dao_recovery_requested", vault);
    }
    
    /**
     * @notice Finalize DAO recovery after timelock
     */
    function vault_finalizeDAORecovery(address vault) external onlyOwner {
        vaultHub.finalizeDAORecovery(vault);
        emit EmergencyAction("dao_recovery_finalized", vault);
    }
    
    /**
     * @notice Cancel DAO recovery request
     */
    function vault_cancelDAORecovery(address vault) external onlyOwner {
        vaultHub.cancelDAORecovery(vault);
    }
    
    /**
     * @notice Emergency freeze a specific vault (via vault owner)
     * @dev Requires vault owner cooperation or DAO recovery process
     */
    function vault_freezeVault(address vault, bool frozen) external onlyOwner {
        IUserVaultOCP(vault).setFrozen(frozen);
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
        uint256 presaleBalance,
        uint256 treasuryBalance,
        bool vaultOnly,
        bool policyLocked,
        bool circuitBreaker
    ) {
        totalSupply = vfideToken.totalSupply();
        vaultOnly = vfideToken.vaultOnly();
        policyLocked = vfideToken.policyLocked();
        circuitBreaker = vfideToken.circuitBreaker();
        if (devReserveVault != address(0)) {
            devReserveBalance = vfideToken.balanceOf(devReserveVault);
        } else {
            devReserveBalance = DEV_RESERVE_SUPPLY;
        }
        treasuryBalance = vfideToken.balanceOf(owner);
        
        // Get balances if addresses are set
        if (address(presale) != address(0)) {
            presaleBalance = vfideToken.balanceOf(address(presale));
        }
    }
    
    /**
     * @notice Get presale status
     */
    function getPresaleStatus() external view returns (
        uint256 totalBaseSold,
        uint256 totalSold,
        uint256 tokenBalance,
        bool hasSufficientTokens,
        bool paused,
        bool finalized,
        uint256 startTime,
        uint256 endTime,
        uint256 timeRemaining
    ) {
        totalBaseSold = presale.totalBaseSold();
        totalSold = presale.totalSold();
        paused = presale.paused();
        finalized = presale.finalized();
        startTime = presale.saleStartTime();
        endTime = presale.saleEndTime();
        
        tokenBalance = vfideToken.balanceOf(address(presale));
        hasSufficientTokens = tokenBalance > 0;
        
        if (block.timestamp < endTime) {
            timeRemaining = endTime - block.timestamp;
        }
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
        bool presaleHealthy,
        bool vaultHealthy,
        string memory status
    ) {
        // Token health: has supply, vault-only working
        tokenHealthy = vfideToken.totalSupply() > 0;
        
        // Presale health: has tokens, not paused (or finalized)
        uint256 presaleTokenBalance = vfideToken.balanceOf(address(presale));
        presaleHealthy = presaleTokenBalance > 0 && (!presale.paused() || presale.finalized());
        
        // Vault health: has vaults created
        vaultHealthy = vaultHub.totalVaultsCreated() > 0;
        
        if (tokenHealthy && presaleHealthy && vaultHealthy) {
            status = "All systems operational";
        } else if (!tokenHealthy) {
            status = "Token issue detected";
        } else if (!presaleHealthy) {
            status = "Presale issue detected";
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
     * @dev Always (true, true, true, true, true) — hardcoded in each contract.
     */
    function howey_getStatus() external pure returns (
        bool dutyDistributorSafe,
        bool councilSalarySafe,
        bool councilManagerSafe,
        bool presaleSafe,
        bool liquidityIncentivesSafe
    ) {
        return (true, true, true, true, true);
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
    function actionId_ecosystem_setManager(address manager, bool active) public pure returns (bytes32) {
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
     */
    function emergency_pauseAll() external onlyOwner {
        _consumeQueuedAction(actionId_emergency_pauseAll());
        // Pause presale
        presale.setPaused(true);
        
        // Enable circuit breaker on token (24 hour default for emergency)
        vfideToken.setCircuitBreaker(true, 1 days);
        
        emit EmergencyAction("system_paused", address(this));
    }
    
    /**
     * @notice Resume all systems
     */
    function emergency_resumeAll() external onlyOwner {
        _consumeQueuedAction(actionId_emergency_resumeAll());
        // Unpause presale
        presale.setPaused(false);
        
        // Disable circuit breaker on token
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
            require(success, "ETH transfer failed");
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
    
    // Allow contract to receive ETH for presale funding
    receive() external payable {}
}
