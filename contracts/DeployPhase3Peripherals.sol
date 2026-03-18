// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./BridgeSecurityModule.sol";
import "./VFIDEPriceOracle.sol";

/// @title DeployPhase3Peripherals
/// @notice Deploys BSM and VFIDEPriceOracle (SharedInterfaces-based, no OZ).
/// @dev Separated from DeployPhases3to6.sol to avoid name collisions with
///      VFIDEBridge's OZ imports (H-18 / M-08 / M-29 fix).
contract DeployPhase3Peripherals {
    error DPP_Zero();

    address public bsm;
    address public oracle;

    event PeripheralDeployed(bytes32 indexed name, address indexed addr);

    function deployPeripherals(
        address vfideToken,
        address quoteToken,
        address chainlinkFeed,
        address uniswapPool,
        address owner
    ) external returns (address bsm_, address oracle_) {
        if (vfideToken == address(0) || owner == address(0)) revert DPP_Zero();

        BridgeSecurityModule securityModule = new BridgeSecurityModule(owner, address(0));
        bsm_ = address(securityModule);
        bsm = bsm_;
        emit PeripheralDeployed(bytes32("BSM"), bsm_);

        VFIDEPriceOracle priceOracle = new VFIDEPriceOracle(
            vfideToken,
            quoteToken,
            chainlinkFeed,
            uniswapPool,
            owner
        );
        oracle_ = address(priceOracle);
        oracle = oracle_;
        emit PeripheralDeployed(bytes32("ORC"), oracle_);
    }
}
