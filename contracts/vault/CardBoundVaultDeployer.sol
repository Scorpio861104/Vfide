// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ICBVBytecodeProvider} from "./CardBoundVaultBytecodeProvider.sol";

/// @dev Minimal interface so CBVDeployer can call SubManagerDeployer without
///      importing it — breaks the initcode embedding chain.
interface ISubManagerDeployer {
    function deployManagers(address vaultAddr, uint256 dailyLimit)
        external
        returns (address pm, address wq, address im, address am);
}

/// @notice CardBoundVaultDeployer
/// @title  CardBoundVaultDeployer
/// @author Vfide
/// @dev    Deploys CardBoundVault instances via CREATE2.
///         Holds no vault initcode directly — delegates to CardBoundVaultBytecodeProvider
///         so this contract stays under the EIP-170 24 KB limit.
contract CardBoundVaultDeployer {
    /// @notice vaultHub — wired once via initHub() after VaultHub deploys
    address public vaultHub;

    /// @notice subManagerDeployer — injected at construction
    ISubManagerDeployer public immutable subManagerDeployer;

    /// @notice bytecodeProvider — holds CardBoundVault initcode; never embedded here
    ICBVBytecodeProvider public immutable bytecodeProvider;

    /// @notice original deployer — the only address permitted to call initHub()
    address private immutable _deployer;

    error CBD_OnlyHub();

    /// @param _subManagerDeployer Pre-deployed CardBoundVaultSubManagerDeployer address
    /// @param _bytecodeProvider   Pre-deployed CardBoundVaultBytecodeProvider address
    constructor(address _subManagerDeployer, address _bytecodeProvider) {
        _deployer = msg.sender;
        subManagerDeployer = ISubManagerDeployer(_subManagerDeployer);
        bytecodeProvider = ICBVBytecodeProvider(_bytecodeProvider);
    }

    /// @notice initHub — one-time call to wire the VaultHub address after it deploys.
    /// @dev    Can only be called once (vaultHub == 0) and only by the original deployer.
    function initHub(address hub) external {
        require(vaultHub == address(0), "CBD: hub already set");
        require(msg.sender == _deployer, "CBD: not deployer");
        require(hub != address(0), "CBD: zero hub");
        vaultHub = hub;
    }

    /// @notice predict the CREATE2 vault address for the given parameters
    function predict(
        address hub,
        address vfideToken,
        address owner_,
        uint8 guardianThreshold,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger
    ) external view returns (address predicted) {
        // XCHAIN-4: zkSync uses a different CREATE2 formula — off-chain only
        uint256 chainId = block.chainid;
        if (chainId == 324 || chainId == 300) revert("CBD_zkSync_predict_off-chain_only");

        address[] memory guardians = new address[](1);
        guardians[0] = owner_;

        bytes32 salt = _salt(owner_, hub, vfideToken, maxPerTransfer, dailyLimit, ledger);
        bytes memory init = bytecodeProvider.creationCode(
            hub, vfideToken, owner_, owner_, guardians,
            guardianThreshold, maxPerTransfer, dailyLimit, ledger,
            address(0), address(0), address(0), address(0)
        );
        predicted = address(uint160(uint256(keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(init))
        ))));
    }

    /// @notice deploy a new CardBoundVault via CREATE2 — only callable by vaultHub
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

        bytes32 salt = _salt(owner_, hub, vfideToken, maxPerTransfer, dailyLimit, ledger);

        // Predict the vault address so sub-managers can be wired before the vault deploys
        bytes memory init = bytecodeProvider.creationCode(
            hub, vfideToken, owner_, owner_, guardians,
            guardianThreshold, maxPerTransfer, dailyLimit, ledger,
            address(0), address(0), address(0), address(0)
        );
        address predicted = address(uint160(uint256(keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(init))
        ))));

        (address pm, address wq, address im, address am) =
            subManagerDeployer.deployManagers(predicted, dailyLimit);

        // Deploy with real sub-manager addresses
        bytes memory initWithManagers = bytecodeProvider.creationCode(
            hub, vfideToken, owner_, owner_, guardians,
            guardianThreshold, maxPerTransfer, dailyLimit, ledger,
            pm, wq, im, am
        );

        assembly {
            vault := create2(0, add(initWithManagers, 32), mload(initWithManagers), salt)
        }
        require(vault != address(0), "CBD: create2 failed");
    }

    function _salt(
        address owner_,
        address hub,
        address token,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger
    ) internal pure returns (bytes32) {
        // F-04: Include configuration in salt so prefunded predictions remain reachable
        return keccak256(abi.encodePacked(owner_, hub, token, maxPerTransfer, dailyLimit, ledger));
    }
}
