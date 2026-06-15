# Fraud Registry — Capability Certification (Backend Completion Campaign 7 · CLOSES WAVE B)

Full certification of VFIDE's fraud-flagging system (`FraudRegistry.sol` + `FraudJury.sol`). Model:
`lib/audit/fraudRegistryModel.ts`; matrix: `__tests__/audit/fraudRegistry.test.ts` (**163 scenarios; all pass;
typecheck 0; full audit suite 1657/36 green**). Target (150+) met.

## Calibration note (correcting the record)
My carried notes referenced a "30-day fraud escrow." **That hold no longer exists.** The contract was reformed to be
non-custodial: `escrowTransfer` now reverts ("fund holds removed - non-custodial") and `requiresEscrow` returns
false. The header is explicit — the system never holds, delays, or seizes funds; a flagged user keeps everything in
their vault; "no single authority (the DAO included) can confirm a flag." I audited the live, reformed contract.

## The headline: genuinely non-custodial
- **No seizure / hold / delay (NC-*, CLOSE-01):** `escrowTransfer` reverts, `requiresEscrow` is false, and a fraud
  flag **never** touches the flagged user's funds. A flag's only effects are a **Seer ProofScore penalty** and a
  **service ban** (from the merchant ecosystem) — reputation, not custody (NC-04, CLOSE-02).
- **A confirmed FALSE flag still seizes nothing (WEAP-07, ATK-06, PNC-attack):** even worst-case weaponization
  cannot drain a victim — the damage ceiling is reputational, and it self-heals (below).

## Anti-weaponization (verified)
- **No single-attacker flag (THRESH-*, WEAP-01, ATK-01/02):** a flag needs **3 distinct reporters** (one complaint
  per reporter per epoch), each with **score ≥6000** (MIN_REPORTER_SCORE). One account cannot reach the threshold.
- **False complaints are costly (WEAP-03, ATK-09):** a dismissed complaint costs the reporter **50 score** —
  sustained false-flagging burns the attacker's own standing.
- **Self-flagging blocked (WEAP-04, ATK-10):** a user cannot complain about themselves (no fabricated victimhood).
- **Jury confirmation, commit-reveal (JUR-*, ATK-03/04):** even at threshold, a flag (jury-wired) requires the
  **FraudJury** — **5-juror quorum**, **66% supermajority**, jurors **score ≥7000**, voting via **commit-reveal**
  (jurors cannot see each other's votes; no bandwagon). The jury bar (≥7000) is *higher* than the reporter bar.
- **DAO can veto, not create (ATK-05, CONF-07):** when the jury is wired, the DAO can only `daoVeto` a verdict — it
  cannot unilaterally create a flag.
- **Forgiveness caps the harm (DECAY-*, WEAP-08, ATK-07):** a confirmed signal + service-ban **auto-expires after
  90 days** (SIGNAL_TTL); a false flag self-heals even if never appealed.
- **Appeal before irreversibility (BAN-*, ATK-08):** a permanent ban carries a **7-day timelock** (H-4) so the
  subject can appeal; the pre-jury path gives a **48h appeal window**.

## Finding
### FR-1 (MEDIUM) — Dual-authority is conditional on the jury being wired
`confirmFraud` enforces "no single authority can confirm" **only when the FraudJury is wired**. In the **pre-jury
fallback** (no jury configured), it permits the DAO to confirm after a **48h appeal window without jury
confirmation** (CONF-05/06, FIND-FR1) — a single-authority path. It is mitigated (still needs 3 distinct ≥6000
reporters + the 48h appeal, and remains **non-custodial** so no funds are seized), but the strong decentralization
the contract advertises holds only in jury-wired mode. **Recommendation:** wire the FraudJury before mainnet, or
make jury confirmation mandatory (remove the fallback) once deployed. **Tracked open.**

### FR-2 (LOW) — Vestigial escrow surface
After the 30-day hold was removed, `escrowTransfer` (reverts), `requiresEscrow` (returns false), and the
`vfideToken` "for escrow releases" reference are retained as **ABI-compatibility stubs**. They are **safe** (revert /
false), but an integrator reading the ABI might assume escrow still exists. This is the cleaned-up state of the
earlier "escrow drift" finding — the stubs now fail loudly. **Cleanup or clear deprecation docs recommended.**
**Tracked open.**

## Certification status (ledger)
**Fraud Registry: Exists = Yes · Certified (src+model) = Yes (163 scenarios) · Findings = FR-1 MED (jury-conditional
dual authority), FR-2 LOW (vestigial escrow surface) · Findings-Fixed = No (open).** Open boundary: on-chain stage-2
(bytecode) for FraudRegistry/FraudJury + service e2e.
