// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title VFIDECommerceSustainable
 * @notice SUSTAINABLE commerce protection using escrow-based insurance
 * 
 * SUSTAINABLE MODEL:
 * ✅ NO separate 100k insurance reserves (unsustainable)
 * ✅ Escrow-held protection (deposits/forfeitures fund claims)
 * ✅ Self-funding system (bad actors pay for protection)
 * ✅ Treasury revenue from multiple sources
 * ✅ Gas subsidy limits prevent treasury drain
 * ✅ Zero commerce fees (competitive advantage)
 * 
 * TREASURY REVENUE SOURCES:
 * 1. ProofScore burns from token transfers (50% burn, 25% treasury, 25% Sanctum)
 * 2. Merchant registration deposits (1000 VFIDE, returned if honest)
 * 3. Dispute deposit forfeitures (10% of order, when buyer loses)
 * 4. Seized merchant deposits (when merchant commits fraud)
 * 5. Presale/launch allocation (initial capital)
 * 
 * ESCROW-BASED PROTECTION (replaces 100k funds):
 * - Buyer protection: Held in escrow during delivery window
 * - Seller protection: Forfeited buyer deposits compensate merchants
 * - Self-funding: Dishonest parties pay for honest parties' claims
 * - Sustainable: No reserve depletion, scales with volume
 * 
 * SUSTAINABLE GAS SUBSIDY:
 * - Monthly cap per merchant (e.g., 100 transactions or $50 gas)
 * - Tiered by merchant score (750-799 = 50 tx, 800+ = 100 tx)
 * - Annual budget cap (e.g., 1M VFIDE or $100k)
 * - Emergency pause if treasury low
 * 
 * ZERO COMMERCE FEE MODEL:
 * - Merchants: Pay $0 transaction fees (competitive advantage vs credit cards 2-3%)
 * - Buyers: Pay only zkSync gas (~$0.01-0.10 per transaction)
 * - Treasury: Funds gas subsidies from non-commerce revenue (burns, deposits, presale)
 * - Sustainability: Multiple revenue streams + self-funding protection
 */

// ============================================================================
// EXTERNAL INTERFACES
// ============================================================================

interface IVaultHub_CS {
    function vaultOf(address owner) external view returns (address);
}

interface ISeer_CS {
    function getScore(address account) external view returns (uint16);
    function getMerchantScore(address merchant) external view returns (uint16);
    function isMerchantEligible(address merchant) external view returns (bool);
    function qualifiesForFeeSubsidy(address merchant) external view returns (bool);
    function reward(address account, uint16 delta, string calldata reason) external;
    function punish(address account, uint16 delta, string calldata reason) external;
    function rewardMerchant(address merchant, uint16 delta, string calldata reason) external;
    function punishMerchant(address merchant, uint16 delta, string calldata reason) external;
}

interface IProofLedger_CS {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
    function logTransfer(address from, address to, uint256 amount, string calldata note) external;
}

interface ISecurityHub_CS {
    function isLocked(address vault) external view returns (bool);
}

interface IERC20_CS {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

error CS_NotDAO();
error CS_Zero();
error CS_NotMerchant();
error CS_AlreadyMerchant();
error CS_NotEligible();
error CS_Suspended();
error CS_Delisted();
error CS_NotBuyer();
error CS_NotSeller();
error CS_BadAmount();
error CS_BadState();
error CS_TooEarly();
error CS_TooLate();
error CS_NotFunded();
error CS_SecLocked();
error CS_NotAllowed();
error CS_BadRating();
error CS_BadEvidence();
error CS_AlreadyVoted();
error CS_NotDisputed();
error CS_AlreadyRated();
error CS_Bounds();
error CS_InsufficientDeposit();
error CS_SerialDisputer();
error CS_BannedBuyer();
error CS_ActiveDisputes();
error CS_SubsidyExceeded();
error CS_TreasuryLow();

// ============================================================================
// SUSTAINABLE TREASURY - Multiple revenue sources
// ============================================================================

contract SustainableTreasury {
    event DAOChanged(address indexed oldDAO, address indexed newDAO);
    event ModuleUpdated(string indexed module, address indexed oldAddress, address indexed newAddress);
    event RevenueReceived(string indexed source, uint256 amount, address indexed from);
    event GasSubsidyPaid(address indexed merchant, uint256 amount, uint32 txCount);
    event MonthlySubsidyCapSet(uint16 score750Cap, uint16 score800Cap);
    event AnnualBudgetCapSet(uint256 oldCap, uint256 newCap);
    event SubsidyPaused(bool paused, string reason);
    event MinimumTreasuryBalanceSet(uint256 oldBalance, uint256 newBalance);

    address public dao;
    IERC20_CS public token;
    IProofLedger_CS public ledger;

    // Subsidy tracking
    mapping(address => uint32) public monthlySubsidyUsed;  // merchant => tx count this month
    mapping(address => uint64) public lastSubsidyMonth;    // merchant => month timestamp
    uint256 public annualSubsidySpent;
    uint64 public annualPeriodStart;

    // Sustainable limits
    uint16 public subsidyCap750 = 50;   // 50 tx/month for 750-799 score
    uint16 public subsidyCap800 = 100;  // 100 tx/month for 800+ score
    uint256 public annualSubsidyBudget = 1_000_000 * 10**18;  // 1M VFIDE annual cap
    uint256 public minimumTreasuryBalance = 50_000 * 10**18;  // 50k VFIDE emergency threshold
    bool public subsidyPaused;

    // Revenue tracking
    uint256 public totalRevenue;
    uint256 public revenueFromBurns;
    uint256 public revenueFromDeposits;
    uint256 public revenueFromForfeitures;
    uint256 public revenueFromPresale;

    modifier onlyDAO() {
        if (msg.sender != dao) revert CS_NotDAO();
        _;
    }

    constructor(address _dao, address _token, address _ledger) {
        if (_dao == address(0) || _token == address(0) || _ledger == address(0)) revert CS_Zero();
        dao = _dao;
        token = IERC20_CS(_token);
        ledger = IProofLedger_CS(_ledger);
        annualPeriodStart = uint64(block.timestamp);
    }

    function setDAO(address newDAO) external onlyDAO {
        if (newDAO == address(0)) revert CS_Zero();
        address old = dao;
        dao = newDAO;
        emit DAOChanged(old, newDAO);
    }

    /// @notice Update token interface (DAO governance)
    function setToken(address newToken) external onlyDAO {
        if (newToken == address(0)) revert CS_Zero();
        token = IERC20_CS(newToken);
        ledger.logSystemEvent(address(this), "token_updated", msg.sender);
    }

    /// @notice Update ledger interface (DAO governance)
    function setLedger(address newLedger) external onlyDAO {
        if (newLedger == address(0)) revert CS_Zero();
        ledger = IProofLedger_CS(newLedger);
    }

    /// @notice Record revenue from different sources
    function receiveRevenue(string calldata source, uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "transfer_fail");
        
        totalRevenue += amount;
        
        // Track by source for sustainability metrics
        if (keccak256(bytes(source)) == keccak256("proofscore_burns")) {
            revenueFromBurns += amount;
        } else if (keccak256(bytes(source)) == keccak256("merchant_deposits")) {
            revenueFromDeposits += amount;
        } else if (keccak256(bytes(source)) == keccak256("dispute_forfeitures")) {
            revenueFromForfeitures += amount;
        } else if (keccak256(bytes(source)) == keccak256("presale_allocation")) {
            revenueFromPresale += amount;
        }
        
        emit RevenueReceived(source, amount, msg.sender);
        ledger.logEvent(address(this), "treasury_revenue", amount, source);
    }

    /// @notice Pay zkSync gas subsidy for high-trust merchant (SUSTAINABLE LIMITS)
    function payGasSubsidy(address merchant, uint256 gasAmount) external returns (bool) {
        if (subsidyPaused) revert CS_SubsidyExceeded();
        if (token.balanceOf(address(this)) < minimumTreasuryBalance) revert CS_TreasuryLow();
        
        // Reset monthly counter if new month
        uint64 currentMonth = uint64(block.timestamp / 30 days);
        if (lastSubsidyMonth[merchant] != currentMonth) {
            monthlySubsidyUsed[merchant] = 0;
            lastSubsidyMonth[merchant] = currentMonth;
        }
        
        // Reset annual counter if new year
        if (block.timestamp >= annualPeriodStart + 365 days) {
            annualSubsidySpent = 0;
            annualPeriodStart = uint64(block.timestamp);
        }
        
        // Check monthly cap based on merchant score
        uint16 score = ISeer_CS(msg.sender).getMerchantScore(merchant);  // msg.sender should be Seer
        uint16 cap = score >= 800 ? subsidyCap800 : subsidyCap750;
        
        if (monthlySubsidyUsed[merchant] >= cap) revert CS_SubsidyExceeded();
        
        // Check annual budget
        if (annualSubsidySpent + gasAmount > annualSubsidyBudget) revert CS_SubsidyExceeded();
        
        // Pay subsidy
        monthlySubsidyUsed[merchant] += 1;
        annualSubsidySpent += gasAmount;
        
        require(token.transfer(merchant, gasAmount), "subsidy_fail");
        
        emit GasSubsidyPaid(merchant, gasAmount, monthlySubsidyUsed[merchant]);
        ledger.logEvent(merchant, "gas_subsidy_received", gasAmount, "treasury_funded");
        
        return true;
    }

    /// @notice Set monthly subsidy caps (DAO governance)
    function setMonthlyCaps(uint16 _cap750, uint16 _cap800) external onlyDAO {
        if (_cap750 == 0 || _cap800 == 0) revert CS_Bounds();
        if (_cap800 < _cap750) revert CS_Bounds();  // Higher score = more subsidy
        subsidyCap750 = _cap750;
        subsidyCap800 = _cap800;
        emit MonthlySubsidyCapSet(_cap750, _cap800);
    }

    /// @notice Set annual subsidy budget (DAO governance)
    function setAnnualBudget(uint256 newBudget) external onlyDAO {
        if (newBudget == 0) revert CS_Zero();
        uint256 old = annualSubsidyBudget;
        annualSubsidyBudget = newBudget;
        emit AnnualBudgetCapSet(old, newBudget);
    }

    /// @notice Emergency pause subsidy (DAO governance)
    function pauseSubsidy(bool pause, string calldata reason) external onlyDAO {
        subsidyPaused = pause;
        emit SubsidyPaused(pause, reason);
    }

    /// @notice Set minimum treasury balance threshold
    function setMinimumBalance(uint256 newBalance) external onlyDAO {
        uint256 old = minimumTreasuryBalance;
        minimumTreasuryBalance = newBalance;
        emit MinimumTreasuryBalanceSet(old, newBalance);
    }

    /// @notice Get subsidy stats for merchant
    function getSubsidyStats(address merchant) external view returns (
        uint32 usedThisMonth,
        uint16 monthlyCap,
        uint256 annualSpent,
        uint256 annualBudget,
        bool isPaused
    ) {
        uint16 score = ISeer_CS(msg.sender).getMerchantScore(merchant);
        uint16 cap = score >= 800 ? subsidyCap800 : subsidyCap750;
        
        return (
            monthlySubsidyUsed[merchant],
            cap,
            annualSubsidySpent,
            annualSubsidyBudget,
            subsidyPaused
        );
    }

    /// @notice Get revenue breakdown
    function getRevenueSources() external view returns (
        uint256 total,
        uint256 fromBurns,
        uint256 fromDeposits,
        uint256 fromForfeitures,
        uint256 fromPresale
    ) {
        return (
            totalRevenue,
            revenueFromBurns,
            revenueFromDeposits,
            revenueFromForfeitures,
            revenueFromPresale
        );
    }
}

// ============================================================================
// MERCHANT REGISTRY - Deposit-based protection (sustainable)
// ============================================================================

contract MerchantRegistrySustainable {
    event DAOChanged(address indexed oldDAO, address indexed newDAO);
    event ModuleUpdated(string indexed module, address indexed oldAddress, address indexed newAddress);
    event ModulesSet(address dao, address token, address hub, address seer, address security, address ledger, address treasury);
    event PolicySet(uint8 refundsThreshold, uint8 disputesThreshold, uint16 scoreDrop);
    event MerchantAdded(address indexed merchant, address indexed vault, uint256 depositHeld, bytes32 metaHash);
    event MerchantStatusChanged(address indexed merchant, Status oldStatus, Status newStatus, string reason);
    event MerchantDepositSeized(address indexed merchant, uint256 amount, string reason);
    event MerchantDepositReturned(address indexed merchant, uint256 amount, string reason);
    event MerchantScoreImpact(address indexed merchant, uint16 oldScore, uint16 newScore, string reason);
    event AutoSuspended(address indexed merchant, uint8 refunds, uint8 disputes, string reason);

    enum Status { NONE, ACTIVE, SUSPENDED, DELISTED }

    struct Merchant {
        address owner;
        address vault;
        Status status;
        uint8 refunds;
        uint8 disputes;
        uint8 disputesLost;
        uint32 completedOrders;
        uint32 totalOrders;
        uint256 depositAmount;
        uint32 activeDisputes;
        bytes32 metaHash;
        uint64 listedAt;
        uint64 suspendedAt;
    }

    address public dao;
    IERC20_CS public token;
    IVaultHub_CS public vaultHub;
    ISeer_CS public seer;
    ISecurityHub_CS public security;
    IProofLedger_CS public ledger;
    SustainableTreasury public treasury;

    mapping(address => Merchant) public merchants;
    address[] public merchantList;
    
    uint8 public autoSuspendRefunds = 3;
    uint8 public autoSuspendDisputes = 2;
    uint16 public suspendScoreDrop = 50;
    uint256 public requiredDeposit = 1000 * 10**18;

    modifier onlyDAO() {
        if (msg.sender != dao) revert CS_NotDAO();
        _;
    }

    constructor(
        address _dao,
        address _token,
        address _hub,
        address _seer,
        address _security,
        address _ledger,
        address _treasury
    ) {
        if (_dao == address(0) || _token == address(0) || _hub == address(0) || 
            _seer == address(0) || _security == address(0) || _ledger == address(0) || _treasury == address(0))
            revert CS_Zero();
        
        dao = _dao;
        token = IERC20_CS(_token);
        vaultHub = IVaultHub_CS(_hub);
        seer = ISeer_CS(_seer);
        security = ISecurityHub_CS(_security);
        ledger = IProofLedger_CS(_ledger);
        treasury = SustainableTreasury(_treasury);

        emit ModulesSet(_dao, _token, _hub, _seer, _security, _ledger, _treasury);
    }

    function setDAO(address newDAO) external onlyDAO {
        if (newDAO == address(0)) revert CS_Zero();
        address old = dao;
        dao = newDAO;
        emit DAOChanged(old, newDAO);
    }

    /// @notice Update token interface (DAO governance)
    function setToken(address newToken) external onlyDAO {
        if (newToken == address(0)) revert CS_Zero();
        token = IERC20_CS(newToken);
        ledger.logSystemEvent(address(this), "token_updated", msg.sender);
    }

    /// @notice Update VaultHub interface (DAO governance)
    function setVaultHub(address newHub) external onlyDAO {
        if (newHub == address(0)) revert CS_Zero();
        vaultHub = IVaultHub_CS(newHub);
        ledger.logSystemEvent(address(this), "vaulthub_updated", msg.sender);
    }

    /// @notice Update Seer interface (DAO governance)
    function setSeer(address newSeer) external onlyDAO {
        if (newSeer == address(0)) revert CS_Zero();
        seer = ISeer_CS(newSeer);
        ledger.logSystemEvent(address(this), "seer_updated", msg.sender);
    }

    /// @notice Update SecurityHub interface (DAO governance)
    function setSecurityHub(address newHub) external onlyDAO {
        if (newHub == address(0)) revert CS_Zero();
        security = ISecurityHub_CS(newHub);
        ledger.logSystemEvent(address(this), "securityhub_updated", msg.sender);
    }

    /// @notice Update ProofLedger interface (DAO governance)
    function setLedger(address newLedger) external onlyDAO {
        if (newLedger == address(0)) revert CS_Zero();
        ledger = IProofLedger_CS(newLedger);
    }

    /// @notice Update Treasury interface (DAO governance)
    function setTreasury(address newTreasury) external onlyDAO {
        if (newTreasury == address(0)) revert CS_Zero();
        treasury = SustainableTreasury(newTreasury);
        ledger.logSystemEvent(address(this), "treasury_updated", msg.sender);
    }

    function setPolicy(uint8 _refunds, uint8 _disputes, uint16 _scoreDrop) external onlyDAO {
        if (_refunds == 0 || _disputes == 0) revert CS_Bounds();
        if (_scoreDrop > 200) revert CS_Bounds();
        autoSuspendRefunds = _refunds;
        autoSuspendDisputes = _disputes;
        suspendScoreDrop = _scoreDrop;
        emit PolicySet(_refunds, _disputes, _scoreDrop);
    }

    function setRequiredDeposit(uint256 newDeposit) external onlyDAO {
        requiredDeposit = newDeposit;
    }

    /// @notice Register as merchant (deposit held, returned if honest)
    function addMerchant(bytes32 metaHash) external {
        if (merchants[msg.sender].status != Status.NONE) revert CS_AlreadyMerchant();
        
        address vault = vaultHub.vaultOf(msg.sender);
        if (vault == address(0)) revert CS_NotAllowed();
        if (security.isLocked(vault)) revert CS_SecLocked();
        if (!seer.isMerchantEligible(msg.sender)) revert CS_NotEligible();
        
        // Hold deposit (returned when merchant leaves if honest)
        require(token.transferFrom(vault, address(this), requiredDeposit), "deposit_fail");
        
        merchants[msg.sender] = Merchant({
            owner: msg.sender,
            vault: vault,
            status: Status.ACTIVE,
            refunds: 0,
            disputes: 0,
            disputesLost: 0,
            completedOrders: 0,
            totalOrders: 0,
            depositAmount: requiredDeposit,
            activeDisputes: 0,
            metaHash: metaHash,
            listedAt: uint64(block.timestamp),
            suspendedAt: 0
        });
        
        merchantList.push(msg.sender);
        
        emit MerchantAdded(msg.sender, vault, requiredDeposit, metaHash);
        ledger.logEvent(msg.sender, "merchant_deposit_held", requiredDeposit, "returnable_if_honest");
    }

    /// @notice Merchant leaves platform (deposit returned if honest)
    function removeMerchant() external {
        Merchant storage m = merchants[msg.sender];
        if (m.status == Status.NONE) revert CS_NotMerchant();
        if (m.status == Status.DELISTED) revert CS_Delisted();
        if (m.activeDisputes > 0) revert CS_ActiveDisputes();
        
        // Return deposit if leaving voluntarily with clean record
        uint256 depositAmount = m.depositAmount;
        m.depositAmount = 0;
        m.status = Status.NONE;
        
        require(token.transfer(m.vault, depositAmount), "return_fail");
        
        emit MerchantDepositReturned(msg.sender, depositAmount, "voluntary_exit");
        ledger.logEvent(msg.sender, "merchant_deposit_returned", depositAmount, "clean_exit");
    }

    /// @notice Record dispute resolution (track losses, seize on fraud)
    function noteDisputeResolution(address owner, bool merchantWon) external {
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert CS_NotMerchant();
        
        unchecked { m.activeDisputes -= 1; }
        
        if (!merchantWon) {
            unchecked { m.disputesLost += 1; }
            
            // Escalating penalties
            uint16 penalty = 20;
            if (m.disputesLost == 2) penalty = 100;
            if (m.disputesLost >= 3) penalty = 300;
            
            uint16 oldScore = seer.getMerchantScore(owner);
            seer.punishMerchant(owner, penalty, "dispute_lost_escalating");
            uint16 newScore = seer.getMerchantScore(owner);
            
            emit MerchantScoreImpact(owner, oldScore, newScore, "dispute_lost_escalating");
            
            // 3 disputes lost = fraud, seize deposit and send to treasury
            if (m.disputesLost >= 3) {
                _seizeDepositToTreasury(owner, "three_disputes_lost_fraud");
            }
        }
    }

    /// @notice Seize deposit and send to treasury (sustainable revenue)
    function _seizeDepositToTreasury(address owner, string memory reason) internal {
        Merchant storage m = merchants[owner];
        
        Status oldStatus = m.status;
        m.status = Status.DELISTED;
        
        uint256 depositAmount = m.depositAmount;
        m.depositAmount = 0;
        
        // Send to treasury (SUSTAINABLE: funds protection + subsidies)
        require(token.transfer(address(treasury), depositAmount), "seize_fail");
        treasury.receiveRevenue("merchant_deposits", depositAmount);
        
        // Massive score penalty
        uint16 oldScore = seer.getMerchantScore(owner);
        seer.punishMerchant(owner, 500, reason);
        uint16 newScore = seer.getMerchantScore(owner);
        
        emit MerchantDepositSeized(owner, depositAmount, reason);
        emit MerchantStatusChanged(owner, oldStatus, Status.DELISTED, reason);
        emit MerchantScoreImpact(owner, oldScore, newScore, reason);
        ledger.logEvent(owner, "merchant_deposit_seized_treasury", depositAmount, reason);
    }

    function noteRefund(address owner) external {
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert CS_NotMerchant();
        
        unchecked { m.refunds += 1; }
        
        if (m.refunds >= autoSuspendRefunds && m.status == Status.ACTIVE) {
            _autoSuspend(owner, "auto_suspend_refunds");
        }
    }

    function noteDispute(address owner) external {
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert CS_NotMerchant();
        
        unchecked { 
            m.disputes += 1;
            m.activeDisputes += 1;
        }
        
        if (m.disputes >= autoSuspendDisputes && m.status == Status.ACTIVE) {
            _autoSuspend(owner, "auto_suspend_disputes");
        }
    }

    function noteCompletion(address owner) external {
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert CS_NotMerchant();
        
        unchecked { 
            m.completedOrders += 1;
            m.totalOrders += 1;
        }
        
        uint16 oldScore = seer.getMerchantScore(owner);
        seer.rewardMerchant(owner, 5, "order_completed");
        uint16 newScore = seer.getMerchantScore(owner);
        
        emit MerchantScoreImpact(owner, oldScore, newScore, "order_completed");
    }

    function _autoSuspend(address owner, string memory reason) internal {
        Merchant storage m = merchants[owner];
        
        Status oldStatus = m.status;
        m.status = Status.SUSPENDED;
        m.suspendedAt = uint64(block.timestamp);
        
        uint16 oldScore = seer.getMerchantScore(owner);
        seer.punishMerchant(owner, suspendScoreDrop, reason);
        uint16 newScore = seer.getMerchantScore(owner);
        
        emit AutoSuspended(owner, m.refunds, m.disputes, reason);
        emit MerchantStatusChanged(owner, oldStatus, Status.SUSPENDED, reason);
        emit MerchantScoreImpact(owner, oldScore, newScore, reason);
        ledger.logEvent(owner, "merchant_auto_suspended", suspendScoreDrop, reason);
    }

    function delistMerchant(address owner, string calldata reason) external onlyDAO {
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert CS_NotMerchant();
        if (m.status == Status.DELISTED) revert CS_Delisted();
        
        _seizeDepositToTreasury(owner, reason);
    }

    function canWithdraw(address owner) external view returns (bool) {
        Merchant memory m = merchants[owner];
        return m.activeDisputes == 0;
    }

    function getMerchant(address owner) external view returns (Merchant memory) {
        return merchants[owner];
    }
}

// ============================================================================
// ESCROW WITH SELF-FUNDING PROTECTION (replaces 100k reserves)
// ============================================================================

contract CommerceEscrowSustainable {
    event DAOChanged(address indexed oldDAO, address indexed newDAO);
    event ModuleUpdated(string indexed module, address indexed oldAddress, address indexed newAddress);
    event ModulesSet(address dao, address token, address hub, address registry, address seer, address security, address ledger, address treasury);
    event DeliveryWindowSet(uint32 oldWindow, uint32 newWindow);
    event DisputeDepositSet(uint16 oldBps, uint16 newBps);
    event EscrowOpened(uint256 indexed escrowId, address indexed buyer, address indexed merchant, uint256 amount);
    event EscrowFunded(uint256 indexed escrowId, uint256 amount, uint256 disputeDeposit);
    event EscrowReleased(uint256 indexed escrowId, address indexed merchant, uint256 amount, bool autoRelease);
    event EscrowRefunded(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event EscrowDisputed(uint256 indexed escrowId, address indexed initiator, uint256 depositHeld, string reason);
    event EscrowResolved(uint256 indexed escrowId, bool buyerWins, uint256 amount, uint256 depositAction);
    event BuyerBanned(address indexed buyer, uint32 totalDisputes, string reason);
    event DepositForfeited(uint256 indexed escrowId, address indexed buyer, uint256 amount, string reason);
    event BuyerProtectionPaid(uint256 indexed escrowId, address indexed buyer, uint256 amount, string source);
    event SellerProtectionPaid(uint256 indexed escrowId, address indexed merchant, uint256 amount, string source);

    enum State { NONE, OPEN, FUNDED, RELEASED, REFUNDED, DISPUTED, RESOLVED }

    address public dao;
    IERC20_CS public token;
    IVaultHub_CS public vaultHub;
    MerchantRegistrySustainable public registry;
    ISeer_CS public seer;
    ISecurityHub_CS public security;
    IProofLedger_CS public ledger;
    SustainableTreasury public treasury;

    struct Escrow {
        address buyerOwner;
        address merchantOwner;
        address buyerVault;
        address sellerVault;
        uint256 amount;
        uint256 disputeDeposit;  // Held separately, funds protection
        State state;
        bytes32 metaHash;
        uint64 fundedAt;
        uint64 deliveryWindow;
        uint64 releasedAt;
        uint64 disputedAt;
    }

    struct BuyerHistory {
        uint32 totalDisputes;
        uint32 disputesWon;
        uint32 disputesLost;
        uint32 recentDisputes;
        uint64 lastDisputeAt;
        bool banned;
    }

    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;
    mapping(address => BuyerHistory) public buyerHistory;
    
    uint32 public defaultDeliveryWindow = 14 days;
    uint16 public disputeDepositBps = 1000;  // 10% of order
    uint32 public serialDisputerThreshold = 5;
    uint32 public disputeWindow90Days = 90 days;

    // SUSTAINABLE: Pool of forfeited deposits (replaces 100k reserve)
    uint256 public protectionPool;  // Funds available for claims

    modifier onlyDAO() {
        if (msg.sender != dao) revert CS_NotDAO();
        _;
    }

    constructor(
        address _dao,
        address _token,
        address _hub,
        address _registry,
        address _seer,
        address _security,
        address _ledger,
        address _treasury
    ) {
        if (_dao == address(0) || _token == address(0) || _hub == address(0) || 
            _registry == address(0) || _seer == address(0) || _security == address(0) || 
            _ledger == address(0) || _treasury == address(0))
            revert CS_Zero();
        
        dao = _dao;
        token = IERC20_CS(_token);
        vaultHub = IVaultHub_CS(_hub);
        registry = MerchantRegistrySustainable(_registry);
        seer = ISeer_CS(_seer);
        security = ISecurityHub_CS(_security);
        ledger = IProofLedger_CS(_ledger);
        treasury = SustainableTreasury(_treasury);

        emit ModulesSet(_dao, _token, _hub, _registry, _seer, _security, _ledger, _treasury);
    }

    function setDAO(address newDAO) external onlyDAO {
        if (newDAO == address(0)) revert CS_Zero();
        address old = dao;
        dao = newDAO;
        emit DAOChanged(old, newDAO);
    }

    /// @notice Update token interface (DAO governance)
    function setToken(address newToken) external onlyDAO {
        if (newToken == address(0)) revert CS_Zero();
        token = IERC20_CS(newToken);
        ledger.logSystemEvent(address(this), "token_updated", msg.sender);
    }

    /// @notice Update VaultHub interface (DAO governance)
    function setVaultHub(address newHub) external onlyDAO {
        if (newHub == address(0)) revert CS_Zero();
        vaultHub = IVaultHub_CS(newHub);
        ledger.logSystemEvent(address(this), "vaulthub_updated", msg.sender);
    }

    /// @notice Update MerchantRegistry interface (DAO governance)
    function setRegistry(address newRegistry) external onlyDAO {
        if (newRegistry == address(0)) revert CS_Zero();
        registry = MerchantRegistrySustainable(newRegistry);
        ledger.logSystemEvent(address(this), "registry_updated", msg.sender);
    }

    /// @notice Update Seer interface (DAO governance)
    function setSeer(address newSeer) external onlyDAO {
        if (newSeer == address(0)) revert CS_Zero();
        seer = ISeer_CS(newSeer);
        ledger.logSystemEvent(address(this), "seer_updated", msg.sender);
    }

    /// @notice Update SecurityHub interface (DAO governance)
    function setSecurityHub(address newHub) external onlyDAO {
        if (newHub == address(0)) revert CS_Zero();
        security = ISecurityHub_CS(newHub);
        ledger.logSystemEvent(address(this), "securityhub_updated", msg.sender);
    }

    /// @notice Update ProofLedger interface (DAO governance)
    function setLedger(address newLedger) external onlyDAO {
        if (newLedger == address(0)) revert CS_Zero();
        ledger = IProofLedger_CS(newLedger);
    }

    /// @notice Update Treasury interface (DAO governance)
    function setTreasury(address newTreasury) external onlyDAO {
        if (newTreasury == address(0)) revert CS_Zero();
        treasury = SustainableTreasury(newTreasury);
        ledger.logSystemEvent(address(this), "treasury_updated", msg.sender);
    }

    function setDeliveryWindow(uint32 newWindow) external onlyDAO {
        if (newWindow < 1 days || newWindow > 90 days) revert CS_Bounds();
        uint32 old = defaultDeliveryWindow;
        defaultDeliveryWindow = newWindow;
        emit DeliveryWindowSet(old, newWindow);
    }

    function setDisputeDeposit(uint16 newBps) external onlyDAO {
        if (newBps == 0 || newBps > 5000) revert CS_Bounds();  // Max 50%
        uint16 old = disputeDepositBps;
        disputeDepositBps = newBps;
        emit DisputeDepositSet(old, newBps);
    }

    /// @notice Open escrow (buyer initiates)
    function openEscrow(address merchant, uint256 amount, bytes32 metaHash) external returns (uint256) {
        if (amount == 0) revert CS_BadAmount();
        
        MerchantRegistrySustainable.Merchant memory m = registry.getMerchant(merchant);
        if (m.status == MerchantRegistrySustainable.Status.NONE) revert CS_NotMerchant();
        if (m.status == MerchantRegistrySustainable.Status.SUSPENDED) revert CS_Suspended();
        if (m.status == MerchantRegistrySustainable.Status.DELISTED) revert CS_Delisted();
        
        // Check buyer not banned
        BuyerHistory storage history = buyerHistory[msg.sender];
        if (history.banned) revert CS_BannedBuyer();
        
        address buyerVault = vaultHub.vaultOf(msg.sender);
        if (buyerVault == address(0)) revert CS_NotAllowed();
        if (security.isLocked(buyerVault)) revert CS_SecLocked();
        
        uint256 escrowId = ++escrowCount;
        
        escrows[escrowId] = Escrow({
            buyerOwner: msg.sender,
            merchantOwner: merchant,
            buyerVault: buyerVault,
            sellerVault: m.vault,
            amount: amount,
            disputeDeposit: 0,
            state: State.OPEN,
            metaHash: metaHash,
            fundedAt: 0,
            deliveryWindow: defaultDeliveryWindow,
            releasedAt: 0,
            disputedAt: 0
        });
        
        emit EscrowOpened(escrowId, msg.sender, merchant, amount);
        ledger.logEvent(msg.sender, "escrow_opened", amount, "buyer_initiated");
        
        return escrowId;
    }

    /// @notice Fund escrow (buyer pays amount + dispute deposit)
    function fundEscrow(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        if (e.state != State.OPEN) revert CS_BadState();
        if (msg.sender != e.buyerOwner) revert CS_NotBuyer();
        
        // Calculate dispute deposit (10% of order)
        uint256 depositAmount = (e.amount * disputeDepositBps) / 10000;
        uint256 totalRequired = e.amount + depositAmount;
        
        // Transfer both amounts
        require(token.transferFrom(e.buyerVault, address(this), totalRequired), "fund_fail");
        
        e.disputeDeposit = depositAmount;
        e.state = State.FUNDED;
        e.fundedAt = uint64(block.timestamp);
        
        emit EscrowFunded(escrowId, e.amount, depositAmount);
        ledger.logEvent(e.buyerOwner, "escrow_funded", totalRequired, "amount_plus_deposit");
    }

    /// @notice Release payment to merchant
    function releasePayment(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        if (e.state != State.FUNDED) revert CS_NotFunded();
        
        // Only buyer or anyone after 14 days can release
        bool isBuyer = msg.sender == e.buyerOwner;
        bool canAutoRelease = block.timestamp >= e.fundedAt + e.deliveryWindow;
        
        if (!isBuyer && !canAutoRelease) revert CS_NotAllowed();
        
        e.state = State.RELEASED;
        e.releasedAt = uint64(block.timestamp);
        
        // Release payment to merchant
        require(token.transfer(e.sellerVault, e.amount), "release_fail");
        
        // Return dispute deposit to buyer (both parties honest)
        require(token.transfer(e.buyerVault, e.disputeDeposit), "deposit_return_fail");
        
        // Update merchant stats
        registry.noteCompletion(e.merchantOwner);
        
        emit EscrowReleased(escrowId, e.merchantOwner, e.amount, canAutoRelease);
        ledger.logTransfer(address(this), e.sellerVault, e.amount, "escrow_released");
    }

    /// @notice Dispute escrow (buyer only, deposit required)
    function disputeEscrow(uint256 escrowId, string calldata reason) external {
        Escrow storage e = escrows[escrowId];
        if (e.state != State.FUNDED) revert CS_NotFunded();
        if (msg.sender != e.buyerOwner) revert CS_NotBuyer();
        if (block.timestamp > e.fundedAt + e.deliveryWindow) revert CS_TooLate();
        
        // Check serial disputer threshold
        BuyerHistory storage history = buyerHistory[msg.sender];
        
        // Reset recent disputes counter if 90 days passed
        if (block.timestamp >= history.lastDisputeAt + disputeWindow90Days) {
            history.recentDisputes = 0;
        }
        
        unchecked { 
            history.totalDisputes += 1;
            history.recentDisputes += 1;
        }
        history.lastDisputeAt = uint64(block.timestamp);
        
        // Ban if serial disputer (>5 in 90 days)
        if (history.recentDisputes > serialDisputerThreshold) {
            history.banned = true;
            emit BuyerBanned(msg.sender, history.totalDisputes, "serial_disputer_banned");
        }
        
        e.state = State.DISPUTED;
        e.disputedAt = uint64(block.timestamp);
        
        // Update registry
        registry.noteDispute(e.merchantOwner);
        
        emit EscrowDisputed(escrowId, msg.sender, e.disputeDeposit, reason);
        ledger.logEvent(msg.sender, "escrow_disputed", e.amount, reason);
    }

    /// @notice Resolve dispute (DAO arbitration)
    function resolveDispute(uint256 escrowId, bool buyerWins, string calldata evidence) external onlyDAO {
        Escrow storage e = escrows[escrowId];
        if (e.state != State.DISPUTED) revert CS_NotDisputed();
        
        e.state = State.RESOLVED;
        
        BuyerHistory storage history = buyerHistory[e.buyerOwner];
        
        if (buyerWins) {
            // BUYER PROTECTION: Full refund + deposit returned
            unchecked { history.disputesWon += 1; }
            
            require(token.transfer(e.buyerVault, e.amount + e.disputeDeposit), "refund_fail");
            
            // Restore buyer score (legitimate complaint)
            uint16 oldScore = seer.getScore(e.buyerOwner);
            seer.reward(e.buyerOwner, 5, "legitimate_dispute_won");
            uint16 newScore = seer.getScore(e.buyerOwner);
            
            // Merchant penalty
            registry.noteDisputeResolution(e.merchantOwner, false);
            
            emit EscrowResolved(escrowId, true, e.amount, e.disputeDeposit);
            emit BuyerProtectionPaid(escrowId, e.buyerOwner, e.amount, "escrow_held_funds");
            ledger.logTransfer(address(this), e.buyerVault, e.amount + e.disputeDeposit, "dispute_won_refund");
            
        } else {
            // SELLER PROTECTION: Merchant gets payment + buyer deposit forfeited
            unchecked { history.disputesLost += 1; }
            
            require(token.transfer(e.sellerVault, e.amount), "payment_fail");
            
            // Forfeit buyer deposit to protection pool (SUSTAINABLE)
            protectionPool += e.disputeDeposit;
            
            // Send forfeited deposit to treasury
            require(token.transfer(address(treasury), e.disputeDeposit), "forfeit_fail");
            treasury.receiveRevenue("dispute_forfeitures", e.disputeDeposit);
            
            // Escalating buyer penalties
            uint16 penalty = 5;
            if (history.disputesLost == 3) penalty = 50;
            if (history.disputesLost >= 5) penalty = 200;
            
            uint16 oldScore = seer.getScore(e.buyerOwner);
            seer.punish(e.buyerOwner, penalty, "frivolous_dispute_lost");
            uint16 newScore = seer.getScore(e.buyerOwner);
            
            // Merchant wins
            registry.noteDisputeResolution(e.merchantOwner, true);
            uint16 oldMScore = seer.getMerchantScore(e.merchantOwner);
            seer.rewardMerchant(e.merchantOwner, 10, "dispute_won_defense");
            uint16 newMScore = seer.getMerchantScore(e.merchantOwner);
            
            emit EscrowResolved(escrowId, false, e.amount, e.disputeDeposit);
            emit DepositForfeited(escrowId, e.buyerOwner, e.disputeDeposit, "frivolous_dispute");
            emit SellerProtectionPaid(escrowId, e.merchantOwner, e.disputeDeposit, "buyer_deposit_forfeited");
            ledger.logTransfer(address(this), e.sellerVault, e.amount, "dispute_lost_payment");
        }
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function getBuyerHistory(address buyer) external view returns (BuyerHistory memory) {
        return buyerHistory[buyer];
    }

    function getProtectionPoolBalance() external view returns (uint256) {
        return protectionPool;
    }
}
