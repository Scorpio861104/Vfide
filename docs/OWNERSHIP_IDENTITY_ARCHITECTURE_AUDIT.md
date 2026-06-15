# Ownership Identity Architecture — Capability Campaign (Campaign C)

**Priority: HIGH · Origin: the three-key ground truth from the Wallet-Compromise audit (OC Audit 4).**

VFIDE's vault is governed by THREE security domains, not one. This campaign certifies the relationship between them
explicitly — what each can do, how each changes, and that no lower domain can escalate to a higher one — and
resolves the `ownerOfVault`↔`activeWallet` divergence flagged as uncertain in OC Audit 4. Model:
`lib/audit/ownershipIdentityModel.ts`; matrix: `__tests__/audit/ownershipIdentity.test.ts` (**14 scenarios; all
pass; typecheck 0; full audit suite 638/26 green**).

## The three domains (traced from source — no assumptions)

| Domain | Symbol | Powers | Mutates via |
|---|---|---|---|
| **Owner Identity** | `ownerOfVault` / `vaultOf` (hub) | canonical "who owns this vault"; gates `abortRecoveryRotation`; the identity commerce contracts resolve via `vaultOf(caller)` | registration + **recovery ONLY** |
| **Admin Authority** | `admin` (vault) | config proposals (guardian/limit/PoL/rescue — all timelocked); can PROPOSE a wallet rotation (guardian-approved) | two-step `transferAdmin`/`acceptAdmin`, or recovery |
| **Spending Authority** | `activeWallet` (vault) | signs direct-spend intents | `finalizeWalletRotation` (admin-proposed + guardian-approved + delay), or recovery |

This is **separation of powers**, not a strict linear chain: the powers are largely orthogonal. The one hierarchy
edge is that admin can *propose* a rotation of the spending key (but only with guardian approval — not unilateral).
The owner-identity's power is narrow and specific: abort a wrongful recovery + be the canonical record.

## Certified properties

**Mutation surface (MUT-01..03):** each domain changes only via its authorized mutators. Critically,
**`ownerOfVault` (owner identity) changes ONLY at registration and recovery** — never by admin transfer or by a
legitimate wallet rotation. This is the resolution of the OC Audit 4 question.

**No-escalation invariant (ESC-01..04):** no lower domain can acquire a higher domain's authority unilaterally.
The spending key cannot call `transferAdmin` (onlyAdmin) or trigger recovery (guardian-driven); admin cannot change
`ownerOfVault` (recovery-only) and can only influence the spending key through a guardian-approved rotation; the
owner identity does not command admin or spending. Verified for **every** ordered pair of distinct domains.

**Admin transfer is a secure two-step (ADM-01/02):** `transferAdmin` only sets `pendingAdmin`; the named successor
must call `acceptAdmin`. Admin does not change until acceptance — no accidental or unilateral hand-off to a wrong or
hostile address.

**Identity ↔ spending-key divergence is BY DESIGN and SAFE (DIV-01..05):** the account identity (`ownerOfVault`) is
stable; the spending key (`activeWallet`) rotates. They start equal and diverge on rotation; recovery re-syncs them
(a full ownership transfer). No security check assumes `vaultOf(activeWallet)` resolves to the vault — commerce
contracts resolve `vaultOf(msg.sender)` (the owner identity), `isVault` reads `ownerOfVault` (stable), and vault
spending verifies the `activeWallet` signature directly. A call made from a rotated spending key where the owner
identity is expected **fails closed** (`no-vault-for-caller`) — it never escalates or misroutes funds.

## Finding — correction of a prior finding (OC-3)

### OC-3 CORRECTED (was MEDIUM → now LOW) — recovery DOES sever subscriptions
**What OC Audit 3 claimed:** "recovery severs the direct channel but NOT subscription allowances — `vaultOf` is
unchanged by a wallet rotation, so the vault-pinning won't trigger." **That reasoning conflated a legitimate wallet
rotation with recovery.** This campaign traced the distinction precisely:
- **Legitimate rotation** (`finalizeWalletRotation`): does NOT touch `vaultOf` → subscriptions **survive** (DIV-01).
  This is correct and desirable — rotating your spending key should not cancel your subscriptions.
- **Recovery** (`VaultHub.executeRecoveryRotation`): executes `vaultOf[oldOwner] = address(0)` (line 668). The
  subscriber of any pre-recovery subscription is that old owner, so `processPayment` resolves
  `vaultOf(sub.subscriber) == 0` and hits `require(userVault != address(0), "no user vault")` → **reverts**. The
  subscription is **severed** (DIV-02).
- **Inheritance:** does NOT touch `vaultOf` → subscriptions **continue** through VETO/CLAIM, settling at MEMORIAL
  (DIV-03) — OC-5 stands, correctly.

**Corrected disposition:** recovery severs BOTH spending channels — the direct channel via walletEpoch + queue
clear, and the subscription channel via the `vaultOf` clear that fails the pull's vault resolution. The earlier
MEDIUM "recovery doesn't sever subscriptions" finding is **downgraded to LOW**: the only residual is **allowance
hygiene** — the `approveVFIDE` allowance to the SubscriptionManager persists after recovery (the new owner should
review/revoke it), but **no pre-recovery subscription can use it** (they fail vault resolution). This makes the
recovery story MORE complete than OC-3 represented. No code change required; the protection already exists in the
vault-pinning. The OC campaign docs + executive summary are updated to reflect this correction.

## Registry impact
The Ownership Identity Architecture is certified at evidenced stages **1/6/10/11/12/13** (source traced,
per-domain permissions, full mutation/escalation edge matrix, adversarial, cross-system: identity↔spending↔
recovery↔commerce, grandmother property: your spending key is not your ownership — losing or rotating it never
transfers who owns the vault). **Stage 2 remains `~`.** Campaign C also CORRECTS OC-3 (recovery severs
subscriptions) — a net improvement to the documented security posture.
