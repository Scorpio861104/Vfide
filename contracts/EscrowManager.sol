// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * EscrowManager (zkSync Era ready) — FINAL
 * ---------------------------------------------
 * Provides "Safe Buy" functionality for commerce.
 * - Holds funds until delivery is confirmed or timeout expires.
 * - Dynamic release times based on Merchant ProofScore.
 * - Dispute resolution via DAO or designated Arbiter.
 */

import "./SharedInterfaces.sol";

error ESC_Zero();
error ESC_BadState();
error ESC_NotArbiter();
error ESC_NotBuyer();
error ESC_NotMerchant();
error ESC_TooEarly();
error ESC_HighValueRequiresDAO();

// C-4 Fix: Add ReentrancyGuard for security
contract EscrowManager is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed merchant, uint256 amount, uint256 releaseTime, uint256 lockPeriod, uint256 timestamp);
    event EscrowReleased(uint256 indexed escrowId, address indexed to);
    event EscrowRefunded(uint256 indexed escrowId);
    event DisputeRaised(uint256 indexed escrowId, address indexed by);
    event DisputeResolved(uint256 indexed escrowId, address indexed winner);
    event EscrowNearTimeout(uint256 indexed escrowId, uint256 timeRemaining); // H-8 Fix

    enum State { CREATED, RELEASED, REFUNDED, DISPUTED }

    struct Escrow {
        address buyer;
        address merchant;
        address token;
        uint256 amount;
        uint256 createdAt;
        uint256 releaseTime; // When merchant can claim
        State state;
        string orderId;
    }

    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;
    
    address public arbiter; // DAO or specialized court
    ISeer public seer;
    address public dao; // For high-value disputes
    /// @notice Threshold above which disputes require DAO approval (10,000 VFIDE)
    uint256 public constant HIGH_VALUE_THRESHOLD = 10_000 * 1e18;
    address public pendingArbiter;
    uint256 public arbiterChangeTime;
    uint256 public constant ARBITER_TIMELOCK = 7 days;

    constructor(address _arbiter, address _seer) {
        require(_arbiter != address(0) && _seer != address(0), "zero address");
        arbiter = _arbiter;
        seer = ISeer(_seer);
        dao = _arbiter; // Initially DAO is arbiter
    }

    // 1. Create Escrow (Buyer pays)
    // C-4 Fix: Add nonReentrant modifier
    function createEscrow(
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId
    ) external nonReentrant returns (uint256) {
        require(merchant != address(0) && token != address(0), "zero address");
        require(msg.sender != address(0), "buyer zero address");
        require(amount > 0, "zero amount");

        // C-5 Fix: Use safeTransferFrom for non-standard tokens (USDT, etc.)
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate Release Time based on Trust (0-10000 scale)
        uint256 lockPeriod = 14 days; // Default
        if (address(seer) != address(0)) {
            uint16 score = seer.getScore(merchant);
            if (score >= 8000) lockPeriod = 3 days;       // High Trust (80%+)
            else if (score >= 6000) lockPeriod = 7 days;  // Medium Trust (60%+)
        }

        uint256 id = ++escrowCount;
        escrows[id] = Escrow({
            buyer: msg.sender,
            merchant: merchant,
            token: token,
            amount: amount,
            createdAt: block.timestamp,
            releaseTime: block.timestamp + lockPeriod,
            state: State.CREATED,
            orderId: orderId
        });

        emit EscrowCreated(id, msg.sender, merchant, amount, escrows[id].releaseTime, lockPeriod, block.timestamp);
        return id;
    }

    // 2. Release Funds (Buyer confirms receipt)
    // C-4 Fix: Add nonReentrant modifier
    function release(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(msg.sender == e.buyer, "not buyer");
        require(e.state == State.CREATED, "bad state");

        e.state = State.RELEASED;
        IERC20(e.token).safeTransfer(e.merchant, e.amount);
        
        // WHITEPAPER: Commerce Incentives (FREE) - Buyer +2, Merchant +5 ProofScore points
        if (address(seer) != address(0)) {
            try seer.reward(e.buyer, 2, "commerce_buyer") {} catch {}
            try seer.reward(e.merchant, 5, "commerce_merchant") {} catch {}
        }

        emit EscrowReleased(id, e.merchant);
    }

    // 3. Refund (Merchant cancels/refunds)
    // C-4 Fix: Add nonReentrant modifier
    function refund(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(msg.sender == e.merchant, "not merchant");
        require(e.state == State.CREATED, "bad state"); // H-19: Cannot refund during dispute

        e.state = State.REFUNDED;
        IERC20(e.token).safeTransfer(e.buyer, e.amount);
        
        emit EscrowRefunded(id);
    }

    // 4. Claim Timeout (Merchant claims after wait period)
    // C-4 Fix: Add nonReentrant modifier
    function claimTimeout(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(msg.sender == e.merchant, "not merchant");
        require(e.state == State.CREATED, "bad state");
        require(block.timestamp >= e.releaseTime, "too early");

        e.state = State.RELEASED;
        IERC20(e.token).safeTransfer(e.merchant, e.amount);
        
        emit EscrowReleased(id, e.merchant);
    }

    // 5. Raise Dispute (Either party can dispute per WHITEPAPER)
    function raiseDispute(uint256 id) external {
        Escrow storage e = escrows[id];
        // WHITEPAPER: "Either party can call dispute(id, reason)"
        require(msg.sender == e.buyer || msg.sender == e.merchant, "not party");
        require(e.state == State.CREATED, "bad state");

        e.state = State.DISPUTED;
        emit DisputeRaised(id, msg.sender);
    }

    // Admin: Propose Arbiter Change (with timelock)
    function proposeArbiterChange(address newArbiter) external {
        require(msg.sender == dao, "only DAO");
        require(newArbiter != address(0), "zero address");
        pendingArbiter = newArbiter;
        arbiterChangeTime = block.timestamp + ARBITER_TIMELOCK;
    }
    
    function executeArbiterChange() external {
        require(block.timestamp >= arbiterChangeTime, "timelock active");
        require(pendingArbiter != address(0), "no pending change");
        arbiter = pendingArbiter;
        pendingArbiter = address(0);
    }
    
    function setDAO(address newDAO) external {
        require(msg.sender == dao, "only DAO");
        require(newDAO != address(0), "zero address");
        dao = newDAO;
    }
    
    // H-8 Fix: View function to check escrows nearing timeout
    function checkTimeout(uint256 id) external view returns (bool isNearTimeout, uint256 timeRemaining) {
        Escrow storage e = escrows[id];
        if (e.state != State.CREATED) return (false, 0);
        
        if (block.timestamp >= e.releaseTime) {
            return (true, 0); // Already timed out
        }
        
        timeRemaining = e.releaseTime - block.timestamp;
        // Near timeout if less than 24 hours remaining
        isNearTimeout = timeRemaining <= 24 hours;
    }
    
    // H-8 Fix: Anyone can trigger timeout warning (off-chain monitoring)
    function notifyTimeout(uint256 id) external {
        Escrow storage e = escrows[id];
        require(e.state == State.CREATED, "escrow not active");
        require(block.timestamp < e.releaseTime, "already timed out");
        
        uint256 timeRemaining = e.releaseTime - block.timestamp;
        require(timeRemaining <= 24 hours, "not near timeout");
        
        emit EscrowNearTimeout(id, timeRemaining);
    }
    
    // 6. Resolve Dispute (Arbiter decides)
    // C-4 Fix: Add nonReentrant modifier
    function resolveDispute(uint256 id, bool refundBuyer) external nonReentrant {
        require(msg.sender == arbiter && arbiter != address(0), "ES: not arbiter");
        Escrow storage e = escrows[id];
        require(e.state == State.DISPUTED, "not disputed");
        
        // C-5: High-value disputes require DAO confirmation
        if (e.amount > HIGH_VALUE_THRESHOLD) {
            require(msg.sender == dao, "high value requires DAO");
        }

        if (refundBuyer) {
            e.state = State.REFUNDED;
            IERC20(e.token).safeTransfer(e.buyer, e.amount);
            
            // Punish Merchant
            if (address(seer) != address(0)) {
                try seer.punish(e.merchant, 50, "dispute_lost") {} catch {}
            }
            emit DisputeResolved(id, e.buyer);
        } else {
            e.state = State.RELEASED;
            IERC20(e.token).safeTransfer(e.merchant, e.amount);
            
            // Punish Buyer (frivolous dispute)
            if (address(seer) != address(0)) {
                try seer.punish(e.buyer, 20, "dispute_lost") {} catch {}
            }
            emit DisputeResolved(id, e.merchant);
        }
    }
    
    // Add event for partial resolution
    event DisputeResolvedPartial(uint256 indexed id, uint256 buyerAmount, uint256 merchantAmount);
    
    /**
     * @notice Resolve dispute with partial split
     * @param id Escrow ID
     * @param buyerShareBps Buyer's share in basis points (0-10000)
     * @dev Allows arbiter to split funds fairly when both parties have valid claims
     */
    // C-4 Fix: Add nonReentrant modifier
    function resolveDisputePartial(uint256 id, uint256 buyerShareBps) external nonReentrant {
        require(msg.sender == arbiter && arbiter != address(0), "ES: not arbiter");
        require(buyerShareBps <= 10000, "ES: invalid bps");
        
        Escrow storage e = escrows[id];
        require(e.state == State.DISPUTED, "not disputed");
        
        // C-5: High-value disputes require DAO confirmation
        if (e.amount > HIGH_VALUE_THRESHOLD) {
            require(msg.sender == dao, "high value requires DAO");
        }
        
        e.state = State.RELEASED; // Using RELEASED for partial resolution
        
        uint256 buyerAmount = (e.amount * buyerShareBps) / 10000;
        uint256 merchantAmount = e.amount - buyerAmount;
        
        if (buyerAmount > 0) {
            IERC20(e.token).safeTransfer(e.buyer, buyerAmount);
        }
        if (merchantAmount > 0) {
            IERC20(e.token).safeTransfer(e.merchant, merchantAmount);
        }
        
        // Minimal penalty for both in split cases (neither fully at fault)
        if (address(seer) != address(0)) {
            try seer.punish(e.buyer, 5, "dispute_split") {} catch {}
            try seer.punish(e.merchant, 5, "dispute_split") {} catch {}
        }
        
        emit DisputeResolvedPartial(id, buyerAmount, merchantAmount);
    }
}
