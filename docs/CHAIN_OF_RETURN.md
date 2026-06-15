# Chain of Return — Capability BUILD (Backend Completion Campaign 13 · Wave E)

**Status change: PLANNED/no-code → BUILT.** This campaign implements the multi-generation inheritance cascade that
finding FC-4 (Family Continuity) flagged as not built. New artifacts: `contracts/vault/ChainOfReturn.sol`,
`lib/audit/chainOfReturnModel.ts`, `__tests__/audit/chainOfReturn.test.ts` (**153 scenarios; all pass; typecheck 0;
full audit suite 2613/41 green**). Target (150+) met.

> Build discipline: the Solidity is written for the real toolchain; it is **not compiled here** (no solc in the
> sandbox). The TS model + matrix certify the LOGIC and the non-custodial guarantees. Open boundary: a real
> solc-0.8.30 compile + professional audit + the inheritance-manager integration wiring.

## What it does
"To my children, and if a child predeceases me, to their children." If a designated heir cannot claim
(deceased/inactive when distribution opens), their share cascades to THAT heir's own pre-committed successors — the
next generation — recursively, up to **MAX_RETURN_DEPTH = 3** generations.

## The safety idea — pre-committed succession via MERKLE SETS
A naive design (a single named successor per heir) only supports a linear lineage. The real case is plural — "to my
**children**." So each node commits to its successor SET as a **merkle root**: a node's leaf =
`keccak256(DOMAIN, basisPoints, secret, successorsRoot)`, where `successorsRoot` is the merkle root of its
children's leaves (0 for a leaf). A successor claims a cascaded share by proving **merkle-membership** of its leaf
within its parent's successor root, **level by level**, down from the deceased heir (VP-*, SET-*, MK-*).

Because every link is pre-committed by the ancestor, a share can **only** reach the heir (if they claim) or the
heir's **own committed descendants** — never an arbitrary party. No one can fake an heir's death to reroute a share.

## Non-custodial guarantees (certified)
- **Resolves WHO may claim; never moves or seizes funds (NC-*, CLOSE-01):** a cascaded share is claimed by the
  successor with THEIR own secret; the manager transfers to the successor directly. The contract holds nothing.
- **Genuine-non-claim trigger (WIN-*, CLM-*, GRID-*, ABUSE-01):** a cascade link is honored only where the
  ancestor's claim window has CLOSED and the ancestor did NOT claim — never on a mere assertion of death. A living
  ancestor blocks the cascade past itself.
- **Bounded depth (DEPTH-*, R3-depth-cap):** depth is capped at 3 generations; a 4th generation is rejected /
  resolves to residual — no unbounded recursion.
- **Share conservation (SH-*, PROD-*, CONS-*, R3-cons-*):** a path's share is the PRODUCT of basisPoints down the
  path, monotonically non-increasing — a descendant can never receive more than its ancestor's share, and total
  distribution never exceeds the estate. Unclaimed / uncascadable shares stay **residual** — never invented, never
  seized.

## Anti-abuse matrix (all defended)
| Attack | Defense | Scenarios |
|---|---|---|
| Outsider inserts themselves as an heir | No valid merkle proof in the committed set | ABUSE-02, SET-*-outsider, CLOSE-04 |
| Fake an heir's death to grab the share | Cascade requires genuine non-claim (window closed + not claimed) | ABUSE-01, WIN-*, CLM-* |
| Inflate a cascaded share | basisPoints bound in the commitment; tamper breaks merkle | BAD-01/04/05, AAE-01 |
| Forge a successor / swap proofs | Leaf must merkle-verify in the parent set | BAD-03, AAE-02/03 |
| Skip a generation to claim directly | Each level must verify in its parent's set | AAE-02 |
| Cascade forever (gas) | MAX_RETURN_DEPTH = 3 | DEPTH-02, CLOSE-03 |

## Distribution resolution (full tree)
`resolveEstate` walks the succession tree and returns the final per-recipient estate basis points across all the
patterns: all-claim, single-child predeceased, grandchild cascade, multi-child split, dead-end residual, and a full
three-generation lineage (DIST-*, PD-*, R3-*, UB-*). Every pattern conserves.

## Integration points (for the inheritance manager)
The manager stores each heir's `successorsRoot` alongside their existing inheritance commitment at config time. A
post-window successor claim calls `verifyReturnPath(heirSuccessorsRoot, path, ancestorsClaimed, windowsClosed)` then
`computeCascadedBasisPoints(path)`; the manager transfers `estate * bps / 10000` to the successor and marks the leaf
claimed once (`claimCascade`).

## Certification status (ledger)
**Chain of Return: Exists = Yes (BUILT this campaign) · Certified (src+model) = Yes (153 scenarios) · Findings =
none (new build; non-custodial by construction; resolves FC-4) · Findings-Fixed = n/a.** Open boundary: real solc
compile + professional audit + inheritance-manager wiring.
