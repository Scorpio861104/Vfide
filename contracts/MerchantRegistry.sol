// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

// ─── Local-scoped interfaces (the _COM suffix keeps these distinct from the
//     canonical interfaces under contracts/interfaces/). Imported by
//     CommerceEscrow.sol via `import "./MerchantRegistry.sol";` ──
/// @notice IVaultHub_COM
/// @title IVaultHub_COM
/// @author Vfide
interface IVaultHub_COM {
    /// @notice vaultOf
    /// @param owner owner
    /// @return _address _address
    function vaultOf(address owner) external view returns (address);
    /// @dev R-4 — used by settleByInheritance to gate on either party's vault
    ///      being in MEMORIAL or CLOSED state.
    /// @notice isInMemorialState
    /// @param vault vault
    /// @return _bool _bool
    function isInMemorialState(address vault) external view returns (bool);
}

/// @notice ISeer_COM
/// @title ISeer_COM
/// @author Vfide
interface ISeer_COM {
    /// @notice getScore
    /// @return _uint16 _uint16
    function getScore(address) external view returns (uint16);
    /// @notice getCachedScore
    /// @return _uint16 _uint16
    function getCachedScore(address) external view returns (uint16);
    /// @notice minForMerchant
    /// @return _uint16 _uint16
    function minForMerchant() external view returns (uint16);
}

/// @notice IProofLedger_COM
/// @title IProofLedger_COM
/// @author Vfide
interface IProofLedger_COM {
    /// @notice logSystemEvent
    /// @param who who
    /// @param action action
    /// @param by by
    function logSystemEvent(address who, string calldata action, address by) external;
    /// @notice logEvent
    /// @param who who
    /// @param action action
    /// @param amount amount
    /// @param note note
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

// ─── File-scope errors. All active errors used by MerchantRegistry AND
//     CommerceEscrow live here (CommerceEscrow.sol imports this file and
//     inherits visibility). Dead errors (COM_NotActive, COM_TooEarly,
//     COM_NotFunded, COM_SecLocked, COM_BadRating) were removed when this
//     file was split off from VFIDECommerce.sol — none had any throw site. ──
/// @notice COM_NotDAO
error COM_NotDAO();
/// @notice COM_Zero
error COM_Zero();
/// @notice COM_NotMerchant
error COM_NotMerchant();
/// @notice COM_AlreadyMerchant
error COM_AlreadyMerchant();
/// @notice COM_Suspended
error COM_Suspended();
/// @notice COM_Delisted
error COM_Delisted();
/// @notice COM_NotBuyer
error COM_NotBuyer();
/// @notice COM_NotSeller
error COM_NotSeller();
/// @notice COM_BadAmount
error COM_BadAmount();
/// @notice COM_BadState
error COM_BadState();
/// @notice COM_NotAllowed
error COM_NotAllowed();
/// @notice R-4 — neither party's vault is in MEMORIAL state.
error COM_NotInheritanceActive();

/// @title MerchantRegistry
/// @notice On-chain merchant directory: registration, profile metadata,
///         status (ACTIVE / SUSPENDED / DELISTED), and refund/dispute
///         decay accounting. Used by CommerceEscrow for merchant
///         verification before any escrow can be opened.
/// @author Vfide
contract MerchantRegistry {
    /// @notice ModulesSet
    /// @param dao dao
    /// @param token token
    /// @param hub hub
    /// @param seer seer
    /// @param ledger ledger
    event ModulesSet(address dao, address token, address hub, address seer, address ledger);
    /// @notice PolicySet
    /// @param minScore minScore
    /// @param autoSuspendRefunds autoSuspendRefunds
    /// @param autoSuspendDisputes autoSuspendDisputes
    event PolicySet(uint16 minScore, uint8 autoSuspendRefunds, uint8 autoSuspendDisputes);
    /// @notice MerchantAdded
    /// @param owner owner
    /// @param vault vault
    /// @param metaHash metaHash
    event MerchantAdded(address indexed owner, address indexed vault, bytes32 metaHash);
    /// @notice Emitted when a merchant updates their off-chain profile hash via setMetaHash.
    /// @param owner owner
    /// @param newHash newHash
    event MerchantMetaHashUpdated(address indexed owner, bytes32 newHash);
    /// @notice MerchantStatus
    /// @param owner owner
    /// @param status status
    /// @param reason reason
    event MerchantStatus(address indexed owner, Status status, string reason);
    /// @notice AutoFlagged
    /// @param owner owner
    /// @param reason reason
    event AutoFlagged(address indexed owner, string reason);

    enum Status { NONE, ACTIVE, SUSPENDED, DELISTED }

    /// @notice dao
    address public immutable dao;
    /// @notice token
    IERC20 public immutable token;
    /// @notice vaultHub
    IVaultHub_COM public immutable vaultHub;
    /// @notice seer
    ISeer_COM public immutable seer;
    /// @notice ledger
    IProofLedger_COM public immutable ledger;

    struct Merchant {
        address owner;
        address vault;
        Status  status;
        uint32  refunds;
        uint32  disputes;
        bytes32 metaHash;
    }

    /// @notice merchants
    mapping(address => Merchant) public merchants;
    /// @notice minScore
    uint16 public immutable minScore;
    /// @notice autoSuspendRefunds
    uint8  public constant autoSuspendRefunds = 5;
    /// @notice autoSuspendDisputes
    uint8  public constant autoSuspendDisputes = 3;

    // POW-1 decay tracking: per-merchant timestamp of most recent strike,
    // used by _applyRefundDecay / _applyDisputeDecay to subtract one from
    // the counter for every full 90-day window of clean operation. This
    // makes the "5 lifetime refunds → permanent ban" rule a "5 refunds in
    // any rolling 90-day window" rule.
    /// @notice lastRefundAt
    mapping(address => uint64) public lastRefundAt;
    /// @notice lastDisputeAt
    mapping(address => uint64) public lastDisputeAt;
    /// @notice STRIKE_DECAY_INTERVAL
    uint64 public constant STRIKE_DECAY_INTERVAL = 90 days;

    /// @notice onlyDAO
    modifier onlyDAO() { if (msg.sender != dao) revert COM_NotDAO(); _; }

    /// @notice constructor
    /// @param _dao _dao
    /// @param _token _token
    /// @param _hub _hub
    /// @param _seer _seer
    /// @param _ledger _ledger
    constructor(address _dao, address _token, address _hub, address _seer, address _ledger) {
        if (_dao==address(0)||_token==address(0)||_hub==address(0)||_seer==address(0)) revert COM_Zero();
        dao=_dao; token=IERC20(_token); vaultHub=IVaultHub_COM(_hub); seer=ISeer_COM(_seer);
        ledger = IProofLedger_COM(_ledger);
        minScore = ISeer_COM(_seer).minForMerchant();
        emit ModulesSet(_dao, _token, _hub, _seer, _ledger);
    }

    // slither-disable-next-line reentrancy-events
    /// @notice addMerchant
    /// @param metaHash metaHash
    function addMerchant(bytes32 metaHash) external {
        if (merchants[msg.sender].status != Status.NONE) revert COM_AlreadyMerchant();
        address v = vaultHub.vaultOf(msg.sender);
        if (v == address(0)) revert COM_NotAllowed();
        uint16 score = seer.getCachedScore(msg.sender);
        if (score < minScore) revert COM_NotAllowed();

        merchants[msg.sender] = Merchant({
            owner: msg.sender,
            vault: v,
            status: Status.ACTIVE,
            refunds: 0,
            disputes: 0,
            metaHash: metaHash
        });

        try ledger.logSystemEvent(msg.sender, "MerchantAdded", msg.sender) {} catch {}
        emit MerchantAdded(msg.sender, v, metaHash);
    }

    /// @notice Update the off-chain profile hash for the calling merchant.
    /// @dev Lets a merchant correct typos, swap avatars, or update their bio without
    ///      re-registering. See VFIDE_MERCHANT_PROFILE_SPEC.md §8 for the off-chain
    ///      JSON shape that this hash resolves to.
    ///
    ///      Status gates:
    ///        - NONE     -> revert (not a registered merchant)
    ///        - ACTIVE   -> allowed
    ///        - SUSPENDED -> allowed (suspension is recoverable; merchant may want to
    ///                                fix what got them suspended)
    ///        - DELISTED -> revert (terminal state; the canonical frontend will not
    ///                              render their profile per spec §7/§8 regardless,
    ///                              but blocking the write makes the intent unambiguous)
    ///
    ///      Setting newHash to bytes32(0) is a valid "delete my profile" gesture —
    ///      the resolver falls back to identicon + truncated address. Note that
    ///      previously-published content may persist on IPFS; the chain merely
    ///      stops pointing to it.
    /// @param newHash The new CIDv1/sha2-256 digest pointing to the merchant's profile JSON.
    function setMetaHash(bytes32 newHash) external {
        Merchant storage m = merchants[msg.sender];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        if (m.status == Status.DELISTED) revert COM_Delisted();
        m.metaHash = newHash;
        emit MerchantMetaHashUpdated(msg.sender, newHash);
    }

    /// @notice authorizedEscrow
    address public authorizedEscrow;

    /// @notice setAuthorizedEscrow
    /// @param _escrow _escrow
    function setAuthorizedEscrow(address _escrow) external onlyDAO {
        if (_escrow == address(0)) revert COM_Zero();
        authorizedEscrow = _escrow;
    }

    /// @notice clearAuthorizedEscrow
    function clearAuthorizedEscrow() external onlyDAO {
        authorizedEscrow = address(0);
    }

    /// @notice _noteRefund
    /// @param owner owner
    function _noteRefund(address owner) external {
        require(msg.sender == authorizedEscrow || msg.sender == dao, "COM: not authorized");
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        // POW-1 FIX (recovery support): decay refund counter by 1 for every
        // 90 days of clean operation since lastRefundAt. This prevents
        // long-running merchants from accumulating lifetime refunds and
        // hitting permanent suspension. A coffee shop running for 3 years
        // with 4 customer refunds spread evenly across the years should
        // never be suspended by the threshold; the counter decays back to
        // ~0 between events.
        _applyRefundDecay(m);
        ++m.refunds;
        lastRefundAt[owner] = uint64(block.timestamp);
        if (m.refunds >= autoSuspendRefunds) {
            m.status = Status.SUSPENDED;
            emit AutoFlagged(owner, "refund_threshold");
        }
    }

    /// @notice _noteDispute
    /// @param owner owner
    function _noteDispute(address owner) external {
        require(msg.sender == authorizedEscrow || msg.sender == dao, "COM: not authorized");
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        // POW-1 FIX: same decay rule applied to disputes (separate clock).
        _applyDisputeDecay(m);
        ++m.disputes;
        lastDisputeAt[owner] = uint64(block.timestamp);
        if (m.disputes >= autoSuspendDisputes) {
            m.status = Status.SUSPENDED;
            emit AutoFlagged(owner, "dispute_threshold");
        }
    }

    /// @notice POW-1 FIX: DAO-only path to lift an auto-suspension and let
    ///         the merchant resume operations. Resets the strike counters
    ///         to zero. Intended for cases where the merchant has resolved
    ///         the underlying issue (refund disputes settled, complaints
    ///         retracted, etc.) and demonstrated good standing.
    ///
    ///         Without this function, hitting the 5-refund or 3-dispute
    ///         threshold permanently bricked a merchant account because:
    ///           - no other code path wrote `m.status` back to ACTIVE
    ///           - addMerchant rejects re-registration if status != NONE
    ///         Running a real-world business will eventually accumulate
    ///         5 refunds over its lifetime; the protocol must have a
    ///         recovery path or it cannot host long-running merchants.
    /// @param owner owner
    function unsuspendMerchant(address owner) external onlyDAO {
        Merchant storage m = merchants[owner];
        if (m.status != Status.SUSPENDED) revert COM_NotAllowed();
        m.status = Status.ACTIVE;
        m.refunds = 0;
        m.disputes = 0;
        lastRefundAt[owner] = uint64(block.timestamp);
        lastDisputeAt[owner] = uint64(block.timestamp);
        emit MerchantStatus(owner, Status.ACTIVE, "dao_unsuspend");
    }

    /// @notice DAO action: permanently delist a merchant.
    /// @dev DELISTED is a terminal state — no path back to ACTIVE. Use cases:
    ///        - Confirmed fraud after investigation
    ///        - Repeated dispute losses beyond rehabilitation
    ///        - Regulator/sanctions demand
    ///        - Severe ToS violation
    ///
    ///      Effects:
    ///        - Merchant cannot open new escrows (createEscrow guards on DELISTED)
    ///        - Merchant cannot update their profile via setMetaHash (this contract,
    ///          new in v1 of MerchantProfile spec)
    ///        - The canonical VFIDE frontend refuses to render their profile content
    ///          (frontend policy per VFIDE_MERCHANT_PROFILE_SPEC.md §7/§8)
    ///        - The merchant struct stays in storage (we keep the historical record)
    ///        - The metaHash is NOT cleared (the merchant retains technical data
    ///          sovereignty; the on-chain bytes don't change just because the
    ///          frontend won't render them)
    ///
    ///      No corresponding "undelist" function exists. If a merchant is delisted
    ///      in error, they can re-register with a fresh address. This is intentional
    ///      friction — delisting should be slow, deliberate, and not casually reversed.
    /// @param owner The merchant address to delist.
    /// @param reason Human-readable reason for the delisting (logged in event).
    function delistMerchant(address owner, string calldata reason) external onlyDAO {
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        if (m.status == Status.DELISTED) revert COM_NotAllowed();
        m.status = Status.DELISTED;
        emit MerchantStatus(owner, Status.DELISTED, reason);
    }

    /// @notice _applyRefundDecay
    /// @param m m
    function _applyRefundDecay(Merchant storage m) internal {
        uint64 last = lastRefundAt[m.owner];
        if (last == 0 || m.refunds == 0) return;
        uint64 elapsed = uint64(block.timestamp) - last;
        uint64 decaySteps = elapsed / STRIKE_DECAY_INTERVAL;
        if (decaySteps == 0) return;
        if (decaySteps >= m.refunds) {
            m.refunds = 0;
        } else {
            m.refunds -= uint32(decaySteps);
        }
    }

    /// @notice _applyDisputeDecay
    /// @param m m
    function _applyDisputeDecay(Merchant storage m) internal {
        uint64 last = lastDisputeAt[m.owner];
        if (last == 0 || m.disputes == 0) return;
        uint64 elapsed = uint64(block.timestamp) - last;
        uint64 decaySteps = elapsed / STRIKE_DECAY_INTERVAL;
        if (decaySteps == 0) return;
        if (decaySteps >= m.disputes) {
            m.disputes = 0;
        } else {
            m.disputes -= uint32(decaySteps);
        }
    }

    /// @notice info
    /// @param owner owner
    /// @return _arg _arg
    function info(address owner) external view returns (Merchant memory) { return merchants[owner]; }
}
