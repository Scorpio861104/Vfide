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
    /// @dev L-4 FIX: Used to apply score penalty to reporters whose complaints are dismissed.
    ///      Requires FraudRegistry to be registered as an authorized operator in Seer.
    function punish(address subject, uint16 delta, string calldata reason) external;
}

interface IVaultHub_FR {
    function isVault(address account) external view returns (bool);
    function ownerOfVault(address vault) external view returns (address);
    function vaultOf(address owner) external view returns (address);
}

/// @dev F-11 FIX: Minimal interface to check systemExempt status on token
interface IVFIDEToken_SystemExempt {
    function systemExempt(address account) external view returns (bool);
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
error FR_ReviewActive();
error FR_InvalidTarget();
error FR_SystemExemptViolation();

contract FraudRegistry is ReentrancyGuard {

    // ── Configuration ────────────────────────────────────────
    uint8 public constant COMPLAINTS_TO_FLAG = 3;
    uint256 public constant ESCROW_DURATION = 30 days;
    uint256 public constant ESCROW_RESCUE_DELAY = 90 days;
    uint256 public constant PENDING_REVIEW_APPEAL_WINDOW = 48 hours;
    /// @notice H-4 FIX: Timelock for permanent ban — gives subject time to appeal before irreversible action
    uint256 public constant PERMANENT_BAN_DELAY = 7 days;
    uint16 public constant MIN_REPORTER_SCORE = 5000;
    uint16 public constant COMPLAINT_REPORTER_PENALTY = 50; // Filing false complaints costs score

    address public dao;
    ISeer_FR public seer;
    IERC20 public vfideToken; // Token contract reference for escrow releases
    IVaultHub_FR public vaultHub;

    // H-4 FIX: Timelocked dao/vaultHub rotation
    address public pendingDAO_FR;
    uint64 public pendingDAOAt_FR;
    address public pendingVaultHub_FR;
    uint64 public pendingVaultHubAt_FR;
    uint64 public constant DAO_CHANGE_DELAY_FR = 48 hours;
    uint64 public constant VAULT_HUB_CHANGE_DELAY_FR = 48 hours;

    // ── Complaint tracking ───────────────────────────────────
    event SystemExemptCheckFailed(address indexed fraudRegistry);
    event EscrowReleaseTargetResolved(uint256 indexed escrowIndex, address indexed originalTarget, address indexed resolvedTarget);

    struct Complaint {
        address reporter;
        string reason;
        uint64 timestamp;
    }

    // target → complaints
    mapping(address => Complaint[]) public complaints;
    // target → reporter → has complained (legacy compatibility)
    mapping(address => mapping(address => bool)) public hasComplained;
    // target → reporter → latest epoch marker (epoch + 1)
    mapping(address => mapping(address => uint64)) public lastComplaintEpoch;
    // target → current complaint epoch
    mapping(address => uint64) public complaintEpoch;
    // target → total complaint count
    mapping(address => uint8) public complaintCount;

    // ── Fraud flags ──────────────────────────────────────────
    mapping(address => bool) public isPendingReview;   // 3+ complaints → awaiting DAO review
    mapping(address => bool) public isFlagged;         // DAO confirmed fraud → service ban + escrow
    mapping(address => bool) public isPermanentlyBanned; // DAO escalation
    mapping(address => uint64) public flaggedAt;
    mapping(address => uint64) public pendingReviewAt;  // When review was triggered
    mapping(address => uint256) public dismissedComplaintPenaltyCursor; // Number of dismissed complaints already penalized
    // N-H1 FIX: Chunked escrow-refund state used after clearFlag to avoid unbounded loops.
    mapping(address => uint256) public clearFlagEscrowCursor;
    mapping(address => bool) public clearFlagEscrowRefundPending;
    // H-4 FIX: Pending permanent ban state (7-day timelock)
    mapping(address => uint64) public pendingPermanentBanAt; // 0 = no pending ban

    // ── Transfer escrow for flagged addresses ────────────────
    struct EscrowedTransfer {
        address from;
        address to;
        uint256 amount;
        uint64 releaseAt;
        bool released;
        bool cancelled; // Only if flag is cleared before release
        address recipientOwner;
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
    event PermanentBanScheduled(address indexed target, uint64 effectiveAt);
    event PermanentBanCancelled(address indexed target);
    event TransferEscrowed(uint256 indexed escrowIndex, address indexed from, address indexed to, uint256 amount, uint64 releaseAt);
    event EscrowReleased(uint256 indexed escrowIndex, address indexed to, uint256 amount);
    event EscrowRescued(uint256 indexed escrowIndex, address indexed recipient, uint256 amount);
    event EscrowCancelledOnClear(uint256 indexed escrowIndex, address indexed from, uint256 amount);
    event ClearFlagEscrowRefundProgress(address indexed target, uint256 processed, uint256 nextCursor, bool complete);
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    event DAOProposed(address indexed newDAO, uint64 effectiveAt);
    event DAOChangeCancelled();
    event VaultHubSet(address indexed oldVaultHub, address indexed newVaultHub);
    event VaultHubProposed(address indexed newVaultHub, uint64 effectiveAt);
    event VaultHubChangeCancelled();
    event DismissedComplaintPenaltyProcessed(address indexed target, uint256 processedCount, uint256 nextCursor);
    event DismissedComplaintPenaltyFailed(address indexed target, address indexed reporter, bytes reason);

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
        if (address(vaultHub) != address(0) && vaultHub.isVault(target)) revert FR_InvalidTarget();
        uint64 epoch = complaintEpoch[target];
        if (lastComplaintEpoch[target][msg.sender] == epoch + 1) revert FR_AlreadyComplained();
        if (isPendingReview[target] || isFlagged[target] || isPermanentlyBanned[target]) revert FR_ReviewActive();

        // Reporter must have minimum trust
        uint16 reporterScore = seer.getScore(msg.sender);
        if (reporterScore < MIN_REPORTER_SCORE) revert FR_InsufficientScore();

        lastComplaintEpoch[target][msg.sender] = epoch + 1;
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

        address recipientOwner = to;
        if (address(vaultHub) != address(0)) {
            try vaultHub.isVault(to) returns (bool isVaultAddr) {
                if (isVaultAddr) {
                    try vaultHub.ownerOfVault(to) returns (address owner) {
                        if (owner != address(0)) recipientOwner = owner;
                    } catch {}
                }
            } catch {}
        }

        uint64 releaseAt = uint64(block.timestamp) + uint64(ESCROW_DURATION);

        escrowIndex = escrowedTransfers.length;
        escrowedTransfers.push(EscrowedTransfer({
            from: from,
            to: to,
            amount: amount,
            releaseAt: releaseAt,
            released: false,
            cancelled: false,
            recipientOwner: recipientOwner
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

        // Resolve against the snapshot owner captured at escrow time.
        address releaseTarget = e.to;
        if (e.recipientOwner != address(0) && address(vaultHub) != address(0)) {
            try vaultHub.vaultOf(e.recipientOwner) returns (address currentVault) {
                if (currentVault != address(0)) {
                    releaseTarget = currentVault;
                }
            } catch {}
        }

        // F-11/N-H4 FIX: Check systemExempt for full-amount delivery, but do not permanently lock
        // release if exemption is removed. Emit warning and continue transfer so escrow is not stuck forever.
        try IVFIDEToken_SystemExempt(address(vfideToken)).systemExempt(address(this)) returns (bool exempt) {
            if (!exempt) {
                emit SystemExemptCheckFailed(address(this));
            }
        } catch {
            // If systemExempt query fails, emit warning but continue (fallback for older token versions)
            emit SystemExemptCheckFailed(address(this));
        }

        // Transfer tokens from this contract to the intended recipient
        // FraudRegistry must be systemExempt on VFIDEToken so this transfer
        // skips fees and fraud checks (preventing infinite recursion)
        SafeERC20.safeTransfer(vfideToken, releaseTarget, e.amount);

        if (releaseTarget != e.to) {
            emit EscrowReleaseTargetResolved(escrowIndex, e.to, releaseTarget);
        }
        emit EscrowReleased(escrowIndex, releaseTarget, e.amount);
    }

    function rescueStuckEscrow(uint256 escrowIndex, address recipient) external onlyDAO nonReentrant {
        if (recipient == address(0)) revert FR_Zero();
        if (escrowIndex >= escrowedTransfers.length) revert FR_EscrowInvalidIndex();

        EscrowedTransfer storage e = escrowedTransfers[escrowIndex];
        if (e.released || e.cancelled) revert FR_EscrowAlreadyProcessed();
        require(block.timestamp >= e.releaseAt + ESCROW_RESCUE_DELAY, "FR: rescue timelock active");

        e.cancelled = true;
        totalActiveEscrowed -= e.amount;
        SafeERC20.safeTransfer(vfideToken, recipient, e.amount);

        emit EscrowRescued(escrowIndex, recipient, e.amount);
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
        require(
            block.timestamp >= pendingReviewAt[target] + PENDING_REVIEW_APPEAL_WINDOW,
            "FR: appeal window not elapsed"
        );

        isPendingReview[target] = false;
        pendingReviewAt[target] = 0;
        isFlagged[target] = true;
        flaggedAt[target] = uint64(block.timestamp);

        emit FraudConfirmedByDAO(target, msg.sender);
    }

    /// @notice DAO dismisses complaints as false/unfounded
    /// @param target Address whose complaints are dismissed
    /// @dev Clears pending review. Complaint history stays on-chain.
    ///      No consequences were ever applied (review was pending, not active).
    ///      Reporter penalties are processed separately in bounded chunks so the DAO action
    ///      itself cannot gas out on large complaint sets.
    function dismissComplaints(address target) external onlyDAO nonReentrant {
        require(isPendingReview[target], "FR: not pending review");

        isPendingReview[target] = false;
        pendingReviewAt[target] = 0;
        // Complaint count and history stay — on-chain record is permanent
        // But no consequences are applied

        // N-M4 FIX: Process a bounded first chunk immediately so penalty application
        // does not depend entirely on a separate keeper call.
        _processDismissedComplaintPenalties(target, 20);

        emit ComplaintsDismissedByDAO(target, msg.sender);
    }

    /// @notice Process reporter penalties for previously dismissed complaints in bounded chunks.
    /// @param target Address whose dismissed complaints are being processed.
    /// @param maxCount Maximum number of complaints to process in this call. Zero means 20.
    function processDismissedComplaintPenalties(address target, uint256 maxCount) external nonReentrant returns (uint256 processed) {
        processed = _processDismissedComplaintPenalties(target, maxCount);
    }

    function _processDismissedComplaintPenalties(address target, uint256 maxCount) internal returns (uint256 processed) {
        uint256 end = complaints[target].length;
        uint256 cursor = dismissedComplaintPenaltyCursor[target];
        if (cursor >= end) {
            return 0;
        }

        uint256 limit = maxCount == 0 ? 20 : maxCount;
        uint256 stop = cursor + limit;
        if (stop > end) {
            stop = end;
        }

        Complaint[] storage filed = complaints[target];
        uint256 newCursor = cursor;

        for (uint256 i = cursor; i < stop; i++) {
            try seer.punish(filed[i].reporter, COMPLAINT_REPORTER_PENALTY, "false_complaint_dismissed") {
                processed++;
                newCursor = i + 1;
            } catch (bytes memory reason) {
                emit DismissedComplaintPenaltyFailed(target, filed[i].reporter, reason);
                break;
            }
        }

        dismissedComplaintPenaltyCursor[target] = newCursor;
        emit DismissedComplaintPenaltyProcessed(target, processed, newCursor);
    }

    /// @notice DAO clears a previously confirmed fraud flag (rehabilitation)
    /// @param target Address to clear
    /// @dev Restores service access and stops future escrow.
    ///      Does NOT retroactively release pending escrows — those complete on schedule.
    function clearFlag(address target) external onlyDAO nonReentrant {
        if (!isFlagged[target]) revert FR_NotFlagged();
        isFlagged[target] = false;
        flaggedAt[target] = 0;

        // N-H2 FIX: Reset complaint state so a cleared subject is not immediately re-flaggable
        // with a single new complaint due to stale counters/history.
        isPendingReview[target] = false;
        pendingReviewAt[target] = 0;
        complaintCount[target] = 0;
        delete complaints[target];
        dismissedComplaintPenaltyCursor[target] = 0;
        complaintEpoch[target] += 1;

        // N-H1 FIX: Escrow refunds are processed in bounded chunks via
        // processClearFlagEscrowRefunds() to prevent clearFlag gas exhaustion.
        clearFlagEscrowCursor[target] = 0;
        clearFlagEscrowRefundPending[target] = true;
        
        emit FlagCleared(target, msg.sender);
    }

    /// @notice Process refund cancellation for escrows linked to a target whose flag was cleared.
    /// @dev N-H1 FIX: Bounded chunk processing to avoid unbounded clearFlag loops.
    /// @param target Address whose flag was cleared.
    /// @param maxCount Max escrow entries to scan in this call (0 => default 25).
    function processClearFlagEscrowRefunds(address target, uint256 maxCount)
        external
        nonReentrant
        returns (uint256 processed)
    {
        require(clearFlagEscrowRefundPending[target], "FR: no pending clear-refunds");

        uint256[] storage userIndices = userEscrowIndices[target];
        uint256 cursor = clearFlagEscrowCursor[target];
        uint256 len = userIndices.length;
        if (cursor >= len) {
            clearFlagEscrowRefundPending[target] = false;
            emit ClearFlagEscrowRefundProgress(target, 0, cursor, true);
            return 0;
        }

        uint256 limit = maxCount == 0 ? 25 : maxCount;
        uint256 stop = cursor + limit;
        if (stop > len) stop = len;

        for (uint256 i = cursor; i < stop; i++) {
            uint256 escrowIndex = userIndices[i];
            if (escrowIndex >= escrowedTransfers.length) continue;

            EscrowedTransfer storage e = escrowedTransfers[escrowIndex];
            if (!e.released && !e.cancelled) {
                e.cancelled = true;
                totalActiveEscrowed -= e.amount;
                SafeERC20.safeTransfer(vfideToken, e.from, e.amount);
                emit EscrowCancelledOnClear(escrowIndex, e.from, e.amount);
                processed++;
            }
        }

        clearFlagEscrowCursor[target] = stop;
        bool complete = stop >= len;
        if (complete) {
            clearFlagEscrowRefundPending[target] = false;
        }
        emit ClearFlagEscrowRefundProgress(target, processed, stop, complete);
    }

    /// @notice Schedule a permanent ban with a 7-day timelock (H-4 FIX).
    /// @param target Address to permanently ban.
    /// @dev Unbanning (banned=false) remains instant to allow emergency rehabilitation.
    ///      Banning must wait 7 days so the subject has time to appeal through DAO governance.
    function setPermanentBan(address target, bool banned) external onlyDAO {
        if (!banned) {
            // Instant unban — cancel any pending ban and immediately lift
            isPermanentlyBanned[target] = false;
            delete pendingPermanentBanAt[target];
            emit PermanentBanSet(target, false);
            return;
        }
        // H-4 FIX: Schedule ban with 7-day timelock
        require(pendingPermanentBanAt[target] == 0, "FR: ban already pending");
        pendingPermanentBanAt[target] = uint64(block.timestamp) + uint64(PERMANENT_BAN_DELAY);
        emit PermanentBanScheduled(target, pendingPermanentBanAt[target]);
    }

    /// @notice Apply a pending permanent ban after the 7-day timelock has elapsed.
    /// @param target Address to finalize the ban on.
    function applyPermanentBan(address target) external onlyDAO {
        uint64 effectiveAt = pendingPermanentBanAt[target];
        require(effectiveAt != 0, "FR: no pending ban");
        require(block.timestamp >= effectiveAt, "FR: ban timelock active");
        delete pendingPermanentBanAt[target];
        isPermanentlyBanned[target] = true;
        emit PermanentBanSet(target, true);
    }

    /// @notice Cancel a pending permanent ban before it takes effect.
    /// @param target Address whose pending ban should be cancelled.
    function cancelPermanentBan(address target) external onlyDAO {
        require(pendingPermanentBanAt[target] != 0, "FR: no pending ban");
        delete pendingPermanentBanAt[target];
        emit PermanentBanCancelled(target);
    }

    /// @notice Propose a new DAO address (takes effect after 48h)
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert FR_Zero();
        require(pendingDAO_FR == address(0), "FR: pending dao");
        pendingDAO_FR = _dao;
        pendingDAOAt_FR = uint64(block.timestamp) + DAO_CHANGE_DELAY_FR;
        emit DAOProposed(_dao, pendingDAOAt_FR);
    }

    function applyDAO_FR() external onlyDAO {
        require(pendingDAO_FR != address(0) && block.timestamp >= pendingDAOAt_FR, "FR: timelock");
        address old = dao;
        dao = pendingDAO_FR;
        pendingDAO_FR = address(0);
        pendingDAOAt_FR = 0;
        emit DAOSet(old, dao);
    }

    function cancelDAO_FR() external onlyDAO {
        require(pendingDAO_FR != address(0), "FR: no pending");
        pendingDAO_FR = address(0);
        pendingDAOAt_FR = 0;
        emit DAOChangeCancelled();
    }

    /// @notice Propose a new VaultHub address (takes effect after 48h)
    function setVaultHub(address _vaultHub) external onlyDAO {
        if (_vaultHub == address(0)) revert FR_Zero();
        require(pendingVaultHub_FR == address(0), "FR: pending vaultHub");
        pendingVaultHub_FR = _vaultHub;
        pendingVaultHubAt_FR = uint64(block.timestamp) + VAULT_HUB_CHANGE_DELAY_FR;
        emit VaultHubProposed(_vaultHub, pendingVaultHubAt_FR);
    }

    function applyVaultHub_FR() external onlyDAO {
        require(pendingVaultHub_FR != address(0) && block.timestamp >= pendingVaultHubAt_FR, "FR: timelock");
        address old = address(vaultHub);
        vaultHub = IVaultHub_FR(pendingVaultHub_FR);
        pendingVaultHub_FR = address(0);
        pendingVaultHubAt_FR = 0;
        emit VaultHubSet(old, address(vaultHub));
    }

    function cancelVaultHub_FR() external onlyDAO {
        require(pendingVaultHub_FR != address(0), "FR: no pending");
        pendingVaultHub_FR = address(0);
        pendingVaultHubAt_FR = 0;
        emit VaultHubChangeCancelled();
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
