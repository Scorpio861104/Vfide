// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/*
 * I-01 CODEBASE NOTE: This is a large protocol (~99 Solidity files). To manage
 * attack surface: dead code has been removed (M-21), unbounded arrays capped (I-11),
 * all security primitives centralized here, and cross-contract interfaces verified.
 *
 * SECURITY — Security-primitive maintenance policy
 *
 * I-02 ARCHITECTURE RATIONALE — Custom vs OpenZeppelin:
 * Core contracts use LOCAL reimplementations of `ReentrancyGuard`, `SafeERC20`,
 * `Ownable`, `Pausable`, `AccessControl` defined in this file.
 * VFIDEBridge retains OZ imports because LayerZero OApp inheritance requires it.
 *
 * Trade-off analysis:
 *   PRO: Eliminates npm supply-chain attack surface for core protocol.
 *   CON: Requires manual review on OZ security advisories (see MANDATORY ACTION below).
 *   MITIGATED BY: OZ version baseline tracking, PATCHED_ADVISORIES constant,
 *                 SHARED_INTERFACES_VERSION monotonic versioning, and this file
 *                 serving as the single source of truth for all security primitives.
 *
 * SUPPLY-CHAIN STRATEGY (H-01 note):
 * Core contracts (VFIDEToken, Seer, ProofLedger, DAO, VaultHub, OwnerControlPanel)
 * use LOCAL reimplementations defined in this file. VFIDEBridge imports from OZ directly
 * because LayerZero OApp requires OZ Ownable. BSM and VFIDEPriceOracle were migrated to
 * custom SharedInterfaces (H-18 fix) and deployed via future/DeployPhase3Peripherals.sol
 * (file moved to contracts/future/ in 2026-05-20 mainnet-readiness sweep; not in V1 deploy path).
 *
 * This intentional split means:
 *   - Core protocol attack surface is isolated from npm supply-chain risk.
 *   - Peripheral contracts benefit from OZ's active maintenance and audits.
 *   - OZ advisories must be reviewed for BOTH the OZ imports AND these local copies.
 *
 * MANDATORY ACTION on any new OpenZeppelin security advisory that affects these
 * primitives:
 *   1. Review the advisory at https://github.com/OpenZeppelin/openzeppelin-contracts/security/advisories
 *   2. Compare the patched OZ source with the corresponding section below.
 *   3. Apply the equivalent fix here and update `SHARED_INTERFACES_VERSION`.
 *   4. Add the advisory ID to the `PATCHED_ADVISORIES` constant below.
 *
 * OZ version baseline: 5.1.0 (primitives last validated against this release)
 */

// Monotonic version bump on every security-patch update to this file.
// File-level constants in Solidity 0.8 are implicitly internal.
// Increment on every security-motivated change; use in review trail.
uint256 constant SHARED_INTERFACES_VERSION = 2; // Bumped: March 2026 hostile-review audit fixes applied

// Comma-separated list of OZ advisory IDs whose mitigations have been
// manually assessed and confirmed as not applicable or applied here.
// Advisories reviewed against OZ 5.1.0 baseline (March 2026):
//   GHSA-g4vp-m682-qqmp — ReentrancyGuard: not applicable (local guard uses same check-effects-interactions pattern)
//   GHSA-93hq-5wgc-jc87 — Ownable: not applicable (transferOwnership pattern reviewed, OwnerControlPanel uses 2-step)
//   GHSA-7grf-83vw-6f5x — SafeERC20: not applicable (local forceApprove logic reviewed)
string constant PATCHED_ADVISORIES = "GHSA-g4vp-m682-qqmp,GHSA-93hq-5wgc-jc87,GHSA-7grf-83vw-6f5x";

/// @dev Fallback event emitted when ProofLedger logging fails.
///      Ensures an on-chain record exists even if the ledger is misconfigured or reverts.
/// @notice LedgerLogFailed
/// @param source source
/// @param action action
event LedgerLogFailed(address indexed source, string action);

/// @notice IVaultHub
/// @title IVaultHub
/// @author Vfide
interface IVaultHub {
    /// @notice vaultOf
    /// @param owner owner
    /// @return _address _address
    function vaultOf(address owner) external view returns (address);
    /// @notice ownerOfVault
    /// @param vault vault
    /// @return _address _address
    function ownerOfVault(address vault) external view returns (address);
    /// @notice isVault
    /// @param a a
    /// @return _bool _bool
    function isVault(address a) external view returns (bool);
    /// @notice ensureVault
    /// @param owner_ owner_
    /// @return vault vault
    function ensureVault(address owner_) external returns (address vault);
    /// @notice setVFIDEToken
    /// @param token token
    function setVFIDEToken(address token) external;
    /// @notice setProofLedger
    /// @param ledger ledger
    function setProofLedger(address ledger) external;
    /// @notice setDAORecoveryMultisig
    /// @param multisig multisig
    function setDAORecoveryMultisig(address multisig) external;
    /// @notice setRecoveryTimelock
    /// @param timelock timelock
    function setRecoveryTimelock(uint256 timelock) external;
    // requestDAORecovery / finalizeDAORecovery / cancelDAORecovery removed
    // 2026-05-19. Per the non-custody guarantee, no on-chain DAO recovery
    // flow exists on VaultHub — recovery is exclusively through the user's
    // own guardians via VaultRecoveryClaim or wallet rotation. The selectors
    // are deliberately absent from the ABI; absence is asserted by
    // scripts/verify-vault-hub-cardbound-integration.ts.
    /// @notice totalVaultsCreated
    /// @return _uint256 _uint256
    function totalVaultsCreated() external view returns (uint256);
    /// @dev R-4 — true if `vault` is in MEMORIAL (state 3) or CLOSED (state 4).
    ///      Used by external obligation managers to gate inheritance-driven settlement.
    /// @notice isInMemorialState
    /// @param vault vault
    /// @return _bool _bool
    function isInMemorialState(address vault) external view returns (bool);
}

/// @notice IProofLedger
/// @title IProofLedger
/// @author Vfide
interface IProofLedger {
    /// @notice logSystemEvent
    /// @param who who
    /// @param action action
    /// @param by by
    function logSystemEvent(address who, string calldata action, address by) external;
    /// @notice logEvent
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
    /// @notice logTransfer
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @param context context
    function logTransfer(address from, address to, uint256 amount, string calldata context) external;
}

/// @notice IProofScoreBurnRouterToken
/// @title IProofScoreBurnRouterToken
/// @author Vfide
interface IProofScoreBurnRouterToken {
    /// @notice computeFees
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return burnAmount burnAmount
    /// @return sanctumAmount sanctumAmount
    /// @return ecosystemAmount ecosystemAmount
    /// @return sanctumSink sanctumSink
    /// @return ecosystemSink ecosystemSink
    /// @return burnSink burnSink
    function computeFees(
        address from,
        address to,
        uint256 amount
    ) external view returns (uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount, address sanctumSink, address ecosystemSink, address burnSink);

    /// @notice computeFeesAndReserve
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return burnAmount burnAmount
    /// @return sanctumAmount sanctumAmount
    /// @return ecosystemAmount ecosystemAmount
    /// @return sanctumSink sanctumSink
    /// @return ecosystemSink ecosystemSink
    /// @return burnSink burnSink
    function computeFeesAndReserve(
        address from,
        address to,
        uint256 amount
    ) external returns (uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount, address sanctumSink, address ecosystemSink, address burnSink);
}

/// @notice IProofScoreBurnRouter
/// @title IProofScoreBurnRouter
/// @author Vfide
interface IProofScoreBurnRouter {
    /// @notice setFeePolicy
    /// @param _minTotalBps _minTotalBps
    /// @param _maxTotalBps _maxTotalBps
    function setFeePolicy(uint16 _minTotalBps, uint16 _maxTotalBps) external;
    /// @notice setModules
    /// @param seer seer
    /// @param sanctumSink sanctumSink
    /// @param burnSink burnSink
    /// @param ecosystemSink ecosystemSink
    function setModules(address seer, address sanctumSink, address burnSink, address ecosystemSink) external;
    /// @notice minTotalBps
    /// @return _uint16 _uint16
    function minTotalBps() external view returns (uint16);
    /// @notice maxTotalBps
    /// @return _uint16 _uint16
    function maxTotalBps() external view returns (uint16);
    /// @notice getFeeForScore
    /// @param score score
    /// @return totalBps totalBps
    /// @return feePercent feePercent
    function getFeeForScore(uint16 score) external view returns (uint256 totalBps, uint256 feePercent);
    /// @notice getEffectiveBurnRate
    /// @param user user
    /// @return burnBps burnBps
    /// @return sanctumBps sanctumBps
    /// @return ecosystemBps ecosystemBps
    function getEffectiveBurnRate(address user) external view returns (uint16 burnBps, uint16 sanctumBps, uint16 ecosystemBps);
    /// @notice previewFees
    /// @param user user
    /// @param amount amount
    /// @return burnAmount burnAmount
    /// @return sanctumAmount sanctumAmount
    /// @return ecosystemAmount ecosystemAmount
    /// @return netAmount netAmount
    /// @return score score
    function previewFees(address user, uint256 amount) external view returns (uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount, uint256 netAmount, uint16 score);

    // Sustainability controls
    /// @notice setSustainability
    /// @param _dailyBurnCap _dailyBurnCap
    /// @param _minimumSupplyFloor _minimumSupplyFloor
    /// @param _ecosystemMinBps _ecosystemMinBps
    function setSustainability(uint256 _dailyBurnCap, uint256 _minimumSupplyFloor, uint16 _ecosystemMinBps) external;
    /// @notice setAdaptiveFees
    /// @param lowVolumeThreshold lowVolumeThreshold
    /// @param highVolumeThreshold highVolumeThreshold
    /// @param lowVolMultiplier lowVolMultiplier
    /// @param highVolMultiplier highVolMultiplier
    /// @param enabled enabled
    function setAdaptiveFees(uint256 lowVolumeThreshold, uint256 highVolumeThreshold, uint16 lowVolMultiplier, uint16 highVolMultiplier, bool enabled) external;
    /// @notice recordBurn
    /// @param burnAmount burnAmount
    function recordBurn(uint256 burnAmount) external;
    /// @notice recordVolume
    /// @param amount amount
    function recordVolume(uint256 amount) external;
    /// @notice updateScore
    /// @param user user
    function updateScore(address user) external;

    // Sustainability views
    /// @notice dailyBurnCap
    /// @return _uint256 _uint256
    function dailyBurnCap() external view returns (uint256);
    /// @notice minimumSupplyFloor
    /// @return _uint256 _uint256
    function minimumSupplyFloor() external view returns (uint256);
    /// @notice ecosystemMinBps
    /// @return _uint16 _uint16
    function ecosystemMinBps() external view returns (uint16);
    /// @notice remainingDailyBurnCapacity
    /// @return _uint256 _uint256
    function remainingDailyBurnCapacity() external view returns (uint256);
    /// @notice burnsPaused
    /// @return _bool _bool
    function burnsPaused() external view returns (bool);
    /// @notice getVolumeMultiplier
    /// @return _uint16 _uint16
    function getVolumeMultiplier() external view returns (uint16);
    /// @notice adaptiveFeesEnabled
    /// @return _bool _bool
    function adaptiveFeesEnabled() external view returns (bool);
    /// @notice getSustainabilityStatus
    /// @return dailyBurned dailyBurned
    /// @return burnCapacity burnCapacity
    /// @return dailyVolume dailyVolume
    /// @return volumeMultiplier volumeMultiplier
    /// @return burnsPausedFlag burnsPausedFlag
    /// @return supplyFloor supplyFloor
    /// @return currentSupply currentSupply
    function getSustainabilityStatus() external view returns (
        uint256 dailyBurned,
        uint256 burnCapacity,
        uint256 dailyVolume,
        uint16 volumeMultiplier,
        bool burnsPausedFlag,
        uint256 supplyFloor,
        uint256 currentSupply
    );
}

/// @notice IStablecoinRegistry
/// @title IStablecoinRegistry
/// @author Vfide
interface IStablecoinRegistry {
    /// @notice isWhitelisted
    /// @param token token
    /// @return _bool _bool
    function isWhitelisted(address token) external view returns (bool);
    /// @notice tokenDecimals
    /// @param token token
    /// @return _uint8 _uint8
    function tokenDecimals(address token) external view returns (uint8);
    /// @notice treasury
    /// @return _address _address
    function treasury() external view returns (address);
    /// @notice setTreasury
    /// @param _treasury _treasury
    function setTreasury(address _treasury) external;
}

/// @notice IERC20
/// @title IERC20
/// @author Vfide
interface IERC20 {
    /// @notice balanceOf
    /// @param account account
    /// @return _uint256 _uint256
    function balanceOf(address account) external view returns (uint256);
    /// @notice transfer
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transfer(address to, uint256 amount) external returns (bool);
    /// @notice transferFrom
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @return _bool _bool
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    /// @notice approve
    /// @param spender spender
    /// @param amount amount
    /// @return _bool _bool
    function approve(address spender, uint256 amount) external returns (bool);
    /// @notice allowance
    /// @param owner owner
    /// @param spender spender
    /// @return _uint256 _uint256
    function allowance(address owner, address spender) external view returns (uint256);
    /// @notice totalSupply
    /// @return _uint256 _uint256
    function totalSupply() external view returns (uint256);
}

/// @notice IVFIDEToken
/// @title IVFIDEToken
/// @author Vfide
interface IVFIDEToken is IERC20 {
    /// @notice setVaultHub
    /// @param hub hub
    function setVaultHub(address hub) external;
    /// @notice applyVaultHub
    function applyVaultHub() external;
    /// @notice cancelVaultHub
    function cancelVaultHub() external;
    /// @notice setEmergencyBreaker
    /// @param breaker breaker
    function setEmergencyBreaker(address breaker) external;
    /// @notice applyEmergencyBreaker
    function applyEmergencyBreaker() external;
    /// @notice cancelEmergencyBreaker
    function cancelEmergencyBreaker() external;
    /// @notice setSeerAutonomous
    /// @param seerAutonomous seerAutonomous
    function setSeerAutonomous(address seerAutonomous) external;
    /// @notice setLedger
    /// @param ledger ledger
    function setLedger(address ledger) external;
    /// @notice applyLedger
    function applyLedger() external;
    /// @notice cancelLedger
    function cancelLedger() external;
    /// @notice setBurnRouter
    /// @param router router
    function setBurnRouter(address router) external;
    /// @notice applyBurnRouter
    function applyBurnRouter() external;
    /// @notice cancelBurnRouter
    function cancelBurnRouter() external;
    /// @notice setTreasurySink
    /// @param treasury treasury
    function setTreasurySink(address treasury) external;
    /// @notice applyTreasurySink
    function applyTreasurySink() external;
    /// @notice cancelTreasurySink
    function cancelTreasurySink() external;
    /// @notice setSanctumSink
    /// @param sanctum sanctum
    function setSanctumSink(address sanctum) external;
    /// @notice applySanctumSink
    function applySanctumSink() external;
    /// @notice cancelSanctumSink
    function cancelSanctumSink() external;
    /// @notice setEcosystemDistributor
    /// @param distributor distributor
    function setEcosystemDistributor(address distributor) external;
    /// @notice applyEcosystemDistributor
    function applyEcosystemDistributor() external;
    /// @notice cancelEcosystemDistributor
    function cancelEcosystemDistributor() external;
    /// @notice setFraudRegistry
    /// @param registry registry
    function setFraudRegistry(address registry) external;
    /// @notice applyFraudRegistry
    function applyFraudRegistry() external;
    /// @notice cancelFraudRegistry
    function cancelFraudRegistry() external;
    /// @notice proposeSystemExempt
    /// @param who who
    /// @param isExempt isExempt
    function proposeSystemExempt(address who, bool isExempt) external;
    /// @notice cancelPendingExempt
    function cancelPendingExempt() external;
    /// @notice confirmSystemExempt
    function confirmSystemExempt() external;
    /// @notice proposeWhitelist
    /// @param addr addr
    /// @param status status
    function proposeWhitelist(address addr, bool status) external;
    /// @notice cancelPendingWhitelist
    function cancelPendingWhitelist() external;
    /// @notice confirmWhitelist
    function confirmWhitelist() external;
    /// @notice setVaultOnly
    /// @param enabled enabled
    function setVaultOnly(bool enabled) external;
    /// @notice setCircuitBreaker
    /// @param active active
    /// @param duration duration
    function setCircuitBreaker(bool active, uint256 duration) external;
    /// @notice confirmCircuitBreaker
    function confirmCircuitBreaker() external; // H-01 FIX: confirm pending circuit breaker activation
    // M-7 FIX: setSecurityBypass removed — function no longer exists in VFIDEToken.sol
    /// @notice setFeeBypass
    /// @param active active
    /// @param duration duration
    function setFeeBypass(bool active, uint256 duration) external;       // H-02 FIX: explicit fee bypass
    // setBlacklist removed — non-custodial
    /// @notice lockPolicy
    function lockPolicy() external;
    /// @notice treasurySink
    /// @return _address _address
    function treasurySink() external view returns (address);
    /// @notice vaultOnly
    /// @return _bool _bool
    function vaultOnly() external view returns (bool);
    /// @notice policyLocked
    /// @return _bool _bool
    function policyLocked() external view returns (bool);
    /// @notice circuitBreaker
    /// @return _bool _bool
    function circuitBreaker() external view returns (bool);
    /// @notice isCircuitBreakerActive
    /// @return _bool _bool
    function isCircuitBreakerActive() external view returns (bool);
    /// @notice circuitBreakerExpiry
    /// @return _uint256 _uint256
    function circuitBreakerExpiry() external view returns (uint256);
    // Anti-whale functions
    /// @notice setAntiWhale
    /// @param maxTransfer maxTransfer
    /// @param maxWallet maxWallet
    /// @param dailyLimit dailyLimit
    /// @param cooldown cooldown
    function setAntiWhale(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown) external;
    /// @notice applyAntiWhale
    function applyAntiWhale() external;
    /// @notice setWhaleLimitExempt
    /// @param addr addr
    /// @param exempt exempt
    function setWhaleLimitExempt(address addr, bool exempt) external;
    /// @notice applyWhaleLimitExempt
    /// @param addr addr
    function applyWhaleLimitExempt(address addr) external;
    /// @notice applyVaultOnlyDisable
    function applyVaultOnlyDisable() external;
    /// @notice maxTransferAmount
    /// @return _uint256 _uint256
    function maxTransferAmount() external view returns (uint256);
    /// @notice maxWalletBalance
    /// @return _uint256 _uint256
    function maxWalletBalance() external view returns (uint256);
    /// @notice dailyTransferLimit
    /// @return _uint256 _uint256
    function dailyTransferLimit() external view returns (uint256);
    /// @notice transferCooldown
    /// @return _uint256 _uint256
    function transferCooldown() external view returns (uint256);
    /// @notice whaleLimitExempt
    /// @return _bool _bool
    function whaleLimitExempt(address _address) external view returns (bool);
    /// @notice remainingDailyLimit
    /// @param account account
    /// @return _uint256 _uint256
    function remainingDailyLimit(address account) external view returns (uint256);
    /// @notice cooldownRemaining
    /// @param account account
    /// @return _uint256 _uint256
    function cooldownRemaining(address account) external view returns (uint256);
}

/// @notice ISeer
/// @title ISeer
/// @author Vfide
interface ISeer {
    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16);
    /// @notice getCachedScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getCachedScore(address subject) external view returns (uint16); // I-13: Gas-efficient for transfer path
    /// @notice getScoreAt
    /// @param subject subject
    /// @param timestamp timestamp
    /// @return _uint16 _uint16
    function getScoreAt(address subject, uint64 timestamp) external view returns (uint16);
    /// @notice lastActivity
    /// @param subject subject
    /// @return _uint64 _uint64
    function lastActivity(address subject) external view returns (uint64);
    /// @notice hasBadge
    /// @param subject subject
    /// @param badge badge
    /// @return _bool _bool
    function hasBadge(address subject, bytes32 badge) external view returns (bool);
    /// @notice minForGovernance
    /// @return _uint16 _uint16
    function minForGovernance() external view returns (uint16);
    /// @notice minForMerchant
    /// @return _uint16 _uint16
    function minForMerchant() external view returns (uint16);
    /// @notice highTrustThreshold
    /// @return _uint16 _uint16
    function highTrustThreshold() external view returns (uint16);
    /// @notice lowTrustThreshold
    /// @return _uint16 _uint16
    function lowTrustThreshold() external view returns (uint16);
    /// @notice NEUTRAL
    /// @return _uint16 _uint16
    function NEUTRAL() external view returns (uint16);
    /// @notice setModules
    /// @param _ledger _ledger
    /// @param _hub _hub
    function setModules(address _ledger, address _hub) external;
    /// @notice setThresholds
    /// @param low low
    /// @param high high
    /// @param minGov minGov
    /// @param minMerch minMerch
    function setThresholds(uint16 low, uint16 high, uint16 minGov, uint16 minMerch) external;
    /// @notice reward
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function reward(address subject, uint16 delta, string calldata reason) external;
    /// @notice punish
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function punish(address subject, uint16 delta, string calldata reason) external;
}

/// @notice IEcosystemVault
/// @title IEcosystemVault
/// @author Vfide
interface IEcosystemVault {
    /// @notice allocateIncoming
    function allocateIncoming() external;
    /// @notice councilPool
    /// @return _uint256 _uint256
    function councilPool() external view returns (uint256); // BATCH-04
    /// @notice payExpense
    /// @param recipient recipient
    /// @param amount amount
    /// @param reason reason
    function payExpense(address recipient, uint256 amount, string calldata reason) external;
    /// @notice payMerchantWorkReward
    /// @param worker worker
    /// @param amount amount
    /// @param reason reason
    function payMerchantWorkReward(address worker, uint256 amount, string calldata reason) external;
    /// @notice payReferralWorkReward
    /// @param worker worker
    /// @param amount amount
    /// @param reason reason
    function payReferralWorkReward(address worker, uint256 amount, string calldata reason) external;
    /// @notice payReferralLevelReward
    /// @param worker worker
    /// @param year year
    /// @param reason reason
    function payReferralLevelReward(address worker, uint256 year, string calldata reason) external;
    /// @notice claimReferralLevelRewards
    /// @param year year
    /// @param reason reason
    /// @return levelsPaid levelsPaid
    /// @return totalAmount totalAmount
    function claimReferralLevelRewards(uint256 year, string calldata reason) external returns (uint8 levelsPaid, uint256 totalAmount);
    /// @notice processReferralLevelRewards
    /// @param worker worker
    /// @param year year
    /// @param reason reason
    /// @return levelsPaid levelsPaid
    /// @return totalAmount totalAmount
    function processReferralLevelRewards(address worker, uint256 year, string calldata reason) external returns (uint8 levelsPaid, uint256 totalAmount);
    /// @notice burnFunds
    /// @param amount amount
    function burnFunds(uint256 amount) external;
    /// @notice recordMerchantTransaction
    /// @param merchant merchant
    function recordMerchantTransaction(address merchant) external;
    /// @notice registerMerchantReferral
    /// @param merchant merchant
    /// @param referrer referrer
    function registerMerchantReferral(address merchant, address referrer) external;
    /// @notice registerUserReferral
    /// @param referrer referrer
    /// @param user user
    function registerUserReferral(address referrer, address user) external;
    /// @notice creditMerchantReferral
    /// @param merchant merchant
    function creditMerchantReferral(address merchant) external;
    /// @notice creditUserReferral
    /// @param user user
    function creditUserReferral(address user) external;
}

/// @notice ICouncilManager
/// @title ICouncilManager
/// @author Vfide
interface ICouncilManager {
    /// @notice getActiveMembers
    /// @return _arg _arg
    function getActiveMembers() external view returns (address[] memory);
    /// @notice isActiveMember
    /// @param member member
    /// @return _bool _bool
    function isActiveMember(address member) external view returns (bool);
    /// @notice getCouncilSize
    /// @return _uint256 _uint256
    function getCouncilSize() external view returns (uint256);
}

/// @notice ISwapRouter
/// @title ISwapRouter
/// @author Vfide
interface ISwapRouter {
    /// @notice swapExactTokensForTokens
    /// @param amountIn amountIn
    /// @param amountOutMin amountOutMin
    /// @param path path
    /// @param to to
    /// @param deadline deadline
    /// @return amounts amounts
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    
    /// @notice getAmountsOut
    /// @param amountIn amountIn
    /// @param path path
    /// @return amounts amounts
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

/// @notice ICouncilElection
/// @title ICouncilElection
/// @author Vfide
interface ICouncilElection {
    /// @notice getCouncilMember
    /// @param index index
    /// @return _address _address
    function getCouncilMember(uint256 index) external view returns (address);
    /// @notice getActualCouncilSize
    /// @return _uint256 _uint256
    function getActualCouncilSize() external view returns (uint256);
    /// @notice isCouncil
    /// @param account account
    /// @return _bool _bool
    function isCouncil(address account) external view returns (bool);
    /// @notice removeCouncilMember
    /// @param member member
    /// @param reason reason
    function removeCouncilMember(address member, string calldata reason) external;
}

/// @notice IEmergencyBreaker
/// @title IEmergencyBreaker
/// @author Vfide
interface IEmergencyBreaker {
    /// @notice halted
    /// @return _bool _bool
    function halted() external view returns (bool);
    /// @notice toggle
    /// @param on on
    /// @param reason reason
    function toggle(bool on, string calldata reason) external;
}

/// @notice IDAOTimelock
/// @title IDAOTimelock
/// @author Vfide
interface IDAOTimelock {
    /// @notice queueTx
    /// @param target target
    /// @param value value
    /// @param data data
    /// @return _bytes32 _bytes32
    function queueTx(address target, uint256 value, bytes calldata data) external returns (bytes32);
    /// @notice queueTxFromDAO
    /// @param target target
    /// @param value value
    /// @param data data
    /// @param daoProposalId daoProposalId
    /// @return _bytes32 _bytes32
    function queueTxFromDAO(address target, uint256 value, bytes calldata data, uint256 daoProposalId) external returns (bytes32);
    /// @notice execute
    /// @param id id
    /// @return _bytes _bytes
    function execute(bytes32 id) external payable returns (bytes memory);
}

/// @notice IGovernanceHooks
/// @title IGovernanceHooks
/// @author Vfide
interface IGovernanceHooks {
    /// @notice onProposalQueued
    /// @param id id
    /// @param target target
    /// @param value value
    function onProposalQueued(uint256 id, address target, uint256 value) external;
    /// @notice onVoteCast
    /// @param id id
    /// @param voter voter
    /// @param support support
    function onVoteCast(uint256 id, address voter, bool support) external;
    /// @notice onFinalized
    /// @param id id
    /// @param passed passed
    function onFinalized(uint256 id, bool passed) external;
}

/// @notice IPanicGuard
/// @title IPanicGuard
/// @author Vfide
interface IPanicGuard {
    /// @notice globalRisk
    /// @return _bool _bool
    function globalRisk() external view returns (bool);
    /// @notice setHub
    /// @param _hub _hub
    function setHub(address _hub) external;
    /// @notice reportRisk
    /// @param vault vault
    /// @param duration duration
    /// @param severity severity
    /// @param reason reason
    function reportRisk(address vault, uint64 duration, uint8 severity, string calldata reason) external;
}

/// ─────────────────────────── Shared Abstracts
/// @notice Ownable
/// @title Ownable
/// @author Vfide

abstract contract Ownable {
    /// @notice OwnershipTransferred
    /// @param previousOwner previousOwner
    /// @param newOwner newOwner
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /// @notice OwnershipTransferStarted
    /// @param previousOwner previousOwner
    /// @param newOwner newOwner
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    /// @notice EmergencyControllerSet
    /// @param previousController previousController
    /// @param newController newController
    event EmergencyControllerSet(address indexed previousController, address indexed newController);
    /// @notice EmergencyControllerProposed
    /// @param controller controller
    /// @param effectiveAt effectiveAt
    event EmergencyControllerProposed(address indexed controller, uint64 effectiveAt);
    /// @notice EmergencyControllerCancelled
    event EmergencyControllerCancelled();

    /// @notice owner
    address public owner;
    /// @notice pendingOwner
    address public pendingOwner;
    /// @notice emergencyController
    address public emergencyController;
    /// @notice ownershipTransferDeadline
    uint64  public ownershipTransferDeadline;

    /// @notice pendingEmergencyController
    address public pendingEmergencyController;
    /// @notice pendingEmergencyControllerAt
    uint64  public pendingEmergencyControllerAt;
    /// @notice EMERGENCY_CONTROLLER_DELAY
    uint64  public constant EMERGENCY_CONTROLLER_DELAY = 48 hours;

    /// @notice constructor
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice onlyOwner
    modifier onlyOwner() { _checkOwner(); _; }

    /// @notice _checkOwner
    function _checkOwner() internal view {
        require(msg.sender == owner, "OWN: not owner");
    }

    /// @notice Propose a new emergency controller with 48-hour timelock.
    /// @param controller controller
    function setEmergencyController(address controller) external onlyOwner {
        require(controller != address(0), "OWN: zero controller");
        require(pendingEmergencyControllerAt == 0, "OWN: pending controller exists");
        pendingEmergencyController = controller;
        pendingEmergencyControllerAt = uint64(block.timestamp) + EMERGENCY_CONTROLLER_DELAY;
        emit EmergencyControllerProposed(controller, pendingEmergencyControllerAt);
    }

    /// @notice applyEmergencyController
    function applyEmergencyController() external onlyOwner {
        require(pendingEmergencyControllerAt != 0, "OWN: no pending controller");
        require(block.timestamp >= pendingEmergencyControllerAt, "OWN: timelock active");
        address old = emergencyController;
        emergencyController = pendingEmergencyController;
        delete pendingEmergencyController;
        delete pendingEmergencyControllerAt;
        emit EmergencyControllerSet(old, emergencyController);
    }

    /// @notice cancelEmergencyController
    function cancelEmergencyController() external onlyOwner {
        require(pendingEmergencyControllerAt != 0, "OWN: no pending controller");
        delete pendingEmergencyController;
        delete pendingEmergencyControllerAt;
        emit EmergencyControllerCancelled();
    }

    /// @notice Start two-step ownership transfer
    /// @param newOwner newOwner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OWN: zero");
        pendingOwner = newOwner;
        ownershipTransferDeadline = uint64(block.timestamp + 7 days);
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /// @notice Emergency-only ownership recovery path for a registered controller.
    /// @dev H-14 FIX: Add a 24h timelock + pending-transfer pattern to prevent instant
    ///      ownership bypass. The emergency controller must call and the new owner must accept.
    address public pendingEmergencyOwner;
    /// @notice emergencyTransferValidFrom
    uint64 public emergencyTransferValidFrom;
    /// @notice EMERGENCY_OWNERSHIP_DELAY
    uint256 public constant EMERGENCY_OWNERSHIP_DELAY = 24 hours;

    /// @notice EmergencyOwnershipProposed
    /// @param newOwner newOwner
    /// @param validFrom validFrom
    event EmergencyOwnershipProposed(address indexed newOwner, uint64 validFrom);

    /// @notice emergencyTransferOwnership
    /// @param newOwner newOwner
    function emergencyTransferOwnership(address newOwner) external {
        require(msg.sender == emergencyController, "OWN: not emergency controller");
        require(newOwner != address(0), "OWN: zero");
        // H-14 FIX: Queue the transfer; new owner must accept after 24h.
        pendingEmergencyOwner = newOwner;
        emergencyTransferValidFrom = uint64(block.timestamp + EMERGENCY_OWNERSHIP_DELAY);
        emit EmergencyOwnershipProposed(newOwner, emergencyTransferValidFrom);
    }

    /// @notice New owner accepts an emergency transfer after the 24h delay.
    function acceptEmergencyOwnership() external {
        require(msg.sender == pendingEmergencyOwner, "OWN: not pending emergency owner");
        require(block.timestamp >= emergencyTransferValidFrom, "OWN: timelock pending");
        address old = owner;
        owner = msg.sender;
        pendingEmergencyOwner = address(0);
        emergencyTransferValidFrom = 0;
        emit OwnershipTransferred(old, msg.sender);
    }

    /// @notice Complete ownership transfer (must be called by pending owner)
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "OWN: not pending owner");
        require(block.timestamp <= ownershipTransferDeadline, "OWN: transfer expired");
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
        ownershipTransferDeadline = 0;

        // M-12 FIX: A normal ownership transfer must invalidate any in-flight
        // emergency-controller change and any pending emergency-owner transfer
        // queued by the prior owner. Otherwise an attacker who briefly captured
        // the old owner could pre-queue an emergency-controller swap that
        // executes against the new owner after the timelock elapses.
        if (pendingEmergencyControllerAt != 0) {
            delete pendingEmergencyController;
            delete pendingEmergencyControllerAt;
            emit EmergencyControllerCancelled();
        }
        if (pendingEmergencyOwner != address(0)) {
            delete pendingEmergencyOwner;
            delete emergencyTransferValidFrom;
        }
    }

    /// @notice Cancel pending ownership transfer
    function cancelOwnershipTransfer() external onlyOwner {
        pendingOwner = address(0);
        ownershipTransferDeadline = 0;
    }

    /// @notice Ownership renounce is disabled across the protocol to avoid permanently orphaning contracts.
    function renounceOwnership() public view virtual onlyOwner {
        revert("OWN: renounce disabled");
    }
}

/// @dev I-16 Note: Two ReentrancyGuard implementations are intentionally retained:
///   1. This (SharedInterfaces.ReentrancyGuard) — single-contract guard, used by core contracts
///   2. OZ ReentrancyGuard — required by LayerZero OApp inheritance in bridge/peripheral contracts
/// @notice ReentrancyGuard
/// @title ReentrancyGuard
/// @author Vfide
abstract contract ReentrancyGuard {
    /// @notice _status
    uint256 private _status = 1;
    /// @notice nonReentrant
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }
    /// @notice _nonReentrantBefore
    function _nonReentrantBefore() internal {
        require(_status == 1, "reentrancy");
        _status = 2;
    }
    /// @notice _nonReentrantAfter
    function _nonReentrantAfter() internal {
        _status = 1;
    }
}

/// @notice Custom Pausable — matches OZ Pausable interface (paused, _pause, _unpause, whenNotPaused, whenPaused)
/// @title Pausable
/// @author Vfide
abstract contract Pausable {
    /// @notice Paused
    /// @param account account
    event Paused(address indexed account);
    /// @notice Unpaused
    /// @param account account
    event Unpaused(address indexed account);
    /// @notice _paused
    bool private _paused;
    /// @notice whenNotPaused
    modifier whenNotPaused() { require(!_paused, "Pausable: paused"); _; }
    /// @notice whenPaused
    modifier whenPaused() { require(_paused, "Pausable: not paused"); _; }
    /// @notice paused
    /// @return _bool _bool
    function paused() public view returns (bool) { return _paused; }
    /// @notice _pause
    function _pause() internal whenNotPaused { _paused = true; emit Paused(msg.sender); }
    /// @notice _unpause
    function _unpause() internal whenPaused { _paused = false; emit Unpaused(msg.sender); }
}

/// @notice AccessControl for role-based permissions (OpenZeppelin-compatible pattern)
/// @title AccessControl
/// @author Vfide
abstract contract AccessControl {
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }
    
    /// @notice _roles
    mapping(bytes32 => RoleData) private _roles;
    
    /// @notice DEFAULT_ADMIN_ROLE
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    
    /// @notice RoleGranted
    /// @param role role
    /// @param account account
    /// @param sender sender
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    /// @notice RoleRevoked
    /// @param role role
    /// @param account account
    /// @param sender sender
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    /// @notice RoleAdminChanged
    /// @param role role
    /// @param previousAdminRole previousAdminRole
    /// @param newAdminRole newAdminRole
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /// @dev Auto-grant DEFAULT_ADMIN_ROLE to deployer to prevent bootstrap deadlock
    /// @notice constructor
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /// @notice onlyRole
    /// @param role role
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "AC: missing role");
        _;
    }
    
    /// @notice hasRole
    /// @param role role
    /// @param account account
    /// @return _bool _bool
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].members[account];
    }
    
    /// @notice getRoleAdmin
    /// @param role role
    /// @return _bytes32 _bytes32
    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }
    
    /// @notice grantRole
    /// @param role role
    /// @param account account
    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }
    
    /// @notice revokeRole
    /// @param role role
    /// @param account account
    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }
    
    /// @notice renounceRole
    /// @param role role
    /// @param account account
    function renounceRole(bytes32 role, address account) public virtual {
        require(account == msg.sender, "AC: can only renounce for self");
        _revokeRole(role, account);
    }
    
    /// @notice _grantRole
    /// @param role role
    /// @param account account
    function _grantRole(bytes32 role, address account) internal {
        if (!hasRole(role, account)) {
            _roles[role].members[account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }
    
    /// @notice _revokeRole
    /// @param role role
    /// @param account account
    function _revokeRole(bytes32 role, address account) internal {
        if (hasRole(role, account)) {
            _roles[role].members[account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }
    
    /// @notice _setRoleAdmin
    /// @param role role
    /// @param adminRole adminRole
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }
}

/// @notice SafeERC20 library for non-standard tokens (USDT, etc.)
/// @title SafeERC20
/// @author Vfide
library SafeERC20 {
    /// @notice safeTransfer
    /// @param token token
    /// @param to to
    /// @param value value
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory data) = address(token).call(abi.encodeWithSelector(token.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: transfer failed");
    }

    /// @notice safeTransferFrom
    /// @param token token
    /// @param from from
    /// @param to to
    /// @param value value
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory data) = address(token).call(abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: transferFrom failed");
    }
    
    /// @notice safeApprove
    /// @param token token
    /// @param spender spender
    /// @param value value
    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        forceApprove(token, spender, value);
    }

    /// @notice forceApprove
    /// @param token token
    /// @param spender spender
    /// @param value value
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (_callOptionalReturnBool(token, abi.encodeWithSelector(token.approve.selector, spender, value))) {
            return;
        }

        require(_callOptionalReturnBool(token, abi.encodeWithSelector(token.approve.selector, spender, 0)), "SafeERC20: approve reset failed");
        require(_callOptionalReturnBool(token, abi.encodeWithSelector(token.approve.selector, spender, value)), "SafeERC20: approve failed");
    }

    /// @notice _callOptionalReturnBool
    /// @param token token
    /// @param data data
    /// @return _bool _bool
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        return success && (returndata.length == 0 || abi.decode(returndata, (bool)));
    }
}
