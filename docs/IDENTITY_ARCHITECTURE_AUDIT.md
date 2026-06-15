# Identity Architecture — Capability Certification (Backend Completion Campaign 2)

**Priority: CRITICAL · Wave A · identity sits underneath ownership, recovery, guardians, merchants, employees,
governance, treasury, and notifications — everything.**

Full certification of VFIDE's complete identity surface (8 types), extending the certified three-domain core
(owner/admin/spending — Campaign C / Wave 98) to the role identities. Model:
`lib/audit/identityArchitectureModel.ts`; matrix: `__tests__/audit/identityArchitecture.test.ts` (**103 scenarios;
all pass; typecheck 0; full audit suite 883/30 green**). Target (100+) met.

## The 8 identities and their enforcement (verified, not assumed)

| Identity | Maps to | Enforcement | Notes |
|---|---|---|---|
| Owner | `ownerOfVault` | on-chain | account identity; changes only at registration/recovery (Campaign C) |
| Wallet | `activeWallet` | on-chain | spending/signing key; rotates via admin-proposed + guardian-approved (Campaign C) |
| Admin | `admin` | on-chain | config authority; two-step `transferAdmin` (Campaign C) |
| Guardian | `isGuardian` + threshold | on-chain | assigned/revoked by admin via timelocked `proposeGuardianChange` |
| DAO | `onlyDAO` | on-chain | governance authority; `setDAO` transfers it |
| Merchant | `addMerchant` + status | on-chain | self-registers with min ProofScore; non-merchant status reverts |
| Employee | `staffAuthEngine` (admin/manager/cashier) | off-chain | session + per-action permissions + per-tx/daily caps; `canAssignRole` escalation guard; route gates before the action |
| Auditor | — | **nominal** | human-auditor code comments + a narrow council-gated handover concept in `SystemHandover` — NOT first-class (Finding I-1) |

## Certified-sound properties
- **Capability authority (CAP-*, POS-*, WRONG-*):** every identity's create/rotate/revoke/recover/transfer is bound
  to the correct actor — owner changes only at registration/recovery; admin transfer is onlyAdmin two-step;
  spending rotation is admin-proposed (guardian-approved); guardian changes are admin-timelocked; DAO transfer is
  onlyDAO; merchant self-registers (DAO revokes); staff is owner/admin-managed. Wrong actors are rejected across the
  board.
- **No cross-identity escalation (ESC-*, SURF-04):** all **56 distinct ordered identity pairs** are non-escalating;
  no lower identity (staff, merchant, spending, cashier) can unilaterally acquire a higher one. The only upward
  influence — admin proposing a spending-key rotation — is guardian-approved, not unilateral.
- **Staff role enforcement (STAFF-*, PERM-*, ASSIGN-*):** `authorizeStaffAction` gates on session validity +
  per-action permission + per-transaction cap + cumulative daily cap; each permission independently gates its
  action; `canAssignRole` blocks privilege escalation — admins cannot mint other admins, managers/cashiers cannot
  manage staff, no self-promotion.
- **Inheritance & device-loss (IH-*, DL-*, INHERIT-*):** inheritance transfers vault ASSETS to heirs, not
  operational roles — an heir does not inherit the deceased's admin/guardian/merchant/staff roles; on-chain
  identities recover via guardian recovery after device loss, staff are re-issued by the merchant.

## Finding
### I-1 (MEDIUM) — "Auditor" is not a first-class enforced identity
The Auditor identity exists only as (a) **human-auditor notes in code comments** (e.g., OwnerControlPanel) and
(b) a **narrow, council-gated ownership-handover concept** in `SystemHandover` (`OwnershipAuditMarked`,
`SH_AuditorNotCouncil`). There is **no system-wide enforced auditor identity** with defined oversight/read powers
and create/rotate/revoke lifecycle (ENF-03/04, CAP-auditor, EDGE-05, XID-06). This is a **completeness gap, not a
bug** — nothing is broken; an envisioned identity is simply unbuilt. If VFIDE's vision includes an Auditor role
(compliance, oversight, transparency reporting), it needs **design intent first** (what may an auditor see/do?),
then build + certify — analogous to Continuity Lock. **Tracked open; not auto-built** (it is a product/vision
decision, not a defect to patch).

## Certification status (ledger)
**Identity Architecture: Exists = Yes · Certified (src+model) = Yes (103 scenarios) · Findings = I-1 MED
(auditor not first-class) · Findings-Fixed = No (open, needs design intent).** Open boundary: on-chain stage-2
(compiled bytecode) for the contract-enforced identities + service e2e for the off-chain staff path. The certified
core (owner/admin/spending) is reused from Campaign C, not re-derived.
