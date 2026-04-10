// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * VFIDETermLoan — Trust-Based Peer-to-Peer Lending
 * ────────────────────────────────────────────────────────
 *
 * No token collateral. Your ProofScore IS your collateral.
 * Your guardians co-sign. Your reputation enforces repayment.
 * If life happens and you can't pay, you can restructure.
 * The system acknowledges that keeping a promise is harder
 * than making one — and gives you a path to make it right.
 *
 * TRUST MODEL:
 *   ProofScore determines how much you can borrow.
 *   Guardians co-sign and share accountability.
 *   Default destroys your score — but a payment plan
 *   shows good faith and reduces the penalty.
 *
 * PUNISHMENT TIERS (graduated — effort is recognized):
 *   On-time repayment:        Borrower +0.5, Lender +0.2
 *   Late repayment (grace):   Borrower -1.5
 *   Payment plan completed:   Borrower -3.0 (good faith — you made it right)
 *   Payment plan failed:      Borrower -15.0, Guarantors -5.0 each
 *   Full default (no effort): Borrower -20.0, Guarantors -10.0 each
 *
 *   NOTE: Seer operator limits cap single calls at -10.0 and daily at
 *   -20.0 per operator. Full default uses two punishment calls to hit
 *   -20.0 in one transaction. The DAO can increase Seer operator limits
 *   via setOperatorLimits() if higher penalties are needed.
 *
 * BORROWER PROTECTIONS:
 *   - Interest capped at 12%
 *   - Duration 1-30 days
 *   - Early repayment always free
 *   - 3-day grace period
 *   - Payment plan option after default
 *   - Graduated punishment (effort is recognized)
 *
 * LENDER PROTECTIONS:
 *   - Loan size capped by borrower's ProofScore
 *   - Guarantors co-sign AND pre-approve financial liability
 *   - On default: guarantors are slowly extracted (10% per week)
 *   - Revenue assignment option (future payments auto-deduct)
 *   - Default penalty makes repeat default economically painful
 *   - Borrower can repay even after default (stops extraction)
 *   - Can cancel unfunded offers
 *
 * HOWEY ANALYSIS:
 *   ✅ All 4 prongs FAIL — bilateral P2P lending, no pooling,
 *      lender makes active individual decisions, no protocol yield.
 *   NOT A SECURITY.
 */

// ── Interfaces ──────────────────────────────────────────────────────────────

interface ISeerTL {
    function getScore(address subject) external view returns (uint16);
    function reward(address subject, uint16 delta, string calldata reason) external;
    function punish(address subject, uint16 delta, string calldata reason) external;
}

interface IVaultHubTL {
    function vaultOf(address owner) external view returns (address);
}

interface ICardBoundVaultTL {
    function isGuardian(address g) external view returns (bool);
    function guardianCount() external view returns (uint8);
}

// ── Errors ──────────────────────────────────────────────────────────────────

error TL_NotDAO();
error TL_Zero();
error TL_InvalidTerms();
error TL_NotLender();
error TL_NotBorrower();
error TL_NotGuarantor();
error TL_WrongState();
error TL_ScoreTooLow();
error TL_ExceedsLimit();
error TL_GraceNotExpired();
error TL_Paused();
error TL_SelfLoan();
error TL_LoanCap();
error TL_AlreadySigned();
error TL_NeedGuarantors();
error TL_PlanNotAccepted();
error TL_PlanExists();
error TL_NothingDue();
error TL_DebtOutstanding();

// ── Contract ────────────────────────────────────────────────────────────────

contract VFIDETermLoan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════

    uint256 public constant MAX_INTEREST_BPS = 1200;   // 12% cap
    uint64  public constant MAX_DURATION = 30 days;
    uint64  public constant MIN_DURATION = 1 days;
    uint64  public constant GRACE_PERIOD = 3 days;
    uint256 public constant PROTOCOL_CUT_PCT = 10;     // 10% of interest → community
    uint256 public constant MAX_ACTIVE_LOANS = 10;
    uint8   public constant REQUIRED_GUARANTORS = 1;   // At least 1 guardian must co-sign
    uint64  public constant MAX_PLAN_DURATION = 90 days;
    uint8   public constant MAX_PLAN_INSTALLMENTS = 12;

    // Guarantor financial liability
    uint256 public constant GUARANTOR_LIABILITY_PCT = 100; // Guarantors collectively cover 100% of principal
    uint64  public constant EXTRACTION_INTERVAL = 7 days;  // Weekly extractions after default
    uint256 public constant EXTRACTION_RATE_PCT = 10;      // 10% of their liability per extraction

    // ProofScore thresholds → max loan amount (in token units, 18 decimals)
    // DAO can adjust these via setScoreTiers()
    uint16 public constant TIER_1_SCORE = 5000;  // Neutral
    uint16 public constant TIER_2_SCORE = 6000;
    uint16 public constant TIER_3_SCORE = 7000;
    uint16 public constant TIER_4_SCORE = 8000;  // Highly trusted

    // Graduated ProofScore adjustments
    uint16 public constant REWARD_ONTIME_BORROWER = 5;      // +0.5
    uint16 public constant REWARD_ONTIME_LENDER = 2;        // +0.2
    uint16 public constant PENALTY_LATE = 15;                // -1.5
    uint16 public constant PENALTY_PLAN_COMPLETED = 30;      // -3.0 (good faith acknowledged)
    uint16 public constant PENALTY_PLAN_FAILED_1 = 100;      // -10.0 (first hit)
    uint16 public constant PENALTY_PLAN_FAILED_2 = 50;       // -5.0  (second hit, same tx = -15.0 total)
    uint16 public constant PENALTY_PLAN_FAILED_GUARANTOR = 50; // -5.0 per guarantor
    uint16 public constant PENALTY_FULL_DEFAULT_1 = 100;     // -10.0 (first hit)
    uint16 public constant PENALTY_FULL_DEFAULT_2 = 100;     // -10.0 (second hit, same tx = -20.0 total)
    uint16 public constant PENALTY_DEFAULT_GUARANTOR = 100;  // -10.0 per guarantor

    // ═══════════════════════════════════════════════════════════════════════
    //                              TYPES
    // ═══════════════════════════════════════════════════════════════════════

    enum LoanState {
        OPEN,           // Offer created, waiting for borrower
        COSIGNING,      // Borrower accepted, waiting for guarantor signatures
        ACTIVE,         // Fully signed, principal disbursed
        GRACE,          // Past deadline, in grace period
        RESTRUCTURED,   // Payment plan agreed
        REPAID,         // Successfully repaid (any path)
        DEFAULTED,      // Full default — no effort to repay
        CANCELLED       // Lender cancelled before acceptance
    }

    struct Loan {
        address lender;
        address borrower;
        uint256 principal;
        uint256 interestBps;
        uint64  duration;
        uint64  startTime;
        uint64  deadline;
        uint256 amountRepaid;      // Tracks partial repayments
        bool    revenueAssignment; // Borrower authorized auto-deduction
        LoanState state;
    }

    struct PaymentPlan {
        uint256 totalOwed;          // Remaining debt when plan was created
        uint256 installmentAmount;  // Per-installment payment
        uint8   totalInstallments;
        uint8   paidInstallments;
        uint64  intervalDays;       // Days between installments
        uint64  nextDue;            // Next installment deadline
        bool    accepted;           // Lender accepted the plan
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════

    IERC20 public immutable vfideToken;
    address public dao;
    address public fraudRegistry;
    ISeerTL public seer;
    IVaultHubTL public vaultHub;
    address public feeDistributor;
    bool public paused;

    mapping(uint256 => Loan) public loans;
    mapping(uint256 => PaymentPlan) public plans;
    mapping(uint256 => address[]) public guarantors;          // Loan → guarantor addresses
    mapping(uint256 => mapping(address => bool)) public hasSigned; // Loan → guarantor → signed
    mapping(uint256 => mapping(address => address)) public guarantorVault; // Loan → guarantor → approval source
    mapping(uint256 => uint8) public signatureCount;          // Loan → number of guarantor signatures
    mapping(uint256 => uint256) public guarantorLiabilityEach; // Loan → liability per guarantor
    mapping(uint256 => mapping(address => uint256)) public guarantorExtracted; // How much pulled from each
    mapping(uint256 => uint64) public lastExtractionTime;     // When last extraction happened
    mapping(uint256 => uint256) public totalExtracted;        // Total extracted across all guarantors
    uint256 public nextLoanId = 1;

    mapping(address => uint256) public activeLoanCount;
    mapping(address => uint256) public unresolvedDefaults;

    // ProofScore → max loan tiers (configurable by DAO)
    uint256 public tier1Limit = 100e18;     // Score 5000+: 100 VFIDE
    uint256 public tier2Limit = 1_000e18;   // Score 6000+: 1,000 VFIDE
    uint256 public tier3Limit = 5_000e18;   // Score 7000+: 5,000 VFIDE
    uint256 public tier4Limit = 20_000e18;  // Score 8000+: 20,000 VFIDE

    uint256 public totalLoans;
    uint256 public totalVolume;
    uint256 public totalDefaults;
    uint256 public totalRestructured;
    uint256 public totalProtocolFees;

    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event LoanCreated(uint256 indexed id, address indexed lender, uint256 principal, uint256 interestBps, uint64 duration);
    event LoanAccepted(uint256 indexed id, address indexed borrower, uint256 maxBorrowable);
    event GuarantorSigned(uint256 indexed id, address indexed guarantor, uint8 totalSigs);
    event LoanActivated(uint256 indexed id, uint64 deadline);
    event LoanRepaid(uint256 indexed id, uint256 totalPaid, bool late);
    event PaymentPlanProposed(uint256 indexed id, uint8 installments, uint64 intervalDays);
    event PaymentPlanAccepted(uint256 indexed id);
    event InstallmentPaid(uint256 indexed id, uint8 installmentNumber, uint256 amount);
    event PaymentPlanCompleted(uint256 indexed id);
    event LoanDefaulted(uint256 indexed id, bool planFailed);
    event GuarantorExtracted(uint256 indexed id, address indexed guarantor, uint256 amount, uint256 totalFromGuarantor);
    event GuarantorRelieved(uint256 indexed id, address indexed guarantor, uint256 remainingLiability);
    event LoanCancelled(uint256 indexed id);
    event RevenueAssignmentSet(uint256 indexed id, bool enabled);
    event TiersUpdated(uint256 t1, uint256 t2, uint256 t3, uint256 t4);

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

    modifier onlyDAO() { if (msg.sender != dao) revert TL_NotDAO(); _; }
    modifier whenNotPaused() { if (paused) revert TL_Paused(); _; }

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    constructor(address _token, address _dao, address _seer, address _vaultHub, address _feeDist) {
        if (_token == address(0) || _dao == address(0)) revert TL_Zero();
        vfideToken = IERC20(_token);
        dao = _dao;
        if (_seer != address(0)) seer = ISeerTL(_seer);
        if (_vaultHub != address(0)) vaultHub = IVaultHubTL(_vaultHub);
        feeDistributor = _feeDist;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          1. LENDER CREATES OFFER
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Create a loan offer and deposit principal
    function createLoan(uint256 principal, uint256 interestBps, uint64 duration)
        external nonReentrant whenNotPaused returns (uint256 id)
    {
        if (principal == 0) revert TL_Zero();
        if (interestBps > MAX_INTEREST_BPS) revert TL_InvalidTerms();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert TL_InvalidTerms();
        if (activeLoanCount[msg.sender] >= MAX_ACTIVE_LOANS) revert TL_LoanCap();

        id = nextLoanId++;
        loans[id] = Loan({
            lender: msg.sender, borrower: address(0),
            principal: principal, interestBps: interestBps,
            duration: duration, startTime: 0, deadline: 0,
            amountRepaid: 0, revenueAssignment: false,
            state: LoanState.OPEN
        });
        activeLoanCount[msg.sender]++;

        vfideToken.safeTransferFrom(msg.sender, address(this), principal);
        emit LoanCreated(id, msg.sender, principal, interestBps, duration);
    }

    /// @notice Cancel open offer (before borrower accepts)
    function cancelLoan(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.lender != msg.sender) revert TL_NotLender();
        if (l.state != LoanState.OPEN) revert TL_WrongState();
        l.state = LoanState.CANCELLED;
        activeLoanCount[msg.sender]--;
        vfideToken.safeTransfer(msg.sender, l.principal);
        emit LoanCancelled(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                      2. BORROWER ACCEPTS + GUARANTORS SIGN
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Accept a loan offer. ProofScore checked. Needs guarantor co-sign after.
    function acceptLoan(uint256 id) external nonReentrant whenNotPaused {
        if (fraudRegistry != address(0)) { (bool ok, bytes memory d) = fraudRegistry.staticcall(abi.encodeWithSelector(0x38603ddd, msg.sender)); if (ok && d.length >= 32 && abi.decode(d, (bool))) revert TL_Paused(); }
        Loan storage l = loans[id];
        if (l.state != LoanState.OPEN) revert TL_WrongState();
        if (msg.sender == l.lender) revert TL_SelfLoan();
        if (activeLoanCount[msg.sender] >= MAX_ACTIVE_LOANS) revert TL_LoanCap();
        if (unresolvedDefaults[msg.sender] > 0) revert TL_DebtOutstanding();

        // ProofScore check: can borrower handle this amount?
        uint256 limit = _maxBorrowable(msg.sender);
        if (l.principal > limit) revert TL_ExceedsLimit();

        l.borrower = msg.sender;
        l.state = LoanState.COSIGNING;
        activeLoanCount[msg.sender]++;

        emit LoanAccepted(id, msg.sender, limit);
    }

    /// @notice Guarantor co-signs the loan (must be borrower's vault guardian)
    /// @dev Guarantor must first approve this contract for their liability share.
    ///      This is explicit consent: "I vouch for this person AND I'm willing
    ///      to pay if they don't." Real co-signing with real consequences.
    function signAsGuarantor(uint256 id) external {
        Loan storage l = loans[id];
        if (l.state != LoanState.COSIGNING) revert TL_WrongState();
        if (hasSigned[id][msg.sender]) revert TL_AlreadySigned();
        if (unresolvedDefaults[msg.sender] > 0) revert TL_DebtOutstanding();

        // Verify caller is a guardian of borrower's vault
        if (address(vaultHub) != address(0)) {
            address vault = vaultHub.vaultOf(l.borrower);
            if (vault != address(0)) {
                ICardBoundVaultTL cbv = ICardBoundVaultTL(vault);
                if (!cbv.isGuardian(msg.sender)) revert TL_NotGuarantor();
            }
        }

        // Guarantor's own score must be reasonable
        if (address(seer) != address(0)) {
            uint16 gScore = seer.getScore(msg.sender);
            if (gScore == 0) gScore = 5000;
            if (gScore < TIER_1_SCORE) revert TL_ScoreTooLow();
        }

        // Calculate this guarantor's financial liability
        uint256 liabilityPerGuarantor = (l.principal * GUARANTOR_LIABILITY_PCT) / 100;

        // Real deployments keep guarantor funds inside their vault when available.
        // If the vault system is not present, fall back to wallet-level approval.
        address approvalSource = msg.sender;
        if (address(vaultHub) != address(0)) {
            address signerVault = vaultHub.vaultOf(msg.sender);
            if (signerVault != address(0)) {
                approvalSource = signerVault;
            }
        }

        uint256 approved = vfideToken.allowance(approvalSource, address(this));
        require(approved >= liabilityPerGuarantor, "TL: guarantor must approve liability first");

        hasSigned[id][msg.sender] = true;
        guarantors[id].push(msg.sender);
        guarantorVault[id][msg.sender] = approvalSource;
        signatureCount[id]++;

        // Recalculate per-guarantor liability (split evenly)
        guarantorLiabilityEach[id] = (l.principal * GUARANTOR_LIABILITY_PCT) / (100 * uint256(signatureCount[id]));

        emit GuarantorSigned(id, msg.sender, signatureCount[id]);

        // If enough signatures, activate the loan
        if (signatureCount[id] >= REQUIRED_GUARANTORS) {
            _activateLoan(id);
        }
    }

    function _activateLoan(uint256 id) internal {
        Loan storage l = loans[id];
        l.startTime = uint64(block.timestamp);
        l.deadline = uint64(block.timestamp) + l.duration;
        l.state = LoanState.ACTIVE;

        // Send principal to borrower
        vfideToken.safeTransfer(l.borrower, l.principal);
        emit LoanActivated(id, l.deadline);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          3. REPAYMENT (HAPPY PATH)
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Repay the loan — full principal + interest
    function repay(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.borrower != msg.sender) revert TL_NotBorrower();
        if (l.state != LoanState.ACTIVE && l.state != LoanState.GRACE) revert TL_WrongState();

        bool isLate = block.timestamp > l.deadline;

        // If past deadline, must be in grace period
        if (isLate && l.state == LoanState.ACTIVE) {
            if (block.timestamp > l.deadline + GRACE_PERIOD) revert TL_WrongState();
            l.state = LoanState.GRACE;
        }

        uint256 interest = (l.principal * l.interestBps) / 10000;
        uint256 totalOwed = l.principal + interest - l.amountRepaid;
        uint256 protocolFee = (interest * PROTOCOL_CUT_PCT) / 100;
        uint256 lenderReceives = totalOwed - protocolFee;

        l.amountRepaid = l.principal + interest;
        l.state = LoanState.REPAID;
        _closeLoan(l);

        vfideToken.safeTransferFrom(msg.sender, address(this), totalOwed);
        vfideToken.safeTransfer(l.lender, lenderReceives);
        if (protocolFee > 0 && feeDistributor != address(0)) {
            vfideToken.safeTransfer(feeDistributor, protocolFee);
        }
        totalProtocolFees += protocolFee;
        totalLoans++;
        totalVolume += l.principal;

        // ProofScore
        if (address(seer) != address(0)) {
            if (isLate) {
                try seer.punish(l.borrower, PENALTY_LATE, "loan_late_repay") {} catch {}
            } else {
                try seer.reward(l.borrower, REWARD_ONTIME_BORROWER, "loan_repaid") {} catch {}
            }
            try seer.reward(l.lender, REWARD_ONTIME_LENDER, "loan_facilitated") {} catch {}
        }

        emit LoanRepaid(id, l.amountRepaid, isLate);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                      4. PAYMENT PLAN (LIFE HAPPENS)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Propose a payment plan after missing the deadline
     * @param id Loan ID
     * @param installments Number of payments (2-12)
     * @param intervalDays Days between payments (7-30)
     *
     * "I can't pay the full amount right now, but I can pay it back
     *  in 4 installments over 2 months." This is good faith. The
     *  protocol recognizes the difference between can't-pay and won't-pay.
     */
    function proposePaymentPlan(uint256 id, uint8 installments, uint64 intervalDays)
        external
    {
        Loan storage l = loans[id];
        if (l.borrower != msg.sender) revert TL_NotBorrower();
        // Can propose during GRACE or if lender hasn't claimed default yet
        if (l.state != LoanState.GRACE && l.state != LoanState.ACTIVE) revert TL_WrongState();
        if (block.timestamp <= l.deadline) revert TL_WrongState(); // Not overdue yet
        if (plans[id].totalOwed > 0) revert TL_PlanExists();
        if (installments < 2 || installments > MAX_PLAN_INSTALLMENTS) revert TL_InvalidTerms();
        if (intervalDays < 7 || intervalDays > 30) revert TL_InvalidTerms();

        uint256 interest = (l.principal * l.interestBps) / 10000;
        uint256 remaining = l.principal + interest - l.amountRepaid;
        uint256 perInstallment = (remaining + installments - 1) / installments; // Round up

        // Validate total plan duration doesn't exceed cap
        uint64 totalPlanDuration = uint64(installments) * intervalDays * 1 days;
        if (totalPlanDuration > MAX_PLAN_DURATION) revert TL_InvalidTerms();

        plans[id] = PaymentPlan({
            totalOwed: remaining,
            installmentAmount: perInstallment,
            totalInstallments: installments,
            paidInstallments: 0,
            intervalDays: intervalDays,
            nextDue: uint64(block.timestamp) + (intervalDays * 1 days),
            accepted: false
        });

        l.state = LoanState.GRACE; // Keep in grace until lender accepts

        emit PaymentPlanProposed(id, installments, intervalDays);
    }

    /// @notice Lender accepts the borrower's payment plan
    function acceptPaymentPlan(uint256 id) external {
        Loan storage l = loans[id];
        if (l.lender != msg.sender) revert TL_NotLender();
        if (plans[id].totalOwed == 0) revert TL_WrongState();
        if (plans[id].accepted) revert TL_WrongState();

        plans[id].accepted = true;
        l.state = LoanState.RESTRUCTURED;
        totalRestructured++;

        emit PaymentPlanAccepted(id);
    }

    /// @notice Make an installment payment on a restructured loan
    function payInstallment(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.borrower != msg.sender) revert TL_NotBorrower();
        if (l.state != LoanState.RESTRUCTURED) revert TL_WrongState();

        PaymentPlan storage p = plans[id];
        if (!p.accepted) revert TL_PlanNotAccepted();
        if (p.paidInstallments >= p.totalInstallments) revert TL_NothingDue();

        uint256 amount = p.installmentAmount;
        // Last installment covers remainder (rounding)
        if (p.paidInstallments == p.totalInstallments - 1) {
            amount = p.totalOwed - (p.installmentAmount * p.paidInstallments);
        }

        uint256 protocolFee = (amount * PROTOCOL_CUT_PCT) / 100;
        uint256 lenderReceives = amount - protocolFee;

        p.paidInstallments++;
        p.nextDue = uint64(block.timestamp) + (p.intervalDays * 1 days);
        l.amountRepaid += amount;

        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
        vfideToken.safeTransfer(l.lender, lenderReceives);
        if (protocolFee > 0 && feeDistributor != address(0)) {
            vfideToken.safeTransfer(feeDistributor, protocolFee);
        }
        totalProtocolFees += protocolFee;

        emit InstallmentPaid(id, p.paidInstallments, amount);

        // Plan completed — reduced penalty (good faith recognized)
        if (p.paidInstallments >= p.totalInstallments) {
            l.state = LoanState.REPAID;
            _closeLoan(l);
            totalLoans++;
            totalVolume += l.principal;

            if (address(seer) != address(0)) {
                // Moderate penalty — they missed the original deadline but made it right
                try seer.punish(l.borrower, PENALTY_PLAN_COMPLETED, "loan_plan_completed") {} catch {}
                try seer.reward(l.lender, REWARD_ONTIME_LENDER, "loan_plan_facilitated") {} catch {}
            }
            emit PaymentPlanCompleted(id);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          5. DEFAULT (LAST RESORT)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Claim default — lender invokes when borrower won't repay
     * @param id Loan ID
     *
     * Can only be called:
     *   - After deadline + grace period (no payment plan proposed)
     *   - OR after a payment plan installment is 7+ days overdue
     *
     * Consequences:
     *   - Borrower: ProofScore punishment (-5.0 full default or -3.5 plan failure)
     *   - Guarantors: ProofScore punishment (-2.0 full default or -1.0 plan failure)
     *   - Lender: loses the principal (the risk of trust-based lending)
     *   - The loan is closed. The debt becomes a reputation scar.
     */
    function claimDefault(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.lender != msg.sender) revert TL_NotLender();

        bool planFailed = false;

        if (l.state == LoanState.RESTRUCTURED) {
            // Plan exists — check if installment is overdue
            PaymentPlan storage p = plans[id];
            if (p.accepted && p.paidInstallments < p.totalInstallments) {
                // Must be 7+ days past the installment due date
                if (block.timestamp <= p.nextDue + 7 days) revert TL_GraceNotExpired();
                planFailed = true;
            } else {
                revert TL_WrongState();
            }
        } else if (l.state == LoanState.ACTIVE || l.state == LoanState.GRACE) {
            // No plan — standard default after deadline + grace
            if (block.timestamp <= l.deadline + GRACE_PERIOD) revert TL_GraceNotExpired();
        } else {
            revert TL_WrongState();
        }

        l.state = LoanState.DEFAULTED;
        _closeLoan(l);
        totalDefaults++;

        unresolvedDefaults[l.borrower]++;
        address[] storage blockedGuarantors = guarantors[id];
        for (uint256 i = 0; i < blockedGuarantors.length; i++) {
            unresolvedDefaults[blockedGuarantors[i]]++;
        }

        // Return any partial repayments to lender
        if (l.amountRepaid > 0) {
            // amountRepaid was already transferred during installments
            // Nothing additional to transfer here
        }

        // ProofScore consequences — graduated, severe for zero-effort default
        if (address(seer) != address(0)) {
            if (planFailed) {
                // They tried, then stopped. Significant but not maximum.
                // Two hits: -10.0 + -5.0 = -15.0 total
                try seer.punish(l.borrower, PENALTY_PLAN_FAILED_1, "loan_plan_failed") {} catch {}
                try seer.punish(l.borrower, PENALTY_PLAN_FAILED_2, "loan_plan_abandoned") {} catch {}
                address[] storage g = guarantors[id];
                for (uint256 i = 0; i < g.length; i++) {
                    try seer.punish(g[i], PENALTY_PLAN_FAILED_GUARANTOR, "guarantor_plan_failed") {} catch {}
                }
            } else {
                // Zero effort. Took money and disappeared. Maximum punishment.
                // Two hits at max single limit: -10.0 + -10.0 = -20.0 total
                // A score 7,000 user drops to 5,000 (neutral). Years of trust erased.
                // A score 8,000 user drops to 6,000. Fees quadruple.
                try seer.punish(l.borrower, PENALTY_FULL_DEFAULT_1, "loan_default") {} catch {}
                try seer.punish(l.borrower, PENALTY_FULL_DEFAULT_2, "loan_default_no_effort") {} catch {}
                // Guarantors: you vouched for this person. -10.0 each.
                address[] storage g2 = guarantors[id];
                for (uint256 i = 0; i < g2.length; i++) {
                    try seer.punish(g2[i], PENALTY_DEFAULT_GUARANTOR, "guarantor_default") {} catch {}
                }
            }
        }

        emit LoanDefaulted(id, planFailed);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                   5b. GUARANTOR EXTRACTION (AFTER DEFAULT)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Extract payment from a guarantor after default
     * @param id Loan ID (must be in DEFAULTED state)
     *
     * Can only be called once per EXTRACTION_INTERVAL (7 days).
     * Extracts EXTRACTION_RATE_PCT (10%) of each guarantor's liability per call.
     * Lender calls this periodically. Guarantor's pre-approved allowance is used.
     *
     * This creates slow pressure: the guarantor has a week between extractions
     * to find the borrower and make them pay. If the borrower shows up and
     * repays via repayDefaultedLoan(), extraction stops immediately.
     */
    function extractFromGuarantors(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.lender != msg.sender) revert TL_NotLender();
        if (l.state != LoanState.DEFAULTED) revert TL_WrongState();

        // Enforce extraction interval
        if (lastExtractionTime[id] != 0 &&
            block.timestamp < lastExtractionTime[id] + EXTRACTION_INTERVAL) {
            revert TL_GraceNotExpired();
        }
        lastExtractionTime[id] = uint64(block.timestamp);

        uint256 liabilityPer = guarantorLiabilityEach[id];
        address[] storage g = guarantors[id];
        uint256 totalThisRound = 0;

        for (uint256 i = 0; i < g.length; i++) {
            uint256 alreadyTaken = guarantorExtracted[id][g[i]];
            if (alreadyTaken >= liabilityPer) continue; // Already fully extracted

            // 10% of their total liability per round
            uint256 extractAmount = (liabilityPer * EXTRACTION_RATE_PCT) / 100;
            uint256 remaining = liabilityPer - alreadyTaken;
            if (extractAmount > remaining) extractAmount = remaining;

            // Try to pull from the guarantor's chosen approval source (vault first, wallet fallback)
            address source = guarantorVault[id][g[i]];
            if (source == address(0)) source = g[i];
            try vfideToken.transferFrom(source, l.lender, extractAmount) {
                guarantorExtracted[id][g[i]] += extractAmount;
                totalThisRound += extractAmount;
                emit GuarantorExtracted(id, g[i], extractAmount, guarantorExtracted[id][g[i]]);
            } catch {
                // Guarantor doesn't have funds or revoked approval
                // Score penalty still applies — they can't escape accountability
            }
        }

        totalExtracted[id] += totalThisRound;
    }

    /**
     * @notice Borrower repays a defaulted loan — stops guarantor extraction
     * @param id Loan ID (must be in DEFAULTED state)
     *
     * The borrower can show up late and pay what they owe.
     * This immediately stops all future guarantor extractions.
     * The borrower pays: original debt minus what guarantors already covered.
     * Score penalty is reduced from -20.0 to -10.0 (still significant,
     * but acknowledges they eventually did the right thing).
     */
    function repayDefaultedLoan(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.borrower != msg.sender) revert TL_NotBorrower();
        if (l.state != LoanState.DEFAULTED) revert TL_WrongState();

        uint256 interest = (l.principal * l.interestBps) / 10000;
        uint256 totalDebt = l.principal + interest;
        uint256 alreadyCovered = totalExtracted[id] + l.amountRepaid;
        uint256 remaining = totalDebt > alreadyCovered ? totalDebt - alreadyCovered : 0;

        if (remaining > 0) {
            uint256 protocolFee = (remaining * PROTOCOL_CUT_PCT) / 100;
            uint256 lenderGets = remaining - protocolFee;

            vfideToken.safeTransferFrom(msg.sender, address(this), remaining);
            vfideToken.safeTransfer(l.lender, lenderGets);
            if (protocolFee > 0 && feeDistributor != address(0)) {
                vfideToken.safeTransfer(feeDistributor, protocolFee);
            }
            l.amountRepaid += remaining;
        }

        // Mark as repaid — stops all future guarantor extractions
        l.state = LoanState.REPAID;

        if (unresolvedDefaults[l.borrower] > 0) {
            unresolvedDefaults[l.borrower]--;
        }
        address[] storage clearedGuarantors = guarantors[id];
        for (uint256 i = 0; i < clearedGuarantors.length; i++) {
            if (unresolvedDefaults[clearedGuarantors[i]] > 0) {
                unresolvedDefaults[clearedGuarantors[i]]--;
            }
        }

        // Reduced penalty: they came back and paid. Not forgiven, but recognized.
        if (address(seer) != address(0)) {
            // Net effect: they already got -20.0 from default.
            // Reward +10.0 back for making it right. Net: -10.0
            try seer.reward(l.borrower, 100, "default_repaid_late") {} catch {}
            // Relieve guarantors — give back some score
            address[] storage g = guarantors[id];
            for (uint256 i = 0; i < g.length; i++) {
                try seer.reward(g[i], 50, "guarantor_relieved") {} catch {}
                uint256 liabilityLeft = guarantorLiabilityEach[id] - guarantorExtracted[id][g[i]];
                emit GuarantorRelieved(id, g[i], liabilityLeft);
            }
        }

        emit LoanRepaid(id, l.amountRepaid + totalExtracted[id], true);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          6. REVENUE ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Borrower authorizes future merchant payments to auto-deduct toward repayment
    /// @dev External integration: MerchantPortal checks this flag and routes a % to repay
    function setRevenueAssignment(uint256 id, bool enabled) external {
        Loan storage l = loans[id];
        if (l.borrower != msg.sender) revert TL_NotBorrower();
        if (l.state != LoanState.ACTIVE && l.state != LoanState.RESTRUCTURED) revert TL_WrongState();
        l.revenueAssignment = enabled;
        emit RevenueAssignmentSet(id, enabled);
    }

    /// @notice Called by MerchantPortal (or authorized contract) to make a payment from revenue
    function payFromRevenue(uint256 id, uint256 amount) external nonReentrant {
        Loan storage l = loans[id];
        if (l.state != LoanState.ACTIVE && l.state != LoanState.RESTRUCTURED) revert TL_WrongState();
        if (!l.revenueAssignment) revert TL_WrongState();
        if (amount == 0) revert TL_Zero();

        uint256 interest = (l.principal * l.interestBps) / 10000;
        uint256 totalDebt = l.principal + interest;
        uint256 remaining = totalDebt > l.amountRepaid ? totalDebt - l.amountRepaid : 0;
        if (remaining == 0) revert TL_NothingDue();
        if (amount > remaining) amount = remaining;

        l.amountRepaid += amount;

        uint256 protocolFee = (amount * PROTOCOL_CUT_PCT) / 100;
        uint256 lenderGets = amount - protocolFee;

        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
        vfideToken.safeTransfer(l.lender, lenderGets);
        if (protocolFee > 0 && feeDistributor != address(0)) {
            vfideToken.safeTransfer(feeDistributor, protocolFee);
        }

        // Check if fully repaid via revenue
        if (l.amountRepaid >= totalDebt) {
            l.state = LoanState.REPAID;
            _closeLoan(l);
            totalLoans++;
            totalVolume += l.principal;
            if (address(seer) != address(0)) {
                try seer.reward(l.borrower, REWARD_ONTIME_BORROWER, "loan_revenue_repaid") {} catch {}
                try seer.reward(l.lender, REWARD_ONTIME_LENDER, "loan_facilitated") {} catch {}
            }
            emit LoanRepaid(id, l.amountRepaid, false);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          INTERNAL
    // ═══════════════════════════════════════════════════════════════════════

    function _closeLoan(Loan storage l) internal {
        if (l.borrower != address(0)) activeLoanCount[l.borrower]--;
        activeLoanCount[l.lender]--;
    }

    function _maxBorrowable(address borrower) internal view returns (uint256) {
        if (address(seer) == address(0)) return tier1Limit;
        uint16 score = seer.getScore(borrower);
        if (score == 0) score = 5000;
        if (score >= TIER_4_SCORE) return tier4Limit;
        if (score >= TIER_3_SCORE) return tier3Limit;
        if (score >= TIER_2_SCORE) return tier2Limit;
        if (score >= TIER_1_SCORE) return tier1Limit;
        return 0; // Below minimum — can't borrow
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    function getLoan(uint256 id) external view returns (Loan memory) { return loans[id]; }
    function getPlan(uint256 id) external view returns (PaymentPlan memory) { return plans[id]; }
    function getGuarantors(uint256 id) external view returns (address[] memory) { return guarantors[id]; }

    function maxBorrowable(address user) external view returns (uint256) { return _maxBorrowable(user); }

    function amountOwed(uint256 id) external view returns (uint256 remaining, bool overdue, bool defaultable) {
        Loan storage l = loans[id];
        if (l.state != LoanState.ACTIVE && l.state != LoanState.GRACE && l.state != LoanState.RESTRUCTURED) return (0, false, false);
        uint256 interest = (l.principal * l.interestBps) / 10000;
        uint256 total = l.principal + interest;
        remaining = total > l.amountRepaid ? total - l.amountRepaid : 0;
        overdue = block.timestamp > l.deadline;
        defaultable = block.timestamp > l.deadline + GRACE_PERIOD;
    }

    function getStats() external view returns (uint256, uint256, uint256, uint256, uint256) {
        return (totalLoans, totalVolume, totalDefaults, totalRestructured, totalProtocolFees);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          DAO ADMINISTRATION
    // ═══════════════════════════════════════════════════════════════════════

    function setScoreTiers(uint256 t1, uint256 t2, uint256 t3, uint256 t4) external onlyDAO {
        tier1Limit = t1; tier2Limit = t2; tier3Limit = t3; tier4Limit = t4;
        emit TiersUpdated(t1, t2, t3, t4);
    }

    function setPaused(bool _p) external onlyDAO { paused = _p; }
    function setDAO(address _d) external onlyDAO { if (_d == address(0)) revert TL_Zero(); dao = _d; }
    function setSeer(address _s) external onlyDAO { seer = ISeerTL(_s); }
    function setVaultHub(address _v) external onlyDAO { vaultHub = IVaultHubTL(_v); }
    function setFeeDistributor(address _f) external onlyDAO { feeDistributor = _f; }
    function setFraudRegistry(address _fr) external onlyDAO { fraudRegistry = _fr; }
}
