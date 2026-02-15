// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract BridgeSecurityModule {
    address public owner;
    address public bridge;
    bool public paused;

    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);
    event BridgeUpdated(address indexed previousBridge, address indexed newBridge);
    event PauseStatusChanged(bool paused);

    error NotOwner();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyBridge() {
        if (msg.sender != bridge) revert NotOwner();
        _;
    }

    constructor(address _owner, address _bridge) {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
        bridge = _bridge;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnerTransferred(previousOwner, newOwner);
    }

    function setBridge(address newBridge) external onlyOwner {
        if (newBridge == address(0)) revert ZeroAddress();
        address previousBridge = bridge;
        bridge = newBridge;
        emit BridgeUpdated(previousBridge, newBridge);
    }

    function setPaused(bool shouldPause) external onlyOwner {
        paused = shouldPause;
        emit PauseStatusChanged(shouldPause);
    }

    function canBridge(address, uint256) external view returns (bool) {
        return !paused;
    }

    function assertBridgeAllowed(address token, uint256 amount) external view onlyBridge {
        token;
        amount;
        if (paused) revert("Bridge paused");
    }
}
