// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../../contracts/interfaces/AggregatorV3Interface.sol";
import "../../contracts/VFIDEPriceOracle.sol";

contract MockChainlinkFeed is AggregatorV3Interface {
    uint8 private _decimals;
    bool public revertDecimals;
    uint80 public roundId;
    int256 public answer;
    uint256 public startedAt;
    uint256 public updatedAt;
    uint80 public answeredInRound;

    constructor(uint8 decimals_, int256 answer_) {
        _decimals = decimals_;
        answer = answer_;
        roundId = 1;
        startedAt = block.timestamp;
        updatedAt = block.timestamp;
        answeredInRound = 1;
    }

    function setRoundData(int256 answer_, uint256 updatedAt_) external {
        roundId += 1;
        answer = answer_;
        startedAt = updatedAt_;
        updatedAt = updatedAt_;
        answeredInRound = roundId;
    }

    function setRevertDecimals(bool shouldRevert) external {
        revertDecimals = shouldRevert;
    }

    function decimals() external view returns (uint8) {
        require(!revertDecimals, "mock decimals revert");
        return _decimals;
    }

    function description() external pure returns (string memory) {
        return "mock";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    function getRoundData(uint80)
        external
        view
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }
}

contract MockUniswapV3PoolLite {
    address public token0;
    address public token1;
    uint160 public spotSqrtPriceX96;
    int24 public twapTick;

    constructor(address token0_, address token1_, uint160 spotSqrtPriceX96_, int24 twapTick_) {
        token0 = token0_;
        token1 = token1_;
        spotSqrtPriceX96 = spotSqrtPriceX96_;
        twapTick = twapTick_;
    }

    function setSpotSqrtPriceX96(uint160 nextSqrtPriceX96) external {
        spotSqrtPriceX96 = nextSqrtPriceX96;
    }

    function setTwapTick(int24 nextTick) external {
        twapTick = nextTick;
    }

    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s)
    {
        tickCumulatives = new int56[](secondsAgos.length);
        secondsPerLiquidityCumulativeX128s = new uint160[](secondsAgos.length);

        uint32 maxAgo = 0;
        for (uint256 i = 0; i < secondsAgos.length; i++) {
            if (secondsAgos[i] > maxAgo) {
                maxAgo = secondsAgos[i];
            }
        }

        int56 current = int56(twapTick) * int56(uint56(maxAgo));
        for (uint256 i = 0; i < secondsAgos.length; i++) {
            tickCumulatives[i] = current - (int56(twapTick) * int56(uint56(secondsAgos[i])));
        }
    }

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        )
    {
        return (spotSqrtPriceX96, 0, 0, 0, 0, 0, true);
    }
}

contract VFIDEPriceOracleHarness is VFIDEPriceOracle {
    constructor(
        address vfideToken_,
        address quoteToken_,
        address chainlinkFeed_,
        address uniswapPool_,
        address owner_
    ) VFIDEPriceOracle(vfideToken_, quoteToken_, chainlinkFeed_, uniswapPool_, owner_) {}

    function calculateDeviationExternal(uint256 oldPrice, uint256 newPrice) external pure returns (uint256) {
        return _calculateDeviation(oldPrice, newPrice);
    }
}