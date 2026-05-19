// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface ISeer {
    function getScore(address user) external view returns (uint256);
}

/// @title TrustScorePassport
/// @notice Soulbound ERC-721 NFT representing a user's VFIDE ProofScore tier.
/// @dev Non-transferable. One per address. Dynamic on-chain SVG tokenURI.
contract TrustScorePassport is ERC721, Ownable {
    using Strings for uint256;

    error AlreadyMinted();
    error SoulboundToken();
    error InsufficientScore();

    ISeer public seer;
    uint256 public minScoreToMint = 3000;
    uint256 private _nextTokenId = 1;

    mapping(address => uint256) public passportOf;
    mapping(uint256 => address) public holderOf;

    constructor(address _seer, address _owner) ERC721("VFIDE Trust Passport", "VTP") Ownable(_owner) {
        seer = ISeer(_seer);
    }

    function mint() external {
        if (passportOf[msg.sender] != 0) revert AlreadyMinted();
        uint256 score = seer.getScore(msg.sender);
        if (score < minScoreToMint) revert InsufficientScore();

        uint256 tokenId = _nextTokenId++;
        passportOf[msg.sender] = tokenId;
        holderOf[tokenId] = msg.sender;
        _safeMint(msg.sender, tokenId);
    }

    function hasMinted(address user) external view returns (bool) {
        return passportOf[user] != 0;
    }

    function setMinScoreToMint(uint256 _min) external onlyOwner {
        minScoreToMint = _min;
    }

    function setSeer(address _seer) external onlyOwner {
        seer = ISeer(_seer);
    }

    /// @dev Soulbound: block all transfers
    function transferFrom(address, address, uint256) public pure override {
        revert SoulboundToken();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert SoulboundToken();
    }

    function _tierLabel(uint256 score) internal pure returns (string memory label, string memory color) {
        if (score >= 8000) return ("Elite", "#f59e0b");
        if (score >= 7000) return ("Council", "#8b5cf6");
        if (score >= 6000) return ("Trusted", "#3b82f6");
        if (score >= 5000) return ("Governance", "#10b981");
        if (score >= 3000) return ("Neutral", "#6b7280");
        if (score >= 1000) return ("Low Trust", "#f97316");
        return ("Risky", "#ef4444");
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        address holder = holderOf[tokenId];
        uint256 score = seer.getScore(holder);
        (string memory label, string memory color) = _tierLabel(score);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">',
            '<rect width="400" height="250" rx="16" fill="#0f172a"/>',
            '<rect x="20" y="20" width="360" height="210" rx="12" fill="#1e293b" stroke="', color, '" stroke-width="2"/>',
            '<text x="200" y="70" font-family="monospace" font-size="20" fill="white" text-anchor="middle" font-weight="bold">VFIDE Trust Passport</text>',
            '<text x="200" y="120" font-family="monospace" font-size="36" fill="', color, '" text-anchor="middle" font-weight="bold">', label, '</text>',
            '<text x="200" y="160" font-family="monospace" font-size="18" fill="#94a3b8" text-anchor="middle">Score: ', score.toString(), '</text>',
            '<text x="200" y="210" font-family="monospace" font-size="11" fill="#475569" text-anchor="middle">vfide.xyz | Soulbound Token</text>',
            '</svg>'
        ));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"VFIDE Trust Passport #', tokenId.toString(),
            '","description":"Soulbound trust credential for VFIDE protocol","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Tier","value":"', label, '"},{"trait_type":"Score","value":', score.toString(), '}]}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}
