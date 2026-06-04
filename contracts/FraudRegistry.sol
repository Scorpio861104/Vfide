// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title FraudRegistry
 * @notice Community-driven fraud reporting with protocol-wide consequences
 *
 * HOW IT WORKS (non-custodial — the system never holds, delays, or seizes funds):
 *   - Any user with ProofScore >= MIN_REPORTER_SCORE may file a fraud complaint against an address.
 *   - One complaint per reporter per target per epoch (no spam); a false report that is dismissed
 *     costs the reporter score, escalating for repeat offenders (the reporter bond).
 *   - At COMPLAINTS_TO_FLAG complaints the target enters review and, if a jury is wired, a FraudJury
 *     case opens.
 *   - A flag is confirmed ONLY by a peer-jury supermajority (FraudJury). The DAO can soften (veto) a
 *     case but can NEVER unilaterally confirm one.
 *   - A confirmed flag's ONLY consequences are: a risk SIGNAL to counterparties (see riskLevel), a
 *     Seer score penalty (→ higher fees), and a SERVICE ban (no merchant / pool rewards / endorsing).
 *     Transfers are NEVER held, delayed, or seized — a user's funds always move.
 *   - Signals + service-bans auto-expire after SIGNAL_TTL (decay / forgiveness). Permanent bans are
 *     exempt. A flagged party can redeem by making a victim whole (registerRestitution →
 *     confirmRestitution), which clears the flag.
 *
 * WHAT THIS IS NOT:
 *   - It does NOT freeze, hold, delay, or escrow funds. (The former 30-day hold has been removed.)
 *   - It does NOT seize tokens. The flagged user keeps everything in their vault.
 *   - It does NOT give anyone custody, and no single authority (the DAO included) can confirm a flag.
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

/// @notice IFraudJury_FR — peer-jury adjudication module (step 3 reform).
/// @dev Punishment may only follow a jury CONFIRMATION; the DAO can soften (veto) but never confirm.
interface IFraudJury_FR {
    /// @notice Open a fresh jury cycle for a target (called at the complaint threshold).
    function openCase(address target) external;
    /// @notice True only when a peer jury has upheld the accusation.
    function isConfirmed(address target) external view returns (bool);
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
/// @notice FR_NoRestitution
error FR_NoRestitution();
/// @notice FR_NotVictim
error FR_NotVictim();
/// @notice FR_ReviewActive
error FR_ReviewActive();
/// @notice FR_InvalidTarget
error FR_InvalidTarget();

/// @notice FraudRegistry
/// @title FraudRegistry
/// @author Vfide
contract FraudRegistry is ReentrancyGuard {

    // ── Configuration ────────────────────────────────────────
    /// @notice COMPLAINTS_TO_FLAG
    uint8 public constant COMPLAINTS_TO_FLAG = 3;
    /// @notice SIGNAL_TTL — a confirmed fraud signal + service-ban auto-expires this long after
    ///         confirmation (decay / forgiveness, so there is no permanent reputational death).
    ///         Permanent bans are exempt. After expiry anyone may call expireFlag() to clear storage.
    uint256 public constant SIGNAL_TTL = 90 days;
    /// @notice PENDING_REVIEW_APPEAL_WINDOW
    uint256 public constant PENDING_REVIEW_APPEAL_WINDOW = 48 hours;
    /// @notice H-4 FIX: Timelock for permanent ban — gives subject time to appeal before irreversible action
    uint256 public constant PERMANENT_BAN_DELAY = 7 days;
    /// @notice MIN_REPORTER_SCORE
    uint16 public constant MIN_REPORTER_SCORE = 6000;
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
    /// @notice fraudJury — peer-jury module. When set, confirmFraud requires a jury confirmation.
    IFraudJury_FR public fraudJury;

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
    mapping(address => bool) public isPendingReview;   // 3+ complaints → awaiting DAO review
    /// @notice isFlagged
    mapping(address => bool) public isFlagged;         // DAO confirmed fraud → service ban + escrow
    /// @notice isPermanentlyBanned
    mapping(address => bool) public isPermanentlyBanned; // DAO escalation
    /// @notice flaggedAt
    mapping(address => uint64) public flaggedAt;
    /// @notice Restitution claim a flagged party registers when seeking redemption.
    struct Restitution { address victim; bytes32 proofHash; uint64 at; }
    /// @notice target => pending restitution claim (cleared on confirmation).
    mapping(address => Restitution) public restitution;
    /// @notice pendingReviewAt
    mapping(address => uint64) public pendingReviewAt;  // When review was triggered
    /// @notice dismissedComplaintPenaltyCursor
    mapping(address => uint256) public dismissedComplaintPenaltyCursor; // Number of dismissed complaints already penalized
    /// @notice priorDismissals — count of this reporter's complaints previously dismissed as false.
    /// @dev Reporter bond: each prior dismissed false complaint escalates the score slash applied
    ///      to this reporter on the next dismissal (50, 100, 150, ...). Honest reporting stays free.
    mapping(address => uint32) public priorDismissals;
    // H-4 FIX: Pending permanent ban state (7-day timelock)
    /// @notice pendingPermanentBanAt
    mapping(address => uint64) public pendingPermanentBanAt; // 0 = no pending ban


    // ── Events ───────────────────────────────────────────────
    /// @notice ComplaintFiled
    /// @param target target
    /// @param reporter reporter
    /// @param reason reason
    /// @param totalComplaints totalComplaints
    event ComplaintFiled(address indexed target, address indexed reporter, string reason, uint8 totalComplaints);
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
    event DismissedComplaintPenaltyProcessed(address indexed target, uint256 processedCount, uint256 nextCursor);
    /// @notice DismissedComplaintPenaltyFailed
    /// @param target target
    /// @param reporter reporter
    /// @param reason reason
    event DismissedComplaintPenaltyFailed(address indexed target, address indexed reporter, bytes reason);

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
        uint16 reporterScore = seer.getCachedScore(msg.sender);
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
        ++complaintCount[target];

        emit ComplaintFiled(target, msg.sender, reason, complaintCount[target]);

        // At threshold: enter pending DAO review (NOT auto-flagged)
        // The DAO must review evidence and explicitly confirm before
        // any consequences take effect. This prevents coordinated false reports.
        if (complaintCount[target] >= COMPLAINTS_TO_FLAG && !isPendingReview[target] && !isFlagged[target]) {
            isPendingReview[target] = true;
            pendingReviewAt[target] = uint64(block.timestamp);
            emit PendingDAOReview(target, complaintCount[target]);
            // Open a peer-jury cycle (if wired). Wrapped so a jury hiccup can never block the
            // ability to file a complaint.
            if (address(fraudJury) != address(0)) {
                try fraudJury.openCase(target) {} catch {}
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  ESCROW FOR FLAGGED TRANSFERS
    // ═══════════════════════════════════════════════════════════

    /// @notice DEPRECATED / NON-CUSTODIAL: fund holds removed — this reverts. Retained as an
    ///         ABI-compatibility stub only. The token now delivers every transfer directly.
    function escrowTransfer(address, address, uint256) external pure returns (uint256) {
        // NON-CUSTODIAL: fund holds are removed. The system never withholds, delays, or seizes a
        // user's funds. This entry point is retained ONLY as a reverting stub for ABI compatibility
        // during migration; the token now delivers every transfer directly. Fraud is handled by
        // risk signal + Seer score penalty + service-ban — never by escrowing transfers.
        revert("FR: fund holds removed - non-custodial");
    }

    // releaseEscrow / rescueStuckEscrow removed — no escrow is ever created (fund holds removed),
    // so the release/rescue lifecycle and its storage no longer exist. Non-custodial by construction.



    // ═══════════════════════════════════════════════════════════
    //  SERVICE BAN CHECK — Called by all protocol services
    // ═══════════════════════════════════════════════════════════

    /// @notice Check if an address is banned from protocol services
    /// @param user Address to check
    /// @return banned True if flagged or permanently banned
    /// @notice Risk tiers surfaced to counterparties (the frontend risk card) and integrators.
    /// @dev NON-CUSTODIAL: this is an advisory SIGNAL only — it never holds, delays, or seizes
    ///      funds. It is the information that replaced the removed 30-day escrow hold.
    enum RiskLevel { None, Reported, UnderReview, Confirmed }

    /// @notice Advisory fraud-risk level for `user` (None/Reported/UnderReview/Confirmed).
    /// @dev Consumed by the payment-time risk card; never gates a transfer.
    function riskLevel(address user) external view returns (RiskLevel) {
        if (_flagActive(user) || isPermanentlyBanned[user]) return RiskLevel.Confirmed;
        if (isPendingReview[user]) return RiskLevel.UnderReview;
        if (complaintCount[user] > 0) return RiskLevel.Reported;
        return RiskLevel.None;
    }

    /// @notice A confirmed flag is "active" only within SIGNAL_TTL of confirmation; afterward the
    ///         signal and service-ban decay automatically. Anyone may then call expireFlag() to clear
    ///         storage. Permanent bans do NOT decay (callers OR them in separately).
    function _flagActive(address user) internal view returns (bool) {
        return isFlagged[user] && block.timestamp <= flaggedAt[user] + SIGNAL_TTL;
    }

    function isServiceBanned(address user) external view returns (bool) {
        return _flagActive(user) || isPermanentlyBanned[user];
    }

    /// @notice NON-CUSTODIAL: always returns false. No transfer ever requires a hold/escrow.
    ///         Fraud is handled by risk signal + Seer score + service-ban, never by withholding funds.
    /// @return required Always false.
    function requiresEscrow(address) external pure returns (bool) {
        // NON-CUSTODIAL: the system never holds, delays, or seizes funds. Fraud is handled by
        // risk signal (see riskLevel/getFraudStatus) + Seer score penalty + service-ban, never by
        // escrowing transfers. Returns false unconditionally so neither the token transfer path nor
        // the bridge ever withholds a user's funds.
        return false;
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
        // NON-CUSTODIAL FAIRNESS: when a peer jury is wired, a flag may ONLY follow a jury
        // CONFIRMATION — the DAO cannot unilaterally confirm fraud (it may only soften, via
        // FraudJury.daoVeto). When no jury is wired yet, fall back to the 48h appeal window so
        // existing/pre-jury deployments keep working unchanged.
        if (address(fraudJury) != address(0)) {
            require(fraudJury.isConfirmed(target), "FR: jury has not confirmed");
        } else {
            require(
                block.timestamp >= pendingReviewAt[target] + PENDING_REVIEW_APPEAL_WINDOW,
                "FR: appeal window not elapsed"
            );
        }

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
    function processDismissedComplaintPenalties(address target, uint256 maxCount) external nonReentrant returns (uint256 processed) {
        processed = _processDismissedComplaintPenalties(target, maxCount);
    }

    // slither-disable-next-line reentrancy-no-eth  // protected by parent function's nonReentrant guard
    /// @dev Internal helper called only from `dismissComplaints` (which is nonReentrant).
    /// @notice _processDismissedComplaintPenalties
    /// @param target target
    /// @param maxCount maxCount
    /// @return processed processed
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

        for (uint256 i = cursor; i < stop; ++i) {
            address reporter = filed[i].reporter;
            // Reporter bond: the slash escalates with each prior false complaint by this reporter
            // (50, 100, 150, ...), capped at uint16 max. One honest mistake is cheap; serial false
            // reporting becomes expensive — skin-in-the-game without any token deposit.
            uint256 escalated = uint256(COMPLAINT_REPORTER_PENALTY) * (uint256(priorDismissals[reporter]) + 1);
            uint16 penalty = escalated > type(uint16).max ? type(uint16).max : uint16(escalated);
            try seer.punish(reporter, penalty, "false_complaint_dismissed") {
                unchecked { ++priorDismissals[reporter]; }
                ++processed;
                newCursor = i + 1;
            } catch (bytes memory reason) {
                emit DismissedComplaintPenaltyFailed(target, reporter, reason);
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
        _clearFlag(target);
    }

    /// @notice Internal flag-clear shared by DAO clearFlag, redemption, and signal expiry.
    /// @dev Resets complaint state (N-H2) and bumps the epoch so a cleared subject is not instantly
    ///      re-flaggable from stale history. Emits FlagCleared(target, caller) on every clear path.
    function _clearFlag(address target) internal {
        isFlagged[target] = false;
        flaggedAt[target] = 0;
        isPendingReview[target] = false;
        pendingReviewAt[target] = 0;
        complaintCount[target] = 0;
        delete complaints[target];
        dismissedComplaintPenaltyCursor[target] = 0;
        ++complaintEpoch[target];
        emit FlagCleared(target, msg.sender);
    }

    /// @notice Emitted when a confirmed signal is cleared because its SIGNAL_TTL elapsed.
    event FlagExpired(address indexed target);
    /// @notice Emitted when a flagged party registers a restitution claim toward redemption.
    event RestitutionRegistered(address indexed target, address indexed victim, bytes32 proofHash);
    /// @notice Emitted when redemption is confirmed (by the victim or the DAO) and the flag is cleared.
    event RedemptionConfirmed(address indexed target, address indexed by);

    /// @notice Permissionlessly clear a confirmed flag whose SIGNAL_TTL has elapsed (decay / forgiveness).
    /// @dev Anyone may call once expired. Permanent bans are unaffected (use the ban functions).
    function expireFlag(address target) external {
        if (!isFlagged[target]) revert FR_NotFlagged();
        require(block.timestamp > flaggedAt[target] + SIGNAL_TTL, "FR: signal not expired");
        _clearFlag(target);
        emit FlagExpired(target);
    }

    /// @notice A flagged party registers that they have made a victim whole (off-chain proof pointer).
    /// @dev NON-CUSTODIAL: redemption is a path back, never a fund operation. The named victim — or the
    ///      DAO backstop — must confirm before the flag clears. Seer should grant the Redemption badge
    ///      and let the score recover via decay in response to RedemptionConfirmed (not done here, as
    ///      this contract only ever lowers scores via punish, never raises them).
    function registerRestitution(address victim, bytes32 proofHash) external {
        if (victim == address(0)) revert FR_Zero();
        if (!isFlagged[msg.sender]) revert FR_NotFlagged();
        restitution[msg.sender] = Restitution({victim: victim, proofHash: proofHash, at: uint64(block.timestamp)});
        emit RestitutionRegistered(msg.sender, victim, proofHash);
    }

    /// @notice The named victim attests they were made whole; clears the flag (redemption).
    function confirmRestitution(address target) external nonReentrant {
        Restitution memory r = restitution[target];
        if (r.victim == address(0)) revert FR_NoRestitution();
        if (msg.sender != r.victim) revert FR_NotVictim();
        if (!isFlagged[target]) revert FR_NotFlagged();
        delete restitution[target];
        _clearFlag(target);
        emit RedemptionConfirmed(target, msg.sender);
    }

    /// @notice DAO backstop: confirm redemption (e.g. victim unresponsive; DAO verified proof off-chain).
    function daoConfirmRestitution(address target) external onlyDAO nonReentrant {
        if (!isFlagged[target]) revert FR_NotFlagged();
        delete restitution[target];
        _clearFlag(target);
        emit RedemptionConfirmed(target, msg.sender);
    }

    // processClearFlagEscrowRefunds removed — there are no escrows to refund (fund holds removed).



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

    /// @notice Emitted when the peer-jury module is wired or unwired.
    event FraudJurySet(address indexed fraudJury);

    /// @notice Wire (or unwire) the peer-jury module. Once set, confirmFraud requires a jury
    ///         CONFIRMATION; the DAO can no longer unilaterally confirm fraud (only soften, via
    ///         FraudJury.daoVeto). Setting address(0) reverts to the 48h appeal-window path.
    /// @dev NOTE (pre-mainnet): adopt the timelocked setter pattern (like setVaultHub) before mainnet.
    function setFraudJury(address _fraudJury) external onlyDAO {
        fraudJury = IFraudJury_FR(_fraudJury);
        emit FraudJurySet(_fraudJury);
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
        require(pendingVaultHub_FR != address(0) && block.timestamp >= pendingVaultHubAt_FR, "FR: timelock");
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

        for (uint256 i = 0; i < len; ++i) {
            reporters[i] = c[i].reporter;
            reasons[i] = c[i].reason;
            timestamps[i] = c[i].timestamp;
        }
    }

    // getPendingEscrows / getPendingEscrowsPaginated removed — no escrows exist (fund holds removed).
    // Counterparty risk is exposed via riskLevel()/getFraudStatus(); there is nothing held to enumerate.



    /// @notice Get fraud status summary for an address
    /// @param user user
    /// @return totalComplaints totalComplaints
    /// @return pendingReview pendingReview
    /// @return flagged flagged
    /// @return permanentlyBanned permanentlyBanned
    /// @return flagTimestamp flagTimestamp
    /// @return pendingEscrowCount pendingEscrowCount
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
        pendingEscrowCount = 0; // fund holds removed; retained in the tuple (always 0) for ABI parity.
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

        // No escrow is ever held (fund holds removed), so the entire token balance is rescuable excess.
        uint256 balance = vfideToken.balanceOf(address(this));
        require(balance > 0, "FR: no excess");
        uint256 excess = balance;

        SafeERC20.safeTransfer(vfideToken, to, excess);
        emit TokensRescued(to, excess);
    }
}
