// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./SharedInterfaces.sol";
import { Seer } from "./Seer.sol";
import "./BadgeRegistry.sol";

/**
 * @title VFIDEBadgeNFT
 * @notice Soulbound NFT representation of VFIDE badges
 * @dev Implements ERC-5192 (Minimal Soulbound NFTs) - Non-transferable achievement tokens
 * 
 * Philosophy: Badges are earned through actions, commemorated as NFTs, but never sold.
 * 
 * Key Features:
 * - Lazy minting: Users mint NFTs for badges they've earned (verified via Seer)
 * - Soulbound: Cannot be transferred (except burn)
 * - Provenance: Stores mint timestamp and badge number
 * - Metadata: Rich JSON with images, descriptions, rarity
 * - Synced with Seer: NFT requires active badge in Seer contract
 */
contract VFIDEBadgeNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard {
    
    // ============ STATE VARIABLES ============
    
    Seer public immutable seer;
    
    /// @notice Base URI for token metadata
    string private _baseTokenURI;
    
    /// @notice Counter for unique token IDs
    uint256 private _nextTokenId;
    
    /// @notice Track which badge each token represents
    /// tokenId => badge ID
    mapping(uint256 => bytes32) public tokenBadge;
    
    /// @notice Track mint order for each badge type
    /// badge ID => total minted count
    mapping(bytes32 => uint256) public badgeMintCount;
    
    /// @notice Track which user minted which badge
    /// user => badge ID => tokenId (0 if not minted)
    mapping(address => mapping(bytes32 => uint256)) public userBadgeToken;
    
    /// @notice Mint timestamp for provenance
    /// tokenId => timestamp
    mapping(uint256 => uint256) public mintTimestamp;
    
    /// @notice Badge number within type (e.g., "Pioneer #2,847")
    /// tokenId => badge number
    mapping(uint256 => uint256) public badgeNumber;
    
    // ============ EVENTS ============
    
    /// @notice Emitted when a badge NFT is minted
    event BadgeNFTMinted(
        address indexed user,
        uint256 indexed tokenId,
        bytes32 indexed badge,
        uint256 badgeNumber,
        uint256 timestamp
    );
    
    /// @notice Emitted when a badge NFT is burned (badge lost/revoked)
    event BadgeNFTBurned(
        address indexed user,
        uint256 indexed tokenId,
        bytes32 indexed badge
    );
    
    /// @notice ERC-5192: Emitted when token is locked (soulbound)
    event Locked(uint256 tokenId);
    
    // ============ ERRORS ============
    
    error BadgeNotEarned(bytes32 badge);
    error BadgeAlreadyMinted(bytes32 badge);
    error BadgeExpired(bytes32 badge);
    error TokenIsSoulbound();
    error InvalidBadge();
    error NotTokenOwner();
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        address _seer,
        string memory _baseURI
    ) ERC721("VFIDE Badge", "VBADGE") {
        seer = Seer(_seer);
        _baseTokenURI = _baseURI;
        _nextTokenId = 1; // Start at 1 (0 = unminted)
    }
    
    // ============ MINTING ============
    
    /**
     * @notice Mint an NFT for a badge you've earned
     * @param badge The badge ID to mint
     * @dev Verifies badge ownership via Seer contract before minting
     */
    function mintBadge(bytes32 badge) public nonReentrant returns (uint256 tokenId) {
        // Check badge is valid
        if (!BadgeRegistry.isValidBadge(badge)) revert InvalidBadge();
        
        // Check user hasn't already minted this badge
        if (userBadgeToken[msg.sender][badge] != 0) revert BadgeAlreadyMinted(badge);
        
        // Verify user has earned this badge in Seer
        if (!seer.hasBadge(msg.sender, badge)) revert BadgeNotEarned(badge);
        
        // Check badge hasn't expired
        uint256 expiry = seer.badgeExpiry(msg.sender, badge);
        if (expiry > 0 && block.timestamp > expiry) revert BadgeExpired(badge);
        
        // Mint the NFT
        tokenId = _nextTokenId++;
        badgeMintCount[badge]++;
        uint256 badgeNum = badgeMintCount[badge];
        
        // Store metadata BEFORE _safeMint to prevent reentrancy via onERC721Received
        tokenBadge[tokenId] = badge;
        userBadgeToken[msg.sender][badge] = tokenId;
        mintTimestamp[tokenId] = block.timestamp;
        badgeNumber[tokenId] = badgeNum;
        
        _safeMint(msg.sender, tokenId);
        
        // Lock the token (soulbound)
        emit Locked(tokenId);
        
        emit BadgeNFTMinted(msg.sender, tokenId, badge, badgeNum, block.timestamp);
        
        return tokenId;
    }
    
    /**
     * @notice Batch mint multiple badges at once
     * @param badges Array of badge IDs to mint
     * @return tokenIds Array of minted token IDs
     */
    function mintBadges(bytes32[] calldata badges) external returns (uint256[] memory tokenIds) {
        require(badges.length <= 28, "BADGE: batch too large");
        tokenIds = new uint256[](badges.length);
        
        for (uint256 i = 0; i < badges.length; i++) {
            tokenIds[i] = mintBadge(badges[i]);
        }
        
        return tokenIds;
    }
    
    /**
     * @notice Burn badge NFT (if badge was revoked or user wants to remove it)
     * @param tokenId The token ID to burn
     * @dev Only token owner can burn. Doesn't affect badge status in Seer.
     */
    function burnBadge(uint256 tokenId) external nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        
        bytes32 badge = tokenBadge[tokenId];
        
        // Clear mappings
        delete userBadgeToken[msg.sender][badge];
        delete tokenBadge[tokenId];
        delete mintTimestamp[tokenId];
        delete badgeNumber[tokenId];
        
        _burn(tokenId);
        
        emit BadgeNFTBurned(msg.sender, tokenId, badge);
    }
    
    // ============ SOULBOUND ENFORCEMENT (ERC-5192) ============
    
    /**
     * @notice Check if token is locked (soulbound)
     * @dev All VFIDE badges are permanently locked
     */
    function locked(uint256 /* tokenId */) external pure returns (bool) {
        return true;
    }
    
    /**
     * @notice Override _update to prevent transfers (soulbound) and support ERC721Enumerable
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert TokenIsSoulbound();
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Override _increaseBalance for ERC721Enumerable
     */
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    // ============ METADATA ============
    
    /**
     * @notice Get token URI with metadata
     * @param tokenId The token ID
     * @return Full metadata URI
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        _requireOwned(tokenId);
        
        bytes32 badge = tokenBadge[tokenId];
        
        // Build URI: baseURI/BADGE_NAME/tokenId
        return string(abi.encodePacked(
            _baseTokenURI,
            _badgeNameToPath(badge),
            "/",
            _toString(tokenId),
            ".json"
        ));
    }
    
    /**
     * @notice Set base URI for metadata (only owner/DAO)
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @notice Get all badge NFTs owned by a user
     * @param user The user address
     * @return tokens Array of token IDs
     */
    function getBadgesOfUser(address user) external view returns (uint256[] memory tokens) {
        uint256 balance = balanceOf(user);
        tokens = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(user, i);
        }
        
        return tokens;
    }
    
    /**
     * @notice Get badge details for a token
     * @param tokenId The token ID
     * @return badge The badge ID
     * @return name Badge name
     * @return category Badge category
     * @return mintTime When it was minted
     * @return number Badge number (e.g., #2847)
     */
    function getBadgeDetails(uint256 tokenId) external view returns (
        bytes32 badge,
        string memory name,
        string memory category,
        uint256 mintTime,
        uint256 number
    ) {
        _requireOwned(tokenId);
        
        badge = tokenBadge[tokenId];
        name = BadgeRegistry.getName(badge);
        category = BadgeRegistry.getCategory(badge);
        mintTime = mintTimestamp[tokenId];
        number = badgeNumber[tokenId];
        
        return (badge, name, category, mintTime, number);
    }
    
    /**
     * @notice Check if user can mint a specific badge
     * @param user The user address
     * @param badge The badge ID
     * @return canMint True if user can mint
     * @return reason Reason if cannot mint
     */
    function canMintBadge(address user, bytes32 badge) external view returns (
        bool canMint,
        string memory reason
    ) {
        if (userBadgeToken[user][badge] != 0) {
            return (false, "Already minted");
        }
        
        if (!seer.hasBadge(user, badge)) {
            return (false, "Badge not earned");
        }
        
        uint256 expiry = seer.badgeExpiry(user, badge);
        if (expiry > 0 && block.timestamp > expiry) {
            return (false, "Badge expired");
        }
        
        return (true, "");
    }
    
    /**
     * @notice Get total minted count for a badge type
     * @param badge The badge ID
     * @return count Total minted
     */
    function getBadgeMintCount(bytes32 badge) external view returns (uint256) {
        return badgeMintCount[badge];
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Emergency burn if badge was revoked in Seer
     * @param tokenId Token to burn
     * @dev Only owner can call. Used if badge revoked but user hasn't burned NFT.
     */
    function adminBurn(uint256 tokenId) external onlyOwner nonReentrant {
        address owner = ownerOf(tokenId);
        bytes32 badge = tokenBadge[tokenId];
        
        // Verify badge is actually revoked in Seer
        require(!seer.hasBadge(owner, badge), "Badge still active");
        
        // Clear mappings
        delete userBadgeToken[owner][badge];
        delete tokenBadge[tokenId];
        delete mintTimestamp[tokenId];
        delete badgeNumber[tokenId];
        
        _burn(tokenId);
        
        emit BadgeNFTBurned(owner, tokenId, badge);
    }
    
    // ============ INTERNAL HELPERS ============
    
    function _badgeNameToPath(bytes32 badge) internal pure returns (string memory) {
        // Convert badge ID to URL-safe path
        // e.g., "PIONEER" => "pioneer"
        string memory name = BadgeRegistry.getName(badge);
        return _toLowerCase(name);
    }
    
    function _toLowerCase(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        
        for (uint i = 0; i < bStr.length; i++) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        
        return string(bLower);
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
    
    // ============ OVERRIDES ============
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        // ERC-5192 interface ID
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }

}
