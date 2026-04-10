// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { Time } from "@openzeppelin/contracts/utils/types/Time.sol";
import "./SharedInterfaces.sol";

/**
 * VFIDEFlashLoan — Peer-to-Peer Atomic Flash Loans
 * ────────────────────────────────────────────────────────
 *
 * Individual lenders offer their own VFIDE for flash loans.
 * Borrowers borrow from a specific lender. Fees go to that lender.
 * Everything is atomic — if the borrower doesn't repay, the tx reverts.
 * No protocol pool. No common fund. Pure peer-to-peer.
 *
 * HOWEY ANALYSIS:
 *   ✅ PRONG 1 (Investment of Money): FAILS — Each lender makes an
 *      individual decision to offer their own tokens. Not pooled.
 *      Analogous to renting out your own property, not investing
 *      in a rental fund.
 *   ✅ PRONG 2 (Common Enterprise): FAILS — No pooling of funds.
 *      Each lender's balance is isolated. Lender A's returns are
 *      completely independent of Lender B. No horizontal commonality.
 *   ✅ PRONG 3 (Expectation of Profits): FAILS — Lender sets their
 *      own fee rate, manages their own liquidity, can withdraw anytime.
 *      Returns depend on the lender's own effort and decisions, not
 *      on protocol appreciation or team efforts.
 *   ✅ PRONG 4 (Efforts of Others): FAILS — Lender's returns depend
 *      on their own choices (fee rate, amount offered, whether to
 *      participate at all). Not on VFIDE team's managerial efforts.
 *   RESULT: FAILS all 4 prongs → NOT A SECURITY.
 *
 * HOW IT WORKS:
 *   LENDER SIDE:
 *     1. Lender deposits VFIDE: deposit(amount)
 *     2. Lender sets their fee rate: setFeeRate(bps)  (within protocol caps)
 *     3. Lender can withdraw anytime: withdraw(amount)
 *     4. Lender can pause their offering: setLenderPaused(true)
 *
 *   BORROWER SIDE:
 *     1. Borrower picks a lender with enough liquidity (findBestLender)
 *     2. Borrower calls flashLoan(lender, receiver, amount, data)
 *     3. Contract sends `amount` to receiver
 *     4. Receiver.onFlashLoan() executes borrower's strategy
 *     5. Contract pulls `amount + fee` back from receiver
 *     6. Fee split: 90% to lender, 10% to protocol (FeeDistributor)
 *     7. If repayment fails → entire transaction reverts
 *
 *   The lender's funds are NEVER at risk. Atomic or nothing.
 */

// ── Interfaces ──────────────────────────────────────────────────────────────

interface IERC3156FlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

interface ISeerFL {
    function getScore(address subject) external view returns (uint16);
    function reward(address subject, uint16 delta, string calldata reason) external;
}

// ── Errors ──────────────────────────────────────────────────────────────────

error FL_ExceedsAvailable();
error FL_CallbackFailed();
error FL_InsufficientRepayment();
error FL_LenderPaused();
error FL_Paused();
error FL_NotDAO();
error FL_Zero();
error FL_FeeTooHigh();
error FL_CooldownActive();
error FL_NotLender();
error FL_InsufficientBalance();

// ── Contract ────────────────────────────────────────────────────────────────

contract VFIDEFlashLoan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════

    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    /// @notice Maximum fee a lender can charge (1% = 100 bps)
    uint256 public constant MAX_LENDER_FEE_BPS = 100;

    /// @notice Protocol's cut of each flash loan fee (10% of the fee)
    /// Goes to FeeDistributor → 5-way community split
    uint256 public constant PROTOCOL_CUT_PCT = 10;

    /// @notice Default fee if lender hasn't set one (0.09% = 9 bps)
    uint256 public constant DEFAULT_FEE_BPS = 9;

    /// @notice Cooldown between flash loans per borrower (anti-spam)
    uint256 public constant BORROWER_COOLDOWN = 12;

    /// @notice ProofScore reward for lenders per loan facilitated (+0.1)
    uint16 public constant LENDER_REWARD = 1;

    /// @notice Cap on registered lenders for gas-safe iteration
    uint256 public constant MAX_LENDERS = 500;

    // ═══════════════════════════════════════════════════════════════════════
    //                              TYPES
    // ═══════════════════════════════════════════════════════════════════════

    struct LenderInfo {
        uint256 balance;          // VFIDE available for flash loans
        uint256 feeBps;           // Fee rate in basis points
        uint256 totalEarned;      // Lifetime fees earned
        uint256 totalVolume;      // Lifetime volume lent
        uint256 loanCount;        // Loans facilitated
        bool paused;              // Lender can pause
        bool registered;          // Has deposited at least once
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════

    IERC20 public immutable vfideToken;
    address public dao;
    ISeerFL public seer;
    address public feeDistributor;

    bool public paused;

    mapping(address => LenderInfo) public lenders;
    address[] public lenderList;
    mapping(address => uint256) public lastFlashLoan;

    uint256 public totalProtocolFees;
    uint256 public totalVolume;
    uint256 public totalLoans;

    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event LenderDeposited(address indexed lender, uint256 amount, uint256 newBalance);
    event LenderWithdrawn(address indexed lender, uint256 amount, uint256 newBalance);
    event LenderFeeSet(address indexed lender, uint256 feeBps);
    event LenderPaused(address indexed lender, bool isPaused);
    event FlashLoanExecuted(
        address indexed lender, address indexed borrower,
        address receiver, uint256 amount, uint256 lenderFee, uint256 protocolFee
    );
    event Paused(bool isPaused);
    event DAOSet(address indexed newDao);
    event SeerSet(address indexed newSeer);
    event FeeDistributorSet(address indexed newFeeDistributor);

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

    modifier onlyDAO() { if (msg.sender != dao) revert FL_NotDAO(); _; }
    modifier whenNotPaused() { if (paused) revert FL_Paused(); _; }

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    constructor(address _vfideToken, address _dao, address _seer, address _feeDistributor) {
        if (_vfideToken == address(0) || _dao == address(0) || _feeDistributor == address(0)) revert FL_Zero();
        vfideToken = IERC20(_vfideToken);
        dao = _dao;
        if (_seer != address(0)) seer = ISeerFL(_seer);
        feeDistributor = _feeDistributor;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          LENDER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Deposit VFIDE to offer for flash loans
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert FL_Zero();

        LenderInfo storage info = lenders[msg.sender];
        if (!info.registered) {
            require(lenderList.length < MAX_LENDERS, "FL: lender cap");
            info.registered = true;
            info.feeBps = DEFAULT_FEE_BPS;
            lenderList.push(msg.sender);
        }

        info.balance += amount;
        vfideToken.safeTransferFrom(msg.sender, address(this), amount);
        emit LenderDeposited(msg.sender, amount, info.balance);
    }

    /// @notice Withdraw VFIDE — available anytime, no lockup
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert FL_Zero();
        LenderInfo storage info = lenders[msg.sender];
        if (amount > info.balance) revert FL_InsufficientBalance();

        info.balance -= amount;
        vfideToken.safeTransfer(msg.sender, amount);
        emit LenderWithdrawn(msg.sender, amount, info.balance);
    }

    /// @notice Set your flash loan fee rate (max 1%)
    function setFeeRate(uint256 feeBps) external {
        if (feeBps > MAX_LENDER_FEE_BPS) revert FL_FeeTooHigh();
        lenders[msg.sender].feeBps = feeBps;
        emit LenderFeeSet(msg.sender, feeBps);
    }

    /// @notice Pause/unpause your flash loan offering
    function setLenderPaused(bool _paused) external {
        lenders[msg.sender].paused = _paused;
        emit LenderPaused(msg.sender, _paused);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          FLASH LOAN EXECUTION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Borrow from a specific lender — atomic, same-transaction
     * @param lender Address of the lender to borrow from
     * @param receiver Contract implementing IERC3156FlashBorrower
     * @param amount Amount to borrow
     * @param data Passed through to receiver.onFlashLoan()
     *
     * If receiver doesn't repay amount + fee, the entire tx reverts.
     * Lender funds are mathematically impossible to lose.
     */
    // slither-disable-next-line arbitrary-send-erc20
    function flashLoan(
        address lender,
        IERC3156FlashBorrower receiver,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant whenNotPaused returns (bool) {
        if (amount == 0) revert FL_Zero();

        LenderInfo storage info = lenders[lender];
        if (!info.registered) revert FL_NotLender();
        if (info.paused) revert FL_LenderPaused();
        if (amount > info.balance) revert FL_ExceedsAvailable();

        // Anti-spam cooldown
        if (Time.timestamp() < lastFlashLoan[msg.sender] + BORROWER_COOLDOWN) revert FL_CooldownActive();
        lastFlashLoan[msg.sender] = Time.timestamp();

        // Fee calculation: lender's rate applied to loan amount
        uint256 totalFee = Math.mulDiv(amount, info.feeBps, 10_000);
        uint256 protocolFee = Math.mulDiv(amount, info.feeBps * PROTOCOL_CUT_PCT, 1_000_000); // 10% of fee → protocol
        uint256 lenderFee = totalFee - protocolFee;                                            // 90% of fee → lender

        // ── ATOMIC EXECUTION ─────────────────────────────────────

        // Optimistic accounting; any failed callback or repayment reverts the whole transaction.
        info.balance = info.balance - amount + amount + lenderFee;
        info.totalEarned += lenderFee;
        info.totalVolume += amount;
        info.loanCount++;
        totalProtocolFees += protocolFee;
        totalVolume += amount;
        totalLoans++;

        // 1. Send tokens to receiver
        vfideToken.safeTransfer(address(receiver), amount);

        // 2. Callback — borrower executes strategy
        bytes32 cbResult = receiver.onFlashLoan(msg.sender, address(vfideToken), amount, totalFee, data);
        if (cbResult != CALLBACK_SUCCESS) revert FL_CallbackFailed();

        // 3. Pull repayment
        uint256 balBefore = vfideToken.balanceOf(address(this));
        vfideToken.safeTransferFrom(address(receiver), address(this), amount + totalFee);
        if (vfideToken.balanceOf(address(this)) < balBefore + amount + totalFee) revert FL_InsufficientRepayment();

        // Protocol fee → FeeDistributor → 5-way community split
        if (protocolFee > 0) {
            vfideToken.safeTransfer(feeDistributor, protocolFee);
        }

        // Reward lender with ProofScore (providing a community service)
        if (address(seer) != address(0)) {
            try seer.reward(lender, LENDER_REWARD, "flashloan_lender") {} catch {}
        }

        emit FlashLoanExecuted(lender, msg.sender, address(receiver), amount, lenderFee, protocolFee);
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice How much a specific lender has available
    function maxFlashLoan(address lender) external view returns (uint256) {
        LenderInfo storage info = lenders[lender];
        if (!info.registered || info.paused) return 0;
        return info.balance;
    }

    /// @notice Calculate total fee for borrowing from a specific lender
    function flashFee(address lender, uint256 amount) external view returns (uint256) {
        return (amount * lenders[lender].feeBps) / 10000;
    }

    /// @notice Get full lender info
    function getLenderInfo(address lender) external view returns (
        uint256 balance, uint256 feeBps, uint256 earned,
        uint256 volume, uint256 loans, bool isPaused, bool isRegistered
    ) {
        LenderInfo storage i = lenders[lender];
        return (i.balance, i.feeBps, i.totalEarned, i.totalVolume, i.loanCount, i.paused, i.registered);
    }

    /// @notice Number of registered lenders
    function lenderCount() external view returns (uint256) { return lenderList.length; }

    /// @notice Paginated lender list (for frontend discovery)
    function getLenders(uint256 offset, uint256 limit) external view returns (address[] memory result) {
        uint256 len = lenderList.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        if (end - offset > 100) end = offset + 100;
        result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = lenderList[i];
        }
    }

    /// @notice Find cheapest lender with enough liquidity
    function findBestLender(uint256 amount) external view returns (address best, uint256 bestFee) {
        bestFee = type(uint256).max;
        uint256 len = lenderList.length;
        for (uint256 i = 0; i < len && i < 200; i++) {
            LenderInfo storage info = lenders[lenderList[i]];
            if (!info.paused && info.balance >= amount && info.feeBps < bestFee) {
                best = lenderList[i];
                bestFee = info.feeBps;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                          DAO ADMINISTRATION
    // ═══════════════════════════════════════════════════════════════════════

    function setPaused(bool _paused) external onlyDAO { paused = _paused; emit Paused(_paused); }
    function setDAO(address _dao) external onlyDAO { if (_dao == address(0)) revert FL_Zero(); dao = _dao; emit DAOSet(_dao); }
    function setSeer(address _seer) external onlyDAO { seer = ISeerFL(_seer); emit SeerSet(_seer); }
    function setFeeDistributor(address _fd) external onlyDAO {
        if (_fd == address(0)) revert FL_Zero();
        feeDistributor = _fd;
        emit FeeDistributorSet(_fd);
    }
}
