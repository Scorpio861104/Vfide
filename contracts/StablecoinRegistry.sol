// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

interface IERC20MetadataSR {
    function decimals() external view returns (uint8);
}

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
    event GovernanceSet(address indexed previousGovernance, address indexed newGovernance);
    event ChangeQueued(ChangeAction indexed action, address indexed token, bool allowed, uint8 decimals, string symbol, address treasury, uint64 executeAfter);
    event ChangeApplied(ChangeAction indexed action, address indexed token, bool allowed, uint8 decimals, string symbol, address treasury);
    event ChangeCanceled(ChangeAction indexed action, address indexed token, bool allowed, uint8 decimals, string symbol, address treasury);
    
    error SR_Zero();
    error SR_AlreadyAdded();
    error SR_NotFound();
    error SR_Bounds();
    error SR_NotGovernance();
    error SR_DecimalsMismatch();
    error SR_GovernanceUpdateNotAuthorized();
    error SR_NoPendingChange();
    error SR_TimelockActive();
    error SR_PendingExists();

    uint8 public constant MIN_DECIMALS = 1;
    uint8 public constant MAX_DECIMALS = 18;
    uint8 public constant MAX_SYMBOL_LENGTH = 16;
    address public governance;
    uint64 public constant CHANGE_DELAY = 48 hours;

    enum ChangeAction { None, AddStablecoin, RemoveStablecoin, SetAllowed, SetTreasury }

    struct PendingChange {
        ChangeAction action;
        address token;
        bool allowed;
        uint8 decimals;
        string symbol;
        address treasury;
        uint64 executeAfter;
    }

    PendingChange public pendingChange;

    modifier onlyGovernance() {
        if (msg.sender != governance) revert SR_NotGovernance();
        _;
    }
    
    constructor() {
        governance = msg.sender;
        emit GovernanceSet(address(0), msg.sender);
    }

    function setGovernance(address newGovernance) external {
        if (newGovernance == address(0)) revert SR_Zero();

        // Security hardening: governance controls governance rotation.
        // Bootstrap still works because constructor initializes governance to deployer.
        if (msg.sender != governance) {
            revert SR_GovernanceUpdateNotAuthorized();
        }

        address previousGovernance = governance;
        governance = newGovernance;
        emit GovernanceSet(previousGovernance, newGovernance);
    }
    
    /**
     * @notice Add a stablecoin to the registry
     * @param token Address of the stablecoin
     * @param decimals Decimals of the token (e.g., 6 for USDC/USDT, 18 for DAI)
     * @param symbol Symbol for reference (e.g., "USDC")
     */
    function addStablecoin(address token, uint8 decimals, string calldata symbol) external onlyGovernance whenNotPaused {
        if (token == address(0)) revert SR_Zero();
        if (stablecoins[token].allowed) revert SR_AlreadyAdded();
        if (decimals < MIN_DECIMALS || decimals > MAX_DECIMALS) revert SR_Bounds();
        uint256 symbolLength = bytes(symbol).length;
        if (symbolLength == 0 || symbolLength > MAX_SYMBOL_LENGTH) revert SR_Bounds();
        uint8 reportedDecimals = IERC20MetadataSR(token).decimals();
        if (reportedDecimals != decimals) revert SR_DecimalsMismatch();
        _queueChange(ChangeAction.AddStablecoin, token, true, decimals, symbol, address(0));
    }
    
    /**
     * @notice Remove a stablecoin from the registry
     * @param token Address of the stablecoin to remove
     */
    function removeStablecoin(address token) external onlyGovernance whenNotPaused {
        if (!stablecoins[token].allowed) revert SR_NotFound();
        _queueChange(ChangeAction.RemoveStablecoin, token, false, 0, "", address(0));
    }
    
    /**
     * @notice Enable/disable a stablecoin
     * @param token Address of the stablecoin
     * @param allowed Whether the stablecoin is allowed
     */
    function setAllowed(address token, bool allowed) external onlyGovernance {
        if (token == address(0)) revert SR_Zero();
        if (stablecoins[token].decimals == 0) revert SR_NotFound();
        _queueChange(ChangeAction.SetAllowed, token, allowed, 0, "", address(0));
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
    function setTreasury(address _treasury) external onlyGovernance {
        if (_treasury == address(0)) revert SR_Zero();
        _queueChange(ChangeAction.SetTreasury, address(0), false, 0, "", _treasury);
    }

    function applyQueuedChange() external onlyGovernance {
        PendingChange memory pending = pendingChange;
        if (pending.action == ChangeAction.None || pending.executeAfter == 0) revert SR_NoPendingChange();
        if (block.timestamp < pending.executeAfter) revert SR_TimelockActive();

        delete pendingChange;

        if (pending.action == ChangeAction.AddStablecoin) {
            if (stablecoins[pending.token].allowed) revert SR_AlreadyAdded();
            stablecoins[pending.token] = StablecoinInfo({
                allowed: true,
                decimals: pending.decimals,
                symbol: pending.symbol
            });
            stablecoinList.push(pending.token);
            stablecoinIndexPlusOne[pending.token] = stablecoinList.length;
            emit StablecoinAdded(pending.token, pending.decimals, pending.symbol);
        } else if (pending.action == ChangeAction.RemoveStablecoin) {
            if (!stablecoins[pending.token].allowed) revert SR_NotFound();
            stablecoins[pending.token].allowed = false;

            uint256 idxPlusOne = stablecoinIndexPlusOne[pending.token];
            if (idxPlusOne != 0) {
                uint256 idx = idxPlusOne - 1;
                uint256 lastIdx = stablecoinList.length - 1;
                if (idx != lastIdx) {
                    address moved = stablecoinList[lastIdx];
                    stablecoinList[idx] = moved;
                    stablecoinIndexPlusOne[moved] = idx + 1;
                }
                stablecoinList.pop();
                stablecoinIndexPlusOne[pending.token] = 0;
            }
            emit StablecoinRemoved(pending.token);
        } else if (pending.action == ChangeAction.SetAllowed) {
            if (stablecoins[pending.token].decimals == 0) revert SR_NotFound();
            stablecoins[pending.token].allowed = pending.allowed;
            emit StablecoinUpdated(pending.token, pending.allowed);
        } else if (pending.action == ChangeAction.SetTreasury) {
            if (pending.treasury == address(0)) revert SR_Zero();
            treasury = pending.treasury;
        }

        emit ChangeApplied(pending.action, pending.token, pending.allowed, pending.decimals, pending.symbol, pending.treasury);
    }

    function cancelQueuedChange() external onlyGovernance {
        PendingChange memory pending = pendingChange;
        if (pending.action == ChangeAction.None || pending.executeAfter == 0) revert SR_NoPendingChange();
        delete pendingChange;
        emit ChangeCanceled(pending.action, pending.token, pending.allowed, pending.decimals, pending.symbol, pending.treasury);
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
        infos = new StablecoinInfo[](stablecoinList.length);
        
        for (uint256 i = 0; i < stablecoinList.length; i++) {
            infos[i] = stablecoins[stablecoinList[i]];
        }
    }
    
    /**
     * @notice Get count of allowed stablecoins
     */
    function allowedCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < stablecoinList.length; i++) {
            if (stablecoins[stablecoinList[i]].allowed) {
                count++;
            }
        }
    }

    function pause() external onlyGovernance { _pause(); }
    function unpause() external onlyGovernance { _unpause(); }

    function _queueChange(
        ChangeAction action,
        address token,
        bool allowed,
        uint8 decimals,
        string memory symbol,
        address treasuryAddress
    ) internal {
        if (pendingChange.action != ChangeAction.None && pendingChange.executeAfter != 0) {
            revert SR_PendingExists();
        }

        pendingChange = PendingChange({
            action: action,
            token: token,
            allowed: allowed,
            decimals: decimals,
            symbol: symbol,
            treasury: treasuryAddress,
            executeAfter: uint64(block.timestamp) + CHANGE_DELAY
        });

        emit ChangeQueued(action, token, allowed, decimals, symbol, treasuryAddress, pendingChange.executeAfter);
    }
}
