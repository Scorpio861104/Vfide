// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VaultInfrastructure (zkSync Era ready) — FINAL
 * ----------------------------------------------------------
 * Single-file hub providing:
 *  - Deterministic Create2 factory for user vaults
 *  - Registry: vaultOf(owner) / ownerOf(vault)
 *  - Embedded UserVault implementation (guardians + recovery)
 *  - SecurityHub lock enforcement (PanicGuard / GuardianLock)
 *  - ProofLedger best-effort logging
 *
 * Pairs with VFIDEToken's "vaultOnly" transfer enforcement.
 */

/// ─────────────────────────── External interfaces (minimal)
interface IProofLedger_VI {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

interface ISecurityHub_VI {
    function isLocked(address vault) external view returns (bool);
}

interface IERC20_VI {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
}

/// ─────────────────────────── Lightweight hub Ownable
abstract contract Ownable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    address public owner;
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    modifier onlyOwner() { require(msg.sender == owner, "OWN:not-owner"); _; }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OWN:zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

/// ─────────────────────────── Reentrancy guard
abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status == 1, "reentrancy");
        _status = 2;
        _;
        _status = 1;
    }
}

/// ─────────────────────────── User Vault (embedded)
contract UserVault is ReentrancyGuard {
    /// Immutable references
    address public immutable hub;
    address public immutable vfideToken;
    ISecurityHub_VI public immutable securityHub;
    IProofLedger_VI public immutable ledger;

    /// State
    address public owner;
    mapping(address => bool) public isGuardian;

    address public nextOfKin;
    
    /// Withdrawal friction layer
    uint256 public lastWithdrawalTime;
    uint256 public withdrawalCooldown = 24 hours; // Default 24h cooldown
    uint256 public largeTransferThreshold = 10000 * 1e18; // Default 10k VFIDE

    struct Recovery {
        address proposedOwner;
        uint8 approvals;               // guardian approvals count
        mapping(address => bool) voted;
    }
    Recovery private _recovery;

    /// Events
    event OwnerSet(address indexed newOwner);
    event GuardianSet(address indexed guardian, bool active);
    event NextOfKinSet(address indexed kin);
    event RecoveryRequested(address indexed proposedOwner);
    event RecoveryApproved(address indexed guardian, address indexed proposedOwner, uint8 approvals);
    event RecoveryFinalized(address indexed newOwner);
    event VaultTransfer(address indexed toVault, uint256 amount);
    event VaultApprove(address indexed spender, uint256 amount);

    /// Errors
    error UV_NotOwner();
    error UV_Locked();
    error UV_Zero();
    error UV_NotGuardian();
    error UV_AlreadyVoted();
    error UV_NoRecovery();

    modifier onlyOwner() {
        if (msg.sender != owner) revert UV_NotOwner();
        _;
    }

    modifier notLocked() {
        if (address(securityHub) != address(0) && securityHub.isLocked(address(this))) revert UV_Locked();
        _;
    }

    constructor(
        address _hub,
        address _vfide,
        address _owner,
        address _securityHub,
        address _ledger
    ) {
        require(_hub != address(0) && _vfide != address(0) && _owner != address(0), "UV:zero");
        hub = _hub;
        vfideToken = _vfide;
        owner = _owner;
        securityHub = ISecurityHub_VI(_securityHub);
        ledger = IProofLedger_VI(_ledger);
        _logSys("vault_created");
        emit OwnerSet(_owner);
    }

    // ——— Governance hooks (only hub may force operations)
    function __forceSetOwner(address newOwner) external {
        require(msg.sender == hub, "UV:onlyHub");
        owner = newOwner;
        _logSys("vault_force_owner");
        emit OwnerSet(newOwner);
    }

    // ——— Owner controls
    function setGuardian(address g, bool active) external onlyOwner notLocked {
        if (g == address(0)) revert UV_Zero();
        isGuardian[g] = active;
        _logEv(g, active ? "guardian_add" : "guardian_remove", 0, "");
        emit GuardianSet(g, active);
    }

    function setNextOfKin(address kin) external onlyOwner notLocked {
        if (kin == address(0)) revert UV_Zero();
        nextOfKin = kin;
        _logEv(kin, "next_of_kin_set", 0, "");
        emit NextOfKinSet(kin);
    }

    function setWithdrawalCooldown(uint256 cooldown) external onlyOwner notLocked {
        require(cooldown <= 7 days, "UV:cooldown-too-long");
        withdrawalCooldown = cooldown;
        _logEv(msg.sender, "cooldown_set", cooldown, "");
    }

    function setLargeTransferThreshold(uint256 threshold) external onlyOwner notLocked {
        largeTransferThreshold = threshold;
        _logEv(msg.sender, "threshold_set", threshold, "");
    }

    // ——— Recovery flow (owner lost)
    function requestRecovery(address proposedOwner) external notLocked {
        // Either nextOfKin, an existing guardian, or the current owner may open a request
        if (!(msg.sender == owner || isGuardian[msg.sender] || msg.sender == nextOfKin)) revert UV_NotGuardian();
        if (proposedOwner == address(0)) revert UV_Zero();

        // reset recovery
        _recovery.proposedOwner = proposedOwner;
        _recovery.approvals = 0;
        _logEv(proposedOwner, "recovery_requested", 0, "");
        emit RecoveryRequested(proposedOwner);
    }

    function guardianApproveRecovery() external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        if (_recovery.voted[msg.sender]) revert UV_AlreadyVoted();
        _recovery.voted[msg.sender] = true;
        _recovery.approvals += 1;
        _logEv(msg.sender, "recovery_approval", _recovery.approvals, "");
        emit RecoveryApproved(msg.sender, _recovery.proposedOwner, _recovery.approvals);
    }

    function finalizeRecovery() external notLocked {
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        // Require 2 guardian approvals (can be configurable in future)
        require(_recovery.approvals >= 2, "UV:need-2-approvals");
        owner = _recovery.proposedOwner;

        // clear request
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;

        _logSys("recovery_finalized");
        emit RecoveryFinalized(owner);
    }

    // ——— Token operations (VFIDE only)
    function transferVFIDE(address toVault, uint256 amount) external onlyOwner notLocked nonReentrant returns (bool) {
        if (toVault == address(0)) revert UV_Zero();
        
        // Withdrawal cooldown check
        if (withdrawalCooldown > 0 && lastWithdrawalTime > 0) {
            require(block.timestamp >= lastWithdrawalTime + withdrawalCooldown, "UV:cooldown-active");
        }
        
        // Amount-based threshold: large transfers face additional scrutiny
        // (All transfers already checked by notLocked modifier above)
        // This could be used for future enhanced checks on large amounts
        if (amount > largeTransferThreshold && largeTransferThreshold > 0) {
            // Large transfer - log for extra scrutiny
            _logEv(toVault, "large_transfer_attempt", amount, "");
        }
        
        bool ok = IERC20_VI(vfideToken).transfer(toVault, amount);
        require(ok, "UV:transfer-failed");
        
        lastWithdrawalTime = block.timestamp;
        
        _logEv(toVault, "vault_transfer", amount, "");
        emit VaultTransfer(toVault, amount);
        return true;
    }

    function approveVFIDE(address spender, uint256 amount) external onlyOwner notLocked returns (bool) {
        if (spender == address(0)) revert UV_Zero();
        bool ok = IERC20_VI(vfideToken).approve(spender, amount);
        require(ok, "UV:approve-failed");
        _logEv(spender, "vault_approve", amount, "");
        emit VaultApprove(spender, amount);
        return ok;
    }

    // ——— Internals: ledger logging (best-effort)
    function _logSys(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ─────────────────────────── Hub / Factory / Registry
contract VaultInfrastructure is Ownable {
    /// Modules & config
    address public vfideToken;
    ISecurityHub_VI public securityHub;  // shared lock view
    IProofLedger_VI public ledger;       // optional ledger
    address public dao;                  // DAO can force recover

    /// Registry
    mapping(address => address) public vaultOf;
    mapping(address => address) public ownerOfVault;

    /// Events
    event ModulesSet(address vfide, address securityHub, address ledger, address dao);
    event VaultCreated(address indexed owner, address indexed vault);
    event ForcedRecovery(address indexed vault, address indexed newOwner);
    event VFIDESet(address vfide);
    event DAOSet(address dao);
    event RecoveryScheduled(address indexed vault, address indexed newOwner, uint256 delay);

    /// Errors
    error VI_Zero();
    error VI_NotDAO();

    constructor(address _vfideToken, address _securityHub, address _ledger, address _dao) {
        vfideToken = _vfideToken;
        securityHub = ISecurityHub_VI(_securityHub);
        ledger = IProofLedger_VI(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
    }

    // ——— Module wiring
    function setModules(address _vfideToken, address _securityHub, address _ledger, address _dao) external onlyOwner {
        vfideToken = _vfideToken;
        securityHub = ISecurityHub_VI(_securityHub);
        ledger = IProofLedger_VI(_Ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
        _log("hub_modules_set");
    }

    function setVFIDE(address _vfide) external onlyOwner {
        vfideToken = _vfide;
        emit VFIDESet(_vfide);
        _log("hub_vfide_set");
    }

    function setDAO(address _dao) external onlyOwner {
        dao = _dao;
        emit DAOSet(_dao);
        _log("hub_dao_set");
    }

    // ——— Deterministic address prediction for UX
    function predictVault(address owner_) public view returns (address predicted) {
        if (owner_ == address(0)) return address(0);
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _creationCode(owner_);
        bytes32 codeHash = keccak256(bytecode);
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            codeHash
        )))));
    }

    // ——— Auto-create (anyone can sponsor)
    function ensureVault(address owner_) public returns (address vault) {
        if (owner_ == address(0)) revert VI_Zero();
        vault = vaultOf[owner_];
        if (vault != address(0)) return vault;

        // Deploy via CREATE2 for deterministic address
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _creationCode(owner_);
        assembly { vault := create2(0, add(bytecode, 0x20), mload(bytecode), salt) }
        require(vault != address(0), "create2 failed");

        vaultOf[owner_] = vault;
        ownerOfVault[vault] = owner_;

        emit VaultCreated(owner_, vault);
        _logEv(vault, "vault_created", 0, "");
    }

    // ——— View helpers (token expects vaultOf(owner))
    function isVault(address a) external view returns (bool) {
        return ownerOfVault[a] != address(0) && vaultOf[ ownerOfVault[a] ] == a;
    }

    // ——— DAO forced recovery (emergency exceptional path)
    mapping(address => Recovery) public recoveryQueue;

    struct Recovery {
        address newOwner;
        uint256 executeAfter;
    }

    function forceRecover(address vault, address newOwner) external {
        if (msg.sender != dao) revert VI_NotDAO();
        if (vault == address(0) || newOwner == address(0)) revert VI_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");

        // update registry and tell vault
        vaultOf[current] = address(0);
        ownerOfVault[vault] = newOwner;
        vaultOf[newOwner] = vault;

        UserVault(vault).__forceSetOwner(newOwner);
        emit ForcedRecovery(vault, newOwner);
        _logEv(vault, "force_recover", 0, "");
    }

    // Add granular recovery controls
    function forceRecoverWithDelay(address vault, address newOwner, uint256 delay) external {
        if (msg.sender != dao) revert VI_NotDAO();
        if (vault == address(0) || newOwner == address(0)) revert VI_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");

        // Schedule recovery with delay
        recoveryQueue[vault] = Recovery({
            newOwner: newOwner,
            executeAfter: block.timestamp + delay
        });

        emit RecoveryScheduled(vault, newOwner, delay);
        _logEv(vault, "recovery_scheduled", delay, "");
    }

    function executeRecovery(address vault) external {
        Recovery memory recovery = recoveryQueue[vault];
        require(recovery.executeAfter != 0 && block.timestamp >= recovery.executeAfter, "recovery not ready");

        // Update registry and notify vault
        address current = ownerOfVault[vault];
        vaultOf[current] = address(0);
        ownerOfVault[vault] = recovery.newOwner;
        vaultOf[recovery.newOwner] = vault;

        UserVault(vault).__forceSetOwner(recovery.newOwner);
        emit ForcedRecovery(vault, recovery.newOwner);
        _logEv(vault, "force_recover", 0, "");

        delete recoveryQueue[vault];
    }

    // ─────────────────────────── Trading Cooldowns
    mapping(address => uint256) public lastTradeTimestamp; // Tracks the last trade time for each vault
    mapping(address => uint8) public offenseCount; // Tracks repeat offenses for cooldown adjustments

    function enforceCooldown(address vault) internal view {
        uint256 cooldownPeriod = 12 hours; // Default cooldown
        uint16 proofScore = getProofScore(vault); // Assume getProofScore is implemented

        // Adjust cooldown based on ProofScore and repeat offenses
        if (proofScore < 300) {
            cooldownPeriod = 48 hours; // Longer cooldown for low ProofScore
        } else if (offenseCount[vault] > 2) {
            cooldownPeriod = 48 hours; // Longer cooldown for repeat offenses
        }

        require(
            block.timestamp >= lastTradeTimestamp[vault] + cooldownPeriod,
            "Cooldown period active"
        );
    }

    function recordTrade(address vault) internal {
        lastTradeTimestamp[vault] = block.timestamp;
        offenseCount[vault] += 1; // Increment offense count for repeat violations
    }

    // ——— Internals
    function _salt(address owner_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner_));
    }

    function _creationCode(address owner_) internal view returns (bytes memory) {
        return abi.encodePacked(
            type(UserVault).creationCode,
            abi.encode(address(this), vfideToken, owner_, address(securityHub), address(ledger))
        );
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}