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
error PM_StreamNotExpired();

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
    event StreamExpired(uint256 indexed streamId, address indexed reclaimedBy, uint256 amount);
    event DAOSet(address indexed dao);
    event SupportedTokenSet(address indexed token, bool supported);

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
        uint256 expiryTime;
    }

    mapping(uint256 => Stream) public streams;
    uint256 public nextStreamId = 1;
    
    // H-27 FIX: Two-step payee update with 48h timelock to prevent instant address hijack on key compromise.
    struct PendingPayeeUpdate {
        address newPayee;
        uint256 validFrom; // block.timestamp at proposal + PAYEE_UPDATE_DELAY
    }
    mapping(uint256 => PendingPayeeUpdate) public pendingPayeeUpdates;
    uint256 public constant PAYEE_UPDATE_DELAY = 48 hours;
    
    // NEW: DAO for emergency controls
    address public dao;
    
    // ProofScore integration
    ISeer_PM public seer;
    uint16 public constant PAYROLL_CREATE_REWARD = 5;     // +0.5 for creating stream
    uint16 public constant PAYROLL_WITHDRAW_REWARD = 1;   // +0.1 per withdrawal
    uint256 public constant MAX_STREAM_DURATION = 365 days;
    
    // NEW: Track streams by payer and payee
    mapping(address => uint256[]) private payerStreams;
    mapping(address => uint256[]) private payeeStreams;
    mapping(address => uint256) public activePayerStreamCount;
    mapping(address => uint256) public activePayeeStreamCount;
    mapping(address => bool) public supportedTokens;

    // H-2 FIX: Timelocked DAO rotation
    address public pendingDAO_PM;
    uint64 public pendingDAOAt_PM;
    uint64 public constant DAO_CHANGE_DELAY_PM = 48 hours;
    event DAOChangeProposed(address indexed newDAO, uint64 effectiveAt);
    event DAOChangeCancelled();
    
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
        pendingDAO_PM = _dao;
        pendingDAOAt_PM = uint64(block.timestamp) + DAO_CHANGE_DELAY_PM;
        emit DAOChangeProposed(_dao, pendingDAOAt_PM);
    }

    function applyDAO() external onlyDAO {
        require(pendingDAOAt_PM != 0 && block.timestamp >= pendingDAOAt_PM, "PM: timelock");
        dao = pendingDAO_PM;
        delete pendingDAO_PM;
        delete pendingDAOAt_PM;
        emit DAOSet(dao);
    }

    function cancelDAOChange() external onlyDAO {
        require(pendingDAOAt_PM != 0, "PM: no pending");
        delete pendingDAO_PM;
        delete pendingDAOAt_PM;
        emit DAOChangeCancelled();
    }
    
    function setSeer(address _seer) external onlyDAO {
        seer = ISeer_PM(_seer);
    }

    function setSupportedToken(address token, bool supported) external onlyDAO {
        require(token != address(0), "PM: zero token");
        supportedTokens[token] = supported;
        emit SupportedTokenSet(token, supported);
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
        require(supportedTokens[token], "PM: unsupported token");
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
            pausedAccrued: 0,
            expiryTime: block.timestamp + MAX_STREAM_DURATION
        });
        
        // Track streams for both parties (I-11: capped)
        require(activePayerStreamCount[msg.sender] < 200, "PM: payer stream cap");
        payerStreams[msg.sender].push(id);
        activePayerStreamCount[msg.sender] += 1;
        require(activePayeeStreamCount[payee] < 200, "PM: payee stream cap");
        payeeStreams[payee].push(id);
        activePayeeStreamCount[payee] += 1;

        emit StreamCreated(id, msg.sender, payee, rate);

        // M-4 FIX: Account for fee-on-transfer tokens by measuring actual received amount
        uint256 balBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), initialDeposit);
        uint256 actualDeposit = IERC20(token).balanceOf(address(this)) - balBefore;
        if (actualDeposit < initialDeposit) {
            streams[id].depositBalance = actualDeposit;
        }
        
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
        if (amount == 0) revert PM_InvalidDeposit();

        uint256 balBefore = IERC20(s.token).balanceOf(address(this));
        IERC20(s.token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 actualReceived = IERC20(s.token).balanceOf(address(this)) - balBefore;
        s.depositBalance += actualReceived;
        emit TopUp(streamId, actualReceived);
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
    function setRate(uint256 streamId, uint256 newRate) external nonReentrant {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (msg.sender != s.payer) revert PM_NotPayer();
        if (newRate == 0) revert PM_InvalidRate();
        uint256 oldRate = s.ratePerSecond;
        
        // Settle current accrued first
        uint256 due = claimable(streamId);
        s.ratePerSecond = newRate;
        if (due > 0 && !s.paused) {
            if (due > s.depositBalance) {
                due = s.depositBalance;
            }
            s.depositBalance -= due;
            s.lastWithdrawTime = block.timestamp;
            emit Withdraw(streamId, s.payee, due);
            _safeTransferPay(s.token, s.payee, due);
        }
        
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
        
        // H-27 FIX: Propose with 48h timelock; apply separately.
        pendingPayeeUpdates[streamId] = PendingPayeeUpdate({
            newPayee: newPayee,
            validFrom: block.timestamp + PAYEE_UPDATE_DELAY
        });
        emit PayeeUpdated(streamId, s.payee, newPayee); // emitted at proposal not apply
    }

    /// @notice Apply a previously-proposed payee update after the 48h lock has elapsed.
    function applyPayeeUpdate(uint256 streamId) external {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        PendingPayeeUpdate storage p = pendingPayeeUpdates[streamId];
        require(p.validFrom != 0, "PM: no pending update");
        require(block.timestamp >= p.validFrom, "PM: timelock pending");
        require(msg.sender == s.payee || msg.sender == p.newPayee, "PM: not payee");
        require(activePayeeStreamCount[p.newPayee] < 200, "PM: payee stream cap");

        address oldPayee = s.payee;
        if (activePayeeStreamCount[oldPayee] > 0) {
            activePayeeStreamCount[oldPayee] -= 1;
        }
        activePayeeStreamCount[p.newPayee] += 1;
        s.payee = p.newPayee;
        delete pendingPayeeUpdates[streamId];
        emit PayeeUpdated(streamId, oldPayee, s.payee);
    }

    /// @notice Cancel a pending payee update (callable by current payee or payer).
    function cancelPayeeUpdate(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(msg.sender == s.payee || msg.sender == s.payer, "PM: not authorized");
        delete pendingPayeeUpdates[streamId];
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
        _decrementActiveCounts(s.payer, s.payee);

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
        
        uint256 effectiveNow = block.timestamp;
        if (s.expiryTime > 0 && effectiveNow > s.expiryTime) {
            effectiveNow = s.expiryTime;
        }
        if (effectiveNow <= s.lastWithdrawTime) {
            return s.pausedAccrued;
        }

        uint256 timeDelta = effectiveNow - s.lastWithdrawTime;
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
        _decrementActiveCounts(payer, payee);

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

    /// @notice Reclaim remaining stream balance after hard expiry.
    /// @dev L-3 FIX: Restricted to payer or payee to prevent permissionless griefing.
    function claimExpiredStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (!s.active) revert PM_StreamInactive();
        if (block.timestamp < s.expiryTime) revert PM_StreamNotExpired();
        require(msg.sender == s.payer || msg.sender == s.payee, "PM: not authorized");

        // Calculate payee's accrued wages (capped at expiry)
        uint256 payeeClaimable = claimable(streamId);
        uint256 remaining = s.depositBalance;
        s.depositBalance = 0;
        s.active = false;
        s.pausedAccrued = 0;
        _decrementActiveCounts(s.payer, s.payee);

        // Transfer payee's earned wages first
        if (payeeClaimable > 0) {
            _safeTransferPay(s.token, s.payee, payeeClaimable);
        }
        
        // Return remainder to payer
        uint256 toReturn = remaining > payeeClaimable ? remaining - payeeClaimable : 0;
        if (toReturn > 0) {
            _safeTransferPay(s.token, s.payer, toReturn);
        }
        emit StreamExpired(streamId, msg.sender, remaining);
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

    function _decrementActiveCounts(address payer, address payee) internal {
        if (activePayerStreamCount[payer] > 0) {
            activePayerStreamCount[payer] -= 1;
        }
        if (activePayeeStreamCount[payee] > 0) {
            activePayeeStreamCount[payee] -= 1;
        }
    }
}
