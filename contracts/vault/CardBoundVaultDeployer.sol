// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {CardBoundVaultInitCodeStore} from "./CardBoundVaultInitCodeStore.sol";

/// @notice CardBoundVaultDeployer
/// @title CardBoundVaultDeployer
/// @author Vfide
contract CardBoundVaultDeployer {
    /// @notice vaultHub
    address public vaultHub;

    /// @notice deployerAdmin — one-time authority that binds this helper to its VaultHub.
    address public immutable deployerAdmin;

    /// @notice initCodeStore — holds the CardBoundVault creation bytecode externally
    ///         so it is NOT inlined into this contract's runtime bytecode.
    ///         Without this indirection + low-level CREATE2 the Deployer was 55 KB
    ///         (over EIP-170's 24 KB) because Solidity embeds
    ///         `type(CardBoundVault).creationCode` at every reference site.
    address public immutable initCodeStore;

    /// @notice CBD_OnlyHub
    error CBD_OnlyHub();
    /// @notice CBD_OnlyAdmin
    error CBD_OnlyAdmin();
    /// @notice CBD_AlreadyBound
    error CBD_AlreadyBound();
    /// @notice CBD_Zero
    error CBD_Zero();
    /// @notice CBD_DeployFailed
    error CBD_DeployFailed();

    /// @notice VaultHubBound
    /// @param hub hub
    event VaultHubBound(address indexed hub);

    /// @notice constructor
    /// @param _initCodeStore The CardBoundVaultInitCodeStore contract that holds the
    ///        full CardBoundVault creation bytecode.
    constructor(address _initCodeStore) {
        if (_initCodeStore == address(0)) revert CBD_Zero();
        deployerAdmin = msg.sender;
        initCodeStore = _initCodeStore;
    }

    /// @notice bindVaultHub — one-time binding to the VaultHub that may call deploy().
    /// @param hub The deployed VaultHub address.
    function bindVaultHub(address hub) external {
        if (msg.sender != deployerAdmin) revert CBD_OnlyAdmin();
        if (hub == address(0)) revert CBD_Zero();
        if (vaultHub != address(0)) revert CBD_AlreadyBound();
        vaultHub = hub;
        emit VaultHubBound(hub);
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
    function predict(address hub, address vfideToken, address owner_, uint8 guardianThreshold, uint256 maxPerTransfer, uint256 dailyLimit, address ledger) external view returns (address predicted) {
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
        bytes32 codeHash = keccak256(_creationCode(hub, vfideToken, owner_, guardianThreshold, maxPerTransfer, dailyLimit, ledger));
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, codeHash)))));
    }

    /// @notice deploy — creates a new CardBoundVault via low-level CREATE2.
    ///         Uses assembly CREATE2 instead of `new CardBoundVault{salt:...}(...)`
    ///         to avoid embedding ~54KB of CardBoundVault creation code in this
    ///         contract's runtime bytecode (which was the cause of the EIP-170 violation).
    /// @param hub hub
    /// @param vfideToken vfideToken
    /// @param owner_ owner_
    /// @param guardianThreshold guardianThreshold
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyLimit dailyLimit
    /// @param ledger ledger
    /// @return vault vault
    function deploy(address hub, address vfideToken, address owner_, uint8 guardianThreshold, uint256 maxPerTransfer, uint256 dailyLimit, address ledger) external returns (address vault) {
        if (msg.sender != vaultHub) revert CBD_OnlyHub();

        bytes memory initCode = _creationCode(hub, vfideToken, owner_, guardianThreshold, maxPerTransfer, dailyLimit, ledger);
        bytes32 salt = _salt(owner_, hub, vfideToken, maxPerTransfer, dailyLimit, ledger);

        assembly {
            vault := create2(0, add(initCode, 0x20), mload(initCode), salt)
        }

        if (vault == address(0)) revert CBD_DeployFailed();
    }

    /// @notice _creationCode — returns the full initcode (creation code + constructor args)
    ///         by fetching the creation bytecode from the InitCodeStore contract.
    ///         This avoids embedding ~54 KB of CardBoundVault creation code in this
    ///         contract's own runtime bytecode, which was the cause of the EIP-170 violation.
    /// @param hub hub
    /// @param vfideToken vfideToken
    /// @param owner_ owner_
    /// @param guardianThreshold guardianThreshold
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyLimit dailyLimit
    /// @param ledger ledger
    /// @return _bytes _bytes
    function _creationCode(address hub, address vfideToken, address owner_, uint8 guardianThreshold, uint256 maxPerTransfer, uint256 dailyLimit, address ledger) internal view returns (bytes memory) {
        address[] memory guardians = new address[](1);
        guardians[0] = owner_;

        return abi.encodePacked(CardBoundVaultInitCodeStore(initCodeStore).getCreationCode(), abi.encode(hub, vfideToken, owner_, owner_, guardians, guardianThreshold, maxPerTransfer, dailyLimit, ledger));
    }

    /// @notice _salt
    /// @param owner_ owner_
    /// @param hub hub
    /// @param token token
    /// @param maxPerTransfer maxPerTransfer
    /// @param dailyLimit dailyLimit
    /// @param ledger ledger
    /// @return _bytes32 _bytes32
    function _salt(address owner_, address hub, address token, uint256 maxPerTransfer, uint256 dailyLimit, address ledger) internal pure returns (bytes32) {
        // F-04 FIX: Include configuration in salt so prefunded vault predictions remain reachable
        // even if VaultHub defaults are updated. Each (owner, hub, token, limits, ledger) gets unique salt.
        return keccak256(abi.encodePacked(owner_, hub, token, maxPerTransfer, dailyLimit, ledger));
    }
}
