// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./CardBoundVault.sol";

contract CardBoundVaultDeployer {
    address public immutable vaultHub;

    error CBD_OnlyHub();

    constructor() {
        vaultHub = msg.sender;
    }

    function predict(
        address hub,
        address vfideToken,
        address owner_,
        uint8 guardianThreshold,
        uint256 maxPerTransfer,
        uint256 dailyLimit,
        address ledger
    ) external view returns (address predicted) {
        bytes32 salt = _salt(owner_);
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
            new CardBoundVault{salt: _salt(owner_)}(
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

    function _salt(address owner_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner_));
    }
}