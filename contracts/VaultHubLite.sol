// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VaultHubLite
 * @notice Lightweight vault system for VFIDE - under 24KB limit
 * @dev Simplified version focusing on core vault functionality:
 *      - Vault creation via CREATE2
 *      - Token deposits/withdrawals
 *      - Basic guardian recovery (simplified)
 *      - ProofScore integration
 */

interface IProofLedger {
    function log(address user, string calldata action) external;
}

/// @notice Lightweight User Vault - just the essentials
contract UserVaultLite is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public immutable hub;
    address public immutable vfideToken;
    address public owner;
    
    // Simple guardian system (max 3)
    address[3] public guardians;
    uint8 public guardianCount;
    
    // Recovery
    address public recoveryCandidate;
    uint8 public recoveryApprovals;
    mapping(address => bool) public hasApprovedRecovery;
    uint64 public recoveryExpiry;
    
    // Cooldown
    uint64 public lastWithdrawTime;
    uint64 public constant COOLDOWN = 1 hours;
    
    event OwnerChanged(address indexed newOwner);
    event GuardianSet(address indexed guardian, uint8 slot, bool active);
    event Transfer(address indexed to, uint256 amount);
    event RecoveryStarted(address indexed candidate);
    event RecoveryApproved(address indexed guardian);
    event RecoveryExecuted(address indexed newOwner);
    
    error NotOwner();
    error NotGuardian();
    error NotHub();
    error CooldownActive();
    error InvalidAddress();
    error NoRecovery();
    error AlreadyApproved();
    error RecoveryExpired();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyHub() {
        if (msg.sender != hub) revert NotHub();
        _;
    }
    
    constructor(address _hub, address _vfide, address _owner) {
        hub = _hub;
        vfideToken = _vfide;
        owner = _owner;
        emit OwnerChanged(_owner);
    }
    
    /// @notice Get vault's VFIDE balance
    function balance() public view returns (uint256) {
        return IERC20(vfideToken).balanceOf(address(this));
    }
    
    /// @notice Transfer VFIDE to another vault
    function transfer(address toVault, uint256 amount) external onlyOwner nonReentrant {
        if (toVault == address(0)) revert InvalidAddress();
        if (block.timestamp < lastWithdrawTime + COOLDOWN) revert CooldownActive();
        
        lastWithdrawTime = uint64(block.timestamp);
        IERC20(vfideToken).safeTransfer(toVault, amount);
        emit Transfer(toVault, amount);
    }
    
    /// @notice Set a guardian (slots 0-2)
    function setGuardian(uint8 slot, address guardian) external onlyOwner {
        if (slot > 2) revert InvalidAddress();
        
        // If removing, decrease count
        if (guardians[slot] != address(0) && guardian == address(0)) {
            guardianCount--;
        }
        // If adding new, increase count
        if (guardians[slot] == address(0) && guardian != address(0)) {
            guardianCount++;
        }
        
        guardians[slot] = guardian;
        emit GuardianSet(guardian, slot, guardian != address(0));
    }
    
    /// @notice Check if address is a guardian
    function isGuardian(address addr) public view returns (bool) {
        return guardians[0] == addr || guardians[1] == addr || guardians[2] == addr;
    }
    
    /// @notice Start recovery process (any guardian can start)
    function startRecovery(address candidate) external {
        if (!isGuardian(msg.sender)) revert NotGuardian();
        if (candidate == address(0)) revert InvalidAddress();
        
        // Reset recovery
        recoveryCandidate = candidate;
        recoveryApprovals = 1; // Starter counts as approval
        recoveryExpiry = uint64(block.timestamp + 7 days);
        
        // Clear previous approvals
        for (uint8 i = 0; i < 3; i++) {
            hasApprovedRecovery[guardians[i]] = false;
        }
        hasApprovedRecovery[msg.sender] = true;
        
        emit RecoveryStarted(candidate);
        emit RecoveryApproved(msg.sender);
    }
    
    /// @notice Approve recovery (guardians only)
    function approveRecovery() external {
        if (!isGuardian(msg.sender)) revert NotGuardian();
        if (recoveryCandidate == address(0)) revert NoRecovery();
        if (block.timestamp > recoveryExpiry) revert RecoveryExpired();
        if (hasApprovedRecovery[msg.sender]) revert AlreadyApproved();
        
        hasApprovedRecovery[msg.sender] = true;
        recoveryApprovals++;
        
        emit RecoveryApproved(msg.sender);
        
        // If majority (2 of 3), execute immediately
        if (recoveryApprovals >= 2 && guardianCount >= 2) {
            _executeRecovery();
        }
    }
    
    /// @notice Execute recovery (if enough approvals)
    function executeRecovery() external {
        if (recoveryCandidate == address(0)) revert NoRecovery();
        if (block.timestamp > recoveryExpiry) revert RecoveryExpired();
        
        uint8 required = guardianCount >= 2 ? 2 : 1;
        require(recoveryApprovals >= required, "Not enough approvals");
        
        _executeRecovery();
    }
    
    function _executeRecovery() internal {
        address newOwner = recoveryCandidate;
        recoveryCandidate = address(0);
        recoveryApprovals = 0;
        owner = newOwner;
        
        emit RecoveryExecuted(newOwner);
        emit OwnerChanged(newOwner);
    }
    
    /// @notice Cancel recovery (owner only)
    function cancelRecovery() external onlyOwner {
        recoveryCandidate = address(0);
        recoveryApprovals = 0;
    }
    
    /// @notice Receive ETH
    receive() external payable {}
    
    /// @notice Withdraw ETH (owner only)
    function withdrawETH(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "ETH transfer failed");
    }
}

/// @notice Factory and registry for user vaults
contract VaultHubLite is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public immutable vfideToken;
    address public immutable proofLedger;
    address public owner;
    
    // Registry
    mapping(address => address) public vaultOf;  // user => vault
    mapping(address => address) public ownerOf;  // vault => user
    address[] public allVaults;
    
    // Stats
    uint256 public totalVaults;
    uint256 public totalDeposits;
    
    event VaultCreated(address indexed user, address indexed vault);
    event Deposit(address indexed vault, uint256 amount);
    
    error AlreadyHasVault();
    error NoVault();
    error NotVaultOwner();
    
    constructor(address _vfide, address _ledger) {
        vfideToken = _vfide;
        proofLedger = _ledger;
        owner = msg.sender;
    }
    
    /// @notice Create a new vault for the caller
    function createVault() external nonReentrant returns (address vault) {
        if (vaultOf[msg.sender] != address(0)) revert AlreadyHasVault();
        
        // Deploy with CREATE2 for deterministic address
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, block.number));
        vault = address(new UserVaultLite{salt: salt}(
            address(this),
            vfideToken,
            msg.sender
        ));
        
        vaultOf[msg.sender] = vault;
        ownerOf[vault] = msg.sender;
        allVaults.push(vault);
        totalVaults++;
        
        // Log to ProofLedger
        if (proofLedger != address(0)) {
            try IProofLedger(proofLedger).log(msg.sender, "vault_created") {} catch {}
        }
        
        emit VaultCreated(msg.sender, vault);
    }
    
    /// @notice Deposit VFIDE directly to caller's vault
    function deposit(uint256 amount) external nonReentrant {
        address vault = vaultOf[msg.sender];
        if (vault == address(0)) revert NoVault();
        
        IERC20(vfideToken).safeTransferFrom(msg.sender, vault, amount);
        totalDeposits += amount;
        
        emit Deposit(vault, amount);
    }
    
    /// @notice Create vault and deposit in one transaction
    function createVaultAndDeposit(uint256 amount) external nonReentrant returns (address vault) {
        if (vaultOf[msg.sender] != address(0)) revert AlreadyHasVault();
        
        // Deploy vault
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, block.number));
        vault = address(new UserVaultLite{salt: salt}(
            address(this),
            vfideToken,
            msg.sender
        ));
        
        vaultOf[msg.sender] = vault;
        ownerOf[vault] = msg.sender;
        allVaults.push(vault);
        totalVaults++;
        
        // Transfer tokens to vault
        if (amount > 0) {
            IERC20(vfideToken).safeTransferFrom(msg.sender, vault, amount);
            totalDeposits += amount;
            emit Deposit(vault, amount);
        }
        
        // Log to ProofLedger
        if (proofLedger != address(0)) {
            try IProofLedger(proofLedger).log(msg.sender, "vault_created") {} catch {}
        }
        
        emit VaultCreated(msg.sender, vault);
    }
    
    /// @notice Get vault address for a user (returns zero if none)
    function getVault(address user) external view returns (address) {
        return vaultOf[user];
    }
    
    /// @notice Check if address is a valid vault
    function isVault(address addr) external view returns (bool) {
        return ownerOf[addr] != address(0);
    }
    
    /// @notice Get all vaults (paginated)
    function getVaults(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = allVaults.length;
        if (offset >= total) return new address[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allVaults[i];
        }
        return result;
    }
    
    /// @notice Predict vault address before creation
    function predictVaultAddress(address user) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(user, block.number));
        bytes memory bytecode = abi.encodePacked(
            type(UserVaultLite).creationCode,
            abi.encode(address(this), vfideToken, user)
        );
        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        ));
        return address(uint160(uint256(hash)));
    }
}
