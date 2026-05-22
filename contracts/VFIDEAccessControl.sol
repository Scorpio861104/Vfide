// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "./SharedInterfaces.sol";

/**
 * @title VFIDEAccessControl
 * @notice Enhanced access control system for VFIDE ecosystem with granular
 *         role-based permissions.
 * @dev Phase-1 fix: replaced OpenZeppelin AccessControlEnumerable import with
 *      SharedInterfaces.AccessControl to maintain supply-chain isolation for
 *      core contracts (see SharedInterfaces.sol I-02 / H-01 notes).
 *      Enumerable member tracking is handled locally via _roleMembers mapping.
 *
 *      VFIDEBridge retains OZ because LayerZero OApp requires it.
 *      VFIDEAccessControl is a core contract and must use SharedInterfaces.
 * @author Vfide
 */
contract VFIDEAccessControl is AccessControl {
    /// @notice EMERGENCY_PAUSER_ROLE
    bytes32 public constant EMERGENCY_PAUSER_ROLE = keccak256("EMERGENCY_PAUSER_ROLE");
    /// @notice CONFIG_MANAGER_ROLE
    bytes32 public constant CONFIG_MANAGER_ROLE = keccak256("CONFIG_MANAGER_ROLE");
    /// @notice TREASURY_MANAGER_ROLE
    bytes32 public constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");

    /// @notice ADMIN_TRANSFER_DELAY
    uint64 public constant ADMIN_TRANSFER_DELAY = 48 hours;

    /// @notice _reentrancyLock
    uint256 private _reentrancyLock;
    /// @notice pendingAdmin
    address public pendingAdmin;
    /// @notice pendingAdminAt
    uint64 public pendingAdminAt;

    // Enumerable member tracking (mirrors OZ AccessControlEnumerable without OZ dep)
    /// @notice _roleMembers
    mapping(bytes32 => address[]) private _roleMembers;
    /// @notice _roleMemberIndex
    mapping(bytes32 => mapping(address => uint256)) private _roleMemberIndex; // 1-based

    /// @notice RoleGrantedWithReason
    /// @param role role
    /// @param account account
    /// @param grantor grantor
    /// @param reason reason
    event RoleGrantedWithReason(bytes32 indexed role, address indexed account, address indexed grantor, string reason);
    /// @notice RoleRevokedWithReason
    /// @param role role
    /// @param account account
    /// @param revoker revoker
    /// @param reason reason
    event RoleRevokedWithReason(bytes32 indexed role, address indexed account, address indexed revoker, string reason);
    /// @notice AdminTransferQueued
    /// @param previousAdmin previousAdmin
    /// @param pendingAdmin pendingAdmin
    /// @param executeAfter executeAfter
    event AdminTransferQueued(address indexed previousAdmin, address indexed pendingAdmin, uint64 executeAfter);
    /// @notice AdminTransferApplied
    /// @param previousAdmin previousAdmin
    /// @param newAdmin newAdmin
    event AdminTransferApplied(address indexed previousAdmin, address indexed newAdmin);
    /// @notice AdminTransferCanceled
    /// @param previousAdmin previousAdmin
    /// @param pendingAdmin pendingAdmin
    event AdminTransferCanceled(address indexed previousAdmin, address indexed pendingAdmin);

    /// @notice nonReentrantAC
    modifier nonReentrantAC() {
        require(_reentrancyLock == 0, "VFIDEAccessControl: reentrant call");
        _reentrancyLock = 1;
        _;
        _reentrancyLock = 0;
    }

    /**
     * @notice Sets up initial admin and all role admins.
     * @dev SharedInterfaces.AccessControl auto-grants DEFAULT_ADMIN_ROLE to
     *      msg.sender; revoke that and grant to explicit _admin instead.
     * @param _admin _admin
     */
    constructor(address _admin) {
        require(_admin != address(0), "VFIDEAccessControl: admin is zero address");
        if (msg.sender != _admin) {
            _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
        }
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _addMember(DEFAULT_ADMIN_ROLE, _admin);
        _setRoleAdmin(EMERGENCY_PAUSER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(CONFIG_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(TREASURY_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /// @notice _addMember
    /// @param role role
    /// @param account account
    function _addMember(bytes32 role, address account) internal {
        if (_roleMemberIndex[role][account] == 0) {
            _roleMembers[role].push(account);
            _roleMemberIndex[role][account] = _roleMembers[role].length;
        }
    }

    /// @notice _removeMember
    /// @param role role
    /// @param account account
    function _removeMember(bytes32 role, address account) internal {
        uint256 idx = _roleMemberIndex[role][account];
        if (idx == 0) return;
        uint256 lastIdx = _roleMembers[role].length;
        if (idx != lastIdx) {
            address last = _roleMembers[role][lastIdx - 1];
            _roleMembers[role][idx - 1] = last;
            _roleMemberIndex[role][last] = idx;
        }
        _roleMembers[role].pop();
        delete _roleMemberIndex[role][account];
    }

    /// @notice getRoleMemberCount
    /// @param role role
    /// @return _uint256 _uint256
    function getRoleMemberCount(bytes32 role) external view returns (uint256) {
        return _roleMembers[role].length;
    }

    /// @notice getRoleMember
    /// @param role role
    /// @param index index
    /// @return _address _address
    function getRoleMember(bytes32 role, uint256 index) external view returns (address) {
        return _roleMembers[role][index];
    }

    /// @notice transferAdminRole
    /// @param newAdmin newAdmin
    function transferAdminRole(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrantAC {
        require(newAdmin != address(0), "VFIDEAccessControl: new admin is zero address");
        require(newAdmin != msg.sender, "VFIDEAccessControl: already admin");
        require(pendingAdminAt == 0, "VFIDEAccessControl: transfer already pending");
        pendingAdmin = newAdmin;
        pendingAdminAt = uint64(block.timestamp) + ADMIN_TRANSFER_DELAY;
        emit AdminTransferQueued(msg.sender, newAdmin, pendingAdminAt);
    }

    /// @notice applyAdminRoleTransfer
    function applyAdminRoleTransfer() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrantAC {
        require(pendingAdmin != address(0) && pendingAdminAt != 0, "VFIDEAccessControl: no pending transfer");
        require(block.timestamp >= pendingAdminAt, "VFIDEAccessControl: transfer timelock active");
        address prev = msg.sender;
        address next = pendingAdmin;
        _grantRole(DEFAULT_ADMIN_ROLE, next);
        _addMember(DEFAULT_ADMIN_ROLE, next);
        _revokeRole(DEFAULT_ADMIN_ROLE, prev);
        _removeMember(DEFAULT_ADMIN_ROLE, prev);
        delete pendingAdmin;
        delete pendingAdminAt;
        emit AdminTransferApplied(prev, next);
    }

    /// @notice cancelAdminRoleTransfer
    function cancelAdminRoleTransfer() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrantAC {
        require(pendingAdmin != address(0) && pendingAdminAt != 0, "VFIDEAccessControl: no pending transfer");
        address q = pendingAdmin;
        delete pendingAdmin;
        delete pendingAdminAt;
        emit AdminTransferCanceled(msg.sender, q);
    }

    /// @notice grantRoleWithReason
    /// @param role role
    /// @param account account
    /// @param reason reason
    function grantRoleWithReason(bytes32 role, address account, string calldata reason) external onlyRole(getRoleAdmin(role)) nonReentrantAC {
        require(account != address(0), "VFIDEAccessControl: account is zero address");
        require(bytes(reason).length > 0, "VFIDEAccessControl: reason required");
        _grantRole(role, account);
        _addMember(role, account);
        emit RoleGrantedWithReason(role, account, msg.sender, reason);
    }

    /// @notice revokeRoleWithReason
    /// @param role role
    /// @param account account
    /// @param reason reason
    function revokeRoleWithReason(bytes32 role, address account, string calldata reason) external onlyRole(getRoleAdmin(role)) nonReentrantAC {
        require(bytes(reason).length > 0, "VFIDEAccessControl: reason required");
        _revokeRole(role, account);
        _removeMember(role, account);
        emit RoleRevokedWithReason(role, account, msg.sender, reason);
    }

    /// @notice grantRole
    /// @param role role
    /// @param account account
    function grantRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        super.grantRole(role, account);
        _addMember(role, account);
    }

    /// @notice revokeRole
    /// @param role role
    /// @param account account
    function revokeRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        super.revokeRole(role, account);
        _removeMember(role, account);
    }

    /// @notice renounceRole
    /// @param role role
    /// @param account account
    function renounceRole(bytes32 role, address account) public override {
        super.renounceRole(role, account);
        _removeMember(role, account);
    }

    /// @notice hasAnyRole
    /// @param roles roles
    /// @param account account
    /// @return _bool _bool
    function hasAnyRole(bytes32[] calldata roles, address account) external view returns (bool) {
        for (uint256 i = 0; i < roles.length; ++i) {
            if (hasRole(roles[i], account)) return true;
        }
        return false;
    }

    /// @notice hasAllRoles
    /// @param roles roles
    /// @param account account
    /// @return _bool _bool
    function hasAllRoles(bytes32[] calldata roles, address account) external view returns (bool) {
        for (uint256 i = 0; i < roles.length; ++i) {
            if (!hasRole(roles[i], account)) return false;
        }
        return true;
    }

    function batchGrantRole(bytes32 role, address[] calldata accounts)
        external onlyRole(getRoleAdmin(role)) nonReentrantAC
    {
        for (uint256 i = 0; i < accounts.length; ++i) {
            require(accounts[i] != address(0), "VFIDEAccessControl: account is zero address");
            _grantRole(role, accounts[i]);
            _addMember(role, accounts[i]);
        }
    }

    function batchRevokeRole(bytes32 role, address[] calldata accounts)
        external onlyRole(getRoleAdmin(role)) nonReentrantAC
    {
        for (uint256 i = 0; i < accounts.length; ++i) {
            _revokeRole(role, accounts[i]); _removeMember(role, accounts[i]);
        }
    }
}
