// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Errors shared with Seer.sol are defined here; Seer.sol imports this file.

/// @notice TRUST_NotDAO
error TRUST_NotDAO();
/// @notice TRUST_Zero
error TRUST_Zero();

/// @title ProofLedger
/// @notice Immutable event log for behavioral signals consumed by the Seer ProofScore engine.
///         Only the DAO and explicitly authorized system contracts may write entries.
/// @dev ReentrancyGuard intentionally omitted: this contract only emits events and mutates internal counters.
/// @author Vfide
contract ProofLedger {
    /// @notice SystemEvent
    /// @param who who
    /// @param action action
    /// @param by by
    event SystemEvent(address indexed who, string action, address indexed by);
    /// @notice EventLog
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    event EventLog(address indexed who, string action, uint256 amount, string note);
    /// @notice TransferLog
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @param context context
    event TransferLog(address indexed from, address indexed to, uint256 amount, string context);
    /// @notice LoggerSet
    /// @param logger logger
    /// @param authorized authorized
    event LoggerSet(address indexed logger, bool authorized);
    /// @notice DAOChangeQueued
    /// @param oldDAO oldDAO
    /// @param newDAO newDAO
    /// @param executeAfter executeAfter
    event DAOChangeQueued(address indexed oldDAO, address indexed newDAO, uint64 executeAfter);
    /// @notice DAOChangeCancelled
    /// @param oldDAO oldDAO
    /// @param queuedDAO queuedDAO
    event DAOChangeCancelled(address indexed oldDAO, address indexed queuedDAO);
    /// @notice LoggerChangeQueued
    /// @param logger logger
    /// @param authorized authorized
    /// @param executeAfter executeAfter
    event LoggerChangeQueued(address indexed logger, bool authorized, uint64 executeAfter);
    /// @notice LoggerChangeCancelled
    /// @param logger logger
    /// @param authorized authorized
    event LoggerChangeCancelled(address indexed logger, bool authorized);

    /// @notice dao
    address public dao;
    /// @notice pendingDAO
    address public pendingDAO;
    /// @notice pendingDAOAt
    uint64 public pendingDAOAt;
    /// @notice authorizedLoggers
    mapping(address => bool) public authorizedLoggers;
    /// @notice pendingLogger
    address public pendingLogger;
    /// @notice pendingLoggerAuthorized
    bool public pendingLoggerAuthorized;
    /// @notice pendingLoggerAt
    uint64 public pendingLoggerAt;
    /// @notice logCountPerBlock
    mapping(address => mapping(uint256 => uint256)) public logCountPerBlock;
    /// @notice MAX_LOGS_PER_BLOCK
    uint256 public constant MAX_LOGS_PER_BLOCK = 50;
    /// @notice CHANGE_DELAY
    uint64 public constant CHANGE_DELAY = 48 hours;

    /// @notice onlyDAO
    modifier onlyDAO() {
        _checkDAOPL();
        _;
    }
    /// @notice _checkDAOPL
    function _checkDAOPL() internal view {
        if (msg.sender != dao) revert TRUST_NotDAO();
    }

    /// @notice onlyLogger
    modifier onlyLogger() {
        require(msg.sender == dao || authorizedLoggers[msg.sender], "PL: not authorized");
        _;
    }

    /// @notice constructor
    /// @param _dao _dao
    constructor(address _dao) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    /// @notice setDAO
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        require(pendingDAOAt == 0, "PL: pending dao");
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + CHANGE_DELAY;
        emit DAOChangeQueued(dao, _dao, pendingDAOAt);
    }

    /// @notice applyDAO
    function applyDAO() external onlyDAO {
        require(pendingDAOAt != 0 && pendingDAO != address(0), "PL: no pending dao");
        require(block.timestamp >= pendingDAOAt, "PL: dao timelock");
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
    }

    /// @notice cancelDAO
    function cancelDAO() external onlyDAO {
        require(pendingDAOAt != 0 && pendingDAO != address(0), "PL: no pending dao");
        address oldDAO = dao;
        address queuedDAO = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOChangeCancelled(oldDAO, queuedDAO);
    }

    /// @notice Authorize or deauthorize a contract to write log entries
    /// @param logger logger
    /// @param authorized authorized
    function setLogger(address logger, bool authorized) external onlyDAO {
        if (logger == address(0)) revert TRUST_Zero();
        require(pendingLoggerAt == 0, "PL: pending logger");
        pendingLogger = logger;
        pendingLoggerAuthorized = authorized;
        pendingLoggerAt = uint64(block.timestamp) + CHANGE_DELAY;
        emit LoggerChangeQueued(logger, authorized, pendingLoggerAt);
    }

    /// @notice applyLogger
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

    /// @notice cancelLogger
    function cancelLogger() external onlyDAO {
        require(pendingLoggerAt != 0 && pendingLogger != address(0), "PL: no pending logger");
        address logger = pendingLogger;
        bool authorized = pendingLoggerAuthorized;
        delete pendingLogger;
        delete pendingLoggerAuthorized;
        delete pendingLoggerAt;
        emit LoggerChangeCancelled(logger, authorized);
    }

    /// @notice logSystemEvent
    /// @param who who
    /// @param action action
    /// @param by by
    function logSystemEvent(address who, string calldata action, address by) external onlyLogger {
        require(logCountPerBlock[msg.sender][block.number] < MAX_LOGS_PER_BLOCK, "PL: rate limit");
        ++logCountPerBlock[msg.sender][block.number];
        emit SystemEvent(who, action, by);
    }

    /// @notice logEvent
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external onlyLogger {
        require(logCountPerBlock[msg.sender][block.number] < MAX_LOGS_PER_BLOCK, "PL: rate limit");
        ++logCountPerBlock[msg.sender][block.number];
        emit EventLog(who, action, amount, note);
    }

    /// @notice logTransfer
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @param context context
    function logTransfer(address from, address to, uint256 amount, string calldata context) external onlyLogger {
        require(logCountPerBlock[msg.sender][block.number] < MAX_LOGS_PER_BLOCK, "PL: rate limit");
        ++logCountPerBlock[msg.sender][block.number];
        emit TransferLog(from, to, amount, context);
    }
}
