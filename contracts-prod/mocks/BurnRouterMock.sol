// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract BurnRouterMock {
    // Configure returns for computeFees
    uint256 public burnAmount;
    uint256 public sanctumAmount;
    address public sanctumSink;
    address public burnSink;

    function set(uint256 _burn, uint256 _sanctum, address _sanctumSink, address _burnSink) external {
        burnAmount = _burn;
        sanctumAmount = _sanctum;
        sanctumSink = _sanctumSink;
        burnSink = _burnSink;
    }

    function computeFees(address /*from*/, address /*to*/, uint256 /*amount*/) external view returns (uint256,uint256,address,address) {
        return (burnAmount, sanctumAmount, sanctumSink, burnSink);
    }
}
