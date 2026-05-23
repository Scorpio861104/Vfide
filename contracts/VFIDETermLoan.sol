// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";
import "./lib/ScoringConstants.sol";

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

/// @notice ISeerTL
/// @title ISeerTL
/// @author Vfide
interface ISeerTL {
    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16);
    /// @notice getCachedScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getCachedScore(address subject) external view returns (uint16);
    /// @notice reward
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function reward(address subject, uint16 delta, string calldata reason) external;
    /// @notice punish
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function punish(address subject, uint16 delta, string calldata reason) external;
}

/// @notice IVaultHubTL
/// @title IVaultHubTL
/// @author Vfide
interface IVaultHubTL {
    /// @notice vaultOf
    /// @param owner owner
    /// @return _address _address
    function vaultOf(address owner) external view returns (address);
    /// @dev R-4 — used by settleLoanByInheritance to gate on either party's vault
    ///      being in MEMORIAL or CLOSED state.
    /// @notice isInMemorialState
    /// @param vault vault
    /// @return _bool _bool
    function isInMemorialState(address vault) external view returns (bool);
}

/// @notice ICardBoundVaultTL
/// @title ICardBoundVaultTL
/// @author Vfide
interface ICardBoundVaultTL {
    /// @notice isGuardian
    /// @param g g
    /// @return _bool _bool
    function isGuardian(address g) external view returns (bool);
    /// @dev H-26 FIX: maturity check rejects guardians added <7 days ago, blocking
    ///      flash-endorsement attacks where an accomplice is briefly added as a
    ///      guardian only long enough to co-sign as guarantor on a fraudulent loan.
    /// @notice isGuardianMature
    /// @param g g
    /// @return _bool _bool
    function isGuardianMature(address g) external view returns (bool);
    /// @notice guardianCount
    /// @return _uint8 _uint8
    function guardianCount() external view returns (uint8);
}

/// @notice IFraudRegistryTL
/// @title IFraudRegistryTL
/// @author Vfide
interface IFraudRegistryTL {
    /// @notice isServiceBanned
    /// @param user user
    /// @return _bool _bool
    function isServiceBanned(address user) external view returns (bool);
}

// ── Errors ──────────────────────────────────────────────────────────────────

/// @notice TL_NotDAO
error TL_NotDAO();
/// @notice TL_Zero
error TL_Zero();
/// @notice TL_InvalidTerms
error TL_InvalidTerms();
/// @notice TL_NotLender
error TL_NotLender();
/// @notice TL_NotBorrower
error TL_NotBorrower();
/// @notice TL_NotGuarantor
error TL_NotGuarantor();
/// @notice TL_WrongState
error TL_WrongState();
/// @notice TL_ScoreTooLow
error TL_ScoreTooLow();
/// @notice TL_ExceedsLimit
error TL_ExceedsLimit();
/// @notice TL_GraceNotExpired
error TL_GraceNotExpired();
/// @notice TL_Paused
error TL_Paused();
/// @notice TL_SelfLoan
error TL_SelfLoan();
/// @notice TL_LoanCap
error TL_LoanCap();
/// @notice TL_AlreadySigned
error TL_AlreadySigned();
/// @notice TL_PlanNotAccepted
error TL_PlanNotAccepted();
/// @notice TL_PlanExists
error TL_PlanExists();
/// @notice TL_NothingDue
error TL_NothingDue();
/// @notice TL_DebtOutstanding
error TL_DebtOutstanding();
/// @notice TL_NoVault
error TL_NoVault();

// ── Contract ────────────────────────────────────────────────────────────────


/// @notice IFeeDistributor
/// @title IFeeDistributor
/// @author Vfide
interface IFeeDistributor {
    /// @notice receiveFee
    /// @param amount amount
    function receiveFee(uint256 amount) external;
}

/// @notice VFIDETermLoan
/// @title VFIDETermLoan
/// @author Vfide
contract VFIDETermLoan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice MAX_INTEREST_BPS
    uint256 public constant MAX_INTEREST_BPS = 1200;   // 12% cap
    /// @notice MAX_DURATION
    uint64  public constant MAX_DURATION = 30 days;
    /// @notice MIN_DURATION
    uint64  public constant MIN_DURATION = 1 days;
    /// @notice GRACE_PERIOD
    uint64  public constant GRACE_PERIOD = 3 days;
    /// @notice PROTOCOL_CUT_PCT
    uint256 public constant PROTOCOL_CUT_PCT = 10;     // 10% of interest → community
    /// @notice MAX_ACTIVE_LOANS
    uint256 public constant MAX_ACTIVE_LOANS = 10;
    /// @notice REQUIRED_GUARANTORS
    uint8   public constant REQUIRED_GUARANTORS = 1;   // At least 1 guardian must co-sign
    /// @notice MAX_PLAN_DURATION
    uint64  public constant MAX_PLAN_DURATION = 90 days;
    /// @notice MAX_PLAN_INSTALLMENTS
    uint8   public constant MAX_PLAN_INSTALLMENTS = 12;

    // Guarantor financial liability
    /// @notice GUARANTOR_LIABILITY_PCT
    uint256 public constant GUARANTOR_LIABILITY_PCT = 100; // Guarantors collectively cover 100% of principal
    /// @notice EXTRACTION_INTERVAL
    uint64  public constant EXTRACTION_INTERVAL = 1 days;  // Daily extractions after default
    /// @notice EXTRACTION_RATE_PCT
    uint256 public constant EXTRACTION_RATE_PCT = 10;      // 10% of their liability per extraction

    // F-SC-025 FIX: Bound how long a loan can sit in the COSIGNING state before
    // either party can cancel and reclaim funds. Without this timeout, if the
    // borrower's guardians never gather signatures the lender's principal was
    // permanently locked in this contract and the borrower's activeLoanCount
    // stayed incremented (preventing them from taking other loans).
    /// @notice COSIGNING_TIMEOUT
    uint64  public constant COSIGNING_TIMEOUT = 14 days;

    // ProofScore thresholds → max loan amount (in token units, 18 decimals)
    // DAO can adjust these via setScoreTiers()
    /// @notice TIER_1_SCORE
    uint16 public constant TIER_1_SCORE = ScoringConstants.TIER_1;  // 50% – neutral
    /// @notice TIER_2_SCORE
    uint16 public constant TIER_2_SCORE = ScoringConstants.TIER_2;  // 60%
    /// @notice TIER_3_SCORE
    uint16 public constant TIER_3_SCORE = ScoringConstants.TIER_3;  // 70%
    /// @notice TIER_4_SCORE
    uint16 public constant TIER_4_SCORE = ScoringConstants.TIER_4;  // 80% – highly trusted

    // Graduated ProofScore adjustments
    /// @notice REWARD_ONTIME_BORROWER
    uint16 public constant REWARD_ONTIME_BORROWER = 5;      // +0.5
    /// @notice REWARD_ONTIME_LENDER
    uint16 public constant REWARD_ONTIME_LENDER = 2;        // +0.2
    /// @notice PENALTY_LATE
    uint16 public constant PENALTY_LATE = 15;                // -1.5
    /// @notice PENALTY_PLAN_COMPLETED
    uint16 public constant PENALTY_PLAN_COMPLETED = 30;      // -3.0 (good faith acknowledged)
    /// @notice PENALTY_PLAN_FAILED_1
    uint16 public constant PENALTY_PLAN_FAILED_1 = 100;      // -10.0 (first hit)
    /// @notice PENALTY_PLAN_FAILED_2
    uint16 public constant PENALTY_PLAN_FAILED_2 = 50;       // -5.0  (second hit, same tx = -15.0 total)
    /// @notice PENALTY_PLAN_FAILED_GUARANTOR
    uint16 public constant PENALTY_PLAN_FAILED_GUARANTOR = 50; // -5.0 per guarantor
    /// @notice PENALTY_FULL_DEFAULT_1
    uint16 public constant PENALTY_FULL_DEFAULT_1 = 100;     // -10.0 (first hit)
    /// @notice PENALTY_FULL_DEFAULT_2
    uint16 public constant PENALTY_FULL_DEFAULT_2 = 100;     // -10.0 (second hit, same tx = -20.0 total)
    /// @notice PENALTY_DEFAULT_GUARANTOR
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

    /// @notice vfideToken
    IERC20 public immutable vfideToken;
    /// @notice dao
    address public dao;
    /// @notice fraudRegistry
    address public fraudRegistry;
    /// @notice seer
    ISeerTL public seer;
    /// @notice vaultHub
    IVaultHubTL public vaultHub;
    /// @notice feeDistributor
    address public feeDistributor;
    /// @notice paused
    bool public paused;

    /// @notice loans
    mapping(uint256 => Loan) public loans;
    /// @notice plans
    mapping(uint256 => PaymentPlan) public plans;
    /// @notice guarantors
    mapping(uint256 => address[]) public guarantors;          // Loan → guarantor addresses
    /// @notice hasSigned
    mapping(uint256 => mapping(address => bool)) public hasSigned; // Loan → guarantor → signed
    /// @notice guarantorVault
    mapping(uint256 => mapping(address => address)) public guarantorVault; // Loan → guarantor → approval source
    /// @notice guarantorCommittedLiability
    mapping(uint256 => mapping(address => uint256)) public guarantorCommittedLiability; // Loan → guarantor → committed liability
    /// @notice signatureCount
    mapping(uint256 => uint8) public signatureCount;          // Loan → number of guarantor signatures
    /// @notice guarantorLiabilityEach
    mapping(uint256 => uint256) public guarantorLiabilityEach; // Loan → liability per guarantor
    /// @notice guarantorExtracted
    mapping(uint256 => mapping(address => uint256)) public guarantorExtracted; // How much pulled from each
    // F-SC-025 FIX: timestamp at which the loan entered COSIGNING. Used by
    // cancelLoanCosigning to enforce COSIGNING_TIMEOUT before either the
    // lender or the borrower can abort and reclaim funds/loan-slots.
    /// @notice cosigningStartedAt
    mapping(uint256 => uint64) public cosigningStartedAt;
    /// @notice committedLiability
    mapping(address => uint256) public committedLiability; // Guarantor address → aggregate active liability
    /// @notice committedLiabilityBySource
    mapping(address => uint256) public committedLiabilityBySource; // Approval source (vault/wallet) → aggregate active liability
    /// @notice lastExtractionTime
    mapping(uint256 => uint64) public lastExtractionTime;     // When last extraction happened
    /// @notice totalExtracted
    mapping(uint256 => uint256) public totalExtracted;        // Total extracted across all guarantors
    /// @notice nextLoanId
    uint256 public nextLoanId = 1;

    /// @notice activeLoanCount
    mapping(address => uint256) public activeLoanCount;
    /// @notice unresolvedDefaults
    mapping(address => uint256) public unresolvedDefaults;

    /// @notice H-25 FIX: Revenue routers authorized to call payFromRevenue on behalf of borrowers.
    /// Only governance can add/remove entries (e.g., MerchantPortal is pre-approved).
    mapping(address => bool) public isAuthorizedRevenueRouter;

    // ProofScore → max loan tiers (configurable by DAO)
    /// @notice tier1Limit
    uint256 public tier1Limit = 100e18;     // Score 5000+: 100 VFIDE
    /// @notice tier2Limit
    uint256 public tier2Limit = 1_000e18;   // Score 6000+: 1,000 VFIDE
    /// @notice tier3Limit
    uint256 public tier3Limit = 5_000e18;   // Score 7000+: 5,000 VFIDE
    /// @notice tier4Limit
    uint256 public tier4Limit = 20_000e18;  // Score 8000+: 20,000 VFIDE

    /// @notice totalLoans
    uint256 public totalLoans;
    /// @notice totalVolume
    uint256 public totalVolume;
    /// @notice totalDefaults
    uint256 public totalDefaults;
    /// @notice totalRestructured
    uint256 public totalRestructured;
    /// @notice totalProtocolFees
    uint256 public totalProtocolFees;

    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice LoanCreated
    /// @param id id
    /// @param lender lender
    /// @param principal principal
    /// @param interestBps interestBps
    /// @param duration duration
    event LoanCreated(uint256 indexed id, address indexed lender, uint256 principal, uint256 interestBps, uint64 duration);
    /// @notice LoanAccepted
    /// @param id id
    /// @param borrower borrower
    /// @param maxBorrowable maxBorrowable
    event LoanAccepted(uint256 indexed id, address indexed borrower, uint256 maxBorrowable);
    /// @notice GuarantorSigned
    /// @param id id
    /// @param guarantor guarantor
    /// @param totalSigs totalSigs
    event GuarantorSigned(uint256 indexed id, address indexed guarantor, uint8 totalSigs);
    /// @notice LoanActivated
    /// @param id id
    /// @param deadline deadline
    event LoanActivated(uint256 indexed id, uint64 deadline);
    /// @notice LoanRepaid
    /// @param id id
    /// @param totalPaid totalPaid
    /// @param late late
    event LoanRepaid(uint256 indexed id, uint256 totalPaid, bool late);
    /// @notice PaymentPlanProposed
    /// @param id id
    /// @param installments installments
    /// @param intervalDays intervalDays
    event PaymentPlanProposed(uint256 indexed id, uint8 installments, uint64 intervalDays);
    /// @notice PaymentPlanAccepted
    /// @param id id
    event PaymentPlanAccepted(uint256 indexed id);
    /// @notice InstallmentPaid
    /// @param id id
    /// @param installmentNumber installmentNumber
    /// @param amount amount
    event InstallmentPaid(uint256 indexed id, uint8 installmentNumber, uint256 amount);
    /// @notice PaymentPlanCompleted
    /// @param id id
    event PaymentPlanCompleted(uint256 indexed id);
    /// @notice LoanDefaulted
    /// @param id id
    /// @param planFailed planFailed
    event LoanDefaulted(uint256 indexed id, bool planFailed);
    /// @notice GuarantorExtracted
    /// @param id id
    /// @param guarantor guarantor
    /// @param amount amount
    /// @param totalFromGuarantor totalFromGuarantor
    event GuarantorExtracted(uint256 indexed id, address indexed guarantor, uint256 amount, uint256 totalFromGuarantor);
    /// @notice GuarantorExtractionSkipped
    /// @param id id
    /// @param guarantor guarantor
    /// @param attemptedAmount attemptedAmount
    event GuarantorExtractionSkipped(uint256 indexed id, address indexed guarantor, uint256 attemptedAmount);
    /// @notice GuarantorExtractionRound
    /// @param id id
    /// @param extracted extracted
    /// @param skipped skipped
    /// @param guarantorCount guarantorCount
    event GuarantorExtractionRound(uint256 indexed id, uint256 extracted, uint256 skipped, uint256 guarantorCount);
    /// @notice GuarantorRelieved
    /// @param id id
    /// @param guarantor guarantor
    /// @param remainingLiability remainingLiability
    event GuarantorRelieved(uint256 indexed id, address indexed guarantor, uint256 remainingLiability);
    /// @notice LoanCancelled
    /// @param id id
    event LoanCancelled(uint256 indexed id);
    /// @notice R-4 — emitted when a loan is unwound because one party's vault entered MEMORIAL.
    ///         For OPEN/COSIGNING loans, lender's principal is returned to the lender. For
    ///         ACTIVE/GRACE loans, the loan is marked settled; the lender pursues default-claim
    ///         through the normal flow against the borrower's heir vault.
    /// @param id id
    /// @param deceasedParty deceasedParty
    /// @param priorState priorState
    event LoanSettledByInheritance(uint256 indexed id, address indexed deceasedParty, uint8 priorState);
    /// @notice RevenueAssignmentSet
    /// @param id id
    /// @param enabled enabled
    event RevenueAssignmentSet(uint256 indexed id, bool enabled);
    /// @notice TiersUpdated
    /// @param t1 t1
    /// @param t2 t2
    /// @param t3 t3
    /// @param t4 t4
    event TiersUpdated(uint256 t1, uint256 t2, uint256 t3, uint256 t4);

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice onlyDAO
    modifier onlyDAO() { if (msg.sender != dao) revert TL_NotDAO(); _; }
    /// @notice whenNotPaused
    modifier whenNotPaused() { if (paused) revert TL_Paused(); _; }

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    // slither-disable-next-line missing-zero-check
    /// @notice constructor
    /// @param _token _token
    /// @param _dao _dao
    /// @param _seer _seer
    /// @param _vaultHub _vaultHub
    /// @param _feeDist _feeDist
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
    /// @param principal principal
    /// @param interestBps interestBps
    /// @param duration duration
    /// @return id id
    function createLoan(uint256 principal, uint256 interestBps, uint64 duration)
        external nonReentrant whenNotPaused returns (uint256 id)
    {
        if (principal == 0) revert TL_Zero();
        if (interestBps > MAX_INTEREST_BPS) revert TL_InvalidTerms();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert TL_InvalidTerms();
        if (activeLoanCount[msg.sender] >= MAX_ACTIVE_LOANS) revert TL_LoanCap();
        if (unresolvedDefaults[msg.sender] > 0) revert TL_DebtOutstanding();
        _requireVaultParticipant(msg.sender);

        id = nextLoanId++;
        loans[id] = Loan({
            lender: msg.sender, borrower: address(0),
            principal: principal, interestBps: interestBps,
            duration: duration, startTime: 0, deadline: 0,
            amountRepaid: 0, revenueAssignment: false,
            state: LoanState.OPEN
        });
        ++activeLoanCount[msg.sender];

        vfideToken.safeTransferFrom(_settlementSource(msg.sender), address(this), principal);
        emit LoanCreated(id, msg.sender, principal, interestBps, duration);
    }

    /// @notice Cancel open offer (before borrower accepts)
    /// @param id id
    function cancelLoan(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.lender != msg.sender) revert TL_NotLender();
        if (l.state != LoanState.OPEN) revert TL_WrongState();
        l.state = LoanState.CANCELLED;
        --activeLoanCount[msg.sender];
        vfideToken.safeTransfer(_settlementRecipient(msg.sender), l.principal);
        emit LoanCancelled(id);
    }

    /// @notice Cancel a stuck COSIGNING loan after timeout.
    /// @dev F-SC-025 FIX: Without this function, a loan that the borrower
    ///      accepted but whose guardians never signed sat in COSIGNING
    ///      forever. Lender principal stayed locked in this contract and
    ///      the borrower's activeLoanCount stayed incremented. There was
    ///      no transition out of COSIGNING except `_activateLoan` (requires
    ///      REQUIRED_GUARANTORS signatures). cancelLoan rejected COSIGNING
    ///      (line 311 requires OPEN). claimDefault rejected COSIGNING
    ///      (requires ACTIVE/GRACE/RESTRUCTURED). This function is the exit.
    ///
    ///      Either party (lender or borrower) can cancel after
    ///      COSIGNING_TIMEOUT (14 days) elapses since acceptLoan. The
    ///      lender's principal returns to them. Already-committed guarantor
    ///      liability is released. The borrower's activeLoanCount is
    ///      decremented so they can take other loans again.
    /// @param id id
    function cancelLoanCosigning(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.state != LoanState.COSIGNING) revert TL_WrongState();
        if (msg.sender != l.lender && msg.sender != l.borrower) revert TL_NotBorrower();
        uint64 startedAt = cosigningStartedAt[id];
        require(startedAt != 0, "TL: cosigning timestamp missing");
        require(block.timestamp >= uint256(startedAt) + COSIGNING_TIMEOUT, "TL: timeout not elapsed");

        l.state = LoanState.CANCELLED;

        // Decrement loan counters: both lender and borrower were tracking this.
        if (activeLoanCount[l.lender] > 0) {
            --activeLoanCount[l.lender];
        }
        if (activeLoanCount[l.borrower] > 0) {
            --activeLoanCount[l.borrower];
        }

        // Release any guarantor commitments that were made before timeout
        // (signatureCount < REQUIRED_GUARANTORS, otherwise _activateLoan would
        // have transitioned us out of COSIGNING already).
        address[] storage signers = guarantors[id];
        for (uint256 i = 0; i < signers.length; ++i) {
            address g = signers[i];
            uint256 committed = guarantorCommittedLiability[id][g];
            if (committed > 0) {
                address source = guarantorVault[id][g];
                if (source == address(0)) source = g;
                _releaseGuarantorCommitment(id, g, source, committed);
            }
        }

        // Refund lender's principal — this contract has been holding it since
        // createLoan deposited it (line 303).
        vfideToken.safeTransfer(_settlementRecipient(l.lender), l.principal);
        emit LoanCancelled(id);
    }

    /// @notice R-4 — Settle a loan when one party's vault has entered MEMORIAL state.
    ///
    /// Pull-based settlement: anyone can call this once the lender or borrower's vault
    /// enters MEMORIAL (state 3) or CLOSED (state 4). Branches by loan state:
    ///   - OPEN or COSIGNING: principal is still in this contract (lender deposited
    ///     at createLoan, borrower hasn't received). Refund principal to lender's
    ///     settlement recipient. If lender is the deceased, funds return to their
    ///     vault for inheritance distribution. If borrower is the deceased, the
    ///     lender simply gets their offer back.
    ///   - ACTIVE / GRACE / RESTRUCTURED: principal already disbursed to borrower.
    ///     Mark loan DEFAULTED so the lender's normal default-claim flow can pursue
    ///     the heir's vault. Guarantor commitments stay live — the heir's vault
    ///     inherits the debt, and guarantors remain on the hook per their commitment.
    ///     This is intentionally aggressive on the borrower side: death does NOT
    ///     forgive the debt.
    ///   - REPAID / DEFAULTED / CANCELLED: no-op + revert (already terminal).
    ///
    /// VaultHub must be wired for this function to work. Without it, settlement is
    /// disabled (reverts with TL_WrongState). This preserves the contract's behavior
    /// in deployments where the hub isn't connected.
    /// @param id id
    function settleLoanByInheritance(uint256 id) external nonReentrant {
        if (address(vaultHub) == address(0)) revert TL_WrongState();
        Loan storage l = loans[id];

        LoanState prior = l.state;
        // Skip already-terminal states.
        if (prior == LoanState.REPAID || prior == LoanState.DEFAULTED || prior == LoanState.CANCELLED) {
            revert TL_WrongState();
        }

        // Probe both parties.
        address lenderVault = vaultHub.vaultOf(l.lender);
        address borrowerVault = vaultHub.vaultOf(l.borrower);
        address deceasedParty = address(0);
        if (lenderVault != address(0) && vaultHub.isInMemorialState(lenderVault)) {
            deceasedParty = l.lender;
        } else if (borrowerVault != address(0) && vaultHub.isInMemorialState(borrowerVault)) {
            deceasedParty = l.borrower;
        } else {
            revert TL_WrongState();
        }

        if (prior == LoanState.OPEN || prior == LoanState.COSIGNING) {
            // Principal is in this contract; refund to lender's settlement recipient.
            l.state = LoanState.CANCELLED;
            if (activeLoanCount[l.lender] > 0) --activeLoanCount[l.lender];
            if (prior == LoanState.COSIGNING && activeLoanCount[l.borrower] > 0) {
                --activeLoanCount[l.borrower];
            }
            // Release guarantor commitments made during COSIGNING (if any).
            if (prior == LoanState.COSIGNING) {
                address[] storage signers = guarantors[id];
                for (uint256 i = 0; i < signers.length; ++i) {
                    address g = signers[i];
                    uint256 committed = guarantorCommittedLiability[id][g];
                    if (committed > 0) {
                        address source = guarantorVault[id][g];
                        if (source == address(0)) source = g;
                        _releaseGuarantorCommitment(id, g, source, committed);
                    }
                }
            }
            vfideToken.safeTransfer(_settlementRecipient(l.lender), l.principal);
        } else {
            // ACTIVE / GRACE / RESTRUCTURED — debt is already with borrower.
            // Mark defaulted so the lender's normal claim flow picks it up.
            // We do NOT decrement activeLoanCount here — defaulted loans are
            // tracked by `unresolvedDefaults` per existing design.
            l.state = LoanState.DEFAULTED;
            ++unresolvedDefaults[l.borrower];
        }

        emit LoanSettledByInheritance(id, deceasedParty, uint8(prior));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                      2. BORROWER ACCEPTS + GUARANTORS SIGN
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Accept a loan offer. ProofScore checked. Needs guarantor co-sign after.
    /// @param id id
    function acceptLoan(uint256 id) external nonReentrant whenNotPaused {
        if (fraudRegistry != address(0)) {
            try IFraudRegistryTL(fraudRegistry).isServiceBanned(msg.sender) returns (bool banned) {
                if (banned) revert TL_Paused();
            } catch {
                revert TL_Paused();
            }
        }
        Loan storage l = loans[id];
        if (l.state != LoanState.OPEN) revert TL_WrongState();
        if (msg.sender == l.lender) revert TL_SelfLoan();
        if (activeLoanCount[msg.sender] >= MAX_ACTIVE_LOANS) revert TL_LoanCap();
        if (unresolvedDefaults[msg.sender] > 0) revert TL_DebtOutstanding();
        _requireVaultParticipant(msg.sender);

        // ProofScore check: can borrower handle this amount?
        uint256 limit = _maxBorrowable(msg.sender);
        if (l.principal > limit) revert TL_ExceedsLimit();

        l.borrower = msg.sender;
        l.state = LoanState.COSIGNING;
        // F-SC-025 FIX: stamp the moment we entered COSIGNING so cancellation
        // after timeout becomes possible.
        cosigningStartedAt[id] = uint64(block.timestamp);
        ++activeLoanCount[msg.sender];

        emit LoanAccepted(id, msg.sender, limit);
    }

    /// @notice Guarantor co-signs the loan (must be borrower's vault guardian)
    /// @dev Guarantor must first approve this contract for their liability share.
    ///      This is explicit consent: "I vouch for this person AND I'm willing
    ///      to pay if they don't." Real co-signing with real consequences.
    ///
    ///      H-17 NON-CUSTODIAL DESIGN INTENT — standing approval is required:
    ///      The guarantor pre-approves this contract for their full liability
    ///      (`liabilityPerGuarantor`) before signing. This standing approval is
    ///      load-bearing: a guarantor relationship that requires fresh per-extraction
    ///      consent is no relationship at all — the borrower could simply pick a
    ///      guarantor who refuses to sign each time, defeating the lender's recourse.
    ///
    ///      The protocol never moves guarantor funds without their explicit prior
    ///      approval. Frontends MUST display the liability amount, the borrower
    ///      identity, and the consequence ("if borrower defaults, this contract may
    ///      pull up to LIABILITY tokens from your wallet or vault in periodic rounds")
    ///      before the guarantor signs the approval transaction.
    ///
    ///      The risk a guarantor accepts: if this contract is ever compromised, the
    ///      attacker can pull up to `liabilityPerGuarantor` minus what's already been
    ///      extracted. The cap is bounded by `GUARANTOR_LIABILITY_PCT` and by the
    ///      `EXTRACTION_RATE_PCT` per-round throttle (see `extractFromGuarantors`).
    /// @param id id
    function signAsGuarantor(uint256 id) external {
        Loan storage l = loans[id];
        if (l.state != LoanState.COSIGNING) revert TL_WrongState();
        if (hasSigned[id][msg.sender]) revert TL_AlreadySigned();
        if (unresolvedDefaults[msg.sender] > 0) revert TL_DebtOutstanding();

        // Verify caller is a guardian of borrower's vault
        // H-26 FIX: Require GUARDIAN_MATURITY_PERIOD (7 days) since the guardian was added.
        //          isGuardianMature returns false for non-guardians (addedAt == 0) AND for
        //          guardians added within the maturity window — blocks the flash-endorsement
        //          attack: add accomplice as guardian -> co-sign large loan -> remove guardian,
        //          all in one or two blocks while a fraudulent loan is fully active.
        if (address(vaultHub) != address(0)) {
            address vault = vaultHub.vaultOf(l.borrower);
            if (vault != address(0)) {
                ICardBoundVaultTL cbv = ICardBoundVaultTL(vault);
                if (!cbv.isGuardianMature(msg.sender)) revert TL_NotGuarantor();
            }
        }

        // Guarantor's own score must be reasonable
        if (address(seer) != address(0)) {
            uint16 gScore = seer.getCachedScore(msg.sender);
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

        uint256 totalCommittedForSource = committedLiabilityBySource[approvalSource] + liabilityPerGuarantor;
        uint256 approved = vfideToken.allowance(approvalSource, address(this));
        require(approved >= totalCommittedForSource, "TL: guarantor must approve liability first");
        uint256 balance = vfideToken.balanceOf(approvalSource);
        require(balance >= totalCommittedForSource, "TL: guarantor source balance below liability");

        hasSigned[id][msg.sender] = true;
        guarantors[id].push(msg.sender);
        guarantorVault[id][msg.sender] = approvalSource;
        guarantorCommittedLiability[id][msg.sender] = liabilityPerGuarantor;
        committedLiability[msg.sender] += liabilityPerGuarantor;
        committedLiabilityBySource[approvalSource] += liabilityPerGuarantor;
        ++signatureCount[id];

        // Recalculate per-guarantor liability (split evenly)
        guarantorLiabilityEach[id] = (l.principal * GUARANTOR_LIABILITY_PCT) / (100 * uint256(signatureCount[id]));

        emit GuarantorSigned(id, msg.sender, signatureCount[id]);

        // If enough signatures, activate the loan
        if (signatureCount[id] >= REQUIRED_GUARANTORS) {
            _activateLoan(id);
        }
    }

    // slither-disable-next-line reentrancy-benign,reentrancy-events
    /// @notice _activateLoan
    /// @param id id
    function _activateLoan(uint256 id) internal {
        Loan storage l = loans[id];
        // Re-evaluate borrower capacity right before funding to avoid stale score windows.
        uint256 currentLimit = _maxBorrowable(l.borrower);
        if (l.principal > currentLimit) revert TL_ExceedsLimit();
        l.startTime = uint64(block.timestamp);
        l.deadline = uint64(block.timestamp) + l.duration;
        l.state = LoanState.ACTIVE;

        // Send principal to borrower
        vfideToken.safeTransfer(_settlementRecipient(l.borrower), l.principal);
        emit LoanActivated(id, l.deadline);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          3. REPAYMENT (HAPPY PATH)
    // ═══════════════════════════════════════════════════════════════════════

    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign,reentrancy-events
    /// @notice Repay the loan — full principal + interest
    /// @param id id
    function repay(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.borrower != msg.sender) revert TL_NotBorrower();
        if (l.state != LoanState.ACTIVE && l.state != LoanState.GRACE) revert TL_WrongState();

        bool isLate = block.timestamp >= l.deadline;

        // If past deadline, must be in grace period
        if (isLate && l.state == LoanState.ACTIVE) {
            if (block.timestamp >= l.deadline + GRACE_PERIOD) revert TL_WrongState();
            l.state = LoanState.GRACE;
        }

        uint256 interest = (l.principal * l.interestBps) / 10000;
        uint256 totalOwed = l.principal + interest - l.amountRepaid;
        uint256 protocolFee = (interest * PROTOCOL_CUT_PCT) / 100;
        uint256 lenderReceives = totalOwed - protocolFee;

        l.amountRepaid = l.principal + interest;
        l.state = LoanState.REPAID;
        _closeLoan(l);
        _releaseAllGuarantorCommitments(id);

        vfideToken.safeTransferFrom(_settlementSource(msg.sender), address(this), totalOwed);
        vfideToken.safeTransfer(_settlementRecipient(l.lender), lenderReceives);
        if (protocolFee > 0 && feeDistributor != address(0)) {
            _notifyFeeDistributor(protocolFee);
        }
        totalProtocolFees += protocolFee;
        ++totalLoans;
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
        external nonReentrant
    {
        Loan storage l = loans[id];
        if (l.borrower != msg.sender) revert TL_NotBorrower();
        // Can propose during GRACE or if lender hasn't claimed default yet
        if (l.state != LoanState.GRACE && l.state != LoanState.ACTIVE) revert TL_WrongState();
        if (block.timestamp < l.deadline) revert TL_WrongState(); // Not overdue yet
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
    /// @param id id
    function acceptPaymentPlan(uint256 id) external {
        Loan storage l = loans[id];
        if (l.lender != msg.sender) revert TL_NotLender();
        if (plans[id].totalOwed == 0) revert TL_WrongState();
        if (plans[id].accepted) revert TL_WrongState();

        plans[id].accepted = true;
        l.state = LoanState.RESTRUCTURED;
        ++totalRestructured;

        emit PaymentPlanAccepted(id);
    }

    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign,reentrancy-events
    /// @notice Make an installment payment on a restructured loan
    /// @param id id
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

        ++p.paidInstallments;
        p.nextDue = uint64(block.timestamp) + (p.intervalDays * 1 days);
        l.amountRepaid += amount;

        vfideToken.safeTransferFrom(_settlementSource(msg.sender), address(this), amount);
        vfideToken.safeTransfer(_settlementRecipient(l.lender), lenderReceives);
        if (protocolFee > 0 && feeDistributor != address(0)) {
            _notifyFeeDistributor(protocolFee);
        }
        totalProtocolFees += protocolFee;

        emit InstallmentPaid(id, p.paidInstallments, amount);

        // Plan completed — reduced penalty (good faith recognized)
        if (p.paidInstallments >= p.totalInstallments) {
            l.state = LoanState.REPAID;
            _closeLoan(l);
            _releaseAllGuarantorCommitments(id);
            ++totalLoans;
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
                if (block.timestamp < p.nextDue + 7 days) revert TL_GraceNotExpired();
                planFailed = true;
            } else {
                revert TL_WrongState();
            }
        } else if (l.state == LoanState.ACTIVE || l.state == LoanState.GRACE) {
            // No plan — standard default after deadline + grace
            if (block.timestamp < l.deadline + GRACE_PERIOD) revert TL_GraceNotExpired();
        } else {
            revert TL_WrongState();
        }

        l.state = LoanState.DEFAULTED;
        _closeLoan(l);
        // Release accounting commitments once a loan defaults; extraction can
        // continue from allowances while avoiding stale commitment lockups.
        _releaseAllGuarantorCommitments(id);
        ++totalDefaults;

        ++unresolvedDefaults[l.borrower];
        address[] storage blockedGuarantors = guarantors[id];
        for (uint256 i = 0; i < blockedGuarantors.length; ++i) {
            ++unresolvedDefaults[blockedGuarantors[i]];
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
                for (uint256 i = 0; i < g.length; ++i) {
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
                for (uint256 i = 0; i < g2.length; ++i) {
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
    * Can only be called once per EXTRACTION_INTERVAL (1 day).
     * Extracts EXTRACTION_RATE_PCT (10%) of each guarantor's liability per call.
     * Lender calls this periodically. Guarantor's pre-approved allowance is used.
     *
    * This creates steady pressure: the guarantor has a day between extractions
     * to find the borrower and make them pay. If the borrower shows up and
     * repays via repayDefaultedLoan(), extraction stops immediately.
     */
    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign,reentrancy-events
    // SLITHER FALSE POSITIVE (arbitrary-send-erc20):
    //   The `source` address is not arbitrary. It is constrained by
    //   `_isValidGuarantorSource(g[i], source)`, which permits only:
    //     (a) the guarantor's own EOA wallet, OR
    //     (b) a vault whose current owner-mapping resolves to the guarantor.
    //   Each guarantor must have explicitly `approve()`d this contract for
    //   their committed liability when co-signing the loan (collateral
    //   commitment step). On default, this function pulls only up to the
    //   per-guarantor liability share — the standard guarantor-extraction
    //   mechanic. Function is `nonReentrant`.
    //
    // SLITHER FALSE POSITIVE (unchecked-transfer):
    //   The bool return of `transferFrom` is intentionally not checked here
    //   because we use a *stronger* check: a balance-diff verification on
    //   `recipient` (lines after the try). If the transfer succeeds but
    //   reports false, balance won't increase and we skip; if the transfer
    //   reverts, the catch-block emits `GuarantorExtractionSkipped` and
    //   continues. Both paths are safer than a plain bool check, which would
    //   silently accept a successful-but-misreporting token.
    // slither-disable-next-line arbitrary-send-erc20,unchecked-transfer,reentrancy-no-eth
    /// @notice extractFromGuarantors
    /// @param id id
    function extractFromGuarantors(uint256 id) external nonReentrant {
        Loan storage l = loans[id];
        if (l.lender != msg.sender) revert TL_NotLender();
        if (l.state != LoanState.DEFAULTED) revert TL_WrongState();

        // Enforce extraction interval
        if (lastExtractionTime[id] != 0 &&
            block.timestamp < lastExtractionTime[id] + EXTRACTION_INTERVAL) {
            revert TL_GraceNotExpired();
        }

        uint256 liabilityPer = guarantorLiabilityEach[id];
        address[] storage g = guarantors[id];
        uint256 totalThisRound = 0;
        uint256 skippedThisRound = 0;
        address recipient = _settlementRecipient(l.lender);

        for (uint256 i = 0; i < g.length; ++i) {
            uint256 alreadyTaken = guarantorExtracted[id][g[i]];
            if (alreadyTaken >= liabilityPer) continue; // Already fully extracted

            // 10% of their total liability per round
            uint256 extractAmount = (liabilityPer * EXTRACTION_RATE_PCT) / 100;
            uint256 remaining = liabilityPer - alreadyTaken;
            if (extractAmount > remaining) extractAmount = remaining;

            // Try to pull from the guarantor's chosen approval source (vault first, wallet fallback)
            address source = guarantorVault[id][g[i]];
            if (source == address(0)) source = g[i];

            // Defense in depth: only pull from guarantor wallet or the guarantor's
            // current vault mapping. If the source is no longer valid, skip extraction.
            if (!_isValidGuarantorSource(g[i], source)) {
                emit GuarantorExtractionSkipped(id, g[i], extractAmount);
                ++skippedThisRound;
                continue;
            }

            uint256 balBefore = vfideToken.balanceOf(recipient);
            try vfideToken.transferFrom(source, recipient, extractAmount) {
                uint256 received = vfideToken.balanceOf(recipient) - balBefore;
                if (received == 0) {
                    emit GuarantorExtractionSkipped(id, g[i], extractAmount);
                    ++skippedThisRound;
                    continue;
                }

                uint256 nextExtracted = guarantorExtracted[id][g[i]] + received;
                if (nextExtracted > liabilityPer) {
                    received = liabilityPer - guarantorExtracted[id][g[i]];
                    nextExtracted = liabilityPer;
                }

                guarantorExtracted[id][g[i]] = nextExtracted;
                _releaseGuarantorCommitment(id, g[i], source, received);
                totalThisRound += received;
                // H-25 FIX: if guarantor has now paid their full share, clear their unresolved default.
                if (nextExtracted >= liabilityPer && unresolvedDefaults[g[i]] > 0) {
                    --unresolvedDefaults[g[i]];
                }
                emit GuarantorExtracted(id, g[i], received, guarantorExtracted[id][g[i]]);
            } catch {
                emit GuarantorExtractionSkipped(id, g[i], extractAmount);
                ++skippedThisRound;
            }
        }

        totalExtracted[id] += totalThisRound;
        if (totalThisRound > 0) {
            lastExtractionTime[id] = uint64(block.timestamp);
        }
        emit GuarantorExtractionRound(id, totalThisRound, skippedThisRound, g.length);
    }

    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign,reentrancy-events
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

            vfideToken.safeTransferFrom(_settlementSource(msg.sender), address(this), remaining);
            vfideToken.safeTransfer(_settlementRecipient(l.lender), lenderGets);
            if (protocolFee > 0 && feeDistributor != address(0)) {
                _notifyFeeDistributor(protocolFee);
            }
            l.amountRepaid += remaining;
        }

        // Mark as repaid — stops all future guarantor extractions
        l.state = LoanState.REPAID;

        if (unresolvedDefaults[l.borrower] > 0) {
            --unresolvedDefaults[l.borrower];
        }
        address[] storage clearedGuarantors = guarantors[id];
        for (uint256 i = 0; i < clearedGuarantors.length; ++i) {
            if (unresolvedDefaults[clearedGuarantors[i]] > 0) {
                --unresolvedDefaults[clearedGuarantors[i]];
            }
        }

        // Reduced penalty: they came back and paid. Not forgiven, but recognized.
        if (address(seer) != address(0)) {
            // F-SC-032 FIX: Only reward the borrower for late payment if they
            // actually paid something (remaining > 0). When guarantors fully
            // covered the default (remaining == 0) the borrower contributed
            // nothing toward the residual; awarding +10.0 score for cleanup-
            // only would be a free score pump across N defaulted loans (each
            // giving +N×10.0). The "default_repaid_late" reward is conceptually
            // the recognition for "they came back and paid", which is only
            // true when the borrower transferred tokens above.
            if (remaining > 0) {
                // Net effect: they already got -20.0 from default.
                // Reward +10.0 back for making it right. Net: -10.0
                try seer.reward(l.borrower, 100, "default_repaid_late") {} catch {}
            }
            // Relieve guarantors — give back some score (this remains
            // unconditional: guarantors fulfilled their commitment by
            // covering the default, regardless of whether the borrower
            // contributed any residual).
            address[] storage g = guarantors[id];
            for (uint256 i = 0; i < g.length; ++i) {
                try seer.reward(g[i], 50, "guarantor_relieved") {} catch {}
                uint256 liabilityLeft = guarantorLiabilityEach[id] - guarantorExtracted[id][g[i]];
                address source = guarantorVault[id][g[i]];
                if (source == address(0)) source = g[i];
                _releaseGuarantorCommitment(id, g[i], source, liabilityLeft);
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
    /// @param id id
    /// @param enabled enabled
    function setRevenueAssignment(uint256 id, bool enabled) external {
        Loan storage l = loans[id];
        if (l.borrower != msg.sender) revert TL_NotBorrower();
        if (l.state != LoanState.ACTIVE && l.state != LoanState.RESTRUCTURED) revert TL_WrongState();
        l.revenueAssignment = enabled;
        emit RevenueAssignmentSet(id, enabled);
    }

    // slither-disable-next-line reentrancy-no-eth,reentrancy-benign,reentrancy-events
    /// @notice Called by MerchantPortal (or authorized contract) to make a payment from revenue
    /// @param id id
    /// @param amount amount
    function payFromRevenue(uint256 id, uint256 amount) external nonReentrant {
        Loan storage l = loans[id];
        // H-25 FIX: Restrict callers to the borrower themselves or an allowlisted revenue router
        // (e.g., MerchantPortal). This prevents ProofScore manipulation via third-party repayment.
        require(
            msg.sender == l.borrower || isAuthorizedRevenueRouter[msg.sender],
            "TL: not authorized"
        );
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

        vfideToken.safeTransferFrom(_settlementSource(msg.sender), address(this), amount);
        vfideToken.safeTransfer(_settlementRecipient(l.lender), lenderGets);
        if (protocolFee > 0 && feeDistributor != address(0)) {
            _notifyFeeDistributor(protocolFee);
        }

        // Check if fully repaid via revenue
        if (l.amountRepaid >= totalDebt) {
            l.state = LoanState.REPAID;
            _closeLoan(l);
            // M5f FIX: release guarantor commitments. Without this, guarantors of revenue-repaid
            // loans have committedLiability locked permanently. All other repayment paths already
            // call _releaseAllGuarantorCommitments after _closeLoan; this path was missing it.
            _releaseAllGuarantorCommitments(id);
            ++totalLoans;
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

    /// @notice _closeLoan
    /// @param l l
    function _closeLoan(Loan storage l) internal {
        if (l.borrower != address(0)) --activeLoanCount[l.borrower];
        --activeLoanCount[l.lender];
    }

    /// @notice _notifyFeeDistributor
    /// @param amount amount
    function _notifyFeeDistributor(uint256 amount) internal {
        vfideToken.safeTransfer(feeDistributor, amount);
        IFeeDistributor(feeDistributor).receiveFee(amount);
    }

    /// @notice _releaseAllGuarantorCommitments
    /// @param id id
    function _releaseAllGuarantorCommitments(uint256 id) internal {
        address[] storage g = guarantors[id];
        for (uint256 i = 0; i < g.length; ++i) {
            address guarantor = g[i];
            uint256 remaining = guarantorCommittedLiability[id][guarantor];
            if (remaining == 0) continue;
            address source = guarantorVault[id][guarantor];
            if (source == address(0)) source = guarantor;
            _releaseGuarantorCommitment(id, guarantor, source, remaining);
        }
    }

    /// @notice _releaseGuarantorCommitment
    /// @param id id
    /// @param guarantor guarantor
    /// @param source source
    /// @param amount amount
    function _releaseGuarantorCommitment(uint256 id, address guarantor, address source, uint256 amount) internal {
        if (amount == 0) return;

        uint256 committedForLoan = guarantorCommittedLiability[id][guarantor];
        if (amount > committedForLoan) amount = committedForLoan;
        uint256 committedForGuarantor = committedLiability[guarantor];
        if (amount > committedForGuarantor) amount = committedForGuarantor;
        uint256 committedForSource = committedLiabilityBySource[source];
        if (amount > committedForSource) amount = committedForSource;
        if (amount == 0) return;

        guarantorCommittedLiability[id][guarantor] = committedForLoan - amount;
        committedLiability[guarantor] = committedForGuarantor - amount;
        committedLiabilityBySource[source] = committedForSource - amount;
    }

    /// @notice _requireVaultParticipant
    /// @param participant participant
    function _requireVaultParticipant(address participant) internal view {
        if (address(vaultHub) == address(0)) return;
        if (vaultHub.vaultOf(participant) == address(0)) revert TL_NoVault();
    }

    /// @notice _settlementSource
    /// @param participant participant
    /// @return _address _address
    function _settlementSource(address participant) internal view returns (address) {
        if (address(vaultHub) == address(0)) return participant;

        address vault = vaultHub.vaultOf(participant);
        if (vault == address(0)) revert TL_NoVault();
        return vault;
    }

    /// @notice _settlementRecipient
    /// @param participant participant
    /// @return _address _address
    function _settlementRecipient(address participant) internal view returns (address) {
        return _settlementSource(participant);
    }

    /// @notice _isValidGuarantorSource
    /// @param guarantor guarantor
    /// @param source source
    /// @return _bool _bool
    function _isValidGuarantorSource(address guarantor, address source) internal view returns (bool) {
        if (source == guarantor) return true;
        if (address(vaultHub) == address(0) || source == address(0)) return false;

        // Use staticcall for fail-closed behavior if a non-conforming vault hub is configured.
        (bool ok, bytes memory data) = address(vaultHub).staticcall(
            abi.encodeWithSignature("vaultOf(address)", guarantor)
        );
        if (!ok || data.length < 32) return false;

        address currentVault = abi.decode(data, (address));
        return currentVault != address(0) && currentVault == source;
    }

    /// @notice _maxBorrowable
    /// @param borrower borrower
    /// @return _uint256 _uint256
    function _maxBorrowable(address borrower) internal view returns (uint256) {
        if (address(seer) == address(0)) return tier1Limit;
        uint16 score = seer.getCachedScore(borrower);
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

    /// @notice getLoan
    /// @param id id
    function getLoan(uint256 id) external view returns (Loan memory) { return loans[id]; }
    /// @notice getPlan
    /// @param id id
    function getPlan(uint256 id) external view returns (PaymentPlan memory) { return plans[id]; }
    /// @notice getGuarantors
    /// @param id id
    function getGuarantors(uint256 id) external view returns (address[] memory) { return guarantors[id]; }

    /// @notice maxBorrowable
    /// @param user user
    /// @return _uint256 _uint256
    function maxBorrowable(address user) external view returns (uint256) { return _maxBorrowable(user); }

    /// @notice amountOwed
    /// @param id id
    /// @return remaining remaining
    /// @return overdue overdue
    /// @return defaultable defaultable
    function amountOwed(uint256 id) external view returns (uint256 remaining, bool overdue, bool defaultable) {
        Loan storage l = loans[id];
        if (l.state != LoanState.ACTIVE && l.state != LoanState.GRACE && l.state != LoanState.RESTRUCTURED) return (0, false, false);
        uint256 interest = (l.principal * l.interestBps) / 10000;
        uint256 total = l.principal + interest;
        remaining = total > l.amountRepaid ? total - l.amountRepaid : 0;
        overdue = block.timestamp >= l.deadline;
        defaultable = block.timestamp >= l.deadline + GRACE_PERIOD;
    }

    /// @notice getStats
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    function getStats() external view returns (uint256, uint256, uint256, uint256, uint256) {
        return (totalLoans, totalVolume, totalDefaults, totalRestructured, totalProtocolFees);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          DAO ADMINISTRATION
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice setScoreTiers
    /// @param t1 t1
    /// @param t2 t2
    /// @param t3 t3
    /// @param t4 t4
    function setScoreTiers(uint256 t1, uint256 t2, uint256 t3, uint256 t4) external onlyDAO {
        if (t1 > t2 || t2 > t3 || t3 > t4) revert TL_InvalidTerms();
        tier1Limit = t1; tier2Limit = t2; tier3Limit = t3; tier4Limit = t4;
        emit TiersUpdated(t1, t2, t3, t4);
    }

    /// @notice setPaused
    /// @param _p _p
    function setPaused(bool _p) external onlyDAO { paused = _p; }

    // H-6 FIX: Timelocked DAO rotation to prevent instant governance capture on key compromise
    /// @notice pendingDAO_TL
    address public pendingDAO_TL;
    /// @notice pendingDAOAt_TL
    uint64 public pendingDAOAt_TL;
    /// @notice DAO_CHANGE_DELAY_TL
    uint64 public constant DAO_CHANGE_DELAY_TL = 48 hours;
    /// @notice DAOChangeProposed_TL
    /// @param newDAO newDAO
    /// @param effectiveAt effectiveAt
    event DAOChangeProposed_TL(address indexed newDAO, uint64 effectiveAt);
    /// @notice DAOChangeCancelled_TL
    event DAOChangeCancelled_TL();

    /// @notice setDAO
    /// @param _d _d
    function setDAO(address _d) external onlyDAO {
        if (_d == address(0)) revert TL_Zero();
        pendingDAO_TL = _d;
        pendingDAOAt_TL = uint64(block.timestamp) + DAO_CHANGE_DELAY_TL;
        emit DAOChangeProposed_TL(_d, pendingDAOAt_TL);
    }

    /// @notice applyDAO
    function applyDAO() external onlyDAO {
        require(pendingDAOAt_TL != 0 && block.timestamp >= pendingDAOAt_TL, "TL: timelock");
        dao = pendingDAO_TL;
        delete pendingDAO_TL;
        delete pendingDAOAt_TL;
    }

    /// @notice cancelDAOChange
    function cancelDAOChange() external onlyDAO {
        require(pendingDAOAt_TL != 0, "TL: no pending");
        delete pendingDAO_TL;
        delete pendingDAOAt_TL;
        emit DAOChangeCancelled_TL();
    }
    /// @notice setSeer
    /// @param _s _s
    function setSeer(address _s) external onlyDAO { seer = ISeerTL(_s); }
    /// @notice setVaultHub
    /// @param _v _v
    function setVaultHub(address _v) external onlyDAO { vaultHub = IVaultHubTL(_v); }
    // slither-disable-next-line missing-zero-check
    /// @notice setFeeDistributor
    /// @param _f _f
    function setFeeDistributor(address _f) external onlyDAO { feeDistributor = _f; }
    /// @notice H-25 FIX: authorize/deauthorize a revenue router that may call payFromRevenue.
    /// @param router router
    /// @param allowed allowed
    function setAuthorizedRevenueRouter(address router, bool allowed) external onlyDAO {
        if (router == address(0)) revert TL_Zero();
        isAuthorizedRevenueRouter[router] = allowed;
    }
    // slither-disable-next-line missing-zero-check
    /// @notice setFraudRegistry
    /// @param _fr _fr
    function setFraudRegistry(address _fr) external onlyDAO { fraudRegistry = _fr; }
}
