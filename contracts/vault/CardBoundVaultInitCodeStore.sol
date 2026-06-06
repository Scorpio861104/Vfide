// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Minimal interface for CardBoundVault creation-code chunk contracts.
interface ICardBoundVaultInitCodeChunk {
    function get() external pure returns (bytes memory);
}

/// @notice Provides CardBoundVault creation bytecode to CardBoundVaultDeployer by
///         concatenating four EIP-3860-safe chunk contracts.
/// @dev The prior monolithic store embedded the full creation bytecode in a single
///      contract and exceeded EIP-3860. Splitting the bytecode keeps each deployed
///      helper under the initcode limit while preserving the deployer's CREATE2
///      address calculation and deployment flow.
/// @title CardBoundVaultInitCodeStore
/// @author Vfide
contract CardBoundVaultInitCodeStore {
    /// @notice The keccak256 hash of the reconstructed CardBoundVault creation bytecode.
    bytes32 public immutable creationCodeHash;

    /// @notice chunk0
    address public immutable chunk0;
    /// @notice chunk1
    address public immutable chunk1;
    /// @notice chunk2
    address public immutable chunk2;
    /// @notice chunk3
    address public immutable chunk3;

    error CBVICS_Zero();

    constructor(address _chunk0, address _chunk1, address _chunk2, address _chunk3) {
        if (_chunk0 == address(0) || _chunk1 == address(0) || _chunk2 == address(0) || _chunk3 == address(0)) {
            revert CBVICS_Zero();
        }
        chunk0 = _chunk0;
        chunk1 = _chunk1;
        chunk2 = _chunk2;
        chunk3 = _chunk3;
        creationCodeHash = keccak256(_getCreationCode(_chunk0, _chunk1, _chunk2, _chunk3));
    }

    /// @notice Returns the full creation bytecode of CardBoundVault without constructor arguments.
    /// @return The CardBoundVault creation bytecode.
    function getCreationCode() external view returns (bytes memory) {
        return _getCreationCode(chunk0, chunk1, chunk2, chunk3);
    }

    function _getCreationCode(address _chunk0, address _chunk1, address _chunk2, address _chunk3) internal view returns (bytes memory) {
        return bytes.concat(
            ICardBoundVaultInitCodeChunk(_chunk0).get(),
            ICardBoundVaultInitCodeChunk(_chunk1).get(),
            ICardBoundVaultInitCodeChunk(_chunk2).get(),
            ICardBoundVaultInitCodeChunk(_chunk3).get()
        );
    }
}
