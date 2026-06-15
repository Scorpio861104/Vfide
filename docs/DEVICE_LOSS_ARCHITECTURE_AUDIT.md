# Device Loss Architecture — Capability Certification (Backend Completion Campaign 3)

**Wave A · the last foundational campaign.** Certifies VFIDE's resilience across real-world device-loss
situations, answering for each: **(1) can the user still function? (2) for how long? (3) what remains protected?**
Model: `lib/audit/deviceLossModel.ts`; matrix: `__tests__/audit/deviceLoss.test.ts` (**168 scenarios; all pass;
typecheck 0; full audit suite 1055/31 green**). Target (150+) met.

## The decisive insight
VFIDE is **non-custodial**: vault assets live **on-chain, never on the device**. So a device-loss event never
touches the assets directly — impact is entirely a function of **key custody** (is the signing key on the phone, on
a hardware wallet, or restorable from a paper backup?) and **recovery setup** (are guardians configured?). The
verified layers: JWT session **24h** (API access, *not* vault signing); app-lock biometric unlock for amounts
**at/above a threshold**; **~72h** guardian recovery (`RECOVERY_CHALLENGE_DELAY`); on-chain velocity limits bounding
all spending; SIM = notification channel, not auth.

## The three questions, answered across all 7 scenarios

| Scenario | Can function? | How long? | What's protected? |
|---|---|---|---|
| Lost phone | Yes, if guardians OR backup | immediate (backup) / ~72h (recovery) / never if neither | assets, config, identity (on-chain) |
| Broken phone | same as lost | same as lost | same |
| Stolen phone | Yes (attacker bounded + severed) | ~72h recovery; immediate w/ backup | assets (rescue-blocked), config (timelocked), identity (recovery-only) |
| SIM swap | **Yes — never lost access** | N/A | vault fully (SMS isn't auth); residual: SMS *notifications* route to attacker |
| Malware (key exfiltrated) | Yes (bounded + severed like theft) | ~72h recovery; immediate w/ backup | same as stolen |
| Travel | **Yes — possession retained** | N/A | everything (collapses to lost/stolen only if device is then lost) |
| Hospitalization | No while incapacitated, but assets safe | N/A (a health event) | assets safe; continuity (PoL/inheritance) handles prolonged cases, owner-vetoable on return |

## Certified-sound properties
- **Attacker damage is bounded (DMG-*, INV-*, RES-*):** a hostile party holding the device/key **cannot drain
  VFIDE** (rescue double-guard), **cannot seize the vault** (ownership transfer is recovery-only, guardian-gated),
  **cannot change config instantly** (timelocked + guardian-cancellable), has **spending bounded** by
  maxPerTransfer + dailyTransferLimit, and is **severed by guardian recovery** (~72h).
- **Session is not a signing key (SESS-*, INV-session):** the 24h JWT grants API/read access only; moving vault
  funds requires the on-chain key signature — so a stolen session **cannot move funds at all** and expires in 24h.
- **SIM-swap on-chain immunity (SIM-*):** SIM swap compromises nothing on-chain; the user keeps their key; the only
  residual is that SMS *notifications* would route to the attacker — an information channel, not vault control.
- **Incapacitation handled by continuity (INC-*):** assets stay safe while the user is incapacitated; prolonged
  cases fall to proof-of-life + inheritance with long, **owner-vetoable** windows.
- **App-lock + velocity layering (LOCK-*, SWEEP-*):** the device-level app-lock blocks large (at/above-threshold)
  spends on a locked device; all spends — including sub-threshold — remain bounded by the on-chain velocity limits.

## Findings
### D-1 (MEDIUM) — Resilience is conditional on the user's setup
On the full grid (7 scenarios × 3 custody × 2 recovery = 42 cells), **exactly 4 cells are permanent-loss**:
phone-only key + no recovery + no backup, under lost/broken/stolen/malware (GRID-only-permanent-loss-cell,
FIND-D1). **Every** such case is fully mitigated by *either* configuring guardians *or* keeping a hardware/paper
backup (FIND-D1-mitigation). This is the expected shape for a non-custodial system — there is no custodian to
restore you — but it means a user who skips recovery setup **and** keeps no key backup has no path back from a hard
device loss. Onboarding already nudges guardian setup (semi-required with explicit risk acknowledgment); the
residual gap is that key-backup (hardware/paper wallet) is an advanced, un-nudged option. **Tracked open** —
remediation is UX nudging (surface "you have no recovery path" prominently), not a code defect.

### D-2 (LOW–MEDIUM) — App-lock gates only at/above the unlock threshold
A locked-but-stolen device blocks **large** spends (≥ threshold) but **not** sub-threshold spends (LOCK-03,
SWEEP-*, FIND-D2). Sub-threshold theft is still bounded by the on-chain velocity limits and severed by recovery, so
the exposure is a *bounded, recoverable* window of small-value spends — not a drain. **Tracked open** — optional
hardening would be a configurable "lock everything" mode.

## Certification status (ledger)
**Device Loss Architecture: Exists = Yes (cross-cutting; layers verified) · Certified (src+model) = Yes (168
scenarios) · Findings = D-1 MED (conditional resilience), D-2 LOW-MED (app-lock threshold) · Findings-Fixed = No
(open; D-1 is UX nudging, D-2 optional hardening).** Open boundary: on-chain stage-2 for the contract layers +
service e2e for the session/app-lock paths.
