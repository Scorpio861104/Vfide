// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * FeeDistributor — Ecosystem Fee Router for Vfide
 * ─────────────────────────────────────────────────
 * Receives the 50% ecosystem share from BurnRouter / EcosystemVault
 * and routes it to the three operational channels:
 *
 *   DAO payroll   — council salaries
 *   Merchant pool — volume-based merchant competition rewards
 *   Headhunter pool — referral / onboarding rewards
 *
 * Burn and Sanctum are handled UPSTREAM by ProofScoreBurnRouter
 * (40% burn, 10% Sanctum on every transfer fee). FeeDistributor
 * MUST NOT re-burn or re-fund Sanctum — those are already accounted for.
 *
 * Default split (basis points, 10000 = 100%):
 *   50% → DAO payroll pool
 *   30% → Merchant competition pool
 *   20% → Headhunter competition pool
 *
 * No channel may exceed MAX_SINGLE_BPS (60%).
 * All three channels must sum to exactly MAX_BPS (10000).
 * Splits are DAO-governed with a 72-hour timelock.
 */

import { IERC20, SafeERC20, AccessControl, ReentrancyGuard, Pausable } from "./SharedInterfaces.sol";

interface IVFIDEToken is IERC20 {
    // No burn needed — FeeDistributor is ecosystem-only
}

/// @notice FeeDistributor
/// @title FeeDistributor — Ecosystem Fee Router
/// @author Vfide
contract FeeDistributor is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice ADMIN_ROLE
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice MAX_BPS
    uint256 public constant MAX_BPS = 10000;
    /// @notice MAX_SINGLE_BPS — no single channel may exceed 60%
    uint256 public constant MAX_SINGLE_BPS = 6000;
    /// @notice SPLIT_CHANGE_DELAY
    uint256 public constant SPLIT_CHANGE_DELAY = 72 hours;
    /// @notice DESTINATION_CHANGE_DELAY
    uint256 public constant DESTINATION_CHANGE_DELAY = 72 hours;
    /// @notice FEE_SOURCE_CHANGE_DELAY
    uint256 public constant FEE_SOURCE_CHANGE_DELAY = 48 hours;

    struct FeeSplit {
        uint256 daoPayrollBps;
        uint256 merchantPoolBps;
        uint256 headhunterPoolBps;
    }

    /// @notice vfideToken
    IERC20 public immutable vfideToken;

    // Destinations
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
    /// @notice totalToDAO
    uint256 public totalToDAO;
    /// @notice totalToMerchants
    uint256 public totalToMerchants;
    /// @notice totalToHeadhunters
    uint256 public totalToHeadhunters;
    /// @notice totalRescued
    uint256 public totalRescued;

    /// @notice minDistributionAmount
    uint256 public minDistributionAmount;

    /// @notice lastDistributionTime
    uint256 public lastDistributionTime;
    /// @notice MIN_DISTRIBUTION_INTERVAL
    uint256 public constant MIN_DISTRIBUTION_INTERVAL = 1 hours;

    // F-33: Authorized fee sources
    /// @notice authorizedFeeSources
    mapping(address => bool) public authorizedFeeSources;

    // TL-236: Pending fee source change
    struct PendingFeeSourceChange {
        address source;
        bool authorized;
        uint256 effectiveTime;
        bool pending;
    }
    /// @notice pendingFeeSourceChange
    PendingFeeSourceChange public pendingFeeSourceChange;

    // Timelocked split change
    struct PendingSplitChange {
        FeeSplit newSplit;
        uint256 effectiveTime;
        bool pending;
    }
    /// @notice pendingSplitChange
    PendingSplitChange public pendingSplitChange;

    // Timelocked destination change
    struct PendingDestinationChange {
        bytes32 nameHash;
        address addr;
        uint256 effectiveTime;
        bool pending;
    }
    /// @notice pendingDestinationChange
    PendingDestinationChange public pendingDestinationChange;

    // Timelocked rescue
    struct PendingRescue {
        address to;
        uint256 amount;
        uint256 effectiveTime;
        bool pending;
    }
    /// @notice pendingRescue
    PendingRescue public pendingRescue;

    // ─── Events ────────────────────────────────────────────────────────────────
    /// @notice FeeReceived
    event FeeReceived(uint256 amount);
    /// @notice FeeDistributed
    event FeeDistributed(uint256 total, uint256 dao, uint256 merchants, uint256 headhunters);
    /// @notice SplitChangeProposed
    event SplitChangeProposed(uint256 dao, uint256 merchants, uint256 headhunters, uint256 effectiveTime);
    /// @notice SplitChangeExecuted
    event SplitChangeExecuted();
    /// @notice SplitChangeCancelled
    event SplitChangeCancelled();
    /// @notice DestinationChangeProposed
    event DestinationChangeProposed(bytes32 indexed nameHash, address addr, uint256 effectiveTime);
    /// @notice DestinationChangeExecuted
    event DestinationChangeExecuted(bytes32 indexed nameHash, address addr, string name);
    /// @notice DestinationChangeCancelled
    event DestinationChangeCancelled(bytes32 indexed nameHash);
    /// @notice DistributionTransferFailed
    event DistributionTransferFailed(string channel, address destination, uint256 amount);
    /// @notice FeeSourceChangeProposed
    event FeeSourceChangeProposed(address source, bool authorized, uint256 effectiveTime);
    /// @notice FeeSourceChangeExecuted
    event FeeSourceChangeExecuted(address source, bool authorized);
    /// @notice FeeSourceChangeCancelled
    event FeeSourceChangeCancelled(address source);
    /// @notice RescueProposed
    event RescueProposed(address to, uint256 amount, uint256 effectiveTime);
    /// @notice RescueExecuted
    event RescueExecuted(address to, uint256 amount);
    /// @notice RescueCancelled
    event RescueCancelled();

    // ─── Errors ────────────────────────────────────────────────────────────────
    error ZeroAddress();
    error InvalidSplit();
    error SingleSinkTooHigh();
    error BelowMinimum();
    error NotAuthorized();
    error NoSplitChangePending();
    error SplitChangeNotReady();

    // ─── Constructor ───────────────────────────────────────────────────────────
    /// @notice constructor
    /// @param _token VFIDE token address
    /// @param _daoPayroll DAO payroll pool address
    /// @param _merchantPool Merchant competition pool address
    /// @param _headhunterPool Headhunter competition pool address
    /// @param _admin Admin / DAO address
    constructor(
        address _token,
        address _daoPayroll,
        address _merchantPool,
        address _headhunterPool,
        address _admin
    ) {
        if (_token == address(0) || _admin == address(0)) revert ZeroAddress();
        if (_daoPayroll == address(0) || _merchantPool == address(0) || _headhunterPool == address(0)) revert ZeroAddress();

        vfideToken = IERC20(_token);
        daoPayrollPool = _daoPayroll;
        merchantPool   = _merchantPool;
        headhunterPool = _headhunterPool;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);

        // Default: 50% DAO / 30% Merchant / 20% Headhunter
        feeSplit = FeeSplit({daoPayrollBps: 5000, merchantPoolBps: 3000, headhunterPoolBps: 2000});

        minDistributionAmount = 100 * 1e18;
    }

    // ─── Fee ingestion ─────────────────────────────────────────────────────────

    /// @notice Accept fee tokens from authorised sources (EcosystemVault, VFIDEToken).
    function receiveFee(uint256 amount) external {
        if (msg.sender != address(vfideToken) && !authorizedFeeSources[msg.sender]) revert NotAuthorized();
        totalReceived += amount;
        emit FeeReceived(amount);
    }

    // ─── Distribution ──────────────────────────────────────────────────────────

    /// @notice Distribute accumulated ecosystem fees to the three operational pools.
    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign
    function distribute() external nonReentrant whenNotPaused {
        require(block.timestamp >= lastDistributionTime + MIN_DISTRIBUTION_INTERVAL, "FD: too soon");
        uint256 balance = vfideToken.balanceOf(address(this));
        if (balance < minDistributionAmount) revert BelowMinimum();

        // F-76: reconcile totalReceived with actual balance (handles direct transfers)
        uint256 accountedBalance = totalReceived >= totalDistributed ? totalReceived - totalDistributed : 0;
        if (balance > accountedBalance) {
            totalReceived += (balance - accountedBalance);
        }

        uint256 toDAO        = (balance * feeSplit.daoPayrollBps)    / MAX_BPS;
        uint256 toMerchants  = (balance * feeSplit.merchantPoolBps)   / MAX_BPS;
        uint256 toHeadhunters = balance - toDAO - toMerchants; // rounding remainder

        uint256 distributedThisRun = 0;

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
        emit FeeDistributed(distributedThisRun, toDAO, toMerchants, toHeadhunters);
    }

    // ─── Split governance ──────────────────────────────────────────────────────

    /// @notice Propose a new fee split (3-channel, must sum to MAX_BPS, no channel > MAX_SINGLE_BPS).
    function proposeSplitChange(uint256 dao, uint256 merchants, uint256 headhunters) external onlyRole(ADMIN_ROLE) {
        if (dao + merchants + headhunters != MAX_BPS) revert InvalidSplit();
        if (dao > MAX_SINGLE_BPS || merchants > MAX_SINGLE_BPS || headhunters > MAX_SINGLE_BPS) revert SingleSinkTooHigh();
        pendingSplitChange = PendingSplitChange({
            newSplit: FeeSplit(dao, merchants, headhunters),
            effectiveTime: block.timestamp + SPLIT_CHANGE_DELAY,
            pending: true
        });
        emit SplitChangeProposed(dao, merchants, headhunters, block.timestamp + SPLIT_CHANGE_DELAY);
    }

    /// @notice Apply a pending split change after the 72h delay.
    function executeSplitChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingSplitChange.pending) revert NoSplitChangePending();
        if (block.timestamp < pendingSplitChange.effectiveTime) revert SplitChangeNotReady();
        feeSplit = pendingSplitChange.newSplit;
        pendingSplitChange.pending = false;
        emit SplitChangeExecuted();
    }

    /// @notice Cancel a pending split change.
    function cancelSplitChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingSplitChange.pending) revert NoSplitChangePending();
        pendingSplitChange.pending = false;
        emit SplitChangeCancelled();
    }

    // ─── Destination governance ────────────────────────────────────────────────

    /// @notice Propose a destination change for one of the three pools.
    /// @param name "dao" | "merchants" | "headhunters"
    function setDestination(string calldata name, address addr) external onlyRole(ADMIN_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        bytes32 h = keccak256(bytes(name));
        _validateDestinationName(h);
        pendingDestinationChange = PendingDestinationChange({
            nameHash: h,
            addr: addr,
            effectiveTime: block.timestamp + DESTINATION_CHANGE_DELAY,
            pending: true
        });
        emit DestinationChangeProposed(h, addr, block.timestamp + DESTINATION_CHANGE_DELAY);
    }

    /// @notice Execute a pending destination change after the 72h delay.
    function executeDestinationChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingDestinationChange.pending) revert NoSplitChangePending();
        if (block.timestamp < pendingDestinationChange.effectiveTime) revert SplitChangeNotReady();
        bytes32 h = pendingDestinationChange.nameHash;
        address addr = pendingDestinationChange.addr;
        pendingDestinationChange.pending = false;
        string memory name = _applyDestination(h, addr);
        emit DestinationChangeExecuted(h, addr, name);
    }

    /// @notice Cancel a pending destination change.
    function cancelDestinationChange() external onlyRole(ADMIN_ROLE) {
        if (!pendingDestinationChange.pending) revert NoSplitChangePending();
        bytes32 h = pendingDestinationChange.nameHash;
        pendingDestinationChange.pending = false;
        emit DestinationChangeCancelled(h);
    }

    // ─── Fee source governance (TL-236) ────────────────────────────────────────

    /// @notice Propose a fee-source authorisation change (48h timelock).
    function setAuthorizedFeeSource(address source, bool authorized) external onlyRole(ADMIN_ROLE) {
        if (source == address(0)) revert ZeroAddress();
        require(!pendingFeeSourceChange.pending, "FD: change pending");
        uint256 effectiveTime = block.timestamp + FEE_SOURCE_CHANGE_DELAY;
        pendingFeeSourceChange = PendingFeeSourceChange({source: source, authorized: authorized, effectiveTime: effectiveTime, pending: true});
        emit FeeSourceChangeProposed(source, authorized, effectiveTime);
    }

    /// @notice Apply a pending fee-source change after the 48h delay.
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

    // ─── Emergency rescue (timelocked) ─────────────────────────────────────────

    /// @notice Propose a token rescue (for tokens mistakenly sent directly).
    function proposeRescue(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(!pendingRescue.pending, "FD: rescue pending");
        if (to == address(0)) revert ZeroAddress();
        uint256 effectiveTime = block.timestamp + 72 hours;
        pendingRescue = PendingRescue({to: to, amount: amount, effectiveTime: effectiveTime, pending: true});
        emit RescueProposed(to, amount, effectiveTime);
    }

    /// @notice Execute a pending rescue after the 72h delay.
    function executeRescue() external onlyRole(ADMIN_ROLE) {
        require(pendingRescue.pending && block.timestamp >= pendingRescue.effectiveTime, "FD: rescue timelock");
        address to = pendingRescue.to;
        uint256 amount = pendingRescue.amount;
        delete pendingRescue;
        totalRescued += amount;
        _safeTransferOut(to, amount);
        emit RescueExecuted(to, amount);
    }

    /// @notice Cancel a pending rescue.
    function cancelRescue() external onlyRole(ADMIN_ROLE) {
        require(pendingRescue.pending, "FD: no pending rescue");
        delete pendingRescue;
        emit RescueCancelled();
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    /// @notice Update minimum distribution amount.
    function setMinDistributionAmount(uint256 amount) external onlyRole(ADMIN_ROLE) {
        minDistributionAmount = amount;
    }

    /// @notice Pause distribution.
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    /// @notice Unpause distribution.
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ─── Views ─────────────────────────────────────────────────────────────────

    /// @notice Preview the next distribution without executing it.
    function previewDistribution() external view returns (uint256 total, uint256 toDAO, uint256 toMerchants, uint256 toHeadhunters) {
        total = vfideToken.balanceOf(address(this));
        toDAO       = (total * feeSplit.daoPayrollBps)  / MAX_BPS;
        toMerchants = (total * feeSplit.merchantPoolBps) / MAX_BPS;
        toHeadhunters = total - toDAO - toMerchants;
    }

    /// @notice Return current split in bps (dao, merchants, headhunters).
    function getSplit() external view returns (uint256, uint256, uint256) {
        return (feeSplit.daoPayrollBps, feeSplit.merchantPoolBps, feeSplit.headhunterPoolBps);
    }

    // ─── Internal ──────────────────────────────────────────────────────────────

    function _safeTransferOut(address recipient, uint256 amount) private returns (bool) {
        (bool success, bytes memory returnData) = address(vfideToken).call(abi.encodeCall(IERC20.transfer, (recipient, amount)));
        if (!success) return false;
        if (returnData.length == 0) return true;
        return abi.decode(returnData, (bool));
    }

    function _validateDestinationName(bytes32 h) private pure {
        if (h != keccak256("dao") && h != keccak256("merchants") && h != keccak256("headhunters"))
            revert("FD: unknown destination");
    }

    function _applyDestination(bytes32 h, address addr) private returns (string memory name) {
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
        revert("FD: unknown destination");
    }
}
