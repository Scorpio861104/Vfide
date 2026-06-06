// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * MerchantPortalConfigManager — DAO administration logic for MerchantPortal
 * -------------------------------------------------------------------------
 * Holds the 17 DAO-only administration functions (15 config setters +
 * suspendMerchant + reinstateMerchant) that were previously inline in
 * MerchantPortal. Called via delegatecall from MerchantPortal's fallback()
 * so that all state writes operate directly on MerchantPortal's storage.
 *
 * Storage layout MUST mirror MerchantPortal exactly (shared via
 * MerchantPortalStorageLayout base). Any storage layout change in
 * MerchantPortal must be reflected here.
 */

import {IVaultHub, IProofLedger, IERC20, ISeer, ISwapRouter, Ownable, ReentrancyGuard, SafeERC20} from "./SharedInterfaces.sol";
import {ScoringConstants} from "./lib/ScoringConstants.sol";

/// @notice MERCH_Zero
error MERCH_Zero_CM();
/// @notice MERCH_NotDAO (config manager copy — same selector as portal's)
error MERCH_NotDAO_CM();
/// @notice MERCH_InvalidConfig
error MERCH_InvalidConfig_CM();
/// @notice MERCH_NotConfigured
error MERCH_NotConfigured_CM();
/// @notice MERCH_TokenNotAccepted
error MERCH_TokenNotAccepted_CM();
/// @notice MERCH_NotRegistered
error MERCH_NotRegistered_CM();

/// @notice IERC20DecimalsMerchantCM
interface IERC20DecimalsMerchantCM {
    function decimals() external view returns (uint8);
}

/// @notice MerchantPortalConfigManager
/// @title  MerchantPortalConfigManager
/// @author Vfide
/// @dev    Invoked exclusively via delegatecall from MerchantPortal.fallback().
///         All storage reads/writes operate on MerchantPortal's storage context.
///         The storage variable declarations below MUST match MerchantPortal's
///         layout exactly (same order, same types, same inherited bases).
contract MerchantPortalConfigManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Storage layout mirror (must match MerchantPortal exactly) ──────────
    // Constants are fine — they don't occupy storage slots.
    uint256 public constant MIN_SWAP_OUTPUT_BPS = 9000;
    uint256 public constant MAX_SWAP_OUTPUT_BPS = 10000;
    uint256 public constant MAX_SWAP_PATH_LENGTH = 3;
    uint256 public constant REFUND_COMPLETION_WINDOW = 30 days;
    uint64 public constant MAX_PULL_PERMIT_DURATION = 90 days;

    // Events (must be declared for emit to work in delegatecall context)
    event ModulesSet(address vaultHub, address seer, address ledger);
    event FeeUpdated(uint256 feeBasisPoints);
    event ProtocolFeeProposed(uint256 newFeeBps, uint64 effectiveAt);
    event ProtocolFeeCancelled();
    event MinScoreUpdated(uint16 minScore);
    event FeeSinkSet(address sink);
    event MinSwapOutputUpdated(uint256 previousBps, uint256 newBps);
    event DAORotationProposed(address indexed nextDAO, uint64 effectiveAt);
    event DAORotationCancelled();
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    event MerchantSuspended(address indexed merchant, string reason);
    event MerchantReinstated(address indexed merchant);

    // Slot layout mirror — same order as MerchantPortal state variables
    // (after Ownable + ReentrancyGuard inherited slots)
    IVaultHub public vaultHub;
    ISeer public seer;
    IProofLedger public ledger;

    address public dao;
    address public pendingDAO;
    uint64 public pendingDAOAt;
    uint64 public constant DAO_CHANGE_DELAY = 48 hours;

    uint256 public pendingProtocolFeeBps;
    uint64 public pendingProtocolFeeAt;
    uint64 public constant PROTOCOL_FEE_CHANGE_DELAY = 24 hours;
    address public fraudRegistry;
    address private sessionKeyManager;

    uint256 public protocolFeeBps;
    address public feeSink;
    uint16 public minMerchantScore;

    // MerchantInfo struct (not used by config manager, but must be declared
    // to keep storage layout consistent with downstream mappings)
    struct MerchantInfo {
        bool registered;
        bool suspended;
        string businessName;
        string category;
        uint64 registeredAt;
        uint256 totalVolume;
        uint256 txCount;
        address payoutAddress;
    }
    mapping(address => MerchantInfo) public merchants;
    address[] public merchantList;
    mapping(address => bool) private merchantInList;
    mapping(address => uint256) private merchantIndexPlusOne;

    uint64 public constant PAYOUT_ADDRESS_DELAY = 24 hours;
    mapping(address => address) public pendingPayoutAddress;
    mapping(address => uint64) public pendingPayoutAddressEffectiveAt;

    mapping(address => bool) public acceptedTokens;
    mapping(address => uint8) public acceptedTokenDecimals;
    mapping(address => mapping(address => bool)) public merchantPullApproved;
    mapping(address => mapping(address => uint256)) public merchantPullRemaining;
    mapping(address => mapping(address => uint64)) public merchantPullExpiry;
    mapping(address => mapping(address => address)) public merchantPullToken;

    ISwapRouter public swapRouter;
    address public stablecoin;
    mapping(address => bool) public autoConvert;

    uint256 public minSwapOutputBps;
    mapping(address => address[]) public tokenSwapPaths;

    // ─── LedgerLogFailed event (from SharedInterfaces) ──────────────────────
    event LedgerLogFailed(address indexed target, string action);

    // ─── DAO auth (checked by portal's fallback before delegatecall) ────────
    // The portal already verified msg.sender == dao before delegating.
    // No modifier needed here — portal enforces the check.

    // ─── 15 Config Setter Functions ─────────────────────────────────────────

    /// @notice setModules — sets the three core module addresses
    function setModules(address _vaultHub, address _seer, address _ledger) external {
        if (_vaultHub == address(0) || _seer == address(0)) revert MERCH_Zero_CM();
        vaultHub = IVaultHub(_vaultHub);
        seer = ISeer(_seer);
        ledger = IProofLedger(_ledger);
        emit ModulesSet(_vaultHub, _seer, _ledger);
        _log("m_mod_set");
    }

    /// @notice setDAO — propose a DAO transfer (48h timelock)
    function setDAO(address _dao) external {
        if (_dao == address(0)) revert MERCH_Zero_CM();
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit DAORotationProposed(_dao, pendingDAOAt);
        _log("m_dao_pend");
    }

    /// @notice applyDAO — apply a pending DAO transfer after timelock
    function applyDAO() external {
        if (pendingDAOAt == 0) revert MERCH_NotConfigured_CM();
        if (block.timestamp < pendingDAOAt) revert MERCH_NotConfigured_CM();
        address oldDAO = dao;
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOSet(oldDAO, dao);
        _log("m_dao_set");
    }

    /// @notice cancelDAO — cancel a pending DAO transfer
    function cancelDAO() external {
        if (pendingDAOAt == 0) revert MERCH_NotConfigured_CM();
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAORotationCancelled();
        _log("m_dao_cancel");
    }

    // slither-disable-next-line missing-zero-check
    /// @notice setSessionKeyManager — set optional session key spend-limit gate
    function setSessionKeyManager(address _skm) external {
        sessionKeyManager = _skm;
    }

    /// @notice setProtocolFee — propose a fee change (24h timelock)
    function setProtocolFee(uint256 _feeBps) external {
        if (_feeBps > 500) revert MERCH_InvalidConfig_CM();
        pendingProtocolFeeBps = _feeBps;
        pendingProtocolFeeAt = uint64(block.timestamp) + PROTOCOL_FEE_CHANGE_DELAY;
        emit ProtocolFeeProposed(_feeBps, pendingProtocolFeeAt);
        _log("fee_pend");
    }

    /// @notice applyProtocolFee — apply the pending fee after timelock
    function applyProtocolFee() external {
        if (pendingProtocolFeeAt == 0) revert MERCH_NotConfigured_CM();
        if (block.timestamp < pendingProtocolFeeAt) revert MERCH_NotConfigured_CM();
        protocolFeeBps = pendingProtocolFeeBps;
        delete pendingProtocolFeeBps;
        delete pendingProtocolFeeAt;
        emit FeeUpdated(protocolFeeBps);
        _log("fee_upd");
    }

    /// @notice cancelProtocolFee — cancel the pending fee change
    function cancelProtocolFee() external {
        if (pendingProtocolFeeAt == 0) revert MERCH_NotConfigured_CM();
        delete pendingProtocolFeeBps;
        delete pendingProtocolFeeAt;
        emit ProtocolFeeCancelled();
        _log("fee_cancel");
    }

    /// @notice setFeeSink — update the fee collection address
    function setFeeSink(address _sink) external {
        if (_sink == address(0)) revert MERCH_Zero_CM();
        feeSink = _sink;
        emit FeeSinkSet(_sink);
        _log("fee_sink");
    }

    /// @notice setMinMerchantScore — update the minimum ProofScore for merchants
    function setMinMerchantScore(uint16 _minScore) external {
        if (_minScore > 10000) revert MERCH_InvalidConfig_CM();
        minMerchantScore = _minScore;
        emit MinScoreUpdated(_minScore);
        _log("min_score");
    }

    /// @notice setFraudRegistry — update the fraud registry address
    function setFraudRegistry(address _fr) external {
        if (_fr == address(0)) revert MERCH_Zero_CM();
        fraudRegistry = _fr;
    }

    /// @notice setAcceptedToken — add or remove an accepted payment token
    function setAcceptedToken(address token, bool accepted) external {
        if (token == address(0)) revert MERCH_Zero_CM();
        acceptedTokens[token] = accepted;
        if (accepted) {
            (uint8 decimals, bool ok) = _readTokenDecimals(token);
            if (!ok) revert MERCH_InvalidConfig_CM();
            acceptedTokenDecimals[token] = decimals;
        } else {
            delete acceptedTokenDecimals[token];
        }
        _log(accepted ? "tok_on" : "tok_off");
    }

    /// @notice setSwapConfig — configure the DEX router and target stablecoin
    function setSwapConfig(address _router, address _stable) external {
        if (_router != address(0)) {
            if (_stable == address(0)) revert MERCH_InvalidConfig_CM();
            if (!(acceptedTokens[_stable] || _stable == stablecoin)) revert MERCH_TokenNotAccepted_CM();
        }
        swapRouter = ISwapRouter(_router);
        stablecoin = _stable;
        _log("swap_cfg");
    }

    /// @notice setMinSwapOutput — update slippage protection floor
    function setMinSwapOutput(uint256 _minBps) external {
        if (_minBps < MIN_SWAP_OUTPUT_BPS || _minBps > MAX_SWAP_OUTPUT_BPS) revert MERCH_InvalidConfig_CM();
        uint256 previousBps = minSwapOutputBps;
        minSwapOutputBps = _minBps;
        emit MinSwapOutputUpdated(previousBps, _minBps);
        _log("swap_min");
    }

    /// @notice setSwapPath — configure multi-hop swap path for a token
    function setSwapPath(address token, address[] calldata path) external {
        if (token == address(0)) revert MERCH_Zero_CM();
        if (path.length < 2 || path.length > MAX_SWAP_PATH_LENGTH) revert MERCH_InvalidConfig_CM();
        if (path[0] != token) revert MERCH_InvalidConfig_CM();
        if (path[path.length - 1] != stablecoin) revert MERCH_InvalidConfig_CM();
        for (uint256 i = 0; i < path.length; ++i) {
            if (path[i] == address(0)) revert MERCH_Zero_CM();
        }
        tokenSwapPaths[token] = path;
        _log("swap_path");
    }

    // ─── 2 Merchant Admin Functions ──────────────────────────────────────────

    /// @notice suspendMerchant — DAO can suspend merchants for violations
    function suspendMerchant(address merchant, string calldata reason) external {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered_CM();
        merchants[merchant].suspended = true;
        emit MerchantSuspended(merchant, reason);
        _logEv(merchant, "m_susp", 0, reason);
    }

    /// @notice reinstateMerchant — DAO can reinstate suspended merchants
    function reinstateMerchant(address merchant) external {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered_CM();
        merchants[merchant].suspended = false;
        emit MerchantReinstated(merchant);
        _logEv(merchant, "m_rein", 0, "");
    }

    // ─── Internal Helpers (mirrored from MerchantPortal) ────────────────────

    // slither-disable-next-line reentrancy-events
    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {
                emit LedgerLogFailed(address(this), action);
            }
        }
    }

    // slither-disable-next-line reentrancy-events
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch {
                emit LedgerLogFailed(who, action);
            }
        }
    }

    function _readTokenDecimals(address token) internal view returns (uint8 decimals, bool ok) {
        try IERC20DecimalsMerchantCM(token).decimals() returns (uint8 d) {
            return (d, true);
        } catch {
            return (0, false);
        }
    }
}
