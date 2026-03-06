// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./CircuitBreaker.sol";
import "./WithdrawalQueue.sol";

contract Phase1InfrastructureDeployer {
    function deployInfrastructure(
        address _admin,
        address _priceOracle,
        address _emergencyControl
    ) external returns (
        address circuitBreaker,
        address withdrawalQueue
    ) {
        require(_admin != address(0), "Phase1InfrastructureDeployer: zero admin address");
        require(_priceOracle != address(0), "Phase1InfrastructureDeployer: zero oracle address");
        require(_emergencyControl != address(0), "Phase1InfrastructureDeployer: zero emergency control");

        CircuitBreaker circuitBreakerContract = new CircuitBreaker(
            _admin,
            _priceOracle,
            _emergencyControl
        );
        circuitBreaker = address(circuitBreakerContract);

        WithdrawalQueueStub withdrawalQueueContract = new WithdrawalQueueStub(_admin, 1000000 * 10**18);
        withdrawalQueue = address(withdrawalQueueContract);
    }
}
