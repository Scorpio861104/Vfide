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

interface IVFIDEPresale {
    function setPaused(bool _paused) external;
    function extendSale(uint256 additionalDays) external;
    function setMaxGasPrice(uint256 newMaxGasPrice) external;
    function withdrawUnsold(address recipient) external;
    function finalizePresale(address uniRouter, address uniFactory) external;
    function enableRefunds() external;
    function emergencyWithdraw() external;
    function fundRefunds() external payable;
    function verifyTokenBalance() external view returns (bool sufficient, uint256 balance);
    function totalBaseSold() external view returns (uint256);
    function totalBonusGiven() external view returns (uint256);
    function totalSold() external view returns (uint256);
    function paused() external view returns (bool);
    function finalized() external view returns (bool);
    function saleStartTime() external view returns (uint256);
    function saleEndTime() external view returns (uint256);
}

interface IUserVault {
    function setFrozen(bool _frozen) external;
    function setAbnormalTransactionThreshold(uint256 threshold) external;
    function setWithdrawalCooldown(uint64 cooldown) external;
    function setLargeTransferThreshold(uint256 threshold) external;
    function frozen() external view returns (bool);
    function owner() external view returns (address);
    function guardianCount() external view returns (uint8);
}

// Interfaces for contracts with Howey-safe mode
interface IHoweySafeContract {
    function setHoweySafeMode(bool enabled) external;
    function howeySafeMode() external view returns (bool);
}

interface IEcosystemVault {
    function configureAutoSwap(address _router, address _stablecoin, bool _enabled, uint16 _maxSlippageBps) external;
    function setManager(address manager, bool active) external;
    function setAllocations(uint16 _councilBps, uint16 _merchantBps, uint16 _headhunterBps) external;
    function autoSwapEnabled() external view returns (bool);
    function swapRouter() external view returns (address);
    function preferredStablecoin() external view returns (address);
    function maxSlippageBps() external view returns (uint16);
}

contract OwnerControlPanel {
    using SafeERC20 for IERC20;
    
    address public immutable owner;
    
    IVFIDEToken public vfideToken;
    IVFIDEPresale public presale;
    IVaultHub public vaultHub;
    IProofScoreBurnRouter public burnRouter;
    ISeer public seer;
    
    // New contract references for enhanced configuration
    IEcosystemVault public ecosystemVault;
    IHoweySafeContract public dutyDistributor;
    IHoweySafeContract public councilSalary;
    IHoweySafeContract public councilManager;
    IHoweySafeContract public promotionalTreasury;
    IHoweySafeContract public liquidityIncentives;
    
    event ContractsUpdated(address token, address presale, address vaultHub, address burnRouter, address seer);
    event EcosystemContractsUpdated(address ecosystemVault, address dutyDistributor, address councilSalary, address councilManager, address promotionalTreasury, address liquidityIncentives);
    event EmergencyAction(string action, address target);
    event FeePolicyUpdated(uint16 minBps, uint16 maxBps);
    event AntiWhaleUpdated(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown);
    event HoweySafeModeUpdated(string contract_name, bool enabled);
    event AutoSwapConfigured(address router, address stablecoin, bool enabled, uint16 maxSlippageBps);
    
    error OCP_NotOwner();
    error OCP_Zero();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OCP_NotOwner();
        _;
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
        if (_presale != address(0)) presale = IVFIDEPresale(_presale);
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
        if (_presale != address(0)) presale = IVFIDEPresale(_presale);
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
        address _ecosystemVault,
        address _dutyDistributor,
        address _councilSalary,
        address _councilManager,
        address _promotionalTreasury,
        address _liquidityIncentives
    ) external onlyOwner {
        if (_ecosystemVault != address(0)) ecosystemVault = IEcosystemVault(_ecosystemVault);
        if (_dutyDistributor != address(0)) dutyDistributor = IHoweySafeContract(_dutyDistributor);
        if (_councilSalary != address(0)) councilSalary = IHoweySafeContract(_councilSalary);
        if (_councilManager != address(0)) councilManager = IHoweySafeContract(_councilManager);
        if (_promotionalTreasury != address(0)) promotionalTreasury = IHoweySafeContract(_promotionalTreasury);
        if (_liquidityIncentives != address(0)) liquidityIncentives = IHoweySafeContract(_liquidityIncentives);
        emit EcosystemContractsUpdated(_ecosystemVault, _dutyDistributor, _councilSalary, _councilManager, _promotionalTreasury, _liquidityIncentives);
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
     * @notice Exempt address from vault-only and fees (for system contracts)
     */
    function token_setSystemExempt(address who, bool isExempt) external onlyOwner {
        vfideToken.setSystemExempt(who, isExempt);
    }
    
    /**
     * @notice Whitelist address to bypass vault-only (for exchanges/DEXs)
     */
    function token_setWhitelist(address addr, bool status) external onlyOwner {
        vfideToken.setWhitelist(addr, status);
    }
    
    /**
     * @notice Batch whitelist multiple addresses (gas efficient)
     */
    function token_batchWhitelist(address[] calldata addrs, bool status) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            vfideToken.setWhitelist(addrs[i], status);
        }
    }
    
    /**
     * @notice Enable/disable vault-only enforcement
     */
    function token_setVaultOnly(bool enabled) external onlyOwner {
        vfideToken.setVaultOnly(enabled);
    }
    
    /**
     * @notice Lock policy permanently (ONE-WAY - cannot be undone!)
     */
    function token_lockPolicy() external onlyOwner {
        vfideToken.lockPolicy();
    }
    
    /**
     * @notice Emergency circuit breaker (bypass SecurityHub/BurnRouter)
     * @param active True to enable, false to disable
     * @param duration Duration in seconds (max 7 days). Ignored when disabling.
     */
    function token_setCircuitBreaker(bool active, uint256 duration) external onlyOwner {
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
        vfideToken.setBlacklist(user, status);
    }
    
    /**
     * @notice Batch blacklist multiple addresses
     */
    function token_batchBlacklist(address[] calldata users, bool status) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
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
    function token_setAntiWhale(
        uint256 maxTransfer,
        uint256 maxWallet,
        uint256 dailyLimit,
        uint256 cooldown
    ) external onlyOwner {
        vfideToken.setAntiWhale(maxTransfer, maxWallet, dailyLimit, cooldown);
    }
    
    /**
     * @notice Exempt address from whale limits (for exchanges, liquidity pools)
     */
    function token_setWhaleLimitExempt(address addr, bool exempt) external onlyOwner {
        vfideToken.setWhaleLimitExempt(addr, exempt);
    }
    
    /**
     * @notice Batch exempt multiple addresses from whale limits
     */
    function token_batchWhaleLimitExempt(address[] calldata addrs, bool exempt) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
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
    function fees_setPolicy(uint16 minBps, uint16 maxBps) external onlyOwner {
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
     * @notice Finalize presale and create liquidity pool
     */
    function presale_finalize(address uniRouter, address uniFactory) external onlyOwner {
        presale.finalizePresale(uniRouter, uniFactory);
    }
    
    /**
     * @notice Enable refunds if presale failed to meet goal
     */
    function presale_enableRefunds() external onlyOwner {
        presale.enableRefunds();
        emit EmergencyAction("refunds_enabled", address(presale));
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
        IUserVault(vault).setFrozen(frozen);
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
        devReserveBalance = 0;
        treasuryBalance = 0;
        
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
        uint256 totalBonusGiven,
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
        totalBonusGiven = presale.totalBonusGiven();
        totalSold = presale.totalSold();
        paused = presale.paused();
        finalized = presale.finalized();
        startTime = presale.saleStartTime();
        endTime = presale.saleEndTime();
        
        (hasSufficientTokens, tokenBalance) = presale.verifyTokenBalance();
        
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
            IUserVault vault = IUserVault(vaultAddress);
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
        (bool sufficient, ) = presale.verifyTokenBalance();
        presaleHealthy = sufficient && (!presale.paused() || presale.finalized());
        
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
    //                          HOWEY-SAFE MODE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Enable/disable Howey-safe mode on all ecosystem contracts
     * @dev One-click toggle for all contracts with howeySafeMode
     * @param enabled True to enable (default safe state), false to disable
     */
    function howey_setAllSafeMode(bool enabled) external onlyOwner {
        if (address(dutyDistributor) != address(0)) {
            dutyDistributor.setHoweySafeMode(enabled);
            emit HoweySafeModeUpdated("DutyDistributor", enabled);
        }
        if (address(councilSalary) != address(0)) {
            councilSalary.setHoweySafeMode(enabled);
            emit HoweySafeModeUpdated("CouncilSalary", enabled);
        }
        if (address(councilManager) != address(0)) {
            councilManager.setHoweySafeMode(enabled);
            emit HoweySafeModeUpdated("CouncilManager", enabled);
        }
        if (address(promotionalTreasury) != address(0)) {
            promotionalTreasury.setHoweySafeMode(enabled);
            emit HoweySafeModeUpdated("PromotionalTreasury", enabled);
        }
        if (address(liquidityIncentives) != address(0)) {
            liquidityIncentives.setHoweySafeMode(enabled);
            emit HoweySafeModeUpdated("LiquidityIncentives", enabled);
        }
        // Note: VFIDEPresale is not included as it has different semantics
    }
    
    /**
     * @notice Set Howey-safe mode on individual contracts
     */
    function howey_setDutyDistributor(bool enabled) external onlyOwner {
        dutyDistributor.setHoweySafeMode(enabled);
        emit HoweySafeModeUpdated("DutyDistributor", enabled);
    }
    
    function howey_setCouncilSalary(bool enabled) external onlyOwner {
        councilSalary.setHoweySafeMode(enabled);
        emit HoweySafeModeUpdated("CouncilSalary", enabled);
    }
    
    function howey_setCouncilManager(bool enabled) external onlyOwner {
        councilManager.setHoweySafeMode(enabled);
        emit HoweySafeModeUpdated("CouncilManager", enabled);
    }
    
    function howey_setPromotionalTreasury(bool enabled) external onlyOwner {
        promotionalTreasury.setHoweySafeMode(enabled);
        emit HoweySafeModeUpdated("PromotionalTreasury", enabled);
    }
    
    function howey_setLiquidityIncentives(bool enabled) external onlyOwner {
        liquidityIncentives.setHoweySafeMode(enabled);
        emit HoweySafeModeUpdated("LiquidityIncentives", enabled);
    }
    
    /**
     * @notice Get Howey-safe mode status for all contracts
     * @return Status of each contract (true = safe mode enabled)
     */
    function howey_getStatus() external view returns (
        bool dutyDistributorSafe,
        bool councilSalarySafe,
        bool councilManagerSafe,
        bool promotionalTreasurySafe,
        bool liquidityIncentivesSafe
    ) {
        dutyDistributorSafe = address(dutyDistributor) != address(0) ? dutyDistributor.howeySafeMode() : false;
        councilSalarySafe = address(councilSalary) != address(0) ? councilSalary.howeySafeMode() : false;
        councilManagerSafe = address(councilManager) != address(0) ? councilManager.howeySafeMode() : false;
        promotionalTreasurySafe = address(promotionalTreasury) != address(0) ? promotionalTreasury.howeySafeMode() : false;
        liquidityIncentivesSafe = address(liquidityIncentives) != address(0) ? liquidityIncentives.howeySafeMode() : false;
    }
    
    /**
     * @notice Check if all contracts are in safe mode (recommended for production)
     * @return allSafe True if all contracts have howeySafeMode enabled
     */
    function howey_areAllSafe() external view returns (bool allSafe) {
        allSafe = true;
        if (address(dutyDistributor) != address(0) && !dutyDistributor.howeySafeMode()) allSafe = false;
        if (address(councilSalary) != address(0) && !councilSalary.howeySafeMode()) allSafe = false;
        if (address(councilManager) != address(0) && !councilManager.howeySafeMode()) allSafe = false;
        if (address(promotionalTreasury) != address(0) && !promotionalTreasury.howeySafeMode()) allSafe = false;
        if (address(liquidityIncentives) != address(0) && !liquidityIncentives.howeySafeMode()) allSafe = false;
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
        ecosystemVault.configureAutoSwap(router, stablecoin, enabled, maxSlippageBps);
        emit AutoSwapConfigured(router, stablecoin, enabled, maxSlippageBps);
    }
    
    /**
     * @notice Quick enable/disable auto-swap (keeps existing config)
     * @param enabled True to enable, false to disable
     */
    function autoSwap_setEnabled(bool enabled) external onlyOwner {
        // Get current config
        address router = ecosystemVault.swapRouter();
        address stablecoin = ecosystemVault.preferredStablecoin();
        uint16 slippage = ecosystemVault.maxSlippageBps();
        
        // Reconfigure with new enabled status
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
    function ecosystem_setManager(address manager, bool active) external onlyOwner {
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
        ecosystemVault.setAllocations(councilBps, merchantBps, headhunterBps);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          ONE-CLICK PRODUCTION SETUP
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Production setup with recommended safe defaults
     * @dev Enables all Howey-safe modes and disables auto-swap (safest configuration)
     */
    function production_setupSafeDefaults() external onlyOwner {
        // Enable Howey-safe mode on all contracts
        if (address(dutyDistributor) != address(0)) dutyDistributor.setHoweySafeMode(true);
        if (address(councilSalary) != address(0)) councilSalary.setHoweySafeMode(true);
        if (address(councilManager) != address(0)) councilManager.setHoweySafeMode(true);
        if (address(promotionalTreasury) != address(0)) promotionalTreasury.setHoweySafeMode(true);
        if (address(liquidityIncentives) != address(0)) liquidityIncentives.setHoweySafeMode(true);
        
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
     * @dev Sets Howey-safe mode + enables auto-swap for stablecoin payments
     * @param dexRouter DEX router address for swaps
     * @param usdc USDC token address (or other preferred stablecoin)
     */
    function production_setupWithAutoSwap(address dexRouter, address usdc) external onlyOwner {
        // Enable Howey-safe mode on all contracts
        if (address(dutyDistributor) != address(0)) dutyDistributor.setHoweySafeMode(true);
        if (address(councilSalary) != address(0)) councilSalary.setHoweySafeMode(true);
        if (address(councilManager) != address(0)) councilManager.setHoweySafeMode(true);
        if (address(promotionalTreasury) != address(0)) promotionalTreasury.setHoweySafeMode(true);
        if (address(liquidityIncentives) != address(0)) liquidityIncentives.setHoweySafeMode(true);
        
        // Enable auto-swap with conservative 1% slippage
        if (address(ecosystemVault) != address(0)) {
            ecosystemVault.configureAutoSwap(dexRouter, usdc, true, 100);
        }
        
        emit EmergencyAction("production_with_autoswap_set", address(this));
    }
    
    /**
     * @notice Get comprehensive system status
     * @return Detailed status of all major configuration settings
     */
    function system_getStatus() external view returns (
        bool allHoweySafe,
        bool autoSwapEnabled,
        bool tokenCircuitBreaker,
        bool tokenVaultOnly,
        bool tokenPolicyLocked,
        string memory healthStatus
    ) {
        // Check Howey-safe mode status
        allHoweySafe = true;
        if (address(dutyDistributor) != address(0) && !dutyDistributor.howeySafeMode()) allHoweySafe = false;
        if (address(councilSalary) != address(0) && !councilSalary.howeySafeMode()) allHoweySafe = false;
        if (address(councilManager) != address(0) && !councilManager.howeySafeMode()) allHoweySafe = false;
        if (address(promotionalTreasury) != address(0) && !promotionalTreasury.howeySafeMode()) allHoweySafe = false;
        if (address(liquidityIncentives) != address(0) && !liquidityIncentives.howeySafeMode()) allHoweySafe = false;
        
        // Check auto-swap status
        autoSwapEnabled = address(ecosystemVault) != address(0) ? ecosystemVault.autoSwapEnabled() : false;
        
        // Check token settings
        tokenCircuitBreaker = vfideToken.isCircuitBreakerActive();
        tokenVaultOnly = vfideToken.vaultOnly();
        tokenPolicyLocked = vfideToken.policyLocked();
        
        // Determine health status
        if (allHoweySafe && !tokenCircuitBreaker) {
            healthStatus = "Production Ready - All Systems Safe";
        } else if (!allHoweySafe) {
            healthStatus = "Warning - Howey-safe mode disabled";
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
        if (token == address(0) || recipient == address(0)) revert OCP_Zero();
        IERC20(token).safeTransfer(recipient, amount);
        emit EmergencyAction("tokens_recovered", token);
    }
    
    // Allow contract to receive ETH for presale funding
    receive() external payable {}
}
