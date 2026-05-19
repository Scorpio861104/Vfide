// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Pulls in SafeERC20 / IERC20 (via SharedInterfaces.sol re-export),
// the IVaultHub_COM interface, the COM_* errors, and the MerchantRegistry
// contract type referenced by `merchants` below.
import "./MerchantRegistry.sol";

/// @notice Phase 3d Turn 3 — calling interface for atomic escrow funding on CardBoundVault.
/// @dev Mirrors the ICardBoundVaultPay pattern in MerchantPortal: declare the calling interface
///      locally so the coupling is visible at the call site, not buried in a shared header.
interface ICardBoundVaultFundEscrow {
    struct EscrowFundIntent {
        address vault;
        address escrowContract;
        uint256 escrowId;
        address token;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }

    function executeFundEscrow(EscrowFundIntent calldata intent, bytes calldata signature) external;
}

/**
 * @title CommerceEscrow
 * @notice E-commerce escrow with one-click funding and DAO-arbitrated disputes.
 * @dev State machine: OPEN → FUNDED → RELEASED / REFUNDED / DISPUTED → RESOLVED.
 *      Buyers can use openAndFundWithIntent for spontaneous escrow checkout
 *      (one signature, atomic open+fund); or the two-step open() + markFunded()
 *      path for pre-approved allowance-based budgeting.
 *
 *      Disputes go to the DAO for resolution. Merchants can also refund
 *      directly at any time, even during a dispute.
 *
 *      Integrated with MerchantRegistry for merchant verification and
 *      with VaultHub for inheritance-driven settlement (settleByInheritance).
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

    // ─── Lifecycle events ────────────────────────────────────────────────────────
    // Added Phase 3d Turn 2 (2026-05-15). The contract previously emitted no events
    // on state transitions, forcing frontends to enumerate escrows by iterating
    // `escrows(id)` from 0 to `escrowCount - 1`. That is O(n) on the protocol's
    // total escrow count, not just one user's escrows. With indexed buyer/merchant
    // params, callers can now filter event logs to find their own escrows in O(1).
    //
    // All transfers in/out of the escrow contract have a corresponding event so
    // a complete financial picture is reconstructable from logs alone:
    //   EscrowFunded               — tokens IN (from buyer's vault)
    //   EscrowReleased             — tokens OUT (to merchant's vault)
    //   EscrowRefunded             — tokens OUT (to buyer's vault), or state-only for cancelStaleOpen
    //   EscrowResolved + (Released|Refunded)  — DAO-decided dispute outcome
    event EscrowOpened(
        uint256 indexed id,
        address indexed buyer,
        address indexed merchant,
        uint256 amount,
        bytes32 metaHash
    );
    event EscrowFunded(uint256 indexed id, address indexed buyer, uint256 amount);
    event EscrowReleased(uint256 indexed id, address indexed merchant, uint256 amount);
    /// @dev Emitted for refund(), cancelStaleOpen(), settleByInheritance(), and resolve(buyerWins=true).
    ///      For cancelStaleOpen, `amount` is 0 because the escrow was never funded — no transfer occurred.
    event EscrowRefunded(uint256 indexed id, address indexed buyer, uint256 amount);
    event EscrowDisputed(uint256 indexed id, address indexed initiator, string reason);
    event EscrowResolved(uint256 indexed id, bool buyerWins);

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
        emit EscrowOpened(id, msg.sender, merchantOwner, amount, metaHash);
    }

    /// @notice Phase 3d Turn 3 — atomic open+fund via signed intent.
    /// @dev Buyer signs an ICardBoundVaultFundEscrow.EscrowFundIntent off-chain (one signature).
    ///      This function creates the escrow record AND calls the buyer's vault to pull funds
    ///      in the same transaction. Escrow goes directly to FUNDED state — no intermediate OPEN.
    ///
    /// Security pinning: all intent fields the buyer signed are verified against the inputs
    /// here. A signature minted for one escrow cannot be replayed against a different one
    /// (different vault, different amount, different escrow id, different deadline, all
    /// rejected). The vault layer additionally enforces nonce, walletEpoch, daily/per-tx
    /// limits, and pause state — same security as executePayMerchant.
    ///
    /// @param intent       Signed escrow-fund intent. The buyer's vault address, the amount,
    ///                     and this contract's address are all pinned here.
    /// @param signature    EIP-712 signature from the buyer's activeWallet over `intent`.
    /// @param merchantOwner Merchant the escrow is opened with.
    /// @param metaHash     Off-chain content hash (order details, terms, etc.).
    function openAndFundWithIntent(
        ICardBoundVaultFundEscrow.EscrowFundIntent calldata intent,
        bytes calldata signature,
        address merchantOwner,
        bytes32 metaHash
    ) external nonReentrant returns (uint256 id) {
        // Standard buyer/merchant validation (mirrors open()).
        if (intent.amount == 0) revert COM_BadAmount();
        MerchantRegistry.Merchant memory m = merchants.info(merchantOwner);
        if (m.status == MerchantRegistry.Status.NONE) revert COM_NotMerchant();
        if (m.status == MerchantRegistry.Status.SUSPENDED) revert COM_Suspended();
        if (m.status == MerchantRegistry.Status.DELISTED) revert COM_Delisted();

        address buyerV = vaultHub.vaultOf(msg.sender);
        if (buyerV == address(0)) revert COM_NotBuyer();
        address sellerV = vaultHub.vaultOf(merchantOwner);
        if (sellerV == address(0)) revert COM_NotSeller();

        // Intent pinning — refuse to act on an intent signed for a different escrow.
        // The vault separately enforces intent.vault == address(this-vault), so once we
        // confirm intent.vault matches the buyer's live vault, all parties agree on the source.
        if (intent.vault != buyerV) revert COM_NotAllowed();
        if (intent.escrowContract != address(this)) revert COM_NotAllowed();
        if (intent.token != address(token)) revert COM_NotAllowed();

        id = ++escrowCount;
        // The escrowId in the intent must match the new id. Buyer pre-computes this by
        // reading escrowCount before signing. If another escrow opens in between, this
        // mismatches and reverts — buyer re-signs with the new id. Same race property as
        // the simulate-then-write pattern used elsewhere in the codebase.
        if (intent.escrowId != id) revert COM_NotAllowed();

        escrows[id] = Escrow({
            buyerOwner: msg.sender,
            merchantOwner: merchantOwner,
            buyerVault: buyerV,
            sellerVault: sellerV,
            amount: intent.amount,
            state: State.FUNDED, // directly to FUNDED — atomic path skips OPEN
            metaHash: metaHash,
            openedAt: uint64(block.timestamp)
        });
        escrowDeposited[id] = intent.amount;

        // Call the buyer's vault to pull funds. Vault enforces:
        //   nonce, walletEpoch, deadline, chainId, daily limit, per-tx limit, pause state,
        //   Seer enforcement, activeWallet signature verification. Same checks as executePayMerchant.
        ICardBoundVaultFundEscrow(buyerV).executeFundEscrow(intent, signature);

        emit EscrowOpened(id, msg.sender, merchantOwner, intent.amount, metaHash);
        emit EscrowFunded(id, msg.sender, intent.amount);
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
        emit EscrowFunded(id, e.buyerOwner, e.amount);
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
        emit EscrowReleased(id, e.merchantOwner, e.amount);
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
        emit EscrowRefunded(id, e.buyerOwner, e.amount);
    }

    /// @notice R-4 — Settle a FUNDED or DISPUTED escrow when one party's vault has entered MEMORIAL.
    ///
    /// Pull-based settlement. Permissionless: anyone (heirs, the surviving counterparty,
    /// a watchful third party) can call this once the buyer or merchant's vault is in
    /// MEMORIAL (state 3) or CLOSED (state 4) on VaultHub.
    ///
    /// Refunds to the buyer regardless of which side died:
    ///   - If the BUYER died, funds return to the deceased buyer's current vault for
    ///     heir distribution. This is the safer side — the merchant has not yet
    ///     fulfilled (escrow is still FUNDED/DISPUTED).
    ///   - If the MERCHANT died, the buyer is made whole without needing to chase
    ///     the merchant's estate.
    ///
    /// Does NOT increment merchants._noteRefund — this is not a merchant-initiated
    /// refund and shouldn't count against their dispute decay. Inheritance is not
    /// a service-quality signal.
    ///
    /// State must be FUNDED or DISPUTED (funds are in escrow). OPEN escrows have
    /// no funds to settle and should use `cancelStaleOpen` after expiry instead.
    ///
    /// @param id Escrow identifier.
    function settleByInheritance(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED && e.state != State.DISPUTED) revert COM_BadState();

        address buyerVaultLive = vaultHub.vaultOf(e.buyerOwner);
        address merchantVaultLive = vaultHub.vaultOf(e.merchantOwner);
        if (
            !(buyerVaultLive != address(0) && vaultHub.isInMemorialState(buyerVaultLive)) &&
            !(merchantVaultLive != address(0) && vaultHub.isInMemorialState(merchantVaultLive))
        ) {
            revert COM_NotInheritanceActive();
        }

        e.state = State.REFUNDED;
        if (buyerVaultLive == address(0)) revert COM_NotBuyer();
        token.safeTransfer(buyerVaultLive, e.amount);
        emit EscrowRefunded(id, e.buyerOwner, e.amount);
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
        // No token transfer — this escrow was never funded.
        // Emit with amount=0 to signal "state-only refund" vs a real fund return.
        emit EscrowRefunded(id, e.buyerOwner, 0);
    }

    function dispute(uint256 id, string calldata reason) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != e.merchantOwner) revert COM_NotAllowed();
        e.state = State.DISPUTED;
        // N-H14 FIX: Ignore low-value disputes for auto-suspension accounting.
        if (e.amount >= minDisputeAmountForPenalty) {
            merchants._noteDispute(e.merchantOwner);
        }
        emit EscrowDisputed(id, msg.sender, reason);
    }

    function resolve(uint256 id, bool buyerWins) external nonReentrant onlyDAO {
        Escrow storage e = escrows[id];
        if (e.state != State.DISPUTED) revert COM_BadState();
        e.state = State.RESOLVED;
        if (buyerWins) {
            address buyerVaultNow = vaultHub.vaultOf(e.buyerOwner);
            if (buyerVaultNow == address(0)) revert COM_NotBuyer();
            token.safeTransfer(buyerVaultNow, e.amount);
            emit EscrowRefunded(id, e.buyerOwner, e.amount);
        } else {
            address sellerVaultNow = vaultHub.vaultOf(e.merchantOwner);
            if (sellerVaultNow == address(0)) revert COM_NotSeller();
            token.safeTransfer(sellerVaultNow, e.amount);
            emit EscrowReleased(id, e.merchantOwner, e.amount);
        }
        emit EscrowResolved(id, buyerWins);
    }
}
