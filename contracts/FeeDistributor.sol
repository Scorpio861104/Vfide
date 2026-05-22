// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * SUPPLY-CHAIN NOTE: This contract intentionally uses OpenZeppelin imports
 * because it relies on AccessControl role semantics for operational admin actions.
 * OZ version baseline: 5.1.0. Review OZ advisories on dependency updates.
 */

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice IVFIDEBurnable
/// @title IVFIDEBurnable
/// @author Vfide
interface IVFIDEBurnable is IERC20 {
    /// @notice burn
    /// @param amount amount
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
/// @author Vfide
contract FeeDistributor is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice ADMIN_ROLE
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice MAX_BPS
    uint256 public constant MAX_BPS = 10000;
    /// @notice MIN_BURN_BPS
    uint256 public constant MIN_BURN_BPS = 2000;    // Burn floor: 20%
    /// @notice MAX_SINGLE_BPS
    uint256 public constant MAX_SINGLE_BPS = 5000;   // No channel > 50%
    /// @notice SPLIT_CHANGE_DELAY
    uint256 public constant SPLIT_CHANGE_DELAY = 72 hours;
    /// @notice DESTINATION_CHANGE_DELAY
    uint256 public constant DESTINATION_CHANGE_DELAY = 72 hours;
    /// @notice FEE_SOURCE_CHANGE_DELAY
    uint256 public constant FEE_SOURCE_CHANGE_DELAY = 48 hours; // TL-236

    struct FeeSplit {
        uint256 burnBps;
        uint256 sanctumBps;
        uint256 daoPayrollBps;
        uint256 merchantPoolBps;
        uint256 headhunterPoolBps;
    }

    /// @notice vfideToken
    IVFIDEBurnable public immutable vfideToken;

    // Destinations
    /// @notice burnAddress
    address public burnAddress;
    /// @notice sanctumFund
    address public sanctumFund;
    /// @notice daoPayrollPool
    address public daoPayrollPool;
    /// @notice merchantPool
    address public merchantPool;
    /// @notice headhunterPool
    address public headhunterPool;

    /// @notice feeSplit
    FeeSplit public feeSplit;

    // Accounting
    /// @notice totalReceived
    uint256 public totalReceived;
    /// @notice totalDistributed
    uint256 public totalDistributed;
    /// @notice totalBurned
    uint256 public totalBurned;
    /// @notice totalBurnSinkHeld
    uint256 public totalBurnSinkHeld;
    /// @notice totalToSanctum
    uint256 public totalToSanctum;
    /// @notice totalToDAO
    uint256 public totalToDAO;
    /// @notice totalToMerchants
    uint256 public totalToMerchants;
    /// @notice totalToHeadhunters
    uint256 public totalToHeadhunters;
    /// @notice totalRescued
    uint256 public totalRescued;

    // F-33 FIX: Authorized fee sources (in addition to vfideToken)
    // Allows other contracts to call receiveFee() while maintaining security gate
    /// @notice authorizedFeeSources
    mapping(address => bool) public authorizedFeeSources;

    // TL-236 FIX: Pending fee source change (#236)
    struct PendingFeeSourceChange {
        address source;
        bool authorized;
        uint256 effectiveTime;
        bool pending;
    }
    /// @notice pendingFeeSourceChange
    PendingFeeSourceChange public pendingFeeSourceChange;

    /// @notice minDistributionAmount
    uint256 public minDistributionAmount;

    // Timelock
    struct PendingSplitChange {
        FeeSplit newSplit;
        uint256 effectiveTime;
        bool pending;
    }
    /// @notice pendingSplitChange
    PendingSplitChange public pendingSplitChange;

    struct PendingDestinationChange {
        bytes32 nameHash;
        address addr;
        uint256 effectiveTime;
        bool pending;
    }
    /// @notice pendingDestinationChange
    PendingDestinationChange public pendingDestinationChange;

    struct PendingRescue {
        address to;
        uint256 amount;
        uint256 effectiveTime;
        bool pending;
    }
    /// @notice pendingRescue
    PendingRescue public pendingRescue;

    /// @notice FeeReceived
    /// @param amount amount
    event FeeReceived(uint256 amount);
    /// @notice FeeDistributed
    /// @param total total
    /// @param burned burned
    /// @param sanctum sanctum
    /// @param dao dao
    /// @param merchants merchants
    /// @param headhunters headhunters
    event FeeDistributed(uint256 total, uint256 burned, uint256 sanctum, uint256 dao, uint256 merchants, uint256 headhunters);
    /// @notice BurnFallbackTransfer
    /// @param amount amount
    /// @param burnAddress burnAddress
    event BurnFallbackTransfer(uint256 amount, address indexed burnAddress);
    /// @notice SplitChangeProposed
    /// @param burn burn
    /// @param sanctum sanctum
    /// @param dao dao
    /// @param merchants merchants
    /// @param headhunters headhunters
    /// @param effectiveTime effectiveTime
    event SplitChangeProposed(uint256 burn, uint256 sanctum, uint256 dao, uint256 merchants, uint256 headhunters, uint256 effectiveTime);
    /// @notice SplitChangeExecuted
    event SplitChangeExecuted();
    /// @notice SplitChangeCancelled
    event SplitChangeCancelled();
    /// @notice DestinationChangeProposed
    /// @param nameHash nameHash
    /// @param addr addr
    /// @param effectiveTime effectiveTime
    event DestinationChangeProposed(bytes32 indexed nameHash, address addr, uint256 effectiveTime);
    /// @notice DestinationChangeExecuted
    /// @param nameHash nameHash
    /// @param addr addr
    event DestinationChangeExecuted(bytes32 indexed nameHash, address addr);
    /// @notice DestinationChangeCancelled
    /// @param nameHash nameHash
    event DestinationChangeCancelled(bytes32 indexed nameHash);
    /// @notice DestinationUpdated
    /// @param name name
    /// @param addr addr
    event DestinationUpdated(string name, address indexed addr);
    /// @notice MinDistributionAmountSet
    /// @param oldAmount oldAmount
    /// @param newAmount newAmount
    event MinDistributionAmountSet(uint256 oldAmount, uint256 newAmount);
    /// @notice DistributionTransferFailed
    /// @param channel channel
    /// @param recipient recipient
    /// @param amount amount
    event DistributionTransferFailed(string channel, address indexed recipient, uint256 amount);
    /// @notice RescueProposed
    /// @param to to
    /// @param amount amount
    /// @param effectiveTime effectiveTime
    event RescueProposed(address indexed to, uint256 amount, uint256 effectiveTime);
    /// @notice RescueExecuted
    /// @param to to
    /// @param amount amount
    event RescueExecuted(address indexed to, uint256 amount);
    /// @notice RescueCancelled
    /// @param to to
    /// @param amount amount
    event RescueCancelled(address indexed to, uint256 amount);
    /// @notice FeeSourceChangeProposed
    /// @param source source
    /// @param authorized authorized
    /// @param effectiveTime effectiveTime
    event FeeSourceChangeProposed(address indexed source, bool authorized, uint256 effectiveTime);
    /// @notice FeeSourceChangeExecuted
    /// @param source source
    /// @param authorized authorized
    event FeeSourceChangeExecuted(address indexed source, bool authorized);
    /// @notice FeeSourceChangeCancelled
    /// @param source source
    event FeeSourceChangeCancelled(address indexed source);

    /// @notice ZeroAddress
    error ZeroAddress();
    /// @notice InvalidSplit
    error InvalidSplit();
    /// @notice BurnTooLow
    error BurnTooLow();
    /// @notice NotAuthorized
    error NotAuthorized();
    /// @notice SingleSinkTooHigh
    error SingleSinkTooHigh();
    /// @notice BelowMinimum
    error BelowMinimum();
    /// @notice SplitChangeNotReady
    error SplitChangeNotReady();
    /// @notice NoSplitChangePending
    error NoSplitChangePending();
    /// @notice NoRescuePending
    error NoRescuePending();
    /// @notice RescueNotReady
    error RescueNotReady();
    /// @notice RescueAmountTooHigh
    error RescueAmountTooHigh();

    /// @notice constructor
    /// @param _token _token
    /// @param _burn _burn
    /// @param _sanctum _sanctum
    /// @param _daoPayroll _daoPayroll
    /// @param _merchantPool _merchantPool
    /// @param _headhunterPool _headhunterPool
    /// @param _admin _admin
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

        /// @notice TL-236 FIX: Propose a fee-source authorization change (48h timelock). (#236)
        /// @param source source
        /// @param authorized authorized
        function setAuthorizedFeeSource(address source, bool authorized) external onlyRole(ADMIN_ROLE) {
            if (source == address(0)) revert ZeroAddress();
            require(!pendingFeeSourceChange.pending, "FD: change pending");
            uint256 effectiveTime = block.timestamp + FEE_SOURCE_CHANGE_DELAY;
            pendingFeeSourceChange = PendingFeeSourceChange({ source: source, authorized: authorized, effectiveTime: effectiveTime, pending: true });
            emit FeeSourceChangeProposed(source, authorized, effectiveTime);
        }

        /// @notice Apply a pending fee-source change after the 48h timelock.
        function applyFeeSourceChange() external onlyRole(ADMIN_ROLE) {
            require(pendingFeeSourceChange.pending && block.timestamp >= pendingFeeSourceChange.effectiveTime, "FD: timelock");
            address source = pendingFeeSourceChange.source;
            bool auth = pendingFeeSourceChange.authorized;
            delete pendingFeeSourceChange;
            authorizedFeeSources[source] = auth;
            emit FeeSourceChangeExecuted(source, auth);
        }

        /// @notice Cancel a pending fee-source change.
        function cancelFeeSourceChange() external onlyRole(ADMIN_ROLE) {
            require(pendingFeeSourceChange.pending, "FD: no pending");
            address source = pendingFeeSourceChange.source;
            delete pendingFeeSourceChange;
            emit FeeSourceChangeCancelled(source);
        }

        /// @notice Receive fee tokens from VFIDEToken._transfer() or authorized sources.
        /// @param amount amount
        function receiveFee(uint256 amount) external nonReentrant {
            // F-33 FIX: Allow both VFIDEToken and authorized fee sources to report fees
            bool isVFIDEToken = msg.sender == address(vfideToken);
            bool isAuthorizedSource = authorizedFeeSources[msg.sender];
            if (!isVFIDEToken && !isAuthorizedSource) revert NotAuthorized();
            totalReceived += amount;
            emit FeeReceived(amount);
        }

    // M-6 FIX: Minimum interval between distribution calls to prevent spam/dust accumulation attacks
    /// @notice MIN_DISTRIBUTION_INTERVAL
    uint256 public constant MIN_DISTRIBUTION_INTERVAL = 1 hours;
    /// @notice lastDistributionTime
    uint256 public lastDistributionTime;

    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign
    /// @notice Distribute accumulated fees. Callable by anyone.
    function distribute() external nonReentrant whenNotPaused {
        // M-6 FIX: Rate-limit to prevent repeated spam calls before fees accumulate
        require(block.timestamp >= lastDistributionTime + MIN_DISTRIBUTION_INTERVAL, "FD: too soon");
        uint256 balance = vfideToken.balanceOf(address(this));
        if (balance < minDistributionAmount) revert BelowMinimum();

        // F-76 FIX: Reconcile totalReceived with actual token balance so direct transfers
        // (outside receiveFee) are accounted for in cumulative reporting.
        uint256 accountedBalance = totalReceived >= totalDistributed ? totalReceived - totalDistributed : 0;
        if (balance > accountedBalance) {
            totalReceived += (balance - accountedBalance);
        }

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
                    // F-51 FIX: Track soft-burn sink flow separately from hard burn().
                    totalBurnSinkHeld += toBurn;
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
        if (!pendingSplitChange.pending) revert NoSplitChangePending();
        // F-77 FIX: Clear the full pending struct, including newSplit values.
        delete pendingSplitChange;
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

    /// @notice Queue a rescue transfer for stranded balances after repeated sink failures.
    /// @param to to
    /// @param amount amount
    function proposeRescue(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert BelowMinimum();
        if (pendingRescue.pending) revert NoSplitChangePending();

        uint256 balance = vfideToken.balanceOf(address(this));
        if (amount > balance) revert RescueAmountTooHigh();

        pendingRescue = PendingRescue({
            to: to,
            amount: amount,
            effectiveTime: block.timestamp + DESTINATION_CHANGE_DELAY,
            pending: true
        });
        emit RescueProposed(to, amount, pendingRescue.effectiveTime);
    }

    /// @notice executeRescue
    function executeRescue() external onlyRole(ADMIN_ROLE) nonReentrant {
        if (!pendingRescue.pending) revert NoRescuePending();
        if (block.timestamp < pendingRescue.effectiveTime) revert RescueNotReady();

        address to = pendingRescue.to;
        uint256 amount = pendingRescue.amount;
        delete pendingRescue;

        IERC20(address(vfideToken)).safeTransfer(to, amount);
        totalDistributed += amount;
        totalRescued += amount;
        emit RescueExecuted(to, amount);
    }

    /// @notice cancelRescue
    function cancelRescue() external onlyRole(ADMIN_ROLE) {
        if (!pendingRescue.pending) revert NoRescuePending();
        address to = pendingRescue.to;
        uint256 amount = pendingRescue.amount;
        delete pendingRescue;
        emit RescueCancelled(to, amount);
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
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    function getCurrentSplit() external view returns (uint256, uint256, uint256, uint256, uint256) {
        return (feeSplit.burnBps, feeSplit.sanctumBps, feeSplit.daoPayrollBps, feeSplit.merchantPoolBps, feeSplit.headhunterPoolBps);
    }

    /// @notice _requireKnownDestination
    /// @param h h
    function _requireKnownDestination(bytes32 h) private pure {
        if (
            h != keccak256("burn") &&
            h != keccak256("sanctum") &&
            h != keccak256("dao") &&
            h != keccak256("merchants") &&
            h != keccak256("headhunters")
        ) revert("Unknown destination");
    }

    /// @notice _safeTransferOut
    /// @param recipient recipient
    /// @param amount amount
    /// @return _bool _bool
    function _safeTransferOut(address recipient, uint256 amount) private returns (bool) {
        // solhint-disable-next-line avoid-low-level-calls
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

    /// @notice _applyDestination
    /// @param h h
    /// @param addr addr
    /// @return name name
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
