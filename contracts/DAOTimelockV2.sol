// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * DAOTimelockV2 — Delayed Execution for DAO Governance
 * -------------------------------------------------------
 * Mitigates centralization risk by enforcing a mandatory delay
 * before executing critical DAO operations.
 *
 * Features:
 *  - Queue transactions with a delay (default: 2 days).
 *  - Emergency override capability (DAO can cancel queued txs).
 *  - Best-effort ledger logging.
 *  - All operations must be explicitly called through this contract.
 */

error TIMELOCK_NotDAO();
error TIMELOCK_NotReady();
error TIMELOCK_Expired();
error TIMELOCK_AlreadyQueued();
error TIMELOCK_NotQueued();
error TIMELOCK_Zero();
error TIMELOCK_OnlyTimelock();

contract DAOTimelockV2 {
    event TransactionQueued(bytes32 indexed txId, address indexed target, uint256 value, bytes data, uint256 eta);
    event TransactionExecuted(bytes32 indexed txId, address indexed target, uint256 value, bytes data);
    event TransactionCancelled(bytes32 indexed txId);
    event DelaySet(uint256 newDelay);
    event DAOSet(address indexed newDAO);

    address public dao;
    IProofLedger public ledger;

    // Delay between queueing and execution (default: 2 days)
    uint256 public delay = 2 days;
    
    // WHITEPAPER: Expiry Window = 7 days
    uint256 public constant GRACE_PERIOD = 7 days;

    // txId => transaction queued (prevents duplicate queues)
    mapping(bytes32 => bool) public queuedTx;
    // txId => execution timestamp
    mapping(bytes32 => uint256) public eta;
    
    // C-2 Fix: Nonce to prevent transaction ID collision
    uint256 public nonce;

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    modifier onlyTimelockSelf() {
        if (msg.sender != address(this)) revert TIMELOCK_OnlyTimelock();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert TIMELOCK_NotDAO();
    }

    constructor(address _dao, address _ledger) {
        if (_dao == address(0)) revert TIMELOCK_Zero();
        dao = _dao;
        ledger = IProofLedger(_ledger);
    }

    function setDAO(address _dao) external onlyTimelockSelf {
        if (_dao == address(0)) revert TIMELOCK_Zero();
        dao = _dao;
        emit DAOSet(_dao);
        _log("timelock_dao_set");
    }

    function setDelay(uint256 _delay) external onlyTimelockSelf {
        require(_delay >= 1 days && _delay <= 30 days, "delay out of bounds");
        delay = _delay;
        emit DelaySet(_delay);
        _log("timelock_delay_set");
    }

    function setLedger(address _ledger) external onlyTimelockSelf {
        ledger = IProofLedger(_ledger);
    }

    /**
     * @notice Queue a transaction for delayed execution
     * @param target The contract to call
     * @param value ETH to send (usually 0)
     * @param signature Function signature (e.g., "setFees(uint16,uint16,uint16)")
     * @param data Encoded call data
     * @return txId The transaction ID
     * @return txNonce The nonce used for this transaction (needed for execute/cancel)
     */
    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data
    ) external onlyDAO returns (bytes32, uint256) {
        if (target == address(0)) revert TIMELOCK_Zero();
        // C-2 Fix: Use nonce to prevent transaction ID collision
        uint256 currentNonce = nonce++;
        bytes32 txId = _getTxId(target, value, signature, data, currentNonce);
        // No need to check queuedTx[txId] since nonce makes it unique

        uint256 executionTime = block.timestamp + delay;
        queuedTx[txId] = true;
        eta[txId] = executionTime;

        emit TransactionQueued(txId, target, value, _encodeCall(signature, data), executionTime);
        _logEv(target, "timelock_queued", executionTime, signature);

        return (txId, currentNonce);
    }

    /**
     * @notice Execute a queued transaction (only callable after delay)
     * @param txNonce The nonce returned from queueTransaction
     */
    function executeTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 txNonce
    ) external payable onlyDAO returns (bytes memory) {
        bytes32 txId = _getTxId(target, value, signature, data, txNonce);
        if (!queuedTx[txId]) revert TIMELOCK_NotQueued();
        if (block.timestamp < eta[txId]) revert TIMELOCK_NotReady();
        if (block.timestamp > eta[txId] + GRACE_PERIOD) revert TIMELOCK_Expired();

        delete queuedTx[txId];
        delete eta[txId];

        bytes memory fullData = _encodeCall(signature, data);
        (bool success, bytes memory result) = target.call{value: value}(fullData);
        require(success, "execution failed");

        emit TransactionExecuted(txId, target, value, fullData);
        _logEv(target, "timelock_executed", value, signature);

        return result;
    }

    /**
     * @notice Cancel a queued transaction (DAO only)
     * @param txNonce The nonce returned from queueTransaction
     */
    function cancelTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 txNonce
    ) external onlyDAO {
        bytes32 txId = _getTxId(target, value, signature, data, txNonce);
        if (!queuedTx[txId]) revert TIMELOCK_NotQueued();

        delete queuedTx[txId];
        delete eta[txId];

        emit TransactionCancelled(txId);
        _logEv(target, "timelock_cancelled", 0, signature);
    }

    // ─────────────────────── Internal Helpers

    // C-2 Fix: Include nonce to prevent ID collision when re-queueing same transaction
    function _getTxId(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 _nonce
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(target, value, signature, data, _nonce));
    }

    function _encodeCall(string memory signature, bytes memory data) internal pure returns (bytes memory) {
        // Correctly encode: selector from signature + data (already ABI-encoded arguments)
        bytes4 selector = bytes4(keccak256(bytes(signature)));
        return abi.encodePacked(selector, data);
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch {}
        }
    }

    /**
     * @notice View function to check if a transaction is ready for execution
     * @param txNonce The nonce returned from queueTransaction
     */
    function isReady(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 txNonce
    ) external view returns (bool) {
        bytes32 txId = _getTxId(target, value, signature, data, txNonce);
        return queuedTx[txId] && block.timestamp >= eta[txId];
    }

    /**
     * @notice View function to get execution time for a queued transaction
     * @param txNonce The nonce returned from queueTransaction
     */
    function getEta(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 txNonce
    ) external view returns (uint256) {
        bytes32 txId = _getTxId(target, value, signature, data, txNonce);
        if (!queuedTx[txId]) return 0;
        return eta[txId];
    }
}
