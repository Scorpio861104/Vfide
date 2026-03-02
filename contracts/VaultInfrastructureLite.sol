// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";
import "./UserVault.sol";

/**
 * @title VaultInfrastructureLite
 * @notice Lightweight vault factory using EIP-1167 minimal proxies (clones)
 * @dev Solves the 24KB contract size limit by not embedding UserVault bytecode
 *      Instead, deploys one implementation and clones point to it
 */
contract VaultInfrastructureLite is Ownable {
    /// Implementation contract that clones will delegate to
    address public implementation;
    
    /// Modules & config
    address public vfideToken;
    ISecurityHub public securityHub;
    IProofLedger public ledger;
    address public dao;

    /// Registry
    mapping(address => address) public vaultOf;
    mapping(address => address) public ownerOfVault;
    uint256 public totalVaults;
    mapping(address => uint256) public vaultCreatedAt;

    // Recovery Timelock with Multi-Sig (H-5 Fix)
    mapping(address => uint64) public recoveryUnlockTime;
    mapping(address => address) public recoveryProposedOwner;
    mapping(address => mapping(address => mapping(uint256 => bool))) public recoveryApprovals; // C-2 Fix: nonce-based
    mapping(address => uint8) public recoveryApprovalCount;
    mapping(address => uint256) public recoveryNonce; // C-2 Fix: nonce to invalidate old approvals
    uint64 public constant RECOVERY_DELAY = 7 days;
    uint8 public constant RECOVERY_APPROVALS_REQUIRED = 3;
    mapping(address => bool) public isRecoveryApprover;

    /// Events
    event ModulesSet(address vfide, address securityHub, address ledger, address dao);
    event VaultCreated(address indexed owner, address indexed vault);
    event ImplementationSet(address indexed implementation);
    event ForcedRecoveryInitiated(address indexed vault, address indexed newOwner, uint64 unlockTime);
    event ForcedRecoveryCancelled(address indexed vault);
    event ForcedRecovery(address indexed vault, address indexed newOwner);
    event VFIDESet(address vfide);
    event DAOSet(address dao);

    /// Errors
    error VI_Zero();
    error VI_NotDAO();
    error VI_NoImplementation();
    error VI_OwnerMismatch();     // approver voted for different newOwner than the existing proposal
    error VI_NoRecovery();        // no recovery in progress for this vault

    constructor(
        address _implementation,
        address _vfideToken,
        address _securityHub,
        address _ledger,
        address _dao
    ) {
        require(_implementation != address(0), "VI:zero-impl");
        implementation = _implementation;
        vfideToken = _vfideToken;
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        dao = _dao;
        emit ImplementationSet(_implementation);
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
    }

    // ——— Module wiring
    function setModules(address _vfideToken, address _securityHub, address _ledger, address _dao) external onlyOwner {
        vfideToken = _vfideToken;
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
        _log("hub_modules_set");
    }

    function setImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0), "VI:zero");
        implementation = _implementation;
        emit ImplementationSet(_implementation);
        _log("implementation_set");
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

    function setRecoveryApprover(address approver, bool status) external onlyOwner {
        require(approver != address(0), "VI:zero");
        isRecoveryApprover[approver] = status;
        _log(status ? "recovery_approver_added" : "recovery_approver_removed");
    }

    // ——— Deterministic address prediction for UX
    function predictVault(address owner_) public view returns (address predicted) {
        if (owner_ == address(0)) return address(0);
        bytes32 salt = _salt(owner_);
        // EIP-1167 clone deterministic address
        predicted = _predictDeterministicAddress(implementation, salt);
    }

    // ——— Auto-create using clones
    function ensureVault(address owner_) public returns (address vault) {
        if (owner_ == address(0)) revert VI_Zero();
        if (vfideToken == address(0)) revert VI_Zero();
        if (implementation == address(0)) revert VI_NoImplementation();
        
        vault = vaultOf[owner_];
        if (vault != address(0)) return vault;

        // Deploy minimal proxy (clone) with CREATE2 for deterministic address
        bytes32 salt = _salt(owner_);
        vault = _cloneDeterministic(implementation, salt);
        require(vault != address(0), "clone failed");

        // Initialize the clone
        UserVault(payable(vault)).initialize(
            address(this),
            vfideToken,
            owner_,
            address(securityHub),
            address(ledger)
        );

        vaultOf[owner_] = vault;
        ownerOfVault[vault] = owner_;
        totalVaults++;
        vaultCreatedAt[vault] = block.timestamp;

        // Register vault with SecurityHub
        if (address(securityHub) != address(0)) {
            try securityHub.registerVault(vault) {} catch {}
        }

        emit VaultCreated(owner_, vault);
        _logEv(vault, "vault_created", 0, "");
    }

    // ——— View helpers
    function isVault(address a) external view returns (bool) {
        return ownerOfVault[a] != address(0) && vaultOf[ownerOfVault[a]] == a;
    }

    // ——— DAO forced recovery with Multi-Sig (H-5 Fix)
    function approveForceRecovery(address vault, address newOwner) external {
        require(isRecoveryApprover[msg.sender], "VI:not-approver");
        if (vault == address(0) || newOwner == address(0)) revert VI_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");
        require(vaultOf[newOwner] == address(0), "target has vault");

        // SECURITY FIX (deep-audit): Anchor proposed owner to the FIRST vote so that
        // subsequent approvers cannot redirect recovery to a different recipient, and a
        // late-voting approver cannot override the target after the threshold is reached.
        address existingProposal = recoveryProposedOwner[vault];
        if (existingProposal == address(0)) {
            // First vote establishes the candidate; locking it in for all future votes.
            recoveryProposedOwner[vault] = newOwner;
        } else {
            // All subsequent votes must be for the same candidate.
            if (newOwner != existingProposal) revert VI_OwnerMismatch();
        }

        if (!recoveryApprovals[vault][msg.sender][recoveryNonce[vault]]) {
            recoveryApprovals[vault][msg.sender][recoveryNonce[vault]] = true;
            recoveryApprovalCount[vault]++;
            _log("recovery_approval_cast");
        }

        // Only start the timelock once (when count first hits the threshold).
        if (recoveryApprovalCount[vault] >= RECOVERY_APPROVALS_REQUIRED &&
                recoveryUnlockTime[vault] == 0) {
            recoveryUnlockTime[vault] = uint64(block.timestamp + RECOVERY_DELAY);
            emit ForcedRecoveryInitiated(vault, recoveryProposedOwner[vault], recoveryUnlockTime[vault]);
            _logEv(vault, "force_recover_init", 0, "");
        }
    }

    /**
     * @notice Cancel a recovery-in-progress before it is finalized.
     * @dev    Increments the nonce to invalidate all existing approvals.
     *         Only callable by DAO — e.g., if the original owner recovers access.
     */
    function cancelForceRecovery(address vault) external {
        if (msg.sender != dao) revert VI_NotDAO();
        if (recoveryProposedOwner[vault] == address(0) &&
                recoveryApprovalCount[vault] == 0) revert VI_NoRecovery();

        delete recoveryProposedOwner[vault];
        delete recoveryUnlockTime[vault];
        delete recoveryApprovalCount[vault];
        recoveryNonce[vault]++; // invalidate all outstanding approvals

        emit ForcedRecoveryCancelled(vault);
        _logEv(vault, "force_recover_cancelled", 0, "");
    }

    function initiateForceRecovery(address vault, address newOwner) external {
        if (msg.sender != dao) revert VI_NotDAO();
        if (vault == address(0) || newOwner == address(0)) revert VI_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");
        require(vaultOf[newOwner] == address(0), "target has vault");
        require(recoveryApprovalCount[vault] >= RECOVERY_APPROVALS_REQUIRED, "VI:insufficient-approvals");

        // If approvers have already anchored a proposed owner, DAO must confirm the same one.
        address existingProposal = recoveryProposedOwner[vault];
        if (existingProposal != address(0)) {
            if (newOwner != existingProposal) revert VI_OwnerMismatch();
        } else {
            recoveryProposedOwner[vault] = newOwner;
        }

        recoveryUnlockTime[vault] = uint64(block.timestamp + RECOVERY_DELAY);

        emit ForcedRecoveryInitiated(vault, recoveryProposedOwner[vault], recoveryUnlockTime[vault]);
        _logEv(vault, "force_recover_init", 0, "");
    }

    function finalizeForceRecovery(address vault) external {
        if (msg.sender != dao) revert VI_NotDAO();
        require(recoveryUnlockTime[vault] != 0, "VI:no-req");
        require(block.timestamp >= recoveryUnlockTime[vault], "VI:timelock");

        address newOwner = recoveryProposedOwner[vault];
        require(newOwner != address(0), "VI:zero");
        require(vaultOf[newOwner] == address(0), "target has vault");

        address current = ownerOfVault[vault];

        if (current != address(0)) {
            vaultOf[current] = address(0);
        }
        ownerOfVault[vault] = newOwner;
        vaultOf[newOwner] = vault;

        UserVault(payable(vault)).__forceSetOwner(newOwner);

        delete recoveryProposedOwner[vault];
        delete recoveryUnlockTime[vault];
        delete recoveryApprovalCount[vault];
        recoveryNonce[vault]++; // C-2 Fix: invalidate any outstanding approvals

        emit ForcedRecovery(vault, newOwner);
        _logEv(vault, "force_recover_final", 0, "");
    }

    // ——— Clone internals (EIP-1167)
    function _salt(address owner_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner_));
    }

    /**
     * @dev Deploys a clone of `impl` using CREATE2 with `salt`
     * Based on OpenZeppelin Clones library (MIT License)
     */
    function _cloneDeterministic(address impl, bytes32 salt) internal returns (address instance) {
        assembly {
            // Stores the bytecode after address
            mstore(0x00, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            // Stores implementation address
            mstore(0x14, shl(96, impl))
            // Stores the remaining bytecode
            mstore(0x28, 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            // Deploy with CREATE2
            instance := create2(0, 0x00, 0x37, salt)
        }
        require(instance != address(0), "ERC1167: create2 failed");
    }

    /**
     * @dev Computes the address of a clone deployed using CREATE2
     */
    function _predictDeterministicAddress(address impl, bytes32 salt) internal view returns (address predicted) {
        assembly {
            let ptr := mload(0x40)
            mstore(add(ptr, 0x38), shl(96, address()))
            mstore(add(ptr, 0x24), 0x5af43d82803e903d91602b57fd5bf3ff)
            mstore(add(ptr, 0x14), shl(96, impl))
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73)
            mstore(add(ptr, 0x58), salt)
            mstore(add(ptr, 0x78), keccak256(add(ptr, 0x0c), 0x37))
            predicted := keccak256(add(ptr, 0x43), 0x55)
        }
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch {}
        }
    }

    // ——— View functions
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

    function predictVaultsBatch(address[] calldata owners) external view returns (address[] memory vaults) {
        vaults = new address[](owners.length);
        for (uint256 i = 0; i < owners.length; i++) {
            vaults[i] = predictVault(owners[i]);
        }
    }

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
