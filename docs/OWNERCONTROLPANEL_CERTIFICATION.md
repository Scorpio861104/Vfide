# OwnerControlPanel.sol — Certification (⚠️ Certified With Known Boundary)

## Scope & method
Gate-audit of `contracts/OwnerControlPanel.sol` (1603 lines) — the largest previously-unaudited governance
surface and, by its name ("centralized admin control panel"), exactly the kind of contract that must be proven
*not* to reach user funds, in the same way EmergencyControl and SeerAutonomous were. Method matches the rest of
the on-chain campaign: **source-level audit + an executable TS authorization/boundary model** run as an
adversarial matrix, because this environment cannot compile Solidity (no solc). A compiled hardhat run remains
the required confirming step; the repo's OCP guardrail suites + verify-script (below) are that on-chain evidence
for a compiler-equipped environment.

- Model: `lib/audit/ownerControlPanelModel.ts`
- Matrix: `__tests__/audit/ownerControlPanelModel.test.ts` — **22 scenarios, all pass**; project typecheck 0.

## Central question
Does an "owner control panel" give some owner (the protocol multisig) control that reaches a user's vault or
funds — a freeze, seize, forced cooldown, or DAO-recovery — breaking the non-custodial invariant?

**Verdict: NO. OCP has no fund-reaching capability.** It is a protocol-parameter aggregator that "passes through
calls" to *system* contracts; it never holds, moves, freezes, or seizes user tokens. The verdict is ⚠️ (not 🟢)
only because it rests on source + model rather than a compiled run, and because OCP is large enough that a
prudent reviewer should confirm no path was missed (see Residual).

## What the audit verified (from source)

**No fund custody, and freeze/seize removed from the ABI.**
- The contract header states plainly: *"No fund custody (just passes through calls)."*
- `IUserVaultOCP` carries `// setFrozen removed — non-custodial`.
- `vault_freezeVault`, `vault_cancelDAORecovery`, and the DAO-recovery selectors were **removed outright** (not
  merely reverted) so the surface doesn't even advertise them (source comment, lines ~1179–1192:
  *"no contract on the V1 path can seize or freeze user tokens"*).

**The per-vault custodial setters are dead.**
- `setWithdrawalCooldown` / `setLargeTransferThreshold` / `setAbnormalTransactionThreshold` appear ONLY in a
  vestigial interface declaration. OCP invokes them **zero times** (grep-confirmed). The only `IUserVaultOCP`
  instantiation is inside `getVaultDetails`, a read-only `view` that reads `owner()/guardianCount()/frozen()`.
  So OCP cannot impose a withdrawal cooldown or any per-vault limit on a user.

**vault_reportRisk is signal-only.**
- It calls `panicGuard.reportRisk(vault, duration, severity, reason)` and emits an event — it is NOT a custody
  freeze (N-H19 fix explicitly replaced misleading "freeze" semantics). PanicGuard has no custody-freeze
  authority, and (per the Governance audit) the vault does not consult it on the fund path. Owner-only + timelocked.

**Pervasive timelock discipline, with anti-rug on the timelock itself.**
- ~44 `_consumeQueuedAction` gates and 23 propose/confirm pairs: virtually every state-changing owner action is
  queued behind `governanceDelay` (bounded **[24h, 30d]**), and actions **expire after 30 days**
  (`GOVERNANCE_ACTION_EXPIRY`), so a stale queued action cannot be sprung later.
- `governance_setDelay` can't escape [24h, 30d]; a *reduction* is rate-limited (`DELAY_REDUCTION_COOLDOWN`) and
  cannot cut the delay by more than half in one move (`OCP_ReduceTooLarge`) — an owner cannot quietly collapse
  the timelock to bypass it.

**Bounded delegations, two-step ownership.**
- `fees_setPolicy` delegates to `burnRouter.setFeePolicy`, which enforces the audited **[10%, 95%]** bounds — OCP
  cannot set a confiscatory/100% fee.
- Ownership transfer is two-step (`transferOwnership` → `acceptOwnership`); pending acceptance expires (7 days,
  per the guardrail suite) — no unilateral seizure of control.
- The remaining surface is protocol-parameter configuration: token modules/sinks/policy, sustainability (burn
  caps/adaptive fees), Seer thresholds, ecosystem distributor, anti-whale exemptions, and the `vault_*` *protocol*
  params (`vault_setModules`, `vault_setDAOMultisig`, `vault_setRecoveryTimelock`) — none of which is user funds.

## On-chain evidence (run with solc to confirm)
- `test/hardhat/OwnerControlPanelGuardrails335to337.test.ts` — pending-ownership 7-day expiry; `getTokenStatus`
  reports the treasury sink balance, not the owner's.
- `test/hardhat/OwnerControlPanelQueueConsistency329.test.ts` — queue required before `token_proposeSystemExempt`
  / `token_proposeWhitelist`.
- `npm run contract:verify:ocp-guardrails` (`scripts/verify-owner-controlpanel-guardrails.ts`).
- These are wired into the on-chain verification harness/manifest (`docs/ONCHAIN_VERIFICATION_MANIFEST.md`).

## Residual / known boundary
- ⚠️ Source + model, not a compiled run — confirm via the OCP hardhat suites + verify-script above.
- OCP is large (1603 lines). The 23 propose/confirm token-policy flows were read at the surface and traced for
  fund-reach, but not every branch of every system-contract delegation was traced to full depth. Nothing found
  reaches user funds; a prudent reviewer should still spot-confirm the delegations on a compiled build.
- No new findings.

## Bottom line
OwnerControlPanel is a centralized **protocol-parameter** panel with **no custody of user funds**, all powers
owner-gated + timelocked + bounded, with freeze/seize/DAO-recovery deliberately removed from the ABI and the
per-vault custodial setters dead. The non-custodial invariant holds at this surface, exactly as it does at the
EmergencyControl and Seer surfaces: no authority on the V1 path can freeze or seize a user's tokens.
