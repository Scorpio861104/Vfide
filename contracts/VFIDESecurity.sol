// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

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

error SEC_NotDAO();
error SEC_Zero();
error SEC_NotGuardian();
error SEC_BadThreshold();
error SEC_AlreadyMember();
error SEC_NotMember();
error SEC_AlreadyLocked();
error SEC_NotLocked();
error SEC_NoEffect();
error SEC_ExpiryTooShort();

/// ───────────────────────────── GuardianRegistry

contract GuardianRegistry {
    event DAOSet(address dao);
    event GuardianAdded(address indexed vault, address indexed guardian);
    event GuardianRemoved(address indexed vault, address indexed guardian);
    event ThresholdSet(address indexed vault, uint8 mOfN);

    address public dao;

    // vault => guardian => true/false
    mapping(address => mapping(address => bool)) public isGuardian;
    // vault => guardian count
    mapping(address => uint8) public guardianCount;
    // vault => threshold (M of N). If 0 and guardians exist, defaults to ceil(N/2).
    mapping(address => uint8) public threshold;

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert SEC_NotDAO();
    }

    constructor(address _dao) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao; emit DAOSet(_dao);
    }

    function addGuardian(address vault, address guardian) external {
        if (msg.sender != dao && msg.sender != vault) revert SEC_NotDAO();
        if (vault == address(0) || guardian == address(0)) revert SEC_Zero();
        if (isGuardian[vault][guardian]) revert SEC_AlreadyMember();
        isGuardian[vault][guardian] = true;
        guardianCount[vault] += 1;
        emit GuardianAdded(vault, guardian);
        // If threshold unset, keep 0 to auto-calc (ceil(N/2)) at read time
    }

    function removeGuardian(address vault, address guardian) external {
        if (msg.sender != dao && msg.sender != vault) revert SEC_NotDAO();
        if (!isGuardian[vault][guardian]) revert SEC_NotMember();
        isGuardian[vault][guardian] = false;
        guardianCount[vault] -= 1;
        emit GuardianRemoved(vault, guardian);
        // If threshold > count, DAO should reset threshold; we tolerate and clamp on read.
    }

    /// @dev Check if a guardian can be safely removed
    /// @param vault The vault to check
    /// @param guardian The guardian to check
    /// @return canRemove True if removing this guardian won't break threshold requirements
    function canRemoveGuardian(address vault, address guardian) external view returns (bool canRemove) {
        // Can always remove if not a guardian
        if (!isGuardian[vault][guardian]) return true;
        uint8 count = guardianCount[vault];
        uint8 t = threshold[vault];
        // If removing would drop below threshold, disallow
        if (t > 0 && count <= t) return false;
        return true;
    }

    function setThreshold(address vault, uint8 mOfN) external {
        if (msg.sender != dao && msg.sender != vault) revert SEC_NotDAO();
        uint8 n = guardianCount[vault];
        if (n == 0 && mOfN != 0) revert SEC_BadThreshold();
        if (mOfN > n) revert SEC_BadThreshold();
        threshold[vault] = mOfN;
        emit ThresholdSet(vault, mOfN);
    }

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

    function isGuardianOf(address vault, address guardian) external view returns (bool) {
        return isGuardian[vault][guardian];
    }
}

/// ───────────────────────────── GuardianLock (manual M-of-N lock)

contract GuardianLock {
    event ModulesSet(address registry, address ledger);
    event Locked(address indexed vault, address indexed byGuardian, uint8 approvals, string reason);
    event Unlocked(address indexed vault, address indexed by, string reason);
    event Cancelled(address indexed vault, address indexed by);
    event VotesInvalidated(address indexed vault, uint256 oldNonce, uint256 newNonce, string reason);
    event GuardianRemovedDuringVote(address indexed vault, address indexed guardian, uint8 remainingApprovals);

    address public dao;
    GuardianRegistry public registry;
    IProofLedger public ledger;

    // vault => approvals count
    mapping(address => uint8) public approvals;
    // vault => nonce => guardian => voted
    mapping(address => mapping(uint256 => mapping(address => bool))) public voted;
    // vault => lock nonce
    mapping(address => uint256) public lockNonce;
    // vault => locked flag
    mapping(address => bool) public locked;
    // vault => guardian count snapshot (set on first vote of a round)
    mapping(address => uint8) public lockGuardianSnapshot;
    // vault => threshold snapshot (set on first vote of a round)
    mapping(address => uint8) public lockThresholdSnapshot;

    modifier onlyDAO() { _checkDAOGL(); _; }
    function _checkDAOGL() internal view { if (msg.sender != dao) revert SEC_NotDAO(); }

    constructor(address _dao, address _registry, address _ledger) {
        if (_dao == address(0) || _registry == address(0)) revert SEC_Zero();
        dao = _dao;
        registry = GuardianRegistry(_registry);
        ledger = IProofLedger(_ledger);
    }

    function setModules(address _registry, address _ledger) external onlyDAO {
        if (_registry == address(0)) revert SEC_Zero();
        registry = GuardianRegistry(_registry);
        ledger = IProofLedger(_ledger);
        emit ModulesSet(_registry, _ledger);
        _log("guardianlock_modules_set");
    }

    /// Check if guardian was removed during active vote period
    function wasGuardianRemovedDuringVote(address vault, address guardian) external view returns (bool) {
        uint256 nonce = lockNonce[vault];
        return voted[vault][nonce][guardian] && !registry.isGuardian(vault, guardian);
    }

    /// A guardian casts a lock vote; when approvals reach threshold, vault is locked.
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
            lockNonce[vault]++;
            _logEv(vault, "guardian_lock", a, reason);
        } else {
            // vote recorded, not yet locked
            _logEv(vault, "guardian_vote", a, reason);
        }
    }

    /// DAO can unlock; resets votes.
    /// Guardians cannot unlock unilaterally to prevent compromised guardian from overriding the lock.
    function unlock(address vault, string calldata reason) external onlyDAO {
        if (!locked[vault] && approvals[vault] == 0) revert SEC_NotLocked();

        locked[vault] = false;
        approvals[vault] = 0;
        lockGuardianSnapshot[vault] = 0;
        lockThresholdSnapshot[vault] = 0;
        lockNonce[vault]++; // Increment nonce to invalidate previous votes
        emit Unlocked(vault, msg.sender, reason);
        _logEv(vault, "guardian_unlock", 0, reason);
    }

    /// DAO can cancel an in-flight vote accumulation (not yet locked).
    function cancel(address vault) external onlyDAO {
        approvals[vault] = 0;
        lockGuardianSnapshot[vault] = 0;
        lockThresholdSnapshot[vault] = 0;
        lockNonce[vault]++; // Increment nonce to invalidate previous votes
        emit Cancelled(vault, msg.sender);
        _logEv(vault, "guardian_cancel", 0, "");
    }

    /// @dev Use snapshot count (set on first vote) to prevent threshold manipulation via guardian removals
    function _guardiansNeededFromSnapshot(address vault) internal view returns (uint8 needed) {
        uint8 n = lockGuardianSnapshot[vault];
        if (n == 0) return 0;
        needed = lockThresholdSnapshot[vault];
        if (needed == 0) needed = uint8((uint256(n) + 1) / 2);
        if (needed > n) needed = n;
    }

    function _log(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ───────────────────────────── PanicGuard (auto quarantine + global risk)

contract PanicGuard {
    event LedgerSet(address ledger);
    event HubSet(address hub);
    event Quarantined(address indexed vault, uint64 untilTs, string reason, uint8 severity);
    event Cleared(address indexed vault, string reason);
    event GlobalRiskSet(bool on, string reason);
    event PolicySet(uint64 minDuration, uint64 maxDuration);

    address public dao;
    IProofLedger public ledger;
    IVaultHub public vaultHub;
    address public securityHub;
    // per-vault quarantine until timestamp (0 = not quarantined)
    mapping(address => uint64) public quarantineUntil;
    mapping(address => uint64) public selfPanicUntil;
    
    // C-10: Self-panic rate limiting
    mapping(address => uint256) public lastSelfPanic;
    uint256 public constant SELF_PANIC_COOLDOWN = 1 days;
    uint256 public constant MIN_VAULT_AGE_FOR_PANIC = 1 hours;
    
    // Track when vaults were created (set by VaultHub integration)
    mapping(address => uint256) public vaultCreationTime;

    // global risk (soft stop) — SecurityHub will treat as lock unless DAO says otherwise
    bool public globalRisk;

    // policy: default min/max quarantine duration (can be overridden by DAO later)
    uint64 public minDuration = 1 hours;
    uint64 public maxDuration = 30 days;

    modifier onlyDAO() { _checkDAOPG(); _; }
    function _checkDAOPG() internal view { if (msg.sender != dao) revert SEC_NotDAO(); }

    constructor(address _dao, address _ledger, address _hub) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
        ledger = IProofLedger(_ledger);
        if (_hub != address(0)) vaultHub = IVaultHub(_hub);
    }

    function setLedger(address _ledger) external onlyDAO {
        ledger = IProofLedger(_ledger);
        emit LedgerSet(_ledger);
        _log("panicguard_ledger_set");
    }

    function setHub(address _hub) external onlyDAO {
        vaultHub = IVaultHub(_hub);
        emit HubSet(_hub);
        _log("panicguard_hub_set");
    }

    function setSecurityHub(address _secHub) external onlyDAO {
        securityHub = _secHub;
    }

    /// @dev Register vault creation time (called by VaultHub via SecurityHub)
    function registerVault(address vault) external {
        require(msg.sender == address(vaultHub) || msg.sender == securityHub, "only VaultHub/SecurityHub");
        if (vaultCreationTime[vault] < 1) {
            vaultCreationTime[vault] = block.timestamp;
        }
    }

    function setPolicy(uint64 _minDuration, uint64 _maxDuration) external onlyDAO {
        if (_minDuration == 0 || _maxDuration < _minDuration) revert SEC_ExpiryTooShort();
        minDuration = _minDuration;
        maxDuration = _maxDuration;
        emit PolicySet(_minDuration, _maxDuration);
        _log("panicguard_policy_set");
    }

    /// Auto quarantine (e.g., called by Seer adapter or DAO).
    /// `severity` can hint duration selection (DAO heuristics off-chain).
    function reportRisk(address vault, uint64 duration, uint8 severity, string calldata reason) external onlyDAO {
        _quarantine(vault, duration, severity, reason);
    }

    /// User Self-Panic: Instantly lock own vault.
    /// Useful if user suspects key compromise or phishing.
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
        require(quarantineUntil[vault] == selfPanicUntil[vault], "SEC: overridden quarantine");
        quarantineUntil[vault] = 0;
        delete selfPanicUntil[vault];
        emit Cleared(vault, "self_panic_cancelled");
        _logEv(vault, "self_panic_cancelled", 0, "user_cancel");
    }

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

    function clear(address vault, string calldata reason) external onlyDAO {
        quarantineUntil[vault] = 0;
        delete selfPanicUntil[vault];
        emit Cleared(vault, reason);
        _logEv(vault, "panic_cleared", 0, reason);
    }

    function setGlobalRisk(bool on, string calldata reason) external onlyDAO {
        globalRisk = on;
        emit GlobalRiskSet(on, reason);
        _log(string(abi.encodePacked("panic_global_", on ? "on" : "off")));
        _logEv(address(this), "panic_global", on ? 1 : 0, reason);
    }

    function isQuarantined(address vault) public view returns (bool) {
        uint64 untilTs = quarantineUntil[vault];
        return untilTs != 0 && untilTs > block.timestamp;
    }

    function isRestricted(address vault) external view returns (bool) {
        return globalRisk || isQuarantined(vault);
    }

    function _log(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ───────────────────────────── EmergencyBreaker (global hard stop)

contract EmergencyBreaker {
    event Toggled(bool on, string reason);
    event DAOSet(address dao);
    event LedgerSet(address ledger);
    event CooldownSet(uint64 cooldown);

    address public dao;
    IProofLedger public ledger;

    bool public halted;
    
    uint64 public lastToggleTime;
    uint64 public toggleCooldown = 1 hours; // Default 1 hour cooldown between toggles

    modifier onlyDAO() { _checkDAOEB(); _; }
    function _checkDAOEB() internal view { if (msg.sender != dao) revert SEC_NotDAO(); }

    constructor(address _dao, address _ledger) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
        ledger = IProofLedger(_ledger);
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao; emit DAOSet(_dao);
        _log("breaker_dao_set");
    }

    function setLedger(address _ledger) external onlyDAO {
        ledger = IProofLedger(_ledger);
        emit LedgerSet(_ledger);
        _log("breaker_ledger_set");
    }
    
    /// @notice Set toggle cooldown (DAO-only)
    /// @dev SEC-05 FIX: Enforce minimum cooldown to prevent rapid toggle abuse
    function setToggleCooldown(uint64 _cooldown) external onlyDAO {
        require(_cooldown >= 10 minutes, "SEC: minimum cooldown 10 minutes");
        toggleCooldown = _cooldown;
        emit CooldownSet(_cooldown);
        _log("breaker_cooldown_set");
    }

    function toggle(bool on, string calldata reason) external onlyDAO {
        if (toggleCooldown > 0 && lastToggleTime > 0 && !on) {
            // Only enforce cooldown when deactivating (turning off)
            // Activation (turning on) is always allowed for emergencies
            require(block.timestamp >= lastToggleTime + toggleCooldown, "SEC: toggle cooldown active");
        }
        
        halted = on;
        lastToggleTime = uint64(block.timestamp);
        emit Toggled(on, reason);
        _log(string(abi.encodePacked("breaker_", on ? "on" : "off")));
        _logEv(address(this), "breaker_toggle", on ? 1 : 0, reason);
    }

    function _log(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ───────────────────────────── SecurityHub (single truth for locks)

contract SecurityHub {
    event ModulesSet(address guardianLock, address panicGuard, address breaker, address ledger);
    event DAOSet(address dao);

    address public dao;
    GuardianLock     public guardianLock;
    PanicGuard       public panicGuard;
    EmergencyBreaker public breaker;
    IProofLedger public ledger;

    modifier onlyDAO() { _checkDAOSH(); _; }
    function _checkDAOSH() internal view { if (msg.sender != dao) revert SEC_NotDAO(); }

    constructor(address _dao, address _guardianLock, address _panicGuard, address _breaker, address _ledger) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
        guardianLock = GuardianLock(_guardianLock);
        panicGuard   = PanicGuard(_panicGuard);
        breaker      = EmergencyBreaker(_breaker);
        ledger       = IProofLedger(_ledger);
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao; emit DAOSet(_dao);
        _log("sechub_dao_set");
    }

    function setModules(address _guardianLock, address _panicGuard, address _breaker, address _ledger) external onlyDAO {
        require(
            _guardianLock != address(0) || _panicGuard != address(0) || _breaker != address(0),
            "SEC: all modules zero"
        );
        guardianLock = GuardianLock(_guardianLock);
        panicGuard   = PanicGuard(_panicGuard);
        breaker      = EmergencyBreaker(_breaker);
        ledger       = IProofLedger(_ledger);
        emit ModulesSet(_guardianLock, _panicGuard, _breaker, _ledger);
        _log("sechub_modules_set");
    }

    /// The single call everyone else should use.
    /// Order of precedence:
    ///  1) Emergency Breaker (hard stop)
    ///  2) GuardianLock manual lock (threshold M-of-N, indefinite until unlock)
    ///  3) PanicGuard quarantine (time-based)
    ///  4) Global risk (soft stop) also treated as locked for safety
    function isLocked(address vault) external view returns (bool) {
        if (address(breaker) != address(0) && breaker.halted()) return true;
        if (address(guardianLock) != address(0) && guardianLock.locked(vault)) return true;
        if (address(panicGuard) != address(0) && panicGuard.isRestricted(vault)) return true;
        return false;
    }

    function _log(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }

    function registerVault(address vault) external {
        if (address(panicGuard) != address(0)) {
            panicGuard.registerVault(vault);
        }
    }
}