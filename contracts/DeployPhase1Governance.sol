// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDEAccessControl.sol";
import "./AdminMultiSig.sol";
import { EmergencyControl as EmergencyControlCore } from "./EmergencyControl.sol";

contract Phase1GovernanceDeployer {
    function deployGovernance(
        address _admin,
        address[5] memory _council
    ) external returns (
        address accessControl,
        address multiSig,
        address emergencyControl
    ) {
        require(_admin != address(0), "Phase1GovernanceDeployer: zero admin address");

        VFIDEAccessControl accessControlContract = new VFIDEAccessControl(_admin);
        accessControl = address(accessControlContract);

        AdminMultiSig multiSigContract = new AdminMultiSig(_council, address(0)); // vfideToken wired post-deploy via setVFIDEToken()
        multiSig = address(multiSigContract);

        // Phase-1 bootstrap deployer wires a non-zero breaker placeholder; governance should set final modules post-deploy.
        EmergencyControlCore emergencyControlContract = new EmergencyControlCore(
            _admin,
            _admin,
            address(0)
        );
        emergencyControl = address(emergencyControlContract);
    }
}
