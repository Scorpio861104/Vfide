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

interface IVFIDETokenBurnRouterView {
    function burnRouter() external view returns (address);
}

interface ICardBoundVaultPermitView {
    function dailyTransferLimit() external view returns (uint256);
}

error MERCH_Zero();
error MERCH_NotDAO();
error MERCH_NotMerchant();
error MERCH_NotRegistered();
error MERCH_AlreadyRegistered();
error MERCH_Suspended();
error MERCH_VaultLocked();
error MERCH_LowTrust();
error MERCH_InvalidPayment();
error MERCH_EscrowRequired();
error MERCH_InvalidConfig();
error MERCH_TokenNotAccepted();
error MERCH_NoVault();
error MERCH_NotApproved();
error MERCH_ApprovalExpired();
error MERCH_LimitExceeded();
error MERCH_NotFound();
error MERCH_AlreadyCompleted();
error MERCH_Forbidden();
error MERCH_CapExceeded();
error MERCH_NotConfigured();
error MERCH_ApproveFailed();
error MERCH_RevokeFailed();
error MERCH_VFIDESettlementDisabled();

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

contract MerchantPortal is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MIN_SWAP_OUTPUT_BPS = 9000;
    uint256 public constant MAX_SWAP_OUTPUT_BPS = 10000;
    uint256 public constant MAX_SWAP_PATH_LENGTH = 3;
    uint256 public constant REFUND_COMPLETION_WINDOW = 30 days;
    uint64 public constant MAX_PULL_PERMIT_DURATION = 90 days;
    
    /// Events
    event ModulesSet(address vaultHub, address seer, address ledger);
    event MerchantRegistered(address indexed merchant, string businessName, string category);
    event MerchantSuspended(address indexed merchant, string reason);
    event MerchantReinstated(address indexed merchant);
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
    event PaymentWithChannel(
        address indexed customer,
        address indexed merchant,
        address token,
        uint256 amount,
        uint256 fee,
        string orderId,
        uint16 customerScore,
        PaymentChannel channel
    );
    event FeeUpdated(uint256 feeBasisPoints);
    event MinScoreUpdated(uint16 minScore);
    event FeeSinkSet(address sink);
    event MinSwapOutputUpdated(uint256 previousBps, uint256 newBps);
    event AutoConvertSet(address indexed merchant, bool enabled);
    event PayoutAddressSet(address indexed merchant, address payoutAddress);
    event AutoConvertFallback(address indexed merchant, address indexed tokenIn, uint256 amountIn, string reason);
    event DAORotationProposed(address indexed nextDAO, uint64 effectiveAt);
    event DAORotationCancelled();
    event DAOSet(address indexed oldDAO, address indexed newDAO);

    /// External modules
    IVaultHub public vaultHub;
    ISeer public seer;
    IProofLedger public ledger;

    /// DAO control
    address public dao;
    address public pendingDAO;
    uint64 public pendingDAOAt;
    uint64 public constant DAO_CHANGE_DELAY = 48 hours;
    address public fraudRegistry;

    /// Protocol fee (in basis points, e.g., 50 = 0.5%)
    uint256 public protocolFeeBps = 0; // 0% - No merchant payment fee (burn fees apply on VFIDE transfers)
    address public feeSink; // Where protocol fees go (could be treasury or burn)

    /// Merchant minimum ProofScore requirement (0-10000 scale)
    uint16 public minMerchantScore = 5600; // From Seer: minForMerchant = 5600 (56%)

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
    mapping(address => MerchantInfo) public merchants;
    address[] public merchantList;
    mapping(address => bool) private merchantInList;
    mapping(address => uint256) private merchantIndexPlusOne;

    /// Supported payment tokens (VFIDE + stablecoins)
    mapping(address => bool) public acceptedTokens;
    mapping(address => mapping(address => bool)) public merchantPullApproved; // customer => merchant => approved
    mapping(address => mapping(address => uint256)) public merchantPullRemaining; // customer => merchant => remaining pull amount
    mapping(address => mapping(address => uint64)) public merchantPullExpiry; // customer => merchant => expiry timestamp (0 = no expiry)
    mapping(address => mapping(address => address)) public merchantPullToken; // customer => merchant => token (0 = any accepted token)
    event MerchantPullApprovalSet(address indexed customer, address indexed merchant, bool approved);
    event MerchantPullPermitSet(address indexed customer, address indexed merchant, uint256 maxAmount, uint64 expiresAt);
    event MerchantPullPermitTokenSet(address indexed customer, address indexed merchant, address indexed token, uint256 maxAmount, uint64 expiresAt);

    ISwapRouter public swapRouter;
    address public stablecoin; // Target stablecoin (e.g. USDC)
    mapping(address => bool) public autoConvert; // Merchant -> Enabled
    
    /// Slippage protection for swaps (basis points, e.g., 9800 = 98% = 2% slippage)
    uint256 public minSwapOutputBps = 9500; // Default: 5% max slippage
    
    /// Multi-hop swap paths (token -> path array)
    mapping(address => address[]) public tokenSwapPaths;

    modifier onlyDAO() {
        _checkDAO();
        _;
    }
    function _checkDAO() internal view {
        if (msg.sender != dao) revert MERCH_NotDAO();
    }

    modifier onlyMerchant() {
        _checkMerchant();
        _;
    }
    function _checkMerchant() internal view {
        if (!merchants[msg.sender].registered) revert MERCH_NotMerchant();
    }

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
        _log("merchant_modules_set");
    }

    /// @notice Propose DAO control transfer to a new address.
    /// @dev Enforced with a timelock to reduce instant key-compromise blast radius.
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert MERCH_Zero();
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit DAORotationProposed(_dao, pendingDAOAt);
        _log("merchant_dao_set_pending");
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
        _log("merchant_dao_set");
    }

    /// @notice Cancel a pending DAO transfer.
    function cancelDAO() external onlyDAO {
        if (pendingDAOAt == 0) revert MERCH_NotConfigured();
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAORotationCancelled();
        _log("merchant_dao_cancelled");
    }

    function setProtocolFee(uint256 _feeBps) external onlyDAO {
        if (_feeBps > 500) revert MERCH_InvalidConfig(); // Max 5%
        protocolFeeBps = _feeBps;
        emit FeeUpdated(_feeBps);
        _log("protocol_fee_updated");
    }

    function setFeeSink(address _sink) external onlyDAO {
        if (_sink == address(0)) revert MERCH_Zero();
        feeSink = _sink;
        emit FeeSinkSet(_sink);
        _log("fee_sink_set");
    }

    function setMinMerchantScore(uint16 _minScore) external onlyDAO {
        if (_minScore > 10000) revert MERCH_InvalidConfig(); // 0-10000 scale
        minMerchantScore = _minScore;
        emit MinScoreUpdated(_minScore);
        _log("min_merchant_score_set");
    }

    function setFraudRegistry(address _fr) external onlyDAO {
        if (_fr == address(0)) revert MERCH_Zero();
        fraudRegistry = _fr;
    }
    function setAcceptedToken(address token, bool accepted) external onlyDAO {
        if (token == address(0)) revert MERCH_Zero();
        acceptedTokens[token] = accepted;
        _log(accepted ? "token_accepted" : "token_removed");
    }

    function setSwapConfig(address _router, address _stable) external onlyDAO {
        if (_router != address(0)) {
            if (_stable == address(0)) revert MERCH_InvalidConfig();
            if (!(acceptedTokens[_stable] || _stable == stablecoin)) revert MERCH_TokenNotAccepted();
        }
        swapRouter = ISwapRouter(_router);
        stablecoin = _stable;
        _log("swap_config_set");
    }
    
    function setMinSwapOutput(uint256 _minBps) external onlyDAO {
        if (_minBps < MIN_SWAP_OUTPUT_BPS || _minBps > MAX_SWAP_OUTPUT_BPS) revert MERCH_InvalidConfig(); // 0-10% slippage
        uint256 previousBps = minSwapOutputBps;
        minSwapOutputBps = _minBps;
        emit MinSwapOutputUpdated(previousBps, _minBps);
        _log("min_swap_output_set");
    }
    
    function setSwapPath(address token, address[] calldata path) external onlyDAO {
        if (token == address(0)) revert MERCH_Zero();
        if (path.length < 2 || path.length > MAX_SWAP_PATH_LENGTH) revert MERCH_InvalidConfig();
        if (path[0] != token) revert MERCH_InvalidConfig();
        if (path[path.length - 1] != stablecoin) revert MERCH_InvalidConfig();
        for (uint256 i = 0; i < path.length; i++) {
            if (path[i] == address(0)) revert MERCH_Zero();
        }
        tokenSwapPaths[token] = path;
        _log("swap_path_set");
    }

    // ─────────────────────────── Internal Trust Validation
    
    /**
     * Check if merchant meets minimum ProofScore requirement
     * Extracted to avoid code duplication
     */
    function _checkMerchantScore(address merchant) internal view {
        if (address(seer) == address(0)) return;
        
        uint16 score = seer.getScore(merchant);
        uint16 minScore = seer.minForMerchant();
        minScore = minScore > 0 ? minScore : minMerchantScore;
        
        if (score < minScore) revert MERCH_LowTrust();
    }

    function _checkFraudStatus(address subject) internal view {
        if (fraudRegistry == address(0)) return;

        (bool ok, bytes memory data) = fraudRegistry.staticcall(abi.encodeWithSelector(0x38603ddd, subject));
        if (ok && data.length >= 32 && abi.decode(data, (bool))) revert MERCH_Forbidden();
    }

    // ─────────────────────────── Merchant Management

    /**
     * Register as a merchant (requires minimum ProofScore)
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
        _logEv(msg.sender, "merchant_registered", 0, category);
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
        _logEv(msg.sender, "merchant_updated", 0, category);
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
        _logEv(msg.sender, "merchant_deregistered", 0, "");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              REFUND SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    
    event RefundInitiated(address indexed customer, address indexed merchant, string orderId, uint256 amount);
    event RefundCompleted(address indexed customer, address indexed merchant, string orderId, uint256 amount);
    event MerchantUpdated(address indexed merchant, string businessName, string category);
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
    
    mapping(bytes32 => RefundRequest) public refundRequests;
    
    /**
     * @notice Initiate a refund (merchant approves)
     * @param customer Customer to refund
     * @param token Token to refund
     * @param amount Amount to refund
     * @param orderId Original order ID
     */
    function initiateRefund(
        address customer,
        address token,
        uint256 amount,
        string calldata orderId
    ) external onlyMerchant returns (bytes32 refundId) {
        if (customer == address(0) || amount == 0) revert MERCH_InvalidPayment();
        
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
        if (customerRefunds[customer].length >= 500) revert MERCH_CapExceeded();
        customerRefunds[customer].push(refundId);
        if (merchantRefunds[msg.sender].length >= 500) revert MERCH_CapExceeded();
        merchantRefunds[msg.sender].push(refundId);
        
        emit RefundInitiated(customer, msg.sender, orderId, amount);
        _logEv(customer, "refund_initiated", amount, orderId);
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
        _logEv(r.customer, "refund_completed", r.amount, r.orderId);
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
        trustScore = address(seer) != address(0) ? seer.getScore(merchant) : 5000;
    }

    /**
     * DAO can suspend merchants for violations
     */
    function suspendMerchant(address merchant, string calldata reason) external onlyDAO {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        merchants[merchant].suspended = true;
        emit MerchantSuspended(merchant, reason);
        _logEv(merchant, "merchant_suspended", 0, reason);
    }

    /**
     * DAO can reinstate suspended merchants
     */
    function reinstateMerchant(address merchant) external onlyDAO {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        merchants[merchant].suspended = false;
        emit MerchantReinstated(merchant);
        _logEv(merchant, "merchant_reinstated", 0, "");
    }

    // ─────────────────────────── Payment Processing

    /**
     * Process a payment from customer to merchant
     * @param customer Customer address (will use their vault)
     * @param token Payment token (VFIDE or accepted stablecoin)
     * @param amount Payment amount
     * @param orderId Merchant's order/transaction ID for reference
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
        
        // Continuous Trust Check: Ensure merchant still meets score requirements
        _checkMerchantScore(msg.sender);
        
        // Capture customer score at payment start for accurate logging
        uint16 customerScore = address(seer) != address(0) ? seer.getScore(customer) : 500;
        
        _validateSettlementToken(token);
        
        // Get customer's vault
        address customerVault = vaultHub.vaultOf(customer);
        if (customerVault == address(0)) revert MERCH_NoVault();
        if (!merchantPullApproved[customer][msg.sender]) revert MERCH_NotApproved();
        uint64 permitExpiry = merchantPullExpiry[customer][msg.sender];
        if (!(permitExpiry == 0 || block.timestamp <= permitExpiry)) revert MERCH_ApprovalExpired();
        address scopedToken = merchantPullToken[customer][msg.sender];
        if (scopedToken != address(0) && scopedToken != token) revert MERCH_NotApproved();
        uint256 remainingPull = merchantPullRemaining[customer][msg.sender];
        if (remainingPull < amount) revert MERCH_LimitExceeded();
        unchecked { merchantPullRemaining[customer][msg.sender] = remainingPull - amount; }
        
        // SecurityHub lock check removed — non-custodial, no third-party locks
        
        // Calculate fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        netAmount = amount - fee;
        
        _recordMerchantStats(msg.sender, amount);

        // Get merchant's vault (auto-create if needed)
        // H-32 FIX: Do not auto-create a vault; require the merchant to have pre-registered one.
        // This prevents unexpected vault creation as a side-effect of a payment.
        address merchantVault = vaultHub.vaultOf(msg.sender);
        if (merchantVault == address(0)) revert MERCH_NotRegistered();
        
        // Transfer fee first to fee sink (if fee > 0)
        if (fee > 0 && feeSink != address(0)) {
            // Vault custody model: charge fee from the customer's registered vault.
            IERC20(token).safeTransferFrom(customerVault, feeSink, fee);
        }
        
        // Vault custody model: settle payment from the customer's registered vault.
        // Transfer from customer vault to merchant vault
        IERC20(token).safeTransferFrom(customerVault, merchantVault, netAmount);
        
        emit PaymentProcessed(
            customer,
            msg.sender,
            token,
            amount,
            fee,
            orderId,
            customerScore,
            PaymentChannel.IN_PERSON // Legacy function defaults to in-person
        );

        _rewardPaymentParticipants(customer, msg.sender);
        
        _logEv(customer, "merchant_payment", amount, orderId);
    }

    /// @notice Revoke merchant permission to initiate pulls from your vault via processPayment.
    /// @dev M-12 FIX: This function can ONLY revoke (approved must be false) — any call with approved=true reverts.
    ///      Use setMerchantPullPermit() to grant a scoped permit instead.
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
    function setMerchantPullPermitForToken(address merchant, address token, uint256 maxAmount, uint64 expiresAt) external {
        _setMerchantPullPermit(merchant, token, maxAmount, expiresAt, true);
    }

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

        uint256 vaultDailyLimit;
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
     */
    function pay(
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId
    ) external nonReentrant returns (uint256 netAmount) {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        if (merchants[merchant].suspended) revert MERCH_Suspended();
        
        // Continuous Trust Check
        _checkMerchantScore(merchant);
        
        return _processPaymentInternal(msg.sender, merchant, token, amount, orderId);
    }

    function _processPaymentInternal(
        address customer,
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId
    ) internal returns (uint256 netAmount) {
        if (token == address(0) || amount == 0) revert MERCH_InvalidPayment();
        _validateSettlementToken(token);
        _checkFraudStatus(customer);
        _checkFraudStatus(merchant);
        
        // Capture customer score at payment start for accurate logging
        uint16 customerScore = address(seer) != address(0) ? seer.getScore(customer) : 500;
        
        // Get vaults
        address customerVault = vaultHub.vaultOf(customer);
        if (customerVault == address(0)) revert MERCH_NoVault();

        // Update merchant stats before any external calls so a reentrant recipient
        // cannot observe partially-applied accounting.
        _recordMerchantStats(merchant, amount);
        
        // SecurityHub lock check removed — non-custodial, no third-party locks
        
        // Determine recipient (Vault or Payout Address)
        address recipient = merchants[merchant].payoutAddress;
        if (recipient == address(0)) {
            recipient = vaultHub.ensureVault(merchant);
        }
        
        // Calculate fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        netAmount = amount - fee;
        
        // Transfer fee FIRST (before net amount)
        if (fee > 0 && feeSink != address(0)) {
            IERC20(token).safeTransferFrom(customerVault, feeSink, fee);
        }
        
        // Transfer net amount (with STABLE-PAY auto-convert if enabled)
        _transferWithAutoConvert(token, customerVault, recipient, netAmount, merchant);
        
        // Note: Stats already updated before external calls (C-3 fix)
        
        emit PaymentProcessed(
            customer,
            merchant,
            token,
            amount,
            fee,
            orderId,
            customerScore,
            PaymentChannel.IN_PERSON // Legacy internal function defaults to in-person
        );

        _rewardPaymentParticipants(customer, merchant);
        
        _logEv(customer, "merchant_payment", amount, orderId);
    }

    /**
     * Enable or disable automatic conversion for stable-pay merchants
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
     */
    function setPayoutAddress(address payout) external onlyMerchant {
        if (!(payout == address(0) || vaultHub.isVault(payout))) revert MERCH_InvalidConfig();
        merchants[msg.sender].payoutAddress = payout;
        emit PayoutAddressSet(msg.sender, payout);
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
     */
    function payInPerson(
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId,
        PaymentChannel channel
    ) external nonReentrant returns (uint256 netAmount) {
        // Only allow in-person channel types
        require(
            channel == PaymentChannel.IN_PERSON || 
            channel == PaymentChannel.POS_TERMINAL || 
            channel == PaymentChannel.QR_CODE,
            "MP: use payOnline for this channel"
        );
        
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        if (merchants[merchant].suspended) revert MERCH_Suspended();
        _checkMerchantScore(merchant);
        
        netAmount = _processPaymentWithChannel(msg.sender, merchant, token, amount, orderId, channel);
    }

    /**
     * @notice Online payment - MUST use escrow for buyer protection
     * @dev Reverts - online payments require escrow via VFIDECommerce
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
     */
    function paySubscription(
        address merchant,
        address token,
        uint256 amount,
        string calldata subscriptionId
    ) external nonReentrant returns (uint256 netAmount) {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        if (merchants[merchant].suspended) revert MERCH_Suspended();
        _checkMerchantScore(merchant);
        
        netAmount = _processPaymentWithChannel(msg.sender, merchant, token, amount, subscriptionId, PaymentChannel.SUBSCRIPTION);
    }

    /**
     * @notice Invoice payment - bill/invoice with channel tracking
     * @param merchant The merchant
     * @param token Payment token
     * @param amount Payment amount
     * @param invoiceId Invoice reference
     */
    function payInvoice(
        address merchant,
        address token,
        uint256 amount,
        string calldata invoiceId
    ) external nonReentrant returns (uint256 netAmount) {
        if (!merchants[merchant].registered) revert MERCH_NotRegistered();
        if (merchants[merchant].suspended) revert MERCH_Suspended();
        _checkMerchantScore(merchant);
        
        netAmount = _processPaymentWithChannel(msg.sender, merchant, token, amount, invoiceId, PaymentChannel.INVOICE);
    }

    /**
     * @notice Internal payment processor with channel tracking
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
        _validateSettlementToken(token);
        _checkFraudStatus(customer);
        _checkFraudStatus(merchant);
        
        uint16 customerScore = address(seer) != address(0) ? seer.getScore(customer) : 500;

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
        
        _logEv(customer, "merchant_payment", amount, orderId);
    }

    // ─────────────────────────── View Functions

    /**
     * @notice Shared transfer helper with STABLE-PAY auto-convert
     * @dev Used by both _processPaymentInternal and _processPaymentWithChannel
     */
    function _transferWithAutoConvert(
        address token,
        address customerVault,
        address recipient,
        uint256 netAmount,
        address merchant
    ) internal {
        if (autoConvert[merchant] && token != stablecoin) {
            emit AutoConvertFallback(merchant, token, netAmount, "auto_convert_disabled_pending_safe_pricing");
        }

        IERC20(token).safeTransferFrom(customerVault, recipient, netAmount);
    }

    /**
     * Get customer's trust assessment (read-only for merchants)
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
        
        score = seer.getScore(customer);
        uint16 highThreshold = seer.highTrustThreshold();
        uint16 lowThreshold = seer.lowTrustThreshold();
        
        highTrust = score >= highThreshold;
        lowTrust = score <= lowThreshold;
        
        // Check if customer has vault
        address vault = vaultHub.vaultOf(customer);
        eligible = vault != address(0);
        
        // SecurityHub lock check removed — non-custodial
    }

    function getMerchantInfo(address merchant) external view returns (
        bool registered,
        bool suspended,
        string memory businessName,
        string memory category,
        uint64 registeredAt,
        uint256 totalVolume,
        uint256 txCount
    ) {
        MerchantInfo storage m = merchants[merchant];
        return (
            m.registered,
            m.suspended,
            m.businessName,
            m.category,
            m.registeredAt,
            m.totalVolume,
            m.txCount
        );
    }

    function getMerchantCount() external view returns (uint256) {
        return merchantList.length;
    }

    function calculateFee(uint256 amount) external view returns (uint256 fee, uint256 netAmount) {
        fee = (amount * protocolFeeBps) / 10000;
        netAmount = amount - fee;
    }

    /// @notice Reverse calculator to estimate gross amount needed for a target net merchant receipt.
    function calculateGrossAmount(
        address customer,
        address merchant,
        address token,
        uint256 desiredNetAmount
    ) public view returns (
        uint256 grossAmount,
        uint256 totalFee,
        uint256 protocolFee,
        uint256 networkFee
    ) {
        if (desiredNetAmount == 0) revert MERCH_InvalidPayment();

        grossAmount = desiredNetAmount;
        for (uint256 i = 0; i < 6; i++) {
            protocolFee = (grossAmount * protocolFeeBps) / 10000;
            networkFee = _estimateNetworkFee(customer, merchant, token, grossAmount);
            uint256 nextGross = desiredNetAmount + protocolFee + networkFee;
            if (nextGross == grossAmount) {
                break;
            }
            grossAmount = nextGross;
        }

        protocolFee = (grossAmount * protocolFeeBps) / 10000;
        networkFee = _estimateNetworkFee(customer, merchant, token, grossAmount);
        totalFee = protocolFee + networkFee;
    }

    /// @notice Preview checkout totals for UI display (item + network/protocol fees).
    function previewCheckout(
        address customer,
        address merchant,
        address token,
        uint256 itemAmount
    ) external view returns (
        uint256 grossAmount,
        uint256 totalFee,
        uint256 protocolFee,
        uint256 networkFee
    ) {
        return calculateGrossAmount(customer, merchant, token, itemAmount);
    }

    function isTokenAccepted(address token) external view returns (bool) {
        return acceptedTokens[token];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        REFUND TRACKING VIEWS
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track refunds per customer and merchant
    mapping(address => bytes32[]) private customerRefunds;
    mapping(address => bytes32[]) private merchantRefunds;
    
    /**
     * @notice Get refund status by ID
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
     * @notice Get all refund IDs for a customer
     */
    function getRefundsForCustomer(address customer) external view returns (bytes32[] memory) {
        return customerRefunds[customer];
    }
    
    /**
     * @notice Get all refund IDs for a merchant
     */
    function getRefundsForMerchant(address merchant) external view returns (bytes32[] memory) {
        return merchantRefunds[merchant];
    }
    
    /**
     * @notice Get merchant dispute/refund rates
     * @param merchant Merchant address
     * @return refundCount Total refunds issued
     * @return refundVolume Total value refunded
     * @return refundRate Refund rate in basis points (refunds / total tx * 10000)
     */
    function getMerchantRefundRate(address merchant) external view returns (
        uint256 refundCount,
        uint256 refundVolume,
        uint256 refundRate
    ) {
        bytes32[] memory refundIds = merchantRefunds[merchant];
        for (uint256 i = 0; i < refundIds.length; i++) {
            RefundRequest storage r = refundRequests[refundIds[i]];
            if (r.completed) {
                refundCount++;
                refundVolume += r.amount;
            }
        }
        
        MerchantInfo storage m = merchants[merchant];
        if (m.txCount > 0) {
            refundRate = (refundCount * 10000) / m.txCount;
        }
    }

    function _hasPendingRefunds(address merchant) internal view returns (bool) {
        bytes32[] storage refundIds = merchantRefunds[merchant];
        for (uint256 i = 0; i < refundIds.length; i++) {
            if (!refundRequests[refundIds[i]].completed) {
                return true;
            }
        }
        return false;
    }

    function _rewardPaymentParticipants(address customer, address merchant) internal {
        if (address(seer) == address(0)) return;
        try seer.reward(merchant, 3, "merchant_payment") {} catch {}
        try seer.reward(customer, 1, "customer_payment") {} catch {}
    }

    function _recordMerchantStats(address merchant, uint256 amount) internal {
        MerchantInfo storage info = merchants[merchant];
        info.totalVolume += amount;
        info.txCount += 1;
    }

    function _validateSettlementToken(address token) internal view {
        if (!acceptedTokens[token]) revert MERCH_TokenNotAccepted();

        // F-07 REMEDIATION: Settlement is stablecoin-only.
        // Tokens with a VFIDE-style burn router underdeliver versus invoice amounts.
        // Reject them at the contract layer to prevent accounting mismatch.
        try IVFIDETokenBurnRouterView(token).burnRouter() returns (address r) {
            if (r != address(0)) revert MERCH_VFIDESettlementDisabled();
        } catch {
            // Non-VFIDE tokens do not expose burnRouter(); allow them when accepted.
        }
    }

    function _estimateNetworkFee(address customer, address merchant, address token, uint256 amount) internal view returns (uint256) {
        // Non-VFIDE tokens do not pass through VFIDE burn router fee mechanics.
        if (!acceptedTokens[token]) return 0;

        address router = address(0);
        try IVFIDETokenBurnRouterView(token).burnRouter() returns (address r) {
            router = r;
        } catch {
            return 0;
        }

        if (router == address(0)) return 0;

        try IProofScoreBurnRouterToken(router).computeFees(customer, merchant, amount) returns (
            uint256 burnAmount,
            uint256 sanctumAmount,
            uint256 ecosystemAmount,
            address,
            address,
            address
        ) {
            return burnAmount + sanctumAmount + ecosystemAmount;
        } catch {
            return 0;
        }
    }

    // ─────────────────────────── Internal Helpers

    // slither-disable-next-line reentrancy-events
    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); }
        }
    }

    // slither-disable-next-line reentrancy-events
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch { emit LedgerLogFailed(who, action); }
        }
    }
}
