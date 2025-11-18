// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * MerchantPortal — Fair Trade & Payment System for VFIDE Ecosystem
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

interface IERC20_Merchant {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IVaultHub_Merchant {
    function vaultOf(address owner) external view returns (address);
    function ensureVault(address owner) external returns (address);
}

interface ISeer_Merchant {
    function getScore(address subject) external view returns (uint16);
    function minForMerchant() external view returns (uint16);
}

interface ISecurityHub_Merchant {
    function isLocked(address vault) external view returns (bool);
}

interface IProofLedger_Merchant {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
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

abstract contract Ownable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    address public owner;
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status == 1, "reentrancy");
        _status = 2;
        _;
        _status = 1;
    }
}

contract MerchantPortal is Ownable, ReentrancyGuard {
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
        uint16 customerScore
    );
    event FeeUpdated(uint256 feeBasisPoints);
    event MinScoreUpdated(uint16 minScore);
    event FeeSinkSet(address sink);
    event KYCApproved(address indexed wallet);
    event KYCRevoked(address indexed wallet);

    /// External modules
    IVaultHub_Merchant public vaultHub;
    ISeer_Merchant public seer;
    ISecurityHub_Merchant public securityHub;
    IProofLedger_Merchant public ledger;

    /// DAO control
    address public dao;

    /// Protocol fee (in basis points, e.g., 50 = 0.5%)
    uint256 public protocolFeeBps = 25; // 0.25% default (very low)
    address public feeSink; // Where protocol fees go (could be treasury or burn)

    /// Merchant minimum ProofScore requirement
    uint16 public minMerchantScore = 560; // From overview: minForMerchant = 560

    /// Merchant registry
    struct MerchantInfo {
        bool registered;
        bool suspended;
        string businessName;
        string category; // e.g., "retail", "services", "digital_goods"
        uint64 registeredAt;
        uint256 totalVolume; // Lifetime payment volume
        uint256 txCount;     // Total transactions
    }
    mapping(address => MerchantInfo) public merchants;
    address[] public merchantList;

    /// Supported payment tokens (VFIDE + stablecoins)
    mapping(address => bool) public acceptedTokens;

    // Restrict connections to KYC-compliant wallets and exchanges
    mapping(address => bool) public kycApproved;

    modifier onlyKYCApproved(address wallet) {
        require(kycApproved[wallet], "Wallet not KYC-approved");
        _;
    }

    modifier onlyDAO() {
        if (msg.sender != dao) revert MERCH_NotDAO();
        _;
    }

    modifier onlyMerchant() {
        if (!merchants[msg.sender].registered) revert MERCH_NotMerchant();
        _;
    }

    constructor(
        address _dao,
        address _vaultHub,
        address _seer,
        address _securityHub,
        address _ledger,
        address _feeSink
    ) {
        require(_dao != address(0) && _vaultHub != address(0), "zero");
        dao = _dao;
        vaultHub = IVaultHub_Merchant(_vaultHub);
        seer = ISeer_Merchant(_seer);
        securityHub = ISecurityHub_Merchant(_securityHub);
        ledger = IProofLedger_Merchant(_ledger);
        feeSink = _feeSink;
        
        emit ModulesSet(_vaultHub, _seer, _securityHub, _ledger);
        if (_feeSink != address(0)) emit FeeSinkSet(_feeSink);
    }

    // ─────────────────────────── Admin: DAO controls

    function setModules(
        address _vaultHub,
        address _seer,
        address _securityHub,
        address _ledger
    ) external onlyDAO {
        require(_vaultHub != address(0) && _seer != address(0), "zero");
        vaultHub = IVaultHub_Merchant(_vaultHub);
        seer = ISeer_Merchant(_seer);
        securityHub = ISecurityHub_Merchant(_securityHub);
        ledger = IProofLedger_Merchant(_ledger);
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
        require(_minScore <= 1000, "invalid score");
        minMerchantScore = _minScore;
        emit MinScoreUpdated(_minScore);
        _log("min_merchant_score_set");
    }

    function setAcceptedToken(address token, bool accepted) external onlyDAO {
        require(token != address(0), "zero");
        acceptedTokens[token] = accepted;
        _log(accepted ? "token_accepted" : "token_removed");
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

        // Delegate ProofScore requirement to Seer
        if (address(seer) != address(0)) {
            uint16 score = seer.getScore(msg.sender);
            uint16 minScore = seer.minForMerchant();
            if (score < minScore) revert MERCH_LowTrust();
        }

        merchants[msg.sender] = MerchantInfo({
            registered: true,
            suspended: false,
            businessName: businessName,
            category: category,
            registeredAt: uint64(block.timestamp),
            totalVolume: 0,
            txCount: 0
        });

        merchantList.push(msg.sender);

        emit MerchantRegistered(msg.sender, businessName, category);
        _logEv(msg.sender, "merchant_registered", 0, category);
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
        
        // Transfer from customer vault to merchant vault
        require(
            IERC20_Merchant(token).transferFrom(customerVault, merchantVault, netAmount),
            "transfer failed"
        );
        
        // Transfer fee to fee sink (if fee > 0)
        if (fee > 0 && feeSink != address(0)) {
            require(
                IERC20_Merchant(token).transferFrom(customerVault, feeSink, fee),
                "fee transfer failed"
            );
        }
        
        // Update merchant stats
        merchant.totalVolume += amount;
        merchant.txCount += 1;
        
        // Get customer's ProofScore for logging
        uint16 customerScore = address(seer) != address(0) ? seer.getScore(customer) : 500;
        
        emit PaymentProcessed(
            customer,
            msg.sender,
            token,
            amount,
            fee,
            orderId,
            customerScore
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
        
        // Get vaults
        address customerVault = vaultHub.vaultOf(customer);
        require(customerVault != address(0), "no vault");
        
        // Security check
        if (address(securityHub) != address(0) && securityHub.isLocked(customerVault)) {
            revert MERCH_VaultLocked();
        }
        
        address merchantVault = vaultHub.ensureVault(merchant);
        
        // Calculate fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        netAmount = amount - fee;
        
        // Transfer from customer vault to merchant vault
        require(
            IERC20_Merchant(token).transferFrom(customerVault, merchantVault, netAmount),
            "transfer failed"
        );
        
        // Transfer fee
        if (fee > 0 && feeSink != address(0)) {
            require(
                IERC20_Merchant(token).transferFrom(customerVault, feeSink, fee),
                "fee transfer failed"
            );
        }
        
        // Update stats
        MerchantInfo storage m = merchants[merchant];
        m.totalVolume += amount;
        m.txCount += 1;
        
        // Get customer score
        uint16 customerScore = address(seer) != address(0) ? seer.getScore(customer) : 500;
        
        emit PaymentProcessed(
            customer,
            merchant,
            token,
            amount,
            fee,
            orderId,
            customerScore
        );
        
        _logEv(customer, "merchant_payment", amount, orderId);
    }

    /**
     * Approve a wallet for KYC (only DAO)
     */
    function approveKYC(address wallet) external onlyDAO {
        require(wallet != address(0), "Invalid wallet address");
        kycApproved[wallet] = true;
        emit KYCApproved(wallet);
    }

    /**
     * Revoke KYC approval for a wallet (only DAO)
     */
    function revokeKYC(address wallet) external onlyDAO {
        require(kycApproved[wallet], "Wallet not KYC-approved");
        kycApproved[wallet] = false;
        emit KYCRevoked(wallet);
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
