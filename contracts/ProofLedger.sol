// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Errors shared with Seer.sol are defined here; Seer.sol imports this file.

error TRUST_NotDAO();
error TRUST_Zero();

/// @title ProofLedger
/// @notice Immutable event log for behavioral signals consumed by the Seer ProofScore engine.
///         Only the DAO and explicitly authorized system contracts may write entries.
contract ProofLedger {
    event SystemEvent(address indexed who, string action, address indexed by);
    event EventLog(address indexed who, string action, uint256 amount, string note);
    event TransferLog(address indexed from, address indexed to, uint256 amount, string context);
    event LoggerSet(address indexed logger, bool authorized);

    address public dao;
    mapping(address => bool) public authorizedLoggers;

    modifier onlyDAO() { _checkDAOPL(); _; }
    function _checkDAOPL() internal view { if (msg.sender != dao) revert TRUST_NotDAO(); }

    modifier onlyLogger() {
        require(msg.sender == dao || authorizedLoggers[msg.sender], "PL: not authorized");
        _;
    }

    constructor(address _dao) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    /// @notice Authorize or deauthorize a contract to write log entries
    function setLogger(address logger, bool authorized) external onlyDAO {
        if (logger == address(0)) revert TRUST_Zero();
        authorizedLoggers[logger] = authorized;
        emit LoggerSet(logger, authorized);
    }

    function logSystemEvent(address who, string calldata action, address by) external onlyLogger {
        emit SystemEvent(who, action, by);
    }

    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external onlyLogger {
        emit EventLog(who, action, amount, note);
    }

    function logTransfer(address from, address to, uint256 amount, string calldata context) external onlyLogger {
        emit TransferLog(from, to, amount, context);
    }
}
