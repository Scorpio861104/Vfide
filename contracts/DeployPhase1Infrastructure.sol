// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./CircuitBreaker.sol";
import "./WithdrawalQueue.sol";

contract Phase1InfrastructureDeployer {
    function deployInfrastructure(
        address _admin,
        address _priceOracle,
        address _emergencyControl
    ) external pure returns (address, address) {
        require(_admin != address(0), "Phase1InfrastructureDeployer: zero admin address");
        require(_priceOracle != address(0), "Phase1InfrastructureDeployer: zero oracle address");
        require(_emergencyControl != address(0), "Phase1InfrastructureDeployer: zero emergency control");
        revert("Phase1InfrastructureDeployer: WithdrawalQueueStub disabled; deploy a production withdrawal queue implementation");
    }
}
