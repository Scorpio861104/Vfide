# Workforce — Capability Certification (Backend Completion Campaign 5)

**Wave B.** Full certification of VFIDE's payroll/streaming workforce system (`PayrollManager.sol`) and its boundary
with the off-chain staff role system (`staffAuthEngine`, certified in Campaign 2). Model:
`lib/audit/workforceModel.ts`; matrix: `__tests__/audit/workforce.test.ts` (**151 scenarios; all pass; typecheck 0;
full audit suite 1358/34 green**). Target (150+) met.

## What it is
PayrollManager streams salaries **by the second** — "solving payday lending by giving access to earned wages
instantly." Streams are **self-funded**: `payer = msg.sender`, funds pulled via `safeTransferFrom(msg.sender)`.
There is **no shared pool** for employer streams. Lifecycle: createStream → addFunds → withdraw (payee) →
pause/resume → updatePayee (48h) → cancel (payer or payee) → emergencyWithdraw (DAO-only, 7d) → reclaimAfterExpiry.

## The headline result: the ghost-employee / self-pay vector does not exist
The classic embezzlement pattern — a manager invents a "ghost employee" and drains a company pool — **has no
precondition here**:
- **Self-funded, no pool (BND-01/02, CLOSE-03):** an employer pays from their *own* funds; there is no shared/company
  pool to drain. A fake payee stream only spends the *creator's own money* — not theft.
- **On-chain funder signature required (BND-03/04, CLOSE-02):** creating a stream requires the funder's on-chain
  signature. The off-chain staff roles (admin/manager/cashier) gate POS actions only — they **do not bridge** to
  stream creation. A manager cannot self-pay without the employer's signing key (which is a key-compromise case —
  Campaign 3, velocity-bounded + recoverable — not a PayrollManager flaw).

## Certified-sound protections (all verified)
- **Employer cannot claw back earned wages (WAGE-*, CLOSE-01):** `cancelStream` pays the payee's **accrued wages
  first**, returning only the *unaccrued* remainder to the payer; `reclaimAfterExpiry` preserves the payee's
  claimable amount; the DAO-only `emergencyWithdraw` is not an employer power. Every claw-back path is closed.
- **No indefinite wage freeze (PAUSE-*):** a payer may pause, but the **payee can force-resume after 30 days**
  (`MAX_PAUSE_DURATION`).
- **Payee change is 48h-timelocked (PAYEE-*):** the old payee can withdraw accrued wages before a payee change
  applies.
- **Emergency withdraw is DAO-only + 7d (EMER-*):** a governance escape hatch with a timelock, not an employer lever.
- **Anti-griefing caps (CREATE-07/08):** per-payer and per-payee stream caps (200) prevent flooding a party with
  streams; min rate `1e12`; max duration 365d.
- **Hardened transfers:** fee-on-transfer accounting (M-4), reclaim restricted to payer/payee (L-3, no permissionless
  griefing), paused-accrued cleared on any withdraw (DEEP-C-3).
- **Access control (AXR-*, AXS-*):** the full 11-action × 4-role matrix and the action × state matrix hold —
  withdraw is payee-only, pause is payer/DAO, updatePayee is payer-only, cancel is payer-or-payee, emergency is
  DAO-only.

## Finding
### WF-1 (LOW) — Off-chain staff roles and on-chain PayrollManager are not integrated
The Merchant-OS staff role system (`staffAuthEngine`) and the on-chain salary-streaming system (`PayrollManager`)
are **two disjoint systems**. A merchant manages POS permissions in one and creates payroll streams manually in the
other; nothing ties a staff member's role to a payroll stream (FIND-WF1). The **separation is what makes the system
safe** — it is precisely why no off-chain role can trigger an on-chain payment (FIND-WF1-safe) — but unified
"workforce" management is absent. This is a **completeness/UX gap, not a security hole**: the boundary is correct;
the integration is unbuilt. **Tracked open** (a product decision: whether to offer staff→payroll wiring, and how to
keep it safe if so).

## Certification status (ledger)
**Workforce: Exists = Yes · Certified (src+model) = Yes (151 scenarios) · Findings = WF-1 LOW (staff↔payroll not
integrated) · Findings-Fixed = No (open; product decision).** DAO payroll, where present, is a governed DAO-as-payer
flow (timelocked governance — no single-key embezzlement). Open boundary: on-chain stage-2 (bytecode) for
PayrollManager + service e2e for the streams API.
