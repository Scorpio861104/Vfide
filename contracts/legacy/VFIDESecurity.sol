// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IVaultHub, IProofLedger } from "../SharedInterfaces.sol";

/**
 * VFIDESecurity.sol  —  Consolidated Security Layer
 *
 * Modules in this file:
 *  - SecurityHub: single source of truth for "isLocked(vault)".
 *  - GuardianRegistry: per-vault guardian lists & thresholds.
 *  - GuardianLock: multi-guardian manual lock/unlock with threshold.
 *  - PanicGuard: automatic per-vault quarantine + optional global risk toggle.
 *  - EmergencyBreaker: global halt (DAO-controlled) for existential incidents.
 *
 * Design notes:
 *  - Everything is wired through SecurityHub, so other contracts only need
 *    to check SecurityHub.isLocked(vault) for safety gates.
 *  - GuardianLock uses GuardianRegistry for membership + M-of-N thresholds.
 *  - PanicGuard supports time-based quarantines (auto-unlock on expiry),
 *    DAO overrides, and Seer/DAO risk hooks (via reportRisk).
 *  - EmergencyBreaker is a hard global stop. SecurityHub considers it first.
 *  - ProofLedger logging is best-effort and never reverts the core flow.
 *
 * Wiring (suggested):
 *  1) Deploy GuardianRegistry(dao).
 *  2) Deploy GuardianLock(dao, registry, ledger).
 *  3) Deploy PanicGuard(dao, ledger).
 *  4) Deploy EmergencyBreaker(dao, ledger).
 *  5) Deploy SecurityHub(dao, guardianLock, panicGuard, emergencyBreaker, ledger).
 *
 * In other modules (e.g., UserVault, DevReserveVestingVault), call:
 *    if (securityHub.isLocked(address(this))) revert ...;
 */

/// ───────────────────────────── Interfaces / Errors
/// @notice SEC_NotDAO

error SEC_NotDAO();
/// @notice SEC_Zero
error SEC_Zero();
/// @notice SEC_NotGuardian
error SEC_NotGuardian();
/// @notice SEC_BadThreshold
error SEC_BadThreshold();
/// @notice SEC_AlreadyMember
error SEC_AlreadyMember();
/// @notice SEC_NotMember
error SEC_NotMember();
/// @notice SEC_AlreadyLocked
error SEC_AlreadyLocked();
/// @notice SEC_NotLocked
error SEC_NotLocked();
/// @notice SEC_NoEffect
error SEC_NoEffect();
/// @notice SEC_ExpiryTooShort
error SEC_ExpiryTooShort();

/// ───────────────────────────── GuardianRegistry

// ReentrancyGuard intentionally omitted in this module set: contracts coordinate lock state and policy, not value transfers.
/// @notice GuardianRegistry
/// @title GuardianRegistry
/// @author Vfide
contract GuardianRegistry {
    /// @notice DAOSet
    /// @param dao dao
    event DAOSet(address dao);
    /// @notice GuardianAdded
    /// @param vault vault
    /// @param guardian guardian
    event GuardianAdded(address indexed vault, address indexed guardian);
    /// @notice GuardianRemoved
    /// @param vault vault
    /// @param guardian guardian
    event GuardianRemoved(address indexed vault, address indexed guardian);
    /// @notice ThresholdSet
    /// @param vault vault
    /// @param mOfN mOfN
    event ThresholdSet(address indexed vault, uint8 mOfN);

    /// @notice dao
    address public dao;

    // vault => guardian => true/false
    /// @notice isGuardian
    mapping(address => mapping(address => bool)) public isGuardian;
    // vault => guardian count
    /// @notice guardianCount
    mapping(address => uint8) public guardianCount;
    // vault => threshold (M of N). If 0 and guardians exist, defaults to ceil(N/2).
    /// @notice threshold
    mapping(address => uint8) public threshold;

    /// @notice onlyDAO
    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    /// @notice _checkDAO
    function _checkDAO() internal view {
        if (msg.sender != dao) revert SEC_NotDAO();
    }

    /// @notice constructor
    /// @param _dao _dao
    constructor(address _dao) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
    }

    /// @notice setDAO
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao; emit DAOSet(_dao);
    }

    /// @notice addGuardian
    /// @param vault vault
    /// @param guardian guardian
    function addGuardian(address vault, address guardian) external {
        if (msg.sender != dao && msg.sender != vault) revert SEC_NotDAO();
        if (vault == address(0) || guardian == address(0)) revert SEC_Zero();
        // SEC-06 FIX: Vault cannot add itself as a guardian (prevents self-approval loops)
        if (guardian == vault) revert("SEC: vault cannot be own guardian");
        if (isGuardian[vault][guardian]) revert SEC_AlreadyMember();
        isGuardian[vault][guardian] = true;
        ++guardianCount[vault];
        emit GuardianAdded(vault, guardian);
        // If threshold unset, keep 0 to auto-calc (ceil(N/2)) at read time
    }

    /// @notice removeGuardian
    /// @param vault vault
    /// @param guardian guardian
    function removeGuardian(address vault, address guardian) external {
        if (msg.sender != dao && msg.sender != vault) revert SEC_NotDAO();
        if (!isGuardian[vault][guardian]) revert SEC_NotMember();
        isGuardian[vault][guardian] = false;
        --guardianCount[vault];
        emit GuardianRemoved(vault, guardian);
        // If threshold > count, DAO should reset threshold; we tolerate and clamp on read.
    }

    /// @dev Check if a guardian can be safely removed
    /// @param vault The vault to check
    /// @param guardian The guardian to check
    /// @return canRemove True if removing this guardian won't break threshold requirements
    /// @notice canRemoveGuardian
    function canRemoveGuardian(address vault, address guardian) external view returns (bool canRemove) {
        // Can always remove if not a guardian
        if (!isGuardian[vault][guardian]) return true;
        uint8 count = guardianCount[vault];
        uint8 t = threshold[vault];
        // If removing would drop below threshold, disallow
        if (t > 0 && count <= t) return false;
        return true;
    }

    /// @notice setThreshold
    /// @param vault vault
    /// @param mOfN mOfN
    function setThreshold(address vault, uint8 mOfN) external {
        if (msg.sender != dao && msg.sender != vault) revert SEC_NotDAO();
        uint8 n = guardianCount[vault];
        if (n == 0 && mOfN != 0) revert SEC_BadThreshold();
        if (mOfN > n) revert SEC_BadThreshold();
        threshold[vault] = mOfN;
        emit ThresholdSet(vault, mOfN);
    }

    /// @notice guardiansNeeded
    /// @param vault vault
    /// @return needed needed
    function guardiansNeeded(address vault) public view returns (uint8 needed) {
        uint8 n = guardianCount[vault];
        if (n == 0) return 0;
        uint8 t = threshold[vault];
        if (t == 0) {
            // default to ceil(n/2)
            needed = uint8((uint256(n) + 1) / 2);
        } else {
            needed = t;
        }
        if (needed > n) needed = n; // clamp (in case DAO changed members)
    }

    /// @notice isGuardianOf
    /// @param vault vault
    /// @param guardian guardian
    /// @return _bool _bool
    function isGuardianOf(address vault, address guardian) external view returns (bool) {
        return isGuardian[vault][guardian];
    }
}

/// ───────────────────────────── GuardianLock (manual M-of-N lock)
/// @notice GuardianLock
/// @title GuardianLock
/// @author Vfide

contract GuardianLock {
    /// @notice ModulesSet
    /// @param registry registry
    /// @param ledger ledger
    event ModulesSet(address registry, address ledger);
    /// @notice Locked
    /// @param vault vault
    /// @param byGuardian byGuardian
    /// @param approvals approvals
    /// @param reason reason
    event Locked(address indexed vault, address indexed byGuardian, uint8 approvals, string reason);
    /// @notice Unlocked
    /// @param vault vault
    /// @param by by
    /// @param reason reason
    event Unlocked(address indexed vault, address indexed by, string reason);
    /// @notice Cancelled
    /// @param vault vault
    /// @param by by
    event Cancelled(address indexed vault, address indexed by);
    /// @notice VotesInvalidated
    /// @param vault vault
    /// @param oldNonce oldNonce
    /// @param newNonce newNonce
    /// @param reason reason
    event VotesInvalidated(address indexed vault, uint256 oldNonce, uint256 newNonce, string reason);
    /// @notice GuardianRemovedDuringVote
    /// @param vault vault
    /// @param guardian guardian
    /// @param remainingApprovals remainingApprovals
    event GuardianRemovedDuringVote(address indexed vault, address indexed guardian, uint8 remainingApprovals);

    /// @notice dao
    address public dao;
    /// @notice registry
    GuardianRegistry public registry;
    /// @notice ledger
    IProofLedger public ledger;

    // vault => approvals count
    /// @notice approvals
    mapping(address => uint8) public approvals;
    // vault => nonce => guardian => voted
    /// @notice voted
    mapping(address => mapping(uint256 => mapping(address => bool))) public voted;
    // vault => lock nonce
    /// @notice lockNonce
    mapping(address => uint256) public lockNonce;
    // vault => locked flag
    /// @notice locked
    mapping(address => bool) public locked;
    // vault => guardian count snapshot (set on first vote of a round)
    /// @notice lockGuardianSnapshot
    mapping(address => uint8) public lockGuardianSnapshot;
    // vault => threshold snapshot (set on first vote of a round)
    /// @notice lockThresholdSnapshot
    mapping(address => uint8) public lockThresholdSnapshot;

    /// @notice onlyDAO
    modifier onlyDAO() { _checkDAOGL(); _; }
    /// @notice _checkDAOGL
    function _checkDAOGL() internal view { if (msg.sender != dao) revert SEC_NotDAO(); }

    /// @notice constructor
    /// @param _dao _dao
    /// @param _registry _registry
    /// @param _ledger _ledger
    constructor(address _dao, address _registry, address _ledger) {
        if (_dao == address(0) || _registry == address(0)) revert SEC_Zero();
        dao = _dao;
        registry = GuardianRegistry(_registry);
        ledger = IProofLedger(_ledger);
    }

    /// @notice setModules
    /// @param _registry _registry
    /// @param _ledger _ledger
    function setModules(address _registry, address _ledger) external onlyDAO {
        if (_registry == address(0)) revert SEC_Zero();
        registry = GuardianRegistry(_registry);
        ledger = IProofLedger(_ledger);
        emit ModulesSet(_registry, _ledger);
        _log("guardianlock_modules_set");
    }

    /// Check if guardian was removed during active vote period
    /// @notice wasGuardianRemovedDuringVote
    /// @param vault vault
    /// @param guardian guardian
    /// @return _bool _bool
    function wasGuardianRemovedDuringVote(address vault, address guardian) external view returns (bool) {
        uint256 nonce = lockNonce[vault];
        return voted[vault][nonce][guardian] && !registry.isGuardian(vault, guardian);
    }

    /// A guardian casts a lock vote; when approvals reach threshold, vault is locked.
    /// @notice castLock
    /// @param vault vault
    /// @param reason reason
    function castLock(address vault, string calldata reason) external {
        if (!registry.isGuardian(vault, msg.sender)) revert SEC_NotGuardian();
        if (locked[vault]) revert SEC_AlreadyLocked();
        uint256 nonce = lockNonce[vault];
        if (voted[vault][nonce][msg.sender]) revert SEC_NoEffect();

        voted[vault][nonce][msg.sender] = true;
        uint8 a = approvals[vault] + 1;
        approvals[vault] = a;

        // Snapshot guardian count on first vote to prevent threshold manipulation
        if (a == 1) {
            uint8 n = registry.guardianCount(vault);
            lockGuardianSnapshot[vault] = n;
            uint8 t = registry.threshold(vault);
            if (t == 0) {
                lockThresholdSnapshot[vault] = uint8((uint256(n) + 1) / 2);
            } else {
                lockThresholdSnapshot[vault] = t > n ? n : t;
            }
        }

        uint8 needed = _guardiansNeededFromSnapshot(vault);
        if (a >= needed && needed > 0) {
            locked[vault] = true;
            emit Locked(vault, msg.sender, a, reason);
            approvals[vault] = 0;
            lockGuardianSnapshot[vault] = 0;
            lockThresholdSnapshot[vault] = 0;
            ++lockNonce[vault];
            _logEv(vault, "guardian_lock", a, reason);
        } else {
            // vote recorded, not yet locked
            _logEv(vault, "guardian_vote", a, reason);
        }
    }

    /// DAO can unlock; resets votes.
    /// Guardians cannot unlock unilaterally to prevent compromised guardian from overriding the lock.
    /// @notice unlock
    /// @param vault vault
    /// @param reason reason
    function unlock(address vault, string calldata reason) external onlyDAO {
        if (!locked[vault] && approvals[vault] == 0) revert SEC_NotLocked();

        locked[vault] = false;
        approvals[vault] = 0;
        lockGuardianSnapshot[vault] = 0;
        lockThresholdSnapshot[vault] = 0;
        ++lockNonce[vault]; // Increment nonce to invalidate previous votes
        emit Unlocked(vault, msg.sender, reason);
        _logEv(vault, "guardian_unlock", 0, reason);
    }

    /// DAO can cancel an in-flight vote accumulation (not yet locked).
    /// @notice cancel
    /// @param vault vault
    function cancel(address vault) external onlyDAO {
        approvals[vault] = 0;
        lockGuardianSnapshot[vault] = 0;
        lockThresholdSnapshot[vault] = 0;
        ++lockNonce[vault]; // Increment nonce to invalidate previous votes
        emit Cancelled(vault, msg.sender);
        _logEv(vault, "guardian_cancel", 0, "");
    }

    /// @dev Use snapshot count (set on first vote) to prevent threshold manipulation via guardian removals
    /// @notice _guardiansNeededFromSnapshot
    /// @param vault vault
    /// @return needed needed
    function _guardiansNeededFromSnapshot(address vault) internal view returns (uint8 needed) {
        uint8 n = lockGuardianSnapshot[vault];
        if (n == 0) return 0;
        needed = lockThresholdSnapshot[vault];
        if (needed == 0) needed = uint8((uint256(n) + 1) / 2);
        if (needed > n) needed = n;
    }

    /// @notice _log
    /// @param action action
    function _log(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    /// @notice _logEv
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ───────────────────────────── PanicGuard (auto quarantine + global risk)
/// @notice PanicGuard
/// @title PanicGuard
/// @author Vfide

contract PanicGuard {
    /// @notice LedgerSet
    /// @param ledger ledger
    event LedgerSet(address ledger);
    /// @notice HubSet
    /// @param hub hub
    event HubSet(address hub);
    /// @notice HubChangeQueued
    /// @param currentHub currentHub
    /// @param pendingHub pendingHub
    /// @param effectiveAt effectiveAt
    event HubChangeQueued(address indexed currentHub, address indexed pendingHub, uint64 effectiveAt);
    /// @notice HubChangeCancelled
    /// @param pendingHub pendingHub
    event HubChangeCancelled(address indexed pendingHub);
    /// @notice Quarantined
    /// @param vault vault
    /// @param untilTs untilTs
    /// @param reason reason
    /// @param severity severity
    event Quarantined(address indexed vault, uint64 untilTs, string reason, uint8 severity);
    /// @notice Cleared
    /// @param vault vault
    /// @param reason reason
    event Cleared(address indexed vault, string reason);
    /// @notice GlobalRiskSet
    /// @param on on
    /// @param reason reason
    event GlobalRiskSet(bool on, string reason);
    /// @notice GlobalRiskQueued
    /// @param on on
    /// @param reason reason
    /// @param effectiveAt effectiveAt
    event GlobalRiskQueued(bool on, string reason, uint64 effectiveAt);
    /// @notice GlobalRiskCancelled
    event GlobalRiskCancelled();
    /// @notice PolicySet
    /// @param minDuration minDuration
    /// @param maxDuration maxDuration
    event PolicySet(uint64 minDuration, uint64 maxDuration);

    /// @notice dao
    address public dao;
    /// @notice ledger
    IProofLedger public ledger;
    /// @notice vaultHub
    IVaultHub public vaultHub;
    /// @notice pendingHub
    address public pendingHub;
    /// @notice pendingHubAt
    uint64 public pendingHubAt;
    /// @notice HUB_CHANGE_DELAY
    uint64 public constant HUB_CHANGE_DELAY = 24 hours;
    // #429 FIX: Timelock pending global-risk request
    /// @notice pendingGlobalRiskOn
    bool public pendingGlobalRiskOn;
    /// @notice pendingGlobalRiskAt
    uint64 public pendingGlobalRiskAt;
    /// @notice GLOBAL_RISK_DELAY
    uint64 public constant GLOBAL_RISK_DELAY = 24 hours;
    // per-vault quarantine until timestamp (0 = not quarantined)
    /// @notice quarantineUntil
    mapping(address => uint64) public quarantineUntil;
    /// @notice selfPanicUntil
    mapping(address => uint64) public selfPanicUntil;
    
    // C-10: Self-panic rate limiting
    /// @notice lastSelfPanic
    mapping(address => uint256) public lastSelfPanic;
    /// @notice SELF_PANIC_COOLDOWN
    uint256 public constant SELF_PANIC_COOLDOWN = 1 days;
    /// @notice MIN_VAULT_AGE_FOR_PANIC
    uint256 public constant MIN_VAULT_AGE_FOR_PANIC = 1 hours;
    
    // Track when vaults were created (set by VaultHub integration)
    /// @notice vaultCreationTime
    mapping(address => uint256) public vaultCreationTime;

    // global risk (soft stop) — SecurityHub will treat as lock unless DAO says otherwise
    /// @notice globalRisk
    bool public globalRisk;

    // policy: default min/max quarantine duration (can be overridden by DAO later)
    /// @notice minDuration
    uint64 public minDuration = 1 hours;
    /// @notice maxDuration
    uint64 public maxDuration = 30 days;
    /// @notice ABSOLUTE_MAX_QUARANTINE
    uint64 public constant ABSOLUTE_MAX_QUARANTINE = 90 days;

    /// @notice onlyDAO
    modifier onlyDAO() { _checkDAOPG(); _; }
    /// @notice _checkDAOPG
    function _checkDAOPG() internal view { if (msg.sender != dao) revert SEC_NotDAO(); }

    /// @notice constructor
    /// @param _dao _dao
    /// @param _ledger _ledger
    /// @param _hub _hub
    constructor(address _dao, address _ledger, address _hub) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
        ledger = IProofLedger(_ledger);
        if (_hub != address(0)) vaultHub = IVaultHub(_hub);
    }

    /// @notice setLedger
    /// @param _ledger _ledger
    function setLedger(address _ledger) external onlyDAO {
        ledger = IProofLedger(_ledger);
        emit LedgerSet(_ledger);
        _log("panicguard_ledger_set");
    }

    /// @notice setHub
    /// @param _hub _hub
    function setHub(address _hub) external onlyDAO {
        pendingHub = _hub;
        pendingHubAt = uint64(block.timestamp) + HUB_CHANGE_DELAY;
        emit HubChangeQueued(address(vaultHub), _hub, pendingHubAt);
        _log("panicguard_hub_queued");
    }

    /// @notice applyHub
    function applyHub() external onlyDAO {
        if (pendingHubAt == 0 || block.timestamp < pendingHubAt) revert SEC_NotLocked();
        address nextHub = pendingHub;
        vaultHub = IVaultHub(nextHub);
        delete pendingHub;
        delete pendingHubAt;
        emit HubSet(nextHub);
        _log("panicguard_hub_set");
    }

    /// @notice cancelHubChange
    function cancelHubChange() external onlyDAO {
        if (pendingHubAt == 0) revert SEC_NotLocked();
        address oldPending = pendingHub;
        delete pendingHub;
        delete pendingHubAt;
        emit HubChangeCancelled(oldPending);
        _log("panicguard_hub_cancelled");
    }

    /// @dev Register vault creation time (called by VaultHub)
    /// @notice registerVault
    /// @param vault vault
    function registerVault(address vault) external {
        require(msg.sender == address(vaultHub), "only VaultHub");
        if (vaultCreationTime[vault] < 1) {
            vaultCreationTime[vault] = block.timestamp;
        }
    }

    /// @notice setPolicy
    /// @param _minDuration _minDuration
    /// @param _maxDuration _maxDuration
    function setPolicy(uint64 _minDuration, uint64 _maxDuration) external onlyDAO {
        if (_minDuration == 0 || _maxDuration < _minDuration) revert SEC_ExpiryTooShort();
        require(_maxDuration <= ABSOLUTE_MAX_QUARANTINE, "SEC: max duration exceeded");
        minDuration = _minDuration;
        maxDuration = _maxDuration;
        emit PolicySet(_minDuration, _maxDuration);
        _log("panicguard_policy_set");
    }

    /// Auto quarantine (e.g., called by Seer adapter or DAO).
    /// `severity` can hint duration selection (DAO heuristics off-chain).
    /// @notice reportRisk
    /// @param vault vault
    /// @param duration duration
    /// @param severity severity
    /// @param reason reason
    function reportRisk(address vault, uint64 duration, uint8 severity, string calldata reason) external onlyDAO {
        _quarantine(vault, duration, severity, reason);
    }

    /// User Self-Panic: Instantly lock own vault.
    /// Useful if user suspects key compromise or phishing.
    /// @notice selfPanic
    /// @param duration duration
    function selfPanic(uint64 duration) external {
        if (address(vaultHub) == address(0)) revert SEC_Zero();
        address vault = vaultHub.vaultOf(msg.sender);
        require(vault != address(0), "no vault");
        require(vaultCreationTime[vault] > 0, "SEC: vault not registered");
        
        // C-10: Rate limiting - max 1 self-panic per 24 hours
        require(
            block.timestamp >= lastSelfPanic[msg.sender] + SELF_PANIC_COOLDOWN,
            "SEC: panic cooldown active"
        );
        
        // C-10: Require minimum vault age (prevents spam from new vaults)
        uint256 creationTime = vaultCreationTime[vault];
        if (creationTime > 0) {
            require(
                block.timestamp >= creationTime + MIN_VAULT_AGE_FOR_PANIC,
                "SEC: vault too new for self-panic"
            );
        }
        
        lastSelfPanic[msg.sender] = block.timestamp;
        
        // Track self-panic window so cancelSelfPanic cannot clear DAO-imposed quarantines.
        uint64 appliedDuration = duration;
        if (appliedDuration < minDuration) appliedDuration = minDuration;
        if (appliedDuration > maxDuration) appliedDuration = maxDuration;
        uint64 selfUntil = uint64(block.timestamp) + appliedDuration;
        selfPanicUntil[vault] = selfUntil;

        // User can set any duration within policy limits
        _quarantine(vault, duration, 100, "self_panic");
    }

    /// @notice Allow user to cancel their own self-panic
    /// @dev Only cancels quarantines the user initiated (via selfPanic), requires 1h minimum hold
    function cancelSelfPanic() external {
        if (address(vaultHub) == address(0)) revert SEC_Zero();
        address vault = vaultHub.vaultOf(msg.sender);
        require(vault != address(0), "no vault");
        require(quarantineUntil[vault] > block.timestamp, "not quarantined");
        // Must wait at least 1 hour (prevents abuse / accidental toggle)
        require(block.timestamp >= lastSelfPanic[msg.sender] + 1 hours, "SEC: cancel too soon");
        require(selfPanicUntil[vault] != 0, "SEC: no self panic");
        require(quarantineUntil[vault] <= selfPanicUntil[vault], "SEC: overridden quarantine");
        quarantineUntil[vault] = 0;
        delete selfPanicUntil[vault];
        emit Cleared(vault, "self_panic_cancelled");
        _logEv(vault, "self_panic_cancelled", 0, "user_cancel");
    }

    /// @notice _quarantine
    /// @param vault vault
    /// @param duration duration
    /// @param severity severity
    /// @param reason reason
    function _quarantine(address vault, uint64 duration, uint8 severity, string memory reason) internal {
        if (vault == address(0)) revert SEC_Zero();
        if (duration < minDuration) duration = minDuration;
        if (duration > maxDuration) duration = maxDuration;

        uint64 untilTs = uint64(block.timestamp) + duration;
        // Extend only (cannot shorten existing quarantine)
        if (untilTs > quarantineUntil[vault]) {
            quarantineUntil[vault] = untilTs;
            emit Quarantined(vault, untilTs, reason, severity);
            _logEv(vault, "panic_quarantine", untilTs, reason);
        }
    }

    /// @notice clear
    /// @param vault vault
    /// @param reason reason
    function clear(address vault, string calldata reason) external onlyDAO {
        quarantineUntil[vault] = 0;
        delete selfPanicUntil[vault];
        emit Cleared(vault, reason);
        _logEv(vault, "panic_cleared", 0, reason);
    }

    /// @notice setGlobalRisk
    /// @param on on
    /// @param reason reason
    function setGlobalRisk(bool on, string calldata reason) external onlyDAO {
        // #429 FIX: Propose global risk change; requires 24h delay before taking effect.
        // Turning OFF (clearing risk) is allowed immediately for safety.
        if (!on) {
            globalRisk = false;
            delete pendingGlobalRiskAt;
            emit GlobalRiskSet(false, reason);
            _log("panic_global_off");
            _logEv(address(this), "panic_global", 0, reason);
            return;
        }
        pendingGlobalRiskOn = true;
        pendingGlobalRiskAt = uint64(block.timestamp) + GLOBAL_RISK_DELAY;
        emit GlobalRiskQueued(true, reason, pendingGlobalRiskAt);
        _log("panic_global_queued");
    }

    /// @notice applyGlobalRisk
    function applyGlobalRisk() external onlyDAO {
        require(pendingGlobalRiskAt != 0 && block.timestamp >= pendingGlobalRiskAt, "SEC: global risk timelock");
        globalRisk = true;
        delete pendingGlobalRiskAt;
        emit GlobalRiskSet(true, "applied");
        _log("panic_global_on");
        _logEv(address(this), "panic_global", 1, "applied");
    }

    /// @notice cancelGlobalRisk
    function cancelGlobalRisk() external onlyDAO {
        require(pendingGlobalRiskAt != 0, "SEC: no pending global risk");
        delete pendingGlobalRiskAt;
        delete pendingGlobalRiskOn;
        emit GlobalRiskCancelled();
        _log("panic_global_cancelled");
    }

    /// @notice isQuarantined
    /// @param vault vault
    /// @return _bool _bool
    function isQuarantined(address vault) public view returns (bool) {
        uint64 untilTs = quarantineUntil[vault];
        return untilTs != 0 && untilTs > block.timestamp;
    }

    /// @notice isRestricted
    /// @param vault vault
    /// @return _bool _bool
    function isRestricted(address vault) external view returns (bool) {
        return globalRisk || isQuarantined(vault);
    }

    /// @notice _log
    /// @param action action
    function _log(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    /// @notice _logEv
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ───────────────────────────── EmergencyBreaker (global hard stop)
/// @notice EmergencyBreaker
/// @title EmergencyBreaker
/// @author Vfide

contract EmergencyBreaker {
    /// @notice Toggled
    /// @param on on
    /// @param reason reason
    event Toggled(bool on, string reason);
    /// @notice ToggleProposed
    /// @param on on
    /// @param reason reason
    /// @param proposer proposer
    event ToggleProposed(bool on, string reason, address indexed proposer);
    /// @notice ToggleCancelled
    /// @param on on
    /// @param reason reason
    /// @param cancelledBy cancelledBy
    event ToggleCancelled(bool on, string reason, address indexed cancelledBy);
    /// @notice DAOSet
    /// @param dao dao
    event DAOSet(address dao);
    /// @notice DAOChangeQueued
    /// @param currentDAO currentDAO
    /// @param pendingDAO pendingDAO
    /// @param effectiveAt effectiveAt
    event DAOChangeQueued(address indexed currentDAO, address indexed pendingDAO, uint64 effectiveAt);
    /// @notice DAOChangeCancelled
    /// @param pendingDAO pendingDAO
    event DAOChangeCancelled(address indexed pendingDAO);
    /// @notice CoSignerSet
    /// @param coSigner coSigner
    event CoSignerSet(address coSigner);
    /// @notice LedgerSet
    /// @param ledger ledger
    event LedgerSet(address ledger);
    /// @notice CooldownSet
    /// @param cooldown cooldown
    event CooldownSet(uint64 cooldown);

    /// @notice dao
    address public dao;
    /// @notice pendingDAO
    address public pendingDAO;
    /// @notice pendingDAOAt
    uint64 public pendingDAOAt;
    /// @notice DAO_CHANGE_DELAY
    uint64 public constant DAO_CHANGE_DELAY = 48 hours;
    /// @notice coSigner
    address public coSigner;
    /// @notice ledger
    IProofLedger public ledger;

    /// @notice halted
    bool public halted;
    
    /// @notice lastToggleTime
    uint64 public lastToggleTime;
    /// @notice toggleCooldown
    uint64 public toggleCooldown = 1 hours; // Default 1 hour cooldown between toggles

    struct PendingToggle {
        bool exists;
        bool on;
        string reason;
        address proposer;
    }
    /// @notice pendingToggle
    PendingToggle public pendingToggle;

    /// @notice onlyDAO
    modifier onlyDAO() { _checkDAOEB(); _; }
    /// @notice _checkDAOEB
    function _checkDAOEB() internal view { if (msg.sender != dao) revert SEC_NotDAO(); }

    /// @notice constructor
    /// @param _dao _dao
    /// @param _ledger _ledger
    constructor(address _dao, address _ledger) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
        ledger = IProofLedger(_ledger);
    }

    /// @notice setDAO
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SEC_Zero();
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit DAOChangeQueued(dao, _dao, pendingDAOAt);
        _log("breaker_dao_queued");
    }

    /// @notice applyDAO
    function applyDAO() external onlyDAO {
        if (pendingDAO == address(0) || pendingDAOAt == 0 || block.timestamp < pendingDAOAt) revert SEC_NotLocked();
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOSet(dao);
        _log("breaker_dao_set");
    }

    /// @notice cancelDAOChange
    function cancelDAOChange() external onlyDAO {
        if (pendingDAO == address(0) || pendingDAOAt == 0) revert SEC_NotLocked();
        address oldPending = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOChangeCancelled(oldPending);
        _log("breaker_dao_cancelled");
    }

    /// @notice setCoSigner
    /// @param _coSigner _coSigner
    function setCoSigner(address _coSigner) external onlyDAO {
        if (_coSigner == address(0)) revert SEC_Zero();
        if (_coSigner == dao) revert SEC_NoEffect();
        coSigner = _coSigner;
        emit CoSignerSet(_coSigner);
        _log("breaker_cosigner_set");
    }

    /// @notice setLedger
    /// @param _ledger _ledger
    function setLedger(address _ledger) external onlyDAO {
        ledger = IProofLedger(_ledger);
        emit LedgerSet(_ledger);
        _log("breaker_ledger_set");
    }
    
    /// @notice Set toggle cooldown (DAO-only)
    /// @dev SEC-05 FIX: Enforce minimum cooldown to prevent rapid toggle abuse
    /// @param _cooldown _cooldown
    function setToggleCooldown(uint64 _cooldown) external onlyDAO {
        require(_cooldown >= 10 minutes, "SEC: minimum cooldown 10 minutes");
        toggleCooldown = _cooldown;
        emit CooldownSet(_cooldown);
        _log("breaker_cooldown_set");
    }

    /// @notice toggle
    /// @param on on
    /// @param reason reason
    function toggle(bool on, string calldata reason) external {
        if (msg.sender != dao && msg.sender != coSigner) revert SEC_NotDAO();

        // HALT-01: If DAO is a governance contract (e.g., EmergencyControl),
        // its own threshold voting acts as the co-signature layer.
        if (msg.sender == dao && dao.code.length > 0) {
            if (toggleCooldown > 0 && lastToggleTime > 0 && !on) {
                require(block.timestamp >= lastToggleTime + toggleCooldown, "SEC: toggle cooldown active");
            }
            halted = on;
            lastToggleTime = uint64(block.timestamp);
            emit Toggled(on, reason);
            _log(string(abi.encodePacked("breaker_", on ? "on" : "off")));
            _logEv(address(this), "breaker_toggle", on ? 1 : 0, reason);
            return;
        }

        if (coSigner == address(0)) revert SEC_Zero();

        bytes32 requested = keccak256(abi.encode(on, reason));
        if (!pendingToggle.exists) {
            pendingToggle = PendingToggle({
                exists: true,
                on: on,
                reason: reason,
                proposer: msg.sender
            });
            emit ToggleProposed(on, reason, msg.sender);
            _logEv(address(this), "breaker_toggle_proposed", on ? 1 : 0, reason);
            return;
        }

        bytes32 pendingHash = keccak256(abi.encode(pendingToggle.on, pendingToggle.reason));
        if (requested != pendingHash) {
            emit ToggleCancelled(pendingToggle.on, pendingToggle.reason, msg.sender);
            delete pendingToggle;
            revert SEC_NoEffect();
        }
        require(msg.sender != pendingToggle.proposer, "SEC: co-sig required");

        if (toggleCooldown > 0 && lastToggleTime > 0 && !on) {
            // Only enforce cooldown when deactivating (turning off)
            // Activation (turning on) is always allowed for emergencies
            require(block.timestamp >= lastToggleTime + toggleCooldown, "SEC: toggle cooldown active");
        }

        halted = on;
        lastToggleTime = uint64(block.timestamp);
        delete pendingToggle;
        emit Toggled(on, reason);
        _log(string(abi.encodePacked("breaker_", on ? "on" : "off")));
        _logEv(address(this), "breaker_toggle", on ? 1 : 0, reason);
    }

    /// @notice _log
    /// @param action action
    function _log(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    /// @notice _logEv
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

// ── SecurityHub contract REMOVED — non-custodial ──
// No contract aggregates lock state. Vault protection is through
// the user's own guardians (pause, spend limits, withdrawal queue).
