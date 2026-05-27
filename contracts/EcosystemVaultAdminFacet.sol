// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ─────────────────────────────────────────────────────────────────────────────
// EcosystemVaultAdminFacet
//
// Delegatecall target for low-frequency owner-only administrative setters of
// EcosystemVault. Extracted to bring EcosystemVault under the EIP-170 limit.
//
// SECURITY: NEVER called directly — only via EcosystemVault's fallback.
//   address(this) inside this facet = EcosystemVault address.
//   msg.sender = original external caller.
//
// STORAGE LAYOUT: Must exactly mirror EcosystemVault slot order.
//   Constants/immutables use no storage slots and are NOT mirrored.
//
// SOUL COMMITMENT: This facet only manipulates configuration variables.
//   It contains zero fund-flow logic. Freeze/blacklist/seize are absent
//   by design — REMOVED comments live in EcosystemVault.
// ─────────────────────────────────────────────────────────────────────────────

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ── Minimal interfaces ────────────────────────────────────────────────────────

interface ISeer_EAF {
    function getScore(address) external view returns (uint16);
}
interface ICouncilManager_EAF {
    function getActiveMembers() external view returns (address[] memory);
}
interface IVaultHubReferral_EAF {
    function vaultOf(address owner) external view returns (address);
}
interface IERC20MetadataDecimals_EAF {
    function decimals() external view returns (uint8);
}

// ── Events — must exactly match EcosystemVault ────────────────────────────────

event SeerUpdated(address indexed oldSeer, address indexed newSeer);
event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
event ReferralVaultHubUpdated(address indexed oldHub, address indexed newHub);
event ManagerChangeQueued(address indexed manager, bool active, uint256 executeAfter);
event ManagerSet(address indexed manager, bool active);
event AllocationChangeQueued(uint16 councilBps, uint16 merchantBps, uint16 headhunterBps, uint16 operationsBps, uint256 executeAfter);
event AllocationUpdated(uint16 councilBps, uint16 merchantBps, uint16 headhunterBps, uint16 operationsBps);
event CouncilManagerChangeQueued(address indexed councilManager, uint256 executeAfter);
event CouncilManagerUpdated(address indexed oldCouncilManager, address indexed newCouncilManager);
event OperationsWalletChangeQueued(address indexed wallet, uint256 executeAfter);
event OperationsWalletUpdated(address indexed oldWallet, address indexed newWallet);
event OperationsCooldownSet(uint256 oldCooldown, uint256 newCooldown);
event AutoSwapConfigured(address router, address stablecoin, bool enabled, uint16 maxSlippageBps);
event MinOutputPerVfideSet(uint256 minOutput);
event StablecoinOnlyModeSet(bool enabled);
event StablecoinReserveWithdrawn(address indexed token, uint256 amount, address indexed recipient);
event AutoWorkPayoutConfigured(bool enabled, uint256 merchantTxReward, uint256 merchantReferralReward, uint256 userReferralReward);
event AutoPayoutSustainabilityConfigured(uint16 merchantReserveBps, uint16 headhunterReserveBps, uint16 maxAutoPayoutBps);
event ReferralWorkLevelsConfigured(uint16 l1p, uint16 l2p, uint16 l3p, uint16 l4p, uint256 l1r, uint256 l2r, uint256 l3r, uint256 l4r);
event WithdrawRequested(uint256 indexed id, address to, uint256 amount);
event WithdrawCancelled(uint256 indexed id);
event WithdrawExecuted(uint256 indexed id, address to, uint256 amount);

// ── Errors — must exactly match EcosystemVault ───────────────────────────────

error ECO_NotAuthorized();
error ECO_InsufficientFunds();
error ECO_Zero();
error ECO_NoPendingChange();
error ECO_ChangeNotReady();
error ECO_InvalidConfig();
error ECO_ExceedsMax();
error ECO_BpsTooHigh();

// ── Pending-change structs — must match EcosystemVault struct layouts ─────────

struct PendingManagerChange_F {
    address manager;
    bool active;
    uint256 executeAfter;
}
struct PendingAllocationChange_F {
    uint16 councilBps;
    uint16 merchantBps;
    uint16 headhunterBps;
    uint256 executeAfter;
}
struct PendingCouncilManagerChange_F {
    address councilManager;
    uint256 executeAfter;
}
struct PendingOperationsWalletChange_F {
    address wallet;
    uint256 executeAfter;
}
struct WithdrawRequest_F {
    address to;
    uint256 amount;
    uint256 executeAfter;
    bool executed;
    bool cancelled;
}

// ── Storage layout mirror — slot order must exactly match EcosystemVault ──────
//   Ownable storage: slot 0 = owner (address)
//   ReentrancyGuard: slot 1 = _status (uint256)
//   Then EcosystemVault storage in declaration order.

abstract contract ECOStorageLayout {
    // Ownable
    address public owner;                              // slot 0
    // ReentrancyGuard
    uint256 private _reentrancyStatus;                 // slot 1
    // EcosystemVault storage
    IERC20 public vfide;                               // slot 2  (immutable → no slot; but declared first, so slot 2 in layout mirror)
    IERC20 public rewardToken;                         // slot 3
    ISeer_EAF public seer;                             // slot 4
    ICouncilManager_EAF public councilManager;         // slot 5
    IVaultHubReferral_EAF public referralVaultHub;     // slot 6
    mapping(address => bool) public isManager;         // slot 7
    uint256 public withdrawRequestCount;               // slot 8
    mapping(uint256 => WithdrawRequest_F) public withdrawRequests; // slot 9
    uint256 public maxWithdrawBps;                     // slot 10
    uint256 public pendingWithdrawTotal;               // slot 11
    PendingManagerChange_F public pendingManagerChange;            // slot 12
    PendingAllocationChange_F public pendingAllocationChange;      // slot 13 (packed)
    PendingCouncilManagerChange_F public pendingCouncilManagerChange; // slot 14
    PendingOperationsWalletChange_F public pendingOperationsWalletChange; // slot 15
    uint16 public councilBps;                          // slot 16 (packed)
    uint16 public merchantBps;
    uint16 public headhunterBps;
    uint16 public operationsBps;
    address public operationsWallet;                   // slot 17
    uint256 public lastOperationsWithdrawal;           // slot 18
    uint256 public operationsWithdrawalCooldown;       // slot 19
    uint256 public councilPool;                        // slot 20
    uint256 public merchantPool;                       // slot 21
    uint256 public headhunterPool;                     // slot 22
    uint16 public merchantEpochCapBps;                 // slot 23 (packed)
    uint16 public headhunterEpochCapBps;
    uint256 public merchantEpochStart;                 // slot 24
    uint256 public headhunterEpochStart;               // slot 25
    uint256 public merchantPaidThisEpoch;              // slot 26
    uint256 public headhunterPaidThisEpoch;            // slot 27
    uint256 public operationsPool;                     // slot 28
    uint256 public totalReceived;                      // slot 29
    uint256 public lastCouncilDistribution;            // slot 30
    uint256 public lastMerchantDistribution;           // slot 31
    uint256 public currentMerchantPeriod;              // slot 32
    mapping(uint256 => mapping(address => uint256)) public periodMerchantTxCount;
    mapping(uint256 => mapping(address => uint16)) public periodMerchantTier;
    mapping(uint256 => address[]) public periodMerchants;
    mapping(uint256 => uint256) public merchantPeriodPoolSnapshot;
    mapping(uint256 => bool) public merchantPeriodEnded;
    mapping(uint256 => mapping(address => bool)) public merchantPeriodClaimed;
    mapping(address => uint256) public totalMerchantBonusesPaid;
    mapping(address => uint256) public merchantLifetimeTxCount;
    uint256 public currentYear;
    uint256 public currentQuarter;
    uint256 public yearStartTime;
    uint256 public lastQuarterPayout;
    mapping(uint256 => mapping(address => uint16)) public yearPoints;
    mapping(uint256 => address[]) public yearReferrers;
    mapping(uint256 => uint256) public totalYearPoints;
    mapping(uint256 => mapping(uint256 => uint256)) public quarterPoolSnapshot;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public quarterClaimed;
    mapping(uint256 => mapping(uint256 => bool)) public quarterEnded;
    mapping(address => address) public pendingMerchantReferrer;
    mapping(address => address) public pendingUserReferrer;
    mapping(address => bool) public referralCredited;
    address public swapRouter;
    address public preferredStablecoin;
    bool public autoSwapEnabled;
    uint16 public maxSlippageBps;
    uint256 public minOutputPerVfide;
    mapping(address => uint256) public stablecoinReserves;
    bool public stablecoinOnlyMode;
    bool public autoWorkPayoutEnabled;
    uint256 public autoMerchantTxReward;
    uint256 public autoMerchantReferralReward;
    uint256 public autoUserReferralReward;
    uint16 public merchantPoolReserveBps;
    uint16 public headhunterPoolReserveBps;
    uint16 public maxAutoPayoutBps;
    uint16 public referralLevel1Points;
    uint16 public referralLevel2Points;
    uint16 public referralLevel3Points;
    uint16 public referralLevel4Points;
    uint256 public referralLevel1Reward;
    uint256 public referralLevel2Reward;
    uint256 public referralLevel3Reward;
    uint256 public referralLevel4Reward;
    mapping(uint256 => mapping(address => uint8)) public referralLevelPaid;
    uint256 public totalCouncilPaid;
    uint256 public totalMerchantBonusPaid;
    uint256 public totalHeadhunterPaid;
    uint256 public totalBurned;
    uint256 public totalExpensesPaid;
    uint256 public operationsExpenseEpochStartedAt;
    uint256 public operationsExpenseEpochBase;
    uint256 public operationsSpentInEpoch;
}

// ── Access guard ──────────────────────────────────────────────────────────────

abstract contract ECOFacetAccess is ECOStorageLayout {
    function _onlyOwner() internal view {
        if (msg.sender != owner) revert ECO_NotAuthorized();
    }
    /// @dev True when councilManager is set = post-mainnet DAO control.
    function _governed() internal view returns (bool) {
        return address(councilManager) != address(0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────

contract EcosystemVaultAdminFacet is ECOFacetAccess {
    using SafeERC20 for IERC20;

    uint16 private constant MAX_BPS = 10000;
    uint256 private constant CHANGE_DELAY = 2 days;
    uint16 private constant MAX_EPOCH_CAP = 5000;

    // ── Manager ───────────────────────────────────────────────────────────────

    function setManager(address manager, bool active) external {
        _onlyOwner();
        if (_governed()) { _applyManager(manager, active); return; }
        pendingManagerChange = PendingManagerChange_F({ manager: manager, active: active, executeAfter: block.timestamp + CHANGE_DELAY });
        emit ManagerChangeQueued(manager, active, block.timestamp + CHANGE_DELAY);
    }
    function executeManagerChange() external {
        _onlyOwner();
        PendingManagerChange_F memory p = pendingManagerChange;
        if (p.executeAfter == 0) revert ECO_NoPendingChange();
        if (block.timestamp < p.executeAfter) revert ECO_ChangeNotReady();
        delete pendingManagerChange;
        _applyManager(p.manager, p.active);
    }
    function cancelManagerChange() external {
        _onlyOwner();
        if (pendingManagerChange.executeAfter == 0) revert ECO_NoPendingChange();
        delete pendingManagerChange;
    }
    function _applyManager(address manager, bool active) internal {
        isManager[manager] = active;
        emit ManagerSet(manager, active);
    }

    // ── Epoch caps ────────────────────────────────────────────────────────────

    function setEpochCaps(uint16 _merchantCapBps, uint16 _headhunterCapBps) external {
        _onlyOwner();
        if (_merchantCapBps > MAX_EPOCH_CAP || _headhunterCapBps > MAX_EPOCH_CAP) revert ECO_BpsTooHigh();
        merchantEpochCapBps = _merchantCapBps;
        headhunterEpochCapBps = _headhunterCapBps;
    }

    // ── Seer / RewardToken / VaultHub ─────────────────────────────────────────

    function setSeer(address _seer) external {
        _onlyOwner();
        if (_seer == address(0)) revert ECO_Zero();
        address old = address(seer);
        seer = ISeer_EAF(_seer);
        emit SeerUpdated(old, _seer);
    }
    function setRewardToken(address token) external {
        _onlyOwner();
        if (token == address(0)) revert ECO_Zero();
        if (councilPool != 0 || merchantPool != 0 || headhunterPool != 0 || operationsPool != 0) revert ECO_InvalidConfig();
        address old = address(rewardToken);
        rewardToken = IERC20(token);
        emit RewardTokenUpdated(old, token);
    }
    function setReferralVaultHub(address hub) external {
        _onlyOwner();
        address old = address(referralVaultHub);
        referralVaultHub = IVaultHubReferral_EAF(hub);
        emit ReferralVaultHubUpdated(old, hub);
    }

    // ── Council manager ───────────────────────────────────────────────────────

    function setCouncilManager(address _cm) external {
        _onlyOwner();
        if (_governed()) { _applyCouncilManager(_cm); return; }
        pendingCouncilManagerChange = PendingCouncilManagerChange_F({ councilManager: _cm, executeAfter: block.timestamp + CHANGE_DELAY });
        emit CouncilManagerChangeQueued(_cm, block.timestamp + CHANGE_DELAY);
    }
    function executeCouncilManagerChange() external {
        _onlyOwner();
        PendingCouncilManagerChange_F memory p = pendingCouncilManagerChange;
        if (p.executeAfter == 0) revert ECO_NoPendingChange();
        if (block.timestamp < p.executeAfter) revert ECO_ChangeNotReady();
        delete pendingCouncilManagerChange;
        _applyCouncilManager(p.councilManager);
    }
    function cancelCouncilManagerChange() external {
        _onlyOwner();
        if (pendingCouncilManagerChange.executeAfter == 0) revert ECO_NoPendingChange();
        delete pendingCouncilManagerChange;
    }
    function _applyCouncilManager(address _cm) internal {
        address old = address(councilManager);
        councilManager = ICouncilManager_EAF(_cm);
        emit CouncilManagerUpdated(old, _cm);
    }

    // ── Allocations ───────────────────────────────────────────────────────────

    function setAllocations(uint16 _cBps, uint16 _mBps, uint16 _hBps) external {
        _onlyOwner();
        _validateAlloc(_cBps, _mBps, _hBps);
        if (_governed()) { _applyAlloc(_cBps, _mBps, _hBps); return; }
        uint16 opsBps = MAX_BPS - (_cBps + _mBps + _hBps);
        pendingAllocationChange = PendingAllocationChange_F({ councilBps: _cBps, merchantBps: _mBps, headhunterBps: _hBps, executeAfter: block.timestamp + CHANGE_DELAY });
        emit AllocationChangeQueued(_cBps, _mBps, _hBps, opsBps, block.timestamp + CHANGE_DELAY);
    }
    function executeAllocationChange() external {
        _onlyOwner();
        PendingAllocationChange_F memory p = pendingAllocationChange;
        if (p.executeAfter == 0) revert ECO_NoPendingChange();
        if (block.timestamp < p.executeAfter) revert ECO_ChangeNotReady();
        delete pendingAllocationChange;
        _applyAlloc(p.councilBps, p.merchantBps, p.headhunterBps);
    }
    function cancelAllocationChange() external {
        _onlyOwner();
        if (pendingAllocationChange.executeAfter == 0) revert ECO_NoPendingChange();
        delete pendingAllocationChange;
    }
    function _applyAlloc(uint16 c, uint16 m, uint16 h) internal {
        councilBps = c; merchantBps = m; headhunterBps = h;
        operationsBps = MAX_BPS - (c + m + h);
        emit AllocationUpdated(c, m, h, operationsBps);
    }
    function _validateAlloc(uint16 c, uint16 m, uint16 h) internal pure {
        if (uint256(c) + m + h > MAX_BPS) revert ECO_BpsTooHigh();
    }

    // ── Operations wallet ─────────────────────────────────────────────────────

    function setOperationsWallet(address _w) external {
        _onlyOwner();
        if (_w == address(0)) revert ECO_Zero();
        uint256 ea = block.timestamp + CHANGE_DELAY;
        pendingOperationsWalletChange = PendingOperationsWalletChange_F({ wallet: _w, executeAfter: ea });
        emit OperationsWalletChangeQueued(_w, ea);
    }
    function cancelOperationsWalletChange() external {
        _onlyOwner();
        if (pendingOperationsWalletChange.executeAfter == 0) revert ECO_NoPendingChange();
        delete pendingOperationsWalletChange;
    }
    function applyOperationsWalletChange() external {
        _onlyOwner();
        PendingOperationsWalletChange_F memory p = pendingOperationsWalletChange;
        if (p.executeAfter == 0) revert ECO_NoPendingChange();
        if (block.timestamp < p.executeAfter) revert ECO_ChangeNotReady();
        address old = operationsWallet;
        operationsWallet = p.wallet;
        delete pendingOperationsWalletChange;
        emit OperationsWalletUpdated(old, p.wallet);
    }

    // ── Operations allocation & cooldown ──────────────────────────────────────

    function setOperationsAllocation(uint16 _opsBps) external {
        _onlyOwner();
        uint16 allocated = councilBps + merchantBps + headhunterBps;
        if (uint256(_opsBps) + allocated > MAX_BPS) revert ECO_BpsTooHigh();
        headhunterBps = MAX_BPS - (councilBps + merchantBps + _opsBps);
        operationsBps = _opsBps;
        emit AllocationUpdated(councilBps, merchantBps, headhunterBps, operationsBps);
    }
    function setOperationsCooldown(uint256 _cd) external {
        _onlyOwner();
        uint256 old = operationsWithdrawalCooldown;
        operationsWithdrawalCooldown = _cd;
        emit OperationsCooldownSet(old, _cd);
    }

    // ── Auto-swap ─────────────────────────────────────────────────────────────

    function configureAutoSwap(address router, address stablecoin, bool enabled, uint16 _slipBps) external {
        _onlyOwner();
        if (enabled && (router == address(0) || stablecoin == address(0))) revert ECO_InvalidConfig();
        if (_slipBps > 1000) revert ECO_ExceedsMax();
        swapRouter = router; preferredStablecoin = stablecoin;
        autoSwapEnabled = enabled; maxSlippageBps = _slipBps;
        emit AutoSwapConfigured(router, stablecoin, enabled, _slipBps);
    }
    function setMinOutputPerVfide(uint256 _min) external {
        _onlyOwner();
        minOutputPerVfide = _min;
        emit MinOutputPerVfideSet(_min);
    }
    function setStablecoinOnlyMode(bool _enabled) external {
        _onlyOwner();
        if (_enabled && preferredStablecoin == address(0)) revert ECO_InvalidConfig();
        stablecoinOnlyMode = _enabled;
        emit StablecoinOnlyModeSet(_enabled);
    }

    // ── Stablecoin reserve withdrawal ─────────────────────────────────────────

    function withdrawStablecoinReserve(address stablecoin, uint256 amount, address recipient) external {
        _onlyOwner();
        if (stablecoin == address(0) || recipient == address(0)) revert ECO_Zero();
        if (amount == 0 || amount > stablecoinReserves[stablecoin]) revert ECO_InsufficientFunds();
        stablecoinReserves[stablecoin] -= amount;
        IERC20(stablecoin).safeTransfer(recipient, amount);
        emit StablecoinReserveWithdrawn(stablecoin, amount, recipient);
    }

    // ── Auto work payout ──────────────────────────────────────────────────────

    function configureAutoWorkPayout(bool enabled, uint256 mTxR, uint256 mRefR, uint256 uRefR) external {
        _onlyOwner();
        autoWorkPayoutEnabled = enabled;
        autoMerchantTxReward = mTxR; autoMerchantReferralReward = mRefR; autoUserReferralReward = uRefR;
        emit AutoWorkPayoutConfigured(enabled, mTxR, mRefR, uRefR);
    }
    function configureAutoPayoutSustainability(uint16 mRes, uint16 hRes, uint16 maxAuto) external {
        _onlyOwner();
        if (mRes > 9000) revert ECO_ExceedsMax();
        if (hRes > 9000) revert ECO_ExceedsMax();
        if (maxAuto == 0 || maxAuto > 5000) revert ECO_InvalidConfig();
        merchantPoolReserveBps = mRes; headhunterPoolReserveBps = hRes; maxAutoPayoutBps = maxAuto;
        emit AutoPayoutSustainabilityConfigured(mRes, hRes, maxAuto);
    }
    function configureReferralWorkLevels(
        uint16 l1p, uint16 l2p, uint16 l3p, uint16 l4p,
        uint256 l1r, uint256 l2r, uint256 l3r, uint256 l4r
    ) external {
        _onlyOwner();
        if (l1p == 0 || l1p >= l2p || l2p >= l3p || l3p >= l4p) revert ECO_InvalidConfig();
        referralLevel1Points = l1p; referralLevel2Points = l2p;
        referralLevel3Points = l3p; referralLevel4Points = l4p;
        referralLevel1Reward = l1r; referralLevel2Reward = l2r;
        referralLevel3Reward = l3r; referralLevel4Reward = l4r;
        emit ReferralWorkLevelsConfigured(l1p, l2p, l3p, l4p, l1r, l2r, l3r, l4r);
    }

    // ── Timelocked withdrawals ─────────────────────────────────────────────────

    function requestWithdraw(address to, uint256 amount) external returns (uint256 id) {
        _onlyOwner();
        if (to == address(0) || amount == 0) revert ECO_Zero();
        uint256 outstanding = pendingWithdrawTotal + amount;
        uint256 cap = (rewardToken.balanceOf(address(this)) * maxWithdrawBps) / MAX_BPS;
        if (outstanding > cap) revert ECO_ExceedsMax();
        id = withdrawRequestCount++;
        withdrawRequests[id] = WithdrawRequest_F({ to: to, amount: amount, executeAfter: block.timestamp + CHANGE_DELAY, executed: false, cancelled: false });
        pendingWithdrawTotal += amount;
        emit WithdrawRequested(id, to, amount);
    }
    function cancelWithdraw(uint256 id) external {
        _onlyOwner();
        WithdrawRequest_F storage req = withdrawRequests[id];
        if (req.executed || req.cancelled) revert ECO_InvalidConfig();
        req.cancelled = true;
        pendingWithdrawTotal -= req.amount;
        emit WithdrawCancelled(id);
    }
    function executeWithdraw(uint256 id) external {
        _onlyOwner();
        WithdrawRequest_F storage req = withdrawRequests[id];
        if (req.executed || req.cancelled) revert ECO_InvalidConfig();
        if (block.timestamp < req.executeAfter) revert ECO_ChangeNotReady();
        req.executed = true;
        pendingWithdrawTotal -= req.amount;
        IERC20(rewardToken).safeTransfer(req.to, req.amount);
        emit WithdrawExecuted(id, req.to, req.amount);
    }
    function setMaxWithdrawBps(uint256 _bps) external {
        _onlyOwner();
        if (_bps > MAX_BPS) revert ECO_BpsTooHigh();
        maxWithdrawBps = _bps;
    }
}
