// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * SUPPLY-CHAIN NOTE: This contract intentionally uses OpenZeppelin imports
 * because it relies on AccessControl role semantics for operational admin actions.
 * OZ version baseline: 5.1.0. Review OZ advisories on dependency updates.
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVFIDEBurnable is IERC20 {
    function burn(uint256 amount) external;
}

/// @title FeeDistributor — Sustainable Fee Revenue Splitter
/// @notice Receives burn fee revenue from VFIDEToken transfers and splits
///         it across 5 protocol channels. Everything is fee-funded.
///         The protocol can NEVER spend more than it earns.
///
/// @dev Default split (basis points, 10000 = 100%):
///   35% → Burned forever (deflationary)
///   20% → Sanctum Fund (charity)
///   15% → DAO payroll (initial 12 governance members, scalable to 21)
///   20% → Merchant competition (volume-based)
///   10% → Headhunter competition (referral-based)
contract FeeDistributor is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant MAX_BPS = 10000;
    uint256 public constant MIN_BURN_BPS = 2000;    // Burn floor: 20%
    uint256 public constant MAX_SINGLE_BPS = 5000;   // No channel > 50%
    uint256 public constant SPLIT_CHANGE_DELAY = 72 hours;
    uint256 public constant DESTINATION_CHANGE_DELAY = 72 hours;

    struct FeeSplit {
        uint256 burnBps;
        uint256 sanctumBps;
        uint256 daoPayrollBps;
        uint256 merchantPoolBps;
        uint256 headhunterPoolBps;
    }

    IVFIDEBurnable public immutable vfideToken;

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

    // F-33 FIX: Authorized fee sources (in addition to vfideToken)
    // Allows other contracts to call receiveFee() while maintaining security gate
    mapping(address => bool) public authorizedFeeSources;

    uint256 public minDistributionAmount;

    // Timelock
    struct PendingSplitChange {
        FeeSplit newSplit;
        uint256 effectiveTime;
        bool pending;
    }
    PendingSplitChange public pendingSplitChange;

    struct PendingDestinationChange {
        bytes32 nameHash;
        address addr;
        uint256 effectiveTime;
        bool pending;
    }
    PendingDestinationChange public pendingDestinationChange;

    event FeeReceived(uint256 amount);
    event FeeDistributed(uint256 total, uint256 burned, uint256 sanctum, uint256 dao, uint256 merchants, uint256 headhunters);
    event BurnFallbackTransfer(uint256 amount, address indexed burnAddress);
    event SplitChangeProposed(uint256 burn, uint256 sanctum, uint256 dao, uint256 merchants, uint256 headhunters, uint256 effectiveTime);
    event SplitChangeExecuted();
    event SplitChangeCancelled();
    event DestinationChangeProposed(bytes32 indexed nameHash, address addr, uint256 effectiveTime);
    event DestinationChangeExecuted(bytes32 indexed nameHash, address addr);
    event DestinationChangeCancelled(bytes32 indexed nameHash);
    event DestinationUpdated(string name, address indexed addr);
    event MinDistributionAmountSet(uint256 oldAmount, uint256 newAmount);
    event DistributionTransferFailed(string channel, address indexed recipient, uint256 amount);

    error ZeroAddress();
    error InvalidSplit();
    error BurnTooLow();
    error NotAuthorized();
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

        vfideToken = IVFIDEBurnable(_token);
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

        /// @notice Set authorization for a fee source contract (Flash loans, Bridges, etc.)
        /// @dev Admin-only. Allows contracts other than VFIDEToken to call receiveFee().
        function setAuthorizedFeeSource(address source, bool authorized) external onlyRole(ADMIN_ROLE) {
            if (source == address(0)) revert ZeroAddress();
            authorizedFeeSources[source] = authorized;
        }

        /// @notice Receive fee tokens from VFIDEToken._transfer() or authorized sources.
        function receiveFee(uint256 amount) external nonReentrant {
            // F-33 FIX: Allow both VFIDEToken and authorized fee sources to report fees
            bool isVFIDEToken = msg.sender == address(vfideToken);
            bool isAuthorizedSource = authorizedFeeSources[msg.sender];
            if (!isVFIDEToken && !isAuthorizedSource) revert NotAuthorized();
            totalReceived += amount;
            emit FeeReceived(amount);
        }

    // M-6 FIX: Minimum interval between distribution calls to prevent spam/dust accumulation attacks
    uint256 public constant MIN_DISTRIBUTION_INTERVAL = 1 hours;
    uint256 public lastDistributionTime;

    /// @notice Distribute accumulated fees. Callable by anyone.
    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign
    function distribute() external nonReentrant whenNotPaused {
        // M-6 FIX: Rate-limit to prevent repeated spam calls before fees accumulate
        require(block.timestamp >= lastDistributionTime + MIN_DISTRIBUTION_INTERVAL, "FD: too soon");
        uint256 balance = vfideToken.balanceOf(address(this));
        if (balance < minDistributionAmount) revert BelowMinimum();

        uint256 toBurn = (balance * feeSplit.burnBps) / MAX_BPS;
        uint256 toSanctum = (balance * feeSplit.sanctumBps) / MAX_BPS;
        uint256 toDAO = (balance * feeSplit.daoPayrollBps) / MAX_BPS;
        uint256 toMerchants = (balance * feeSplit.merchantPoolBps) / MAX_BPS;
        uint256 toHeadhunters = balance - toBurn - toSanctum - toDAO - toMerchants;

        uint256 burnedThisRun = 0;
        uint256 distributedThisRun = 0;
        if (toBurn > 0) {
            try vfideToken.burn(toBurn) {
                totalBurned += toBurn;
                burnedThisRun = toBurn;
                distributedThisRun += toBurn;
            } catch {
                if (_safeTransferOut(burnAddress, toBurn)) {
                    distributedThisRun += toBurn;
                    emit BurnFallbackTransfer(toBurn, burnAddress);
                } else {
                    emit DistributionTransferFailed("burn", burnAddress, toBurn);
                }
            }
        }
        if (toSanctum > 0) {
            if (_safeTransferOut(sanctumFund, toSanctum)) {
                totalToSanctum += toSanctum;
                distributedThisRun += toSanctum;
            } else {
                emit DistributionTransferFailed("sanctum", sanctumFund, toSanctum);
            }
        }
        if (toDAO > 0) {
            if (_safeTransferOut(daoPayrollPool, toDAO)) {
                totalToDAO += toDAO;
                distributedThisRun += toDAO;
            } else {
                emit DistributionTransferFailed("dao", daoPayrollPool, toDAO);
            }
        }
        if (toMerchants > 0) {
            if (_safeTransferOut(merchantPool, toMerchants)) {
                totalToMerchants += toMerchants;
                distributedThisRun += toMerchants;
            } else {
                emit DistributionTransferFailed("merchants", merchantPool, toMerchants);
            }
        }
        if (toHeadhunters > 0) {
            if (_safeTransferOut(headhunterPool, toHeadhunters)) {
                totalToHeadhunters += toHeadhunters;
                distributedThisRun += toHeadhunters;
            } else {
                emit DistributionTransferFailed("headhunters", headhunterPool, toHeadhunters);
            }
        }

        totalDistributed += distributedThisRun;
        lastDistributionTime = block.timestamp;
        emit FeeDistributed(distributedThisRun, burnedThisRun, totalToSanctum, totalToDAO, totalToMerchants, totalToHeadhunters);
    }

    /// @notice Propose a new fee split subject to timelock.
    /// @param burn Burn channel basis points.
    /// @param sanctum Sanctum channel basis points.
    /// @param dao DAO payroll channel basis points.
    /// @param merchants Merchant pool channel basis points.
    /// @param headhunters Headhunter pool channel basis points.
    function proposeSplitChange(
        uint256 burn, uint256 sanctum, uint256 dao, uint256 merchants, uint256 headhunters
    ) external onlyRole(ADMIN_ROLE) {
        if (burn + sanctum + dao + merchants + headhunters != MAX_BPS) revert InvalidSplit();
        if (burn < MIN_BURN_BPS) revert BurnTooLow();
        if (burn > MAX_SINGLE_BPS || sanctum > MAX_SINGLE_BPS || dao > MAX_SINGLE_BPS || merchants > MAX_SINGLE_BPS || headhunters > MAX_SINGLE_BPS)
            revert SingleSinkTooHigh();

        pendingSplitChange = PendingSplitChange({
            newSplit: FeeSplit(burn, sanctum, dao, merchants, headhunters),
            effectiveTime: block.timestamp + SPLIT_CHANGE_DELAY,
            pending: true
        });
        emit SplitChangeProposed(burn, sanctum, dao, merchants, headhunters, block.timestamp + SPLIT_CHANGE_DELAY);
    }

    /// @notice Apply a pending split change after delay.
    function executeSplitChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingSplitChange.pending) revert NoSplitChangePending();
        if (block.timestamp < pendingSplitChange.effectiveTime) revert SplitChangeNotReady();
        feeSplit = pendingSplitChange.newSplit;
        pendingSplitChange.pending = false;
        emit SplitChangeExecuted();
    }

    /// @notice Cancel any pending split change proposal.
    function cancelSplitChange() external onlyRole(ADMIN_ROLE) {
        pendingSplitChange.pending = false;
        emit SplitChangeCancelled();
    }

    /// @notice Schedule an update to one destination sink address.
    /// @param name Destination key: burn|sanctum|daoPayroll|merchantPool|headhunterPool.
    /// @param addr New destination address.
    function setDestination(string calldata name, address addr) external onlyRole(ADMIN_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        bytes32 h = keccak256(bytes(name));
        _requireKnownDestination(h);
        require(h != keccak256("burn"), "FD: burn destination immutable");
        pendingDestinationChange = PendingDestinationChange({
            nameHash: h,
            addr: addr,
            effectiveTime: block.timestamp + DESTINATION_CHANGE_DELAY,
            pending: true
        });
        emit DestinationChangeProposed(h, addr, block.timestamp + DESTINATION_CHANGE_DELAY);
    }

    /// @notice Apply a pending destination change after delay.
    function executeDestinationChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingDestinationChange.pending) revert NoSplitChangePending();
        if (block.timestamp < pendingDestinationChange.effectiveTime) revert SplitChangeNotReady();

        address addr = pendingDestinationChange.addr;
        bytes32 h = pendingDestinationChange.nameHash;
        string memory name = _applyDestination(h, addr);

        delete pendingDestinationChange;

        emit DestinationUpdated(name, addr);
        emit DestinationChangeExecuted(h, addr);
    }

    /// @notice Cancel any pending destination change proposal.
    function cancelDestinationChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingDestinationChange.pending) revert NoSplitChangePending();
        bytes32 h = pendingDestinationChange.nameHash;
        delete pendingDestinationChange;
        emit DestinationChangeCancelled(h);
    }

    /// @notice Set the minimum token balance required before distribution can run.
    /// @param _min Minimum contract token balance to allow `distribute`.
    function setMinDistributionAmount(uint256 _min) external onlyRole(ADMIN_ROLE) {
        uint256 oldAmount = minDistributionAmount;
        minDistributionAmount = _min;
        emit MinDistributionAmountSet(oldAmount, _min);
    }

    /// @notice Pause fee distribution operations.
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }

    /// @notice Resume fee distribution operations.
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    /// @notice Preview current split outputs using the contract's current token balance.
    /// @return total Current token balance available for distribution.
    /// @return toBurn Tokens that would be burned.
    /// @return toSanctum Tokens that would be sent to the sanctum fund.
    /// @return toDAO Tokens that would be sent to the DAO payroll pool.
    /// @return toMerchants Tokens that would be sent to merchant rewards.
    /// @return toHeadhunters Tokens that would be sent to headhunter rewards.
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

    /// @notice Return the active split basis points in burn/sanctum/dao/merchant/headhunter order.
    function getCurrentSplit() external view returns (uint256, uint256, uint256, uint256, uint256) {
        return (feeSplit.burnBps, feeSplit.sanctumBps, feeSplit.daoPayrollBps, feeSplit.merchantPoolBps, feeSplit.headhunterPoolBps);
    }

    function _requireKnownDestination(bytes32 h) private pure {
        if (
            h != keccak256("burn") &&
            h != keccak256("sanctum") &&
            h != keccak256("dao") &&
            h != keccak256("merchants") &&
            h != keccak256("headhunters")
        ) revert("Unknown destination");
    }

    function _safeTransferOut(address recipient, uint256 amount) private returns (bool) {
        (bool success, bytes memory returnData) = address(vfideToken).call(
            abi.encodeCall(IERC20.transfer, (recipient, amount))
        );

        if (!success) {
            return false;
        }

        if (returnData.length == 0) {
            return true;
        }

        return abi.decode(returnData, (bool));
    }

    function _applyDestination(bytes32 h, address addr) private returns (string memory name) {
        if (h == keccak256("burn")) {
            burnAddress = addr;
            return "burn";
        }
        if (h == keccak256("sanctum")) {
            sanctumFund = addr;
            return "sanctum";
        }
        if (h == keccak256("dao")) {
            daoPayrollPool = addr;
            return "dao";
        }
        if (h == keccak256("merchants")) {
            merchantPool = addr;
            return "merchants";
        }
        if (h == keccak256("headhunters")) {
            headhunterPool = addr;
            return "headhunters";
        }
        revert("Unknown destination");
    }
}
