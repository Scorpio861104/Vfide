// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDEToken.sol";

contract Phase1TokenDeployer {
    function deployToken(
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _initialSupply,
        address _admin,
        address _multiSig
    ) external pure returns (address) {
        _tokenName;
        _tokenSymbol;
        _initialSupply;
        _admin;
        _multiSig;

        // This legacy deployer shape cannot safely provide canonical constructor dependencies
        // (real DevReserveVestingVault + Presale addresses). Fail closed to prevent accidental misuse.
        revert("Phase1TokenDeployer deprecated: use contracts/scripts/deploy-phase1.ts with explicit dev reserve and presale addresses");
    }
}
