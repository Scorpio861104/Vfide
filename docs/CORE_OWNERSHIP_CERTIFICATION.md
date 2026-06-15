# Core Ownership — Non-Custodial Invariant · Certification Report

First system outside Commerce taken through the gate discipline, and the highest-stakes one: the **non-custodial
invariant** is VFIDE's foundational promise, and every Commerce certification sits on top of it. If funds can be
frozen, seized, blacklisted, or force-moved in the ownership core, none of the Commerce work means anything.

**Verdict up front:** the non-custodial invariant **holds at the source level, for concrete and structural
reasons** — but this audit carries a **methodology boundary that must be stated plainly and is more significant
here than anywhere in Commerce:**

> ⚠️ **This is a SOURCE-LEVEL audit with an executable LOGIC MODEL — not an on-chain / compiled test.** The
> sandbox cannot download the Solidity compiler (solc), so I could not compile CardBoundVault or run its
> hardhat suite here. I read the Solidity source exhaustively, modeled its authorization logic in TypeScript,
> and ran an adversarial matrix against that model (37 scenarios, all pass). That proves the *logic admits no
> custodial path*; it does **not** independently re-verify the deployed bytecode. The repo carries **23 hardhat
> vault tests** (inheritance: complete/coverage/threats/r1–r4; recovery; registry) and **on-chain verifier
> scripts** (`verify-card-bound-vault-security.ts`, `card-bound-vault-initcode-chunks.ts`) that DO execute when a
> compiler/RPC is available — those, plus this source audit, are the evidence. **A compiled hardhat run of the
> invariant matrix against the real bytecode is the required next step before treating this as fully certified.**

Given that boundary, I am marking Core Ownership **⚠️ CERTIFIED WITH KNOWN BOUNDARY** — the design is sound and
the logic is proven, the boundary is "not re-executed on-chain in this environment."

## What the non-custodial claim rests on (and why it actually holds)

VFIDE's invariant is **"non-custodial by absence of code"** — there is no freeze/seize/blacklist/force-transfer
because no such function exists. That claim is only meaningful if **the code cannot be changed or replaced.**
The audit's first job was to test exactly that, and it holds for three concrete reasons:

1. **The admin facet is immutable.** CardBoundVault forwards admin calls to `CardBoundVaultAdminFacet` via a
   `delegatecall` fallback (CBV line ~2457). The facet address is `address public immutable adminFacet` (line
   645), set once in the constructor with a zero-check (line 1129), and **there is no setter anywhere.** The
   classic "swap the facet to add a drain function" attack is structurally impossible.
2. **No selfdestruct ⇒ CREATE2 cannot replace code.** The deployer uses CREATE2 (deterministic addresses), but
   a grep of the entire `contracts/vault/*.sol` set finds **zero `selfdestruct`**. Metamorphic code-replacement
   requires selfdestruct to clear the address first; without it, CREATE2 only gives a predictable address — it
   cannot swap the code at that address.
3. **No upgrade path on the vault.** No UUPS/`upgradeTo`/proxy-implementation setter on CardBoundVault. The
   code set is frozen at deploy.

So "absence of code" is backed by "the code is immutable" — the claim has a real foundation, not a hopeful one.

## Negative-property sweep (the functions that must NOT exist)
A grep across `contracts/vault/*.sol` for `freeze / seize / blacklist / confiscate / forceTransfer / isFrozen /
_blacklist` returns **zero functions.** The vault cannot freeze, seize, blacklist, or force-move the owner's
funds because no code does so.

## The authorization model (who can move the owner's funds)
- **Outbound transfer of the owner's VFIDE requires the OWNER's signed intent.** `executeVaultToVaultTransfer`
  / `executePayMerchant` / `executeFundEscrow` recover the EIP-712 signer and require `signer == activeWallet`
  (CBV line 1582), bound to chainId, walletEpoch (rotation invalidates old intents), a monotonic nonce (no
  replay), and a deadline, then capped by `maxPerTransfer` + `dailyTransferLimit`, with large transfers queued
  for a 7-day cancellable window (H-5 fix commits the daily budget at queue time so the queue can't be used to
  stage 20× the daily limit).
- **The ATM-card model:** both `admin` (the owner's control key) and `activeWallet` (the owner's signing/card
  key) belong to the OWNER; the design deliberately keeps them separable and re-separates them after recovery
  (H4 fix, `RecoveryAdminSeparated`). `admin` is **not** a protocol custodian.
- **Admin rescue can NEVER touch the owner's VFIDE.** `rescueERC20` reverts with `CBV_CannotRescueVFIDE` if the
  token is the VFIDE token — at **both** propose-time and apply-time (defense-in-depth) — and the inline comment
  names the exact attack it blocks ("a compromised admin key could rescueERC20(vfideToken, attacker, fullBalance)
  and bypass every transfer limit, the queue, the signature, AND the guardian veto"). Rescue is for **stray,
  non-protocol tokens only.**
- **Guardian backstop:** a pending rescue or large transfer can be cancelled by the admin **or any guardian**
  during the 7-day timelock — so a compromised admin key cannot force a rescue through, and the owner's chosen
  guardians can intervene. Guardians cannot themselves move funds.
- **Inheritance is the one non-live-owner fund path, and it is owner-protective:** claims move through
  VETO(30d) → CLAIM(90d) only after proof-of-life failure; the **living owner (activeWallet) can always
  veto/override**; the **DAO can VETO but can never INITIATE** a claim (design Decision 12).

## The invariant matrix — 37 executing scenarios (against the logic model)
`__tests__/audit/ownershipInvariants.test.ts` exercises the modeled authorization logic
(`lib/audit/ownershipInvariants.ts`). All pass.
- *A. Owner-signature gate (A1–A5):* only an `activeWallet`-signed intent moves funds; **admin / guardian / DAO
  / attacker signatures are all rejected.**
- *B. Destination (B1–B4):* no send to self / dead / non-vault; intent bound to this vault.
- *C. Replay/binding (C1–C4):* wrong chain / stale epoch / wrong nonce / expired all rejected.
- *D. Limits + queue (D1–D5):* over-max, over-daily (incl. spent-today), zero rejected; large transfer queued.
- *E. Rescue vs VFIDE (E1–E4):* **admin rescuing VFIDE blocked**; stray-token rescue allowed; non-admin blocked.
- *F. Guardian backstop (F1–F3):* guardian/admin can cancel a pending action; attacker can neither force nor grief.
- *G. Code immutability (G1–G4):* immutable-facet + no-setter + no-selfdestruct ⇒ frozen; a setter or a
  selfdestruct would break it; CREATE2 alone is safe.
- *H. Inheritance (H1–H8):* DAO/attacker cannot initiate; heir-guardian can after PoL failure; **living owner
  always overrides; a claim cannot complete while the owner is alive**; only a heir-guardian claims, only in the
  claim window, only when the owner is absent.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build/Read | ✅ full vault surface enumerated (CardBoundVault + 15 facet/manager/deployer/init contracts) |
| Functional | ✅ owner-signed-intent exit path verified; rescue/guardian/inheritance paths read |
| Edge-Case | ✅ replay/epoch/nonce/limit/queue boundaries modeled |
| Adversarial | ✅ no third-party fund movement; rescue-VFIDE blocked; code-swap impossible; inheritance owner-protective |
| Integration | ✅ activeWallet/admin separation, VaultHub vault-set checks, escrow funded only via signed intent |
| Grandmother | ✅ the property a non-technical owner needs is true and stated: *no one but you can move your funds; they can never be frozen or seized; if you disappear, only your chosen heirs inherit after a waiting period you can cancel while alive* |
| **Non-custodial invariant (source + logic model)** | ✅ **HOLDS** |
| **On-chain / compiled re-verification** | ⚠️ **NOT executed in this environment (documented boundary)** |

## Residual honesty notes (read these — this is the highest-stakes system)
- **The boundary is the headline.** This audit proves the *source logic* is non-custodial and the *code is
  structurally immutable*. It did **not** compile the contract or run the hardhat suite here (no solc). The
  required next step is a **compiled hardhat run** — ideally porting this invariant matrix to Solidity/TS
  hardhat tests against the real bytecode, and running the existing 23 vault tests + the `verify-card-bound-
  vault-security` on-chain checks in an environment with a compiler and an RPC node.
- **`adminManager` and `subManagerDeployer` were not read to the same depth** as the main vault + facet. They
  are deploy/storage-helper contracts, but a complete audit should confirm they hold no independent fund-moving
  authority and cannot be re-pointed. Noted as in-scope-but-not-yet-read.
- **Pause:** a pause mechanism exists; the source comment argues it cannot be weaponized for a drain (a thief
  who paused would only stop their own theft, and guardians/owner can intervene). I read the rationale and the
  `whenNotPaused`/auto-unpause logic but did not exhaustively prove pause cannot indefinitely lock an owner out
  of withdrawals — a specific item for the compiled run.
- **VaultHub / VaultRegistry** (the registry the vault trusts for `isVault`) were confirmed to exist and are
  referenced correctly, but are their own systems (Recovery & Continuity group) and are not certified here.
- Consistent with the whole campaign: "verified" here means **source-read + executable logic model**, not
  on-chain execution. I am flagging this prominently rather than letting "✅ HOLDS" imply more than it does.

## Tracker impact
Core Ownership moves 🔴 → ⚠️ (Certified With Known Boundary: non-custodial logic proven at source; on-chain
re-verification pending). The next gate audit, per the systems tracker's risk/adoption ordering, is
**Onboarding** — the front door every new user enters through.
