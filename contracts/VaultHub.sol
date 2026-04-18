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
    /// @notice Default per-transfer limit for newly created vaults.
    /// @dev Raised from 100 VFIDE to 500,000 VFIDE so vaults are usable for DeFi operations
    ///      (liquidity provision, lending, farming) from day one.  Individual vault owners
    ///      can still tighten limits at any time via CardBoundVault.setSpendLimits().
    ///      Changes to these defaults apply to new vaults only; existing vaults are unaffected.
    uint256 public cardDefaultMaxPerTransfer = 500_000 * 1e18;
    /// @notice Default daily transfer limit for newly created vaults.
    uint256 public cardDefaultDailyLimit = 2_000_000 * 1e18;
    // M-3 FIX: Vaults have 30 days after creation to complete guardian setup.
    // After this window, certain critical operations require setup to be complete.
    uint256 public constant GUARDIAN_SETUP_GRACE = 30 days;

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

    // Pending state for card default limit changes
    uint256 public pendingCardMaxPerTransfer;
    uint256 public pendingCardDailyLimit;
    uint64 public pendingCardLimitsAt;

    // 48h timelock state for setRecoveryApprover and setCouncil (H-1)
    address public pendingRecoveryApproverAddr;
    bool    public pendingRecoveryApproverStatus;
    uint64  public pendingRecoveryApproverAt;
    address public pendingCouncil;
    uint64  public pendingCouncilAt;

    /// Events
    event VFIDEScheduled_VH(address indexed vfide, uint64 effectiveAt);
    event ProofLedgerScheduled_VH(address indexed ledger, uint64 effectiveAt);
    event DAOScheduled_VH(address indexed dao, uint64 effectiveAt);
    event VaultCreated(address indexed owner, address indexed vault);
    event VFIDESet(address vfide);
    event DAOSet(address dao);
    event CouncilSet(address council);
    event CardDefaultLimitsProposed(uint256 maxPerTransfer, uint256 dailyLimit, uint64 effectiveAt);
    event CardDefaultLimitsSet(uint256 maxPerTransfer, uint256 dailyLimit);
    event RecoveryApproverProposed(address indexed approver, bool status, uint64 effectiveAt);
    event RecoveryApproverSet(address indexed approver, bool status);
    event CouncilProposed(address indexed council, uint64 effectiveAt);

    event GuardianSetupCompleted(address indexed owner, address indexed vault);

    /// Errors
    error VH_Zero();
    error VH_NotDAO();
    error VH_UseIndividualSetters();
    error VH_Timelock();
    error VH_ImmutableTimelock();
    error VH_Create2Failed();
    error VH_UnknownVault();
    error VH_NotVaultOwner();
    error VH_NeedGuardians();
    error VH_ThresholdTooLow();
    error VH_NeedIndependentGuardian();
    error VH_NotRecoveryContract();
    error VH_RecoveryDisabled();
    error VH_GuardianSetupRequired(); // M-3 FIX: grace period expired, setup must be completed first
    error VH_InvalidLimits();
    error VH_PendingExists();

    constructor(address _vfideToken, address _ledger, address _dao) {
        if (_vfideToken == address(0) || _dao == address(0)) revert VH_Zero();
        vfideToken = _vfideToken;
        ledger = IProofLedger(_ledger);
        dao = _dao;
    }

    // ——— Module wiring
    /// @notice Deprecated aggregate module setter retained for interface compatibility.
    function setModules(address _vfideToken, address _ledger, address _dao) external view onlyOwner {
        _vfideToken;
        _ledger;
        _dao;
        revert VH_UseIndividualSetters();
    }

    /// @notice Schedule an update for the VFIDE token module.
    /// @param _vfide New VFIDE token address.
    function setVFIDE(address _vfide) external onlyOwner {
        if (_vfide == address(0)) revert VH_Zero();
        if (pendingVFIDEAt_VH != 0) revert VH_PendingExists();
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
        if (pendingVFIDEAt_VH != 0) revert VH_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingVFIDE_VH = token;
        pendingVFIDEAt_VH = effectiveAt;
        emit VFIDEScheduled_VH(token, effectiveAt);
        _log("hub_vfide_scheduled");
    }

    /// @notice Apply pending VFIDE token module after timelock delay.
    function applyVFIDEToken() external onlyOwner {
        if (pendingVFIDEAt_VH == 0 || block.timestamp < pendingVFIDEAt_VH) revert VH_Timelock();
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
        if (pendingProofLedgerAt_VH == 0 || block.timestamp < pendingProofLedgerAt_VH) revert VH_Timelock();
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
        revert VH_ImmutableTimelock();
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
        if (pendingDAOAt_VH == 0 || block.timestamp < pendingDAOAt_VH) revert VH_Timelock();
        dao = pendingDAO_VH;
        emit DAOSet(pendingDAO_VH);
        delete pendingDAO_VH;
        delete pendingDAOAt_VH;
        _log("hub_dao_set");
    }
    
    /// @notice Propose adding or removing a recovery approver (48h timelock).
    /// @dev H-1 FIX: Instant approval grants `executeRecoveryRotation` power — must be timelocked.
    /// @param approver Address to authorize or revoke.
    /// @param status True to authorize, false to revoke.
    function setRecoveryApprover(address approver, bool status) external onlyOwner {
        if (approver == address(0)) revert VH_Zero();
        if (pendingRecoveryApproverAt != 0) revert VH_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingRecoveryApproverAddr = approver;
        pendingRecoveryApproverStatus = status;
        pendingRecoveryApproverAt = effectiveAt;
        emit RecoveryApproverProposed(approver, status, effectiveAt);
        _log(status ? "recovery_approver_proposed_add" : "recovery_approver_proposed_remove");
    }

    /// @notice Apply a pending recovery approver change after the 48-hour timelock.
    function applyRecoveryApprover() external onlyOwner {
        if (pendingRecoveryApproverAt == 0 || block.timestamp < pendingRecoveryApproverAt) revert VH_Timelock();
        address approver = pendingRecoveryApproverAddr;
        bool status = pendingRecoveryApproverStatus;
        isRecoveryApprover[approver] = status;
        emit RecoveryApproverSet(approver, status);
        delete pendingRecoveryApproverAddr;
        delete pendingRecoveryApproverStatus;
        delete pendingRecoveryApproverAt;
        _log(status ? "recovery_approver_added" : "recovery_approver_removed");
    }

    /// @notice Cancel a pending recovery approver change.
    function cancelRecoveryApprover() external onlyOwner {
        if (pendingRecoveryApproverAt == 0) revert VH_Timelock();
        delete pendingRecoveryApproverAddr;
        delete pendingRecoveryApproverStatus;
        delete pendingRecoveryApproverAt;
    }

    /// @notice Propose updating the council contract (48h timelock).
    /// @dev H-1 FIX: Council used in approver fallback checks — must be timelocked.
    /// @param _council Council election/registry contract.
    function setCouncil(address _council) external onlyOwner {
        if (_council == address(0)) revert VH_Zero();
        if (pendingCouncilAt != 0) revert VH_PendingExists();
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingCouncil = _council;
        pendingCouncilAt = effectiveAt;
        emit CouncilProposed(_council, effectiveAt);
        _log("hub_council_proposed");
    }

    /// @notice Apply a pending council update after the 48-hour timelock.
    function applyCouncil() external onlyOwner {
        if (pendingCouncilAt == 0 || block.timestamp < pendingCouncilAt) revert VH_Timelock();
        council = pendingCouncil;
        emit CouncilSet(pendingCouncil);
        delete pendingCouncil;
        delete pendingCouncilAt;
        _log("hub_council_set");
    }

    /// @notice Cancel a pending council update.
    function cancelCouncil() external onlyOwner {
        if (pendingCouncilAt == 0) revert VH_Timelock();
        delete pendingCouncil;
        delete pendingCouncilAt;
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
        if (vault == address(0)) revert VH_Create2Failed();

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
        revert VH_RecoveryDisabled();
    }

    function initiateForceRecovery(address vault, address newOwner) public pure {
        vault;
        newOwner;
        revert VH_RecoveryDisabled();
    }

    function finalizeForceRecovery(address vault) public pure {
        vault;
        revert VH_RecoveryDisabled();
    }

    // IVaultHub compatibility stubs
    function requestDAORecovery(address vault, address newOwner) external pure {
        vault;
        newOwner;
        revert VH_RecoveryDisabled();
    }
    function finalizeDAORecovery(address vault) external pure {
        vault;
        revert VH_RecoveryDisabled();
    }
    function cancelDAORecovery(address vault) external pure {
        vault;
        revert VH_RecoveryDisabled();
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
        if (owner_ == address(0)) revert VH_UnknownVault();
        if (msg.sender != owner_) revert VH_NotVaultOwner();

        CardBoundVault v = CardBoundVault(payable(vault));
        if (v.guardianCount() < 2) revert VH_NeedGuardians();
        if (v.guardianThreshold() < 2) revert VH_ThresholdTooLow();
        if (!_hasIndependentGuardian(v, owner_)) revert VH_NeedIndependentGuardian();

        guardianSetupComplete[vault] = true;
        emit GuardianSetupCompleted(owner_, vault);
        _logEv(vault, "guardian_setup_complete", 0, "");
    }

    // ═══════════════════════════════════════════════════════════════
    //  GUARDIAN-APPROVED RECOVERY ROTATION
    // ═══════════════════════════════════════════════════════════════

    event RecoveryRotationRequested(address indexed vault, address indexed newWallet, address indexed recoveryContract);

    /// @notice Check whether a vault's guardian setup deadline has passed without completion.
    /// @dev M-3 FIX: Returns true if vault is older than GUARDIAN_SETUP_GRACE and setup is incomplete.
    function isGuardianSetupExpired(address vault) public view returns (bool) {
        if (guardianSetupComplete[vault]) return false;
        uint256 created = vaultCreatedAt[vault];
        return created > 0 && block.timestamp > created + GUARDIAN_SETUP_GRACE;
    }

    function executeRecoveryRotation(address vault, address newWallet) external nonReentrant {
        if (!isRecoveryApprover[msg.sender]) revert VH_NotRecoveryContract();
        // M-3 FIX: Block recovery if guardian setup grace period has expired without completion.
        // This prevents vaults without proper guardian coverage from silently allowing recovery.
        if (isGuardianSetupExpired(vault)) revert VH_GuardianSetupRequired();
        if (vault == address(0) || newWallet == address(0)) revert VH_Zero();
        if (ownerOfVault[vault] == address(0)) revert VH_UnknownVault();

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
                cardDefaultMaxPerTransfer,
                cardDefaultDailyLimit,
                address(ledger)
            )
        );
    }

    function _hasIndependentGuardian(CardBoundVault vault, address owner_) internal view returns (bool) {
        return !(vault.guardianCount() == 2 && vault.isGuardian(owner_) && vault.isGuardian(dao));
    }

    // ——— Card vault default limit management (timelocked)
    /**
     * @notice Schedule an update to the default per-transfer and daily limits applied to
     *         newly created vaults.  Changes take effect after the 48-hour timelock and
     *         apply only to vaults created after that point; existing vault limits are
     *         unchanged.
     * @param _maxPerTransfer New default max per-transfer (must be > 0 and <= _dailyLimit).
     * @param _dailyLimit     New default daily transfer limit (must be > 0).
     */
    function setCardDefaultLimits(uint256 _maxPerTransfer, uint256 _dailyLimit) external onlyOwner {
        if (_maxPerTransfer == 0 || _dailyLimit == 0 || _maxPerTransfer > _dailyLimit) revert VH_InvalidLimits();
        if (pendingCardLimitsAt != 0) revert VH_Timelock();
        uint64 effectiveAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
        pendingCardMaxPerTransfer = _maxPerTransfer;
        pendingCardDailyLimit = _dailyLimit;
        pendingCardLimitsAt = effectiveAt;
        emit CardDefaultLimitsProposed(_maxPerTransfer, _dailyLimit, effectiveAt);
    }

    /// @notice Apply pending default limit change after the 48-hour timelock.
    function applyCardDefaultLimits() external onlyOwner {
        if (pendingCardLimitsAt == 0 || block.timestamp < pendingCardLimitsAt) revert VH_Timelock();
        cardDefaultMaxPerTransfer = pendingCardMaxPerTransfer;
        cardDefaultDailyLimit = pendingCardDailyLimit;
        emit CardDefaultLimitsSet(pendingCardMaxPerTransfer, pendingCardDailyLimit);
        delete pendingCardMaxPerTransfer;
        delete pendingCardDailyLimit;
        delete pendingCardLimitsAt;
    }

    /// @notice Cancel a pending default limit change.
    function cancelCardDefaultLimits() external onlyOwner {
        if (pendingCardLimitsAt == 0) revert VH_Timelock();
        delete pendingCardMaxPerTransfer;
        delete pendingCardDailyLimit;
        delete pendingCardLimitsAt;
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
    
    /// @notice Pause vault-creation flows at hub level.
    function pause() external onlyOwner { _pause(); }

    /// @notice Unpause vault-creation flows at hub level.
    function unpause() external onlyOwner { _unpause(); }
}
