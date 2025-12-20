// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract BurnRouterMock {
    // Configure returns for computeFees
    uint256 public burnAmount;
    uint256 public sanctumAmount;
    uint256 public ecosystemAmount;
    address public sanctumSink;
    address public ecosystemSink;
    address public burnSink;

    function set(uint256 _burn, uint256 _sanctum, uint256 _eco, address _sanctumSink, address _ecoSink, address _burnSink) external {
        burnAmount = _burn;
        sanctumAmount = _sanctum;
        ecosystemAmount = _eco;
        sanctumSink = _sanctumSink;
        ecosystemSink = _ecoSink;
        burnSink = _burnSink;
    }

    function computeFees(address /*from*/, address /*to*/, uint256 /*amount*/) external view returns (uint256,uint256,uint256,address,address,address) {
        return (burnAmount, sanctumAmount, ecosystemAmount, sanctumSink, ecosystemSink, burnSink);
    }
}
