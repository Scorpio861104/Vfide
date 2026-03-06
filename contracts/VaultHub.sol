// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";
import "./UserVault.sol";

/**
 * @title VaultHub
 * @notice Factory and registry for non-custodial VFIDE vaults
 * @dev Deploys UserVault contracts via CREATE2 for deterministic addresses
 *      Separated from UserVault to stay under 24KB contract size limit
 */
contract VaultHub is Ownable {
    /// Modules & config
    address public vfideToken;
    ISecurityHub public securityHub;  // shared lock view
    IProofLedger public ledger;       // optional ledger
    address public dao;               // DAO can force recover

    /// Registry
    mapping(address => address) public vaultOf;
    mapping(address => address) public ownerOfVault;

    // Recovery Timelock with Multi-Sig (H-5 Fix)
    mapping(address => uint64) public recoveryUnlockTime;
    mapping(address => address) public recoveryProposedOwner;
    mapping(address => mapping(address => mapping(uint256 => bool))) public recoveryApprovals; // C-2 Fix: nonce-based
    mapping(address => mapping(uint256 => address)) public recoveryCandidateForNonce;
    mapping(address => uint8) public recoveryApprovalCount;
    mapping(address => uint256) public recoveryNonce; // C-2 Fix: Nonce to invalidate old approvals
    uint64 public constant RECOVERY_DELAY = 7 days; // H-5: Increased from 3 to 7 days
    uint8 public constant RECOVERY_APPROVALS_REQUIRED = 3; // H-5: Multi-sig requirement
    mapping(address => bool) public isRecoveryApprover;

    // Track total vaults created
    uint256 public totalVaults;
    mapping(address => uint256) public vaultCreatedAt;

    /// Events
    event ModulesSet(address vfide, address securityHub, address ledger, address dao);
    event VaultCreated(address indexed owner, address indexed vault);
    event ForcedRecoveryInitiated(address indexed vault, address indexed newOwner, uint64 unlockTime);
    event ForcedRecovery(address indexed vault, address indexed newOwner);
    event VFIDESet(address vfide);
    event DAOSet(address dao);

    /// Errors
    error VH_Zero();
    error VH_NotDAO();

    constructor(address _vfideToken, address _securityHub, address _ledger, address _dao) {
        vfideToken = _vfideToken;
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
    }

    // ——— Module wiring
    function setModules(address _vfideToken, address _securityHub, address _ledger, address _dao) external onlyOwner {
        if (_vfideToken == address(0) || _securityHub == address(0) || _dao == address(0)) revert VH_Zero();
        vfideToken = _vfideToken;
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
        _log("hub_modules_set");
    }

    function setVFIDE(address _vfide) external onlyOwner {
        if (_vfide == address(0)) revert VH_Zero();
        vfideToken = _vfide;
        emit VFIDESet(_vfide);
        _log("hub_vfide_set");
    }

    function setDAO(address _dao) external onlyOwner {
        if (_dao == address(0)) revert VH_Zero();
        dao = _dao;
        emit DAOSet(_dao);
        _log("hub_dao_set");
    }
    
    // H-5 Fix: Multi-sig approver management
    function setRecoveryApprover(address approver, bool status) external onlyOwner {
        require(approver != address(0), "VH:zero");
        isRecoveryApprover[approver] = status;
        _log(status ? "recovery_approver_added" : "recovery_approver_removed");
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

    // ——— Legacy function for compatibility
    function createVault() external returns (address) {
        return ensureVault(msg.sender);
    }

    // ——— Auto-create (anyone can sponsor)
    function ensureVault(address owner_) public returns (address vault) {
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
        
        // Track vault creation
        totalVaults++;
        vaultCreatedAt[vault] = block.timestamp;
        
        // Register vault with SecurityHub for vault age tracking (self-panic requirements)
        if (address(securityHub) != address(0)) {
            try securityHub.registerVault(vault) {} catch {
                // Best-effort registration, don't fail vault creation if SecurityHub registration fails
            }
        }

        emit VaultCreated(owner_, vault);
        _logEv(vault, "vault_created", 0, "");
    }

    // ——— Compatibility alias
    function getVault(address owner_) external view returns (address) {
        return vaultOf[owner_];
    }

    // ——— View helpers (token expects vaultOf(owner))
    function isVault(address a) external view returns (bool) {
        return ownerOfVault[a] != address(0) && vaultOf[ ownerOfVault[a] ] == a;
    }

    // ——— DAO forced recovery with Multi-Sig (H-5 Fix)
    function approveForceRecovery(address vault, address newOwner) external {
        require(isRecoveryApprover[msg.sender], "VH:not-approver");
        if (vault == address(0) || newOwner == address(0)) revert VH_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");
        require(vaultOf[newOwner] == address(0), "target has vault");
        
        // C-2 Fix: Use nonce to prevent stale approval reuse
        uint256 nonce = recoveryNonce[vault];

        address candidate = recoveryCandidateForNonce[vault][nonce];
        if (candidate == address(0)) {
            recoveryCandidateForNonce[vault][nonce] = newOwner;
        } else {
            require(candidate == newOwner, "VH:candidate-mismatch");
        }
        
        // Record approval for current nonce
        if (!recoveryApprovals[vault][msg.sender][nonce]) {
            recoveryApprovals[vault][msg.sender][nonce] = true;
            recoveryApprovalCount[vault]++;
            _log("recovery_approval_cast");
        }
        
        // If threshold reached, initiate timelock
        if (recoveryApprovalCount[vault] >= RECOVERY_APPROVALS_REQUIRED) {
            recoveryProposedOwner[vault] = recoveryCandidateForNonce[vault][nonce];
            recoveryUnlockTime[vault] = uint64(block.timestamp + RECOVERY_DELAY);
            emit ForcedRecoveryInitiated(vault, recoveryProposedOwner[vault], recoveryUnlockTime[vault]);
            _logEv(vault, "force_recover_init", 0, "");
        }
    }
    
    // Legacy function kept for compatibility but now requires multi-sig first
    function initiateForceRecovery(address vault, address newOwner) external {
        if (msg.sender != dao) revert VH_NotDAO();
        if (vault == address(0) || newOwner == address(0)) revert VH_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");
        require(vaultOf[newOwner] == address(0), "target has vault");
        
        // H-5 Fix: Require multi-sig approvals first
        require(recoveryApprovalCount[vault] >= RECOVERY_APPROVALS_REQUIRED, "VH:insufficient-approvals");

        uint256 nonce = recoveryNonce[vault];
        address candidate = recoveryCandidateForNonce[vault][nonce];
        if (candidate != address(0) && candidate != newOwner) {
            revert("VH:candidate-mismatch");
        }
        if (candidate == address(0)) {
            recoveryCandidateForNonce[vault][nonce] = newOwner;
        }

        recoveryProposedOwner[vault] = recoveryCandidateForNonce[vault][nonce];
        recoveryUnlockTime[vault] = uint64(block.timestamp + RECOVERY_DELAY);
        
        emit ForcedRecoveryInitiated(vault, recoveryProposedOwner[vault], recoveryUnlockTime[vault]);
        _logEv(vault, "force_recover_init", 0, "");
    }

    function finalizeForceRecovery(address vault) external {
        if (msg.sender != dao) revert VH_NotDAO();
        require(recoveryUnlockTime[vault] != 0, "VH:no-req");
        require(block.timestamp >= recoveryUnlockTime[vault], "VH:timelock");
        
        address newOwner = recoveryProposedOwner[vault];
        require(newOwner != address(0), "VH:zero");
        
        // Re-check target has no vault (in case they made one during wait)
        require(vaultOf[newOwner] == address(0), "target has vault");

        address current = ownerOfVault[vault];
        
        // update registry and tell vault
        if (current != address(0)) {
            vaultOf[current] = address(0);
        }
        ownerOfVault[vault] = newOwner;
        vaultOf[newOwner] = vault;

        UserVault(payable(vault)).__forceSetOwner(newOwner);
        
        // H-5 Fix: Clear multi-sig approval state
        delete recoveryProposedOwner[vault];
        delete recoveryUnlockTime[vault];
        delete recoveryApprovalCount[vault];
        // C-2 Fix: Clear all approvals for this vault to prevent stale votes
        recoveryNonce[vault]++;

        emit ForcedRecovery(vault, newOwner);
        _logEv(vault, "force_recover_final", 0, "");
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
        isLocked = address(securityHub) != address(0) && securityHub.isLocked(vault);
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
}
