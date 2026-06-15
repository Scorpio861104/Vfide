# Family / Institutional Continuity — Capability Certification (Backend Completion Campaign 11 · Wave E)

Audit of VFIDE's continuity BEYOND the individual — couples, families, businesses, trusts, executors, and multiple
generations. Model: `lib/audit/familyContinuityModel.ts`; matrix: `__tests__/audit/familyContinuity.test.ts`
(**156 scenarios; all pass; typecheck 0; full audit suite 2306/39 green**). Target (150+) met.

This campaign is where the **largest completeness gaps** in VFIDE surface. The honest split: the individual +
multi-heir dimension is deeply built and certified; the institutional dimension is largely unbuilt.

## CERTIFIED-SOUND — individual + multi-heir inheritance (CardBoundVaultInheritanceManager.sol)
A single owner can leave assets to **multiple heirs with cryptographically pre-committed shares**:
- **Commit-reveal shares (COMMIT-*, NGRID-*, CLOSE-01):** each heir's `basisPoints` are bound inside a
  domain-separated commitment (`keccak256("VFIDE_INHERITANCE_V1", heir, basisPoints, ...)`). A heir **cannot
  inflate their share** — claiming a different basisPoints fails verification; cross-heir commitment confusion
  fails too.
- **Share cap (CAP-*, SPLIT-*, CLOSE-02):** total heir shares can never exceed `TOTAL_BASIS_POINTS` (10000);
  validated across spouse-only, even-split, three/four/five-way, and partial-distribution scenarios.
- **Config validity (CFG-*):** `proposeInheritanceConfig(heirGuardians[], heirCommitments[])` requires matching
  array lengths, rejects empty configs and zero commitments; two-step (propose → confirm/cancel) with a 30-day
  cooldown.
- **Windows (WIN-*, PWIN-*, PFIN-*, PVETO-*):** VETO **30d** (a live owner can return and cancel) → CLAIM **90d** →
  finalize-floor **14d** → MEMORIAL **365d**. Claims are blocked during veto, allowed within the window, blocked
  after it closes.
- **R-3 anti-seizure (R3-*, CLOSE-03):** the DAO guardian can **VETO** but **cannot INITIATE** a claim, and a
  stranger cannot initiate. The DAO is a brake, never an initiator or custodian.
- **Double-claim prevention (DBL-*)** via claimed-hash tracking; **non-custodial (NC-*)** — inheritance transfers
  assets to the heirs themselves; no third party ever takes custody.

So the FAMILY-AS-BENEFICIARIES case (one person → several family members, with shares) is fully served.

## COMPLETENESS GAPS — the institutional dimension (require product/design intent)
These are NOT fund-safety holes and NOT auto-buildable; each needs a design decision. **None creates a custody or
seizure path** (CLOSE-05) — they are unbuilt capabilities.

### FC-2 (MEDIUM–LARGE) — No business / corporate continuity *(the largest gap)*
There is **no organizational vault and no role-based succession** (FC2-*, QFC2-*). A business using VFIDE relies on
an **individual's personal vault**, so on that individual's death/loss the business assets route through their
**personal inheritance to personal heirs** — not a corporate succession to the company's officers or successors.
No multi-principal org vault, no CFO/COO-style role continuity. **Tracked open.**

### FC-1 (MEDIUM) — No joint/couple vault or spousal survivorship
The vault is **single-owner** (FC1-*, QFC1-*); a couple is two separate vaults. A couple **is** served by the
multi-heir workaround (each spouse names the other as a 100%/shared heir), but a surviving spouse still goes
through the full **30-day veto + claim** flow — there is **no instant survivorship** (no "if one dies, the other
immediately controls the joint vault"). **Tracked open.**

### FC-3 (MEDIUM) — No trust structures or estate-executor role
Inheritance is a **one-time guardian-gated payout** (FC3-*, QFC3-*) — there is no **trustee-manages-assets-over-time**
trust, no **staged/conditional distribution** (e.g., "hold a minor heir's share until adulthood, release X/year"),
and no **distinct estate-executor** role separate from the guardian set. **Tracked open.**

### FC-4 (MEDIUM) — No automatic multi-generation cascade
There is **no cascading config** (FC4-*, QFC4-*) — "to my children, and if a child predeceases, to their children."
**Chain of Return is PLANNED/no-code.** Each generation configures its own inheritance independently. **Tracked
open.**

## Certification status (ledger)
**Family / Institutional Continuity: Exists = Partial (individual + multi-heir built; institutional unbuilt) ·
Certified (src+model) = Yes for the built path (156 scenarios) · Findings = FC-2 MED-LARGE (no business/corporate),
FC-1 MED (no joint/survivorship), FC-3 MED (no trust/executor), FC-4 MED (no multi-gen cascade) · Findings-Fixed =
No (open; require design intent).** Open boundary: on-chain stage-2 (bytecode) for the inheritance manager + the
unbuilt institutional structures.
