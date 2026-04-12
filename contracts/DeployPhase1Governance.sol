// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

error P1G_Zero();
error P1G_DeployFailed();

contract Phase1GovernanceDeployer {
    function deployGovernance(
        address _admin,
        address[5] memory _council,
        bytes calldata accessControlInitCode,
        bytes calldata multiSigInitCode,
        bytes calldata emergencyControlInitCode
    ) external returns (
        address accessControl,
        address multiSig,
        address emergencyControl
    ) {
        _council;
        if (_admin == address(0)) revert P1G_Zero();

        accessControl = _deploy(accessControlInitCode);
        multiSig = _deploy(multiSigInitCode);
        emergencyControl = _deploy(emergencyControlInitCode);
    }

    function _deploy(bytes calldata initCode) internal returns (address deployed) {
        bytes memory code = initCode;
        assembly {
            deployed := create(0, add(code, 0x20), mload(code))
        }
        if (deployed == address(0)) revert P1G_DeployFailed();
    }
}
