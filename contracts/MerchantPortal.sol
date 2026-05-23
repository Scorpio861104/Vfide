// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * MerchantPortal (zkSync Era ready) — FINAL
 * ----------------------------------------------------------
 * Per VFIDE Ecosystem Overview Section 8.4:
 * - Merchants can accept VFIDE (and possibly other tokens)
 * - Simple point-of-sale integration
 * - Instant trust assessment using ProofScore
 * - Optional instant conversion to stablecoins (via DEX/CEX integrations)
 * - Low/no protocol fee for payments (doesn't gouge merchants)
 * - Trust-enhanced risk scores for customers
 * - Merchants cannot manipulate ProofScore (read-only access)
 * - All transactions logged for transparency
 */

import "./SharedInterfaces.sol";
import "./lib/ScoringConstants.sol";

/// @notice IVFIDETokenBurnRouterView
/// @title IVFIDETokenBurnRouterView
/// @author Vfide
interface IVFIDETokenBurnRouterView {
    /// @notice burnRouter
    /// @return _address _address
    function burnRouter() external view returns (address);
}

/// @notice ICardBoundVaultPermitView
/// @title ICardBoundVaultPermitView
/// @author Vfide
interface ICardBoundVaultPermitView {
    /// @notice dailyTransferLimit
    /// @return _uint256 _uint256
    function dailyTransferLimit() external view returns (uint256);
}

/// @notice IFraudRegistryMerchant
/// @title IFraudRegistryMerchant
/// @author Vfide
interface IFraudRegistryMerchant {
    /// @notice isServiceBanned
    /// @param user user
    /// @return _bool _bool
    function isServiceBanned(address user) external view returns (bool);
}

/// @notice IERC20DecimalsMerchant
/// @title IERC20DecimalsMerchant
/// @author Vfide
interface IERC20DecimalsMerchant {
    /// @notice decimals
    /// @return _uint8 _uint8
    function decimals() external view returns (uint8);
}

// N-L15 FIX: optional SessionKeyManager gate.
// MerchantPortal checks session-key spend limits when sessionKeyManager is configured.
// If not set (zero address), the check is bypassed (backward-compatible default).
/// @notice ISessionKeyManager_MP
/// @title ISessionKeyManager_MP
/// @author Vfide
interface ISessionKeyManager_MP {
    /// @notice Returns true if `spender` has an active session key authorised to spend `amount`
    ///         of the given token for the given merchant.
    /// @param spender spender
    /// @param merchant merchant
    /// @param token token
    /// @param amount amount
    /// @return _bool _bool
    function canSpend(address spender, address merchant, address token, uint256 amount) external view returns (bool);
}

/// @notice ICardBoundVaultPay
/// @title ICardBoundVaultPay
/// @author Vfide
interface ICardBoundVaultPay {
    struct PayIntent {
        address vault;
        address merchantPortal;
        address token;
        address merchant;
        address recipient;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }

    /// @notice executePayMerchant
    /// @param intent intent
    /// @param signature signature
    function executePayMerchant(PayIntent calldata intent, bytes calldata signature) external;
}

/// @notice MERCH_Zero
error MERCH_Zero();
/// @notice MERCH_NotDAO
error MERCH_NotDAO();
/// @notice MERCH_NotMerchant
error MERCH_NotMerchant();
/// @notice MERCH_NotRegistered
error MERCH_NotRegistered();
/// @notice MERCH_AlreadyRegistered
error MERCH_AlreadyRegistered();
/// @notice MERCH_Suspended
error MERCH_Suspended();
/// @notice MERCH_LowTrust
error MERCH_LowTrust();
/// @notice MERCH_InvalidPayment
error MERCH_InvalidPayment();
/// @notice MERCH_EscrowRequired
error MERCH_EscrowRequired();
/// @notice MERCH_InvalidConfig
error MERCH_InvalidConfig();
/// @notice MERCH_TokenNotAccepted
error MERCH_TokenNotAccepted();
/// @notice MERCH_NoVault
error MERCH_NoVault();
/// @notice MERCH_NotApproved
error MERCH_NotApproved();
/// @notice MERCH_ApprovalExpired
error MERCH_ApprovalExpired();
/// @notice MERCH_LimitExceeded
error MERCH_LimitExceeded();
/// @notice MERCH_NotFound
error MERCH_NotFound();
/// @notice MERCH_AlreadyCompleted
error MERCH_AlreadyCompleted();
/// @notice MERCH_Forbidden
error MERCH_Forbidden();
/// @notice MERCH_CapExceeded
error MERCH_CapExceeded();
/// @notice MERCH_NotConfigured
error MERCH_NotConfigured();
/// @notice MERCH_VFIDESettlementDisabled
error MERCH_VFIDESettlementDisabled();
/// @notice MERCH_IntentInvalid
error MERCH_IntentInvalid();
/// @notice MERCH_IntentRecipientMismatch
error MERCH_IntentRecipientMismatch();
/// @notice MERCH_InvalidChannel
error MERCH_InvalidChannel();
/// @notice MERCH_Deprecated
error MERCH_Deprecated();

// Removed local Ownable to use SharedInterfaces.sol

// Removed local ReentrancyGuard to use SharedInterfaces.sol

/// @notice Payment channel types for differentiation and analytics
enum PaymentChannel {
    ONLINE,         // 0 - E-commerce, requires escrow for buyer protection
    IN_PERSON,      // 1 - Point of sale, instant settlement, no escrow
    POS_TERMINAL,   // 2 - Hardware POS terminal
    QR_CODE,        // 3 - QR code scan payment
    SUBSCRIPTION,   // 4 - Recurring subscription
    INVOICE         // 5 - Invoice/bill payment
}

/// @notice MerchantPortal
/// @title MerchantPortal
/// @author Vfide
contract MerchantPortal is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice MIN_SWAP_OUTPUT_BPS
    uint256 public constant MIN_SWAP_OUTPUT_BPS = 9000;
    /// @notice MAX_SWAP_OUTPUT_BPS
    uint256 public constant MAX_SWAP_OUTPUT_BPS = 10000;
    /// @notice MAX_SWAP_PATH_LENGTH
    uint256 public constant MAX_SWAP_PATH_LENGTH = 3;
    /// @notice REFUND_COMPLETION_WINDOW
    uint256 public constant REFUND_COMPLETION_WINDOW = 30 days;
    /// @notice MAX_PULL_PERMIT_DURATION
    uint64 public constant MAX_PULL_PERMIT_DURATION = 90 days;
    
    /// Events
    /// @notice ModulesSet
    /// @param vaultHub vaultHub
    /// @param seer seer
    /// @param ledger ledger
    event ModulesSet(address vaultHub, address seer, address ledger);
    /// @notice MerchantRegistered
    /// @param merchant merchant
    /// @param businessName businessName
    /// @param category category
    event MerchantRegistered(address indexed merchant, string businessName, string category);
    /// @notice MerchantSuspended
    /// @param merchant merchant
    /// @param reason reason
    event MerchantSuspended(address indexed merchant, string reason);
    /// @notice MerchantReinstated
    /// @param merchant merchant
    event MerchantReinstated(address indexed merchant);
    /// @notice PaymentProcessed
    /// @param customer customer
    /// @param merchant merchant
    /// @param token token
    /// @param amount amount
    /// @param fee fee
    /// @param orderId orderId
    /// @param customerScore customerScore
    /// @param channel channel
    event PaymentProcessed(
        address indexed customer,
        address indexed merchant,
        address token,
        uint256 amount,
        uint256 fee,
        string orderId,
        uint16 customerScore,
        PaymentChannel channel
    );
    /// @notice Enhanced payment event with channel tracking
    /// @param feeBasisPoints feeBasisPoints
    event FeeUpdated(uint256 feeBasisPoints);
    /// @notice ProtocolFeeProposed
    /// @param newFeeBps newFeeBps
    /// @param effectiveAt effectiveAt
    event ProtocolFeeProposed(uint256 newFeeBps, uint64 effectiveAt); // H3
    /// @notice ProtocolFeeCancelled
    event ProtocolFeeCancelled(); // H3
    /// @notice MinScoreUpdated
    /// @param minScore minScore
    event MinScoreUpdated(uint16 minScore);
    /// @notice FeeSinkSet
    /// @param sink sink
    event FeeSinkSet(address sink);
    /// @notice MinSwapOutputUpdated
    /// @param previousBps previousBps
    /// @param newBps newBps
    event MinSwapOutputUpdated(uint256 previousBps, uint256 newBps);
    /// @notice AutoConvertSet
    /// @param merchant merchant
    /// @param enabled enabled
    event AutoConvertSet(address indexed merchant, bool enabled);
    /// @notice PayoutAddressSet
    /// @param merchant merchant
    /// @param payoutAddress payoutAddress
    event PayoutAddressSet(address indexed merchant, address payoutAddress);
    /// @notice AutoConvertFallback
    /// @param merchant merchant
    /// @param tokenIn tokenIn
    /// @param amountIn amountIn
    /// @param reason reason
    event AutoConvertFallback(address indexed merchant, address indexed tokenIn, uint256 amountIn, string reason);
    /// @notice DAORotationProposed
    /// @param nextDAO nextDAO
    /// @param effectiveAt effectiveAt
    event DAORotationProposed(address indexed nextDAO, uint64 effectiveAt);
    /// @notice DAORotationCancelled
    event DAORotationCancelled();
    /// @notice DAOSet
    /// @param oldDAO oldDAO
    /// @param newDAO newDAO
    event DAOSet(address indexed oldDAO, address indexed newDAO);

    /// External modules
    /// @notice vaultHub
    IVaultHub public vaultHub;
    /// @notice seer
    ISeer public seer;
    /// @notice ledger
    IProofLedger public ledger;

    /// DAO control
    /// @notice dao
    address public dao;
    /// @notice pendingDAO
    address public pendingDAO;
    /// @notice pendingDAOAt
    uint64 public pendingDAOAt;
    /// @notice DAO_CHANGE_DELAY
    uint64 public constant DAO_CHANGE_DELAY = 48 hours;

    // H3 FIX: Protocol fee changes require a 24h timelock to honor the
    //         "zero merchant fees" guarantee against instant DAO action.
    /// @notice pendingProtocolFeeBps
    uint256 public pendingProtocolFeeBps;
    /// @notice pendingProtocolFeeAt
    uint64 public pendingProtocolFeeAt;
    /// @notice PROTOCOL_FEE_CHANGE_DELAY
    uint64 public constant PROTOCOL_FEE_CHANGE_DELAY = 24 hours;
    /// @notice fraudRegistry
    address public fraudRegistry;
    // N-L15 FIX: optional session-key spend-limit gate (zero address = disabled).
    // Kept private to avoid generating an extra public getter and reduce bytecode size.
    /// @notice sessionKeyManager
    address private sessionKeyManager;

    /// Protocol fee (in basis points, e.g., 50 = 0.5%)
    /// @notice protocolFeeBps
    uint256 public protocolFeeBps = 0; // 0% - No merchant payment fee (burn fees apply on VFIDE transfers)
    /// @notice feeSink
    address public feeSink; // Where protocol fees go (could be treasury or burn)

    /// Merchant minimum ProofScore requirement (0-10000 scale)
    /// @notice minMerchantScore
    uint16 public minMerchantScore = ScoringConstants.MIN_MERCHANT; // From ScoringConstants: 5600 (56%)

    /// Merchant registry
    struct MerchantInfo {
        bool registered;
        bool suspended;
        string businessName;
        string category; // e.g., "retail", "services", "digital_goods"
        uint64 registeredAt;
        uint256 totalVolume; // Lifetime payment volume
        uint256 txCount;     // Total transactions
        address payoutAddress; // Optional: Redirect funds to Treasury/Splitter
    }
    /// @notice merchants
    mapping(address => MerchantInfo) public merchants;
    /// @notice merchantList
    address[] public merchantList;
    /// @notice merchantInList
    mapping(address => bool) private merchantInList;
    /// @notice merchantIndexPlusOne
    mapping(address => uint256) private merchantIndexPlusOne;

    // F-SC-021 FIX: 24-hour timelock state for payout-address changes. Without
    // a delay, a single compromised merchant key would instantly redirect all
    // subsequent revenue to the attacker. The propose/apply/cancel pattern
    // gives merchants a window to detect the change before it takes effect.
    /// @notice PAYOUT_ADDRESS_DELAY
    uint64 public constant PAYOUT_ADDRESS_DELAY = 24 hours;
    /// @notice pendingPayoutAddress
    mapping(address => address) public pendingPayoutAddress;
    /// @notice pendingPayoutAddressEffectiveAt
    mapping(address => uint64) public pendingPayoutAddressEffectiveAt;
    /// @notice PayoutAddressProposed
    /// @param merchant merchant
    /// @param proposedAddress proposedAddress
    /// @param effectiveAt effectiveAt
    event PayoutAddressProposed(address indexed merchant, address proposedAddress, uint64 effectiveAt);
    /// @notice PayoutAddressProposalCancelled
    /// @param merchant merchant
    event PayoutAddressProposalCancelled(address indexed merchant);

    /// Supported payment tokens (VFIDE + stablecoins)
    /// @notice acceptedTokens
    mapping(address => bool) public acceptedTokens;
    /// @notice acceptedTokenDecimals
    mapping(address => uint8) public acceptedTokenDecimals;
    /// @notice merchantPullApproved
    mapping(address => mapping(address => bool)) public merchantPullApproved; // customer => merchant => approved
    /// @notice merchantPullRemaining
    mapping(address => mapping(address => uint256)) public merchantPullRemaining; // customer => merchant => remaining pull amount
    /// @notice merchantPullExpiry
    mapping(address => mapping(address => uint64)) public merchantPullExpiry; // customer => merchant => expiry timestamp (0 = no expiry)
    /// @notice merchantPullToken
    mapping(address => mapping(address => address)) public merchantPullToken; // customer => merchant => token (0 = any accepted token)
    /// @notice MerchantPullApprovalSet
    /// @param customer customer
    /// @param merchant merchant
    /// @param approved approved
    event MerchantPullApprovalSet(address indexed customer, address indexed merchant, bool approved);
    /// @notice MerchantPullPermitSet
    /// @param customer customer
    /// @param merchant merchant
    /// @param maxAmount maxAmount
    /// @param expiresAt expiresAt
    event MerchantPullPermitSet(address indexed customer, address indexed merchant, uint256 maxAmount, uint64 expiresAt);
    /// @notice MerchantPullPermitTokenSet
    /// @param customer customer
    /// @param merchant merchant
    /// @param token token
    /// @param maxAmount maxAmount
    /// @param expiresAt expiresAt
    event MerchantPullPermitTokenSet(address indexed customer, address indexed merchant, address indexed token, uint256 maxAmount, uint64 expiresAt);

    /// @notice swapRouter
    ISwapRouter public swapRouter;
    /// @notice stablecoin
    address public stablecoin; // Target stablecoin (e.g. USDC)
    /// @notice autoConvert
    mapping(address => bool) public autoConvert; // Merchant -> Enabled
    
    /// Slippage protection for swaps (basis points, e.g., 9800 = 98% = 2% slippage)
    /// @notice minSwapOutputBps
    uint256 public minSwapOutputBps = 9500; // Default: 5% max slippage
    
    /// Multi-hop swap paths (token -> path array)
    /// @notice tokenSwapPaths
    mapping(address => address[]) public tokenSwapPaths;

    /// @notice onlyDAO
    modifier onlyDAO() {
        _checkDAO();
        _;
    }
    /// @notice _checkDAO
    function _checkDAO() internal view {
        if (msg.sender != dao) revert MERCH_NotDAO();
    }

    /// @notice onlyMerchant
    modifier onlyMerchant() {
        _checkMerchant();
        _;
    }
    /// @notice _checkMerchant
    function _checkMerchant() internal view {
        if (!merchants[msg.sender].registered) revert MERCH_NotMerchant();
    }

    /// @notice constructor
    /// @param _dao _dao
    /// @param _vaultHub _vaultHub
    /// @param _seer _seer
    /// @param _ledger _ledger
    /// @param _feeSink _feeSink
    constructor(
        address _dao,
        address _vaultHub,
        address _seer,
        address _ledger,
        address _feeSink
    ) {
        if (_dao == address(0) || _vaultHub == address(0) || _feeSink == address(0)) revert MERCH_InvalidConfig();
        dao = _dao;
        vaultHub = IVaultHub(_vaultHub);
        seer = ISeer(_seer);
        ledger = IProofLedger(_ledger);
        feeSink = _feeSink;
        
        emit ModulesSet(_vaultHub, _seer, _ledger);
        emit FeeSinkSet(_feeSink);
    }

    // ─────────────────────────── Admin: DAO controls

    /// @notice setModules
    /// @param _vaultHub _vaultHub
    /// @param _seer _seer
    /// @param _ledger _ledger
    function setModules(
        address _vaultHub,
        address _seer,
        address _ledger
    ) external onlyDAO {
        if (_vaultHub == address(0) || _seer == address(0)) revert MERCH_Zero();
        vaultHub = IVaultHub(_vaultHub);
        seer = ISeer(_seer);
        ledger = IProofLedger(_ledger);
        emit ModulesSet(_vaultHub, _seer, _ledger);
        _log("m_mod_set");
    }

    /// @notice Propose DAO control transfer to a new address.
    /// @dev Enforced with a timelock to reduce instant key-compromise blast radius.
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert MERCH_Zero();
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit DAORotationProposed(_dao, pendingDAOAt);
        _log("m_dao_pend");
    }

    /// @notice Apply a pending DAO transfer after timelock.
    function applyDAO() external onlyDAO {
        if (pendingDAOAt == 0) revert MERCH_NotConfigured();
        if (block.timestamp < pendingDAOAt) revert MERCH_NotConfigured();
        address oldDAO = dao;
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOSet(oldDAO, dao);
        _log("m_dao_set");
    }

    /// @notice Cancel a pending DAO transfer.
    function cancelDAO() external onlyDAO {
        if (pendingDAOAt == 0) revert MERCH_NotConfigured();
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAORotationCancelled();
        _log("m_dao_cancel");
    }

    // slither-disable-next-line missing-zero-check  // intentional: address(0) disables the gate
    /// @notice N-L15 FIX: Set the optional SessionKeyManager for per-session spend limits.
    ///         Pass address(0) to disable the gate (backward-compatible).
    /// @param _skm _skm
    function setSessionKeyManager(address _skm) external onlyDAO {
        sessionKeyManager = _skm;
    }

    /// @notice Propose a protocol fee change. Takes effect after 24h timelock.
    /// @dev H3 FIX: 24-hour delay gives merchants / community time to react.
    /// @param _feeBps _feeBps
    function setProtocolFee(uint256 _feeBps) external onlyDAO {
        if (_feeBps > 500) revert MERCH_InvalidConfig(); // Max 5%
        pendingProtocolFeeBps = _feeBps;
        pendingProtocolFeeAt = uint64(block.timestamp) + PROTOCOL_FEE_CHANGE_DELAY;
        emit ProtocolFeeProposed(_feeBps, pendingProtocolFeeAt);
        _log("fee_pend");
    }

    /// @notice Apply a pending protocol fee change after the timelock.
    function applyProtocolFee() external onlyDAO {
        if (pendingProtocolFeeAt == 0) revert MERCH_NotConfigured();
        if (block.timestamp < pendingProtocolFeeAt) revert MERCH_NotConfigured();
        protocolFeeBps = pendingProtocolFeeBps;
        delete pendingProtocolFeeBps;
        delete pendingProtocolFeeAt;
        emit FeeUpdated(protocolFeeBps);
        _log("fee_upd");
    }

    /// @notice Cancel a pending protocol fee change.
    function cancelProtocolFee() external onlyDAO {
        if (pendingProtocolFeeAt == 0) revert MERCH_NotConfigured();
        delete pendingProtocolFeeBps;
        delete pendingProtocolFeeAt;
        emit ProtocolFeeCancelled();
        _log("fee_cancel");
    }

    /// @notice setFeeSink
    /// @param _sink _sink
    function setFeeSink(address _sink) external onlyDAO {
        if (_sink == address(0)) revert MERCH_Zero();
        feeSink = _sink;
        emit FeeSinkSet(_sink);
        _log("fee_sink");
    }

    /// @notice setMinMerchantScore
    /// @param _minScore _minScore
    function setMinMerchantScore(uint16 _minScore) external onlyDAO {
        if (_minScore > 10000) revert MERCH_InvalidConfig(); // 0-10000 scale
        minMerchantScore = _minScore;
        emit MinScoreUpdated(_minScore);
        _log("min_score");
    }

    /// @notice setFraudRegistry
    /// @param _fr _fr
    function setFraudRegistry(address _fr) external onlyDAO {
        if (_fr == address(0)) revert MERCH_Zero();
        fraudRegistry = _fr;
    }
    /// @notice setAcceptedToken
    /// @param token token
    /// @param accepted accepted
    function setAcceptedToken(address token, bool accepted) external onlyDAO {
        if (token == address(0)) revert MERCH_Zero();
        acceptedTokens[token] = accepted;
        if (accepted) {
            (uint8 decimals, bool ok) = _readTokenDecimals(token);
            if (!ok) revert MERCH_InvalidConfig();
            acceptedTokenDecimals[token] = decimals;
        } else {
            delete acceptedTokenDecimals[token];
        }
        _log(accepted ? "tok_on" : "tok_off");
    }

    /// @notice setSwapConfig
    /// @param _router _router
    /// @param _stable _stable
    function setSwapConfig(address _router, address _stable) external onlyDAO {
        if (_router != address(0)) {
            if (_stable == address(0)) revert MERCH_InvalidConfig();
            if (!(acceptedTokens[_stable] || _stable == stablecoin)) revert MERCH_TokenNotAccepted();
        }
        swapRouter = ISwapRouter(_router);
        stablecoin = _stable;
        _log("swap_cfg");
    }
    
    /// @notice setMinSwapOutput
    /// @param _minBps _minBps
    function setMinSwapOutput(uint256 _minBps) external onlyDAO {
        if (_minBps < MIN_SWAP_OUTPUT_BPS || _minBps > MAX_SWAP_OUTPUT_BPS) revert MERCH_InvalidConfig(); // 0-10% slippage
        uint256 previousBps = minSwapOutputBps;
        minSwapOutputBps = _minBps;
        emit MinSwapOutputUpdated(previousBps, _minBps);
        _log("swap_min");
    }
    
    /// @notice setSwapPath
    /// @param token token
    /// @param path path
    function setSwapPath(address token, address[] calldata path) external onlyDAO {
        if (token == address(0)) revert MERCH_Zero();
        if (path.length < 2 || path.length > MAX_SWAP_PATH_LENGTH) revert MERCH_InvalidConfig();
        if (path[0] != token) revert MERCH_InvalidConfig();
        if (path[path.length - 1] != stablecoin) revert MERCH_InvalidConfig();
        for (uint256 i = 0; i < path.length; ++i) {
            if (path[i] == address(0)) revert MERCH_Zero();
        }
        tokenSwapPaths[token] = path;
        _log("swap_path");
    }

    // ─────────────────────────── Internal Trust Validation
    
    /**
     * Check if merchant meets minimum ProofScore requirement
     * Extracted to avoid code duplication
     * @notice _checkMerchantScore
     * @param merchant merchant
     */
    function _checkMerchantScore(address merchant) internal view {
        if (address(seer) == address(0)) return;
        
        uint16 score = seer.getCachedScore(merchant);
        uint16 minScore = seer.minForMerchant();
        minScore = minScore > 0 ? minScore : minMerchantScore;
        
        if (score < minScore) revert MERCH_LowTrust();
    }

    /// @notice _checkFraudStatus
    /// @param subject subject
    function _checkFraudStatus(address subject) internal view {
        if (fraudRegistry == address(0)) return;
        try IFraudRegistryMerchant(fraudRegistry).isServiceBanned(subject) returns (bool banned) {
            if (banned) revert MERCH_Forbidden();
        } catch {
            revert MERCH_Forbidden();
        }
    }

    // ─────────────────────────── Merchant Management

    /**
     * Register as a merchant (requires minimum ProofScore)
     * @notice registerMerchant
     * @param businessName businessName
     * @param category category
     */
    function registerMerchant(
        string calldata businessName,
        string calldata category
    ) external {
        _checkFraudStatus(msg.sender);
        if (merchants[msg.sender].registered) revert MERCH_AlreadyRegistered();
        
        // Check ProofScore requirement
        _checkMerchantScore(msg.sender);
        
        merchants[msg.sender] = MerchantInfo({
            registered: true,
            suspended: false,
            businessName: businessName,
            category: category,
            registeredAt: uint64(block.timestamp),
            totalVolume: 0,
            txCount: 0,
            payoutAddress: address(0)
        });
        
        if (merchantList.length >= 10000) revert MERCH_CapExceeded(); // I-11
        if (!merchantInList[msg.sender]) {
            merchantList.push(msg.sender);
            merchantInList[msg.sender] = true;
            merchantIndexPlusOne[msg.sender] = merchantList.length;
        }
        
        emit MerchantRegistered(msg.sender, businessName, category);
        _logEv(msg.sender, "m_reg", 0, category);
    }
    
    /**
     * @notice Update merchant business information
     * @param businessName New business name
     * @param category New category
     */
    function updateMerchantInfo(string calldata businessName, string calldata category) external onlyMerchant {
        MerchantInfo storage m = merchants[msg.sender];
        m.businessName = businessName;
        m.category = category;
        
        emit MerchantUpdated(msg.sender, businessName, category);
        _logEv(msg.sender, "m_upd", 0, category);
    }
    
    /**
     * @notice Merchant voluntarily deregisters
     * @dev Cannot deregister if there are pending refunds or disputes
     */
    function deregisterMerchant() external onlyMerchant {
        MerchantInfo storage m = merchants[msg.sender];
        if (m.suspended) revert MERCH_Suspended();
        if (_hasPendingRefunds(msg.sender)) revert MERCH_InvalidConfig();

        if (merchantInList[msg.sender]) {
            uint256 idx = merchantIndexPlusOne[msg.sender] - 1;
            uint256 lastIdx = merchantList.length - 1;
            if (idx != lastIdx) {
                address moved = merchantList[lastIdx];
                merchantList[idx] = moved;
                merchantIndexPlusOne[moved] = idx + 1;
            }
            merchantList.pop();
            merchantInList[msg.sender] = false;
            merchantIndexPlusOne[msg.sender] = 0;
        }
        
        m.registered = false;
        
        emit MerchantDeregistered(msg.sender);
        _logEv(msg.sender, "m_dereg", 0, "");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              REFUND SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    
    // Backlog fix (R77): add refundId as first indexed parameter so frontend can
    // reconstruct refund state from events without storing it separately.
    /// @notice RefundInitiated
    /// @param refundId refundId
    /// @param customer customer
    /// @param merchant merchant
    /// @param orderId orderId
    /// @param amount amount
    event RefundInitiated(bytes32 indexed refundId, address indexed customer, address indexed merchant, string orderId, uint256 amount);
    /// @notice RefundCompleted
    /// @param customer customer
    /// @param merchant merchant
    /// @param orderId orderId
    /// @param amount amount
    event RefundCompleted(address indexed customer, address indexed merchant, string orderId, uint256 amount);
    /// @notice MerchantUpdated
    /// @param merchant merchant
    /// @param businessName businessName
    /// @param category category
    event MerchantUpdated(address indexed merchant, string businessName, string category);
    /// @notice MerchantDeregistered
    /// @param merchant merchant
    event MerchantDeregistered(address indexed merchant);
    
    struct RefundRequest {
        address customer;
        address merchant;
        address token;
        uint256 amount;
        string orderId;
        uint64 requestTime;
        bool approved;
        bool completed;
    }
    
    /// @notice refundRequests
    mapping(bytes32 => RefundRequest) public refundRequests;
    
    /**
     * @notice Initiate a refund (merchant approves)
     * @param customer Customer to refund
     * @param token Token to refund
     * @param amount Amount to refund
     * @param orderId Original order ID
     * @return refundId refundId
     */
    function initiateRefund(
        address customer,
        address token,
        uint256 amount,
        string calldata orderId
    ) external onlyMerchant returns (bytes32 refundId) {
        if (customer == address(0) || amount == 0) revert MERCH_InvalidPayment();

        // N-H11 FIX: Reserve headroom in the customer's refund history so one merchant
        // cannot saturate the full 500-slot history and block all future refunds.
        if (customerRefunds[customer].length >= 450) revert MERCH_CapExceeded();
        
        // audit-ok(weak-randomness): Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller/nonce/length is sufficient
        refundId = keccak256(abi.encode(msg.sender, customer, orderId, block.timestamp, customerRefunds[customer].length));
        
        refundRequests[refundId] = RefundRequest({
            customer: customer,
            merchant: msg.sender,
            token: token,
            amount: amount,
            orderId: orderId,
            requestTime: uint64(block.timestamp),
            approved: true, // Merchant-initiated = auto-approved
            completed: false
        });
        
        // Track refunds for both parties (I-11: capped)
        customerRefunds[customer].push(refundId);
        if (merchantRefunds[msg.sender].length >= 500) revert MERCH_CapExceeded();
        merchantRefunds[msg.sender].push(refundId);
        
        emit RefundInitiated(refundId, customer, msg.sender, orderId, amount);
        _logEv(customer, "rf_init", amount, orderId);
    }
    
    /**
     * @notice Complete a refund (transfer tokens back to customer)
     * @param refundId The refund ID from initiateRefund
     */
    function completeRefund(bytes32 refundId) external nonReentrant {
        RefundRequest storage r = refundRequests[refundId];
        if (r.amount == 0) revert MERCH_NotFound();
        if (!r.approved) revert MERCH_NotApproved();
        if (r.completed) revert MERCH_AlreadyCompleted();
        if (msg.sender != r.merchant) revert MERCH_Forbidden();
        if (block.timestamp > uint256(r.requestTime) + REFUND_COMPLETION_WINDOW) revert MERCH_ApprovalExpired();
        
        r.completed = true;
        
        // Get vaults
        address merchantVault = vaultHub.vaultOf(r.merchant);
        address customerVault = vaultHub.vaultOf(r.customer);
        if (merchantVault == address(0) || customerVault == address(0)) revert MERCH_NoVault();
        
        // Pull refund from the merchant caller to avoid requiring approvals from vault contracts.
        IERC20(r.token).safeTransferFrom(msg.sender, customerVault, r.amount);
        
        emit RefundCompleted(r.customer, r.merchant, r.orderId, r.amount);
        _logEv(r.customer, "rf_done", r.amount, r.orderId);
    }

    /**
     * @notice Deprecated refund path retained for ABI compatibility.
     * @dev Use completeRefund() where the merchant caller funds the refund transfer.
     * @param _bytes32 _bytes32
     */
    function completeRefundFromVault(bytes32) external pure {
        revert MERCH_Deprecated();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           MERCHANT STATS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get merchant statistics
     * @param merchant Merchant address
     * @return registered Whether registered
     * @return suspended Whether suspended
     * @return totalVolume Lifetime volume
     * @return txCount Transaction count
     * @return avgTxSize Average transaction size
     * @return trustScore Current trust score
     */
    function getMerchantStats(address merchant) external view returns (
        bool registered,
        bool suspended,
        uint256 totalVolume,
        uint256 txCount,
        uint256 avgTxSize,
        uint16 trustScore
    ) {
        MerchantInfo storage m = merchants[merchant];
        registered = m.registered;
        suspended = m.suspended;
        totalVolume = m.totalVolume;
        txCount = m.txCount;
        avgTxSize = m.txCount > 0 ? m.totalVolume / m.txCount : 0;
        trustScore = address(seer) != address(0) ? seer.getCachedScore(merchant) : 5000;
    }

    /**
     * DAO can suspend merchants for violations
     * @notice suspendMerchant
     * @param merchant merchant
     * @param reason reason
     */
    function suspendMerchant(address merchant, string calldata reason) external onlyDAO {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        merchants[merchant].suspended = true;
        emit MerchantSuspended(merchant, reason);
        _logEv(merchant, "m_susp", 0, reason);
    }

    /**
     * DAO can reinstate suspended merchants
     * @notice reinstateMerchant
     * @param merchant merchant
     */
    function reinstateMerchant(address merchant) external onlyDAO {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        merchants[merchant].suspended = false;
        emit MerchantReinstated(merchant);
        _logEv(merchant, "m_rein", 0, "");
    }

    // ─────────────────────────── Payment Processing

    /**
     * @notice Legacy merchant-initiated pull path kept for compatibility.
     * @dev Enforces scoped customer permit consumption before delegating to standard settlement.
     *
     *      H-31 NON-CUSTODIAL DESIGN INTENT — standing approval path:
     *      The customer voluntarily grants this portal a bounded ERC-20 allowance from
     *      their CardBoundVault and a per-merchant pull permit (token-scoped, amount-capped,
     *      optionally time-limited via `merchantPullExpiry`). The protocol never moves
     *      customer funds without these explicit approvals. The trade-off the customer
     *      accepts is convenience (tap-to-pay) for one structural risk: if the portal is
     *      ever compromised, every customer's *unused* pull budget is drainable. Customers
     *      who do not want this trade-off should use `executePayMerchant(intent, signature)`
     *      via their wallet's signed-intent flow, which requires a fresh EIP-712 signature
     *      per payment and grants no standing allowance. Both paths coexist by design.
     *
     *      H-32 NON-CUSTODIAL DESIGN INTENT — merchant vault auto-creation:
     *      Settlement may call `vaultHub.ensureVault(merchant)` if the merchant has no
     *      vault yet. The vault is owned by the merchant from block zero — the protocol
     *      does not control it. The merchant has `GUARDIAN_SETUP_GRACE` (30 days) to
     *      complete guardian setup; if they don't and later lose their key, the
     *      guardian-mediated recovery path declines. See `VaultHub.ensureVault` for the
     *      full non-custodial reasoning. Frontends MUST surface the guardian-setup
     *      countdown in the merchant dashboard so the merchant can act before expiry.
     * @param customer customer
     * @param token token
     * @param amount amount
     * @param orderId orderId
     * @return netAmount netAmount
     */
    function processPayment(
        address customer,
        address token,
        uint256 amount,
        string calldata orderId
    ) external nonReentrant onlyMerchant returns (uint256 netAmount) {
        if (customer == address(0) || token == address(0) || amount == 0) {
            revert MERCH_InvalidPayment();
        }

        MerchantInfo storage merchant = merchants[msg.sender];
        if (merchant.suspended) revert MERCH_Suspended();
        _checkMerchantScore(msg.sender);

        if (!merchantPullApproved[customer][msg.sender]) revert MERCH_NotApproved();
        uint64 permitExpiry = merchantPullExpiry[customer][msg.sender];
        if (!(permitExpiry == 0 || block.timestamp <= permitExpiry)) revert MERCH_ApprovalExpired();
        address scopedToken = merchantPullToken[customer][msg.sender];
        if (scopedToken != address(0) && scopedToken != token) revert MERCH_NotApproved();
        uint256 remainingPull = merchantPullRemaining[customer][msg.sender];
        if (remainingPull < amount) revert MERCH_LimitExceeded();
        unchecked {
            merchantPullRemaining[customer][msg.sender] = remainingPull - amount;
        }

        return _processPaymentWithChannel(customer, msg.sender, token, amount, orderId, PaymentChannel.IN_PERSON);
    }

    /// @notice Revoke merchant permission to initiate pulls from your vault via processPayment.
    /// @dev M-12 FIX: This function can ONLY revoke (approved must be false) — any call with approved=true reverts.
    ///      Use setMerchantPullPermit() to grant a scoped permit instead.
    /// @param merchant merchant
    /// @param approved approved
    function setMerchantPullApproval(address merchant, bool approved) external {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        if (approved) {
            revert MERCH_InvalidConfig();
        }
        merchantPullApproved[msg.sender][merchant] = false;
        merchantPullRemaining[msg.sender][merchant] = 0;
        merchantPullExpiry[msg.sender][merchant] = 0;
        merchantPullToken[msg.sender][merchant] = address(0);
        emit MerchantPullApprovalSet(msg.sender, merchant, false);
    }

    /// @notice Set a scoped merchant pull permit with amount and optional expiry.
    /// @param merchant Merchant being authorized.
    /// @param maxAmount Maximum cumulative amount merchant can pull via processPayment.
    /// @param expiresAt Unix timestamp when permit expires (0 = no expiry).
    function setMerchantPullPermit(address merchant, uint256 maxAmount, uint64 expiresAt) external {
        _setMerchantPullPermit(merchant, address(0), maxAmount, expiresAt, false);
    }

    /// @notice Set a token-scoped permit and enforce that the customer's vault already approved this portal.
    /// @dev Helps wallets/UIs steer users to a single explicit spender+token target and avoid blind double approvals.
    /// @param merchant merchant
    /// @param token token
    /// @param maxAmount maxAmount
    /// @param expiresAt expiresAt
    function setMerchantPullPermitForToken(address merchant, address token, uint256 maxAmount, uint64 expiresAt) external {
        _setMerchantPullPermit(merchant, token, maxAmount, expiresAt, true);
    }

    /// @notice _setMerchantPullPermit
    /// @param merchant merchant
    /// @param token token
    /// @param maxAmount maxAmount
    /// @param expiresAt expiresAt
    /// @param requireVaultAllowance requireVaultAllowance
    function _setMerchantPullPermit(
        address merchant,
        address token,
        uint256 maxAmount,
        uint64 expiresAt,
        bool requireVaultAllowance
    ) internal {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        if (maxAmount == 0) revert MERCH_InvalidConfig();

        if (token != address(0) && !acceptedTokens[token]) revert MERCH_TokenNotAccepted();

        address customerVault = vaultHub.vaultOf(msg.sender);
        if (customerVault == address(0)) revert MERCH_NoVault();

        if (requireVaultAllowance) {
            uint256 allowance = IERC20(token).allowance(customerVault, address(this));
            if (allowance < maxAmount) revert MERCH_NotApproved();
        }

        uint256 vaultDailyLimit = 0;
        try ICardBoundVaultPermitView(customerVault).dailyTransferLimit() returns (uint256 limit) {
            vaultDailyLimit = limit;
        } catch {
            revert MERCH_NotConfigured();
        }

        if (vaultDailyLimit == 0 || maxAmount > vaultDailyLimit) {
            revert MERCH_CapExceeded();
        }

        // F-60 FIX: Require a non-zero expiry. A zero (never-expires) permit is a security
        // liability; compromised merchant keys could drain forgotten permits indefinitely.
        if (expiresAt == 0) revert MERCH_InvalidConfig();
        if (expiresAt <= block.timestamp || expiresAt > block.timestamp + MAX_PULL_PERMIT_DURATION) {
            revert MERCH_InvalidConfig();
        }

        merchantPullApproved[msg.sender][merchant] = true;
        merchantPullRemaining[msg.sender][merchant] = maxAmount;
        merchantPullExpiry[msg.sender][merchant] = expiresAt;
        merchantPullToken[msg.sender][merchant] = token;
        emit MerchantPullApprovalSet(msg.sender, merchant, true);
        emit MerchantPullPermitSet(msg.sender, merchant, maxAmount, expiresAt);
        emit MerchantPullPermitTokenSet(msg.sender, merchant, token, maxAmount, expiresAt);
    }

    /**
     * Simplified payment: customer pays merchant directly (pulls from msg.sender's vault)
     * @notice pay
     * @param merchant merchant
     * @param token token
     * @param amount amount
     * @param orderId orderId
     * @return netAmount netAmount
     */
    function pay(
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId
    ) external nonReentrant returns (uint256 netAmount) {
        return _processPaymentWithChannel(msg.sender, merchant, token, amount, orderId, PaymentChannel.IN_PERSON);
    }


    // slither-disable-start reentrancy-no-eth
    /**
     * Signed-intent payment path: customer signs an intent and merchant/relayer submits it.
     * Avoids requiring standing ERC20 approvals from the customer vault to this portal.
     * @notice payWithIntent
     * @param intent intent
     * @param signature signature
     * @param orderId orderId
     * @return netAmount netAmount
     */
    function payWithIntent(
        ICardBoundVaultPay.PayIntent calldata intent,
        bytes calldata signature,
        string calldata orderId
    ) external nonReentrant returns (uint256 netAmount) {
        // function has nonReentrant guard; cross-contract calls are to trusted vault/escrow modules
        if (intent.merchantPortal != address(this)) revert MERCH_IntentInvalid();
        if (intent.merchant == address(0) || intent.token == address(0)) revert MERCH_IntentInvalid();
        if (intent.amount == 0) revert MERCH_IntentInvalid();
        if (!merchants[intent.merchant].registered) revert MERCH_NotRegistered();
        if (merchants[intent.merchant].suspended) revert MERCH_Suspended();
        if (intent.deadline < block.timestamp) revert MERCH_IntentInvalid();

        _validateSettlementToken(intent.token);
        _checkMerchantScore(intent.merchant);

        address customer = vaultHub.ownerOfVault(intent.vault);
        if (customer == address(0)) revert MERCH_NoVault();
        if (vaultHub.vaultOf(customer) != intent.vault) revert MERCH_IntentInvalid();

        _checkFraudStatus(customer);
        _checkFraudStatus(intent.merchant);

        address skmAddress = sessionKeyManager;
        if (skmAddress != address(0)) {
            ISessionKeyManager_MP skm = ISessionKeyManager_MP(skmAddress);
            if (!skm.canSpend(customer, intent.merchant, intent.token, intent.amount)) revert MERCH_Forbidden();
        }

        address resolvedRecipient = merchants[intent.merchant].payoutAddress;
        if (resolvedRecipient == address(0)) {
            resolvedRecipient = vaultHub.ensureVault(intent.merchant);
        }
        if (intent.recipient != resolvedRecipient) revert MERCH_IntentRecipientMismatch();

        uint16 customerScore = address(seer) != address(0) ? seer.getCachedScore(customer) : 500;

        _recordMerchantStats(intent.merchant, intent.amount);

        ICardBoundVaultPay(intent.vault).executePayMerchant(intent, signature);

        // Intent path settles a direct vault transfer; protocol fee remains governed by token-level fee mechanics.
        netAmount = intent.amount;

        emit PaymentProcessed(
            customer,
            intent.merchant,
            intent.token,
            intent.amount,
            0,
            orderId,
            customerScore,
            PaymentChannel.IN_PERSON
        );

        _rewardPaymentParticipants(customer, intent.merchant);
        _logEv(customer, "m_pay", intent.amount, orderId);
    }
    // slither-disable-end reentrancy-no-eth

    /**
     * Enable or disable automatic conversion for stable-pay merchants
     * @notice setAutoConvert
     * @param enabled enabled
     */
    function setAutoConvert(bool enabled) external onlyMerchant {
        if (enabled) {
            if (address(swapRouter) == address(0) || stablecoin == address(0)) revert MERCH_NotConfigured();
        }
        autoConvert[msg.sender] = enabled;
        emit AutoConvertSet(msg.sender, enabled);
    }

    /**
     * Set a custom payout address (e.g. RevenueSplitter or Treasury)
     * If set to address(0), funds go to the merchant's Vault.
     *
     * F-SC-021 FIX: Converted from instant single-step to two-step
     * propose/apply with a 24-hour timelock. The previous behavior allowed
     * an attacker who compromised a merchant key to silently redirect ALL
     * subsequent merchant revenue to an attacker-controlled vault in a
     * single transaction. With the timelock the merchant has a 24-hour
     * window to detect the change (via events / monitoring / on-chain
     * notification) and call cancelPayoutAddressChange to nullify it.
     *
     * To CLEAR a payout (return to merchant vault), propose payout=address(0)
     * and apply after the delay.
     * @notice proposePayoutAddress
     * @param payout payout
     */
    function proposePayoutAddress(address payout) external onlyMerchant {
        if (!(payout == address(0) || vaultHub.isVault(payout))) revert MERCH_InvalidConfig();
        // Overwrite any prior pending proposal: a merchant who is mid-flight
        // re-routing genuinely should be able to update without waiting for
        // a stale proposal to expire. The 24h delay still applies from now.
        pendingPayoutAddress[msg.sender] = payout;
        pendingPayoutAddressEffectiveAt[msg.sender] = uint64(block.timestamp) + PAYOUT_ADDRESS_DELAY;
        emit PayoutAddressProposed(msg.sender, payout, pendingPayoutAddressEffectiveAt[msg.sender]);
    }

    /// @notice applyPayoutAddress
    function applyPayoutAddress() external onlyMerchant {
        uint64 effectiveAt = pendingPayoutAddressEffectiveAt[msg.sender];
        require(effectiveAt != 0, "MP: no pending payout proposal");
        require(block.timestamp >= effectiveAt, "MP: payout timelock not elapsed");
        address proposed = pendingPayoutAddress[msg.sender];
        // Re-validate that the destination is still a tracked vault (or zero
        // for "use merchant vault"). VaultHub state could in principle have
        // changed during the timelock window.
        if (!(proposed == address(0) || vaultHub.isVault(proposed))) revert MERCH_InvalidConfig();
        merchants[msg.sender].payoutAddress = proposed;
        delete pendingPayoutAddress[msg.sender];
        delete pendingPayoutAddressEffectiveAt[msg.sender];
        emit PayoutAddressSet(msg.sender, proposed);
    }

    /// @notice cancelPayoutAddressChange
    function cancelPayoutAddressChange() external onlyMerchant {
        require(pendingPayoutAddressEffectiveAt[msg.sender] != 0, "MP: no pending payout proposal");
        delete pendingPayoutAddress[msg.sender];
        delete pendingPayoutAddressEffectiveAt[msg.sender];
        emit PayoutAddressProposalCancelled(msg.sender);
    }

    /// @notice Legacy entrypoint retained for ABI compatibility. Reverts because
    ///         instant single-step payout changes are no longer permitted.
    function setPayoutAddress(address) external view onlyMerchant {
        revert("MP: use proposePayoutAddress + applyPayoutAddress");
    }

    // ─────────────────────────── Channel-Specific Payments

    /**
     * @notice In-person payment - instant settlement, no escrow
     * @dev Use for POS terminals, QR scans, face-to-face transactions
     * @param merchant The merchant receiving payment
     * @param token Payment token address
     * @param amount Payment amount
     * @param orderId Merchant's order reference
     * @param channel Payment channel type (IN_PERSON, POS_TERMINAL, QR_CODE)
     * @return netAmount netAmount
     */
    function payInPerson(
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId,
        PaymentChannel channel
    ) external nonReentrant returns (uint256 netAmount) {
        // Only allow in-person channel types
        if (
            channel != PaymentChannel.IN_PERSON &&
            channel != PaymentChannel.POS_TERMINAL &&
            channel != PaymentChannel.QR_CODE
        ) revert MERCH_InvalidChannel();
        
        netAmount = _processPaymentWithChannel(msg.sender, merchant, token, amount, orderId, channel);
    }

    /**
     * @notice Online payment - MUST use escrow for buyer protection
     * @dev Reverts - online payments require escrow via VFIDECommerce
     * @param _address _address
     * @param _address _address
     * @param _uint256 _uint256
     * @param _string _string
     */
    function payOnline(
        address /*merchant*/,
        address /*token*/,
        uint256 /*amount*/,
        string calldata /*orderId*/
    ) external pure returns (uint256) {
        // Prevent direct online payments - must use escrow
        revert MERCH_EscrowRequired();
    }

    /**
     * @notice Subscription payment - recurring with channel tracking
     * @param merchant The merchant
     * @param token Payment token
     * @param amount Payment amount
     * @param subscriptionId Subscription reference
     * @return netAmount netAmount
     */
    function paySubscription(
        address merchant,
        address token,
        uint256 amount,
        string calldata subscriptionId
    ) external nonReentrant returns (uint256 netAmount) {
        netAmount = _processPaymentWithChannel(msg.sender, merchant, token, amount, subscriptionId, PaymentChannel.SUBSCRIPTION);
    }

    /**
     * @notice Invoice payment - bill/invoice with channel tracking
     * @param merchant The merchant
     * @param token Payment token
     * @param amount Payment amount
     * @param invoiceId Invoice reference
     * @return netAmount netAmount
     */
    function payInvoice(
        address merchant,
        address token,
        uint256 amount,
        string calldata invoiceId
    ) external nonReentrant returns (uint256 netAmount) {
        netAmount = _processPaymentWithChannel(msg.sender, merchant, token, amount, invoiceId, PaymentChannel.INVOICE);
    }

    /**
     * @notice Internal payment processor with channel tracking
     * @param customer customer
     * @param merchant merchant
     * @param token token
     * @param amount amount
     * @param orderId orderId
     * @param channel channel
     * @return netAmount netAmount
     */
    function _processPaymentWithChannel(
        address customer,
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId,
        PaymentChannel channel
    ) internal returns (uint256 netAmount) {
        if (token == address(0) || amount == 0) revert MERCH_InvalidPayment();
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        if (merchants[merchant].suspended) revert MERCH_Suspended();
        _checkMerchantScore(merchant);
        _validateSettlementToken(token);
        _checkFraudStatus(customer);
        _checkFraudStatus(merchant);

        // N-L15 FIX: enforce session-key spend limits when SessionKeyManager is configured.
        address skmAddress = sessionKeyManager;
        if (skmAddress != address(0)) {
            ISessionKeyManager_MP skm = ISessionKeyManager_MP(skmAddress);
            if (!skm.canSpend(customer, merchant, token, amount)) revert MERCH_Forbidden();
        }
        
        uint16 customerScore = address(seer) != address(0) ? seer.getCachedScore(customer) : 500;

        _recordMerchantStats(merchant, amount);
        
        // Get customer vault
        address customerVault = vaultHub.vaultOf(customer);
        if (customerVault == address(0)) revert MERCH_NoVault();
        
        // SecurityHub lock check removed — non-custodial
        
        // Use scoped block to reduce stack depth
        {
            // Determine recipient
            address recipient = merchants[merchant].payoutAddress;
            if (recipient == address(0)) {
                recipient = vaultHub.ensureVault(merchant);
            }

            // Calculate fee
            uint256 fee = (amount * protocolFeeBps) / 10000;
            netAmount = amount - fee;
            
            // Fee transfer FIRST
            if (fee > 0 && feeSink != address(0)) {
                IERC20(token).safeTransferFrom(customerVault, feeSink, fee);
            }
            
            // Transfer net amount (with STABLE-PAY auto-convert if enabled)
            _transferWithAutoConvert(token, customerVault, recipient, netAmount, merchant);
        }
        
        // Emit payment event with channel tracking
        emit PaymentProcessed(
            customer,
            merchant,
            token,
            amount,
            amount - netAmount, // fee
            orderId,
            customerScore,
            channel
        );

        _rewardPaymentParticipants(customer, merchant);
        
        _logEv(customer, "m_pay", amount, orderId);
    }

    // ─────────────────────────── View Functions

    /**
     * @notice Shared transfer helper with STABLE-PAY auto-convert
     * @dev Used by both _processPaymentInternal and _processPaymentWithChannel
     * @param token token
     * @param customerVault customerVault
     * @param recipient recipient
     * @param netAmount netAmount
     * @param merchant merchant
     */
    function _transferWithAutoConvert(
        address token,
        address customerVault,
        address recipient,
        uint256 netAmount,
        address merchant
    ) internal {
        if (autoConvert[merchant] && token != stablecoin) {
            emit AutoConvertFallback(merchant, token, netAmount, "auto_conv_off");
            revert MERCH_NotConfigured();
        }

        IERC20(token).safeTransferFrom(customerVault, recipient, netAmount);
    }

    /**
     * Get customer's trust assessment (read-only for merchants)
     * @notice getCustomerTrustScore
     * @param customer customer
     * @return score score
     * @return highTrust highTrust
     * @return lowTrust lowTrust
     * @return eligible eligible
     */
    function getCustomerTrustScore(address customer) external view returns (
        uint16 score,
        bool highTrust,
        bool lowTrust,
        bool eligible
    ) {
        if (address(seer) == address(0)) {
            return (500, false, false, true); // Neutral defaults
        }
        
        score = seer.getCachedScore(customer);
        uint16 highThreshold = seer.highTrustThreshold();
        uint16 lowThreshold = seer.lowTrustThreshold();
        
        highTrust = score >= highThreshold;
        lowTrust = score <= lowThreshold;
        
        // Check if customer has vault
        address vault = vaultHub.vaultOf(customer);
        eligible = vault != address(0);
        
        // SecurityHub lock check removed — non-custodial
    }

    /// @notice Deprecated on-chain quote helper retained for ABI compatibility.
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    function calculateGrossAmount(
        address,
        address,
        address,
        uint256
    ) public pure returns (
        uint256,
        uint256,
        uint256,
        uint256
    ) {
        revert MERCH_Deprecated();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                        REFUND TRACKING VIEWS
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track refunds per customer and merchant
    /// @notice customerRefunds
    mapping(address => bytes32[]) public customerRefunds;
    /// @notice merchantRefunds
    mapping(address => bytes32[]) public merchantRefunds;
    
    /**
     * @notice Get refund status by ID
     * @param refundId refundId
     * @return customer customer
     * @return merchant merchant
     * @return token token
     * @return amount amount
     * @return orderId orderId
     * @return requestTime requestTime
     * @return approved approved
     * @return completed completed
     */
    function getRefundStatus(bytes32 refundId) external view returns (
        address customer,
        address merchant,
        address token,
        uint256 amount,
        string memory orderId,
        uint64 requestTime,
        bool approved,
        bool completed
    ) {
        RefundRequest storage r = refundRequests[refundId];
        return (r.customer, r.merchant, r.token, r.amount, r.orderId, r.requestTime, r.approved, r.completed);
    }
    
    /**
     * @notice Deprecated heavy on-chain aggregation view.
     * @dev Compute refund analytics off-chain from events and getRefundStatus().
     * @param _address _address
     */
    function getMerchantRefundRate(address) external pure returns (
        uint256,
        uint256,
        uint256
    ) {
        revert MERCH_Deprecated();
    }

    /// @notice _hasPendingRefunds
    /// @param merchant merchant
    /// @return _bool _bool
    function _hasPendingRefunds(address merchant) internal view returns (bool) {
        bytes32[] storage refundIds = merchantRefunds[merchant];
        uint256 len = refundIds.length;
        for (uint256 i = 0; i < len; ++i) {
            if (!refundRequests[refundIds[i]].completed) {
                return true;
            }
        }
        return false;
    }

    /// @notice Returns all refund IDs initiated by the given customer.
    /// R77: mappings made public to unblock frontend enumeration.
    /// @param customer customer
    /// @return _arg _arg
    function getCustomerRefunds(address customer) external view returns (bytes32[] memory) {
        return customerRefunds[customer];
    }

    /// @notice Returns all refund IDs initiated by the given merchant.
    /// @param merchant merchant
    /// @return _arg _arg
    function getMerchantRefunds(address merchant) external view returns (bytes32[] memory) {
        return merchantRefunds[merchant];
    }

    /// @notice _rewardPaymentParticipants
    /// @param customer customer
    /// @param merchant merchant
    function _rewardPaymentParticipants(address customer, address merchant) internal {
        if (address(seer) == address(0)) return;
        try seer.reward(merchant, 3, "m_pay") {} catch {}
        try seer.reward(customer, 1, "c_pay") {} catch {}
    }

    /// @notice _recordMerchantStats
    /// @param merchant merchant
    /// @param amount amount
    function _recordMerchantStats(address merchant, uint256 amount) internal {
        MerchantInfo storage info = merchants[merchant];
        info.totalVolume += amount;
        ++info.txCount;
    }

    /// @notice _validateSettlementToken
    /// @param token token
    function _validateSettlementToken(address token) internal view {
        if (!acceptedTokens[token]) revert MERCH_TokenNotAccepted();

        (uint8 liveDecimals, bool decimalsOk) = _readTokenDecimals(token);
        if (!decimalsOk || liveDecimals != acceptedTokenDecimals[token]) revert MERCH_InvalidConfig();

        // F-07 REMEDIATION: Settlement is stablecoin-only.
        // Tokens with a VFIDE-style burn router underdeliver versus invoice amounts.
        // Reject them at the contract layer to prevent accounting mismatch.
        try IVFIDETokenBurnRouterView(token).burnRouter() returns (address r) {
            if (r != address(0)) revert MERCH_VFIDESettlementDisabled();
        } catch {
            // Non-VFIDE tokens do not expose burnRouter(); allow them when accepted.
        }
    }

    /// @notice _readTokenDecimals
    /// @param token token
    /// @return decimals decimals
    /// @return ok ok
    function _readTokenDecimals(address token) internal view returns (uint8 decimals, bool ok) {
        try IERC20DecimalsMerchant(token).decimals() returns (uint8 d) {
            return (d, true);
        } catch {
            return (0, false);
        }
    }

    // ─────────────────────────── Internal Helpers

    // slither-disable-next-line reentrancy-events
    /// @notice _log
    /// @param action action
    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); }
        }
    }

    // slither-disable-next-line reentrancy-events
    /// @notice _logEv
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch { emit LedgerLogFailed(who, action); }
        }
    }
}
