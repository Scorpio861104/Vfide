// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDEFinance.sol - VFIDE-Only Treasury System
 * 
 * Simplified for VFIDE-only ecosystem:
 * - No stablecoin registry (VFIDE is the only currency)
 * - Treasury holds VFIDE for ecosystem operations
 * - DAO can rescue any accidentally sent tokens
 */

import "./SharedInterfaces.sol";

error FI_NotDAO();
error FI_Zero();
error FI_NotAllowed();
error FI_Insufficient();

/**
 * @title EcoTreasuryVault
 * @notice VFIDE ecosystem treasury - holds and distributes VFIDE for ecosystem operations
 * 
 * Simplified model:
 * - Receives VFIDE from ecosystem fees (0.2% ecosystem fee)
 * - Funds development, marketing, operations
 * - DAO-controlled disbursements
 */
contract EcoTreasuryVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    event ModulesSet(address dao, address ledger, address vfideToken);
    event ReceivedVFIDE(uint256 amount, address from);
    event Sent(address indexed token, address to, uint256 amount, string reason);

    address public dao;
    address public pendingDAO;
    IProofLedger public ledger;
    IERC20 public vfideToken;
    
    // Track allocations
    uint256 public totalReceived;
    uint256 public totalDisbursed;

    modifier onlyDAO() { _checkDAO(); _; }
    function _checkDAO() internal view { if (msg.sender != dao) revert FI_NotDAO(); }

    constructor(address _dao, address _ledger, address _vfide) {
        if (_dao == address(0) || _vfide == address(0)) revert FI_Zero();
        dao = _dao; 
        ledger = IProofLedger(_ledger); 
        vfideToken = IERC20(_vfide);
        emit ModulesSet(_dao, _ledger, _vfide);
    }

    function setModules(address _dao, address _ledger, address _vfide) external onlyDAO {
        if (_dao == address(0) || _vfide == address(0)) revert FI_Zero();
        pendingDAO = _dao;
        ledger = IProofLedger(_ledger); 
        vfideToken = IERC20(_vfide);
        emit ModulesSet(_dao, _ledger, _vfide);
        _log("treasury_modules_set");
    }

    function acceptDAO() external {
        require(msg.sender == pendingDAO, "FI: not pending DAO");
        dao = pendingDAO;
        pendingDAO = address(0);
        _log("treasury_dao_accepted");
    }

    mapping(address => bool) public authorizedNotifiers;
    
    event NotifierAuthorized(address indexed notifier, bool authorized);
    
    function setNotifier(address notifier, bool authorized) external onlyDAO {
        if (notifier == address(0)) revert FI_Zero();
        authorizedNotifiers[notifier] = authorized;
        emit NotifierAuthorized(notifier, authorized);
    }

    /**
     * @notice Record incoming VFIDE (called by authorized fee distribution contracts)
     */
    function noteVFIDE(uint256 amount, address from) external {
        require(authorizedNotifiers[msg.sender], "FI: not authorized notifier");
        totalReceived += amount;
        emit ReceivedVFIDE(amount, from);
        _logEv(from, "treasury_vfide_in", amount, "");
    }

    /**
     * @notice Send VFIDE for ecosystem expenses (development, marketing, etc)
     */
    function sendVFIDE(address to, uint256 amount, string calldata reason) external onlyDAO nonReentrant {
        if (to == address(0) || amount == 0) revert FI_Zero();
        if (vfideToken.balanceOf(address(this)) < amount) revert FI_Insufficient();

        totalDisbursed += amount;
        vfideToken.safeTransfer(to, amount);

        emit Sent(address(vfideToken), to, amount, reason);
        _logEv(to, "treasury_send", amount, reason);
    }

    /**
     * @notice Rescue any accidentally sent tokens (not just VFIDE)
     * @dev Emergency function for recovering stuck tokens
     */
    function rescueToken(address token, address to, uint256 amount) external onlyDAO nonReentrant {
        if (token == address(0) || to == address(0) || amount == 0) revert FI_Zero();
        IERC20(token).safeTransfer(to, amount);
        emit Sent(token, to, amount, "rescue");
        _logEv(to, "treasury_rescue", amount, "");
    }

    /**
     * @notice Get current VFIDE balance
     */
    function vfideBalance() external view returns (uint256) {
        return vfideToken.balanceOf(address(this));
    }

    /**
     * @notice Get balance of any token (for rescue operations)
     */
    function balanceOf(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    /**
     * @notice Get treasury summary
     */
    function getTreasurySummary() external view returns (
        uint256 currentBalance,
        uint256 totalIn,
        uint256 totalOut,
        uint256 netPosition
    ) {
        currentBalance = vfideToken.balanceOf(address(this));
        totalIn = totalReceived;
        totalOut = totalDisbursed;
        netPosition = totalIn > totalOut ? totalIn - totalOut : 0;
    }
    
    /**
     * @notice Get balances of multiple tokens (for portfolio view)
     */
    function getMultiTokenBalances(address[] calldata tokens) external view returns (
        uint256[] memory balances
    ) {
        balances = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = IERC20(tokens[i]).balanceOf(address(this));
        }
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
}

