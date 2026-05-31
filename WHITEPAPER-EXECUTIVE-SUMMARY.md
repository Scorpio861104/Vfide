# VFIDE — Executive Summary

**Veritas + Fides — Truth + Trust**
A self-custodial payments and commerce protocol on Base.
*Version 1.0 · Testnet Edition · Codebase baseline v19.13*

---

## What VFIDE is

VFIDE is a non-custodial payment and commerce protocol built on Base (with Polygon and zkSync Era as additional mainnet targets). It exists to do three things the existing financial system does not:

1. **The merchant receives the full price.** The protocol fee on commerce transactions is hardcoded to zero. The buyer pays the network fee separately and visibly, the way they pay sales tax — not bundled into the cost of goods.
2. **Trust is earned by behavior, not granted by authority.** Every user has a **ProofScore** (0–10,000) computed on-chain from their own activity. Higher ProofScore means lower fees on transfers — from a maximum of 5% for a brand-new user down to 0.25% for a long-trusted user.
3. **No entity can freeze, blacklist, or seize a user's tokens.** Not the developer, not the elected council, not any regulator acting through the contract. The functions that would enable it are *deliberately absent from the source code* — not feature-flagged off, not policy-disabled, but never written.

These properties are encoded in 108 Solidity contracts and verified by 473 test files.

## The problem VFIDE addresses

Roughly 1.4 billion adults are unbanked. Two to three billion more pay disproportionately for financial services they cannot opt out of: 2.6%–3.5% per card swipe, 8%–15% on cross-border remittances, 1%–3% per send and per withdrawal on mobile money. These costs do not decrease with loyalty, volume, or proven honesty. There is no "I am a reliable sender" tier in the existing rails.

VFIDE replaces that flat extraction with a behavior-priced curve: pay more when the network has no reason to trust you, pay less as you build a record. The merchant is held harmless from the cost of the system at all times.

## How it works in one paragraph

A user's tokens live in a per-user smart-contract vault (`CardBoundVault`) — a phone or wallet app is a *key*, not the *custody*. Lose the phone, the funds are still in the vault, and user-chosen guardians can authorize recovery to a new key. Every transfer's fee is computed by the on-chain `ProofScoreBurnRouter` from a 7-day time-weighted average of the sender's ProofScore. The total fee is split 40% burned / 10% to a community-funded buyer-protection pool (Sanctum) / 50% to the protocol's operations fund (Ecosystem). Governance is a 12-member elected council whose votes are weighted by **ProofScore, not token balance**, so token-buying does not buy voting power. Six months after launch, the developer's administrative key permanently burns and the protocol becomes fully community-governed.

## Fee curve at a glance

| Sender's ProofScore | Fee on a typical transfer |
|---|---|
| 0 – 4,000 (new / unproven) | 5.00% (flat ceiling) |
| 4,000 – 8,000 | linear interpolation from 5.00% down to 0.25% |
| 8,000 – 10,000 (trusted) | 0.25% (flat floor) |
| Any score, transfer ≤ 10 VFIDE | capped at 1.00% (micro-transaction relief) |

**Merchant-of-record commerce transactions: 0.00%, hardcoded.**

## What VFIDE is not

VFIDE does **not** offer staking, yield, APY, "passive income," investor returns, or rewards-as-returns. There is no presale. The token launches via a Liquidity Bootstrapping Pool where market participants set the price. Fee reductions earned through ProofScore are framed and structurally implemented as a **utility-cost discount** (cheaper transactions when the network trusts you), not as a return on capital. Council members receive **employment compensation** for governance work, auto-swapped to stablecoins, not native-token appreciation. See the full white paper, Section 6 (Howey Compliance Posture), for the complete analysis.

## Why this is possible now

Per-user smart-contract vaults plus EIP-712 typed-data signatures plus account-abstraction-grade UX on a low-fee L2 (Base) make non-custodial-with-recovery practical for users who have never heard of a seed phrase. The same low-level primitives DeFi uses for speculation are repurposed here for plain payments and commerce. The novel components are the on-chain reputation engine (Seer), the fee curve that translates reputation into utility savings (`ProofScoreBurnRouter`), and the governance model that uses reputation as voting weight (`DAO`). The novel components are the on-chain reputation engine (Seer), the fee curve that translates reputation into utility savings (`ProofScoreBurnRouter`), and the governance model that uses reputation as voting weight (`DAO`).

## Status

| Item | Status |
|---|---|
| Smart contracts (Solidity) | 108 files, frozen at v19.13 baseline |
| Test coverage | 473 test files; 9,000+ tests passing |
| Audit findings tracked | 66+ across multiple cycles, all addressed in this baseline |
| Networks | Base Sepolia (live testnet); Base, Polygon, zkSync Era (mainnet targets) |
| Developer key burn | Scheduled 6 months post-mainnet via `SystemHandover` |
| Public audit publication | Planned ahead of mainnet |

---

**For the full architecture, governance model, fee mechanics, threat model, and Howey compliance posture, see [`WHITEPAPER.md`](./WHITEPAPER.md). For the deepest technical reference — every constant, every contract function, every line citation — see the VFIDE Complete Manual.**
