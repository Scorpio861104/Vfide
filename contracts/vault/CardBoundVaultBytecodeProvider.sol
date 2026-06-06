// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {CardBoundVault} from "./CardBoundVault.sol";

/// @notice ICBVBytecodeProvider — interface used by CardBoundVaultDeployer
///         so the deployer never embeds CardBoundVault initcode directly.
interface ICBVBytecodeProvider {
    function creationCode(
        address hub,
        address vfideToken,
        address owner_,
        address recoveryAddress,
        address[] calldata guardians,
        uint8 guardianThreshold,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger,
        address paymentManager,
        address withdrawalQueue,
        address inheritanceManager,
        address accessManager,
        address adminFacet
    ) external pure returns (bytes memory);
}

/// @notice CardBoundVaultBytecodeProvider
/// @title  CardBoundVaultBytecodeProvider
/// @author Vfide
/// @dev    Holds type(CardBoundVault).creationCode so CardBoundVaultDeployer
///         can use CREATE2 without embedding 54 KB of initcode.
contract CardBoundVaultBytecodeProvider is ICBVBytecodeProvider {
    /// @inheritdoc ICBVBytecodeProvider
    function creationCode(
        address hub,
        address vfideToken,
        address owner_,
        address recoveryAddress,
        address[] calldata guardians,
        uint8 guardianThreshold,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger,
        address paymentManager,
        address withdrawalQueue,
        address inheritanceManager,
        address accessManager,
        address adminFacet
    ) external pure override returns (bytes memory) {
        return abi.encodePacked(
            type(CardBoundVault).creationCode,
            abi.encode(
                hub, vfideToken, owner_, recoveryAddress, guardians,
                guardianThreshold, maxPerTransfer, dailyLimit, ledger,
                paymentManager, withdrawalQueue, inheritanceManager, accessManager, adminFacet
            )
        );
    }
}
