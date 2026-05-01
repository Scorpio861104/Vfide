# VFIDE — Merchant Payment & Escrow Fix Plan

This document specifies the contract, frontend, and migration changes to make merchant payments work end-to-end in the vault custody model. It covers two settlement modes:

1. **Instant payment** via `MerchantPortal.payWithIntent` (v8 of this thread; recap included for context).
2. **Escrowed payment** via `EscrowManager.createEscrowWithIntent` (new in this doc).

Both share the EIP-712 PayIntent / EscrowIntent pattern grafted onto `CardBoundVault`. Both fix the same underlying problem: in the vault custody model, the customer's funds live in a contract that has not pre-approved any spender, so any flow relying on `safeTransferFrom(customerVault, ...)` cannot succeed.

---

## 1. Architecture

### 1.1 The custody mismatch

Today both merchant payment paths in the contracts are:

```solidity
// MerchantPortal._processPaymentInternal:
IERC20(token).safeTransferFrom(customerVault, feeSink, fee);
IERC20(token).safeTransferFrom(customerVault, recipient, netAmount);

// EscrowManager.createEscrow:
IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
```

Both rely on a standard ERC-20 allowance from the customer's `CardBoundVault` to the receiving contract. The only API for setting that allowance is `CardBoundVault.approveVFIDE(spender, amount)`, which queues with `SENSITIVE_ADMIN_DELAY = 7 days`. So neither path can execute a single-session customer payment.

### 1.2 The fix pattern

Mirror the existing `executeVaultToVaultTransfer` mechanism, which already uses EIP-712 signed `TransferIntent`s for vault-to-vault transfers without prior allowance. Add two new intent types — `PayIntent` for instant merchant payment and `EscrowIntent` for escrowed payment — plus their executors on the vault. The receiving contracts (`MerchantPortal`, `EscrowManager`) become orchestrators that validate their own state, then call the customer's vault to execute the intent.

This keeps the security model intact: only the vault's `activeWallet` can authorize fund movements, signatures are nonce-bound and replay-protected, the per-transfer and daily limits still apply, wallet rotation still invalidates outstanding intents.

### 1.3 Fee timing decision (escrow path)

For escrow specifically, there's a real product question: when does the customer pay the BurnRouter fee? Three options were considered:

| Option | Fee timing | Refund behavior | Verdict |
|---|---|---|---|
| Fee at deposit, EscrowManager non-exempt | Charged at vault → EscrowManager transfer | Refunded customer is short the fee | Punishes refunds |
| Fee at deposit + system-exempt, manual fee distribution at deposit | Charged manually at deposit | Refunded customer is short the fee | Same outcome, more code |
| **Fee at release, system-exempt, snapshot at deposit** | Snapshotted at deposit, applied at release/dispute-merchant-wins | Refunded customer made whole, no fee | **Recommended** |

The recommended option treats refunded customers fairly (they used the protocol but didn't complete a trade, so no fee is appropriate). The fee is snapshot at deposit time so the eventual fee amount is predictable when the customer signs. Fee snapshot uses the buyer's score at deposit, not at release — this prevents games where the buyer artificially boosts their score during the lock to pay less.

For instant payment via `MerchantPortal.payWithIntent`, fee timing is unchanged from today: the BurnRouter fee is automatically charged by `VFIDEToken._transfer` on the vault → merchant transfer. No special handling.

### 1.4 EscrowManager system-exempt scope

Granting EscrowManager `systemExempt = true` lets it move tokens without `_transfer` charging fees. This is safe IF AND ONLY IF every path EscrowManager can use to send tokens is one of:

- Refund to buyer's vault
- Release to merchant's vault or merchant's payoutAddress
- Dispute resolution: refund to buyer's vault OR release to merchant
- Synthetic fee distribution: burn portion to `vfideToken.burn()`, sanctum to BurnRouter.sanctumSink, ecosystem to BurnRouter.ecosystemSink

There must be no `rescueTokens`, no admin sweep, no arbitrary transfer function on EscrowManager. The existing contract has no such function, but adding one in the future would silently expand the system-exempt blast radius. Mark this in code with an assertion or a deliberate comment.

---

## 2. CardBoundVault — new intent types

### 2.1 Type declarations

Add to `contracts/CardBoundVault.sol`:

```solidity
// ── EIP-712 type hashes (alongside existing TRANSFER_INTENT_TYPEHASH) ──

bytes32 private constant PAY_INTENT_TYPEHASH = keccak256(
    "PayIntent(address vault,address merchantPortal,address token,address merchant,address recipient,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)"
);

bytes32 private constant ESCROW_INTENT_TYPEHASH = keccak256(
    "EscrowIntent(address vault,address escrowManager,address token,address merchant,uint256 amount,string orderId,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)"
);

// ── Structs (alongside existing TransferIntent) ──

struct PayIntent {
    address vault;
    address merchantPortal;
    address token;
    address merchant;
    address recipient;       // resolved by the portal at submission time
    uint256 amount;
    uint256 nonce;
    uint64 walletEpoch;
    uint64 deadline;
    uint256 chainId;
}

struct EscrowIntent {
    address vault;
    address escrowManager;
    address token;
    address merchant;
    uint256 amount;
    string orderId;
    uint256 nonce;
    uint64 walletEpoch;
    uint64 deadline;
    uint256 chainId;
}

// ── New errors ──
error CBV_NotMerchantPortal();
error CBV_NotEscrowManager();
error CBV_PayIntentInvalid();
error CBV_EscrowIntentInvalid();
```

### 2.2 Digest helpers

```solidity
function _payIntentDigest(PayIntent calldata intent) internal view returns (bytes32) {
    bytes32 structHash = keccak256(
        abi.encode(
            PAY_INTENT_TYPEHASH,
            intent.vault,
            intent.merchantPortal,
            intent.token,
            intent.merchant,
            intent.recipient,
            intent.amount,
            intent.nonce,
            intent.walletEpoch,
            intent.deadline,
            intent.chainId
        )
    );
    return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
}

function _escrowIntentDigest(EscrowIntent calldata intent) internal view returns (bytes32) {
    bytes32 structHash = keccak256(
        abi.encode(
            ESCROW_INTENT_TYPEHASH,
            intent.vault,
            intent.escrowManager,
            intent.token,
            intent.merchant,
            intent.amount,
            keccak256(bytes(intent.orderId)),  // EIP-712 strings are hashed
            intent.nonce,
            intent.walletEpoch,
            intent.deadline,
            intent.chainId
        )
    );
    return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
}

// External views for debugging / off-chain signing verification
function payIntentDigest(PayIntent calldata intent) external view returns (bytes32) {
    return _payIntentDigest(intent);
}

function escrowIntentDigest(EscrowIntent calldata intent) external view returns (bytes32) {
    return _escrowIntentDigest(intent);
}
```

### 2.3 Signature recovery

Two parallels of the existing `_recoverTransferSigner`. Same ECDSA validation (length 65, v ∈ {27, 28}, s upper bound):

```solidity
function _recoverPaySigner(PayIntent calldata intent, bytes calldata signature) internal view returns (address) {
    if (signature.length != 65) revert CBV_InvalidSignature();
    bytes32 digest = _payIntentDigest(intent);
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
        r := calldataload(signature.offset)
        s := calldataload(add(signature.offset, 32))
        v := byte(0, calldataload(add(signature.offset, 64)))
    }
    if (v != 27 && v != 28) revert CBV_InvalidSignature();
    if (uint256(s) > ECDSA_S_UPPER_BOUND) revert CBV_InvalidSignature();
    address recovered = ecrecover(digest, v, r, s);
    if (recovered == address(0)) revert CBV_InvalidSignature();
    return recovered;
}

function _recoverEscrowSigner(EscrowIntent calldata intent, bytes calldata signature) internal view returns (address) {
    // Same shape as _recoverPaySigner, but using _escrowIntentDigest.
    // (Refactor opportunity: factor out the ECDSA tail into a shared helper.)
}
```

### 2.4 Executors

Both follow the same skeleton: validate caller, validate intent fields, validate signature, enforce limits, push funds, emit event.

```solidity
event PayIntentExecuted(
    address indexed signer,
    address indexed merchantPortal,
    address indexed merchant,
    address recipient,
    uint256 amount,
    uint256 nonce,
    uint64 walletEpoch
);

event EscrowIntentExecuted(
    address indexed signer,
    address indexed escrowManager,
    address indexed merchant,
    uint256 amount,
    uint256 escrowId,
    uint256 nonce,
    uint64 walletEpoch
);

/// @notice Settle a customer-signed merchant payment (instant settlement).
function executePayMerchant(PayIntent calldata intent, bytes calldata signature)
    external
    nonReentrant
    whenNotPaused
{
    if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
        revert CBV_GuardianSetupRequired();
    }
    if (msg.sender != intent.merchantPortal) revert CBV_NotMerchantPortal();
    if (intent.vault != address(this)) revert CBV_PayIntentInvalid();
    if (intent.recipient == address(0) || intent.recipient == address(this)) revert CBV_PayIntentInvalid();
    if (intent.merchant == address(0)) revert CBV_PayIntentInvalid();
    if (intent.token == address(0)) revert CBV_PayIntentInvalid();
    if (intent.chainId != block.chainid) revert CBV_InvalidChain();
    if (intent.walletEpoch != walletEpoch) revert CBV_InvalidEpoch();
    if (intent.deadline < block.timestamp) revert CBV_Expired();
    if (intent.nonce != nextNonce) revert CBV_InvalidNonce();

    uint256 amount = intent.amount;
    if (amount == 0 || amount > maxPerTransfer) revert CBV_TransferLimit();

    _refreshDailyWindow();
    if (spentToday + amount > dailyTransferLimit) revert CBV_DailyLimit();

    address signer = _recoverPaySigner(intent, signature);
    if (signer != activeWallet) revert CBV_InvalidSigner();

    _enforceSeerAction(admin, 0, amount, intent.recipient);

    nextNonce += 1;
    spentToday += amount;

    // VFIDEToken._transfer charges the BurnRouter fee against the buyer's
    // ProofScore (vault → owner resolution). Merchant receives amount - fee.
    IERC20(intent.token).safeTransfer(intent.recipient, amount);

    emit PayIntentExecuted(
        signer,
        intent.merchantPortal,
        intent.merchant,
        intent.recipient,
        amount,
        intent.nonce,
        intent.walletEpoch
    );
}

/// @notice Settle a customer-signed escrow deposit. Funds are pushed to EscrowManager,
///         which is system-exempt — no _transfer fee is charged on this hop. The fee
///         is snapshotted in EscrowManager at deposit time and applied at release.
/// @return escrowId The id assigned by EscrowManager. Returned via the manager's call.
function executeEscrowDeposit(EscrowIntent calldata intent, bytes calldata signature)
    external
    nonReentrant
    whenNotPaused
    returns (uint256 escrowId)
{
    if (!IVaultHubGuardianSetup(hub).guardianSetupComplete(address(this))) {
        revert CBV_GuardianSetupRequired();
    }
    if (msg.sender != intent.escrowManager) revert CBV_NotEscrowManager();
    if (intent.vault != address(this)) revert CBV_EscrowIntentInvalid();
    if (intent.merchant == address(0)) revert CBV_EscrowIntentInvalid();
    if (intent.token == address(0)) revert CBV_EscrowIntentInvalid();
    if (intent.chainId != block.chainid) revert CBV_InvalidChain();
    if (intent.walletEpoch != walletEpoch) revert CBV_InvalidEpoch();
    if (intent.deadline < block.timestamp) revert CBV_Expired();
    if (intent.nonce != nextNonce) revert CBV_InvalidNonce();

    uint256 amount = intent.amount;
    if (amount == 0 || amount > maxPerTransfer) revert CBV_TransferLimit();

    _refreshDailyWindow();
    if (spentToday + amount > dailyTransferLimit) revert CBV_DailyLimit();

    address signer = _recoverEscrowSigner(intent, signature);
    if (signer != activeWallet) revert CBV_InvalidSigner();

    _enforceSeerAction(admin, 0, amount, intent.merchant);

    nextNonce += 1;
    spentToday += amount;

    // Push to escrow manager. EscrowManager is system-exempt so no _transfer fee.
    IERC20(intent.token).safeTransfer(intent.escrowManager, amount);

    // Manager records the escrow and returns the assigned id. The vault must
    // call this AFTER the transfer so the manager sees the balance change.
    escrowId = IEscrowManagerIntent(intent.escrowManager).recordEscrowDeposit(
        signer,
        intent.vault,
        intent.merchant,
        intent.token,
        amount,
        intent.orderId
    );

    emit EscrowIntentExecuted(
        signer,
        intent.escrowManager,
        intent.merchant,
        amount,
        escrowId,
        intent.nonce,
        intent.walletEpoch
    );
}
```

The `IEscrowManagerIntent.recordEscrowDeposit` callback is intentional: the vault is the source of truth on signature validity, and the manager defers to the vault for that. The manager creates the escrow record and snapshots the fee only after the vault has authorized the deposit.

Both intents share `nextNonce` with `TransferIntent`. A wallet can only have one outstanding intent at a time across all three intent types. This is correct: a customer's wallet should authorize exactly one outgoing fund movement per nonce, regardless of type.

---

## 3. EscrowManager — refactor for vault custody model

The contract today stores `e.buyer` as `msg.sender` from `createEscrow`. In the vault model, we need to track:

- The buyer's vault (where funds came from, where refunds go)
- The buyer's signer (for ProofScore reward attribution)
- The merchant's resolved recipient (vault or payoutAddress)

### 3.1 Updated `Escrow` struct

```solidity
struct Escrow {
    address buyer;              // signer of the EscrowIntent (the wallet that authorized)
    address buyerVault;         // CardBoundVault that funded the escrow (refund destination)
    address merchant;           // merchant address as registered
    address merchantRecipient;  // resolved at deposit: payoutAddress or merchant's vault
    address token;
    uint256 amount;             // gross amount deposited (full amount held)
    uint256 feeAmount;          // BurnRouter fee snapshot at deposit, paid at release
    uint64 createdAt;
    uint64 releaseTime;
    State state;
    string orderId;
}
```

`feeAmount` is the total fee (burn + sanctum + ecosystem) that will be charged when this escrow releases successfully. On refund, `feeAmount` is NOT charged — the buyer is made whole.

### 3.2 New deposit entry — `recordEscrowDeposit`

This is the only function that creates new escrows in the vault model. The legacy `createEscrow(merchant, token, amount, orderId)` becomes a deprecated stub.

```solidity
/// @notice Record an escrow deposit pushed by a customer's CardBoundVault.
/// @dev Caller must be a registered CardBoundVault (validated via VaultHub).
///      Snapshots the BurnRouter fee at this moment so the eventual release
///      pays the fee that applied to the buyer's score-at-deposit, not their
///      score-at-release.
/// @return id The assigned escrow id.
function recordEscrowDeposit(
    address buyerSigner,
    address buyerVault,
    address merchant,
    address token,
    uint256 amount,
    string calldata orderId
) external nonReentrant returns (uint256 id) {
    if (msg.sender != buyerVault) revert ESC_NotVaultCaller();
    if (!vaultHub.isVault(buyerVault)) revert ESC_NotVaultCaller();
    if (merchant == address(0)) revert ESC_ZeroAddress();
    if (token == address(0)) revert ESC_ZeroAddress();
    if (!whitelistedTokens[token]) revert ESC_TokenNotWhitelisted();
    if (amount == 0) revert ESC_ZeroAmount();

    // Compute lock period from MERCHANT score (not buyer — same as legacy).
    uint256 lockPeriod = 14 days;
    if (address(seer) != address(0)) {
        uint16 score = seer.getCachedScore(merchant);
        if (score >= ScoringConstants.TIER_4) lockPeriod = 3 days;
        else if (score >= ScoringConstants.TIER_2) lockPeriod = 7 days;
    }
    if (lockPeriod < MIN_LOCK_PERIOD) revert ESC_LockTooShort();
    if (lockPeriod > 30 days) revert ESC_LockTooLong();

    // Resolve merchant recipient: explicit payout address from MerchantPortal,
    // or the merchant's vault otherwise.
    address merchantRecipient = _resolveMerchantRecipient(merchant);
    if (merchantRecipient == address(0)) revert ESC_NoMerchantRecipient();

    // Snapshot the BurnRouter fee that would have applied to a normal vault → recipient
    // transfer at this moment. This is what we'll charge at release.
    uint256 feeAmount = _snapshotFee(buyerVault, merchantRecipient, amount);

    // Verify the manager actually received the tokens.
    // (The vault transferred BEFORE calling this, so balance must reflect it.)
    require(IERC20(token).balanceOf(address(this)) >= amount + _totalEscrowedBalance(token) - amount,
            "ESC: missing deposit");
    // Note: the simpler invariant check above is "balance >= sum of all CREATED escrow amounts
    // including this one." For gas, track totalEscrowed as a running total per token instead.

    id = ++escrowCount;
    escrows[id] = Escrow({
        buyer: buyerSigner,
        buyerVault: buyerVault,
        merchant: merchant,
        merchantRecipient: merchantRecipient,
        token: token,
        amount: amount,
        feeAmount: feeAmount,
        createdAt: uint64(block.timestamp),
        releaseTime: uint64(block.timestamp) + uint64(lockPeriod),
        state: State.CREATED,
        orderId: orderId
    });

    _enforceSeerAction(buyerSigner, 7, amount, merchant);

    emit EscrowCreated(id, buyerSigner, merchant, amount, escrows[id].releaseTime, lockPeriod, block.timestamp);
    emit EscrowFeeSnapshot(id, feeAmount);
}

function _resolveMerchantRecipient(address merchant) internal returns (address) {
    if (address(merchantPortal) != address(0)) {
        try IMerchantPortalView(address(merchantPortal)).merchants(merchant) returns (
            // ... return the payoutAddress field — concrete shape depends on existing struct
            ...
        ) {
            // if payoutAddress is set, use it; else fall through
        } catch {}
    }
    // Fallback: merchant's vault.
    return vaultHub.vaultOf(merchant);
}

function _snapshotFee(address buyerVault, address recipient, uint256 amount) internal view returns (uint256) {
    if (address(burnRouter) == address(0)) return 0;
    // BurnRouter expects the buyer (who pays) as `from` — resolve vault → owner internally.
    address buyerOwner = vaultHub.ownerOfVault(buyerVault);
    try burnRouter.computeFees(buyerOwner, recipient, amount) returns (
        uint256 burnAmt,
        uint256 sanctumAmt,
        uint256 ecoAmt,
        address, address, address
    ) {
        return burnAmt + sanctumAmt + ecoAmt;
    } catch {
        return 0;
    }
}
```

Two important details:

- `_resolveMerchantRecipient` is called once at deposit and the resolved recipient is stored in the escrow. If the merchant changes their `payoutAddress` after the deposit, the escrow still releases to the originally-resolved recipient. This binds the buyer's commitment to what they signed for.

- `_snapshotFee` calls BurnRouter's `computeFees` (a view function) at deposit time. The fee is locked. This avoids the buyer gaming a score boost between deposit and release.

### 3.3 Release / refund / dispute — vault-aware refactor

```solidity
/// @notice Buyer releases escrowed funds to the merchant.
/// @dev Authorization: caller must be the active wallet of the buyer's vault, or
///      the admin of the vault, OR a relayer the buyer signs a release-intent for.
///      Simplest model used here: caller must be the vault's current owner (admin)
///      per VaultHub. Wallet rotation is transparent — the admin role stays put.
function release(uint256 id) external nonReentrant {
    Escrow storage e = escrows[id];
    if (e.state != State.CREATED) revert ESC_BadState();
    if (msg.sender != vaultHub.ownerOfVault(e.buyerVault)) revert ESC_NotBuyer();

    e.state = State.RELEASED;
    _settleToMerchant(e);

    if (address(seer) != address(0)) {
        try seer.reward(e.buyer, 2, "commerce_buyer") {} catch {}
        try seer.reward(e.merchant, 5, "commerce_merchant") {} catch {}
    }

    emit EscrowReleased(id, e.merchantRecipient);
}

/// @notice Merchant refunds the escrow to the buyer.
function refund(uint256 id) external nonReentrant {
    Escrow storage e = escrows[id];
    if (e.state != State.CREATED) revert ESC_BadState();
    if (msg.sender != vaultHub.ownerOfVault(_merchantAuthVault(e))) revert ESC_NotMerchant();

    e.state = State.REFUNDED;
    _refundToBuyer(e);

    emit EscrowRefunded(id);
}

/// @notice Anyone may claim timeout if the lock has expired and merchant didn't refund.
///         Funds go to the merchant (the buyer didn't release before timeout).
function claimTimeout(uint256 id) external nonReentrant {
    Escrow storage e = escrows[id];
    if (e.state != State.CREATED) revert ESC_BadState();
    if (block.timestamp < e.releaseTime) revert ESC_TooEarly();
    // Authorization: anyone can call (matches existing permissionless timeout claim).
    // The lock already expired, so anyone calling is just executing the merchant's
    // implicit right.

    e.state = State.RELEASED;
    _settleToMerchant(e);

    emit EscrowReleased(id, e.merchantRecipient);
}

/// @notice Either party can raise a dispute before timeout.
function raiseDispute(uint256 id) external {
    Escrow storage e = escrows[id];
    if (e.state != State.CREATED) revert ESC_BadState();

    address buyerOwner = vaultHub.ownerOfVault(e.buyerVault);
    address merchantOwner = vaultHub.ownerOfVault(_merchantAuthVault(e));
    if (msg.sender != buyerOwner && msg.sender != merchantOwner) revert ESC_NotParty();

    e.state = State.DISPUTED;
    emit DisputeRaised(id, msg.sender);
}

/// @notice Arbiter (or DAO for high-value) resolves a dispute.
function resolveDispute(uint256 id, bool refundBuyer) external nonReentrant {
    Escrow storage e = escrows[id];
    if (e.state != State.DISPUTED) revert ESC_BadState();

    // Conflict of interest: arbiter must not be either party owner.
    address buyerOwner = vaultHub.ownerOfVault(e.buyerVault);
    address merchantOwner = vaultHub.ownerOfVault(_merchantAuthVault(e));
    if (msg.sender == buyerOwner || msg.sender == merchantOwner) revert ESC_Conflict();

    if (e.amount > HIGH_VALUE_THRESHOLD) {
        if (msg.sender != dao || dao == address(0)) revert ESC_NotDAOForHighValue();
    } else {
        if (msg.sender != arbiter || arbiter == address(0)) revert ESC_NotArbiter();
    }

    if (refundBuyer) {
        e.state = State.REFUNDED;
        _refundToBuyer(e);
        if (address(seer) != address(0)) {
            try seer.punish(e.merchant, 50, "dispute_lost") {} catch {}
        }
        emit DisputeResolved(id, e.buyerVault);
    } else {
        e.state = State.RELEASED;
        _settleToMerchant(e);
        if (address(seer) != address(0)) {
            try seer.punish(e.buyer, 20, "dispute_lost") {} catch {}
        }
        emit DisputeResolved(id, e.merchantRecipient);
    }
}
```

Two helpers do the actual settlement work:

```solidity
/// @notice Send held funds to merchant, deducting the snapshotted fee.
/// @dev EscrowManager is system-exempt on VFIDEToken, so all transfers below are
///      fee-free. The fee is paid by routing the snapshotted fee portions to
///      the BurnRouter sinks AND calling vfideToken.burn() for the burn portion.
function _settleToMerchant(Escrow storage e) internal {
    uint256 totalFee = e.feeAmount;
    uint256 net = e.amount - totalFee;

    if (totalFee > 0 && address(burnRouter) != address(0)) {
        // Re-derive the per-channel split from the snapshotted total. Use the
        // BurnRouter's standard 40/10/50 split as the protocol-canonical formula.
        // (We don't re-call computeFees because the score may have drifted; we
        // already snapshotted total fee and want to pay that exact amount.)
        uint256 burnPortion = (totalFee * 40) / 100;
        uint256 sanctumPortion = (totalFee * 10) / 100;
        uint256 ecoPortion = totalFee - burnPortion - sanctumPortion;

        if (burnPortion > 0) {
            // Hard-burn from EscrowManager's balance via VFIDEToken.burn (caller-side burn).
            // This requires e.token == VFIDEToken; for stablecoin escrows, route to a designated burn sink instead.
            if (e.token == address(vfideToken)) {
                IVFIDETokenBurnable(address(vfideToken)).burn(burnPortion);
            } else {
                // Stablecoin: send to burn sink (cannot be hard-burned).
                IERC20(e.token).safeTransfer(burnRouter.burnSink(), burnPortion);
            }
        }
        if (sanctumPortion > 0) {
            IERC20(e.token).safeTransfer(burnRouter.sanctumSink(), sanctumPortion);
        }
        if (ecoPortion > 0) {
            IERC20(e.token).safeTransfer(burnRouter.ecosystemSink(), ecoPortion);
        }
    }

    if (net > 0) {
        IERC20(e.token).safeTransfer(e.merchantRecipient, net);
    }
}

/// @notice Send full held funds back to buyer's vault. No fee charged.
function _refundToBuyer(Escrow storage e) internal {
    if (e.amount > 0) {
        IERC20(e.token).safeTransfer(e.buyerVault, e.amount);
    }
}
```

The fee distribution at release uses the canonical 40/10/50 split. We don't re-call `computeFees` because we want to pay exactly the fee snapshotted at deposit, not whatever fee would apply now. If you later add a different protocol-canonical split (e.g., 35/15/50 — see the §10.4 FeeDistributor question), update here and in BurnRouter together.

### 3.4 `_merchantAuthVault` helper

For refund/dispute authorization, we need to know "who is the merchant" in vault terms. The merchant could have a custom payoutAddress that points anywhere — we shouldn't use payoutAddress for authorization (it might be a multisig or a 3rd-party splitter). Instead, use the merchant's vault as the authorization anchor:

```solidity
function _merchantAuthVault(Escrow storage e) internal view returns (address) {
    return vaultHub.vaultOf(e.merchant);
}
```

The merchant address itself is what's registered in MerchantPortal; their vault is what VaultHub returns for that address. The vault's owner (per VaultHub) is who authorizes refund/dispute on the merchant side.

### 3.5 Legacy `createEscrow` deprecation

```solidity
/// @notice DEPRECATED: this entry path requires an ERC20 allowance from the buyer's
///         EOA, which doesn't exist in the vault custody model. Use createEscrowWithIntent
///         on the customer's CardBoundVault instead.
/// @dev Reverts unconditionally to prevent broken integrations from silently failing.
function createEscrow(address, address, uint256, string calldata) external pure returns (uint256) {
    revert ESC_LegacyPathRemoved();
}
```

Don't soft-deprecate — hard-revert. A function that silently does the wrong thing is worse than one that fails loudly.

### 3.6 New events

```solidity
event EscrowFeeSnapshot(uint256 indexed id, uint256 feeAmount);
```

The existing `EscrowCreated`, `EscrowReleased`, `EscrowRefunded`, `DisputeRaised`, `DisputeResolved`, `DisputeResolvedPartial` stay as they are.

### 3.7 New errors

```solidity
error ESC_NotVaultCaller();
error ESC_LegacyPathRemoved();
error ESC_BadState();
error ESC_NotBuyer();
error ESC_NotMerchant();
error ESC_NotParty();
error ESC_Conflict();
error ESC_NotArbiter();
error ESC_NotDAOForHighValue();
error ESC_TooEarly();
error ESC_ZeroAddress();
error ESC_ZeroAmount();
error ESC_TokenNotWhitelisted();
error ESC_LockTooShort();
error ESC_LockTooLong();
error ESC_NoMerchantRecipient();
```

---

## 4. MerchantPortal — payWithIntent (recap from prior thread)

For completeness, since this doc supersedes the prior thread for the merchant-payment fix:

```solidity
interface ICardBoundVaultPay {
    struct PayIntent {
        address vault;
        address merchantPortal;
        address token;
        address merchant;
        address recipient;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }
    function executePayMerchant(PayIntent calldata intent, bytes calldata signature) external;
}

error MERCH_IntentInvalid();
error MERCH_IntentRecipientMismatch();

function payWithIntent(
    ICardBoundVaultPay.PayIntent calldata intent,
    bytes calldata signature,
    string calldata orderId
) external nonReentrant returns (uint256 netAmount) {
    if (intent.merchantPortal != address(this)) revert MERCH_IntentInvalid();
    if (intent.merchant == address(0)) revert MERCH_IntentInvalid();
    if (!merchants[intent.merchant].registered) revert MERCH_NotRegistered();
    if (merchants[intent.merchant].suspended) revert MERCH_Suspended();
    if (intent.deadline < block.timestamp) revert MERCH_IntentInvalid();

    _validateSettlementToken(intent.token);
    _checkMerchantScore(intent.merchant);

    address customer = vaultHub.ownerOfVault(intent.vault);
    if (customer == address(0)) revert MERCH_NoVault();

    _checkFraudStatus(customer);
    _checkFraudStatus(intent.merchant);

    address skmAddress = sessionKeyManager;
    if (skmAddress != address(0)) {
        ISessionKeyManager_MP skm = ISessionKeyManager_MP(skmAddress);
        if (!skm.canSpend(customer, intent.merchant, intent.token, intent.amount)) revert MERCH_Forbidden();
    }

    address resolvedRecipient = merchants[intent.merchant].payoutAddress;
    if (resolvedRecipient == address(0)) {
        resolvedRecipient = vaultHub.ensureVault(intent.merchant);
    }
    if (intent.recipient != resolvedRecipient) revert MERCH_IntentRecipientMismatch();

    uint256 customerScore = address(seer) != address(0) ? seer.getScore(customer) : 500;

    _recordMerchantStats(intent.merchant, intent.amount);

    ICardBoundVaultPay(intent.vault).executePayMerchant(intent, signature);

    emit PaymentProcessed(
        customer, intent.merchant, intent.token, intent.amount,
        0, orderId, customerScore, PaymentChannel.IN_PERSON
    );

    _rewardPaymentParticipants(customer, intent.merchant);
    _logEv(customer, "merchant_payment", intent.amount, orderId);

    return intent.amount;
}
```

Same as prior thread; nothing changes.

---

## 5. VFIDEToken — system-exempt EscrowManager

EscrowManager needs `systemExempt = true` so that:
- vault → EscrowManager deposits don't get _transfer-fee'd (the vault's fee handling is bypassed and EscrowManager handles fee snapshotting/distribution explicitly)
- EscrowManager → merchant releases don't get _transfer-fee'd (the fee was already snapshotted; we don't want to charge a second time)
- EscrowManager → buyer refunds don't get _transfer-fee'd (the buyer is being made whole)

Process: `VFIDEToken.setSystemExempt(escrowManager, true)` via the existing 48-hour timelock path. No new code needed in VFIDEToken; this is a deployment configuration step.

**Audit obligation:** before granting system exemption, confirm EscrowManager has no other token-movement paths (no `rescueTokens`, no admin sweep, no fallback transfer). The fix plan above adds none. If you ever add such a function later, you must revoke EscrowManager's exemption first.

---

## 6. Frontend changes

### 6.1 `lib/escrow/useEscrow.ts` — supports both modes

```typescript
import { useAccount, useChainId, useSignTypedData, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, isAddress } from 'viem';
import { CardBoundVaultABI, MerchantPortalABI, VaultHubABI, EscrowManagerABI } from '@/lib/abis';
import { ZERO_ADDRESS, getContractAddresses, isConfiguredContractAddress } from '@/lib/contracts';

export type SettlementMode = 'instant' | 'escrow';

export function useEscrow() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const addresses = getContractAddresses(chainId);

  const createEscrow = async (
    merchant: `0x${string}`,
    amount: string,
    orderId: string,
    settlement: SettlementMode
  ): Promise<`0x${string}`> => {
    if (!address) throw new Error('Wallet not connected');
    if (!publicClient) throw new Error('Public client not available');
    if (!isAddress(merchant) || merchant === ZERO_ADDRESS) {
      throw new Error('Merchant must be a valid non-zero address');
    }

    const portalAddress = addresses.MerchantPortal;
    const tokenAddress = addresses.VFIDEToken;
    const vaultHubAddress = addresses.VaultHub;
    const escrowAddress = addresses.EscrowManager;

    if (!isConfiguredContractAddress(portalAddress) ||
        !isConfiguredContractAddress(tokenAddress) ||
        !isConfiguredContractAddress(vaultHubAddress)) {
      throw new Error('Payment contracts not configured for this chain');
    }
    if (settlement === 'escrow' && !isConfiguredContractAddress(escrowAddress)) {
      throw new Error('Escrow contract not configured for this chain');
    }

    const customerVault = await publicClient.readContract({
      address: vaultHubAddress, abi: VaultHubABI, functionName: 'vaultOf', args: [address],
    }) as `0x${string}`;
    if (customerVault === ZERO_ADDRESS) {
      throw new Error('No vault found. Receive funds first to auto-create one.');
    }

    const [nextNonce, walletEpoch] = await Promise.all([
      publicClient.readContract({
        address: customerVault, abi: CardBoundVaultABI, functionName: 'nextNonce',
      }) as Promise<bigint>,
      publicClient.readContract({
        address: customerVault, abi: CardBoundVaultABI, functionName: 'walletEpoch',
      }) as Promise<bigint>,
    ]);

    const amountWei = parseUnits(amount, 18);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const finalOrderId = orderId || `order-${Date.now()}`;

    if (settlement === 'instant') {
      // Resolve merchant recipient (payoutAddress or merchant's vault).
      const merchantRecord = await publicClient.readContract({
        address: portalAddress, abi: MerchantPortalABI, functionName: 'merchants', args: [merchant],
      }) as { payoutAddress: `0x${string}` };

      let recipient = merchantRecord.payoutAddress;
      if (recipient === ZERO_ADDRESS) {
        recipient = await publicClient.readContract({
          address: vaultHubAddress, abi: VaultHubABI, functionName: 'vaultOf', args: [merchant],
        }) as `0x${string}`;
        if (recipient === ZERO_ADDRESS) {
          throw new Error('Merchant has no vault and no payout address');
        }
      }

      const intent = {
        vault: customerVault,
        merchantPortal: portalAddress,
        token: tokenAddress,
        merchant,
        recipient,
        amount: amountWei,
        nonce: nextNonce,
        walletEpoch,
        deadline,
        chainId: BigInt(chainId),
      };

      const signature = await signTypedDataAsync({
        domain: {
          name: 'CardBoundVault', version: '1', chainId, verifyingContract: customerVault,
        },
        types: {
          PayIntent: [
            { name: 'vault',          type: 'address' },
            { name: 'merchantPortal', type: 'address' },
            { name: 'token',          type: 'address' },
            { name: 'merchant',       type: 'address' },
            { name: 'recipient',      type: 'address' },
            { name: 'amount',         type: 'uint256' },
            { name: 'nonce',          type: 'uint256' },
            { name: 'walletEpoch',    type: 'uint64'  },
            { name: 'deadline',       type: 'uint64'  },
            { name: 'chainId',        type: 'uint256' },
          ],
        },
        primaryType: 'PayIntent',
        message: intent,
      });

      const hash = await writeContractAsync({
        address: portalAddress, abi: MerchantPortalABI, functionName: 'payWithIntent',
        args: [intent, signature, finalOrderId],
        chainId,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }

    // settlement === 'escrow'
    const intent = {
      vault: customerVault,
      escrowManager: escrowAddress,
      token: tokenAddress,
      merchant,
      amount: amountWei,
      orderId: finalOrderId,
      nonce: nextNonce,
      walletEpoch,
      deadline,
      chainId: BigInt(chainId),
    };

    const signature = await signTypedDataAsync({
      domain: {
        name: 'CardBoundVault', version: '1', chainId, verifyingContract: customerVault,
      },
      types: {
        EscrowIntent: [
          { name: 'vault',         type: 'address' },
          { name: 'escrowManager', type: 'address' },
          { name: 'token',         type: 'address' },
          { name: 'merchant',      type: 'address' },
          { name: 'amount',        type: 'uint256' },
          { name: 'orderId',       type: 'string'  },
          { name: 'nonce',         type: 'uint256' },
          { name: 'walletEpoch',   type: 'uint64'  },
          { name: 'deadline',      type: 'uint64'  },
          { name: 'chainId',       type: 'uint256' },
        ],
      },
      primaryType: 'EscrowIntent',
      message: intent,
    });

    // For escrow, the EscrowManager is the entry point — it calls back into the vault.
    // Submit via the manager's submitEscrowIntent wrapper (a thin function that calls
    // executeEscrowDeposit on the vault).
    const hash = await writeContractAsync({
      address: escrowAddress, abi: EscrowManagerABI, functionName: 'submitEscrowIntent',
      args: [intent, signature],
      chainId,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  };

  // ... release/refund/dispute helpers ...

  return {
    createEscrow,
    releaseEscrow: async (id: bigint) => { /* call EscrowManager.release(id) */ },
    refundEscrow: async (id: bigint) => { /* call EscrowManager.refund(id) */ },
    raiseDispute: async (id: bigint) => { /* call EscrowManager.raiseDispute(id) */ },
    // ...
  };
}
```

The `EscrowManager.submitEscrowIntent(intent, signature)` is a thin wrapper that calls `vault.executeEscrowDeposit(intent, signature)`:

```solidity
// EscrowManager.sol (additional)
function submitEscrowIntent(
    ICardBoundVaultEscrow.EscrowIntent calldata intent,
    bytes calldata signature
) external nonReentrant returns (uint256 escrowId) {
    if (intent.escrowManager != address(this)) revert ESC_IntentInvalid();
    // The vault executes the deposit and calls back into recordEscrowDeposit.
    return ICardBoundVaultEscrow(intent.vault).executeEscrowDeposit(intent, signature);
}
```

This gives the frontend a single entry point and lets the EscrowManager control the orchestration.

### 6.2 `app/pay/components/PayContent.tsx` — wire the toggle

Existing UI already has `settlement === 'escrow'` vs `'instant'`. Just pass the value through:

```typescript
await createEscrow(
  merchantAddress as `0x${string}`,
  requestedAmount,
  orderId,
  settlement  // 'instant' | 'escrow'
);
```

The toast messages and confirmation flow are unchanged. Add a small UI hint near the escrow option: "Funds are held for 3-14 days based on merchant trust score, then released to merchant."

### 6.3 Escrow management UI

A separate concern (out of scope for this doc), but worth noting: if buyers can create escrows, they need a UI to release them, and merchants need a UI to refund. Current `app/escrow/` (if it exists) should be wired to:

- List buyer's open escrows (from `EscrowCreated` events filtered by `buyer == self`)
- Per-escrow: show state, amount, lock period remaining, action buttons (release / dispute)
- For merchants: list incoming escrows, show refund / dispute buttons

This is a follow-up work item, not part of the contract fix.

---

## 7. Migration plan

### Phase 1 — contract additions (no breaking changes)

1. Deploy updated `CardBoundVault` implementation (or add functions via upgrade if it's proxy-deployed; if not, the new vault implementation must be the default for newly-deployed vaults, and existing vaults stay on the old implementation until they migrate). Note: this affects every existing vault — they all need to gain the new functions. If they're not upgradeable, this is a forced redeploy of every vault contract, which is a large lift. **Verify the vault deployment model before committing.**

2. Deploy updated `EscrowManager` with the new entry path. Old `createEscrow(...)` reverts.

3. Deploy `MerchantPortal` with `payWithIntent` added (additive change; old `pay()` keeps working for any pre-allowance-granted callers).

4. Configure: `VFIDEToken.setSystemExempt(escrowManager, true)` via the existing timelock path. Wait 48 hours, apply.

5. Configure: `EscrowManager.setMerchantPortal(merchantPortalAddress)` so it can resolve payout addresses.

### Phase 2 — frontend cutover

1. Update `lib/escrow/useEscrow.ts` to the dual-mode version above.
2. Update `useMerchantHooks.ts` `payMerchant` to use `payWithIntent` (or remove and have everything go through `useEscrow.createEscrow` with `settlement = 'instant'`).
3. Update `app/pay/components/PayContent.tsx` to pass the settlement mode.
4. Add the escrow management UI for release/refund/dispute (Phase 2.5).

### Phase 3 — deprecation

1. Once no callers rely on the old `MerchantPortal.pay()` flow (verifiable on-chain by counting calls), remove it from `MerchantPortal`.
2. Remove the deprecated `EscrowManager.createEscrow` stub once at least one full release cycle has elapsed.

### Vault upgrade question

The biggest open question is whether the vault implementation is upgradeable. Looking at the code, `CardBoundVault` is deployed via `VaultHub.ensureVault` using CREATE2, and the bytecode is the implementation directly (no proxy pattern visible). This means existing vaults cannot gain new functions.

Options:

- **Option V1: Force migration.** Add a vault migration function that lets a user move from old vault to new vault. Old vault's funds → new vault's funds. New vault is at a different CREATE2 address (different salt/init), so users get a new vault address. All historical escrow refunds need to forward to the new vault. Complex.

- **Option V2: Proxy retrofit.** Convert `CardBoundVault` to a UUPS or Beacon proxy pattern. New deployments use proxies; existing instances migrate. Substantial change.

- **Option V3: Parallel implementation.** Keep existing CardBoundVault for users who already have one. Deploy `CardBoundVaultV2` with the new functions. New users get V2. Existing users can opt-in migrate. Routing in MerchantPortal/EscrowManager has to handle both. Less invasive but doubles maintenance surface.

- **Option V4: Bridge via VaultHub.** Add the intent entry points to a separate "VaultIntentRouter" contract that the user authorizes once via the existing `approveVFIDE` 7-day flow. Once authorized (one-time), the router can submit any signed intent on behalf of the vault. This works for existing vaults without redeploying them, at the cost of the initial 7-day setup wait.

Of these, V4 is the most pragmatic for an existing testnet deployment. New users still wait 7 days for the first approval, but it's a one-time setup, and after that they have the same intent-based UX. For a launch where most users haven't onboarded yet, V3 (parallel implementation) is cleaner.

**Decision needed before implementation begins.** I'd recommend asking yourself: are there existing vaults in production that hold real value, or is this still a fresh testnet where you can swap out the implementation? If fresh testnet, just deploy the new `CardBoundVault` and call it the only version. If there's existing state, we need to talk through V1-V4 in detail.

---

## 8. Test plan

### 8.1 Unit tests — CardBoundVault.executePayMerchant

| Test | Setup | Expected |
|---|---|---|
| Happy path | Customer signs PayIntent for merchant M; portal submits | Merchant receives `amount - burnFee`, `nextNonce++`, `spentToday += amount` |
| Wrong portal | Customer signs intent with `merchantPortal = portalA`; submitted via portalB | Reverts at portalB on `intent.merchantPortal != address(this)`, AND on vault on `msg.sender != intent.merchantPortal` |
| Replay | Submit same intent twice | Second submission reverts on `CBV_InvalidNonce` |
| Wallet rotation | Customer rotates wallet between sign and submit | Reverts on `CBV_InvalidEpoch` |
| Recipient changes | Customer signed `recipient = V1`, merchant changes payoutAddress to V2 | Portal reverts on `MERCH_IntentRecipientMismatch` |
| Suspended merchant | Intent for merchant who gets suspended after signing | Portal reverts on `MERCH_Suspended` |
| Per-transfer limit | `intent.amount > maxPerTransfer` | Reverts on `CBV_TransferLimit` |
| Daily limit | `spentToday + amount > dailyTransferLimit` | Reverts on `CBV_DailyLimit` |
| Daily window reset | After 24h elapsed since last transfer | First subsequent payment within new daily window succeeds |
| Fraud-flagged buyer | Buyer's address flagged in FraudRegistry | Portal reverts on `_checkFraudStatus` |
| Fraud-flagged merchant | Merchant flagged | Portal reverts on `_checkFraudStatus` |
| Expired deadline | `deadline < block.timestamp` at execution | Reverts on `CBV_Expired` |
| Wrong signer | Signature recovers to non-activeWallet address | Reverts on `CBV_InvalidSigner` |
| Cross-chain replay | Intent with chainId != block.chainid | Reverts on `CBV_InvalidChain` |
| Self-recipient | `intent.recipient == address(this)` | Reverts on `CBV_PayIntentInvalid` |
| Zero recipient | `intent.recipient == address(0)` | Reverts on `CBV_PayIntentInvalid` |

### 8.2 Unit tests — CardBoundVault.executeEscrowDeposit

Mirror the above for escrow intent. Additionally:

| Test | Setup | Expected |
|---|---|---|
| Manager records deposit | After execute | Manager has the funds; new escrow entry created with correct `feeAmount` snapshot |
| Manager reverts on record | Manager throws in callback | Vault execution reverts (no orphaned funds) |
| Wrong manager | Submitted via `EscrowManagerB` not the one in intent | Reverts on `CBV_NotEscrowManager` |

### 8.3 Unit tests — EscrowManager state transitions

| Test | Initial state | Action | Expected |
|---|---|---|---|
| Buyer releases early | CREATED | Buyer calls `release(id)` | RELEASED; merchant gets `amount - feeAmount`; fees distributed; events emitted |
| Buyer releases via wallet rotation | CREATED, buyer rotated wallet | New active wallet calls `release(id)` (admin still same) | RELEASED |
| Merchant refunds | CREATED | Merchant calls `refund(id)` | REFUNDED; buyer's vault gets full `amount`; no fee charged |
| Timeout claim | CREATED, lock expired | Anyone calls `claimTimeout(id)` | RELEASED |
| Timeout claim too early | CREATED, lock not expired | Anyone calls `claimTimeout(id)` | Reverts on `ESC_TooEarly` |
| Buyer dispute | CREATED | Buyer calls `raiseDispute(id)` | DISPUTED |
| Merchant dispute | CREATED | Merchant calls `raiseDispute(id)` | DISPUTED |
| Third party dispute | CREATED | Random caller calls `raiseDispute(id)` | Reverts on `ESC_NotParty` |
| Arbiter resolves buyer | DISPUTED, amount < HIGH_VALUE | Arbiter calls `resolveDispute(id, true)` | REFUNDED; merchant punished -50 score |
| Arbiter resolves merchant | DISPUTED, amount < HIGH_VALUE | Arbiter calls `resolveDispute(id, false)` | RELEASED; buyer punished -20 score |
| Buyer-as-arbiter blocked | DISPUTED | Buyer (who is also arbiter for this test) calls `resolveDispute` | Reverts on `ESC_Conflict` |
| High-value dispute requires DAO | DISPUTED, amount > HIGH_VALUE_THRESHOLD | Arbiter calls | Reverts on `ESC_NotDAOForHighValue` |
| High-value dispute by DAO | DISPUTED, amount > HIGH_VALUE | DAO calls | Resolves |
| Refund after release | RELEASED | Merchant calls `refund(id)` | Reverts on `ESC_BadState` |
| Release after refund | REFUNDED | Buyer calls `release(id)` | Reverts on `ESC_BadState` |
| Lock period — high trust | Merchant ProofScore ≥ 8000 | Create escrow | `releaseTime - createdAt == 3 days` |
| Lock period — medium trust | Merchant ProofScore ≥ 6000 | Create escrow | `releaseTime - createdAt == 7 days` |
| Lock period — low trust | Merchant ProofScore < 6000 | Create escrow | `releaseTime - createdAt == 14 days` |
| Lock period — capped | Custom config tries to set 60-day lock | | Reverts on `ESC_LockTooLong` |
| Whitelisted token only | Token not in whitelist | Create escrow | Reverts on `ESC_TokenNotWhitelisted` |

### 8.4 Integration tests — full flows

1. **Instant payment, end-to-end:** Customer with vault V_C and ProofScore 6500 pays merchant M (vault V_M, payoutAddress = V_M) 1000 VFIDE. Customer signs PayIntent. Merchant submits via `payWithIntent`. Verify: V_M balance increased by `1000 - burnFee`, V_C balance decreased by 1000, BurnRouter sinks credited correctly, `nextNonce` of V_C incremented, `PaymentProcessed` event emitted.

2. **Escrow happy path:** Customer creates escrow for 5000 VFIDE with merchant M (high-trust, lock = 3 days). After 1 day, customer releases. Verify: M_recipient received `5000 - feeAmount`, BurnRouter sinks credited, V_C's nonce incremented at deposit time, escrow state = RELEASED.

3. **Escrow refund happy path:** Customer creates escrow for 5000 VFIDE. Same day, merchant refunds. Verify: V_C received full 5000 VFIDE back, no fee charged, escrow state = REFUNDED.

4. **Escrow timeout claim:** Customer creates escrow. Customer doesn't release. Merchant doesn't refund. After 14 days (low-trust merchant), anyone calls `claimTimeout`. Verify: same outcome as release.

5. **Escrow dispute, buyer wins:** Customer creates 1000 VFIDE escrow, raises dispute, arbiter sides with buyer. Verify: V_C refunded full 1000, merchant ProofScore -50.

6. **Escrow dispute, merchant wins:** Customer creates 1000 VFIDE escrow, raises dispute, arbiter sides with merchant. Verify: M_recipient received `1000 - feeAmount`, buyer ProofScore -20.

7. **High-value dispute requires DAO:** Customer creates 50,000 VFIDE escrow (above 10K threshold), dispute raised, arbiter cannot resolve, DAO can.

8. **Both modes used by same customer:** Customer makes one instant payment (nonce N) then one escrow deposit (nonce N+1). Verify both succeed and nonces advance correctly.

### 8.5 Adversarial tests

| Scenario | Expected |
|---|---|
| Buyer attempts to release someone else's escrow | Reverts on `ESC_NotBuyer` (auth check on vault owner) |
| Merchant attempts to release their own incoming escrow | Reverts on `ESC_NotBuyer` |
| Random user attempts to refund | Reverts on `ESC_NotMerchant` |
| Replay an EscrowIntent on a different chain | Reverts on `CBV_InvalidChain` |
| Replay an EscrowIntent against a different EscrowManager (migration scenario) | Reverts on `CBV_NotEscrowManager` (caller mismatch) and on the manager (`intent.escrowManager != address(this)`) |
| Front-run an executeEscrowDeposit with another transaction that increments nextNonce | Vault execution reverts on `CBV_InvalidNonce` (correct: customer's signed intent at nonce N is invalid if N has been consumed) |
| Submit EscrowIntent after wallet rotation | Reverts on `CBV_InvalidEpoch` |
| Submit malformed signature (length != 65) | Reverts on `CBV_InvalidSignature` |
| Submit signature with v not in {27,28} | Reverts on `CBV_InvalidSignature` |
| Submit signature with high-s value | Reverts on `CBV_InvalidSignature` |

---

## 9. FraudRegistry interaction

A buyer's outgoing transfer is held 30 days when they're flagged. How does this interact with merchant payments?

**Instant payment (`payWithIntent`):**
- Inside `MerchantPortal.payWithIntent`, the existing `_checkFraudStatus(customer)` call rejects flagged customers up front. They cannot even submit a payment. Correct.
- If the customer is flagged AFTER signing but BEFORE the merchant submits the intent (within the 10-minute deadline window), the portal will reject at `_checkFraudStatus`. The customer's signature is wasted but no funds move. Acceptable.

**Escrow deposit:**
- Inside `EscrowManager.recordEscrowDeposit`, add `_checkFraudStatus(buyerSigner)` and `_checkFraudStatus(merchant)`. Reject flagged parties.
- Same window-of-vulnerability as above: customer flagged after signing but before submission gets rejected at the manager. Acceptable.

**Mid-escrow flagging:**
- If buyer is flagged DURING the lock period, what happens?
  - On `release` (sending to merchant): tokens go from EscrowManager (system-exempt) to merchant's recipient. FraudRegistry intercepts only on `from = flagged user`. Since `from = EscrowManager`, no interception. Tokens flow to merchant normally. Correct: the buyer authorized this when they deposited; flagging shouldn't invalidate prior commitments.
  - On `refund` (sending to buyer): tokens go from EscrowManager to buyer's vault. Same reasoning — no interception. The refund completes. Correct: the merchant decided to refund, and refusing the refund because the buyer is now flagged is worse for the buyer.
- If merchant is flagged during lock: same analysis. On release, tokens go to merchant's recipient (which is system-exempt? no, just the merchant's vault). Hmm — if the merchant is flagged, and EscrowManager (system-exempt) sends to merchant's vault (not exempt), does FraudRegistry intercept?

Let me check VFIDEToken._transfer logic. The fraud check (escrow transfer required) gates on `from`, not `to`. Since EscrowManager is `from` and EscrowManager isn't fraud-flagged, no interception. Tokens flow to merchant's vault. Even if the merchant is fraud-flagged, the funds reach their vault.

This might or might not be the desired behavior. If you want flagged merchants' incoming escrow releases to be blocked, you'd add a `_checkFraudStatus(e.merchant)` in `release/claimTimeout/resolveDispute`. I'd recommend NOT doing this — once a buyer commits to a trade, the trade should complete or be disputed, not be silently blocked. If the merchant is mid-fraud, the buyer should dispute, not have the system unilaterally block delivery.

---

## 10. Spec doc updates

After implementation, the design doc needs updates:

**§8.1 — MerchantPortal:** add a paragraph describing `payWithIntent` as the customer-side flow:

> Customers authorize merchant payments via EIP-712 signed `PayIntent` structs. The customer's wallet signs an intent specifying merchant, amount, recipient, nonce, walletEpoch, and deadline; the merchant or a relayer submits the signed intent via `MerchantPortal.payWithIntent(intent, signature, orderId)`. The portal validates merchant status and fraud checks, then asks the customer's `CardBoundVault` to execute the transfer. The vault validates the signature against its `activeWallet` and pushes funds to the merchant's recipient atomically.

**§8.2 — EscrowManager:** rewrite to reflect the intent-based flow:

> Customers create escrow deposits via EIP-712 signed `EscrowIntent` structs submitted to `EscrowManager.submitEscrowIntent(intent, signature)`. The manager invokes the customer's `CardBoundVault` to push funds; the vault validates the signature and forwards tokens. EscrowManager is system-exempt on VFIDEToken: the BurnRouter fee is snapshotted at deposit time using the customer's score-at-deposit and applied at release time, with the held amount fully refundable if the trade is disputed or cancelled.

**§5.1 — CardBoundVault:** add brief mention of the three intent types:

> The vault supports three EIP-712 intent types signed by the active wallet: `TransferIntent` for vault-to-vault transfers, `PayIntent` for instant merchant payments, and `EscrowIntent` for escrowed merchant payments. All three share the vault's nonce sequence — only one intent of any type can be outstanding at a time per vault.

**§4.3 — Fee Distribution:** clarify the escrow fee timing:

> For instant transfers and instant merchant payments, the BurnRouter fee is debited immediately when the transfer settles. For escrowed merchant payments, the fee is snapshotted at deposit (using the buyer's score at deposit time) and charged at release. If an escrow is refunded or resolved in favor of the buyer, no fee is charged — the buyer is made whole.

---

## 11. Sequencing

The work in dependency order:

| Step | Description | Dependencies |
|---|---|---|
| 1 | Decide vault upgrade strategy (V1/V2/V3/V4 from §7) | None — must happen first |
| 2 | Add `PayIntent` and `EscrowIntent` types + executors to `CardBoundVault` | 1 |
| 3 | Add `payWithIntent` to `MerchantPortal` | 2 |
| 4 | Refactor `EscrowManager` for vault custody (struct, recordEscrowDeposit, refactored release/refund/dispute) | 2 |
| 5 | Add `submitEscrowIntent` wrapper on `EscrowManager` | 4 |
| 6 | Configure `VFIDEToken.setSystemExempt(escrowManager, true)` (timelocked) | 4 |
| 7 | Configure `EscrowManager.setMerchantPortal(...)` for payout-address resolution | 4 |
| 8 | Update `lib/escrow/useEscrow.ts` for dual-mode | 3, 5 |
| 9 | Update `app/pay/components/PayContent.tsx` to pass settlement mode | 8 |
| 10 | Build escrow management UI (release/refund/dispute) | 8 |
| 11 | Comprehensive test suite (Foundry) covering §8 above | 2-7 |
| 12 | Migration testing on Base Sepolia | 1-11 |
| 13 | Spec doc updates (§10) | 1-7 |
| 14 | Mainnet deployment | 12 |

Steps 2, 3, 4 can proceed in parallel since they're additive in different contracts. Step 11 (tests) happens alongside, not after. Step 13 is editorial — can happen anytime but should land before any external announcement.

---

## 12. Open questions to resolve before coding

1. **Vault upgradeability** (§7). Without this answered, no implementation work should start.
2. **Stablecoin escrow burn handling**: when the escrow token is a stablecoin (not VFIDE), the burn portion of the snapshotted fee can't be hard-burned. The doc proposes routing it to a designated burn sink, but is that the right behavior? Alternative: don't burn; route it 100% to ecosystem. Decision needed.
3. **Escrow management UI scope**: is this in-scope for the current sprint, or a follow-up? The contracts work without the UI, but the user-facing escrow product doesn't.
4. **Refund authorization**: should merchants be able to refund via their wallet's owner (current proposal), or via a signed RefundIntent (more secure, more friction)? I'd default to vault owner — it's simpler and the security model is symmetric with release.
5. **Lock period from MERCHANT or BUYER score?** Spec §8.2 says "high-trust SELLERS get shorter locks." Code uses `seer.getCachedScore(merchant)` which is the seller. Confirm this is intended (faster settlement for trustworthy merchants who are unlikely to fail to deliver) — I think yes, but worth confirming.

---

## 13. Total scope summary

**New contract code:** approximately 600 lines.
- CardBoundVault: ~250 lines (intent types, digests, recovers, two executors).
- EscrowManager: ~250 lines (refactor, helpers, new entry path, removed legacy).
- MerchantPortal: ~80 lines (`payWithIntent`).
- VFIDEToken: 0 (just configuration).

**Frontend code:** approximately 200 lines net.
- `useEscrow.ts`: ~150 lines (dual-mode flow).
- `PayContent.tsx`: ~10 lines (pass through settlement mode).
- Escrow management UI: ~separately scoped~.

**Configuration:** 2 timelocked transactions (`setSystemExempt`, `setMerchantPortal`).

**Testing:** ~70 unit tests + 8 integration scenarios + ~10 adversarial tests.

**Audit surface:** the security-critical work (signature verification, replay protection, limit enforcement, role checks) is concentrated in CardBoundVault's two new executors and EscrowManager's refactored release/refund/dispute paths. Roughly 400 lines of new code that needs careful review. The MerchantPortal change is a thin orchestrator with most validation already done by existing checks.
