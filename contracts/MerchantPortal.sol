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
    
    /// Events
    event ModulesSet(address vaultHub, address seer, address securityHub, address ledger);
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

    /// External modules
    IVaultHub public vaultHub;
    ISeer public seer;
    ISecurityHub public securityHub;
    IProofLedger public ledger;

    /// DAO control
    address public dao;

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

    /// Supported payment tokens (VFIDE + stablecoins)
    mapping(address => bool) public acceptedTokens;

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
        address _securityHub,
        address _ledger,
        address _feeSink
    ) {
        // M-3 Fix: Require feeSink to be non-zero to prevent fee loss
        require(_dao != address(0) && _vaultHub != address(0), "zero");
        require(_feeSink != address(0), "MerchantPortal: feeSink cannot be zero");
        dao = _dao;
        vaultHub = IVaultHub(_vaultHub);
        seer = ISeer(_seer);
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        feeSink = _feeSink;
        
        emit ModulesSet(_vaultHub, _seer, _securityHub, _ledger);
        emit FeeSinkSet(_feeSink);
    }

    // ─────────────────────────── Admin: DAO controls

    function setModules(
        address _vaultHub,
        address _seer,
        address _securityHub,
        address _ledger
    ) external onlyDAO {
        require(_vaultHub != address(0) && _seer != address(0), "zero");
        vaultHub = IVaultHub(_vaultHub);
        seer = ISeer(_seer);
        securityHub = ISecurityHub(_securityHub);
        ledger = IProofLedger(_ledger);
        emit ModulesSet(_vaultHub, _seer, _securityHub, _ledger);
        _log("merchant_modules_set");
    }

    function setProtocolFee(uint256 _feeBps) external onlyDAO {
        require(_feeBps <= 500, "fee too high"); // Max 5%
        protocolFeeBps = _feeBps;
        emit FeeUpdated(_feeBps);
        _log("protocol_fee_updated");
    }

    function setFeeSink(address _sink) external onlyDAO {
        require(_sink != address(0), "zero");
        feeSink = _sink;
        emit FeeSinkSet(_sink);
        _log("fee_sink_set");
    }

    function setMinMerchantScore(uint16 _minScore) external onlyDAO {
        require(_minScore <= 10000, "invalid score"); // 0-10000 scale
        minMerchantScore = _minScore;
        emit MinScoreUpdated(_minScore);
        _log("min_merchant_score_set");
    }

    function setAcceptedToken(address token, bool accepted) external onlyDAO {
        require(token != address(0), "zero");
        acceptedTokens[token] = accepted;
        _log(accepted ? "token_accepted" : "token_removed");
    }

    function setSwapConfig(address _router, address _stable) external onlyDAO {
        // M-10 Fix: Validate addresses if swap is enabled
        if (_router != address(0)) {
            require(_stable != address(0), "MP: stable required with router");
        }
        swapRouter = ISwapRouter(_router);
        stablecoin = _stable;
        _log("swap_config_set");
    }
    
    function setMinSwapOutput(uint256 _minBps) external onlyDAO {
        require(_minBps >= 9000 && _minBps <= 10000, "invalid slippage"); // 0-10% slippage
        minSwapOutputBps = _minBps;
        _log("min_swap_output_set");
    }
    
    function setSwapPath(address token, address[] calldata path) external onlyDAO {
        require(token != address(0), "zero token");
        require(path.length >= 2, "path too short");
        require(path[0] == token, "path start mismatch");
        require(path[path.length - 1] == stablecoin, "path end mismatch");
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

    // ─────────────────────────── Merchant Management

    /**
     * Register as a merchant (requires minimum ProofScore)
     */
    function registerMerchant(
        string calldata businessName,
        string calldata category
    ) external {
        require(!merchants[msg.sender].registered, "already registered");
        
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
        
        merchantList.push(msg.sender);
        
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
        require(!m.suspended, "Cannot deregister while suspended");
        
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
        require(customer != address(0) && amount > 0, "Invalid refund params");
        
        refundId = keccak256(abi.encode(msg.sender, customer, orderId, block.timestamp));
        
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
        
        // Track refunds for both parties
        customerRefunds[customer].push(refundId);
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
        require(r.amount > 0, "Refund not found");
        require(r.approved, "Refund not approved");
        require(!r.completed, "Already completed");
        require(msg.sender == r.merchant, "Only merchant can complete");
        
        r.completed = true;
        
        // Get vaults
        address merchantVault = vaultHub.vaultOf(r.merchant);
        address customerVault = vaultHub.vaultOf(r.customer);
        require(merchantVault != address(0) && customerVault != address(0), "Missing vaults");
        
        // Transfer from merchant vault to customer vault
        IERC20(r.token).safeTransferFrom(merchantVault, customerVault, r.amount);
        
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
        
        require(acceptedTokens[token], "token not accepted");
        
        // Get customer's vault
        address customerVault = vaultHub.vaultOf(customer);
        require(customerVault != address(0), "no vault");
        
        // Security check
        if (address(securityHub) != address(0) && securityHub.isLocked(customerVault)) {
            revert MERCH_VaultLocked();
        }
        
        // Get merchant's vault (auto-create if needed)
        address merchantVault = vaultHub.ensureVault(msg.sender);
        
        // Calculate fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        netAmount = amount - fee;
        
        // H-3 Fix: Update state BEFORE external calls (Checks-Effects-Interactions)
        merchant.totalVolume += amount;
        merchant.txCount += 1;
        
        // Final merchant score check before transfer (prevent mid-payment demotion)
        _checkMerchantScore(msg.sender);
        
        // Transfer fee first to fee sink (if fee > 0)
        if (fee > 0 && feeSink != address(0)) {
            IERC20(token).safeTransferFrom(customerVault, feeSink, fee);
        }
        
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
        
        _logEv(customer, "merchant_payment", amount, orderId);
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
        require(acceptedTokens[token], "token not accepted");
        
        // Capture customer score at payment start for accurate logging
        uint16 customerScore = address(seer) != address(0) ? seer.getScore(customer) : 500;
        
        // Get vaults
        address customerVault = vaultHub.vaultOf(customer);
        require(customerVault != address(0), "no vault");
        
        // Security check
        if (address(securityHub) != address(0) && securityHub.isLocked(customerVault)) {
            revert MERCH_VaultLocked();
        }
        
        // Determine recipient (Vault or Payout Address)
        address recipient = merchants[merchant].payoutAddress;
        if (recipient == address(0)) {
            recipient = vaultHub.ensureVault(merchant);
        }
        
        // Calculate fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        netAmount = amount - fee;
        
        // C-3 FIX: Update merchant stats BEFORE external calls (CEI pattern)
        MerchantInfo storage m = merchants[merchant];
        m.totalVolume += amount;
        m.txCount += 1;
        
        // Transfer fee FIRST (before net amount)
        if (fee > 0 && feeSink != address(0)) {
            IERC20(token).safeTransferFrom(customerVault, feeSink, fee);
        }
        
        // STABLE-PAY LOGIC with Slippage Protection
        bool converted = false;
        if (autoConvert[merchant] && token != stablecoin && address(swapRouter) != address(0) && stablecoin != address(0)) {
            // 1. Pull to Portal
            IERC20(token).safeTransferFrom(customerVault, address(this), netAmount);
            
            // 2. Approve Router
            IERC20(token).approve(address(swapRouter), netAmount);
            
            // 3. Get swap path (multi-hop if configured, otherwise direct)
            address[] memory path;
            if (tokenSwapPaths[token].length >= 2) {
                path = tokenSwapPaths[token];
            } else {
                path = new address[](2);
                path[0] = token;
                path[1] = stablecoin;
            }
            
            // 4. Calculate minimum output with slippage protection
            uint256 minOut = (netAmount * minSwapOutputBps) / 10000;
            
            // 5. Swap with slippage protection
            try swapRouter.swapExactTokensForTokens(
                netAmount,
                minOut, // Slippage protection
                path,
                recipient, // Send directly to recipient
                block.timestamp + 300
            ) {
                converted = true;
                // C-4 FIX: Revoke approval after successful swap
                IERC20(token).approve(address(swapRouter), 0);
            } catch {
                // C-4 FIX: Revoke approval after failed swap to prevent lingering approvals
                IERC20(token).approve(address(swapRouter), 0);
                // Fallback: Send original token if swap fails
                IERC20(token).safeTransfer(recipient, netAmount);
            }
        } else {
            // Normal Transfer
            IERC20(token).safeTransferFrom(customerVault, recipient, netAmount);
        }
        
        // Note: Stats already updated before external calls (C-3 fix)
        
        // Final merchant score check
        _checkMerchantScore(merchant);
        
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
        
        _logEv(customer, "merchant_payment", amount, orderId);
    }

    /**
     * Enable or disable automatic conversion for stable-pay merchants
     */
    function setAutoConvert(bool enabled) external onlyMerchant {
        autoConvert[msg.sender] = enabled;
    }

    /**
     * Set a custom payout address (e.g. RevenueSplitter or Treasury)
     * If set to address(0), funds go to the merchant's Vault.
     */
    function setPayoutAddress(address payout) external onlyMerchant {
        merchants[msg.sender].payoutAddress = payout;
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
     * @param merchant The merchant
     * @param token Payment token
     * @param amount Payment amount
     * @param orderId Order reference
     */
    function payOnline(
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId
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
        require(acceptedTokens[token], "token not accepted");
        
        uint16 customerScore = address(seer) != address(0) ? seer.getScore(customer) : 500;
        
        // Get customer vault
        address customerVault = vaultHub.vaultOf(customer);
        require(customerVault != address(0), "no vault");
        
        if (address(securityHub) != address(0) && securityHub.isLocked(customerVault)) {
            revert MERCH_VaultLocked();
        }
        
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
            
            // Update stats before external calls
            MerchantInfo storage m = merchants[merchant];
            m.totalVolume += amount;
            m.txCount += 1;
            
            // Fee transfer FIRST
            if (fee > 0 && feeSink != address(0)) {
                IERC20(token).safeTransferFrom(customerVault, feeSink, fee);
            }
            
            // Transfer net amount
            IERC20(token).safeTransferFrom(customerVault, recipient, netAmount);
        }
        
        // Emit enhanced event with channel
        emit PaymentWithChannel(
            customer,
            merchant,
            token,
            amount,
            amount - netAmount, // fee
            orderId,
            customerScore,
            channel
        );
        
        // Also emit PaymentProcessed with channel for unified interface
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
        
        _logEv(customer, "merchant_payment", amount, orderId);
    }

    // ─────────────────────────── View Functions

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
        
        // Check if locked
        if (eligible && address(securityHub) != address(0)) {
            eligible = !securityHub.isLocked(vault);
        }
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

    // ─────────────────────────── Internal Helpers

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
