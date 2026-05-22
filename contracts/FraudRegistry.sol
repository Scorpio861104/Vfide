// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20, ReentrancyGuard, SafeERC20} from "./SharedInterfaces.sol";

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
 * @author Vfide
 */

interface ISeer_FR {
    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16);
    /// @notice getCachedScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getCachedScore(address subject) external view returns (uint16);
    /// @dev L-4 FIX: Used to apply score penalty to reporters whose complaints are dismissed.
    ///      Requires FraudRegistry to be registered as an authorized operator in Seer.
    /// @notice punish
    /// @param subject subject
    /// @param delta delta
    /// @param reason reason
    function punish(address subject, uint16 delta, string calldata reason) external;
}

/// @notice IVaultHub_FR
/// @title IVaultHub_FR
/// @author Vfide
interface IVaultHub_FR {
    /// @notice isVault
    /// @param account account
    /// @return _bool _bool
    function isVault(address account) external view returns (bool);
    /// @notice ownerOfVault
    /// @param vault vault
    /// @return _address _address
    function ownerOfVault(address vault) external view returns (address);
    /// @notice vaultOf
    /// @param owner owner
    /// @return _address _address
    function vaultOf(address owner) external view returns (address);
}

/// @dev F-11 FIX: Minimal interface to check systemExempt status on token
/// @notice IVFIDEToken_SystemExempt
/// @title IVFIDEToken_SystemExempt
/// @author Vfide
interface IVFIDEToken_SystemExempt {
    /// @notice systemExempt
    /// @param account account
    /// @return _bool _bool
    function systemExempt(address account) external view returns (bool);
}

/// @notice FR_Zero
error FR_Zero();
/// @notice FR_AlreadyComplained
error FR_AlreadyComplained();
/// @notice FR_InsufficientScore
error FR_InsufficientScore();
/// @notice FR_NotDAO
error FR_NotDAO();
/// @notice FR_NotFlagged
error FR_NotFlagged();
/// @notice FR_SelfComplaint
error FR_SelfComplaint();
/// @notice FR_EscrowNotReady
error FR_EscrowNotReady();
/// @notice FR_EscrowAlreadyProcessed
error FR_EscrowAlreadyProcessed();
/// @notice FR_EscrowInvalidIndex
error FR_EscrowInvalidIndex();
/// @notice FR_ReviewActive
error FR_ReviewActive();
/// @notice FR_InvalidTarget
error FR_InvalidTarget();
/// @notice FR_EscrowRecipientMismatch
error FR_EscrowRecipientMismatch();

/// @notice FraudRegistry
/// @title FraudRegistry
/// @author Vfide
contract FraudRegistry is ReentrancyGuard {
    // ── Configuration ────────────────────────────────────────
    /// @notice COMPLAINTS_TO_FLAG
    uint8 public constant COMPLAINTS_TO_FLAG = 3;
    /// @notice ESCROW_DURATION
    uint256 public constant ESCROW_DURATION = 30 days;
    /// @notice ESCROW_RESCUE_DELAY
    uint256 public constant ESCROW_RESCUE_DELAY = 90 days;
    /// @notice PENDING_REVIEW_APPEAL_WINDOW
    uint256 public constant PENDING_REVIEW_APPEAL_WINDOW = 48 hours;
    /// @notice H-4 FIX: Timelock for permanent ban — gives subject time to appeal before irreversible action
    uint256 public constant PERMANENT_BAN_DELAY = 7 days;
    /// @notice MIN_REPORTER_SCORE
    uint16 public constant MIN_REPORTER_SCORE = 5000;
    /// @notice COMPLAINT_REPORTER_PENALTY
    uint16 public constant COMPLAINT_REPORTER_PENALTY = 50; // Filing false complaints costs score

    /// @notice dao
    address public dao;
    /// @notice seer
    ISeer_FR public immutable seer;
    /// @notice vfideToken
    IERC20 public immutable vfideToken; // Token contract reference for escrow releases
    /// @notice vaultHub
    IVaultHub_FR public vaultHub;

    // H-4 FIX: Timelocked dao/vaultHub rotation
    /// @notice pendingDAO_FR
    address public pendingDAO_FR;
    /// @notice pendingDAOAt_FR
    uint64 public pendingDAOAt_FR;
    /// @notice pendingVaultHub_FR
    address public pendingVaultHub_FR;
    /// @notice pendingVaultHubAt_FR
    uint64 public pendingVaultHubAt_FR;
    /// @notice DAO_CHANGE_DELAY_FR
    uint64 public constant DAO_CHANGE_DELAY_FR = 48 hours;
    /// @notice VAULT_HUB_CHANGE_DELAY_FR
    uint64 public constant VAULT_HUB_CHANGE_DELAY_FR = 48 hours;

    // ── Complaint tracking ───────────────────────────────────
    /// @notice SystemExemptCheckFailed
    /// @param fraudRegistry fraudRegistry
    event SystemExemptCheckFailed(address indexed fraudRegistry);
    /// @notice EscrowReleaseTargetResolved
    /// @param escrowIndex escrowIndex
    /// @param originalTarget originalTarget
    /// @param resolvedTarget resolvedTarget
    event EscrowReleaseTargetResolved(
        uint256 indexed escrowIndex,
        address indexed originalTarget,
        address indexed resolvedTarget
    );

    struct Complaint {
        address reporter;
        string reason;
        uint64 timestamp;
    }

    // target → complaints
    /// @notice complaints
    mapping(address => Complaint[]) public complaints;
    // target → reporter → has complained (legacy compatibility)
    /// @notice hasComplained
    mapping(address => mapping(address => bool)) public hasComplained;
    // target → reporter → latest epoch marker (epoch + 1)
    /// @notice lastComplaintEpoch
    mapping(address => mapping(address => uint64)) public lastComplaintEpoch;
    // target → current complaint epoch
    /// @notice complaintEpoch
    mapping(address => uint64) public complaintEpoch;
    // target → total complaint count
    /// @notice complaintCount
    mapping(address => uint8) public complaintCount;

    // ── Fraud flags ──────────────────────────────────────────
    /// @notice isPendingReview
    mapping(address => bool) public isPendingReview; // 3+ complaints → awaiting DAO review
    /// @notice isFlagged
    mapping(address => bool) public isFlagged; // DAO confirmed fraud → service ban + escrow
    /// @notice isPermanentlyBanned
    mapping(address => bool) public isPermanentlyBanned; // DAO escalation
    /// @notice flaggedAt
    mapping(address => uint64) public flaggedAt;
    /// @notice pendingReviewAt
    mapping(address => uint64) public pendingReviewAt; // When review was triggered
    /// @notice dismissedComplaintPenaltyCursor
    mapping(address => uint256) public dismissedComplaintPenaltyCursor; // Number of dismissed complaints already penalized
    // N-H1 FIX: Chunked escrow-refund state used after clearFlag to avoid unbounded loops.
    /// @notice clearFlagEscrowCursor
    mapping(address => uint256) public clearFlagEscrowCursor;
    /// @notice clearFlagEscrowRefundPending
    mapping(address => bool) public clearFlagEscrowRefundPending;
    // H-4 FIX: Pending permanent ban state (7-day timelock)
    /// @notice pendingPermanentBanAt
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

    /// @notice escrowedTransfers
    EscrowedTransfer[] public escrowedTransfers;
    /// @notice userEscrowIndices
    mapping(address => uint256[]) public userEscrowIndices; // from → escrow indices
    // M5g FIX: track active (not released, not cancelled) escrow count per user separately from
    // the historical array length. Without this, after 500 lifetime escrows the user is permanently
    // DoS'd from new transfers even after all earlier escrows have released. Cap is now applied to
    // active count, not lifetime array length.
    /// @notice userActiveEscrowCount
    mapping(address => uint256) public userActiveEscrowCount;
    // H-3 FIX: Running total of tokens committed in active (unreleased/uncancelled) escrows
    /// @notice totalActiveEscrowed
    uint256 public totalActiveEscrowed;

    // ── Events ───────────────────────────────────────────────
    /// @notice ComplaintFiled
    /// @param target target
    /// @param reporter reporter
    /// @param reason reason
    /// @param totalComplaints totalComplaints
    event ComplaintFiled(
        address indexed target,
        address indexed reporter,
        string reason,
        uint8 totalComplaints
    );
    /// @notice PendingDAOReview
    /// @param target target
    /// @param complaints complaints
    event PendingDAOReview(address indexed target, uint8 complaints);
    /// @notice FraudConfirmedByDAO
    /// @param target target
    /// @param confirmedBy confirmedBy
    event FraudConfirmedByDAO(address indexed target, address indexed confirmedBy);
    /// @notice ComplaintsDismissedByDAO
    /// @param target target
    /// @param dismissedBy dismissedBy
    event ComplaintsDismissedByDAO(address indexed target, address indexed dismissedBy);
    /// @notice FlagCleared
    /// @param target target
    /// @param clearedBy clearedBy
    event FlagCleared(address indexed target, address indexed clearedBy);
    /// @notice PermanentBanSet
    /// @param target target
    /// @param banned banned
    event PermanentBanSet(address indexed target, bool banned);
    /// @notice PermanentBanScheduled
    /// @param target target
    /// @param effectiveAt effectiveAt
    event PermanentBanScheduled(address indexed target, uint64 effectiveAt);
    /// @notice PermanentBanCancelled
    /// @param target target
    event PermanentBanCancelled(address indexed target);
    /// @notice TransferEscrowed
    /// @param escrowIndex escrowIndex
    /// @param from from
    /// @param to to
    /// @param amount amount
    /// @param releaseAt releaseAt
    event TransferEscrowed(
        uint256 indexed escrowIndex,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint64 releaseAt
    );
    /// @notice EscrowReleased
    /// @param escrowIndex escrowIndex
    /// @param to to
    /// @param amount amount
    event EscrowReleased(uint256 indexed escrowIndex, address indexed to, uint256 amount);
    /// @notice EscrowRescued
    /// @param escrowIndex escrowIndex
    /// @param recipient recipient
    /// @param amount amount
    event EscrowRescued(uint256 indexed escrowIndex, address indexed recipient, uint256 amount);
    /// @notice EscrowCancelledOnClear
    /// @param escrowIndex escrowIndex
    /// @param from from
    /// @param amount amount
    event EscrowCancelledOnClear(uint256 indexed escrowIndex, address indexed from, uint256 amount);
    /// @notice ClearFlagEscrowRefundProgress
    /// @param target target
    /// @param processed processed
    /// @param nextCursor nextCursor
    /// @param complete complete
    event ClearFlagEscrowRefundProgress(
        address indexed target,
        uint256 processed,
        uint256 nextCursor,
        bool complete
    );
    /// @notice DAOSet
    /// @param oldDAO oldDAO
    /// @param newDAO newDAO
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    /// @notice DAOProposed
    /// @param newDAO newDAO
    /// @param effectiveAt effectiveAt
    event DAOProposed(address indexed newDAO, uint64 effectiveAt);
    /// @notice DAOChangeCancelled
    event DAOChangeCancelled();
    /// @notice VaultHubSet
    /// @param oldVaultHub oldVaultHub
    /// @param newVaultHub newVaultHub
    event VaultHubSet(address indexed oldVaultHub, address indexed newVaultHub);
    /// @notice VaultHubProposed
    /// @param newVaultHub newVaultHub
    /// @param effectiveAt effectiveAt
    event VaultHubProposed(address indexed newVaultHub, uint64 effectiveAt);
    /// @notice VaultHubChangeCancelled
    event VaultHubChangeCancelled();
    /// @notice DismissedComplaintPenaltyProcessed
    /// @param target target
    /// @param processedCount processedCount
    /// @param nextCursor nextCursor
    event DismissedComplaintPenaltyProcessed(
        address indexed target,
        uint256 processedCount,
        uint256 nextCursor
    );
    /// @notice DismissedComplaintPenaltyFailed
    /// @param target target
    /// @param reporter reporter
    /// @param reason reason
    event DismissedComplaintPenaltyFailed(
        address indexed target,
        address indexed reporter,
        bytes reason
    );

    /// @notice onlyDAO
    modifier onlyDAO() {
        if (msg.sender != dao) revert FR_NotDAO();
        _;
    }

    /// @notice constructor
    /// @param _dao _dao
    /// @param _seer _seer
    /// @param _vfideToken _vfideToken
    constructor(address _dao, address _seer, address _vfideToken) {
        if (_dao == address(0) || _seer == address(0) || _vfideToken == address(0))
            revert FR_Zero();
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
        if (isPendingReview[target] || isFlagged[target] || isPermanentlyBanned[target])
            revert FR_ReviewActive();

        // Reporter must have minimum trust
        uint16 reporterScore = seer.getCachedScore(msg.sender);
        if (reporterScore < MIN_REPORTER_SCORE) revert FR_InsufficientScore();

        lastComplaintEpoch[target][msg.sender] = epoch + 1;
        hasComplained[target][msg.sender] = true;

        // Cap complaints array to prevent unbounded growth
        require(complaints[target].length < 100, "FR: complaint limit");

        complaints[target].push(
            Complaint({reporter: msg.sender, reason: reason, timestamp: uint64(block.timestamp)})
        );
        ++complaintCount[target];

        emit ComplaintFiled(target, msg.sender, reason, complaintCount[target]);

        // At threshold: enter pending DAO review (NOT auto-flagged)
        // The DAO must review evidence and explicitly confirm before
        // any consequences take effect. This prevents coordinated false reports.
        if (
            complaintCount[target] >= COMPLAINTS_TO_FLAG &&
            !isPendingReview[target] &&
            !isFlagged[target]
        ) {
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
    function escrowTransfer(
        address from,
        address to,
        uint256 amount
    ) external nonReentrant returns (uint256 escrowIndex) {
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
        escrowedTransfers.push(
            EscrowedTransfer({
                from: from,
                to: to,
                amount: amount,
                releaseAt: releaseAt,
                released: false,
                cancelled: false,
                recipientOwner: recipientOwner
            })
        );

        // M5g FIX: cap on ACTIVE escrows per user, not lifetime array length.
        // Prevents permanent user DoS after 500 historical escrows have released.
        require(userActiveEscrowCount[from] < 500, "FR: escrow limit");
        userEscrowIndices[from].push(escrowIndex);
        ++userActiveEscrowCount[from];
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
        // M5g FIX: decrement per-user active count so the user can keep transacting after release
        if (userActiveEscrowCount[e.from] > 0) {
            --userActiveEscrowCount[e.from];
        }

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
        try IVFIDEToken_SystemExempt(address(vfideToken)).systemExempt(address(this)) returns (
            bool exempt
        ) {
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

    /// @notice rescueStuckEscrow
    /// @param escrowIndex escrowIndex
    /// @param recipient recipient
    function rescueStuckEscrow(
        uint256 escrowIndex,
        address recipient
    ) external onlyDAO nonReentrant {
        // #374 hardening: only allow rescue back to original sender.
        // Keep recipient arg for ABI compatibility with existing integrations.
        if (recipient == address(0)) revert FR_Zero();
        if (escrowIndex >= escrowedTransfers.length) revert FR_EscrowInvalidIndex();

        EscrowedTransfer storage e = escrowedTransfers[escrowIndex];
        if (e.released || e.cancelled) revert FR_EscrowAlreadyProcessed();
        require(block.timestamp >= e.releaseAt + ESCROW_RESCUE_DELAY, "FR: rescue timelock active");
        if (recipient != e.from) revert FR_EscrowRecipientMismatch();

        e.cancelled = true;
        totalActiveEscrowed -= e.amount;
        // M5g FIX: decrement per-user active count on rescue/cancel
        if (userActiveEscrowCount[e.from] > 0) {
            --userActiveEscrowCount[e.from];
        }
        SafeERC20.safeTransfer(vfideToken, e.from, e.amount);

        emit EscrowRescued(escrowIndex, e.from, e.amount);
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

    // slither-disable-next-line reentrancy-no-eth  // function has nonReentrant guard; status updates and Seer calls are protected
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

        // N-M4 FIX: Process a bounded first chunk immediately so penalty application
        // does not depend entirely on a separate keeper call.
        _processDismissedComplaintPenalties(target, 20);

        // F-SC-037 FIX: After the bounded penalty chunk runs, reset the trigger
        // state so a single new complaint cannot reactivate pendingReview using
        // the previously-dismissed count. Without these resets, complaintCount
        // remained at >= COMPLAINTS_TO_FLAG and complaints[target] retained the
        // old entries, which meant ONE new reporter at line 215 was enough to
        // re-enter pending review with the same set of dismissed complaints —
        // a harassment vector. We mirror clearFlag (lines 461-464): zero the
        // count, drop the historical complaints array, reset the penalty
        // cursor, and bump the per-target epoch so each previously-dismissed
        // reporter must use a NEW per-reporter epoch slot before they can file
        // again. The trade-off (matching clearFlag): any reporters beyond the
        // first 20 inline-processed penalties are not punished. In typical
        // cases COMPLAINTS_TO_FLAG <= 20 so all reporters are punished inline.
        complaintCount[target] = 0;
        delete complaints[target];
        dismissedComplaintPenaltyCursor[target] = 0;
        ++complaintEpoch[target];

        emit ComplaintsDismissedByDAO(target, msg.sender);
    }

    /// @notice Process reporter penalties for previously dismissed complaints in bounded chunks.
    /// @param target Address whose dismissed complaints are being processed.
    /// @param maxCount Maximum number of complaints to process in this call. Zero means 20.
    /// @return processed processed
    function processDismissedComplaintPenalties(
        address target,
        uint256 maxCount
    ) external nonReentrant returns (uint256 processed) {
        processed = _processDismissedComplaintPenalties(target, maxCount);
    }

    // slither-disable-next-line reentrancy-no-eth  // protected by parent function's nonReentrant guard
    /// @dev Internal helper called only from `dismissComplaints` (which is nonReentrant).
    /// @notice _processDismissedComplaintPenalties
    /// @param target target
    /// @param maxCount maxCount
    /// @return processed processed
    function _processDismissedComplaintPenalties(
        address target,
        uint256 maxCount
    ) internal returns (uint256 processed) {
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

        for (uint256 i = cursor; i < stop; ++i) {
            try
                seer.punish(
                    filed[i].reporter,
                    COMPLAINT_REPORTER_PENALTY,
                    "false_complaint_dismissed"
                )
            {
                ++processed;
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
        ++complaintEpoch[target];

        // N-H1 FIX: Escrow refunds are processed in bounded chunks via
        // processClearFlagEscrowRefunds() to prevent clearFlag gas exhaustion.
        clearFlagEscrowCursor[target] = 0;
        clearFlagEscrowRefundPending[target] = true;

        emit FlagCleared(target, msg.sender);
    }

    // slither-disable-next-line reentrancy-no-eth  // function has nonReentrant guard; SafeERC20.safeTransfer reverts atomically on failure
    /// @notice Process refund cancellation for escrows linked to a target whose flag was cleared.
    /// @dev N-H1 FIX: Bounded chunk processing to avoid unbounded clearFlag loops.
    /// @param target Address whose flag was cleared.
    /// @param maxCount Max escrow entries to scan in this call (0 => default 25).
    /// @return processed processed
    function processClearFlagEscrowRefunds(
        address target,
        uint256 maxCount
    ) external nonReentrant returns (uint256 processed) {
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

        for (uint256 i = cursor; i < stop; ++i) {
            uint256 escrowIndex = userIndices[i];
            if (escrowIndex >= escrowedTransfers.length) continue;

            EscrowedTransfer storage e = escrowedTransfers[escrowIndex];
            if (!e.released && !e.cancelled) {
                e.cancelled = true;
                totalActiveEscrowed -= e.amount;
                // M5g FIX: decrement per-user active count on clear-flag refund cancel
                if (userActiveEscrowCount[e.from] > 0) {
                    --userActiveEscrowCount[e.from];
                }
                SafeERC20.safeTransfer(vfideToken, e.from, e.amount);
                emit EscrowCancelledOnClear(escrowIndex, e.from, e.amount);
                ++processed;
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
    /// @param banned banned
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
    /// @param _dao _dao
    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert FR_Zero();
        require(pendingDAO_FR == address(0), "FR: pending dao");
        pendingDAO_FR = _dao;
        pendingDAOAt_FR = uint64(block.timestamp) + DAO_CHANGE_DELAY_FR;
        emit DAOProposed(_dao, pendingDAOAt_FR);
    }

    /// @notice applyDAO_FR
    function applyDAO_FR() external onlyDAO {
        require(pendingDAO_FR != address(0) && block.timestamp >= pendingDAOAt_FR, "FR: timelock");
        address old = dao;
        dao = pendingDAO_FR;
        pendingDAO_FR = address(0);
        pendingDAOAt_FR = 0;
        emit DAOSet(old, dao);
    }

    /// @notice cancelDAO_FR
    function cancelDAO_FR() external onlyDAO {
        require(pendingDAO_FR != address(0), "FR: no pending");
        pendingDAO_FR = address(0);
        pendingDAOAt_FR = 0;
        emit DAOChangeCancelled();
    }

    /// @notice Propose a new VaultHub address (takes effect after 48h)
    /// @param _vaultHub _vaultHub
    function setVaultHub(address _vaultHub) external onlyDAO {
        if (_vaultHub == address(0)) revert FR_Zero();
        require(pendingVaultHub_FR == address(0), "FR: pending vaultHub");
        pendingVaultHub_FR = _vaultHub;
        pendingVaultHubAt_FR = uint64(block.timestamp) + VAULT_HUB_CHANGE_DELAY_FR;
        emit VaultHubProposed(_vaultHub, pendingVaultHubAt_FR);
    }

    /// @notice applyVaultHub_FR
    function applyVaultHub_FR() external onlyDAO {
        require(
            pendingVaultHub_FR != address(0) && block.timestamp >= pendingVaultHubAt_FR,
            "FR: timelock"
        );
        address old = address(vaultHub);
        vaultHub = IVaultHub_FR(pendingVaultHub_FR);
        pendingVaultHub_FR = address(0);
        pendingVaultHubAt_FR = 0;
        emit VaultHubSet(old, address(vaultHub));
    }

    /// @notice cancelVaultHub_FR
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
    /// @param target target
    /// @return reporters reporters
    /// @return reasons reasons
    /// @return timestamps timestamps
    function getComplaints(
        address target
    )
        external
        view
        returns (address[] memory reporters, string[] memory reasons, uint64[] memory timestamps)
    {
        Complaint[] storage c = complaints[target];
        uint256 len = c.length;
        reporters = new address[](len);
        reasons = new string[](len);
        timestamps = new uint64[](len);

        for (uint256 i = 0; i < len; ++i) {
            reporters[i] = c[i].reporter;
            reasons[i] = c[i].reason;
            timestamps[i] = c[i].timestamp;
        }
    }

    /// @notice Get pending escrowed transfers for an address
    /// @param user user
    /// @return indices indices
    /// @return recipients recipients
    /// @return amounts amounts
    /// @return releaseAts releaseAts
    function getPendingEscrows(
        address user
    )
        external
        view
        returns (
            uint256[] memory indices,
            address[] memory recipients,
            uint256[] memory amounts,
            uint64[] memory releaseAts
        )
    {
        uint256[] storage userIndices = userEscrowIndices[user];
        uint256 pendingCount = 0;
        uint256 _len = userIndices.length;

        for (uint256 i = 0; i < _len; ++i) {
            EscrowedTransfer storage e = escrowedTransfers[userIndices[i]];
            if (!e.released && !e.cancelled) {
                ++pendingCount;
            }
        }

        indices = new uint256[](pendingCount);
        recipients = new address[](pendingCount);
        amounts = new uint256[](pendingCount);
        releaseAts = new uint64[](pendingCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < _len; ++i) {
            EscrowedTransfer storage e = escrowedTransfers[userIndices[i]];
            if (!e.released && !e.cancelled) {
                indices[idx] = userIndices[i];
                recipients[idx] = e.to;
                amounts[idx] = e.amount;
                releaseAts[idx] = e.releaseAt;
                ++idx;
            }
        }
    }

    /// @notice Get pending escrowed transfers with bounded pagination.
    /// @param user Address to inspect.
    /// @param offset Cursor in userEscrowIndices[user].
    /// @param limit Max entries to scan from the cursor (0 => default 25).
    /// @return indices Matching escrow indices.
    /// @return recipients Escrow recipients.
    /// @return amounts Escrow amounts.
    /// @return releaseAts Escrow unlock timestamps.
    /// @return nextOffset Cursor for the next page.
    function getPendingEscrowsPaginated(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint256[] memory indices,
            address[] memory recipients,
            uint256[] memory amounts,
            uint64[] memory releaseAts,
            uint256 nextOffset
        )
    {
        uint256[] storage userIndices = userEscrowIndices[user];
        uint256 len = userIndices.length;
        if (offset >= len) {
            return (new uint256[](0), new address[](0), new uint256[](0), new uint64[](0), offset);
        }

        uint256 span = limit == 0 ? 25 : limit;
        uint256 stop = offset + span;
        if (stop > len) stop = len;

        uint256 pendingCount = 0;
        for (uint256 i = offset; i < stop; ++i) {
            EscrowedTransfer storage e = escrowedTransfers[userIndices[i]];
            if (!e.released && !e.cancelled) ++pendingCount;
        }

        indices = new uint256[](pendingCount);
        recipients = new address[](pendingCount);
        amounts = new uint256[](pendingCount);
        releaseAts = new uint64[](pendingCount);

        uint256 idx = 0;
        for (uint256 i = offset; i < stop; ++i) {
            uint256 escrowIndex = userIndices[i];
            EscrowedTransfer storage e = escrowedTransfers[escrowIndex];
            if (!e.released && !e.cancelled) {
                indices[idx] = escrowIndex;
                recipients[idx] = e.to;
                amounts[idx] = e.amount;
                releaseAts[idx] = e.releaseAt;
                ++idx;
            }
        }

        nextOffset = stop;
    }

    /// @notice Get fraud status summary for an address
    /// @param user user
    /// @return totalComplaints totalComplaints
    /// @return pendingReview pendingReview
    /// @return flagged flagged
    /// @return permanentlyBanned permanentlyBanned
    /// @return flagTimestamp flagTimestamp
    /// @return pendingEscrowCount pendingEscrowCount
    function getFraudStatus(
        address user
    )
        external
        view
        returns (
            uint8 totalComplaints,
            bool pendingReview,
            bool flagged,
            bool permanentlyBanned,
            uint64 flagTimestamp,
            uint256 pendingEscrowCount
        )
    {
        totalComplaints = complaintCount[user];
        pendingReview = isPendingReview[user];
        flagged = isFlagged[user];
        permanentlyBanned = isPermanentlyBanned[user];
        flagTimestamp = flaggedAt[user];

        // Count pending escrows
        uint256[] storage userIndices = userEscrowIndices[user];
        uint256 _lenUI = userIndices.length;
        for (uint256 i = 0; i < _lenUI; ++i) {
            EscrowedTransfer storage e = escrowedTransfers[userIndices[i]];
            if (!e.released && !e.cancelled) {
                ++pendingEscrowCount;
            }
        }
    }

    // ── H-7 FIX: DAO rescue for unrecorded token balance ──────────
    // If tokens end up in FraudRegistry's balance without a matching
    // escrow record (e.g., direct transfer, edge case), the DAO can
    // recover the surplus.
    /// @notice TokensRescued
    /// @param to to
    /// @param amount amount
    event TokensRescued(address indexed to, uint256 amount);

    /// @notice rescueExcessTokens
    /// @param to to
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
