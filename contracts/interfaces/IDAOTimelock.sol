// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IDAOTimelock {
    function admin() external view returns (address);
    function delay() external view returns (uint64);
    function setAdmin(address _admin) external;
    function setDelay(uint64 _delay) external;
    function setLedger(address _ledger) external;
    function setPanicGuard(address _pg) external;
    function queueTx(address target, uint256 value, bytes calldata data) external returns (bytes32 id);
    function cancel(bytes32 id) external;
    function execute(bytes32 id) external payable returns (bytes memory res);
}