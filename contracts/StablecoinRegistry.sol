// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title StablecoinRegistry
 * @notice Manages allowed stablecoins for ecosystem uses
 * @dev Stores decimals and enabled status for each stablecoin
 */
// ReentrancyGuard intentionally omitted: registry state management with no token transfer execution.
contract StablecoinRegistry is Ownable, Pausable {
    struct StablecoinInfo {
        bool allowed;
        uint8 decimals;
        string symbol;
    }
    
    mapping(address => StablecoinInfo) public stablecoins;
    address[] public stablecoinList;
    mapping(address => uint256) private stablecoinIndexPlusOne;
    
    event StablecoinAdded(address indexed token, uint8 decimals, string symbol);
    event StablecoinRemoved(address indexed token);
    event StablecoinUpdated(address indexed token, bool allowed);
    
    error SR_Zero();
    error SR_AlreadyAdded();
    error SR_NotFound();
    error SR_Bounds();

    uint8 public constant MIN_DECIMALS = 1;
    uint8 public constant MAX_DECIMALS = 18;
    uint8 public constant MAX_SYMBOL_LENGTH = 16;
    
    constructor() {}
    
    /**
     * @notice Add a stablecoin to the registry
     * @param token Address of the stablecoin
     * @param decimals Decimals of the token (e.g., 6 for USDC/USDT, 18 for DAI)
     * @param symbol Symbol for reference (e.g., "USDC")
     */
    function addStablecoin(address token, uint8 decimals, string calldata symbol) external onlyOwner whenNotPaused {
        if (token == address(0)) revert SR_Zero();
        if (stablecoins[token].allowed) revert SR_AlreadyAdded();
        if (decimals < MIN_DECIMALS || decimals > MAX_DECIMALS) revert SR_Bounds();
        uint256 symbolLength = bytes(symbol).length;
        if (symbolLength == 0 || symbolLength > MAX_SYMBOL_LENGTH) revert SR_Bounds();
        
        stablecoins[token] = StablecoinInfo({
            allowed: true,
            decimals: decimals,
            symbol: symbol
        });
        stablecoinList.push(token);
        stablecoinIndexPlusOne[token] = stablecoinList.length;
        
        emit StablecoinAdded(token, decimals, symbol);
    }
    
    /**
     * @notice Remove a stablecoin from the registry
     * @param token Address of the stablecoin to remove
     */
    function removeStablecoin(address token) external onlyOwner whenNotPaused {
        if (!stablecoins[token].allowed) revert SR_NotFound();
        
        stablecoins[token].allowed = false;

        uint256 idxPlusOne = stablecoinIndexPlusOne[token];
        if (idxPlusOne != 0) {
            uint256 idx = idxPlusOne - 1;
            uint256 lastIdx = stablecoinList.length - 1;
            if (idx != lastIdx) {
                address moved = stablecoinList[lastIdx];
                stablecoinList[idx] = moved;
                stablecoinIndexPlusOne[moved] = idx + 1;
            }
            stablecoinList.pop();
            stablecoinIndexPlusOne[token] = 0;
        }
        
        emit StablecoinRemoved(token);
    }
    
    /**
     * @notice Enable/disable a stablecoin
     * @param token Address of the stablecoin
     * @param allowed Whether the stablecoin is allowed
     */
    function setAllowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert SR_Zero();
        if (stablecoins[token].decimals == 0) revert SR_NotFound();
        stablecoins[token].allowed = allowed;
        emit StablecoinUpdated(token, allowed);
    }
    
    /**
     * @notice Check if a stablecoin is allowed
     * @param stable Address to check
     * @return Whether the stablecoin is allowed
     */
    function isAllowed(address stable) external view returns (bool) {
        return stablecoins[stable].allowed;
    }
    
    /**
     * @notice Alias for isAllowed - implements IStablecoinRegistry interface
     * @param token Address to check
     * @return Whether the stablecoin is whitelisted
     */
    function isWhitelisted(address token) external view returns (bool) {
        return stablecoins[token].allowed;
    }
    
    /**
     * @notice Get decimals of a stablecoin
     * @param stable Address to check
     * @return Decimals of the stablecoin
     */
    function decimalsOf(address stable) external view returns (uint8) {
        return stablecoins[stable].decimals;
    }
    
    /**
     * @notice Alias for decimalsOf - implements IStablecoinRegistry interface
     * @param token Address to check
     * @return Decimals of the stablecoin
     */
    function tokenDecimals(address token) external view returns (uint8) {
        return stablecoins[token].decimals;
    }
    
    /// @notice Treasury address (for interface compatibility)
    address public treasury;
    
    /// @notice Set treasury address (for interface compatibility)
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert SR_Zero();
        treasury = _treasury;
    }
    
    /**
     * @notice Get all registered stablecoins
     * @return addresses Array of stablecoin addresses
     * @return infos Array of stablecoin info
     */
    function getAllStablecoins() external view returns (
        address[] memory addresses,
        StablecoinInfo[] memory infos
    ) {
        addresses = stablecoinList;
        uint256 length = stablecoinList.length;
        infos = new StablecoinInfo[](length);
        
        for (uint256 i = 0; i < length; i++) {
            infos[i] = stablecoins[stablecoinList[i]];
        }
    }
    
    /**
     * @notice Get count of allowed stablecoins
     */
    function allowedCount() external view returns (uint256 count) {
        uint256 length = stablecoinList.length;
        for (uint256 i = 0; i < length; i++) {
            if (stablecoins[stablecoinList[i]].allowed) {
                count++;
            }
        }
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
