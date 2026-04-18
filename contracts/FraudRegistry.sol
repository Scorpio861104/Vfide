// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title FraudRegistry
 * @notice Community-driven fraud reporting with protocol-wide consequences
 *
 * HOW IT WORKS:
 *   - Any user with ProofScore >= 5000 can file a fraud complaint against an address
 *   - Each address can only file ONE complaint per target (no spam)
 *   - At 3 complaints: address is flagged as "disputed"
 *     → All protocol services refuse them (lending, merchant, flash loans, governance)
 *     → All outgoing transfers enter a 30-day escrow (tokens held, released after 30 days)
 *   - The DAO can clear a flag if the complaints were false
 *   - The DAO can escalate to permanent ban
 *
 * WHAT THIS IS NOT:
 *   - This does NOT freeze funds. Escrowed transfers still complete after 30 days.
 *   - This does NOT seize tokens. The flagged user keeps everything in their vault.
 *   - This does NOT give anyone custody. It's a protocol rule applied equally.
 *
 * ANALOGY: A store puts a "30-day hold" on checks from customers with fraud complaints.
 *          The money is still the customer's. It just clears slowly.
 */

interface ISeer_FR {
    function getScore(address subject) external view returns (uint16);
}

error FR_Zero();
error FR_AlreadyComplained();
error FR_InsufficientScore();
error FR_NotDAO();
error FR_AlreadyFlagged();
error FR_NotFlagged();
error FR_SelfComplaint();
error FR_EscrowNotReady();
error FR_EscrowAlreadyProcessed();
error FR_EscrowInvalidIndex();

contract FraudRegistry is ReentrancyGuard {

    // ── Configuration ────────────────────────────────────────
    uint8 public constant COMPLAINTS_TO_FLAG = 3;
    uint256 public constant ESCROW_DURATION = 30 days;
    uint16 public constant MIN_REPORTER_SCORE = 5000;
    uint16 public constant COMPLAINT_REPORTER_PENALTY = 50; // Filing false complaints costs score

    address public dao;
    ISeer_FR public seer;
    IERC20 public vfideToken; // Token contract reference for escrow releases

    // ── Complaint tracking ───────────────────────────────────
    struct Complaint {
        address reporter;
        string reason;
        uint64 timestamp;
    }

    // target → complaints
    mapping(address => Complaint[]) public complaints;
    // target → reporter → has complained
    mapping(address => mapping(address => bool)) public hasComplained;
    // target → total complaint count
    mapping(address => uint8) public complaintCount;

    // ── Fraud flags ──────────────────────────────────────────
    mapping(address => bool) public isPendingReview;   // 3+ complaints → awaiting DAO review
    mapping(address => bool) public isFlagged;         // DAO confirmed fraud → service ban + escrow
    mapping(address => bool) public isPermanentlyBanned; // DAO escalation
    mapping(address => uint64) public flaggedAt;
    mapping(address => uint64) public pendingReviewAt;  // When review was triggered

    // ── Transfer escrow for flagged addresses ────────────────
    struct EscrowedTransfer {
        address from;
        address to;
        uint256 amount;
        uint64 releaseAt;
        bool released;
        bool cancelled; // Only if flag is cleared before release
    }

    EscrowedTransfer[] public escrowedTransfers;
    mapping(address => uint256[]) public userEscrowIndices; // from → escrow indices
    // H-3 FIX: Running total of tokens committed in active (unreleased/uncancelled) escrows
    uint256 public totalActiveEscrowed;

    // ── Events ───────────────────────────────────────────────
    event ComplaintFiled(address indexed target, address indexed reporter, string reason, uint8 totalComplaints);
    event PendingDAOReview(address indexed target, uint8 complaints);
    event FraudConfirmedByDAO(address indexed target, address indexed confirmedBy);
    event ComplaintsDismissedByDAO(address indexed target, address indexed dismissedBy);
    event FlagCleared(address indexed target, address indexed clearedBy);
    event PermanentBanSet(address indexed target, bool banned);
    event TransferEscrowed(uint256 indexed escrowIndex, address indexed from, address indexed to, uint256 amount, uint64 releaseAt);
    event EscrowReleased(uint256 indexed escrowIndex, address indexed to, uint256 amount);
    event EscrowCancelledOnClear(uint256 indexed escrowIndex, address indexed from, uint256 amount);
    event DAOSet(address indexed oldDAO, address indexed newDAO);

    modifier onlyDAO() {
        if (msg.sender != dao) revert FR_NotDAO();
        _;
    }

    constructor(address _dao, address _seer, address _vfideToken) {
        if (_dao == address(0) || _seer == address(0) || _vfideToken == address(0)) revert FR_Zero();
        dao = _dao;
        seer = ISeer_FR(_seer);
        vfideToken = IERC20(_vfideToken);
    }

    // ═══════════════════════════════════════════════════════════
    //  COMPLAINT SYSTEM
    // ═══════════════════════════════════════════════════════════

    /// @notice File a fraud complaint against an address
    /// @param target The address being reported
    /// @param reason Description of the fraud
    /// @dev Requires reporter ProofScore >= 5000. One complaint per reporter per target.
    function fileComplaint(address target, string calldata reason) external nonReentrant {
        if (target == address(0)) revert FR_Zero();
        if (target == msg.sender) revert FR_SelfComplaint();
        if (hasComplained[target][msg.sender]) revert FR_AlreadyComplained();

        // Reporter must have minimum trust
        uint16 reporterScore = seer.getScore(msg.sender);
        if (reporterScore < MIN_REPORTER_SCORE) revert FR_InsufficientScore();

        hasComplained[target][msg.sender] = true;

        // Cap complaints array to prevent unbounded growth
        require(complaints[target].length < 100, "FR: complaint limit");

        complaints[target].push(Complaint({
            reporter: msg.sender,
            reason: reason,
            timestamp: uint64(block.timestamp)
        }));
        complaintCount[target]++;

        emit ComplaintFiled(target, msg.sender, reason, complaintCount[target]);

        // At threshold: enter pending DAO review (NOT auto-flagged)
        // The DAO must review evidence and explicitly confirm before
        // any consequences take effect. This prevents coordinated false reports.
        if (complaintCount[target] >= COMPLAINTS_TO_FLAG && !isPendingReview[target] && !isFlagged[target]) {
            isPendingReview[target] = true;
            pendingReviewAt[target] = uint64(block.timestamp);
            emit PendingDAOReview(target, complaintCount[target]);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  ESCROW FOR FLAGGED TRANSFERS
    // ═══════════════════════════════════════════════════════════

    /// @notice Called by VFIDEToken._transfer when sender is flagged
    /// @dev Tokens are held in the FraudRegistry contract for 30 days, then released to recipient
    /// @param from Sender (flagged address)
    /// @param to Intended recipient
    /// @param amount Token amount
    /// @return escrowIndex Index of the escrowed transfer
    function escrowTransfer(address from, address to, uint256 amount) external nonReentrant returns (uint256 escrowIndex) {
        // Only callable by the VFIDE token contract
        // The token sends tokens HERE instead of to the recipient
        // After 30 days, anyone can call releaseEscrow to deliver them
        require(msg.sender == address(vfideToken), "FR: only token");

        uint64 releaseAt = uint64(block.timestamp) + uint64(ESCROW_DURATION);

        escrowIndex = escrowedTransfers.length;
        escrowedTransfers.push(EscrowedTransfer({
            from: from,
            to: to,
            amount: amount,
            releaseAt: releaseAt,
            released: false,
            cancelled: false
        }));

        require(userEscrowIndices[from].length < 500, "FR: escrow limit");
        userEscrowIndices[from].push(escrowIndex);
        // H-3 FIX: Track total actively escrowed tokens for O(1) excess calculation
        totalActiveEscrowed += amount;

        emit TransferEscrowed(escrowIndex, from, to, amount, releaseAt);
    }

    /// @notice Release an escrowed transfer after 30 days. Anyone can call.
    /// @param escrowIndex Index of the escrowed transfer
    function releaseEscrow(uint256 escrowIndex) external nonReentrant {
        if (escrowIndex >= escrowedTransfers.length) revert FR_EscrowInvalidIndex();

        EscrowedTransfer storage e = escrowedTransfers[escrowIndex];
        if (e.released || e.cancelled) revert FR_EscrowAlreadyProcessed();
        if (block.timestamp < e.releaseAt) revert FR_EscrowNotReady();

        e.released = true;
        // H-3 FIX: Decrement active escrow counter before transfer
        totalActiveEscrowed -= e.amount;

        // Transfer tokens from this contract to the intended recipient
        // FraudRegistry must be systemExempt on VFIDEToken so this transfer
        // skips fees and fraud checks (preventing infinite recursion)
        SafeERC20.safeTransfer(vfideToken, e.to, e.amount);

        emit EscrowReleased(escrowIndex, e.to, e.amount);
    }

    // ═══════════════════════════════════════════════════════════
    //  SERVICE BAN CHECK — Called by all protocol services
    // ═══════════════════════════════════════════════════════════

    /// @notice Check if an address is banned from protocol services
    /// @param user Address to check
    /// @return banned True if flagged or permanently banned
    function isServiceBanned(address user) external view returns (bool) {
        return isFlagged[user] || isPermanentlyBanned[user];
    }

    /// @notice Check if transfers from this address require escrow
    /// @param user Address to check
    /// @return required True if flagged (3+ complaints) or permanently banned
    /// @dev H-3 FIX: Permanently banned users must also have escrow applied.
    ///      Previously `isPermanentlyBanned` silently removed the escrow restriction,
    ///      meaning the most severely sanctioned users had the fewest transfer restrictions.
    function requiresEscrow(address user) external view returns (bool) {
        return isFlagged[user] || isPermanentlyBanned[user];
    }

    // ═══════════════════════════════════════════════════════════
    //  DAO MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /// @notice DAO confirms fraud after reviewing evidence
    /// @param target Address confirmed as fraudulent
    /// @dev Only callable after 3+ complaints triggered pendingReview.
    ///      THIS is the moment consequences activate — service ban + escrow.
    ///      No consequences exist until the DAO explicitly confirms.
    function confirmFraud(address target) external onlyDAO nonReentrant {
        require(isPendingReview[target], "FR: not pending review");
        require(!isFlagged[target], "FR: already flagged");

        isPendingReview[target] = false;
        isFlagged[target] = true;
        flaggedAt[target] = uint64(block.timestamp);

        emit FraudConfirmedByDAO(target, msg.sender);
    }

    /// @notice DAO dismisses complaints as false/unfounded
    /// @param target Address whose complaints are dismissed
    /// @dev Clears pending review. Complaint history stays on-chain.
    ///      No consequences were ever applied (review was pending, not active).
    function dismissComplaints(address target) external onlyDAO nonReentrant {
        require(isPendingReview[target], "FR: not pending review");

        isPendingReview[target] = false;
        pendingReviewAt[target] = 0;
        // Complaint count and history stay — on-chain record is permanent
        // But no consequences are applied

        emit ComplaintsDismissedByDAO(target, msg.sender);
    }

    /// @notice DAO clears a previously confirmed fraud flag (rehabilitation)
    /// @param target Address to clear
    /// @dev Restores service access and stops future escrow.
    ///      Does NOT retroactively release pending escrows — those complete on schedule.
    function clearFlag(address target) external onlyDAO nonReentrant {
        if (!isFlagged[target]) revert FR_NotFlagged();
        isFlagged[target] = false;
        flaggedAt[target] = 0;
        emit FlagCleared(target, msg.sender);
    }

    /// @notice Permanently ban an address from all protocol services
    /// @param target Address to ban
    /// @param banned True to ban, false to unban
    function setPermanentBan(address target, bool banned) external onlyDAO {
        isPermanentlyBanned[target] = banned;
        emit PermanentBanSet(target, banned);
    }

    /// @notice Update DAO address
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert FR_Zero();
        emit DAOSet(dao, _dao);
        dao = _dao;
    }

    // ═══════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /// @notice Get all complaints against an address
    function getComplaints(address target) external view returns (
        address[] memory reporters,
        string[] memory reasons,
        uint64[] memory timestamps
    ) {
        Complaint[] storage c = complaints[target];
        uint256 len = c.length;
        reporters = new address[](len);
        reasons = new string[](len);
        timestamps = new uint64[](len);

        for (uint256 i = 0; i < len; i++) {
            reporters[i] = c[i].reporter;
            reasons[i] = c[i].reason;
            timestamps[i] = c[i].timestamp;
        }
    }

    /// @notice Get pending escrowed transfers for an address
    function getPendingEscrows(address user) external view returns (
        uint256[] memory indices,
        address[] memory recipients,
        uint256[] memory amounts,
        uint64[] memory releaseAts
    ) {
        uint256[] storage userIndices = userEscrowIndices[user];
        uint256 pendingCount = 0;

        for (uint256 i = 0; i < userIndices.length; i++) {
            EscrowedTransfer storage e = escrowedTransfers[userIndices[i]];
            if (!e.released && !e.cancelled) pendingCount++;
        }

        indices = new uint256[](pendingCount);
        recipients = new address[](pendingCount);
        amounts = new uint256[](pendingCount);
        releaseAts = new uint64[](pendingCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < userIndices.length; i++) {
            EscrowedTransfer storage e = escrowedTransfers[userIndices[i]];
            if (!e.released && !e.cancelled) {
                indices[idx] = userIndices[i];
                recipients[idx] = e.to;
                amounts[idx] = e.amount;
                releaseAts[idx] = e.releaseAt;
                idx++;
            }
        }
    }

    /// @notice Get fraud status summary for an address
    function getFraudStatus(address user) external view returns (
        uint8 totalComplaints,
        bool pendingReview,
        bool flagged,
        bool permanentlyBanned,
        uint64 flagTimestamp,
        uint256 pendingEscrowCount
    ) {
        totalComplaints = complaintCount[user];
        pendingReview = isPendingReview[user];
        flagged = isFlagged[user];
        permanentlyBanned = isPermanentlyBanned[user];
        flagTimestamp = flaggedAt[user];

        // Count pending escrows
        uint256[] storage userIndices = userEscrowIndices[user];
        for (uint256 i = 0; i < userIndices.length; i++) {
            EscrowedTransfer storage e = escrowedTransfers[userIndices[i]];
            if (!e.released && !e.cancelled) pendingEscrowCount++;
        }
    }

    // ── H-7 FIX: DAO rescue for unrecorded token balance ──────────
    // If tokens end up in FraudRegistry's balance without a matching
    // escrow record (e.g., direct transfer, edge case), the DAO can
    // recover the surplus.
    event TokensRescued(address indexed to, uint256 amount);

    function rescueExcessTokens(address to) external onlyDAO nonReentrant {
        if (to == address(0)) revert FR_Zero();

        // H-3 FIX: Use O(1) counter instead of O(n) loop over all escrows
        uint256 escrowed = totalActiveEscrowed;

        uint256 balance = vfideToken.balanceOf(address(this));
        require(balance > escrowed, "FR: no excess");
        uint256 excess = balance - escrowed;

        SafeERC20.safeTransfer(vfideToken, to, excess);
        emit TokensRescued(to, excess);
    }
}
