// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title FeeDistributor — Sustainable Fee Revenue Splitter
/// @notice Receives burn fee revenue from VFIDEToken transfers and splits
///         it across 5 protocol channels. Everything is fee-funded.
///         The protocol can NEVER spend more than it earns.
///
/// @dev Default split (basis points, 10000 = 100%):
///   35% → Burned forever (deflationary)
///   20% → Sanctum Fund (charity)
///   15% → DAO payroll (12 governance members)
///   20% → Merchant competition (volume-based)
///   10% → Headhunter competition (referral-based)
contract FeeDistributor is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant MAX_BPS = 10000;
    uint256 public constant MIN_BURN_BPS = 2000;    // Burn floor: 20%
    uint256 public constant MAX_SINGLE_BPS = 5000;   // No channel > 50%
    uint256 public constant SPLIT_CHANGE_DELAY = 72 hours;

    struct FeeSplit {
        uint256 burnBps;
        uint256 sanctumBps;
        uint256 daoPayrollBps;
        uint256 merchantPoolBps;
        uint256 headhunterPoolBps;
    }

    IERC20 public immutable vfideToken;

    // Destinations
    address public burnAddress;
    address public sanctumFund;
    address public daoPayrollPool;
    address public merchantPool;
    address public headhunterPool;

    FeeSplit public feeSplit;

    // Accounting
    uint256 public totalReceived;
    uint256 public totalDistributed;
    uint256 public totalBurned;
    uint256 public totalToSanctum;
    uint256 public totalToDAO;
    uint256 public totalToMerchants;
    uint256 public totalToHeadhunters;

    uint256 public minDistributionAmount;

    // Timelock
    struct PendingSplitChange {
        FeeSplit newSplit;
        uint256 effectiveTime;
        bool pending;
    }
    PendingSplitChange public pendingSplitChange;

    event FeeReceived(uint256 amount);
    event FeeDistributed(uint256 total, uint256 burned, uint256 sanctum, uint256 dao, uint256 merchants, uint256 headhunters);
    event SplitChangeProposed(uint256 burn, uint256 sanctum, uint256 dao, uint256 merchants, uint256 headhunters, uint256 effectiveTime);
    event SplitChangeExecuted();
    event SplitChangeCancelled();
    event DestinationUpdated(string name, address addr);

    error ZeroAddress();
    error InvalidSplit();
    error BurnTooLow();
    error SingleSinkTooHigh();
    error BelowMinimum();
    error SplitChangeNotReady();
    error NoSplitChangePending();

    constructor(
        address _token,
        address _burn,
        address _sanctum,
        address _daoPayroll,
        address _merchantPool,
        address _headhunterPool,
        address _admin
    ) {
        if (_token == address(0) || _admin == address(0) || _burn == address(0)) revert ZeroAddress();
        if (_sanctum == address(0) || _daoPayroll == address(0)) revert ZeroAddress();
        if (_merchantPool == address(0) || _headhunterPool == address(0)) revert ZeroAddress();

        vfideToken = IERC20(_token);
        burnAddress = _burn;
        sanctumFund = _sanctum;
        daoPayrollPool = _daoPayroll;
        merchantPool = _merchantPool;
        headhunterPool = _headhunterPool;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);

        feeSplit = FeeSplit({
            burnBps: 3500,
            sanctumBps: 2000,
            daoPayrollBps: 1500,
            merchantPoolBps: 2000,
            headhunterPoolBps: 1000
        });

        minDistributionAmount = 100 * 1e18;
    }

    /// @notice Receive fee tokens from VFIDEToken._transfer().
    function receiveFee(uint256 amount) external {
        totalReceived += amount;
        emit FeeReceived(amount);
    }

    /// @notice Distribute accumulated fees. Callable by anyone.
    function distribute() external nonReentrant whenNotPaused {
        uint256 balance = vfideToken.balanceOf(address(this));
        if (balance < minDistributionAmount) revert BelowMinimum();

        uint256 toBurn = (balance * feeSplit.burnBps) / MAX_BPS;
        uint256 toSanctum = (balance * feeSplit.sanctumBps) / MAX_BPS;
        uint256 toDAO = (balance * feeSplit.daoPayrollBps) / MAX_BPS;
        uint256 toMerchants = (balance * feeSplit.merchantPoolBps) / MAX_BPS;
        uint256 toHeadhunters = balance - toBurn - toSanctum - toDAO - toMerchants;

        if (toBurn > 0) { vfideToken.safeTransfer(burnAddress, toBurn); totalBurned += toBurn; }
        if (toSanctum > 0) { vfideToken.safeTransfer(sanctumFund, toSanctum); totalToSanctum += toSanctum; }
        if (toDAO > 0) { vfideToken.safeTransfer(daoPayrollPool, toDAO); totalToDAO += toDAO; }
        if (toMerchants > 0) { vfideToken.safeTransfer(merchantPool, toMerchants); totalToMerchants += toMerchants; }
        if (toHeadhunters > 0) { vfideToken.safeTransfer(headhunterPool, toHeadhunters); totalToHeadhunters += toHeadhunters; }

        totalDistributed += balance;
        emit FeeDistributed(balance, toBurn, toSanctum, toDAO, toMerchants, toHeadhunters);
    }

    function proposeSplitChange(
        uint256 burn, uint256 sanctum, uint256 dao, uint256 merchants, uint256 headhunters
    ) external onlyRole(ADMIN_ROLE) {
        if (burn + sanctum + dao + merchants + headhunters != MAX_BPS) revert InvalidSplit();
        if (burn < MIN_BURN_BPS) revert BurnTooLow();
        if (sanctum > MAX_SINGLE_BPS || dao > MAX_SINGLE_BPS || merchants > MAX_SINGLE_BPS || headhunters > MAX_SINGLE_BPS)
            revert SingleSinkTooHigh();

        pendingSplitChange = PendingSplitChange({
            newSplit: FeeSplit(burn, sanctum, dao, merchants, headhunters),
            effectiveTime: block.timestamp + SPLIT_CHANGE_DELAY,
            pending: true
        });
        emit SplitChangeProposed(burn, sanctum, dao, merchants, headhunters, block.timestamp + SPLIT_CHANGE_DELAY);
    }

    function executeSplitChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingSplitChange.pending) revert NoSplitChangePending();
        if (block.timestamp < pendingSplitChange.effectiveTime) revert SplitChangeNotReady();
        feeSplit = pendingSplitChange.newSplit;
        pendingSplitChange.pending = false;
        emit SplitChangeExecuted();
    }

    function cancelSplitChange() external onlyRole(ADMIN_ROLE) {
        pendingSplitChange.pending = false;
        emit SplitChangeCancelled();
    }

    function setDestination(string calldata name, address addr) external onlyRole(ADMIN_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        bytes32 h = keccak256(bytes(name));
        if (h == keccak256("burn")) burnAddress = addr;
        else if (h == keccak256("sanctum")) sanctumFund = addr;
        else if (h == keccak256("dao")) daoPayrollPool = addr;
        else if (h == keccak256("merchants")) merchantPool = addr;
        else if (h == keccak256("headhunters")) headhunterPool = addr;
        else revert("Unknown destination");
        emit DestinationUpdated(name, addr);
    }

    function setMinDistributionAmount(uint256 _min) external onlyRole(ADMIN_ROLE) {
        minDistributionAmount = _min;
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function previewDistribution() external view returns (
        uint256 total, uint256 toBurn, uint256 toSanctum, uint256 toDAO, uint256 toMerchants, uint256 toHeadhunters
    ) {
        total = vfideToken.balanceOf(address(this));
        toBurn = (total * feeSplit.burnBps) / MAX_BPS;
        toSanctum = (total * feeSplit.sanctumBps) / MAX_BPS;
        toDAO = (total * feeSplit.daoPayrollBps) / MAX_BPS;
        toMerchants = (total * feeSplit.merchantPoolBps) / MAX_BPS;
        toHeadhunters = total - toBurn - toSanctum - toDAO - toMerchants;
    }

    function getCurrentSplit() external view returns (uint256, uint256, uint256, uint256, uint256) {
        return (feeSplit.burnBps, feeSplit.sanctumBps, feeSplit.daoPayrollBps, feeSplit.merchantPoolBps, feeSplit.headhunterPoolBps);
    }
}
