// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";
import "./CardBoundVault.sol";

/**
 * @title VaultHub
 * @notice Factory and registry for non-custodial VFIDE vaults
 * @dev Deploys CardBoundVault contracts via CREATE2 for deterministic addresses
 *      Vault custody remains contract-side; wallet acts as authorization-only key.
 */
contract VaultHub is Ownable, Pausable, ReentrancyGuard {
    /// Modules & config
    address public vfideToken;
    IProofLedger public ledger;       // optional ledger
    address public dao;               // DAO can force recover

    uint8 public constant CARD_GUARDIAN_THRESHOLD = 1;
    uint256 public constant CARD_MAX_PER_TRANSFER = 100 * 1e18;
    uint256 public constant CARD_DAILY_TRANSFER_LIMIT = 300 * 1e18;

    /// Registry
    mapping(address => address) public vaultOf;
    mapping(address => address) public ownerOfVault;
    mapping(address => bool) public guardianSetupComplete;

    // Recovery Timelock with Multi-Sig
    mapping(address => uint64) public recoveryUnlockTime;
    mapping(address => address) public recoveryProposedOwner;
    mapping(address => mapping(address => mapping(uint256 => bool))) public recoveryApprovals;    mapping(address => mapping(uint256 => address)) public recoveryCandidateForNonce;
    mapping(address => uint8) public recoveryApprovalCount;
    mapping(address => uint256) public recoveryNonce;    uint64 public constant RECOVERY_DELAY = 7 days; // H-5: Increased from 3 to 7 days
        uint64 public constant DAO_RECOVERY_DELAY = 14 days; // F-23 FIX: DAO-triggered recovery uses extended delay
    uint8 public constant RECOVERY_APPROVALS_REQUIRED = 3; // H-5: Multi-sig requirement
    mapping(address => bool) public isRecoveryApprover;

    /// @dev Creation counter only — increments on vault creation, never decremented (vaults are never destroyed).
    ///      Use totalVaultsCreated() for the named external API.
    uint256 public totalVaults;
    mapping(address => uint256) public vaultCreatedAt;

    address public council;

    // 48-hour timelock for module changes
    uint64 public constant MODULE_CHANGE_DELAY = 48 hours;
    address public pendingVFIDE_VH;
    uint64 public pendingVFIDEAt_VH;
    address public pendingProofLedger_VH;
    uint64 public pendingProofLedgerAt_VH;
    address public pendingDAO_VH;
    uint64 public pendingDAOAt_VH;

    /// Events
    event ModulesSet(address vfide, address ledger, address dao);
    event VFIDEScheduled_VH(address indexed vfide, uint64 effectiveAt);
    event ProofLedgerScheduled_VH(address indexed ledger, uint64 effectiveAt);
    event DAOScheduled_VH(address indexed dao, uint64 effectiveAt);
    event VaultCreated(address indexed owner, address indexed vault);
    event ForcedRecoveryInitiated(address indexed vault, address indexed newOwner, uint64 unlockTime);
    event ForcedRecovery(address indexed vault, address indexed newOwner);
    event VFIDESet(address vfide);
    event DAOSet(address dao);
    event CouncilSet(address council);

    event GuardianSetupCompleted(address indexed owner, address indexed vault);

    /// Errors
    error VH_Zero();
    error VH_NotDAO();

    constructor(address _vfideToken, address _ledger, address _dao) {
        if (_vfideToken == address(0) || _dao == address(0)) revert VH_Zero();
        vfideToken = _vfideToken;
        ledger = IProofLedger(_ledger);
        dao = _dao;

        emit ModulesSet(_vfideToken, _ledger, _dao);
    }

    // ——— Module wiring
    /// @notice Deprecated aggregate module setter retained for interface compatibility.
    function setModules(address _vfideToken, address _ledger, address _dao) external view onlyOwner {
        _vfideToken;
        _ledger;
        _dao;
        revert("VH: use individual setters");
    }

    /// @notice Schedule an update for the VFIDE token module.
    /// @param _vfide New VFIDE token address.
    function setVFIDE(address _vfide) external onlyOwner {
        if (_vfide == address(0)) revert VH_Zero();
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingVFIDE_VH = _vfide;
        pendingVFIDEAt_VH = effectiveAt;
        emit VFIDEScheduled_VH(_vfide, effectiveAt);
        _log("hub_vfide_scheduled");
    }

    // IVaultHub compatibility wrapper
    /// @notice Schedule VFIDE token update via compatibility interface.
    /// @param token New VFIDE token address.
    function setVFIDEToken(address token) external onlyOwner {
        if (token == address(0)) revert VH_Zero();
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingVFIDE_VH = token;
        pendingVFIDEAt_VH = effectiveAt;
        emit VFIDEScheduled_VH(token, effectiveAt);
        _log("hub_vfide_scheduled");
    }

    /// @notice Apply pending VFIDE token module after timelock delay.
    function applyVFIDEToken() external onlyOwner {
        require(pendingVFIDEAt_VH != 0 && block.timestamp >= pendingVFIDEAt_VH, "VH: timelock");
        vfideToken = pendingVFIDE_VH;
        emit VFIDESet(pendingVFIDE_VH);
        delete pendingVFIDE_VH;
        delete pendingVFIDEAt_VH;
        _log("hub_vfide_set");
    }

    // ── SecurityHub functions REMOVED — non-custodial ──

    // IVaultHub compatibility wrapper
    /// @notice Schedule ProofLedger update with timelock.
    /// @param proofLedger New ProofLedger address.
    function setProofLedger(address proofLedger) external onlyOwner {
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingProofLedger_VH = proofLedger;
        pendingProofLedgerAt_VH = effectiveAt;
        emit ProofLedgerScheduled_VH(proofLedger, effectiveAt);
        _log("hub_ledger_scheduled");
    }

    /// @notice Apply pending ProofLedger update after timelock.
    function applyProofLedger() external onlyOwner {
        require(pendingProofLedgerAt_VH != 0 && block.timestamp >= pendingProofLedgerAt_VH, "VH: timelock");
        ledger = IProofLedger(pendingProofLedger_VH);
        delete pendingProofLedger_VH;
        delete pendingProofLedgerAt_VH;
        _log("hub_ledger_set");
    }

    // IVaultHub compatibility wrapper
    /// @notice Add a DAO recovery approver multisig.
    /// @param multisig Address that may approve force recovery operations.
    function setDAORecoveryMultisig(address multisig) external onlyOwner {
        if (multisig == address(0)) revert VH_Zero();
        isRecoveryApprover[multisig] = true;
        _log("recovery_multisig_set");
    }

    // IVaultHub compatibility wrapper
    /// @notice Immutable placeholder for legacy IVaultHub API compatibility.
    function setRecoveryTimelock(uint256 timelock) external pure {
        // Recovery timelock is intentionally immutable in this version.
        timelock;
        revert("VH: immutable timelock");
    }

    /// @notice Schedule DAO address update via timelock.
    /// @param _dao New DAO address.
    function setDAO(address _dao) external onlyOwner {
        if (_dao == address(0)) revert VH_Zero();
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingDAO_VH = _dao;
        pendingDAOAt_VH = effectiveAt;
        emit DAOScheduled_VH(_dao, effectiveAt);
        _log("hub_dao_scheduled");
    }

    /// @notice Apply pending DAO address update after timelock.
    function applyDAO() external onlyOwner {
        require(pendingDAOAt_VH != 0 && block.timestamp >= pendingDAOAt_VH, "VH: timelock");
        dao = pendingDAO_VH;
        emit DAOSet(pendingDAO_VH);
        delete pendingDAO_VH;
        delete pendingDAOAt_VH;
        _log("hub_dao_set");
    }
    
    /// @notice Add or remove an address allowed to approve force recovery.
    /// @param approver Address to update.
    /// @param status True to authorize, false to revoke.
    function setRecoveryApprover(address approver, bool status) external onlyOwner {
        require(approver != address(0), "VH:zero");
        isRecoveryApprover[approver] = status;
        _log(status ? "recovery_approver_added" : "recovery_approver_removed");
    }

    /// @notice Set council contract used for approver fallback checks.
    /// @param _council Council election/registry contract.
    function setCouncil(address _council) external onlyOwner {
        require(_council != address(0), "VH:zero");
        council = _council;
        emit CouncilSet(_council);
        _log("hub_council_set");
    }

    // ——— Deterministic address prediction for UX
    /// @notice Predict deterministic vault address for an owner using CREATE2 salt.
    /// @param owner_ Owner whose vault address is queried.
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

    // ——— Legacy function for compatibility
    /// @notice Legacy helper to ensure caller vault exists.
    function createVault() external returns (address) {
        return ensureVault(msg.sender);
    }

    // ——— Auto-create (anyone can sponsor)
    /// @notice Ensure a deterministic CardBoundVault exists for an owner.
    /// @param owner_ Wallet owner for whom the vault is created or fetched.
    /// @return vault Existing or newly created vault address.
    function ensureVault(address owner_) public whenNotPaused nonReentrant returns (address vault) {
        if (owner_ == address(0)) revert VH_Zero();
        if (vfideToken == address(0)) revert VH_Zero(); // Ensure token is set
        vault = vaultOf[owner_];
        if (vault != address(0)) return vault;

        // Deploy via CREATE2 for deterministic address
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _creationCode(owner_);
        assembly { vault := create2(0, add(bytecode, 0x20), mload(bytecode), salt) }
        require(vault != address(0), "create2 failed");

        vaultOf[owner_] = vault;
        ownerOfVault[vault] = owner_;
        guardianSetupComplete[vault] = false;
        
        // Track vault creation
        totalVaults++;
        vaultCreatedAt[vault] = block.timestamp;

        emit VaultCreated(owner_, vault);
        _logEv(vault, "vault_created", 0, "");
    }

    // ——— Compatibility alias
    /// @notice Return vault address for owner.
    /// @param owner_ Owner address.
    function getVault(address owner_) external view returns (address) {
        return vaultOf[owner_];
    }

    // ——— View helpers (token expects vaultOf(owner))
    /// @notice Check whether address is an active vault tracked by this hub.
    /// @param a Candidate vault address.
    function isVault(address a) external view returns (bool) {
        return ownerOfVault[a] != address(0) && vaultOf[ ownerOfVault[a] ] == a;
    }

    // ── Force Recovery REMOVED — non-custodial ──────────────
    // Recovery is ONLY through the user's own guardians via
    // VaultRecoveryClaim or wallet rotation.
    // ──────────────────────────────────────────────────────────

    function approveForceRecovery(address vault, address newOwner) external pure {
        vault;
        newOwner;
        revert("VH: force recovery disabled - non-custodial");
    }

    function initiateForceRecovery(address vault, address newOwner) public pure {
        vault;
        newOwner;
        revert("VH: force recovery disabled - non-custodial");
    }

    function finalizeForceRecovery(address vault) public pure {
        vault;
        revert("VH: force recovery disabled - non-custodial");
    }

    // IVaultHub compatibility stubs
    function requestDAORecovery(address vault, address newOwner) external pure {
        vault;
        newOwner;
        revert("VH: force recovery disabled - non-custodial");
    }
    function finalizeDAORecovery(address vault) external pure {
        vault;
        revert("VH: force recovery disabled - non-custodial");
    }
    function cancelDAORecovery(address vault) external pure {
        vault;
        revert("VH: force recovery disabled - non-custodial");
    }

    // IVaultHub compatibility wrapper
    /// @notice Total number of vaults created by this hub.
    function totalVaultsCreated() external view returns (uint256) {
        return totalVaults;
    }

    /**
     * @notice Marks guardian bootstrap complete once vault uses a multi-guardian threshold.
     * @dev Enforces minimum 2 guardians and threshold >= 2 for independent recovery/rotation approvals.
     */
    function completeGuardianSetup(address vault) external {
        address owner_ = ownerOfVault[vault];
        require(owner_ != address(0), "VH: unknown vault");
        require(msg.sender == owner_, "VH: not owner");

        CardBoundVault v = CardBoundVault(payable(vault));
        require(v.guardianCount() >= 2, "VH: need 2 guardians");
        require(v.guardianThreshold() >= 2, "VH: threshold too low");
        require(_hasIndependentGuardian(v, owner_), "VH: need independent guardian");

        guardianSetupComplete[vault] = true;
        emit GuardianSetupCompleted(owner_, vault);
        _logEv(vault, "guardian_setup_complete", 0, "");
    }

    // ═══════════════════════════════════════════════════════════════
    //  GUARDIAN-APPROVED RECOVERY ROTATION
    // ═══════════════════════════════════════════════════════════════

    event RecoveryRotationRequested(address indexed vault, address indexed newWallet, address indexed recoveryContract);

    function executeRecoveryRotation(address vault, address newWallet) external nonReentrant {
        require(isRecoveryApprover[msg.sender], "VH: not recovery contract");
        require(vault != address(0) && newWallet != address(0), "VH: zero");
        require(ownerOfVault[vault] != address(0), "VH: unknown vault");

        CardBoundVault(payable(vault)).executeRecoveryRotation(newWallet);

        address oldOwner = ownerOfVault[vault];
        vaultOf[oldOwner] = address(0);
        ownerOfVault[vault] = newWallet;
        vaultOf[newWallet] = vault;

        emit RecoveryRotationRequested(vault, newWallet, msg.sender);
        _logEv(vault, "recovery_rotation", 0, "");
    }

    // ——— Internals
    function _salt(address owner_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner_));
    }

    function _creationCode(address owner_) internal view returns (bytes memory) {
        address[] memory guardians = new address[](1);
        guardians[0] = owner_;

        return abi.encodePacked(
            type(CardBoundVault).creationCode,
            abi.encode(
                address(this),
                vfideToken,
                owner_,
                owner_,
                guardians,
                CARD_GUARDIAN_THRESHOLD,
                CARD_MAX_PER_TRANSFER,
                CARD_DAILY_TRANSFER_LIMIT,
                address(ledger)
            )
        );
    }

    function _hasIndependentGuardian(CardBoundVault vault, address owner_) internal view returns (bool) {
        return !(vault.guardianCount() == 2 && vault.isGuardian(owner_) && vault.isGuardian(dao));
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch { emit LedgerLogFailed(who, action); } }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get vault info
     */
    function getVaultInfo(address vault) external view returns (
        address owner_,
        uint256 createdAt,
        bool isLocked,
        bool exists
    ) {
        owner_ = ownerOfVault[vault];
        exists = owner_ != address(0);
        createdAt = vaultCreatedAt[vault];
        isLocked = false; // SecurityHub locking removed — non-custodial
    }
    
    /**
     * @notice Batch predict vault addresses
     */
    function predictVaultsBatch(address[] calldata owners) external view returns (address[] memory vaults) {
        vaults = new address[](owners.length);
        for (uint256 i = 0; i < owners.length; i++) {
            vaults[i] = predictVault(owners[i]);
        }
    }
    
    /**
     * @notice Check if address is a vault or has a vault
     */
    function checkVaultStatus(address addr) external view returns (
        bool hasVault,
        address vaultAddress,
        bool isVaultContract
    ) {
        vaultAddress = vaultOf[addr];
        hasVault = vaultAddress != address(0);
        isVaultContract = ownerOfVault[addr] != address(0);
    }

    /// @notice Pause vault-creation flows at hub level.
    function pause() external onlyOwner { _pause(); }

    /// @notice Unpause vault-creation flows at hub level.
    function unpause() external onlyOwner { _unpause(); }
}
