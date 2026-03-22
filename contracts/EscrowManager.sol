// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title EscrowManager (zkSync Era ready) — FINAL
 * @notice High-security escrow for commerce with ProofScore-based protections.
 * @dev I-14 Architecture Note: Two escrow systems exist by design:
 *   - EscrowManager (this): For high-value/custom trades requiring arbiter
 *     dispute resolution, ProofScore-dynamic lock periods, and DAO oversight.
 *   - CommerceEscrow (VFIDECommerce.sol): For standard e-commerce payments
 *     via the MerchantPortal with simpler state-machine flow.
 *
 * Key differences from CommerceEscrow:
 *   - Arbiter-based dispute resolution (vs DAO-only)
 *   - ProofScore-dynamic release timeouts
 *   - Higher-value trade support with DAO approval for large amounts
 *   - SeerAutonomous behavioral pre-checks
 */

import "./SharedInterfaces.sol";

interface ISeerAutonomous_ESC {
    function beforeAction(address subject, uint8 action, uint256 amount, address counterparty) external returns (uint8);
}

error ESC_Zero();
error ESC_BadState();
error ESC_NotArbiter();
error ESC_NotBuyer();
error ESC_NotMerchant();
error ESC_TooEarly();
error ESC_HighValueRequiresDAO();
error ESC_ActionBlocked(uint8 result);

contract EscrowManager is ReentrancyGuard {
        uint256 public constant MIN_LOCK_PERIOD = 3 days; // F-18 FIX: Enforce minimum lock period regardless of score
    using SafeERC20 for IERC20;
    
    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed merchant, uint256 amount, uint256 releaseTime, uint256 lockPeriod, uint256 timestamp);
    event EscrowReleased(uint256 indexed escrowId, address indexed to);
    event EscrowRefunded(uint256 indexed escrowId);
    event DisputeRaised(uint256 indexed escrowId, address indexed by);
    event DisputeResolved(uint256 indexed escrowId, address indexed winner);
    event EscrowNearTimeout(uint256 indexed escrowId, uint256 timeRemaining);

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
    ISeerAutonomous_ESC public seerAutonomous;
    address public dao; // For high-value disputes
    /// @notice Threshold above which disputes require DAO approval (10,000 VFIDE)
    uint256 public constant HIGH_VALUE_THRESHOLD = 10_000 * 1e18;
    address public pendingArbiter;
    uint256 public arbiterChangeTime;
    uint256 public constant ARBITER_TIMELOCK = 7 days;
    uint256 public constant DISPUTE_TIMEOUT = 90 days;

    constructor(address _arbiter, address _seer) {
        require(_arbiter != address(0) && _seer != address(0), "zero address");
        arbiter = _arbiter;
        seer = ISeer(_seer);
        dao = msg.sender; // Keep DAO governance independent from arbiter role
        // C-2 FIX: Initialize arbiterChangeTime to max to prevent instant execution
        arbiterChangeTime = type(uint256).max;
    }

    // 1. Create Escrow (Buyer pays)
    function createEscrow(
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId
    ) external nonReentrant returns (uint256) {
        require(merchant != address(0) && token != address(0), "zero address");
        require(msg.sender != address(0), "buyer zero address");
        require(amount > 0, "zero amount");

        // Calculate Release Time based on Trust (0-10000 scale)
        uint256 lockPeriod = 14 days; // Default
        if (address(seer) != address(0)) {
            // F-18 FIX: Use getCachedScore (reflects longer-term cached behavior) instead of live getScore
            // to reduce the impact of temporary score pump-and-dump attacks.
            uint16 score = seer.getCachedScore(merchant);
            if (score >= 8000) lockPeriod = 3 days;       // High Trust (80%+)
            else if (score >= 6000) lockPeriod = 7 days;  // Medium Trust (60%+)
        }
        // F-18 FIX: Enforce minimum lock period as a safety net
        require(lockPeriod >= MIN_LOCK_PERIOD, "ESC: lock period too short");

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

        _enforceSeerAction(msg.sender, 7, amount, merchant); // Trade

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowCreated(id, msg.sender, merchant, amount, escrows[id].releaseTime, lockPeriod, block.timestamp);
        return id;
    }

    // 2. Release Funds (Buyer confirms receipt)
    function release(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(msg.sender == e.buyer, "not buyer");
        require(e.state == State.CREATED, "bad state");

        e.state = State.RELEASED;
        _enforceSeerAction(msg.sender, 7, e.amount, e.merchant); // Trade
        IERC20(e.token).safeTransfer(e.merchant, e.amount);
        
        // WHITEPAPER: Commerce Incentives (FREE) - Buyer +2, Merchant +5 ProofScore points
        if (address(seer) != address(0)) {
            try seer.reward(e.buyer, 2, "commerce_buyer") {} catch {}
            try seer.reward(e.merchant, 5, "commerce_merchant") {} catch {}
        }

        emit EscrowReleased(id, e.merchant);
    }

    // 3. Refund (Merchant cancels/refunds)
    function refund(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(msg.sender == e.merchant, "not merchant");
        require(e.state == State.CREATED, "bad state"); // H-19: Cannot refund during dispute

        e.state = State.REFUNDED;
        _enforceSeerAction(msg.sender, 7, e.amount, e.buyer); // Trade
        IERC20(e.token).safeTransfer(e.buyer, e.amount);
        
        emit EscrowRefunded(id);
    }

    // 4. Claim Timeout (Merchant claims after wait period)
    function claimTimeout(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(msg.sender == e.merchant, "not merchant");
        require(e.state == State.CREATED, "bad state");
        require(block.timestamp >= e.releaseTime, "too early");

        e.state = State.RELEASED;
        _enforceSeerAction(msg.sender, 7, e.amount, e.buyer); // Trade
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
        // C-1 FIX: Only DAO can execute arbiter change
        require(msg.sender == dao, "only DAO");
        require(block.timestamp >= arbiterChangeTime, "timelock active");
        require(pendingArbiter != address(0), "no pending change");
        // C-2 FIX: Additional check that timelock was actually set
        require(arbiterChangeTime != type(uint256).max, "no pending proposal");
        
        address oldArbiter = arbiter;
        arbiter = pendingArbiter;
        pendingArbiter = address(0);
        arbiterChangeTime = type(uint256).max; // Reset timelock
        
        emit ArbiterChanged(oldArbiter, arbiter);
    }
    
    /// @notice Cancel pending arbiter change
    function cancelArbiterChange() external {
        require(msg.sender == dao, "only DAO");
        require(pendingArbiter != address(0), "no pending change");
        pendingArbiter = address(0);
        arbiterChangeTime = type(uint256).max;
    }
    
    // L-1 FIX: Add event for arbiter change
    event ArbiterChanged(address indexed oldArbiter, address indexed newArbiter);
    event SeerAutonomousSet(address indexed seerAutonomous);
    
    function setDAO(address newDAO) external {
        require(msg.sender == dao, "only DAO");
        require(newDAO != address(0), "zero address");
        dao = newDAO;
    }

    function setSeerAutonomous(address _seerAutonomous) external {
        require(msg.sender == dao, "only DAO");
        seerAutonomous = ISeerAutonomous_ESC(_seerAutonomous);
        emit SeerAutonomousSet(_seerAutonomous);
    }

    function _enforceSeerAction(address subject, uint8 action, uint256 amount, address counterparty) internal {
        if (address(seerAutonomous) == address(0)) return;

        uint8 result = 0;
        try seerAutonomous.beforeAction(subject, action, amount, counterparty) returns (uint8 r) {
            result = r;
        } catch {
            revert ESC_ActionBlocked(255);
        }

        // 0=Allowed,1=Warned,2=Delayed,3=Blocked,4=Penalized
        if (result >= 2) revert ESC_ActionBlocked(result);
    }
    
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
    
    function notifyTimeout(uint256 id) external {
        Escrow storage e = escrows[id];
        require(e.state == State.CREATED, "escrow not active");
        require(block.timestamp < e.releaseTime, "already timed out");
        
        uint256 timeRemaining = e.releaseTime - block.timestamp;
        require(timeRemaining <= 24 hours, "not near timeout");
        
        emit EscrowNearTimeout(id, timeRemaining);
    }
    
    // 6. Resolve Dispute (Arbiter decides, DAO for high-value)
    function resolveDispute(uint256 id, bool refundBuyer) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.state == State.DISPUTED, "not disputed");
        
        require(msg.sender != e.buyer && msg.sender != e.merchant, "ES: conflict of interest");
        
        // C-5: High-value disputes require DAO, normal disputes require arbiter
        if (e.amount > HIGH_VALUE_THRESHOLD) {
            require(msg.sender == dao && dao != address(0), "ES: high value requires DAO");
        } else {
            require(msg.sender == arbiter && arbiter != address(0), "ES: not arbiter");
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
    function resolveDisputePartial(uint256 id, uint256 buyerShareBps) external nonReentrant {
        require(buyerShareBps <= 10000, "ES: invalid bps");
        
        Escrow storage e = escrows[id];
        require(e.state == State.DISPUTED, "not disputed");

        // Keep conflict-of-interest guard consistent with full dispute resolution.
        require(msg.sender != e.buyer && msg.sender != e.merchant, "ES: conflict of interest");
        
        // C-5: High-value disputes require DAO, normal disputes require arbiter
        if (e.amount > HIGH_VALUE_THRESHOLD) {
            require(msg.sender == dao && dao != address(0), "ES: high value requires DAO");
        } else {
            require(msg.sender == arbiter && arbiter != address(0), "ES: not arbiter");
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

    /// @notice Fallback resolution path if a dispute is deadlocked for too long.
    /// @dev Returns funds to buyer after long unresolved period.
    function timeoutResolve(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.state == State.DISPUTED, "not disputed");
        require(block.timestamp >= e.createdAt + DISPUTE_TIMEOUT, "ESC: timeout not reached");

        e.state = State.REFUNDED;
        IERC20(e.token).safeTransfer(e.buyer, e.amount);
        emit DisputeResolved(id, e.buyer);
    }
}
