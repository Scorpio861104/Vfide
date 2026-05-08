// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";
interface IVaultHub_COM {
    function vaultOf(address owner) external view returns (address);
}
interface ISeer_COM {
    function getScore(address) external view returns (uint16);
    function getCachedScore(address) external view returns (uint16);
    function minForMerchant() external view returns (uint16);
}
interface IProofLedger_COM {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

error COM_NotDAO();
error COM_Zero();
error COM_NotMerchant();
error COM_AlreadyMerchant();
error COM_NotActive();
error COM_Suspended();
error COM_Delisted();
error COM_NotBuyer();
error COM_NotSeller();
error COM_BadAmount();
error COM_BadState();
error COM_TooEarly();
error COM_NotFunded();
error COM_SecLocked();
error COM_NotAllowed();
error COM_BadRating();

contract MerchantRegistry {
    event ModulesSet(address dao, address token, address hub, address seer, address ledger);
    event PolicySet(uint16 minScore, uint8 autoSuspendRefunds, uint8 autoSuspendDisputes);
    event MerchantAdded(address indexed owner, address indexed vault, bytes32 metaHash);
    event MerchantStatus(address indexed owner, Status status, string reason);
    event AutoFlagged(address indexed owner, string reason);

    enum Status { NONE, ACTIVE, SUSPENDED, DELISTED }

    address public immutable dao;
    IERC20 public immutable token;
    IVaultHub_COM public immutable vaultHub;
    ISeer_COM public immutable seer;
    IProofLedger_COM public immutable ledger;

    struct Merchant {
        address owner;
        address vault;
        Status  status;
        uint32  refunds;
        uint32  disputes;
        bytes32 metaHash;
    }

    mapping(address => Merchant) public merchants;
    uint16 public minScore;
    uint8  public autoSuspendRefunds = 5;
    uint8  public autoSuspendDisputes = 3;

    // POW-1 decay tracking: per-merchant timestamp of most recent strike,
    // used by _applyRefundDecay / _applyDisputeDecay to subtract one from
    // the counter for every full 90-day window of clean operation. This
    // makes the "5 lifetime refunds → permanent ban" rule a "5 refunds in
    // any rolling 90-day window" rule.
    mapping(address => uint64) public lastRefundAt;
    mapping(address => uint64) public lastDisputeAt;
    uint64 public constant STRIKE_DECAY_INTERVAL = 90 days;

    modifier onlyDAO() { if (msg.sender != dao) revert COM_NotDAO(); _; }

    constructor(address _dao, address _token, address _hub, address _seer, address _ledger) {
        if (_dao==address(0)||_token==address(0)||_hub==address(0)||_seer==address(0)) revert COM_Zero();
        dao=_dao; token=IERC20(_token); vaultHub=IVaultHub_COM(_hub); seer=ISeer_COM(_seer);
        ledger = IProofLedger_COM(_ledger);
        minScore = ISeer_COM(_seer).minForMerchant();
        emit ModulesSet(_dao, _token, _hub, _seer, _ledger);
    }

    // slither-disable-next-line reentrancy-events
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

    address public authorizedEscrow;
    
    function setAuthorizedEscrow(address _escrow) external onlyDAO {
        if (_escrow == address(0)) revert COM_Zero();
        authorizedEscrow = _escrow;
    }

    function clearAuthorizedEscrow() external onlyDAO {
        authorizedEscrow = address(0);
    }
    
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
        m.refunds += 1;
        lastRefundAt[owner] = uint64(block.timestamp);
        if (m.refunds >= autoSuspendRefunds) {
            m.status = Status.SUSPENDED;
            emit AutoFlagged(owner, "refund_threshold");
        }
    }

    function _noteDispute(address owner) external {
        require(msg.sender == authorizedEscrow || msg.sender == dao, "COM: not authorized");
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        // POW-1 FIX: same decay rule applied to disputes (separate clock).
        _applyDisputeDecay(m);
        m.disputes += 1;
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

    // POW-1 decay tracking moved to top of contract (next to merchants mapping)
    // for consistency with the rest of the state-variable layout.

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

    function info(address owner) external view returns (Merchant memory) { return merchants[owner]; }
}

/**
 * @title CommerceEscrow
 * @notice Standard e-commerce escrow for MerchantPortal payments.
 * @dev I-14 Architecture Note: Two escrow systems exist by design:
 *   - CommerceEscrow (this): For standard e-commerce payments through
 *     the MerchantPortal. Simpler state-machine (OPEN→FUNDED→RELEASED).
 *   - EscrowManager (EscrowManager.sol): For high-value/custom trades
 *     requiring arbiter dispute resolution and ProofScore-dynamic locks.
 *
 * Key differences from EscrowManager:
 *   - DAO-only dispute resolution (no arbiter)
 *   - Fixed timeouts (no ProofScore gating)
 *   - Integrated with MerchantRegistry for merchant verification
 */
contract CommerceEscrow {
    using SafeERC20 for IERC20;
    
    enum State { NONE, OPEN, FUNDED, RELEASED, REFUNDED, DISPUTED, RESOLVED }

    address public dao;
    IERC20     public token;
    IVaultHub_COM  public vaultHub;
    MerchantRegistry public merchants;

    uint256 private _reentrancyStatus = 1;
    modifier nonReentrant() {
        require(_reentrancyStatus == 1, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    struct Escrow {
        address buyerOwner;
        address merchantOwner;
        address buyerVault;
        address sellerVault;
        uint256 amount;
        State   state;
        bytes32 metaHash;
        // M-COMMERCE-1 FIX: openedAt timestamp lets unfunded OPEN escrows be cancelled
        // after OPEN_ESCROW_EXPIRY without funder action, preventing storage pollution.
        uint64  openedAt;
    }

    // M-COMMERCE-1 FIX: How long an OPEN (unfunded) escrow stays valid before anyone can cancel it.
    uint256 public constant OPEN_ESCROW_EXPIRY = 7 days;

    mapping(uint256 => uint256) public escrowDeposited;

    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;

    // N-H14 FIX: Only disputes above this amount increment merchant dispute counters.
    // Prevents griefers from opening tiny-value escrows and forcing auto-suspension.
    uint256 public minDisputeAmountForPenalty = 100 * 1e18;

    modifier onlyDAO() { if (msg.sender != dao) revert COM_NotDAO(); _; }

    constructor(address _dao, address _token, address _hub, address _merchants) {
        if (_dao==address(0)||_token==address(0)||_hub==address(0)||_merchants==address(0)) revert COM_Zero();
        dao=_dao; token=IERC20(_token); vaultHub=IVaultHub_COM(_hub); merchants=MerchantRegistry(_merchants);
    }

    function setMinDisputeAmountForPenalty(uint256 amount) external onlyDAO {
        if (amount == 0) revert COM_BadAmount();
        minDisputeAmountForPenalty = amount;
    }

    /**
     * @notice Returns the exact approval pair required before `markFunded` can transfer tokens.
     * @dev Buyers must approve this escrow contract as spender from their vault address.
     */
    function getRequiredApproval(address buyerOwner) external view returns (address buyerVault, address spender) {
        buyerVault = vaultHub.vaultOf(buyerOwner);
        spender = address(this);
    }

    function open(address merchantOwner, uint256 amount, bytes32 metaHash) external nonReentrant returns (uint256 id) {
        if (amount == 0) revert COM_BadAmount();
        MerchantRegistry.Merchant memory m = merchants.info(merchantOwner);
        if (m.status == MerchantRegistry.Status.NONE) revert COM_NotMerchant();
        if (m.status == MerchantRegistry.Status.SUSPENDED) revert COM_Suspended();
        if (m.status == MerchantRegistry.Status.DELISTED) revert COM_Delisted();

        address buyerV = vaultHub.vaultOf(msg.sender);
        if (buyerV == address(0)) revert COM_NotBuyer();
        address sellerV = vaultHub.vaultOf(merchantOwner);
        if (sellerV == address(0)) revert COM_NotSeller();
        id = ++escrowCount;
        escrows[id] = Escrow({
            buyerOwner: msg.sender,
            merchantOwner: merchantOwner,
            buyerVault: buyerV,
            sellerVault: sellerV,
            amount: amount,
            state: State.OPEN,
            metaHash: metaHash,
            // M-COMMERCE-1 FIX: stamp creation time so unfunded escrows can be cancelled after expiry
            openedAt: uint64(block.timestamp)
        });
    }

    function markFunded(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.OPEN) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != dao) revert COM_NotAllowed();

        // F-SC-024 FIX: Re-check merchant SUSPENDED status at funding time.
        // The original code only checked SUSPENDED at open() (line 213).
        // Auto-suspension can happen between open() and markFunded() via the
        // 5-refunds / 3-disputes thresholds in MerchantRegistry (lines 111,
        // 122). Without this check, an auto-suspended merchant could still
        // receive funded escrows via pre-existing OPEN ones — bypassing the
        // safety mechanism that suspended them in the first place.
        MerchantRegistry.Merchant memory m = merchants.info(e.merchantOwner);
        if (m.status == MerchantRegistry.Status.SUSPENDED) revert COM_Suspended();
        if (m.status == MerchantRegistry.Status.DELISTED) revert COM_Delisted();

        // Defense in depth: only pull funds from the buyer vault that still belongs
        // to the escrow buyer owner at funding time.
        address currentBuyerVault = vaultHub.vaultOf(e.buyerOwner);
        if (currentBuyerVault == address(0) || currentBuyerVault != e.buyerVault) revert COM_NotAllowed();

        e.state = State.FUNDED;
        escrowDeposited[id] = e.amount;
        token.safeTransferFrom(e.buyerVault, address(this), e.amount);
    }

    function release(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != dao) revert COM_NotAllowed();

        // F-SC-024 FIX: Re-check merchant SUSPENDED status at release time.
        // Mirrors the markFunded gate. If a merchant was auto-suspended after
        // funding (e.g. they accumulated 5 refunds while this escrow sat in
        // FUNDED state), releasing to them would bypass the suspension.
        // Block release to a suspended/delisted merchant; the buyer can use
        // the dispute / refund flow instead, which routes funds back to the
        // buyer rather than to the now-restricted merchant.
        MerchantRegistry.Merchant memory m = merchants.info(e.merchantOwner);
        if (m.status == MerchantRegistry.Status.SUSPENDED) revert COM_Suspended();
        if (m.status == MerchantRegistry.Status.DELISTED) revert COM_Delisted();

        e.state = State.RELEASED;
        // N-H15 FIX: Resolve seller vault at release-time so mid-flight vault rotation
        // does not orphan escrowed funds in a stale vault address.
        address sellerVaultNow = vaultHub.vaultOf(e.merchantOwner);
        if (sellerVaultNow == address(0)) revert COM_NotSeller();
        token.safeTransfer(sellerVaultNow, e.amount);
    }

    function refund(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED && e.state != State.DISPUTED) revert COM_BadState();
        if (msg.sender != e.merchantOwner && msg.sender != dao) revert COM_NotAllowed();
        e.state = State.REFUNDED;
        merchants._noteRefund(e.merchantOwner);
        // N-H15 FIX: Resolve buyer vault at refund-time so mid-flight vault rotation
        // does not orphan escrowed funds in a stale vault address.
        address buyerVaultNow = vaultHub.vaultOf(e.buyerOwner);
        if (buyerVaultNow == address(0)) revert COM_NotBuyer();
        token.safeTransfer(buyerVaultNow, e.amount);
    }

    /// @notice M-COMMERCE-1 FIX: Cancel an OPEN (unfunded) escrow after the expiry window.
    /// @dev Permissionless after `openedAt + OPEN_ESCROW_EXPIRY` to prevent storage pollution
    ///      from buyers who abandon checkout. Only OPEN escrows are cancellable here; FUNDED
    ///      escrows must go through release/refund/dispute paths and require an actual transfer.
    /// @param id Escrow id to cancel.
    function cancelStaleOpen(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.OPEN) revert COM_BadState();
        if (e.openedAt == 0 || block.timestamp < uint256(e.openedAt) + OPEN_ESCROW_EXPIRY) {
            revert COM_BadState();
        }
        e.state = State.REFUNDED;
    }

    function dispute(uint256 id, string calldata /*reason*/) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != e.merchantOwner) revert COM_NotAllowed();
        e.state = State.DISPUTED;
        // N-H14 FIX: Ignore low-value disputes for auto-suspension accounting.
        if (e.amount >= minDisputeAmountForPenalty) {
            merchants._noteDispute(e.merchantOwner);
        }
    }

    function resolve(uint256 id, bool buyerWins) external nonReentrant onlyDAO {
        Escrow storage e = escrows[id];
        if (e.state != State.DISPUTED) revert COM_BadState();
        e.state = State.RESOLVED;
        if (buyerWins) {
            address buyerVaultNow = vaultHub.vaultOf(e.buyerOwner);
            if (buyerVaultNow == address(0)) revert COM_NotBuyer();
            token.safeTransfer(buyerVaultNow, e.amount);
        } else {
            address sellerVaultNow = vaultHub.vaultOf(e.merchantOwner);
            if (sellerVaultNow == address(0)) revert COM_NotSeller();
            token.safeTransfer(sellerVaultNow, e.amount);
        }
    }
}

