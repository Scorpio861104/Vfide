// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";
import "./interfaces/IVaultInfrastructure.sol";

/**
 * @title VaultRegistry
 * @notice Searchable vault registry enabling vault recovery when wallet is lost
 * @dev This solves the critical UX problem: How does a user find their vault if they've lost their wallet?
 * 
 * Traditional crypto: Lost wallet = Lost forever
 * VFide: Lost wallet → Search vault → Verify identity → Recover
 * 
 * Search Methods:
 * 1. Recovery ID (hashed email/phone/username) - User remembers their identifier
 * 2. Badge fingerprint - Match unique badge combination
 * 3. Guardian lookup - Guardian can help locate vault
 * 4. Partial address match - User remembers part of old wallet address
 * 
 * Privacy: All identifiers are stored as keccak256 hashes, never plaintext
 */

interface IBadgeManager {
    function getUserBadges(address user) external view returns (uint256[] memory);
}

interface IProofScoreManager {
    function getProofScore(address user) external view returns (uint256);
}

contract VaultRegistry is Ownable, ReentrancyGuard {
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    IVaultInfrastructure public vaultHub;
    IBadgeManager public badgeManager;
    IProofScoreManager public proofScoreManager;
    
    // Recovery identifiers (all hashed for privacy)
    // recoveryIdHash => primary vault address (backward compatibility)
    mapping(bytes32 => address) public vaultByRecoveryId;
    // FINAL-06: collision-safe storage of all vaults sharing the same recovery hash
    mapping(bytes32 => address[]) public vaultsByRecoveryId;
    
    // Vault => recovery ID hash (for verification)
    mapping(address => bytes32) public recoveryIdOfVault;
    
    // Email hash => vault (optional, if user wants email recovery)
    mapping(bytes32 => address) public vaultByEmailHash;
    
    // Phone hash => vault (optional, if user wants phone recovery)
    mapping(bytes32 => address) public vaultByPhoneHash;
    
    // Username hash => vault (human-readable identifier)
    mapping(bytes32 => address) public vaultByUsernameHash;
    
    // Username hash => taken (prevent duplicates)
    mapping(bytes32 => bool) public usernameTaken;
    
    // Badge fingerprint => vault (unique badge combination identifier)
    mapping(bytes32 => address) public vaultByBadgeFingerprint;
    
    // Guardian address => list of vaults they guard
    mapping(address => address[]) public vaultsGuardedBy;
    mapping(address => mapping(address => bool)) private _isGuardianOf;
    
    // Vault metadata for search results
    struct VaultInfo {
        address vault;
        address originalOwner;
        uint256 createdAt;
        uint256 lastActiveAt;
        uint256 proofScore;
        uint256 badgeCount;
        bool hasGuardians;
        bool hasRecoveryId;
        bool isRecoverable;
    }
    
    // Tracking
    address[] public allVaults;
    mapping(address => uint256) public vaultIndex;
    mapping(address => uint256) public vaultCreatedAt;
    mapping(address => uint256) public vaultLastActiveAt;
    mapping(address => uint256) public guardianCountOfVault;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    event VaultRegistered(address indexed vault, address indexed owner, uint256 timestamp);
    event RecoveryIdSet(address indexed vault, bytes32 indexed recoveryIdHash);
    event EmailRecoverySet(address indexed vault, bytes32 indexed emailHash);
    event PhoneRecoverySet(address indexed vault, bytes32 indexed phoneHash);
    event UsernameSet(address indexed vault, bytes32 indexed usernameHash);
    event GuardianRegistered(address indexed vault, address indexed guardian);
    event GuardianRemoved(address indexed vault, address indexed guardian);
    event BadgeFingerprintUpdated(address indexed vault, bytes32 indexed fingerprint);
    event VaultActivityUpdated(address indexed vault, uint256 timestamp);
    event VaultHubSet(address indexed newVaultHub);
    event BadgeManagerSet(address indexed newBadgeManager);
    event ProofScoreManagerSet(address indexed newProofScoreManager);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    error NotVaultOwner();
    error InvalidVault();
    error RecoveryIdAlreadyTaken();
    error EmailAlreadyTaken();
    error UsernameAlreadyTaken();
    error PhoneAlreadyTaken();
    error VaultNotFound();
    error ZeroAddress();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════
    
    constructor(address _vaultHub, address _badgeManager, address _proofScoreManager) {
        if (_vaultHub == address(0)) revert ZeroAddress();
        vaultHub = IVaultInfrastructure(_vaultHub);
        badgeManager = IBadgeManager(_badgeManager);
        proofScoreManager = IProofScoreManager(_proofScoreManager);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    modifier onlyVaultOwner(address vault) {
        address owner = vaultHub.ownerOfVault(vault);
        if (owner != msg.sender) revert NotVaultOwner();
        _;
    }
    
    modifier validVault(address vault) {
        if (!vaultHub.isVault(vault)) revert InvalidVault();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // REGISTRATION (Called when vault is created or user sets up recovery)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Register a vault in the searchable registry
     * @dev Called automatically when vault is created, or manually by user
     */
    function registerVault(address vault) external validVault(vault) {
        address owner = vaultHub.ownerOfVault(vault);
        require(msg.sender == owner || msg.sender == address(vaultHub), "not authorized");
        
        if (vaultCreatedAt[vault] < 1) {
            vaultIndex[vault] = allVaults.length;
            require(allVaults.length < 100000, "VR: vault cap"); // I-11
            allVaults.push(vault);
            vaultCreatedAt[vault] = block.timestamp;
        }
        
        vaultLastActiveAt[vault] = block.timestamp;
        
        emit VaultRegistered(vault, owner, block.timestamp);
    }
    
    /**
     * @notice Set a recovery ID for vault lookup
     * @dev User provides plaintext, we hash it. User must remember their recovery ID.
     * @param vault The vault address
     * @param recoveryId Plaintext recovery ID (e.g., "john.doe.2024" or unique phrase)
     * 
     * Example: User sets recoveryId = "mygrandma'sbirthdayplus1234"
     * When wallet lost: User enters same phrase → finds vault → initiates recovery
     */
    function setRecoveryId(
        address vault, 
        string calldata recoveryId
    ) external onlyVaultOwner(vault) validVault(vault) {
        bytes32 hashedId = keccak256(abi.encodePacked(recoveryId));
        
        // Clear old recovery ID if exists
        bytes32 oldId = recoveryIdOfVault[vault];
        if (oldId != bytes32(0) && oldId != hashedId) {
            _removeRecoveryVault(oldId, vault);
        }

        _addRecoveryVault(hashedId, vault);
        recoveryIdOfVault[vault] = hashedId;
        
        emit RecoveryIdSet(vault, hashedId);
    }
    
    /**
     * @notice Set email hash for recovery lookup
     * @dev Email is hashed client-side before sending to preserve privacy
     * @param vault The vault address  
     * @param emailHash keccak256(lowercase(email))
     */
    function setEmailRecovery(
        address vault,
        bytes32 emailHash
    ) external onlyVaultOwner(vault) validVault(vault) {
        if (vaultByEmailHash[emailHash] != address(0) && vaultByEmailHash[emailHash] != vault) {
            revert EmailAlreadyTaken();
        }

        // Clear old email if exists
        bytes32 oldEmail = _getStoredEmailHash(vault);
        if (oldEmail != bytes32(0) && oldEmail != emailHash) {
            delete vaultByEmailHash[oldEmail];
        }
        
        vaultByEmailHash[emailHash] = vault;
        _setStoredEmailHash(vault, emailHash);
        
        emit EmailRecoverySet(vault, emailHash);
    }
    
    /**
     * @notice Set phone hash for recovery lookup
     * @param vault The vault address
     * @param phoneHash keccak256(normalized phone number with country code)
     */
    function setPhoneRecovery(
        address vault,
        bytes32 phoneHash
    ) external onlyVaultOwner(vault) validVault(vault) {
        if (vaultByPhoneHash[phoneHash] != address(0) && vaultByPhoneHash[phoneHash] != vault) {
            revert PhoneAlreadyTaken();
        }

        bytes32 oldPhone = _phoneHashStorage[vault];
        if (oldPhone != bytes32(0) && oldPhone != phoneHash) {
            delete vaultByPhoneHash[oldPhone];
        }

        vaultByPhoneHash[phoneHash] = vault;
        _phoneHashStorage[vault] = phoneHash;
        emit PhoneRecoverySet(vault, phoneHash);
    }
    
    /**
     * @notice Set a unique username for vault lookup
     * @dev Human-readable identifier, must be unique across all vaults
     * @param vault The vault address
     * @param username Desired username (will be lowercased and hashed)
     */
    function setUsername(
        address vault,
        string calldata username
    ) external onlyVaultOwner(vault) validVault(vault) {
        bytes32 hashedUsername = keccak256(abi.encodePacked(_toLower(username)));
        
        if (usernameTaken[hashedUsername] && vaultByUsernameHash[hashedUsername] != vault) {
            revert UsernameAlreadyTaken();
        }
        
        bytes32 oldUsername = _usernameHashStorage[vault];
        if (oldUsername != bytes32(0) && oldUsername != hashedUsername) {
            delete vaultByUsernameHash[oldUsername];
            usernameTaken[oldUsername] = false;
        }
        
        vaultByUsernameHash[hashedUsername] = vault;
        usernameTaken[hashedUsername] = true;
        _usernameHashStorage[vault] = hashedUsername;
        
        emit UsernameSet(vault, hashedUsername);
    }
    
    /**
     * @notice Register a guardian relationship for lookup
     * @dev Called when vault owner adds a guardian
     */
    function registerGuardian(
        address vault,
        address guardian
    ) external onlyVaultOwner(vault) validVault(vault) {
        if (!_isGuardianOf[guardian][vault]) {
            _isGuardianOf[guardian][vault] = true;
            require(vaultsGuardedBy[guardian].length < 100, "VR: guardian cap"); // I-11
            require(guardianCountOfVault[vault] < 20, "VR: max guardians per vault");
            vaultsGuardedBy[guardian].push(vault);
            guardianCountOfVault[vault]++;
            emit GuardianRegistered(vault, guardian);
        }
    }
    
    /**
     * @notice Remove guardian from registry
     */
    function removeGuardian(
        address vault,
        address guardian
    ) external onlyVaultOwner(vault) validVault(vault) {
        if (_isGuardianOf[guardian][vault]) {
            _isGuardianOf[guardian][vault] = false;
            if (guardianCountOfVault[vault] > 0) {
                guardianCountOfVault[vault]--;
            }
            
            // Remove from array (swap and pop)
            address[] storage guardedVaults = vaultsGuardedBy[guardian];
            for (uint256 i = 0; i < guardedVaults.length; i++) {
                if (guardedVaults[i] == vault) {
                    guardedVaults[i] = guardedVaults[guardedVaults.length - 1];
                    guardedVaults.pop();
                    break;
                }
            }
            
            emit GuardianRemoved(vault, guardian);
        }
    }
    
    /**
     * @notice Update badge fingerprint for vault
     * @dev Called periodically or when badges change to enable badge-based lookup
     */
    function updateBadgeFingerprint(address vault) external validVault(vault) {
        address owner = vaultHub.ownerOfVault(vault);
        
        if (address(badgeManager) != address(0)) {
            uint256[] memory badges = badgeManager.getUserBadges(owner);
            
            if (badges.length > 0) {
                // Create unique fingerprint from badge IDs
                bytes32 fingerprint = keccak256(abi.encodePacked(badges));
                vaultByBadgeFingerprint[fingerprint] = vault;
                emit BadgeFingerprintUpdated(vault, fingerprint);
            }
        }
    }
    
    /**
     * @notice Update vault activity timestamp
     * @dev Restricted to vault owner, vault contract itself, vaultHub, or registry owner
     *      to prevent arbitrary manipulation of trust signals.
     */
    function updateActivity(address vault) external {
        if (!vaultHub.isVault(vault)) return;
        address vaultOwner = vaultHub.ownerOfVault(vault);
        require(
            msg.sender == vaultOwner ||
            msg.sender == vault ||
            msg.sender == address(vaultHub) ||
            msg.sender == owner,
            "VR: not authorized"
        );
        vaultLastActiveAt[vault] = block.timestamp;
        emit VaultActivityUpdated(vault, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SEARCH FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Search vault by recovery ID
     * @param recoveryId The plaintext recovery ID the user remembers
     * @return vault The vault address if found, address(0) if not
     */
    function searchByRecoveryId(string calldata recoveryId) external view returns (address vault) {
        bytes32 hashedId = keccak256(abi.encodePacked(recoveryId));
        address[] storage matches = vaultsByRecoveryId[hashedId];
        if (matches.length == 0) return address(0);
        return matches[0];
    }

    /**
     * @notice FINAL-06: Return all vault matches for a recovery ID hash (collision-safe lookup)
     */
    function searchByRecoveryIdAll(string calldata recoveryId) external view returns (address[] memory vaults) {
        bytes32 hashedId = keccak256(abi.encodePacked(recoveryId));
        return vaultsByRecoveryId[hashedId];
    }
    
    /**
     * @notice Search vault by email hash
     * @param emailHash keccak256(lowercase(email))
     * @return vault The vault address if found
     */
    function searchByEmail(bytes32 emailHash) external view returns (address vault) {
        return vaultByEmailHash[emailHash];
    }
    
    /**
     * @notice Search vault by phone hash
     * @param phoneHash keccak256(normalized phone)
     * @return vault The vault address if found
     */
    function searchByPhone(bytes32 phoneHash) external view returns (address vault) {
        return vaultByPhoneHash[phoneHash];
    }
    
    /**
     * @notice Search vault by username
     * @param username The username to search for
     * @return vault The vault address if found
     */
    function searchByUsername(string calldata username) external view returns (address vault) {
        bytes32 hashedUsername = keccak256(abi.encodePacked(_toLower(username)));
        return vaultByUsernameHash[hashedUsername];
    }
    
    /**
     * @notice Get all vaults a guardian is protecting
     * @param guardian The guardian address
     * @return vaults Array of vault addresses
     */
    function searchByGuardian(address guardian) external view returns (address[] memory vaults) {
        return vaultsGuardedBy[guardian];
    }
    
    /**
     * @notice Search vault by badge fingerprint
     * @param badgeIds Array of badge IDs the user remembers having
     * @return vault The vault address if found
     */
    function searchByBadges(uint256[] calldata badgeIds) external view returns (address vault) {
        bytes32 fingerprint = keccak256(abi.encodePacked(badgeIds));
        return vaultByBadgeFingerprint[fingerprint];
    }
    
    /**
     * @notice Search vault by full old wallet address
     * @dev User may have their old address saved in email confirmations, browser history, etc.
     * @param oldWallet The full wallet address the user remembers
     * @return vault The vault address if found
     * @return info Vault information for verification
     */
    function searchByWalletAddress(address oldWallet) external view returns (address vault, VaultInfo memory info) {
        vault = vaultHub.vaultOf(oldWallet);
        if (vault != address(0) && vaultHub.isVault(vault)) {
            info = getVaultInfo(vault);
        }
    }
    
    /**
     * @notice Search vault by vault address directly
     * @dev User may have their vault address saved from transaction history
     * @param vaultAddress The vault address
     * @return info Vault information
     */
    function searchByVaultAddress(address vaultAddress) external view returns (VaultInfo memory info) {
        if (vaultHub.isVault(vaultAddress)) {
            info = getVaultInfo(vaultAddress);
        }
    }
    
    /**
     * @notice Search vaults created in a time range
     * @dev Helps users who remember approximately when they created their vault
     * @param startTime Unix timestamp for range start
     * @param endTime Unix timestamp for range end
     * @param limit Maximum results to return
     * @return matches Array of matching vault info
     */
    /// @param offset Start index into allVaults for pagination (0 = beginning).
    ///               Call again with returned nextOffset to continue scanning.
    function searchByCreationTime(
        uint256 startTime,
        uint256 endTime,
        uint256 limit,
        uint256 offset
    ) external view returns (VaultInfo[] memory matches, uint256 nextOffset) {
        require(startTime < endTime, "invalid range");
        require(limit > 0 && limit <= 50, "limit 1-50");

        uint256 total = allVaults.length;
        uint256 batchEnd = offset + 1000; // scan up to 1000 entries per call
        if (batchEnd > total) batchEnd = total;

        // Single-pass: collect up to `limit` matches into a temp array
        VaultInfo[] memory tmp = new VaultInfo[](limit);
        uint256 matchCount = 0;
        uint256 lastChecked = batchEnd;

        for (uint256 i = offset; i < batchEnd && matchCount < limit; i++) {
            address vault = allVaults[i];
            uint256 created = vaultCreatedAt[vault];
            if (created >= startTime && created <= endTime) {
                tmp[matchCount] = getVaultInfo(vault);
                matchCount++;
            }
            lastChecked = i + 1;
        }

        matches = new VaultInfo[](matchCount);
        for (uint256 j = 0; j < matchCount; j++) {
            matches[j] = tmp[j];
        }
        // nextOffset == total signals caller that the full range has been scanned
        nextOffset = lastChecked < total ? lastChecked : total;
    }
    
    /**
     * @notice Get vault by index (for pagination/browsing)
     * @dev Allows users to browse vaults if they remember approximate creation order
     * @param index The vault index
     * @return vault The vault address
     * @return info Vault information
     */
    function getVaultByIndex(uint256 index) external view returns (address vault, VaultInfo memory info) {
        require(index < allVaults.length, "index out of bounds");
        vault = allVaults[index];
        info = getVaultInfo(vault);
    }
    
    /**
     * @notice Get total number of registered vaults
     */
    function getTotalVaults() external view returns (uint256) {
        return allVaults.length;
    }

    /**
     * @notice Search vaults by partial old wallet address
     * @dev For users who remember part of their old address
     * @param addressPrefix First bytes of the address they remember (e.g., "0x1234")
     * @param limit Maximum results to return
     * @return matches Array of matching vault info
     */
    /// @param offset Start index into allVaults for pagination (0 = beginning).
    function searchByAddressPrefix(
        bytes4 addressPrefix,
        uint256 limit,
        uint256 offset
    ) external view returns (VaultInfo[] memory matches, uint256 nextOffset) {
        require(limit > 0 && limit <= 50, "limit 1-50");

        uint256 total = allVaults.length;
        uint256 batchEnd = offset + 1000;
        if (batchEnd > total) batchEnd = total;

        VaultInfo[] memory tmp = new VaultInfo[](limit);
        uint256 matchCount = 0;
        uint256 lastChecked = batchEnd;

        for (uint256 i = offset; i < batchEnd && matchCount < limit; i++) {
            address vault = allVaults[i];
            address vaultOwner = vaultHub.ownerOfVault(vault);
            if (bytes4(bytes20(vaultOwner)) == addressPrefix) {
                tmp[matchCount] = getVaultInfo(vault);
                matchCount++;
            }
            lastChecked = i + 1;
        }

        matches = new VaultInfo[](matchCount);
        for (uint256 j = 0; j < matchCount; j++) {
            matches[j] = tmp[j];
        }
        nextOffset = lastChecked < total ? lastChecked : total;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get detailed vault info for search results
     */
    function getVaultInfo(address vault) public view returns (VaultInfo memory info) {
        if (!vaultHub.isVault(vault)) revert InvalidVault();
        
        address owner = vaultHub.ownerOfVault(vault);
        
        uint256 proofScore = 0;
        if (address(proofScoreManager) != address(0)) {
            try proofScoreManager.getProofScore(owner) returns (uint256 score) {
                proofScore = score;
            } catch {}
        }
        
        uint256 badgeCount = 0;
        if (address(badgeManager) != address(0)) {
            try badgeManager.getUserBadges(owner) returns (uint256[] memory badges) {
                badgeCount = badges.length;
            } catch {}
        }
        
        info = VaultInfo({
            vault: vault,
            originalOwner: owner,
            createdAt: vaultCreatedAt[vault],
            lastActiveAt: vaultLastActiveAt[vault],
            proofScore: proofScore,
            badgeCount: badgeCount,
            hasGuardians: _hasGuardians(vault),
            hasRecoveryId: recoveryIdOfVault[vault] != bytes32(0),
            isRecoverable: recoveryIdOfVault[vault] != bytes32(0) || _hasGuardians(vault)
        });
    }
    
    /**
     * @notice Check if vault has recovery options set up
     */
    function isRecoverable(address vault) external view returns (bool) {
        return recoveryIdOfVault[vault] != bytes32(0) || _hasGuardians(vault);
    }
    
    /**
     * @notice Get total registered vaults
     */
    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }
    
    /**
     * @notice Check if a recovery ID is available
     */
    function isRecoveryIdAvailable(string calldata recoveryId) external view returns (bool) {
        bytes32 hashedId = keccak256(abi.encodePacked(recoveryId));
        return vaultsByRecoveryId[hashedId].length == 0;
    }

    function _addRecoveryVault(bytes32 hashedId, address vault) internal {
        address[] storage matches = vaultsByRecoveryId[hashedId];
        for (uint256 i = 0; i < matches.length; i++) {
            if (matches[i] == vault) {
                // Already present: keep primary pointer consistent and return.
                if (vaultByRecoveryId[hashedId] == address(0)) {
                    vaultByRecoveryId[hashedId] = vault;
                }
                return;
            }
        }
        matches.push(vault);
        if (vaultByRecoveryId[hashedId] == address(0)) {
            vaultByRecoveryId[hashedId] = vault;
        }
    }

    function _removeRecoveryVault(bytes32 hashedId, address vault) internal {
        address[] storage matches = vaultsByRecoveryId[hashedId];
        uint256 len = matches.length;
        if (len == 0) {
            if (vaultByRecoveryId[hashedId] == vault) delete vaultByRecoveryId[hashedId];
            return;
        }

        for (uint256 i = 0; i < len; i++) {
            if (matches[i] == vault) {
                matches[i] = matches[len - 1];
                matches.pop();
                break;
            }
        }

        if (matches.length == 0) {
            delete vaultByRecoveryId[hashedId];
        } else {
            vaultByRecoveryId[hashedId] = matches[0];
        }
    }
    
    /**
     * @notice Check if a username is available
     */
    function isUsernameAvailable(string calldata username) external view returns (bool) {
        bytes32 hashedUsername = keccak256(abi.encodePacked(_toLower(username)));
        return !usernameTaken[hashedUsername];
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    function setVaultHub(address _vaultHub) external onlyOwner {
        if (_vaultHub == address(0)) revert ZeroAddress();
        vaultHub = IVaultInfrastructure(_vaultHub);
        emit VaultHubSet(_vaultHub);
    }
    
    function setBadgeManager(address _badgeManager) external onlyOwner {
        badgeManager = IBadgeManager(_badgeManager);
        emit BadgeManagerSet(_badgeManager);
    }
    
    function setProofScoreManager(address _proofScoreManager) external onlyOwner {
        proofScoreManager = IProofScoreManager(_proofScoreManager);
        emit ProofScoreManagerSet(_proofScoreManager);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    function _hasGuardians(address vault) internal view returns (bool) {
        return guardianCountOfVault[vault] > 0;
    }
    
    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        
        for (uint256 i = 0; i < bStr.length; i++) {
            if (uint8(bStr[i]) >= 65 && uint8(bStr[i]) <= 90) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        
        return string(bLower);
    }
    
    // Email hash storage (using a slot mapping pattern)
    mapping(address => bytes32) private _emailHashStorage;
    mapping(address => bytes32) private _phoneHashStorage;
    mapping(address => bytes32) private _usernameHashStorage;
    
    function _getStoredEmailHash(address vault) internal view returns (bytes32) {
        return _emailHashStorage[vault];
    }
    
    function _setStoredEmailHash(address vault, bytes32 emailHash) internal {
        _emailHashStorage[vault] = emailHash;
    }
}
