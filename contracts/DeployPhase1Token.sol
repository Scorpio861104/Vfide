// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./VFIDEToken.sol";

contract Phase1TokenDeployer {
    function deployToken(
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _initialSupply,
        address _admin,
        address _multiSig
    ) external returns (address tokenV2) {
        require(_admin != address(0), "Phase1TokenDeployer: zero admin address");
        require(_multiSig != address(0), "Phase1TokenDeployer: zero multisig address");

        // Canonical token constructor differs from legacy V2 deployer shape.
        // For phase bootstrap compatibility, reuse multisig as non-zero contract placeholders
        // for dev-reserve and presale recipients; production deployment must supply real modules.
        _tokenName;
        _tokenSymbol;
        _initialSupply;

        VFIDEToken token = new VFIDEToken(
            _multiSig,
            _multiSig,
            _admin,
            address(0),
            address(0),
            _admin
        );

        tokenV2 = address(token);
    }
}
