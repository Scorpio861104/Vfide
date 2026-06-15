# Wave 87 — Guardian Institution Campaign

Guardians are the keystone of the Preparedness stack — Recovery, Continuity, inheritance, next-of-kin, and
successors all lean on guardian threshold behavior. So this campaign attacked the guardian set itself, in
two directions: (1) **turning the guardians against the owner** (collusion, majority capture, compromise),
and (2) **stranding the owner** (death, disappearance, refusal, threshold lockout). It also opened the
**Slow Takeover** category you asked for. Found **two real defects**, both fixed; the rest of the hunt list
was verified sound (several defenses are genuinely well-built).

Verified (off-chain layer): typecheck 0, nav 0 broken, **122 tests / 13 suites** (+6). CardBoundVault can't
be compiled here — fixes are correct by inspection; on-chain proof remains the audit gate.

## The two defects found & fixed
### Defect 1 — Zero-redundancy guardian threshold is silently allowed (death/lockout trap)
The contract permits `guardianThreshold == guardianCount` (`setGuardianThreshold` only rejects
`threshold > guardianCount`). A config like 2-of-2 or 3-of-3 has **no death-redundancy**: if even one
guardian dies, loses their device, or simply refuses, the recovery threshold becomes permanently
unreachable — the owner is **locked out of recovery forever**. Nothing warned about this; the surfaces
explained "no guardians = no recovery" but not the subtler "guardians present but one loss = locked".
**Fix:** added a tested `lib/vault/guardianResilience.ts` helper (`assessGuardianResilience`) that computes
loss-tolerance (`count - threshold`) and flags the zero-redundancy case as `fragile`, plus a clear
in-product warning in the guardian tab: *"Your recovery needs all N guardians… add another so you can still
recover if one is lost."* 6 tests. (The contract already auto-lowers the threshold when a guardian is
*removed*, so the remaining risk was purely the un-warned setup — now surfaced.)

### Defect 2 — Slow-takeover blind spot: pending heir/successor changes weren't in the aggregate view
The owner has an aggregate pending-changes surface (`usePendingChanges` → `VaultPendingChangesBanner` +
`/vault/pending-changes`) that lists timelocked guardian/trustee/spend-limit changes — a strong
slow-takeover defense. But **pending inheritance (heir/successor) changes were not included** — they were
surfaced only on the inheritance pages. In your Day-7 "successor changed" scenario, a thief proposing a
malicious heir config would not appear in the one surface the owner routinely watches. The data existed
(`useInheritance` exposes `InheritanceConfigPending` with `effectiveAt`) — it just wasn't aggregated.
**Fix:** wired the inheritance manager's `pendingHeirConfigEffectiveAt` / `pendingConfigVersion` into
`usePendingChanges`, so a pending heir/successor change now shows up in the aggregate banner and page with a
"if you didn't request this, cancel it" prompt — closing the blind spot. Apply/cancel still defer to the
dedicated inheritance page (different commitment flow).

## The Guardian Edge Case Matrix
| Scenario | Outcome | Why |
|----------|---------|-----|
| **Guardian death** | Survivable IF redundancy exists | Threshold auto-lowers on removal; zero-redundancy now WARNED (Defect 1). |
| **Guardian disappearance** | Same as death | Owner removes (24h timelock) + re-adds; redundancy warning guides setup. |
| **Guardian account loss** | Same as death | Identical remove/replace path. |
| **Guardian compromise (1 key)** | **Bounded — no theft** | One guardian can grief-cancel withdrawals (DoS, funds stay put) but cannot redirect; recovery still needs threshold. |
| **Guardian collusion / majority capture** | **Blocked by owner veto** | A guardian-initiated recovery claim hits a challenge window; **only the original owner** can `challengeClaim`, which Rejects it and cools the initiator down 30 days. |
| **Guardian divorce / turned hostile** | Same as collusion/compromise | Owner challenges any malicious recovery; removes the guardian (timelocked). |
| **Guardian refusal to act / inactivity** | Survivable with redundancy | Threshold of remaining guardians still suffices if `lossTolerance ≥ 1`; the fragile-config warning pushes owners toward that. |
| **Guardian replacement abuse** | **Timelocked** | `setGuardian` is setup-gated; all post-setup guardian changes are 24h-timelocked and owner-vetoable. |
| **Guardian rotation attack** (add attacker guardian, use immediately) | **Blocked** | `GUARDIAN_MATURITY_PERIOD` = 7 days; recovery init/approval requires `isGuardianMature` — a fresh attacker guardian can't act for 7 days, during which the owner vetoes. |
| **Slow continuity takeover** (incremental changes over weeks) | **Now visible** | Routine changes aggregated in pending view; recovery claims raise the loud `OwnerChallengeBanner`; heir/successor changes now aggregated too (Defect 2). Every step is individually timelocked + vetoable AND now shows in one place. |

## Slow Takeover category (new, per the campaign brief)
The threat: every individual action is legal (add guardian Day 3, add trustee Day 5, change successor
Day 7…), but the *sequence* is malicious, exploiting an owner who isn't watching. VFIDE's defenses, now
complete after this wave:
- **Each step is timelocked** (guardian/trustee 24h, inheritance cooldown, rotation 7d) and individually
  vetoable.
- **Two-tier surfacing:** routine timelocked changes → the calm `VaultPendingChangesBanner`; a recovery
  takeover attempt → the loud, persistent `OwnerChallengeBanner` (different severity, correctly).
- **Now complete:** heir/successor changes are aggregated into the pending view (was the one gap).
- **Residual reality:** the defense still assumes the owner checks in within the longest timelock window
  (days). A fully-absent owner (hospitalized, deployed, no device for 30+ days) is the genuinely hard case
  — that's the proper subject of the **Continuity** campaign (Wave 88), where "the owner is unreachable for
  a long time" is the *designed-for* state rather than an attack.

## What was verified sound (not changed)
- **Guardian collusion cannot take the vault** — the original-owner-only `challengeClaim` + 30-day initiator
  cooldown + finalization grace period is a genuinely strong design.
- **Guardian maturity period** (7d) defeats the add-then-act rotation attack.
- **The guardian asymmetry holds end-to-end** (verified W86, re-confirmed): guardians cancel/pause/unpause
  by threshold and challenge recoveries, but **can never redirect funds**.
- **Single-guardian cancel is a deliberate trade-off, not a defect** — it must be fast to stop a thief's
  drain; the cost (one bad guardian can grief) is DoS not theft, the canceller is logged, and removal is
  the remedy. Requiring threshold-to-cancel would weaken the core anti-theft protection, so it was
  intentionally left as-is and documented.

## Remaining caveats (honest)
- **On-chain runtime unproven here.** Both fixes are off-chain (a UI warning + a frontend read aggregation),
  so they don't touch the contract — but the matrix verdicts that depend on contract behavior
  (`challengeClaim`, maturity, timelocks) are by code inspection; a professional audit remains the gate.
- The zero-redundancy warning is advisory (it can't force the owner to add a guardian) and the contract
  still *allows* a zero-redundancy threshold — making the contract itself reject `threshold == count` post
  setup would be a stronger guarantee, flagged as a candidate contract change for the audit pass rather than
  done here (it could brick existing intended single-guardian-bootstrap flows; needs care).
- Full guardian enumeration is still limited by the active ABI in some surfaces (pre-existing, noted in
  `MyGuardiansTab`).

## Completion decision
**Guardians earns ✅ COMPLETE (off-chain) / 🔒 contract audit gate** — it survived a two-direction adversarial
audit (guardians-against-owner and owner-stranded) that found two real defects, both fixed, with the full
edge-case matrix and the new Slow Takeover category traced against the code, and the strongest guardian
defenses (collusion veto, maturity, asymmetry) verified sound rather than assumed.

## Next
**Wave 88 — Continuity Institution Campaign**, where "the owner is unreachable for a long time" is the
designed-for state (the hardest residual from this wave's Slow Takeover analysis). Then Successors &
Emergency Operators (89) and the **Preparedness Civilization Audit** (90).
