// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockLzEndpointForBridge {
    address public delegate;

    function setDelegate(address _delegate) external {
        delegate = _delegate;
    }
}
