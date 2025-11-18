// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

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

interface IProofLedger_SEC {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

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

    modifier onlyDAO() { if (msg.sender != dao) revert SEC_NotDAO(); _; }

    constructor(address _dao) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao; emit DAOSet(_dao);
    }

    function addGuardian(address vault, address guardian) external onlyDAO {
        if (vault == address(0) || guardian == address(0)) revert SEC_Zero();
        if (isGuardian[vault][guardian]) revert SEC_AlreadyMember();
        isGuardian[vault][guardian] = true;
        guardianCount[vault] += 1;
        emit GuardianAdded(vault, guardian);
        // If threshold unset, keep 0 to auto-calc (ceil(N/2)) at read time
    }

    function removeGuardian(address vault, address guardian) external onlyDAO {
        if (!isGuardian[vault][guardian]) revert SEC_NotMember();
        isGuardian[vault][guardian] = false;
        guardianCount[vault] -= 1;
        emit GuardianRemoved(vault, guardian);
        // If threshold > count after removal, auto-adjust to prevent impossible thresholds
        uint8 n = guardianCount[vault];
        uint8 t = threshold[vault];
        if (t > n && n > 0) {
            threshold[vault] = uint8((uint256(n) + 1) / 2);  // reset to ceil(n/2)
            emit ThresholdSet(vault, threshold[vault]);
        }
    }

    function setThreshold(address vault, uint8 mOfN) external onlyDAO {
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

    address public dao;
    GuardianRegistry public registry;
    IProofLedger_SEC public ledger;

    // vault => approvals count
    mapping(address => uint8) public approvals;
    // vault => seen guardian => vote nonce when voted
    mapping(address => mapping(address => uint256)) public voted;
    // vault => current vote cycle nonce
    mapping(address => uint256) public voteNonce;
    // vault => locked flag
    mapping(address => bool) public locked;

    modifier onlyDAO() { if (msg.sender != dao) revert SEC_NotDAO(); _; }

    constructor(address _dao, address _registry, address _ledger) {
        if (_dao == address(0) || _registry == address(0)) revert SEC_Zero();
        dao = _dao;
        registry = GuardianRegistry(_registry);
        ledger = IProofLedger_SEC(_ledger);
        // Note: voteNonce starts at 0 for all vaults, first vote sets nonce to 1
    }

    function setModules(address _registry, address _ledger) external onlyDAO {
        if (_registry == address(0)) revert SEC_Zero();
        registry = GuardianRegistry(_registry);
        ledger = IProofLedger_SEC(_ledger);
        emit ModulesSet(_registry, _ledger);
        _log("guardianlock_modules_set");
    }

    /// A guardian casts a lock vote; when approvals reach threshold, vault is locked.
    function castLock(address vault, string calldata reason) external {
        if (!registry.isGuardian(vault, msg.sender)) revert SEC_NotGuardian();
        if (locked[vault]) revert SEC_AlreadyLocked();
        
        uint256 currentNonce = voteNonce[vault];
        // Check if guardian already voted in current nonce cycle
        if (voted[vault][msg.sender] == currentNonce + 1) revert SEC_NoEffect();

        voted[vault][msg.sender] = currentNonce + 1;  // Store nonce+1 (so 0 = never voted)
        uint8 a = approvals[vault] + 1;
        approvals[vault] = a;

        uint8 needed = registry.guardiansNeeded(vault);
        if (a >= needed && needed > 0) {
            locked[vault] = true;
            emit Locked(vault, msg.sender, a, reason);
            _logEv(vault, "guardian_lock", a, reason);
        } else {
            // vote recorded, not yet locked
            _logEv(vault, "guardian_vote", a, reason);
        }
    }

    /// DAO or any guardian can unlock; resets votes and increments nonce.
    function unlock(address vault, string calldata reason) external {
        bool isDAO = msg.sender == dao;
        if (!isDAO && !registry.isGuardian(vault, msg.sender)) revert SEC_NotGuardian();
        if (!locked[vault] && approvals[vault] == 0) revert SEC_NotLocked();

        locked[vault] = false;
        approvals[vault] = 0;
        voteNonce[vault]++;  // Increment nonce to invalidate old votes
        
        emit Unlocked(vault, msg.sender, reason);
        _logEv(vault, isDAO ? "dao_override_unlock" : "guardian_unlock", 0, reason);
    }

    /// DAO can cancel an in-flight vote accumulation (not yet locked).
    function cancel(address vault) external onlyDAO {
        approvals[vault] = 0;
        voteNonce[vault]++;  // Increment nonce to invalidate all votes
        emit Cancelled(vault, msg.sender);
        _logEv(vault, "guardian_cancel", 0, "");
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
    event Quarantined(address indexed vault, uint64 untilTs, string reason, uint8 severity);
    event Cleared(address indexed vault, string reason);
    event GlobalRiskSet(bool on, string reason);
    event PolicySet(uint64 minDuration, uint64 maxDuration);

    address public dao;
    IProofLedger_SEC public ledger;

    // per-vault quarantine until timestamp (0 = not quarantined)
    mapping(address => uint64) public quarantineUntil;
    // per-vault last cleared timestamp (for cooldown)
    mapping(address => uint64) public lastCleared;
    // cooldown period after clearing before can re-quarantine
    uint64 public clearCooldown = 1 hours;

    // global risk (soft stop) with expiry — SecurityHub will treat as lock
    bool public globalRisk;
    uint64 public globalRiskUntil;  // auto-expires after this timestamp (0 = no expiry)

    // policy: default min/max quarantine duration (can be overridden by DAO later)
    uint64 public minDuration = 1 hours;
    uint64 public maxDuration = 30 days;

    modifier onlyDAO() { if (msg.sender != dao) revert SEC_NotDAO(); _; }

    constructor(address _dao, address _ledger) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
        ledger = IProofLedger_SEC(_ledger);
    }

    function setLedger(address _ledger) external onlyDAO {
        ledger = IProofLedger_SEC(_ledger);
        emit LedgerSet(_ledger);
        _log("panicguard_ledger_set");
    }

    function setPolicy(uint64 _minDuration, uint64 _maxDuration) external onlyDAO {
        if (_minDuration == 0 || _maxDuration < _minDuration) revert SEC_ExpiryTooShort();
        minDuration = _minDuration;
        maxDuration = _maxDuration;
        emit PolicySet(_minDuration, _maxDuration);
        _log("panicguard_policy_set");
    }

    /// Auto quarantine (e.g., called by Seer adapter or DAO).
    /// `severity` can hint duration selection: higher severity = longer duration.
    function reportRisk(address vault, uint64 duration, uint8 severity, string calldata reason) external onlyDAO {
        if (vault == address(0)) revert SEC_Zero();
        
        // Enforce cooldown after clearing (prevents quarantine spam)
        uint64 lastClear = lastCleared[vault];
        if (lastClear > 0 && block.timestamp < lastClear + clearCooldown) {
            revert SEC_NoEffect();
        }
        
        // Severity scaling: severity 0-10, higher = longer duration
        if (severity > 10) severity = 10;
        
        // Safe multiplication to prevent overflow
        uint256 scaledDuration = uint256(duration) * (10 + severity) / 10;
        uint64 adjustedDuration = scaledDuration > type(uint64).max ? type(uint64).max : uint64(scaledDuration);
        
        if (adjustedDuration < minDuration) adjustedDuration = minDuration;
        if (adjustedDuration > maxDuration) adjustedDuration = maxDuration;

        uint64 untilTs = uint64(block.timestamp) + adjustedDuration;
        quarantineUntil[vault] = untilTs;
        emit Quarantined(vault, untilTs, reason, severity);
        _logEv(vault, "panic_quarantine", untilTs, reason);
    }

    function clear(address vault, string calldata reason) external onlyDAO {
        quarantineUntil[vault] = 0;
        lastCleared[vault] = uint64(block.timestamp);  // Set cooldown timestamp
        emit Cleared(vault, reason);
        _logEv(vault, "panic_cleared", 0, reason);
    }

    /// @param on Enable/disable global risk
    /// @param duration If on=true, how long until auto-expiry (0 = no expiry, manual only)
    function setGlobalRisk(bool on, uint64 duration, string calldata reason) external onlyDAO {
        globalRisk = on;
        if (on && duration > 0) {
            globalRiskUntil = uint64(block.timestamp) + duration;
        } else {
            globalRiskUntil = 0;  // No expiry or manually disabled
        }
        emit GlobalRiskSet(on, reason);
        _log(string(abi.encodePacked("panic_global_", on ? "on" : "off")));
        _logEv(address(this), "panic_global", on ? 1 : 0, reason);
    }

    function isQuarantined(address vault) public view returns (bool) {
        uint64 untilTs = quarantineUntil[vault];
        return untilTs != 0 && untilTs > block.timestamp;
    }
    
    /// @notice Check if global risk is active (with expiry check)
    function isGlobalRiskActive() public view returns (bool) {
        if (!globalRisk) return false;
        if (globalRiskUntil == 0) return true;  // No expiry
        return block.timestamp < globalRiskUntil;
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

    address public dao;
    IProofLedger_SEC public ledger;

    bool public halted;
    uint64 public haltUntil;  // Auto-expires after this timestamp (0 = no expiry)

    modifier onlyDAO() { if (msg.sender != dao) revert SEC_NotDAO(); _; }

    constructor(address _dao, address _ledger) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
        ledger = IProofLedger_SEC(_ledger);
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao; emit DAOSet(_dao);
        _log("breaker_dao_set");
    }

    function setLedger(address _ledger) external onlyDAO {
        ledger = IProofLedger_SEC(_ledger);
        emit LedgerSet(_ledger);
        _log("breaker_ledger_set");
    }

    /// @param on Enable/disable halt
    /// @param duration If on=true, how long until auto-expiry (0 = no expiry, manual only)
    function toggle(bool on, uint64 duration, string calldata reason) external onlyDAO {
        halted = on;
        if (on && duration > 0) {
            haltUntil = uint64(block.timestamp) + duration;
        } else {
            haltUntil = 0;  // No expiry or manually disabled
        }
        emit Toggled(on, reason);
        _log(string(abi.encodePacked("breaker_", on ? "on" : "off")));
        _logEv(address(this), "breaker_toggle", on ? 1 : 0, reason);
    }
    
    /// @notice Check if halt is active (with expiry check)
    function isHalted() public view returns (bool) {
        if (!halted) return false;
        if (haltUntil == 0) return true;  // No expiry
        return block.timestamp < haltUntil;
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
    IProofLedger_SEC public ledger;

    modifier onlyDAO() { if (msg.sender != dao) revert SEC_NotDAO(); _; }

    constructor(address _dao, address _guardianLock, address _panicGuard, address _breaker, address _ledger) {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao;
        guardianLock = GuardianLock(_guardianLock);
        panicGuard   = PanicGuard(_panicGuard);
        breaker      = EmergencyBreaker(_breaker);
        ledger       = IProofLedger_SEC(_ledger);
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SEC_Zero();
        dao = _dao; emit DAOSet(_dao);
        _log("sechub_dao_set");
    }

    function setModules(address _guardianLock, address _panicGuard, address _breaker, address _ledger) external onlyDAO {
        // Allow zero addresses for optional modules, but log warning
        guardianLock = GuardianLock(_guardianLock);
        panicGuard   = PanicGuard(_panicGuard);
        breaker      = EmergencyBreaker(_breaker);
        ledger       = IProofLedger_SEC(_ledger);
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
        if (address(breaker) != address(0) && breaker.isHalted()) return true;
        if (address(guardianLock) != address(0) && guardianLock.locked(vault)) return true;
        if (address(panicGuard) != address(0)) {
            if (panicGuard.isQuarantined(vault)) return true;
            if (panicGuard.isGlobalRiskActive()) return true;
        }
        return false;
    }
    
    /// @notice ACCESSIBILITY: Get detailed lock status for transparency
    /// @return locked Overall lock status
    /// @return emergencyHalt Emergency breaker active
    /// @return guardianLocked Guardian lock active
    /// @return quarantined PanicGuard quarantine active
    /// @return globalRiskActive Global risk mode active
    function getLockStatus(address vault) external view returns (
        bool locked,
        bool emergencyHalt,
        bool guardianLocked,
        bool quarantined,
        bool globalRiskActive
    ) {
        emergencyHalt = address(breaker) != address(0) && breaker.isHalted();
        guardianLocked = address(guardianLock) != address(0) && guardianLock.locked(vault);
        quarantined = address(panicGuard) != address(0) && panicGuard.isQuarantined(vault);
        globalRiskActive = address(panicGuard) != address(0) && panicGuard.isGlobalRiskActive();
        locked = emergencyHalt || guardianLocked || quarantined || globalRiskActive;
    }

    function _log(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
}