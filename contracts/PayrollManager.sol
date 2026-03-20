// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * PayrollManager — Streaming Salaries for Vfide
 * ---------------------------------------------
 * Allows employers to stream salaries to employees by the second.
 * - Zero legal risk (non-custodial, user-directed).
 * - Solves "Payday Lending" by giving access to earned wages instantly.
 * - Pause/resume functionality for disputes
 * - Rate modification support
 * - Emergency withdrawal capability
 */

interface IERC20_Pay {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Seer interface for ProofScore
interface ISeer_PM {
    function reward(address subject, uint16 delta, string calldata reason) external;
}

error PM_NotPayer();
error PM_NotPayee();
error PM_NotAuthorized();
error PM_StreamInactive();
error PM_StreamPaused();
error PM_StreamNotPaused();
error PM_InvalidRate();
error PM_InvalidPayee();
error PM_InvalidDeposit();
error PM_NothingDue();

contract PayrollManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Events
    event StreamCreated(uint256 indexed streamId, address indexed payer, address indexed payee, uint256 rate);
    event Withdraw(uint256 indexed streamId, address indexed payee, uint256 amount);
    event StreamCancelled(uint256 indexed streamId);
    event TopUp(uint256 indexed streamId, uint256 amount);
    event StreamPaused(uint256 indexed streamId, address indexed pausedBy);
    event StreamResumed(uint256 indexed streamId, address indexed resumedBy);
    event RateModified(uint256 indexed streamId, uint256 oldRate, uint256 newRate);
    event PayeeUpdated(uint256 indexed streamId, address indexed oldPayee, address indexed newPayee);
    event EmergencyWithdraw(uint256 indexed streamId, address indexed to, uint256 amount);

    struct Stream {
        address payer;
        address payee;
        address token;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 lastWithdrawTime;
        uint256 depositBalance; // Remaining balance
        bool active;
        bool paused;           // NEW: Pause state
        uint256 pausedAt;      // NEW: When paused
        uint256 pausedAccrued; // NEW: Accrued before pause
    }

    mapping(uint256 => Stream) public streams;
    uint256 public nextStreamId = 1;
    
    // NEW: DAO for emergency controls
    address public dao;
    
    // ProofScore integration
    ISeer_PM public seer;
    uint16 public constant PAYROLL_CREATE_REWARD = 5;     // +0.5 for creating stream
    uint16 public constant PAYROLL_WITHDRAW_REWARD = 1;   // +0.1 per withdrawal
    
    // NEW: Track streams by payer and payee
    mapping(address => uint256[]) private payerStreams;
    mapping(address => uint256[]) private payeeStreams;
    
    modifier onlyDAO() {
        require(msg.sender == dao, "PM: not DAO");
        _;
    }
    
    constructor(address _dao, address _seer) {
        require(_dao != address(0), "PM: zero DAO");
        dao = _dao;
        if (_seer != address(0)) seer = ISeer_PM(_seer);
    }
    
    function setDAO(address _dao) external onlyDAO {
        require(_dao != address(0), "PM: zero DAO");
        dao = _dao;
    }
    
    function setSeer(address _seer) external onlyDAO {
        seer = ISeer_PM(_seer);
    }
    
    /**
     * @dev Safe transfer helper for IERC20_Pay tokens
     */
    function _safeTransferPay(address token, address to, uint256 amount) internal {
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * Create a new salary stream.
     * @param payee Employee address
     * @param token Payment token (e.g. USDC, VFIDE)
     * @param rate Tokens per second (e.g. 3000 USDC / 30 days / 24h / 3600s)
     * @param initialDeposit Amount to deposit upfront
     */
    function createStream(address payee, address token, uint256 rate, uint256 initialDeposit) external returns (uint256) {
        if (payee == address(0)) revert PM_InvalidPayee();
        if (rate == 0) revert PM_InvalidRate();
        require(rate >= 1e12, "PM: rate too low");        if (initialDeposit == 0) revert PM_InvalidDeposit();

        uint256 id = nextStreamId++;
        streams[id] = Stream({
            payer: msg.sender,
            payee: payee,
            token: token,
            ratePerSecond: rate,
            startTime: block.timestamp,
            lastWithdrawTime: block.timestamp,
            depositBalance: initialDeposit,
            active: true,
            paused: false,
            pausedAt: 0,
            pausedAccrued: 0
        });
        
        // Track streams for both parties (I-11: capped)
        require(payerStreams[msg.sender].length < 200, "PM: payer stream cap");
        payerStreams[msg.sender].push(id);
        require(payeeStreams[payee].length < 200, "PM: payee stream cap");
        payeeStreams[payee].push(id);

        // Transfer tokens in
        IERC20(token).safeTransferFrom(msg.sender, address(this), initialDeposit);

        emit StreamCreated(id, msg.sender, payee, rate);
        
        // Reward payer for creating payroll stream
        if (address(seer) != address(0)) {
            try seer.reward(msg.sender, PAYROLL_CREATE_REWARD, "payroll_created") {} catch {}
        }
        return id;
    }

    /**
     * Add more funds to an existing stream
     */
    function topUp(uint256 streamId, uint256 amount) external nonReentrant {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (msg.sender != s.payer) revert PM_NotPayer();

        s.depositBalance += amount;
        IERC20(s.token).safeTransferFrom(msg.sender, address(this), amount);
        emit TopUp(streamId, amount);
    }
    
    /**
     * @notice Pause stream (payer or payee can pause)
     * @dev Useful for disputes, temporary suspension
     */
    function pauseStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (s.paused) revert PM_StreamPaused();
        if (msg.sender != s.payer && msg.sender != s.payee) revert PM_NotAuthorized();
        
        // Store accrued amount before pausing
        s.pausedAccrued = claimable(streamId);
        s.paused = true;
        s.pausedAt = block.timestamp;
        
        emit StreamPaused(streamId, msg.sender);
    }
    
    /**
     * @notice Resume paused stream
     * @dev Both payer and payee must agree to resume (or DAO can force)
     *      For simplicity, payer can resume their own stream
     * DEEP-C-3 FIX: Don't clear pausedAccrued on resume - it needs to be claimed first
     * The pausedAccrued will be cleared when payee withdraws
     */
    function resumeStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (!s.paused) revert PM_StreamNotPaused();
        if (msg.sender != s.payer && msg.sender != dao) revert PM_NotAuthorized();
        
        // Resume from current time
        s.lastWithdrawTime = block.timestamp;
        s.paused = false;
        // DEEP-C-3 FIX: pausedAccrued is NOT cleared here - it represents 
        // already-owed funds that payee can still claim. Clearing happens on withdraw.
        
        emit StreamResumed(streamId, msg.sender);
    }
    
    /**
     * @notice Modify stream rate (payer only)
     * @dev Settles current accrued before changing rate
     */
    function setRate(uint256 streamId, uint256 newRate) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (msg.sender != s.payer) revert PM_NotPayer();
        if (newRate == 0) revert PM_InvalidRate();
        uint256 oldRate = s.ratePerSecond;
        
        // Settle current accrued first
        uint256 due = claimable(streamId);
        if (due > 0 && !s.paused) {
            if (due > s.depositBalance) {
                due = s.depositBalance;
            }
            s.depositBalance -= due;
            s.lastWithdrawTime = block.timestamp;
            emit Withdraw(streamId, s.payee, due);
            _safeTransferPay(s.token, s.payee, due);
        }

        s.ratePerSecond = newRate;
        
        emit RateModified(streamId, oldRate, newRate);
    }
    
    /**
     * @notice Update payee address (payee only)
     * @dev Useful if payee's wallet is compromised
     */
    function updatePayee(uint256 streamId, address newPayee) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (msg.sender != s.payee) revert PM_NotPayee();
        if (newPayee == address(0)) revert PM_InvalidPayee();
        
        address oldPayee = s.payee;
        s.payee = newPayee;
        
        emit PayeeUpdated(streamId, oldPayee, newPayee);
    }
    
    /**
     * @notice Emergency withdraw by DAO (for contract migration or disputes)
     */
    function emergencyWithdraw(uint256 streamId, address to) external onlyDAO {
        Stream storage s = streams[streamId];
        require(s.active, "PM: stream inactive");
        require(to != address(0), "PM: zero address");
        
        uint256 balance = s.depositBalance;
        s.depositBalance = 0;
        s.active = false;

        emit EmergencyWithdraw(streamId, to, balance);
        
        _safeTransferPay(s.token, to, balance);
    }

    /**
     * Employee withdraws earned funds
     * Add nonReentrant to prevent reentrancy via malicious tokens
     */
    function withdraw(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        
        uint256 amount = claimable(streamId);
        if (amount < 1) revert PM_NothingDue();
        
        // Safety cap
        if (amount > s.depositBalance) {
            amount = s.depositBalance;
        }

        s.depositBalance -= amount;
        s.lastWithdrawTime = block.timestamp;
        
        // DEEP-C-3 FIX: Clear paused accrued on ANY withdraw, not just while paused
        // This prevents double-counting: after resume, pausedAccrued persists in claimable()
        // but must be cleared once actually withdrawn
        if (s.pausedAccrued > 0) {
            s.pausedAccrued = 0;
        }

        emit Withdraw(streamId, s.payee, amount);
        _safeTransferPay(s.token, s.payee, amount);
        
        // Reward payee for successful withdrawal
        if (address(seer) != address(0)) {
            try seer.reward(s.payee, PAYROLL_WITHDRAW_REWARD, "payroll_received") {} catch {}
        }
        
    }
    
    /**
     * Calculate how much is currently claimable
     */
    function claimable(uint256 streamId) public view returns (uint256) {
        Stream storage s = streams[streamId];
        if (!s.active) return 0;
        
        // If paused, return the frozen accrued amount
        if (s.paused) {
            return s.pausedAccrued;
        }
        
        uint256 timeDelta = block.timestamp - s.lastWithdrawTime;
        uint256 due = timeDelta * s.ratePerSecond;
        
        // Add any paused accrued (if resumed but not yet withdrawn)
        due += s.pausedAccrued;
        
        if (due > s.depositBalance) {
            return s.depositBalance;
        }
        return due;
    }

    /**
     * Cancel stream and return remaining funds to payer
     * Add nonReentrant to prevent reentrancy via malicious tokens
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (msg.sender != s.payer && msg.sender != s.payee) revert PM_NotAuthorized();
        if (!s.active) revert PM_StreamInactive();

        address token = s.token;
        address payee = s.payee;
        address payer = s.payer;

        // Settle pending
        uint256 due = claimable(streamId);
        if (due > s.depositBalance) {
            due = s.depositBalance;
        }

        uint256 remainder = s.depositBalance - due;
        s.depositBalance = 0;
        s.pausedAccrued = 0;
        s.active = false;

        if (due > 0) {
            emit Withdraw(streamId, payee, due);
            _safeTransferPay(token, payee, due);
        }

        // Return remainder to payer
        if (remainder > 0) {
            _safeTransferPay(token, payer, remainder);
        }
        emit StreamCancelled(streamId);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get full stream info
     */
    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }
    
    /**
     * @notice Get stream status summary
     */
    function getStreamStatus(uint256 streamId) external view returns (
        bool active,
        bool paused,
        uint256 currentClaimable,
        uint256 remainingBalance,
        uint256 ratePerSecond,
        uint256 runwaySeconds
    ) {
        Stream storage s = streams[streamId];
        active = s.active;
        paused = s.paused;
        currentClaimable = claimable(streamId);
        remainingBalance = s.depositBalance;
        ratePerSecond = s.ratePerSecond;
        runwaySeconds = s.ratePerSecond > 0 ? s.depositBalance / s.ratePerSecond : 0;
    }
    
    /**
     * @notice Estimate when stream will run out of funds
     */
    function estimateEndTime(uint256 streamId) external view returns (uint256) {
        Stream storage s = streams[streamId];
        if (!s.active || s.paused || s.ratePerSecond == 0) return 0;
        
        uint256 remaining = s.depositBalance;
        uint256 due = claimable(streamId);
        if (due >= remaining) return block.timestamp;
        
        remaining -= due;
        return block.timestamp + (remaining / s.ratePerSecond);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                     PAYER/PAYEE QUERY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get all stream IDs where user is payer (employer)
     */
    function getPayerStreams(address payer) external view returns (uint256[] memory) {
        return payerStreams[payer];
    }
    
    /**
     * @notice Get all stream IDs where user is payee (employee)
     */
    function getPayeeStreams(address payee) external view returns (uint256[] memory) {
        return payeeStreams[payee];
    }
    
    /**
     * @notice Get total obligations for a payer (total rate per second across all active streams)
     */
    function getTotalObligations(address payer) external view returns (
        uint256 activeStreamCount,
        uint256 totalRatePerSecond,
        uint256 totalDeposited,
        uint256 totalClaimable
    ) {
        uint256[] memory ids = payerStreams[payer];
        for (uint256 i = 0; i < ids.length; i++) {
            Stream storage s = streams[ids[i]];
            if (s.active) {
                activeStreamCount++;
                if (!s.paused) {
                    totalRatePerSecond += s.ratePerSecond;
                }
                totalDeposited += s.depositBalance;
                totalClaimable += claimable(ids[i]);
            }
        }
    }
    
    /**
     * @notice Get total earnings for a payee across all active streams
     */
    function getTotalEarnings(address payee) external view returns (
        uint256 activeStreamCount,
        uint256 totalRatePerSecond,
        uint256 totalClaimable
    ) {
        uint256[] memory ids = payeeStreams[payee];
        for (uint256 i = 0; i < ids.length; i++) {
            Stream storage s = streams[ids[i]];
            if (s.active) {
                activeStreamCount++;
                if (!s.paused) {
                    totalRatePerSecond += s.ratePerSecond;
                }
                totalClaimable += claimable(ids[i]);
            }
        }
    }
    
    /**
     * @notice Batch get stream statuses
     */
    function getStreamsBatch(uint256[] calldata streamIds) external view returns (Stream[] memory results) {
        results = new Stream[](streamIds.length);
        for (uint256 i = 0; i < streamIds.length; i++) {
            results[i] = streams[streamIds[i]];
        }
    }
}
