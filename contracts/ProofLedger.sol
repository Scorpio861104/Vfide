// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * ProofLedger.sol
 * Immutable logging system for all ecosystem actions.
 * Used by Seer, PanicGuard, DAO, Vaults, and Treasury.
 */

error PL_NotDAO();
error PL_Zero();

contract ProofLedger {
    event Log(address indexed who, string action, uint256 amount, string note, address indexed by, uint64 time);
    event LogSystem(address indexed who, string action, address indexed by, uint64 time);
    event LogWithMetadata(address indexed who, string action, uint256 amount, string note, address indexed by, uint64 time, string category, bytes metadata);
    event DAOSet(address dao);

    address public dao;
    uint256 public totalEventsLogged;
    mapping(string => uint256) public eventsByCategory;

    modifier onlyDAO() {
        if (msg.sender != dao) revert PL_NotDAO();
        _;
    }

    constructor(address _dao) {
        if (_dao == address(0)) revert PL_Zero();
        dao = _dao;
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert PL_Zero();
        dao = _dao;
        emit DAOSet(_dao);
    }

    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external {
        emit Log(who, action, amount, note, msg.sender, uint64(block.timestamp));
        totalEventsLogged++;
    }

    function logSystemEvent(address who, string calldata action, address by) external {
        emit LogSystem(who, action, by, uint64(block.timestamp));
        totalEventsLogged++;
    }

    function logEventWithMetadata(
        address who,
        string calldata action,
        uint256 amount,
        string calldata note,
        string calldata category,
        bytes calldata metadata
    ) external {
        emit LogWithMetadata(who, action, amount, note, msg.sender, uint64(block.timestamp), category, metadata);
        totalEventsLogged++;
        eventsByCategory[category]++;
    }

    // DAO query functions for efficient log retrieval
    function getEventCountByCategory(string calldata category) external view returns (uint256) {
        return eventsByCategory[category];
    }

    function getTotalEventsLogged() external view returns (uint256) {
        return totalEventsLogged;
    }
}