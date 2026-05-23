// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice AggregatorV3Interface
/// @title AggregatorV3Interface
/// @author Vfide
interface AggregatorV3Interface {
    /// @notice decimals
    /// @return _uint8 _uint8
    function decimals() external view returns (uint8);

    /// @notice latestRoundData
    /// @return roundId roundId
    /// @return answer answer
    /// @return startedAt startedAt
    /// @return updatedAt updatedAt
    /// @return answeredInRound answeredInRound
    function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
