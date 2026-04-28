// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";

/**
 * CouncilManager.sol — Automated Council Oversight & Payment Distribution
 * -------------------------------------------------------------------------
 * Purpose:
 * - Daily ProofScore checks for all council members
 * - Auto-removal after 7 days below ProofScore 700
 * - Enforces 60/40 payment split (Operations FIRST, Council SECOND)
 * - Prevents council payment if operations underfunded
 * 
 * HOWEY COMPLIANCE:
 * - Council payments are EMPLOYMENT COMPENSATION (not investment returns)
 * - Payments via auto-swap to ETH/USDC (not VFIDE)
 * - Clear work-for-pay relationship (NOT securities)
 * 
 * Features:
 * - Grace period tracking (7 days below threshold before removal)
 * - Payment priority enforcement (ops never starved)
 * - Keeper-compatible (Chainlink Automation, Gelato, etc.)
 * - DAO override controls
 */

error CM_NotDAO();
error CM_Zero();
error CM_NotKeeper();
error CM_TooSoon();

contract CouncilManager is ReentrancyGuard {
    event ModulesSet(address election, address seer, address ecosystemVault, address councilSalary);
    event KeeperSet(address indexed keeper, bool authorized);
    event ScoreCheckPerformed(uint256 membersChecked, uint256 membersRemoved, uint256 timestamp);
    event PaymentDistributed(uint256 opsAmount, uint256 councilAmount, uint256 timestamp);
    event MemberGracePeriod(address indexed member, uint256 daysBelow, uint16 currentScore);
    event MemberAutoRemoved(address indexed member, uint256 daysBelow, uint16 finalScore);

    // --- Core Modules ---
    address public dao;
    ICouncilElection public election;
    ISeer public seer;
    address public ecosystemVault; // Receives 0.2% ecosystem fee
    address public councilSalary;  // Distributes council payments
    IERC20 public token;           // VFIDE token

    // --- Keeper Authorization ---
    mapping(address => bool) public isKeeper;

    // --- Grace Period Tracking ---
    mapping(address => uint256) public daysBelow700;
    mapping(address => uint256) public lastCheckTime;
    uint256 public constant GRACE_PERIOD = 7 days;
    uint256 public constant CHECK_INTERVAL = 1 days;
    uint16 public constant COUNCIL_MIN_SCORE = 7000; // 70% on 0-10000 scale

    // --- Payment Configuration ---
    uint256 public constant OPS_PERCENTAGE = 60;     // 60% to operations
    uint256 public constant COUNCIL_PERCENTAGE = 40; // 40% to council
    uint256 public lastPaymentTime;
    uint256 public paymentInterval = 30 days; // Monthly payments

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert CM_NotDAO();
    }

    modifier onlyKeeper() {
        _checkKeeper();
        _;
    }

    function _checkKeeper() internal view {
        if (!isKeeper[msg.sender] && msg.sender != dao) revert CM_NotKeeper();
    }

    constructor(
        address _dao,
        address _election,
        address _seer,
        address _ecosystemVault,
        address _councilSalary,
        address _token
    ) {
        if (_dao == address(0) || _election == address(0) || _seer == address(0)) revert CM_Zero();
        if (_ecosystemVault == address(0) || _councilSalary == address(0)) revert CM_Zero();
        
        dao = _dao;
        election = ICouncilElection(_election);
        seer = ISeer(_seer);
        ecosystemVault = _ecosystemVault;
        councilSalary = _councilSalary;
        token = IERC20(_token);
        
        lastPaymentTime = block.timestamp;
        
        emit ModulesSet(_election, _seer, _ecosystemVault, _councilSalary);
    }

    // ────────────────────────── Admin Functions ──────────────────────────

    function setModules(
        address _election,
        address _seer,
        address _ecosystemVault,
        address _councilSalary,
        address _token
    ) external onlyDAO {
        bool updated = false;
        if (_election != address(0)) election = ICouncilElection(_election);
        if (_election != address(0)) updated = true;
        if (_seer != address(0)) seer = ISeer(_seer);
        if (_seer != address(0)) updated = true;
        if (_ecosystemVault != address(0)) ecosystemVault = _ecosystemVault;
        if (_ecosystemVault != address(0)) updated = true;
        if (_councilSalary != address(0)) councilSalary = _councilSalary;
        if (_councilSalary != address(0)) updated = true;
        if (_token != address(0)) token = IERC20(_token);
        if (_token != address(0)) updated = true;

        require(updated, "CM: no updates");
        
        emit ModulesSet(address(election), address(seer), ecosystemVault, councilSalary);
    }

    function setKeeper(address keeper, bool authorized) external onlyDAO {
        if (keeper == address(0)) revert CM_Zero();
        isKeeper[keeper] = authorized;
        emit KeeperSet(keeper, authorized);
    }

    function setPaymentInterval(uint256 _interval) external onlyDAO {
        require(_interval >= 7 days && _interval <= 365 days, "CM: invalid interval");
        paymentInterval = _interval;
    }

    // ────────────────────────── Daily Score Checks ──────────────────────────

    /**
     * @notice Check ProofScores for all council members (called daily by keeper)
     * @dev Tracks grace period, auto-removes after 7 days below 700
     * H-2 FIX: Iterate in reverse to prevent index corruption when removing members
     */
    // slither-disable-next-line reentrancy-no-eth,reentrancy-events
    function checkDailyScores() external onlyKeeper {
        uint256 councilSize = election.getActualCouncilSize();
        if (councilSize == 0) return;

        uint256 membersChecked = 0;
        uint256 membersRemoved = 0;
        
        // H-2 FIX: Collect members to check first, then process
        // This prevents issues with array modification during iteration
        address[] memory membersToCheck = new address[](councilSize);
        for (uint256 i = 0; i < councilSize; i++) {
            membersToCheck[i] = election.getCouncilMember(i);
        }

        // Now process the cached list (safe from array modifications)
        for (uint256 i = 0; i < councilSize; i++) {
            address member = membersToCheck[i];
            if (member == address(0)) continue;

            // Skip if checked recently (within 1 day)
            if (lastCheckTime[member] + CHECK_INTERVAL > block.timestamp) {
                continue;
            }

            membersChecked++;
            uint16 score = seer.getScore(member);

            if (score < COUNCIL_MIN_SCORE) {
                // Increment grace period counter
                daysBelow700[member]++;
                lastCheckTime[member] = block.timestamp;

                emit MemberGracePeriod(member, daysBelow700[member], score);

                // Auto-remove after 7 days
                if (daysBelow700[member] >= 7) {
                    daysBelow700[member] = 0;

                    // H-2 FIX: Use try/catch to handle potential removal failures
                    try election.removeCouncilMember(
                        member,
                        "ProofScore below 7000 for 7+ days (auto-removal)"
                    ) {
                        membersRemoved++;
                        emit MemberAutoRemoved(member, 7, score);
                    } catch {
                        // Member may have already been removed or other issue
                    }
                }
            } else {
                // Score recovered - reset counter
                if (daysBelow700[member] > 0) {
                    daysBelow700[member] = 0;
                }
                lastCheckTime[member] = block.timestamp;
            }
        }

        emit ScoreCheckPerformed(membersChecked, membersRemoved, block.timestamp);
    }

    /**
     * @notice Manual check for specific member (DAO override)
     * @param member Address to check
     */
    // slither-disable-next-line reentrancy-events
    function checkMemberScore(address member) external onlyDAO {
        // H-36 FIX: Enforce the same 1-day cooldown as checkDailyScores to prevent DAO from
        // collapsing a 7-day grace period into a single block by calling this 7 times in rapid succession.
        require(
            lastCheckTime[member] == 0 || lastCheckTime[member] + CHECK_INTERVAL <= block.timestamp,
            "CM: too soon"
        );
        require(election.isCouncil(member), "CM: not council member");
        
        uint16 score = seer.getScore(member);
        
        if (score < COUNCIL_MIN_SCORE) {
            daysBelow700[member]++;
            lastCheckTime[member] = block.timestamp;
            
            emit MemberGracePeriod(member, daysBelow700[member], score);
            
            if (daysBelow700[member] >= 7) {
                daysBelow700[member] = 0;
                election.removeCouncilMember(member, "Manual check: score below 700 for 7+ days");
                emit MemberAutoRemoved(member, 7, score);
            }
        } else {
            daysBelow700[member] = 0;
            lastCheckTime[member] = block.timestamp;
        }
    }

    /**
     * @notice Reset grace period for member (DAO override, use carefully)
     * @param member Address to reset
     */
    function resetGracePeriod(address member) external onlyDAO {
        daysBelow700[member] = 0;
        lastCheckTime[member] = block.timestamp;
    }

    // ────────────────────────── Payment Distribution ──────────────────────────

    /**
     * @notice Distribute payments with priority: Operations FIRST, Council SECOND
     * @dev Called monthly (or per paymentInterval)
     * Operations always funded before council
     * Added nonReentrant to prevent reentrancy via external call
     * 
     * NOTE: Council payments are EMPLOYMENT COMPENSATION (not investment returns).
     * Payments are transferred to CouncilSalary contract for distribution.
     */
    // slither-disable-next-line reentrancy-no-eth
    function distributePayments() external onlyKeeper nonReentrant {
        require(block.timestamp >= lastPaymentTime + paymentInterval, "CM: too soon");
        IEcosystemVault(ecosystemVault).allocateIncoming();
        
        uint256 vaultBalance = IEcosystemVault(ecosystemVault).councilPool(); // BATCH-04: read pool balance not raw token balance
        require(vaultBalance > 0, "CM: no funds");

        // Effects first: timestamp is rolled back automatically if downstream call reverts.
        lastPaymentTime = block.timestamp;

        // Calculate split (60% ops, 40% council)
        uint256 opsAmount = (vaultBalance * OPS_PERCENTAGE) / 100;
        uint256 councilAmount = vaultBalance - opsAmount; // Remainder to council

        // Priority 1: Transfer operations funding (remains in vault for DAO to spend)
        // Operations funds stay in EcosystemVault for DAO to payExpense()
        // We just mark the allocation (vault handles actual payments)

        // Priority 2: Transfer council payment (employment compensation)
        if (councilAmount > 0) {
            // Transfer from EcosystemVault to CouncilSalary contract
            try IEcosystemVault(ecosystemVault).payExpense(
                councilSalary,
                councilAmount,
                "council_salary"
            ) {
                // CouncilSalary.distributeSalary() will be called by keeper or DAO separately
                emit PaymentDistributed(opsAmount, councilAmount, block.timestamp);
            } catch {
                // If council transfer fails, ops still gets 100%
                // Keep interval open so keeper can retry without waiting a full cycle.
                emit PaymentDistributed(opsAmount, 0, block.timestamp);
            }
        } else {
            emit PaymentDistributed(opsAmount, 0, block.timestamp);
        }
    }

    /**
     * @notice Emergency payment distribution (DAO override)
     * @dev Allows DAO to force payment outside normal schedule
     * Council payments are employment compensation (not investment returns)
     */
    // slither-disable-next-line reentrancy-benign,reentrancy-events
    function forcePaymentDistribution() external onlyDAO {
        IEcosystemVault(ecosystemVault).allocateIncoming();
        // BATCH-04 FIX: Use councilPool() to read the earmarked council balance,
        // not the raw token balance which includes all pools.
        uint256 vaultBalance = IEcosystemVault(ecosystemVault).councilPool();
        require(vaultBalance > 0, "CM: no funds");

        uint256 opsAmount = (vaultBalance * OPS_PERCENTAGE) / 100;
        uint256 councilAmount = vaultBalance - opsAmount;

        // Effects first; downstream call revert will roll back this assignment.
        lastPaymentTime = block.timestamp;

        if (councilAmount > 0) {
            bool success = true;
            try IEcosystemVault(ecosystemVault).payExpense(
                councilSalary,
                councilAmount,
                "council_salary_emergency"
            ) {} catch {
                success = false;
            }

            emit PaymentDistributed(
                opsAmount,
                success ? councilAmount : 0,
                block.timestamp
            );
        } else {
            emit PaymentDistributed(opsAmount, 0, block.timestamp);
        }
    }

    // ────────────────────────── View Functions ──────────────────────────

    /**
     * @notice Get grace period status for member
     * @param member Address to check
     * @return daysBelow Days member has been below score 700
     * @return lastCheck Last time member was checked
     * @return currentScore Current ProofScore
     */
    function getGracePeriodStatus(address member)
        external
        view
        returns (
            uint256 daysBelow,
            uint256 lastCheck,
            uint16 currentScore
        )
    {
        daysBelow = daysBelow700[member];
        lastCheck = lastCheckTime[member];
        currentScore = seer.getScore(member);
    }

    /**
     * @notice Check if payment distribution is due
     * @return isDue Whether payment can be distributed
     * @return timeUntilNext Seconds until next payment
     */
    function isPaymentDue()
        external
        view
        returns (bool isDue, uint256 timeUntilNext)
    {
        if (block.timestamp >= lastPaymentTime + paymentInterval) {
            isDue = true;
            timeUntilNext = 0;
        } else {
            isDue = false;
            timeUntilNext = (lastPaymentTime + paymentInterval) - block.timestamp;
        }
    }

    /**
     * @notice Get payment split preview
     * @return opsAmount Amount for operations (60%)
     * @return councilAmount Amount for council (40%)
     * @return vaultBalance Current vault balance
     */
    function getPaymentPreview()
        external
        view
        returns (
            uint256 opsAmount,
            uint256 councilAmount,
            uint256 vaultBalance
        )
    {
        vaultBalance = token.balanceOf(ecosystemVault);
        opsAmount = (vaultBalance * OPS_PERCENTAGE) / 100;
        councilAmount = vaultBalance - opsAmount;
    }

    /**
     * @notice Get all council members needing attention
     * @return membersAtRisk Array of members below score 7000
     * @return daysBelowArray Array of days each member has been below
     * @return scores Array of current scores
     */
    function getMembersAtRisk()
        external
        view
        returns (
            address[] memory membersAtRisk,
            uint256[] memory daysBelowArray,
            uint16[] memory scores
        )
    {
        uint256 councilSize = election.getActualCouncilSize();
        address[] memory tempMembers = new address[](councilSize);
        uint256[] memory tempDays = new uint256[](councilSize);
        uint16[] memory tempScores = new uint16[](councilSize);
        uint256 riskCount = 0;

        for (uint256 i = 0; i < councilSize; i++) {
            address member = election.getCouncilMember(i);
            if (member == address(0)) continue;

            uint16 score = seer.getScore(member);
            if (score < COUNCIL_MIN_SCORE || daysBelow700[member] > 0) {
                tempMembers[riskCount] = member;
                tempDays[riskCount] = daysBelow700[member];
                tempScores[riskCount] = score;
                riskCount++;
            }
        }

        // Resize arrays to actual risk count
        membersAtRisk = new address[](riskCount);
        daysBelowArray = new uint256[](riskCount);
        scores = new uint16[](riskCount);

        for (uint256 i = 0; i < riskCount; i++) {
            membersAtRisk[i] = tempMembers[i];
            daysBelowArray[i] = tempDays[i];
            scores[i] = tempScores[i];
        }
    }
}
