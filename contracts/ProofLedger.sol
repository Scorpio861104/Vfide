// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Errors shared with Seer.sol are defined here; Seer.sol imports this file.

error TRUST_NotDAO();
error TRUST_Zero();

/// @title ProofLedger
/// @notice Immutable event log for behavioral signals consumed by the Seer ProofScore engine.
///         Only the DAO and explicitly authorized system contracts may write entries.
/// @dev ReentrancyGuard intentionally omitted: this contract only emits events and mutates internal counters.
contract ProofLedger {
    event SystemEvent(address indexed who, string action, address indexed by);
    event EventLog(address indexed who, string action, uint256 amount, string note);
    event TransferLog(address indexed from, address indexed to, uint256 amount, string context);
    event LoggerSet(address indexed logger, bool authorized);
    event DAOChangeQueued(address indexed oldDAO, address indexed newDAO, uint64 executeAfter);
    event DAOChangeCancelled(address indexed oldDAO, address indexed queuedDAO);
    event LoggerChangeQueued(address indexed logger, bool authorized, uint64 executeAfter);
    event LoggerChangeCancelled(address indexed logger, bool authorized);

    address public dao;
    address public pendingDAO;
    uint64 public pendingDAOAt;
    mapping(address => bool) public authorizedLoggers;
    address public pendingLogger;
    bool public pendingLoggerAuthorized;
    uint64 public pendingLoggerAt;
    mapping(address => mapping(uint256 => uint256)) public logCountPerBlock;
    uint256 public constant MAX_LOGS_PER_BLOCK = 50;
    uint64 public constant CHANGE_DELAY = 48 hours;

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
        require(pendingDAOAt == 0, "PL: pending dao");
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + CHANGE_DELAY;
        emit DAOChangeQueued(dao, _dao, pendingDAOAt);
    }

    function applyDAO() external onlyDAO {
        require(pendingDAOAt != 0 && pendingDAO != address(0), "PL: no pending dao");
        require(block.timestamp >= pendingDAOAt, "PL: dao timelock");
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
    }

    function cancelDAO() external onlyDAO {
        require(pendingDAOAt != 0 && pendingDAO != address(0), "PL: no pending dao");
        address oldDAO = dao;
        address queuedDAO = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOChangeCancelled(oldDAO, queuedDAO);
    }

    /// @notice Authorize or deauthorize a contract to write log entries
    function setLogger(address logger, bool authorized) external onlyDAO {
        if (logger == address(0)) revert TRUST_Zero();
        require(pendingLoggerAt == 0, "PL: pending logger");
        pendingLogger = logger;
        pendingLoggerAuthorized = authorized;
        pendingLoggerAt = uint64(block.timestamp) + CHANGE_DELAY;
        emit LoggerChangeQueued(logger, authorized, pendingLoggerAt);
    }

    function applyLogger() external onlyDAO {
        require(pendingLoggerAt != 0 && pendingLogger != address(0), "PL: no pending logger");
        require(block.timestamp >= pendingLoggerAt, "PL: logger timelock");
        address logger = pendingLogger;
        bool authorized = pendingLoggerAuthorized;
        authorizedLoggers[logger] = authorized;
        delete pendingLogger;
        delete pendingLoggerAuthorized;
        delete pendingLoggerAt;
        emit LoggerSet(logger, authorized);
    }

    function cancelLogger() external onlyDAO {
        require(pendingLoggerAt != 0 && pendingLogger != address(0), "PL: no pending logger");
        address logger = pendingLogger;
        bool authorized = pendingLoggerAuthorized;
        delete pendingLogger;
        delete pendingLoggerAuthorized;
        delete pendingLoggerAt;
        emit LoggerChangeCancelled(logger, authorized);
    }

    function logSystemEvent(address who, string calldata action, address by) external onlyLogger {
        require(logCountPerBlock[msg.sender][block.number] < MAX_LOGS_PER_BLOCK, "PL: rate limit");
        logCountPerBlock[msg.sender][block.number]++;
        emit SystemEvent(who, action, by);
    }

    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external onlyLogger {
        require(logCountPerBlock[msg.sender][block.number] < MAX_LOGS_PER_BLOCK, "PL: rate limit");
        logCountPerBlock[msg.sender][block.number]++;
        emit EventLog(who, action, amount, note);
    }

    function logTransfer(address from, address to, uint256 amount, string calldata context) external onlyLogger {
        require(logCountPerBlock[msg.sender][block.number] < MAX_LOGS_PER_BLOCK, "PL: rate limit");
        logCountPerBlock[msg.sender][block.number]++;
        emit TransferLog(from, to, amount, context);
    }
}
