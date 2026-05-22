// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Moved to contracts/future/ on 2026-05-20 as part of the final mainnet-readiness sweep.
// Import paths updated: BridgeSecurityModule is now a sibling, VFIDEPriceOracle is one level up.
import "./BridgeSecurityModule.sol";
import "../VFIDEPriceOracle.sol";

/// @title DeployPhase3Peripherals
/// @notice Deploys BSM and VFIDEPriceOracle (SharedInterfaces-based, no OZ).
/// @dev Separated from DeployPhases3to6.sol to avoid name collisions with
///      VFIDEBridge's OZ imports (H-18 / M-08 / M-29 fix).
/// @author Vfide
contract DeployPhase3Peripherals {
    /// @notice DPP_Zero
    error DPP_Zero();

    /// @notice bsm
    address public bsm;
    /// @notice oracle
    address public oracle;

    /// @notice PeripheralDeployed
    /// @param name name
    /// @param addr addr
    event PeripheralDeployed(bytes32 indexed name, address indexed addr);

    // slither-disable-next-line missing-zero-check
    /// @notice deployPeripherals
    /// @param vfideToken vfideToken
    /// @param quoteToken quoteToken
    /// @param chainlinkFeed chainlinkFeed
    /// @param uniswapPool uniswapPool
    /// @param owner owner
    /// @return bsm_ bsm_
    /// @return oracle_ oracle_
    function deployPeripherals(
        address vfideToken,
        address quoteToken,
        address chainlinkFeed,
        address uniswapPool,
        address owner
    ) external returns (address bsm_, address oracle_) {
        if (vfideToken == address(0) || owner == address(0)) revert DPP_Zero();

        // BSM requires a non-zero bridge at construction. Use the owner as a temporary
        // bootstrap value, then DeployPhases3to6/phase3 wiring replaces it with the real bridge
        // via setBridge(address(bridge)) immediately after bridge deployment.
        BridgeSecurityModule securityModule = new BridgeSecurityModule(owner, owner);
        bsm_ = address(securityModule);
        if (bsm_ == address(0)) revert DPP_Zero();
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
        if (oracle_ == address(0)) revert DPP_Zero();
        oracle = oracle_;
        emit PeripheralDeployed(bytes32("ORC"), oracle_);
    }
}
