// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/**
 * @title VFIDEAccessControl
 * @notice Enhanced access control system for VFIDE ecosystem with granular role-based permissions
 * @dev Implements OpenZeppelin AccessControl with custom roles for security and operational separation
 */
contract VFIDEAccessControl is AccessControlEnumerable {
    bytes32 public constant EMERGENCY_PAUSER_ROLE = keccak256("EMERGENCY_PAUSER_ROLE");
    bytes32 public constant CONFIG_MANAGER_ROLE = keccak256("CONFIG_MANAGER_ROLE");
    bytes32 public constant BLACKLIST_MANAGER_ROLE = keccak256("BLACKLIST_MANAGER_ROLE");
    bytes32 public constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");
    uint64 public constant ADMIN_TRANSFER_DELAY = 48 hours;
    uint256 private _reentrancyLock;
    address public pendingAdmin;
    uint64 public pendingAdminAt;

    event RoleGrantedWithReason(bytes32 indexed role, address indexed account, address indexed grantor, string reason);
    event RoleRevokedWithReason(bytes32 indexed role, address indexed account, address indexed revoker, string reason);
    event AdminTransferQueued(address indexed previousAdmin, address indexed pendingAdmin, uint64 executeAfter);
    event AdminTransferApplied(address indexed previousAdmin, address indexed newAdmin);
    event AdminTransferCanceled(address indexed previousAdmin, address indexed pendingAdmin);

    modifier nonReentrantAC() {
        require(_reentrancyLock == 0, "VFIDEAccessControl: reentrant call");
        _reentrancyLock = 1;
        _;
        _reentrancyLock = 0;
    }

    /**
     * @notice Constructor sets up initial admin and all roles
     * @param _admin Address that will receive DEFAULT_ADMIN_ROLE
     */
    constructor(address _admin) {
        require(_admin != address(0), "VFIDEAccessControl: admin is zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        
        _setRoleAdmin(EMERGENCY_PAUSER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(CONFIG_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(BLACKLIST_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(TREASURY_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /**
     * @notice Queue DEFAULT_ADMIN_ROLE transfer to a new admin (e.g. DAO timelock).
     *         Call applyAdminRoleTransfer after the delay to complete the handoff.
     * @param newAdmin Address to receive DEFAULT_ADMIN_ROLE (should be DAO timelock)
     */
    function transferAdminRole(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrantAC {
        require(newAdmin != address(0), "VFIDEAccessControl: new admin is zero address");
        require(newAdmin != msg.sender, "VFIDEAccessControl: already admin");
        require(pendingAdminAt == 0, "VFIDEAccessControl: transfer already pending");

        pendingAdmin = newAdmin;
        pendingAdminAt = uint64(block.timestamp) + ADMIN_TRANSFER_DELAY;
        emit AdminTransferQueued(msg.sender, newAdmin, pendingAdminAt);
    }

    /**
     * @notice Complete a queued DEFAULT_ADMIN_ROLE transfer after the timelock expires.
     */
    function applyAdminRoleTransfer() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrantAC {
        require(pendingAdmin != address(0) && pendingAdminAt != 0, "VFIDEAccessControl: no pending transfer");
        require(block.timestamp >= pendingAdminAt, "VFIDEAccessControl: transfer timelock active");

        address previousAdmin = msg.sender;
        address newAdmin = pendingAdmin;
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);

        delete pendingAdmin;
        delete pendingAdminAt;
        emit AdminTransferApplied(previousAdmin, newAdmin);
        // RoleGranted/RoleRevoked emit naturally via OZ AccessControl hooks.
    }

    /**
     * @notice Cancel a queued DEFAULT_ADMIN_ROLE transfer.
     */
    function cancelAdminRoleTransfer() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrantAC {
        require(pendingAdmin != address(0) && pendingAdminAt != 0, "VFIDEAccessControl: no pending transfer");

        address queuedAdmin = pendingAdmin;
        delete pendingAdmin;
        delete pendingAdminAt;
        emit AdminTransferCanceled(msg.sender, queuedAdmin);
    }

    /**
     * @notice Grant a role to an account with logged reason
     * @param role The role to grant
     * @param account The account to receive the role
     * @param reason Human-readable reason for granting the role
     */
    function grantRoleWithReason(
        bytes32 role,
        address account,
        string calldata reason
    ) external onlyRole(getRoleAdmin(role)) nonReentrantAC {
        require(account != address(0), "VFIDEAccessControl: account is zero address");
        require(bytes(reason).length > 0, "VFIDEAccessControl: reason required");
        
        _grantRole(role, account);
        emit RoleGrantedWithReason(role, account, msg.sender, reason);
    }

    /**
     * @notice Revoke a role from an account with logged reason
     * @param role The role to revoke
     * @param account The account to revoke the role from
     * @param reason Human-readable reason for revoking the role
     */
    function revokeRoleWithReason(
        bytes32 role,
        address account,
        string calldata reason
    ) external onlyRole(getRoleAdmin(role)) nonReentrantAC {
        require(bytes(reason).length > 0, "VFIDEAccessControl: reason required");
        
        _revokeRole(role, account);
        emit RoleRevokedWithReason(role, account, msg.sender, reason);
    }

    /**
     * @notice Check if an account has any of the specified roles
     * @param roles Array of roles to check
     * @param account The account to check
     * @return bool True if account has at least one of the roles
     */
    function hasAnyRole(bytes32[] calldata roles, address account) external view returns (bool) {
        for (uint256 i = 0; i < roles.length; i++) {
            if (hasRole(roles[i], account)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Check if an account has all specified roles
     * @param roles Array of roles to check
     * @param account The account to check
     * @return bool True if account has all the roles
     */
    function hasAllRoles(bytes32[] calldata roles, address account) external view returns (bool) {
        for (uint256 i = 0; i < roles.length; i++) {
            if (!hasRole(roles[i], account)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice Batch grant roles to multiple accounts
     * @param role The role to grant
     * @param accounts Array of accounts to receive the role
     */
    function batchGrantRole(bytes32 role, address[] calldata accounts) 
        external 
        onlyRole(getRoleAdmin(role))
        nonReentrantAC
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "VFIDEAccessControl: account is zero address");
            _grantRole(role, accounts[i]);
        }
    }

    /**
     * @notice Batch revoke roles from multiple accounts
     * @param role The role to revoke
     * @param accounts Array of accounts to revoke the role from
     */
    function batchRevokeRole(bytes32 role, address[] calldata accounts) 
        external 
        onlyRole(getRoleAdmin(role))
        nonReentrantAC
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            _revokeRole(role, accounts[i]);
        }
    }
}
