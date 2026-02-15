// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IBridgeSecurityModule {
    function canBridge(address token, uint256 amount) external view returns (bool);
}

contract VFIDEBridge {
    address public owner;
    address public immutable vfideToken;
    address public immutable layerZeroEndpoint;
    address public securityModule;

    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);
    event SecurityModuleUpdated(address indexed previousModule, address indexed newModule);
    event BridgeInitiated(address indexed user, uint256 indexed dstChainId, address indexed recipient, uint256 amount);

    error NotOwner();
    error ZeroAddress();
    error BridgeBlocked();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _vfideToken, address _layerZeroEndpoint, address _owner) {
        if (_vfideToken == address(0) || _owner == address(0)) revert ZeroAddress();
        vfideToken = _vfideToken;
        layerZeroEndpoint = _layerZeroEndpoint;
        owner = _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnerTransferred(previousOwner, newOwner);
    }

    function setSecurityModule(address _securityModule) external onlyOwner {
        if (_securityModule == address(0)) revert ZeroAddress();
        address previousModule = securityModule;
        securityModule = _securityModule;
        emit SecurityModuleUpdated(previousModule, _securityModule);
    }

    function bridge(uint256 dstChainId, address recipient, uint256 amount) external {
        if (recipient == address(0)) revert ZeroAddress();
        if (securityModule != address(0)) {
            bool allowed = IBridgeSecurityModule(securityModule).canBridge(vfideToken, amount);
            if (!allowed) revert BridgeBlocked();
        }

        emit BridgeInitiated(msg.sender, dstChainId, recipient, amount);
    }
}
