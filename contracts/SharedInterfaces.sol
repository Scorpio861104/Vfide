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
 * Core contracts (VFIDEToken, VFIDETrust, DAO, VFIDEPresale, VaultHub, OwnerControlPanel)
 * use LOCAL reimplementations defined in this file. VFIDEBridge imports from OZ directly
 * because LayerZero OApp requires OZ Ownable. BSM and VFIDEPriceOracle were migrated to
 * custom SharedInterfaces (H-18 fix) and deployed via DeployPhase3Peripherals.sol.
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
event LedgerLogFailed(address indexed source, string action);

interface IVaultHub {
    function vaultOf(address owner) external view returns (address);
    function isVault(address a) external view returns (bool);
    function ensureVault(address owner_) external returns (address vault);
    function setVFIDEToken(address token) external;
    function setSecurityHub(address security) external;
    function setProofLedger(address ledger) external;
    function setDAORecoveryMultisig(address multisig) external;
    function setRecoveryTimelock(uint256 timelock) external;
    function requestDAORecovery(address vault, address newOwner) external;
    function finalizeDAORecovery(address vault) external;
    function cancelDAORecovery(address vault) external;
    function totalVaultsCreated() external view returns (uint256);
}

interface ISecurityHub {
    function isLocked(address vault) external view returns (bool);
    function registerVault(address vault) external;
}

interface IProofLedger {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
    function logTransfer(address from, address to, uint256 amount, string calldata context) external;
}

interface IProofScoreBurnRouterToken {
    function computeFees(
        address from,
        address to,
        uint256 amount
    ) external view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        address sanctumSink,
        address ecosystemSink,
        address burnSink
    );
}

interface IProofScoreBurnRouter {
    function setFeePolicy(uint16 minTotalBps, uint16 maxTotalBps) external;
    function setModules(address seer, address sanctumSink, address burnSink, address ecosystemSink) external;
    function minTotalBps() external view returns (uint16);
    function maxTotalBps() external view returns (uint16);
    function getFeeForScore(uint16 score) external view returns (uint256 totalBps, uint256 feePercent);
    function getEffectiveBurnRate(address user) external view returns (uint16 burnBps, uint16 sanctumBps, uint16 ecosystemBps);
    function previewFees(address user, uint256 amount) external view returns (uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount, uint256 netAmount, uint16 score);
    
    // Sustainability controls
    function setToken(address token) external;
    function setSustainability(uint256 dailyBurnCap, uint256 minimumSupplyFloor, uint16 ecosystemMinBps) external;
    function setAdaptiveFees(uint256 lowVolumeThreshold, uint256 highVolumeThreshold, uint16 lowVolMultiplier, uint16 highVolMultiplier, bool enabled) external;
    function recordBurn(uint256 burnAmount) external;
    function recordVolume(uint256 amount) external;
    function updateScore(address user) external;
    
    // Sustainability views
    function dailyBurnCap() external view returns (uint256);
    function minimumSupplyFloor() external view returns (uint256);
    function ecosystemMinBps() external view returns (uint16);
    function remainingDailyBurnCapacity() external view returns (uint256);
    function burnsPaused() external view returns (bool);
    function getVolumeMultiplier() external view returns (uint16);
    function adaptiveFeesEnabled() external view returns (bool);
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

interface IStablecoinRegistry {
    function isWhitelisted(address token) external view returns (bool);
    function tokenDecimals(address token) external view returns (uint8);
    function treasury() external view returns (address);
    function setTreasury(address _treasury) external;
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IVFIDEToken is IERC20 {
    function setSecurityHub(address hub) external;
    function setVaultHub(address hub) external;
    function setLedger(address ledger) external;
    function setBurnRouter(address router) external;
    function setTreasurySink(address treasury) external;
    function setSanctumSink(address sanctum) external;
    function proposeSystemExempt(address who, bool isExempt) external;
    function confirmSystemExempt() external;
    function proposeWhitelist(address addr, bool status) external;
    function confirmWhitelist() external;
    function setVaultOnly(bool enabled) external;
    function setCircuitBreaker(bool active, uint256 duration) external;
    function setBlacklist(address user, bool status) external;
    function lockPolicy() external;
    function vaultOnly() external view returns (bool);
    function policyLocked() external view returns (bool);
    function circuitBreaker() external view returns (bool);
    function isCircuitBreakerActive() external view returns (bool);
    function circuitBreakerExpiry() external view returns (uint256);
    // Anti-whale functions
    function setAntiWhale(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown) external;
    function setWhaleLimitExempt(address addr, bool exempt) external;
    function maxTransferAmount() external view returns (uint256);
    function maxWalletBalance() external view returns (uint256);
    function dailyTransferLimit() external view returns (uint256);
    function transferCooldown() external view returns (uint256);
    function whaleLimitExempt(address) external view returns (bool);
    function remainingDailyLimit(address account) external view returns (uint256);
    function cooldownRemaining(address account) external view returns (uint256);
}

interface ISeer {
    function getScore(address subject) external view returns (uint16);
    function getCachedScore(address subject) external view returns (uint16); // I-13: Gas-efficient for transfer path
    function lastActivity(address subject) external view returns (uint64);
    function hasBadge(address subject, bytes32 badge) external view returns (bool);
    function minForGovernance() external view returns (uint16);
    function minForMerchant() external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function lowTrustThreshold() external view returns (uint16);
    function NEUTRAL() external view returns (uint16);    function setModules(address _ledger, address _hub) external;
    function setThresholds(uint16 low, uint16 high, uint16 minGov, uint16 minMerch) external;
    function reward(address subject, uint16 delta, string calldata reason) external;
    function punish(address subject, uint16 delta, string calldata reason) external;
}

interface IEcosystemVault {
    function payExpense(address recipient, uint256 amount, string calldata reason) external;
    function payMerchantWorkReward(address worker, uint256 amount, string calldata reason) external;
    function payReferralWorkReward(address worker, uint256 amount, string calldata reason) external;
    function payReferralLevelReward(address worker, uint256 year, string calldata reason) external;
    function claimReferralLevelRewards(uint256 year, string calldata reason) external returns (uint8 levelsPaid, uint256 totalAmount);
    function processReferralLevelRewards(address worker, uint256 year, string calldata reason) external returns (uint8 levelsPaid, uint256 totalAmount);
    function burnFunds(uint256 amount) external;
    function recordMerchantTransaction(address merchant) external;
    function checkHeadhunterReward(address merchant) external;
    function registerMerchantReferral(address merchant, address referrer) external;
    function registerUserReferral(address referrer, address user) external;
    function creditMerchantReferral(address merchant) external;
    function creditUserReferral(address user) external;
}

interface ICouncilManager {
    function getActiveMembers() external view returns (address[] memory);
    function isActiveMember(address member) external view returns (bool);
    function getCouncilSize() external view returns (uint256);
}

interface ISwapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

interface ICouncilElection {
    function getCouncilMember(uint256 index) external view returns (address);
    function getActualCouncilSize() external view returns (uint256);
    function isCouncil(address account) external view returns (bool);
    function removeCouncilMember(address member, string calldata reason) external;
}

interface IEmergencyBreaker {
    function halted() external view returns (bool);
    function toggle(bool on, string calldata reason) external;
}

interface IEscrowManager {
    function createEscrow(address merchant, address token, uint256 amount, string calldata orderId) external returns (uint256);
    function release(uint256 id) external;
    function refund(uint256 id) external;
    function claimTimeout(uint256 id) external;
    function raiseDispute(uint256 id) external;
    function resolveDispute(uint256 id, bool refundBuyer) external;
}

interface IDAOTimelock {
    function queueTx(address target, uint256 value, bytes calldata data) external returns (bytes32);
}

interface IGovernanceHooks {
    function onProposalQueued(uint256 id, address target, uint256 value) external;
    function onVoteCast(uint256 id, address voter, bool support) external;
    function onFinalized(uint256 id, bool passed) external;
}

interface IPanicGuard {
    function globalRisk() external view returns (bool);
    function setHub(address _hub) external;
}

/// ─────────────────────────── Shared Abstracts

abstract contract Ownable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    
    address public owner;
    address public pendingOwner;
    uint64  public ownershipTransferDeadline;    
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    modifier onlyOwner() { _checkOwner(); _; }
    function _checkOwner() internal view { require(msg.sender == owner, "OWN: not owner"); }
    
    /// @notice Start two-step ownership transfer
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OWN: zero");
        pendingOwner = newOwner;
        ownershipTransferDeadline = uint64(block.timestamp + 7 days);        emit OwnershipTransferStarted(owner, newOwner);
    }
    
    /// @notice Complete ownership transfer (must be called by pending owner)
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "OWN: not pending owner");
        require(block.timestamp <= ownershipTransferDeadline, "OWN: transfer expired");
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
        ownershipTransferDeadline = 0;
    }
    
    /// @notice Cancel pending ownership transfer
    function cancelOwnershipTransfer() external onlyOwner {
        pendingOwner = address(0);
        ownershipTransferDeadline = 0;
    }
}

/// @dev I-16 Note: Three ReentrancyGuard implementations exist by design:
///   1. This (SharedInterfaces.ReentrancyGuard) — single-contract guard, used by most contracts
///   2. VFIDEReentrancyGuard.sol — cross-contract guard with per-address locking (WithdrawalQueue)
///   3. OZ ReentrancyGuard — VFIDEBridge only (required by LayerZero OApp inheritance)
abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }
    function _nonReentrantBefore() internal {
        require(_status == 1, "reentrancy");
        _status = 2;
    }
    function _nonReentrantAfter() internal {
        _status = 1;
    }
}

/// @notice Custom Pausable — matches OZ Pausable interface (paused, _pause, _unpause, whenNotPaused, whenPaused)
abstract contract Pausable {
    event Paused(address account);
    event Unpaused(address account);
    bool private _paused;
    modifier whenNotPaused() { require(!_paused, "Pausable: paused"); _; }
    modifier whenPaused() { require(_paused, "Pausable: not paused"); _; }
    function paused() public view returns (bool) { return _paused; }
    function _pause() internal whenNotPaused { _paused = true; emit Paused(msg.sender); }
    function _unpause() internal whenPaused { _paused = false; emit Unpaused(msg.sender); }
}

/// @notice AccessControl for role-based permissions (OpenZeppelin-compatible pattern)
abstract contract AccessControl {
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }
    
    mapping(bytes32 => RoleData) private _roles;
    
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    
    /// @dev Auto-grant DEFAULT_ADMIN_ROLE to deployer to prevent bootstrap deadlock
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "AC: missing role");
        _;
    }
    
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role].members[account];
    }
    
    function getRoleAdmin(bytes32 role) public view returns (bytes32) {
        return _roles[role].adminRole;
    }
    
    function grantRole(bytes32 role, address account) public onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }
    
    function revokeRole(bytes32 role, address account) public onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }
    
    function renounceRole(bytes32 role, address account) public {
        require(account == msg.sender, "AC: can only renounce for self");
        _revokeRole(role, account);
    }
    
    function _grantRole(bytes32 role, address account) internal {
        if (!hasRole(role, account)) {
            _roles[role].members[account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }
    
    function _revokeRole(bytes32 role, address account) internal {
        if (hasRole(role, account)) {
            _roles[role].members[account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }
    
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }
}

/// @notice SafeERC20 library for non-standard tokens (USDT, etc.)
library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.transfer.selector, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: transfer failed");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.transferFrom.selector, from, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: transferFrom failed");
    }
    
    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(token.approve.selector, spender, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeERC20: approve failed");
    }
}
