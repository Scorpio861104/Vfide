// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockSeerForBurnRouter {
    mapping(address => uint16) public scoreOf;

    function setScore(address user, uint16 score) external {
        scoreOf[user] = score;
    }

    function getScore(address user) external view returns (uint16) {
        return scoreOf[user];
    }
}

interface IRouterRecordBurn {
    function recordBurn(uint256 burnAmount) external;
}

contract MockTokenForBurnRouter {
    uint256 public totalSupply;

    function setTotalSupply(uint256 supply) external {
        totalSupply = supply;
    }

    function relayRecordBurn(address router, uint256 burnAmount) external {
        IRouterRecordBurn(router).recordBurn(burnAmount);
    }
}
