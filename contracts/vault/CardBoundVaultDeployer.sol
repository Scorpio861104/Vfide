// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { CardBoundVault } from "./CardBoundVault.sol";

/// @notice CardBoundVaultDeployer
/// @title CardBoundVaultDeployer
/// @author Vfide
contract CardBoundVaultDeployer {
    /// @notice vaultHub
    address public immutable vaultHub;

    /// @notice CBD_OnlyHub
    error CBD_OnlyHub();

    /// @notice constructor
    constructor() {
        vaultHub = msg.sender;
    }

    /// @notice predict
    /// @param hub hub
    /// @param vfideToken vfideToken
    /// @param owner_ owner_
    /// @param guardianThreshold guardianThreshold
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyLimit dailyLimit
    /// @param ledger ledger
    /// @return predicted predicted
    function predict(
        address hub,
        address vfideToken,
        address owner_,
        uint8 guardianThreshold,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger
    ) external view returns (address predicted) {
        // XCHAIN-4 FIX: chain-aware CREATE2 prediction.
        //
        // Standard EVM (Base, Polygon, Optimism, Arbitrum, Mainnet)
        // uses the formula:
        //   address = keccak256(0xff || deployer || salt || keccak256(creationCode))[12:]
        //
        // zkSync Era uses a different formula:
        //   address = keccak256(zksyncCreate2Prefix || deployer || salt
        //              || keccak256(bytecodeHash) || keccak256(constructorInputHash))[12:]
        // where zksyncCreate2Prefix = keccak256("zksyncCreate2") and
        // bytecodeHash is the EraVM-specific bytecode-hash artifact
        // produced by the zksolc compiler, NOT keccak256 of the
        // creation bytecode. This artifact is not available from
        // within Solidity at runtime — it lives only in the
        // compilation output.
        //
        // Because the zksolc artifact isn't reachable from inside the
        // contract, we do NOT attempt zkSync-formula prediction here.
        // Instead, we detect the chain at runtime and:
        //   - On standard EVM chains: return the EVM-formula prediction (existing behavior)
        //   - On zkSync chains (324 mainnet, 300 testnet): revert with
        //     a clear error directing the caller to use the off-chain
        //     zkSync address-prediction utility (see lib/crypto/zkSyncAddress.ts)
        //
        // The frontend's `useVaultOperations` hook (and any other
        // caller of `predict`) must check the chain ID first and route
        // to the off-chain predictor on zkSync. This is enforced via
        // the lib/crypto/zkSyncAddress.ts helper added in v19.11.
        uint256 chainId = block.chainid;
        if (chainId == 324 || chainId == 300) {
            // zkSync mainnet (324) or zkSync Sepolia (300)
            revert("CBD_zkSync_predict_off-chain_only");
        }

        bytes32 salt = _salt(owner_, hub, vfideToken, maxPerTransfer, dailyLimit, ledger);
        bytes32 codeHash = keccak256(
            _creationCode(hub, vfideToken, owner_, guardianThreshold, maxPerTransfer, dailyLimit, ledger)
        );
        predicted = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            address(this),
                            salt,
                            codeHash
                        )
                    )
                )
            )
        );
    }

    /// @notice deploy
    /// @param hub hub
    /// @param vfideToken vfideToken
    /// @param owner_ owner_
    /// @param guardianThreshold guardianThreshold
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyLimit dailyLimit
    /// @param ledger ledger
    /// @return vault vault
    function deploy(
        address hub,
        address vfideToken,
        address owner_,
        uint8 guardianThreshold,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger
    ) external returns (address vault) {
        if (msg.sender != vaultHub) revert CBD_OnlyHub();

        address[] memory guardians = new address[](1);
        guardians[0] = owner_;

        vault = address(
            new CardBoundVault{salt: _salt(owner_, hub, vfideToken, maxPerTransfer, dailyLimit, ledger)}(
                hub,
                vfideToken,
                owner_,
                owner_,
                guardians,
                guardianThreshold,
                maxPerTransfer,
                dailyLimit,
                ledger
            )
        );
    }

    /// @notice _creationCode
    /// @param hub hub
    /// @param vfideToken vfideToken
    /// @param owner_ owner_
    /// @param guardianThreshold guardianThreshold
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyLimit dailyLimit
    /// @param ledger ledger
    /// @return _bytes _bytes
    function _creationCode(
        address hub,
        address vfideToken,
        address owner_,
        uint8 guardianThreshold,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger
    ) internal pure returns (bytes memory) {
        address[] memory guardians = new address[](1);
        guardians[0] = owner_;

        return abi.encodePacked(
            type(CardBoundVault).creationCode,
            abi.encode(
                hub,
                vfideToken,
                owner_,
                owner_,
                guardians,
                guardianThreshold,
                maxPerTransfer,
                dailyLimit,
                ledger
            )
        );
    }

    /// @notice _salt
    /// @param owner_ owner_
    /// @param hub hub
    /// @param token token
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyLimit dailyLimit
    /// @param ledger ledger
    /// @return _bytes32 _bytes32
    function _salt(
        address owner_,
        address hub,
        address token,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger
    ) internal pure returns (bytes32) {
        // F-04 FIX: Include configuration in salt so prefunded vault predictions remain reachable
        // even if VaultHub defaults are updated. Each (owner, hub, token, limits, ledger) gets unique salt.
        return keccak256(abi.encodePacked(owner_, hub, token, maxPerTransfer, dailyLimit, ledger));
    }
}