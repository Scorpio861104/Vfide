// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockSeerForBurnRouter
/// @title MockSeerForBurnRouter
/// @author Vfide
contract MockSeerForBurnRouter {
    /// @notice scoreOf
    mapping(address => uint16) public scoreOf;

    /// @notice setScore
    /// @param user user
    /// @param score score
    function setScore(address user, uint16 score) external {
        scoreOf[user] = score;
    }

    /// @notice getScore
    /// @param user user
    /// @return _uint16 _uint16
    function getScore(address user) external view returns (uint16) {
        return scoreOf[user];
    }

    /// @notice getCachedScore
    /// @param user user
    /// @return _uint16 _uint16
    function getCachedScore(address user) external view returns (uint16) {
        return scoreOf[user];
    }
}

/// @notice IRouterRecordBurn
/// @title IRouterRecordBurn
/// @author Vfide
interface IRouterRecordBurn {
    /// @notice recordBurn
    /// @param burnAmount burnAmount
    function recordBurn(uint256 burnAmount) external;
}

/// @notice MockTokenForBurnRouter
/// @title MockTokenForBurnRouter
/// @author Vfide
contract MockTokenForBurnRouter {
    /// @notice totalSupply
    uint256 public totalSupply;

    /// @notice setTotalSupply
    /// @param supply supply
    function setTotalSupply(uint256 supply) external {
        totalSupply = supply;
    }

    /// @notice relayRecordBurn
    /// @param router router
    /// @param burnAmount burnAmount
    function relayRecordBurn(address router, uint256 burnAmount) external {
        IRouterRecordBurn(router).recordBurn(burnAmount);
    }
}
