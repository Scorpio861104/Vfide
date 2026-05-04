# VFIDE Security Audit — Consolidated Findings

**Project**: VFIDE non-custodial DeFi payment protocol
**Codebase**: 100+ Solidity contracts, Next.js frontend (~221K LOC), PostgreSQL, WebSocket
**Audit scope**: 20 rounds across the contract suite, frontend, API routes, and deploy scripts
**Total findings**: ~414
**Document date**: 2026-05-01

---

## Executive Summary

| Severity | Count | Definition |
|----------|-------|------------|
| **Critical** | ~43 | Funds-at-risk, deploy blocker, or single-key kill-switch on the protocol |
| **High** | ~76 | Significant attack surface, governance break, or substantial UX/safety failure |
| **Medium** | ~98 | Important to fix but non-fatal; degraded UX or operational fragility |
| **Low** | ~84 | Hardening, code hygiene, or limited-impact issues |
| **Info** | ~104 | Documentation, observability, design notes |

The most consequential single finding is **#391 — AdminMultiSig is deployed but never wired into the protocol.** Every "deployer holds X" finding from rounds 1-19 stands as written: there is no multisig backstop. Once this is fixed, many other findings reduce in severity (the deployer compromise model becomes a 3-of-5 council compromise model).

The second most consequential is **#306 — VFIDEToken deploy script treasury parameter mismatch**: this is a pure deploy blocker. The contract cannot be deployed as scripted today.

---

## Top 10 Priority Fixes

These are the items to address before anything else. Each has cascading effects on other findings.

1. **Wire AdminMultiSig** (#391, R20). Update `transfer-governance.ts` and `apply-full.ts` to transfer ownership/DAO roles of every Ownable contract to the AdminMultiSig address. Without this, the entire "multisig governance" narrative is fictional.

2. **Lower EMERGENCY_APPROVALS to 4-of-5** (#392, R20). With unanimity required, a single lost key permanently bricks emergency governance and council rotation.

3. **Require veto quorum matching approval quorum** (#393, R20). Currently 1-of-5 can veto a proposal that needed 3-of-5 to approve. Single bad-faith council member can block all governance.

4. **Fix VFIDEToken deploy script treasury parameter** (#306, R16). Constructor expects an EOA but script passes a contract address. Deploy reverts. Pure deploy blocker.

5. **Fix VFIDEToken permit() struct hash missing deadline** (#307, R16). EIP-2612 PERMIT_TYPEHASH includes `deadline` but the struct hash being signed omits it. All standard permit signatures fail. One-line fix.

6. **Cap ecosystemMinBps inflation at original totalFee** (#345, R18). Owner can silently push effective fee from 0.25% to 1% by setting `ecosystemMinBps = 100`. Extra goes to deployer-controlled EcosystemVault. ~5 line fix.

7. **Add OCP wrappers for ALL token onlyOwner functions** (#325, #326, R17). Post-rotation, 8 token apply* functions and 4 module setters become permanently uncallable.

8. **Update transfer-governance.ts ordering + transfer ownership of all admin contracts** (#327, #328, R17; #347, R18). Script transfers token ownership BEFORE pending applies complete; never transfers VaultHub, BurnRouter, EcosystemVault.

9. **Consolidate halt mechanisms** (#363-#367, R19). Four independent global halt paths exist (VaultHub.pause, BurnRouter.pause, EmergencyBreaker.toggle, CircuitBreaker.manualTrigger). Pick ONE multisig-controlled mechanism, remove the others.

10. **Fix Seer.setScore + resolveScoreDispute lastActivity + history** (#151, #159, #177, #178, R12-R13). DAO-promoted users can't vote in DAO due to score-history initialization gap; applyDecay permanently demotes; multiple compounding bugs in Seer.

---

## Cross-cutting Themes

### 1. Centralization that the architecture pretends to mitigate

The codebase is structured to *appear* decentralized — there's an OwnerControlPanel, an AdminMultiSig, an EmergencyControl committee, a DAO with timelocks. In practice, virtually every Ownable contract still has the deployer as owner because:

- Deploy scripts don't wire AdminMultiSig (#391).
- Transfer-governance scripts skip several Ownable contracts (#327, #328, #347).
- OCP doesn't expose wrappers for all governed functions (#325, #326).
- DAOTimelock requires manual admin rotation outside any script (#206-#208).

Net effect: a single deployer key compromise compromises the entire protocol. The audit report on each individual contract's onlyOwner function should be read as "this is a deployer-key function," not "this is a multisig-governed function."

### 2. Multiple parallel halt/freeze mechanisms

The protocol has four independent global halt paths (Round 19) plus the FraudRegistry per-user soft-freeze. Any single key in any of these paths halts user transfers. Per the user's "no entity should freeze user money" principle, these are deletable except for user-controlled mechanisms (guardians, withdrawal queue).

### 3. Score-system has compounding bugs

Seer is referenced by ~30 contracts as the source of truth for trust scores. Several Seer bugs (#151, #152, #159, #177, #178, #179) compound because every consumer reads Seer's score. Bugs in Seer manifest as bugs everywhere.

### 4. Test infrastructure has limited EVM coverage

Earlier rounds noted tests use jest mocks rather than real EVM. Many "fixed" findings were only fixed in the contract; corresponding test coverage is mocked rather than actually exercised.

### 5. Frontend assumes endpoints that don't exist or have closure bugs

Multiple critical frontend → backend gaps (#62, #91, #92, #94, #95, #97, #99, #100) where the UI calls APIs that either don't exist, have route closure bugs, or accept user-supplied data that should be server-verified.

---

## Severity Legend

- **CRITICAL**: Direct funds-at-risk, deploy blocker, or governance kill-switch reachable by single key. Must fix before mainnet.
- **HIGH**: Significant attack surface, governance break, or substantial security failure. Should fix before mainnet.
- **MEDIUM**: Operational fragility, degraded UX, or limited-impact attack. Address in normal sprint cadence.
- **LOW**: Code hygiene, documentation, or theoretical issues. Backlog.
- **INFO**: Architectural notes, observations, suggestions.

## Status Legend

- **Open**: Not yet addressed
- **Fixed**: Addressed in current codebase (per V14)
- **Mitigated**: Partial fix or compensating control in place
- **Acknowledged**: Design choice; not a "bug" per se

All findings below are **Open** unless noted. The user has not indicated any have been fixed since the audit was conducted.

---

# Findings by Round

## Round 1-3 — Initial Surface Audit (Frontend, API, Auth)

Early rounds covered the frontend application, API routes, authentication infrastructure, and database layer. ~26 findings of which the most critical:

### #1. Deployer-as-default-recipient pattern is widespread
**Severity**: CRITICAL
**Theme**: Deploy scripts default to setting deployer as recipient/owner for many roles, with no enforced rotation step.
**Fix**: Add deploy-time validation that no production deploy completes with deployer as final recipient. Add `transfer-governance.ts` execution as a deploy gate.

### #2. Oracle and Finance contracts don't tightly compose
**Severity**: HIGH
**Theme**: Price oracle and finance contracts have loose integration; finance can quote prices oracle hasn't validated.
**Fix**: Make finance contracts call oracle's `validatedPrice()` view, not raw `getPrice()`.

### #3. The "scoring system" uses Seer hot-path everywhere
**Severity**: MEDIUM
**Theme**: Every contract reads Seer.getScore() in transfer paths; gas adds up and any Seer bug propagates everywhere.
**Fix**: Use `getCachedScore()` (router-level) consistently; introduce per-contract cached snapshots.

### #4. Bootstrap fragility at multiple layers
**Severity**: HIGH
**Theme**: Multiple contracts reference each other; deploy ordering is critical and undocumented.
**Fix**: Document deploy ordering explicitly; add `seerHealthy()`-style probes contracts can call to verify wiring.

(Rounds 1-3 also identified general code hygiene and structure concerns — duplicate test directories, oversized contracts, etc. — see #43, #44 below.)

---

## Round 4-7 — Frontend, API, WebSocket, Indexer

### #27. `proxy.ts` at repo root is named wrong (RETRACTED)
**Status**: Originally flagged; **retracted** — proxy.ts at root is correct in Next.js 16+.

### #28. `next.config.ts` ships a strict CSP that will break the app (RETRACTED)
**Status**: Retracted along with #27.

### #29. `next.config.ts` has `typescript: { ignoreBuildErrors: true }` — broken-import routes will deploy
**Severity**: HIGH
**Location**: `next.config.ts`
**Description**: Build errors are suppressed, allowing routes with broken imports to ship. Combined with #66 (the withAuth import bug), means deploys can succeed despite runtime-fatal import errors.
**Fix**: Remove `ignoreBuildErrors`. Fix any errors that surface.

### #30. WebSocket internal `/event` endpoint — string `!==` secret comparison + unbounded body
**Severity**: HIGH
**Location**: WebSocket server
**Description**: Internal event endpoint uses string equality for secret comparison (timing attack) and accepts unbounded body sizes (DoS).
**Fix**: Use constant-time comparison. Add body size limit (e.g., 1MB).

### #31. Token revocation in `verifyJWT` — Upstash failure is fail-open in dev, fail-closed in prod
**Severity**: HIGH
**Location**: `verifyJWT` middleware
**Description**: Different fail modes per environment lead to different bug surfaces. Errors surface differently between dev and prod.
**Fix**: Standardize on fail-closed in both environments. Log Upstash failures explicitly.

### #32. `lib/db.ts` — every query is wrapped in BEGIN/COMMIT
**Severity**: MEDIUM
**Description**: Wrapping every query (including SELECT) in transactions adds overhead and complicates connection pooling.
**Fix**: Only wrap multi-statement operations. Provide separate `query()` (no tx) and `txQuery()` (with tx) helpers.

### #33. `getClient()` overrides `client.query` to inject auto-transactions — easy to break
**Severity**: MEDIUM
**Location**: `lib/db.ts`
**Description**: The override is fragile; easy for future changes to bypass transaction wrapping.
**Fix**: Use a wrapper class instead of monkey-patching.

### #34. `ProofScoreBurnRouter.computeFees` — view function `require(totalFees <= amount)`
**Severity**: LOW
**Description**: View revert in fee preview can crash UI if calculation overflows.
**Fix**: Cap totalFees to amount instead of reverting in view.

### #35. `ProofScoreBurnRouter.computeFees` — `microTxFeeCeilingBps` can override the linear floor incorrectly
**Severity**: MEDIUM
**Description**: Micro-tx ceiling logic can produce fees lower than the linear curve's minimum.
**Fix**: Always enforce `min(curveFee, microTxCeiling)` only when amount qualifies as micro-tx.

### #36. `ProofScoreBurnRouter.recordVolume` is `nonReentrant` and `whenNotPaused` — adds gas to every transfer
**Severity**: LOW
**Description**: Volume recording on hot path adds reentrancy guard gas to every token transfer.
**Fix**: Move volume tracking to async (off-chain indexer) or reduce per-call overhead.

### #37. `EcosystemVault.sol` is 1,415 lines
**Severity**: INFO
**Description**: Oversized contract; hard to audit, hard to maintain. Multiple responsibilities.
**Fix**: Split into smaller contracts (council, manager, distributor, vault).

### #38. `chats.${a}_${b}` topic format relies on lowercase + lex order
**Severity**: LOW
**Description**: Helper does `.sort()` on lowercase but database topics may be inconsistent.
**Fix**: Strict normalization in helper; reject non-canonical topic strings.

### #39. `app/api/auth/route.ts` — analyzed activity has `then()` without `await`
**Severity**: LOW
**Description**: Fire-and-forget pattern means error handling is silently dropped.
**Fix**: Either await or use `void promise.catch(logError)`.

### #40. Two POST routes with no schema validation
**Severity**: HIGH
**Description**: Two unspecified POST routes accept arbitrary body without Zod validation.
**Fix**: Add Zod schema to all POST routes. Reject requests that don't match.

### #41. `lib/db.ts:280` — `query` swallows DB errors and rewraps as generic message
**Severity**: MEDIUM
**Description**: Rewrapping loses error context; debugging production issues becomes difficult.
**Fix**: Log original error with stack; return generic message to user only.

### #42. `recordVolume` failure path swallows the reason without context
**Severity**: LOW
**Description**: try/catch swallows error reason in BurnRouter.recordVolume call.
**Fix**: Emit ExternalCallFailed event with reason bytes (already done in some places).

### #43. `MerchantPortal.sol` is 1,349 lines + 12 other contracts >500 lines
**Severity**: INFO
**Description**: Many oversized contracts complicate audit and maintenance.
**Fix**: Split larger contracts into focused responsibilities.

### #44. Repo bloat — duplicate test directories `__tests__/` AND `test/`
**Severity**: INFO
**Description**: Two test conventions in same repo create confusion about which is canonical.
**Fix**: Pick one convention; delete or migrate the other.

### #45. `app/api/merchant/installments/route.ts` — `.catch(() => ({ rows: [] }))` masks DB errors
**Severity**: HIGH
**Description**: DB errors return empty data, indistinguishable from "no records". Silent data loss.
**Fix**: Throw on DB error; let route handler decide response.

### #46. Mock files exist in production codebase
**Severity**: LOW
**Description**: `__mocks__/sentry-nextjs.js`, `uncrypto.js`, `isomorphic-dompurify.js`, `minimatch-compat.cjs` shipped with prod build.
**Fix**: Move to test-only directory; exclude from build.

### #47. `package.json` script `postinstall: npm run validate:env`
**Severity**: LOW
**Description**: Postinstall runs env validation that fails in CI without env vars set.
**Fix**: Make validate:env CI-aware or move to a separate explicit script.

---

## Round 8-10 — Auth, Database, RLS, Critical Frontend Routes

### #48. RLS USING(true) bug — Row-Level Security policies enabled but never activated
**Severity**: CRITICAL
**Location**: `supabase/migrations/*` and `lib/db.ts`
**Description**: RLS policies use `USING(true)` which evaluates everyone as authorized. Combined with `lib/db.ts` never calling `SET app.current_user_address`, RLS is effectively non-functional. Any DB connection sees everything.
**Fix**:
1. Update RLS policies to use `current_setting('app.current_user_address')` matching the relevant column.
2. Update `lib/db.ts` to call `SET app.current_user_address = $1` at start of every authenticated request.
3. Add integration test that verifies cross-user data isolation.

### #62. `merchant/orders` POST trusts user-supplied `tx_hash` to mark orders paid
**Severity**: CRITICAL
**Location**: `app/api/merchant/orders/route.ts`
**Description**: Endpoint accepts `tx_hash` from request body and marks order as paid without verifying the transaction on-chain. A user can submit any tx hash (even unrelated or made-up) and have an order marked paid.
**Fix**: Verify tx_hash on-chain: confirm sender, recipient, amount, and token match the order. Use indexer or RPC `eth_getTransactionReceipt`.

### #63. Production rate limiting silently disabled if `VFIDE_TRUST_PROXY_HEADERS` env unset
**Severity**: HIGH
**Description**: Rate limiter falls back to no-op when proxy headers env missing. In prod behind a load balancer, this disables rate limiting.
**Fix**: Default to enabled; require explicit opt-out. Alert on missing env in prod.

### #64. WS server JWT verify race can accept revoked tokens via secret-rotation fallback
**Severity**: HIGH
**Description**: During JWT secret rotation, the verifier tries old secret as fallback; revoked tokens signed with old secret still verify.
**Fix**: Check revocation list BEFORE secret verification, not after.

### #65. `merchant/returns` PATCH silently swallows inventory restock errors
**Severity**: MEDIUM
**Description**: When a return is processed, inventory increment errors are caught and ignored. Inventory drifts.
**Fix**: Treat inventory errors as fatal; rollback the return.

### #66. `withdrawProposal` resets scalar fields but leaves `hasVoted`/`scoreSnapshot` mappings intact
**Severity**: HIGH
**Description**: Mapping data persists across proposal lifecycle; can cause stale vote counting on re-proposed measures.
**Fix**: Use a mapping-clearing pattern (per-proposal nonce) so old vote data doesn't affect new proposals.

### #67. Vault deployer hard-codes owner-as-sole-guardian
**Severity**: MEDIUM
**Description**: New vaults deploy with owner as the only guardian; user must explicitly add others before any meaningful guardian protection exists.
**Fix**: Refuse to deploy a vault without at least one independent guardian, OR clearly mark single-guardian vaults as unprotected in UI.

### #68. Seer score architecture: operator delta replaces automated score
**Severity**: HIGH
**Description**: When an operator (DAO/admin) sets a score delta, it replaces the automated calculation rather than augmenting it. Loses badge/endorsement bonuses.
**Fix**: Combine operator delta with automated score (weighted sum), don't replace.

### #69. `OwnerControlPanel` queued actions never expire
**Severity**: MEDIUM
**Description**: Queued OCP actions stay queued forever if not executed. Stale proposals can be triggered later when context has changed.
**Fix**: Add expiry (e.g., 30 days from queue time). Reject execute after expiry.

### #72. `checkout/[id]` PATCH closure crash
**Severity**: CRITICAL
**Location**: `app/api/checkout/[id]/route.ts`
**Description**: PATCH route references `params` outside the `withAuth` closure, causing a runtime crash on every PATCH request. Checkouts cannot be updated.
**Fix**: Move `params` access inside the closure.

### #79. Indexer ABI 5-vs-8 fields mismatch
**Severity**: CRITICAL
**Location**: Indexer service
**Description**: Indexer's ABI has 5 fields but the actual contract emits events with 8 fields. ABI decoding silently fails for newer events; transactions don't appear in user history.
**Fix**: Regenerate ABI from current contract; deploy indexer with updated ABI; reindex from genesis.

### #80. Indexer doesn't handle reorg
**Severity**: HIGH
**Description**: No reorg handling; deep reorgs cause transaction history to be wrong.
**Fix**: Track block confirmations; finalize only after N confirmations.

### #91. `/api/crypto/transfer` and 4 other endpoints don't exist in the codebase
**Severity**: CRITICAL
**Description**: Frontend calls 5 endpoints that have no server-side implementation. UI shows success but nothing happens.
**Fix**: Either implement the endpoints or fix the frontend to call existing ones.

### #92. `/api/crypto/payment-requests` and `[id]` routes fail at module load
**Severity**: CRITICAL
**Description**: Routes have import errors that crash at module load. All requests return 500.
**Fix**: Fix imports. Add CI build check that catches module load failures.

### #93. `/api/crypto/payment-requests/[id]` PATCH references `params` outside `withAuth` closure
**Severity**: CRITICAL
**Description**: Same closure crash pattern as #72.
**Fix**: Move params access inside withAuth closure.

### #94. Frontend and backend disagree on `/api/crypto/payment-requests` POST schema
**Severity**: HIGH
**Description**: Frontend sends fields backend doesn't expect (and vice versa). Requests succeed but data is wrong.
**Fix**: Single shared schema (e.g., Zod schema in shared package); both ends import the same definition.

### #95. `payment-requests/[id]` PATCH lets either party mark a request as 'completed' with a fake tx_hash
**Severity**: CRITICAL
**Description**: Same as #62 but for payment requests. No on-chain verification.
**Fix**: Verify tx_hash on-chain before marking complete.

### #96. `PaymentLinkGenerator` outputs `/pay/<slug>?amount=...` to a route that doesn't exist
**Severity**: HIGH
**Description**: Generated payment links are 404s.
**Fix**: Either implement /pay/[slug] or change the generator to output a working URL.

### #97. Hosted-checkout `page.tsx` extracts `tx_hash` incorrectly — always sends empty string
**Severity**: HIGH
**Description**: Even when tx hash is captured, the wrong variable is sent. Empty tx_hash arrives at the API.
**Fix**: Fix variable reference.

### #98. `useEscrow.createEscrow` is identical to `usePayMerchant` while UI promises buyer protection
**Severity**: HIGH
**Description**: Hook claims to provide escrow but does a direct payment. Buyer "protection" is fictional.
**Fix**: Either implement actual escrow OR remove the buyer protection UI claim.

### #99. PayContent.tsx and PaymentInterface.tsx don't record payments to the merchant DB
**Severity**: HIGH
**Description**: On-chain payments succeed but don't update merchant order state. Merchant sees no payment.
**Fix**: Add post-payment DB write to record the on-chain payment in merchant's order.

### #100. Three different on-chain payment paths exist; one is dead code that bypasses the vault
**Severity**: HIGH
**Description**: Inconsistent payment paths create confusion about which is correct. Dead-code path bypasses vault security.
**Fix**: Delete dead-code path. Document which path each UI surface uses.

### #101. CheckoutPanel hardcodes VFIDE = $0.50 and uses it in fallbacks
**Severity**: MEDIUM
**Description**: Fallback price is wildly wrong; UI shows incorrect USD equivalents when oracle fails.
**Fix**: No fallback; show "price unavailable" if oracle is down.

### #102. PaymentRequestCard's `Pay` button calls `payPaymentRequest` which has the chain of broken endpoints
**Severity**: HIGH
**Description**: Cascading bugs: button → broken endpoint → broken validation → broken DB record.
**Fix**: Fix the endpoint chain (#91, #94, #95).

### #103. `notifyTipReceived` and similar fire-and-forget social actions silently swallow errors
**Severity**: LOW
**Description**: Notification failures invisible to user.
**Fix**: At minimum log errors; consider adding retry queue.

### #104. `request.expiresAt` is set client-side without verification
**Severity**: MEDIUM
**Description**: Expiry can be set arbitrarily by client; abuse to make requests that "expire" in the past or never.
**Fix**: Server sets expiry; reject client-supplied value.

### #105. Customer dictates pricing
**Severity**: CRITICAL
**Location**: Checkout flow
**Description**: Customer-supplied price is used without server verification against merchant's product catalog. Customer can pay any price they choose, including $0.
**Fix**: Server reads price from product catalog using product ID. Reject customer-supplied price entirely.

### #106. Inventory overcommit
**Severity**: HIGH
**Description**: Concurrent orders for the same item don't check inventory atomically; total committed can exceed actual stock.
**Fix**: Use SELECT FOR UPDATE or row-level locks; refuse orders that would overcommit.


---

## Round 11-12 — Merchant OS, Off-ramp, Disputes, Seer Full Audit

### #137. `merchant/withdraw` POST inserts a `pending` row with no on-chain debit
**Severity**: HIGH
**Description**: Withdrawal request creates DB row showing pending but no on-chain debit happens. Merchant balance shows withdrawn but funds aren't moved.
**Fix**: Either initiate on-chain debit immediately or clearly mark as "queued" with explicit confirmation step.

### #138. `merchant/withdraw` POST trusts a body-supplied `amount` that has no relation to the merchant's actual balance
**Severity**: CRITICAL
**Description**: Merchant can request withdrawal of any amount, including more than their balance. Combined with #137, can drain protocol if backed by off-chain conversion.
**Fix**: Server reads merchant balance; rejects withdrawal amounts exceeding balance.

### #139-#150. Off-ramp / Dashboard / Setup wizard / Disputes / Training issues
A cluster of 12 findings around the merchant onboarding and dispute resolution flows. Common themes:
- **#139**: Off-ramp doesn't validate phone format
- **#140-#141**: Setup wizard uses blob: URLs for product images that don't survive page reload
- **#142**: MerchantDashboard registration doesn't sync with off-chain profile
- **#143**: Auto-convert toggle optimistically updates state without on-chain confirmation
- **#144-#145**: Disputes UI renders fake mediationPreview; PeerMediation falls back to DEFAULT_DISPUTE
- **#146**: MerchantTraining is purely decorative; "completion" is local state with no backend sync
- **#147**: ProofScore minimum requirement contradiction (5,600 vs 8,000 used in different places)
- **#148**: customPayout accepts any address with no balance/contract check
- **#149**: app/merchant/page.tsx mounts multiple sensitive components without auth gating
- **#150**: PaymentInterface mock-vs-real mismatch from #98 repeats here

**Severity ranges**: MEDIUM-HIGH for individual findings; collectively they indicate the merchant flow needs end-to-end integration testing.

### #151. Seer.setScore no history
**Severity**: CRITICAL
**Location**: `Seer.sol`
**Description**: When DAO sets a user's score via `setScore`, no history snapshot is recorded. The user's `lastActivity` isn't updated either. Combined with #177/#178, DAO-promoted users cannot vote in DAO because their effective score for governance reads zero (no recent activity).
**Fix**: setScore must update `lastActivity` AND push a snapshot to scoreHistory ring buffer.

### #152. `applyDecay` permanent demotion
**Severity**: CRITICAL
**Description**: applyDecay reduces score over time but doesn't restore on activity. A user who is inactive for the decay window has their score permanently reduced even after returning to active use.
**Fix**: Decay should be reversible — score should auto-restore (within bounds) on subsequent positive activity.

### #159. Score-resolveDispute lastActivity gap
**Severity**: HIGH
**Description**: When a score dispute is resolved by DAO, lastActivity isn't updated. The resolved user can't reach DAO voting threshold.
**Fix**: resolveScoreDispute must update lastActivity for the affected user.

### #177. DAO-promoted users can't vote
**Severity**: CRITICAL
**Location**: `DAO.sol` voting eligibility check
**Description**: DAO voting requires recent `lastActivity`. DAO-promoted users (via setScore) don't have lastActivity set, so they fail the eligibility check despite having qualifying scores. The DAO's own promotion mechanism creates voting-ineligible members.
**Fix**: setScore must touch lastActivity (see #151).

### #178. Same DAO-promotion gap applies to score recovery from dispute
**Severity**: CRITICAL
**Description**: Companion to #177. After disputing and winning a score correction, the user still can't vote because lastActivity wasn't updated.
**Fix**: resolveScoreDispute must touch lastActivity (see #159).

### #179. SeerAutonomous DAO brick
**Severity**: HIGH
**Description**: When SeerAutonomous is wired, it can revert on certain DAO state, bricking DAO operations.
**Fix**: Wrap autonomous-Seer hooks in try/catch; treat seer reverts as advisory only.

---

## Round 13 — DAO + DAOTimelock + Finance Slice (FeeDistributor, FlashLoan)

### #206. `DAOTimelock.admin` rotation to DAO requires manual orchestration outside any script
**Severity**: CRITICAL
**Location**: Deploy scripts and `DAOTimelock.sol`
**Description**: After deploy, DAOTimelock.admin is the deployer. To rotate to DAO requires a multi-step manual process that no script automates. If skipped, deployer permanently controls timelock.
**Fix**: Add `transfer-governance.ts` step that rotates DAOTimelock admin, OR fail deploy validation if admin still equals deployer at handover.

### #207. After admin rotation to DAO, `timelock.execute()` becomes unreachable — DAO has no function that calls it
**Severity**: CRITICAL
**Description**: DAO contract doesn't expose a path to call timelock.execute(). Once admin is rotated to DAO, queued transactions can never execute.
**Fix**: Add `DAO.executeTimelocked(txId)` that DAO can vote to call. Bootstrap chicken-and-egg: ship with both before rotation.

### #208. If deployer's key is lost or compromised before manual admin rotation, the system is bricked
**Severity**: CRITICAL
**Description**: Window between deploy and rotation is single-key-controlled. Any incident in that window = irrecoverable.
**Fix**: Minimize window; do rotation in same deploy session; add key-loss recovery via secondary executor with delay.

### #209. The deployment scripts don't queue `setSecondaryExecutor` at all
**Severity**: HIGH
**Description**: SecondaryExecutor is a recovery mechanism but deploy scripts don't set it. Recovery path exists in code but is unconfigured.
**Fix**: Add deploy-script step to set SecondaryExecutor (e.g., a separate cold-storage multisig).

### #210. `requeueExpired` doesn't preserve `daoProposalForTx` mapping → DAO proposals stuck
**Severity**: HIGH
**Description**: When a timelock expires and is requeued, the original DAO proposal mapping is lost. DAO can't track the requeued tx.
**Fix**: Preserve mapping across requeue; emit re-mapping event.

### #211-#213. cleanupExpired/cancel don't notify DAO; can't be called by DAO post-rotation
**Severity**: HIGH
**Description**: Cleanup/cancel operations are admin-only. Post-rotation, only DAO is admin. But DAO can't directly call (#207). Cleanup operations become impossible.
**Fix**: Add DAO-callable wrappers; enable secondaryExecutor for cleanup.

### #214. `_validateERC20BoolReturn` only checks 3 selectors — other ERC20 patterns aren't validated
**Severity**: MEDIUM
**Description**: Hardcoded selector list misses non-standard ERC20 implementations.
**Fix**: Generalize validation; or remove and use SafeERC20 pattern.

### #215. `cleanupExpired` and `requeueExpired` don't check `daoProposalForTx[id] == 0` before purge
**Severity**: HIGH
**Description**: Cleanup can erase DAO-tracked proposals without warning DAO.
**Fix**: Refuse cleanup if DAO proposal exists; require DAO to cancel first.

### #216. `setLedger` and `setPanicGuard` accept zero address
**Severity**: MEDIUM
**Description**: Setting these to zero disables logging/panic-guard silently.
**Fix**: Reject zero address; require explicit "unset" function if needed.

### #217. `setDelay` resets `emergencyDelayReduced = false` but does not validate against the absolute floor
**Severity**: MEDIUM
**Description**: Reset can re-enable emergency-reduced delay but doesn't enforce that the new delay >= MIN_DELAY.
**Fix**: Re-validate floor on setDelay.

### #218. The `nonce` is incremented per-queue but not per-cancel, so cancelled txs leak nonce values
**Severity**: LOW
**Description**: Cancelled tx nonces are wasted; observability concern only.
**Fix**: Either decrement on cancel, or document.

### #219. `getQueuedTransactions` iterates the full array — gas concern for long-lived deployments
**Severity**: LOW
**Description**: Long-running deployment accumulates queued tx history; view function gas grows.
**Fix**: Add paginated variant.

### #220. `panicGuard.globalRisk()` is wrapped in untrusted external call without try-catch in `execute`
**Severity**: HIGH
**Description**: If panicGuard reverts, every execute reverts. PanicGuard becomes a kill-switch for all timelock execution.
**Fix**: Wrap in try/catch; treat panic-guard reverts as "not in panic" (default safe).

### #221. EXPIRY_WINDOW = 7 days; SECONDARY_EXECUTOR_DELAY = 3 days; effective execute window = 4 days
**Severity**: INFO
**Description**: Window calculation: 7 days expiry - 3 days secondary delay = 4-day usable window for primary executor.
**Fix**: Document; or expand expiry to 14 days for safety margin.

### #222. `setAdmin`, `setSecondaryExecutor`, etc. don't have an event log lookup for the queued txId
**Severity**: LOW
**Description**: Off-chain consumers can't easily correlate queued txs with their semantic meaning.
**Fix**: Emit dedicated events with txId for each admin operation.

### #223. `secondaryExecutor` change requires onlyTimelockSelf, so cannot be rotated quickly in emergency
**Severity**: MEDIUM
**Description**: Catch-22: changing secondary executor requires queueing through timelock. If primary admin is lost, can't quickly add a new secondary.
**Fix**: Allow guardian-multisig fast-path for secondary executor changes.

### #224. `transfer-governance.ts` runs `feeDist.setDestination` (step 7) but doesn't check that FeeDistributor's admin is the deployer
**Severity**: HIGH
**Description**: If admin was already rotated, step 7 reverts. Script doesn't validate prerequisites.
**Fix**: Add `require(feeDist.admin() == deployer.address)` check before each rotation step.

### #225. `canRotateSecondaryExecutor` view function for ops runbook
**Severity**: INFO
**Description**: Ops needs a view to check if rotation is currently allowed.
**Fix**: Add view function.

### #226. `MAX_DELAY = 30 days`, `MIN_DELAY = 12 hours` — wide range
**Severity**: INFO
**Description**: Range is broad; admin can set delays anywhere in this range.
**Fix**: Document expected operating ranges; consider tighter bounds.

### #227. `EMERGENCY_REDUCTION_RESET = 30 days` — admin can use the emergency reduction once per 30 days
**Severity**: INFO
**Description**: Per-30-day rate limit on emergency delay reductions.

### #228. The system has three independent "delay" mechanisms
**Severity**: MEDIUM
**Description**: DAOTimelock delay, OCP delay, EmergencyControl cooldown — three different timing systems with overlapping responsibilities.
**Fix**: Consolidate or document interaction matrix.

### #229. queuedIds capped at 500 — same as MAX_PROPOSALS in DAO
**Severity**: LOW
**Description**: Cap matches DAO; means timelock can be saturated by DAO proposals.

---

## Round 14 — Finance Slice Continued (Oracle, Vaults, Handover, Loans)

### #230. `VFIDEPriceOracle._getUniswapPrice` reads `slot0()` — spot price, not TWAP
**Severity**: CRITICAL
**Location**: `VFIDEPriceOracle.sol`
**Description**: slot0() returns instantaneous price, manipulable via flash loans. Any contract using getPrice() for sensitive operations (loan collateral, fee calculations) is flash-loan-attackable.
**Fix**: Use Uniswap V3's `observe()` to compute TWAP over a meaningful window (e.g., 30 minutes). See Uniswap docs for OracleLibrary.consult().

### #231. Circuit breaker only updates `lastPrice` via `updatePrice()`; reads via `getPrice()` are unprotected
**Severity**: HIGH
**Description**: Price drop detection only fires when oracle pushes updates; reads through getPrice() see live (potentially manipulated) data.
**Fix**: All consumer reads should use the validated/circuit-breaker-protected price, not raw getPrice().

### #232. `deploy-full.ts` sets `_burn = deployer.address` but burn destination is immutable
**Severity**: CRITICAL
**Location**: `scripts/deploy-full.ts`
**Description**: FeeDistributor's burn channel is constructor-set and immutable. If set to deployer at deploy, all burned tokens permanently route to deployer.
**Fix**: Set _burn = address(0) (true burn) at constructor. Fix deploy script.

### #233. Deploy script `_sanctum = deployer.address` — sanctum funds go to deployer until SanctumVault is deployed and `setDestination` runs
**Severity**: HIGH
**Description**: Window between FeeDistributor deploy and sanctum redirection sees funds going to deployer.
**Fix**: Deploy SanctumVault first; pass its address to FeeDistributor constructor.

### #234. `distribute()` re-distributes failed-channel funds via the next round's full split, including burn
**Severity**: MEDIUM
**Description**: If a channel transfer fails, the funds re-enter the next distribution round at full split — including being burnt. Could over-burn relative to design.
**Fix**: Track failed-channel funds separately; require explicit recovery action.

### #235. `distribute()` reads `balanceOf(address(this))` — anyone can direct-transfer to influence distribution
**Severity**: MEDIUM
**Description**: External donations to FeeDistributor get distributed using the standard split, which may not match donor intent.
**Fix**: Track receivedFromAuthorized accounting separately; only distribute that.

### #236. `receiveFee` rejects unauthorized callers but `setAuthorizedFeeSource` is admin-only with no timelock
**Severity**: HIGH
**Description**: Admin can instantly authorize/deauthorize fee sources. Captured admin can redirect protocol fees.
**Fix**: 48h timelock on setAuthorizedFeeSource.

### #237. `VFIDEFlashLoan.confirmSystemExempt` requires DAO call but DAO is initially set to deployer
**Severity**: HIGH
**Description**: confirmSystemExempt blocks deposits until called. Deployer is the DAO at deploy. If deployer doesn't call, flash loans never activate.
**Fix**: Add deploy-script call to confirmSystemExempt; or auto-confirm on first deposit if exemption is verified.

### #238. `findBestLender` iterates only first 200 lenders out of 500 cap — late lenders are invisible
**Severity**: MEDIUM
**Description**: Lenders 201-500 in the registry are never selected by findBestLender, even if they offer better rates.
**Fix**: Either reduce cap to 200, or implement pagination/random sampling.

### #239. `MIN_INITIAL_LENDER_DEPOSIT = 1 ether` (1 VFIDE) is far below sybil-resistance threshold
**Severity**: MEDIUM
**Description**: 1 VFIDE is trivially cheap; sybils can register hundreds of lender accounts.
**Fix**: Raise minimum to e.g. 10K VFIDE or higher. Match flash-loan economic significance.

### #240. `sweepOrphanBalance` is `onlyDAO` with no timelock — fast extraction path
**Severity**: HIGH
**Description**: DAO can instantly sweep orphan balances to any recipient. Captured DAO drains.
**Fix**: 48h timelock on sweep operations.

### #241. Guarantor liability uses `allowance(approvalSource, this)` as cap
**Severity**: MEDIUM
**Description**: If guarantor revokes allowance after approval, committed liability becomes unrealizable.
**Fix**: Pull guarantor's allowance to escrow at commitment time, or document the off-chain coordination requirement.

### #242. `extractFromGuarantors` order and stalled-guarantor detection
**Severity**: MEDIUM
**Description**: Order of guarantor extraction is fixed; stalled guarantors block extraction from later ones.
**Fix**: Skip stalled guarantors with timeout; document fairness implications.

### #243. `_releaseGuarantorCommitment` can underflow if amount > committedLiabilityBySource
**Severity**: HIGH
**Description**: Underflow protection in Solidity 0.8 reverts the call; could brick guarantor releases.
**Fix**: Cap release amount to committed amount; use min().

### #244. `payInstallment` allows borrower to pay in any order, but penalties recompute on default
**Severity**: LOW
**Description**: Pay-order flexibility is good UX, but penalty computation on default can be unexpected.
**Fix**: Document clearly in user docs.

### #245. Score-based loan tiers are read at acceptance time only
**Severity**: MEDIUM
**Description**: Loan tier (and limit) are set at acceptance; score changes during loan don't affect terms.
**Fix**: Document; or implement score-recheck at certain milestones.

### #246. `EcoTreasuryVault.acceptDAO` is callable by `pendingDAO` with no expiration
**Severity**: MEDIUM
**Description**: Stale pending DAO can accept arbitrarily later, potentially after the original handover context has changed.
**Fix**: Add 30-day expiration on pendingDAO acceptances.

### #247. `EcoTreasuryVault.noteVFIDE` invariant catches inflation but blocks legitimate notifications too
**Severity**: MEDIUM
**Description**: Strict invariant rejects notifications that could be legitimate (e.g., dust transfers).
**Fix**: Allow tolerance for sub-wei rounding; reject only on substantial mismatch.

### #248. `SanctumVault` uses Ownable inheritance but no `onlyOwner` functions exist
**Severity**: LOW
**Description**: Inheriting Ownable without using it is dead code.
**Fix**: Remove inheritance.

### #249. `SanctumVault.deposit` accepts ANY token, including non-charity-relevant
**Severity**: LOW
**Description**: Donations of arbitrary tokens accumulate in vault without distribution path.
**Fix**: Whitelist accepted tokens, OR add a sweep function for non-VFIDE tokens.

### #250. `SanctumVault.rejectDisbursement` doesn't refund pre-paid gas to proposer
**Severity**: LOW
**Description**: Proposer pays gas to propose; if rejected, gas is lost.
**Fix**: Document; gas refunds in DAOs are notoriously hard.

### #251. `SanctumVault.executeDisbursement` checks balance at execute time, not at propose time
**Severity**: MEDIUM
**Description**: Proposed amount may exceed balance by execute time. Reverts on execute, wastes proposal cycle.
**Fix**: Re-check balance at propose AND warn if marginal.

### #252. `EcosystemVault` Ownable + manager + DAO triple-role — ownership not rotated in scripts
**Severity**: CRITICAL
**Location**: `scripts/transfer-governance.ts`
**Description**: EcosystemVault has three role layers (Ownable, manager, DAO). The Ownable owner is set to deployer in deploy script and never rotated. Combined with #345 (ecosystemMinBps inflation routes funds here), this means deployer can drain ecosystem fees.
**Fix**: Add transferOwnership(adminMultisig) for EcosystemVault to transfer-governance.ts.

### #253-#256. SystemHandover bugs
- **#253**: executeHandover validates admin pointers but not operational health
- **#254**: canExecuteHandover view doesn't check the same expanded conditions as execute
- **#255**: disarm requires >= 30 days from handoverAt (last-month restriction)
- **#256**: extendOnceIfNeeded reads council scores via `seer.getScore`, which is hot-path
**Severity**: MEDIUM-HIGH
**Fix**: Standardize validation between execute and canExecute; document timing windows.

### #257. `VFIDEFlashLoan.deposit` doesn't check for fee-on-transfer tokens
**Severity**: LOW
**Description**: VFIDE doesn't have fee-on-transfer for systemExempt addresses, but defensive check is good.
**Fix**: Verify received amount matches expected; revert if mismatch.

### #258-#260. VFIDETermLoan issues
- **#258**: doesn't enforce unresolvedDefaults cap on lender side
- **#259**: tier1Limit can be set above tier2Limit (tier inversion)
- **#260**: claimDefault for plan-failure path doesn't release guarantor commitments
**Severity**: MEDIUM-HIGH
**Fix**: Add invariant check on tier limits; release guarantors on all default paths.

### #261. `EcosystemVault.distributeCouncilRewards` is `onlyManager`, not gated by ProofScore minimum
**Severity**: MEDIUM
**Description**: Manager can distribute rewards to council members without verifying their ProofScore eligibility.
**Fix**: Require minimum ProofScore in distribution.

### #262. `VFIDEFlashLoan` `setSeer` and `setFeeDistributor` have no timelock
**Severity**: HIGH
**Description**: DAO can swap seer or fee destination instantly.
**Fix**: 48h timelock.

### #263. `VFIDEFlashLoan` is described as Howey-safe but allows lender pooling via "find best lender" optimization
**Severity**: INFO/LEGAL
**Description**: Find-best-lender effectively pools lender liquidity; potential securities-law concern.
**Fix**: Legal review; consider removing find-best-lender if Howey concerns are real.

### #264. `SanctumVault` reward for charity donation is +1.0 ProofScore, daily-rate-limited
**Severity**: INFO
**Description**: Charity gives ProofScore boost; rate-limited to prevent spam.

### #265. `EcosystemVault.MAX_COUNCIL_MEMBERS = 12`
**Severity**: INFO
**Description**: Council size cap; reasonable.

### #266. Seer rewards and punishments are wrapped in `try/catch {}` — failures silent
**Severity**: MEDIUM
**Description**: Score adjustments fail silently. Off-chain monitoring can't detect.
**Fix**: Emit ScoreOpFailed event with reason in catch block.

### #267. `VFIDEFinance.setNotifier` allows only ONE pending change at a time
**Severity**: LOW
**Description**: Bottleneck for multiple pending updates.

### #268. `VFIDEPriceOracle` deviation calculation uses `oldPrice` as denominator, not `min(old, new)`
**Severity**: MEDIUM
**Description**: Asymmetric deviation calculation; price drops vs. rises register differently.
**Fix**: Use min(old, new) as denominator for consistent deviation %.

### #269. `VFIDEPriceOracle` chainlink decimals mismatch handling reads decimals via direct call (not try-catch)
**Severity**: MEDIUM
**Description**: If chainlink decimals() reverts, oracle update reverts. Single point of failure.
**Fix**: try/catch; fallback to a sensible default with warning event.


---

## Round 15 — Vault Slice (VaultHub, CardBoundVault, VaultRecoveryClaim, VaultRegistry, VaultInfrastructure)

### #270. VaultHub.pause() — instant, deployer-owned
**Severity**: CRITICAL
**Location**: `VaultHub.sol`
**Description**: VaultHub.pause() is callable by Owner with no timelock. After deploy, Owner = deployer (not rotated). Single key can pause new vault creation and (per token check) halt vault-only transfer paths.
**Fix**: Either remove Pausable entirely (per user's "no freeze" principle) OR transfer ownership to AdminMultiSig with 48h timelock on pause.

### #271. VaultRecoveryClaim verifier-only path — 5 verifiers can claim guardianless vaults up to 50K VFIDE
**Severity**: CRITICAL
**Location**: `VaultRecoveryClaim.sol`
**Description**: Five deployer-controlled verifiers can collectively claim a vault that has no guardians (50K VFIDE cap). The 50K cap doesn't make it safe — it just bounds the loss.
**Fix**: Remove the verifier-only path. Users without guardians accept that key loss = permanent fund loss.

### #272-#277. Various VaultHub recovery flow issues
- **#272**: executeRecoveryRotation by 2 hub approvers; no vault-side guardian approval required
- **#273**: setRecoveryApprover instant (no timelock)
- **#274**: 2-of-N approvers can rotate any vault's owner after 72h
- **#275**: ensureVault gas spike + reentrancy surface
- **#276**: vaultOf returns first match; multiple vault scenarios undefined
- **#277**: Vault rotation events don't include before/after balance
**Severity**: CRITICAL-HIGH
**Fix**: Require vault-side guardian approval for rotation; add 48h timelock on setRecoveryApprover; document multi-vault behavior.

### #278. CardBoundVault gas:10_000 hardcode
**Severity**: HIGH
**Description**: Hardcoded gas stipend for external call may be too low for some recipients (e.g., contract wallets with longer fallback logic).
**Fix**: Use sensible default but allow per-call override; or use type(uint256).max for trusted destinations.

### #279. CardBoundVault.applyRescueNative bricks on L2
**Severity**: HIGH
**Description**: Native rescue logic uses gas patterns that don't work consistently on L2s (Polygon, zkSync).
**Fix**: Use try/catch with explicit gas budget; test on each target chain.

### #280. CardBoundVault.pause() by ANY guardian — single guardian can permanently pause
**Severity**: CRITICAL
**Location**: `CardBoundVault.sol`
**Description**: Any single guardian can pause the vault. Removing them takes 24h+ during which the vault is frozen. A malicious or compromised guardian can hold a user's vault hostage.
**Fix**: Require guardian threshold to pause. Add auto-unpause after 7 days unless re-paused by threshold.

### #281-#285. CardBoundVault other issues
- **#281**: Pending withdrawal queue grows unbounded per user
- **#282**: Spend limit window calculation can wrap around at uint64 boundaries
- **#283**: Nonce-based replay protection has small window
- **#284**: Guardian removal proposes single member but doesn't reset votes
- **#285**: UserVaultLegacy single-guardian recovery — single mature guardian can initiate + auto-approve
**Severity**: MEDIUM-CRITICAL
**Fix**: Bound queue with paginated view; document spend-limit boundaries; reset vote state on membership changes; deprecate UserVaultLegacy.

### #286-#295. VaultRegistry/VaultInfrastructure issues
A cluster of medium-severity findings around vault lifecycle, registration, and infrastructure helpers.
- **#286**: registerVault doesn't validate vault implements expected interface
- **#287**: getVaultCount doesn't paginate
- **#288**: VaultInfrastructure.deployVault gas estimate hardcoded
- **#289**: Vault factory caches implementation address that can become stale
- **#290**: ensureVault path can deploy a vault for an address that already has one (race)
- **#291**: VaultRegistry events don't include block.timestamp explicitly
- **#292**: vaultMetadata uri can be set to javascript: or other malicious schemes
- **#293**: registry.setVaultHub no timelock
- **#294**: registry.transferOwnership doesn't event-log
- **#295**: VaultInfrastructure has stale comments referencing removed contracts
**Fix**: Various — validate interfaces; add pagination; wrap gas operations; add URI validation.

### #296-#305. EcosystemVault distribution / executor / accounting issues
- **#296**: distributeWorkPayout reads council size each call (gas)
- **#297**: workPayoutHistory unbounded
- **#298**: setManager instant (no timelock)
- **#299**: AutoSwap configuration gas-heavy
- **#300**: ProductionPolicy default values hardcoded
- **#301**: SustainabilityFee not connected to actual sustainability metrics
- **#302**: Executor whitelist add/remove instant (no timelock)
- **#303**: Distribution math rounds to manager favorably
- **#304**: Pause cascade — vault pause cascades to dependent contracts
- **#305**: ManagerFee accumulator can be drained via repeated tiny distributions
**Severity**: MEDIUM-HIGH
**Fix**: Add timelocks on configuration changes; bound history; document rounding behavior.

---

## Round 16 — VFIDEToken Core Audit

### #306. VFIDEToken deploy script treasury parameter mismatch — DEPLOY BLOCKER
**Severity**: CRITICAL
**Location**: `scripts/deploy-phase1.ts:181-187` and `VFIDEToken.sol` constructor
**Description**: The deploy script passes `config.treasury` (a contract address) as the treasury parameter, but the constructor expects an EOA. The constructor reverts on EOA-only validation. Token cannot be deployed.
**Verified by**: Reading constructor code; the `_treasury` parameter check uses `code.length == 0` requirement.
**Fix**: Either:
1. Change deploy script to pass an EOA for treasury (recommended).
2. Remove the EOA check from constructor (if treasury can be a contract).

This is a pure deploy blocker. Must be fixed before any mainnet deploy.

### #307. VFIDEToken permit() struct hash missing deadline — EIP-2612 BROKEN
**Severity**: CRITICAL
**Location**: `VFIDEToken.sol` permit function
**Description**: The PERMIT_TYPEHASH includes `deadline` as a typed field, but the `keccak256(abi.encode(...))` struct hash being signed omits the deadline value. Verified via direct keccak256 calculation. Standard EIP-2612 permit signatures (from MetaMask, ethers.js, etc.) will all fail verification.
**Fix**: Add `deadline` to the struct hash:
```solidity
bytes32 structHash = keccak256(abi.encode(
    PERMIT_TYPEHASH,
    owner,
    spender,
    value,
    nonces[owner]++,
    deadline  // <-- ADD THIS
));
```
One-line fix. Test with a real wallet permit signature to verify.

### #308. setSeerAutonomous no timelock
**Severity**: CRITICAL
**Description**: VFIDEToken.setSeerAutonomous accepts a contract address that gets called on every transfer (via beforeAction hook). A malicious replacement can revert on every transfer = full token halt.
**Fix**: Add 48h timelock on setSeerAutonomous. Match other emergency-control activation timelocks.

### #309. Treasury 75% supply concentration
**Severity**: CRITICAL
**Description**: 75% of total token supply is minted to treasury at deploy. Treasury is the deployer until rotated. Single key holds 75% of supply during rotation window.
**Fix**: Mint to AdminMultiSig directly; ensure AdminMultiSig is wired (per #391). Consider vesting schedule for treasury distribution.

### #310. Whitelisted addresses bypass vault-only check
**Severity**: HIGH
**Description**: systemExempt addresses bypass the "vault-required" check. If an attacker becomes systemExempt, they can interact with the token without using a vault.
**Fix**: This is intentional for protocol contracts (FeeDistributor, etc.) but should be hardcoded list, not runtime-mutable.

### #311. emergencyBreaker single pause point — token has emergencyBreaker.halted() check
**Severity**: CRITICAL
**Location**: `VFIDEToken._transfer` lines 938-940
**Description**: Token checks `emergencyBreaker.halted()` on every transfer (when emergencyBreaker is set). External contract can halt all non-exempt transfers.
**Fix**: Per Round 19 consolidation guidance: pick ONE halt mechanism, remove this check OR make it require multi-sig co-signature.

### #312. _resolveFeeScoringAddress only resolves `from` not `logicalTo`
**Severity**: HIGH
**Description**: For ProofScore lookups, the resolver normalizes the `from` address (vault → owner) but not `to`. Asymmetric scoring.
**Fix**: Apply the same resolution logic to `logicalTo`.

### #313. _enforceSeerAction reverts on catch
**Severity**: HIGH
**Location**: VFIDEToken transfer path
**Description**: If seer.beforeAction reverts, the token's transfer reverts entirely. Not just an advisory check.
**Fix**: Wrap in try/catch; treat reverts as advisory (proceed with transfer, emit warning event).

### #314. ensureVault gas spike + reentrancy surface
**Severity**: HIGH
**Description**: ensureVault may deploy a new vault during a transfer; gas spike + external call introduces reentrancy considerations.
**Fix**: Refuse to deploy vault inside transfer; require pre-deployment.

### #315. systemExempt bypasses ALL checks
**Severity**: HIGH
**Description**: systemExempt addresses bypass fees, vault-only, anti-whale, fraud, and halt checks. Single asymmetric override.
**Fix**: Hardcode the systemExempt list in the contract; remove runtime add/remove. The list should be: known-at-deploy protocol contracts only.

### #316-#324. Other VFIDEToken hardening items
- **#316**: feeBypass logic complex; multiple entry points
- **#317**: applyTreasurySink/applySanctumSink chained timelocks (48h each, but no cancellation events)
- **#318**: token-level pause flag deprecated but constants remain
- **#319**: balanceOf doesn't account for pending escrowed amounts
- **#320**: totalSupply doesn't track burnedAmount separately
- **#321**: nonces mapping never cleaned up
- **#322**: Custom errors used inconsistently (some require, some revert with error)
- **#323**: Event indexing inconsistent
- **#324**: Some legacy struct fields unused
**Severity**: MEDIUM-LOW
**Fix**: Code hygiene; document; or remove unused.

---

## Round 17 — OwnerControlPanel (OCP)

20 findings detailed below. The headline issue is that OCP doesn't expose wrappers for many onlyOwner functions on the contracts it's supposed to control, AND the deploy scripts don't actually transfer ownership to OCP in the right order.

### #325. OCP missing apply* wrappers for 8 token functions
**Severity**: CRITICAL
**Location**: `OwnerControlPanel.sol`
**Description**: VFIDEToken has 8 apply* functions that are onlyOwner: applyTreasurySink, applySanctumSink, applyEcosystemDistributor, applyEmergencyBreaker, applyFraudRegistry, applyAntiWhale, applyWhaleLimitExempt, applyVaultOnlyDisable. After ownership rotation, only OCP can call these. OCP doesn't expose them. Pending changes become permanently un-applicable.
**Fix**: Add 8 wrapper functions to OCP, each calling the corresponding apply on the token.

### #326. OCP missing setEmergencyBreaker, setFraudRegistry, setEcosystemDistributor, setSeerAutonomous wrappers
**Severity**: CRITICAL
**Description**: After rotation these token modules can never be set. Token's emergencyBreaker, fraudRegistry, ecosystemDistributor, seerAutonomous are address(0) and stay that way. Advertised features (FraudRegistry escrow, FeeDistributor 5-way split, Seer enforcement) permanently inactive.
**Fix**: Add wrappers in OCP that propose and apply these modules through the OCP queue.

### #327. transfer-governance.ts step 6 transfers token ownership BEFORE pending applies complete
**Severity**: CRITICAL
**Location**: `scripts/transfer-governance.ts:267`
**Description**: Script proposes treasurySink and sanctumSink (each 48h timelock), then immediately at step 6 transfers ownership to OCP. The 48h applies cannot complete because deployer no longer has owner role (apply functions are onlyOwner). OCP doesn't expose the apply wrappers (#325). Permanent dead-end.
**Fix**:
1. Add OCP wrappers (#325).
2. Update script: do all 48h proposes first, wait 48h, apply via OCP wrappers, THEN transfer ownership.
3. Or: skip the proposes entirely if defaults are acceptable.

### #328. OCP wraps onlyOwner functions on contracts whose ownership was never transferred to OCP
**Severity**: CRITICAL
**Description**: VaultHub.owner = deployer (#270). EcosystemVault.owner = deployer (#252). ProofScoreBurnRouter.owner = deployer. Seer.dao = real DAO contract. OCP wrappers call these but the calls revert (msg.sender != owner). OCP is effectively a Token-Only Control Panel.
**Fix**: Update transfer-governance.ts to also transfer ownership of VaultHub, EcosystemVault, BurnRouter to OCP (or AdminMultiSig per #391).

### #329-#332. OCP queue inconsistencies
- **#329**: token_proposeSystemExempt and token_proposeWhitelist DON'T use OCP queue
- **#330**: emergency_pauseAll requires 24h OCP queue + 48h token timelock = 72h+
- **#331**: token_applyModules calls 3 applies in sequence; reverts if any pending missing
- **#332**: emergency_recoverETH/Tokens lets owner sweep any ETH/tokens sent to OCP
**Severity**: HIGH
**Fix**: Add queue to systemExempt; document timing; make applyModules idempotent; restrict recover.

### #333-#344. Other OCP findings
- **#333**: governance_queueAction allows arbitrary actionIds
- **#334**: governance_setDelay halving + 30-day cooldown
- **#335**: acceptOwnership no time bound
- **#336**: vault_freezeVault deprecated stubs revert
- **#337**: getTokenStatus.treasuryBalance returns OCP-owner balance not actual treasury
- **#338**: ecosystem_setManager + others non-functional but consume OCP queue on failure
- **#339**: emergency_resumeAll asymmetric (24h vs pause's 72h)
- **#340**: setPanicGuard timelocked but reportRisk consumes queue
- **#341**: setContracts permissive
- **#342**: min payout default 0
- **#343**: SecurityHub references in comments
- **#344**: missing cancel wrappers parallel to missing apply wrappers
**Severity**: MEDIUM-LOW
**Fix**: Various — see individual descriptions in Round 17 detailed audit.

---

## Round 18 — ProofScoreBurnRouter

### #345. ecosystemMinBps shortfall fill INCREASES total fee beyond maxTotalBps
**Severity**: CRITICAL
**Location**: `ProofScoreBurnRouter.sol:600-617`
**Description**: When `ecosystemMinBps` is set, the shortfall logic that ensures ecosystem gets minimum can push total fees ABOVE the documented curve. Worked example: with ecoMinBps=100 and high-trust user (expected 25 bps), actual fee becomes 100 bps (4×). All extra goes to ecosystemSink (deployer-controlled). The comment claims "Preserve total fee" but the implementation doesn't.
**Fix**:
```solidity
uint256 totalAvailable = burnAmount + sanctumAmount + ecosystemAmount;
if (minEcosystemAmount > totalAvailable) {
    minEcosystemAmount = totalAvailable;  // CAP at original total
}
// then proceed with shortfall fill as before
```
~5 lines. Critical user-facing bug.

### #346. burnRouter.pause() instant, no timelock — kill-switch on token post-policyLock
**Severity**: CRITICAL
**Description**: After policyLocked=true on token, every non-systemExempt transfer reverts when computeFeesAndReserve fails. Owner (deployer per #328) can call pause() to instantly halt the entire token. 72h to recover via fee bypass governance.
**Fix**: Either:
1. Add 48h timelock on pause().
2. Remove Pausable entirely from BurnRouter (per user's "no freeze" principle).
3. Transfer ownership to AdminMultiSig per #391.

### #347. setToken has no timelock and no validation
**Severity**: CRITICAL
**Description**: setToken instantly changes the address that BurnRouter accepts calls from. Setting to wrong address = computeFeesAndReserve rejects real token's calls = transfers halt (try/catch in token still reverts when policyLocked).
**Fix**: Make `token` immutable, set in constructor only.

### #348. setSustainability no timelock or cooldown
**Severity**: HIGH
**Description**: Owner can change dailyBurnCap, minimumSupplyFloor, ecosystemMinBps instantly. Enables #345 attack instantly.
**Fix**: Add same `FEE_POLICY_COOLDOWN` (1 day) check that setFeePolicy uses.

### #349. setMicroTxFeeCeiling and setMicroTxUsdCap no timelock
**Severity**: HIGH
**Description**: Micro-tx parameters can be changed instantly.
**Fix**: 24h timelock.

### #350. Adaptive fees only apply to interpolated score range, creating cliffs at boundaries
**Severity**: HIGH
**Description**: Volume multiplier only affects scores 4001-7999. At boundaries 4000 and 8000, no multiplier. Creates fee cliffs where a 1-point score change drops fee 20%.
**Fix**: Apply volume multiplier consistently across all score values. ~15 lines.

### #351. cachedTimeWeightedScore stale up to 1 hour; H-3 only protects against drops not increases
**Severity**: HIGH
**Description**: Score increases (e.g., earned a badge) aren't honored until next updateScore. User pays higher-than-deserved fees for up to 1 hour.
**Fix**: Allow user-initiated updateScore (not just Seer):
```solidity
require(msg.sender == address(seer) || msg.sender == user, "only seer or self");
```

### #352. scoreHistory only populated when Seer calls updateScore
**Severity**: MEDIUM
**Description**: New users with no Seer-write history fall back to single snapshot, not time-weighted average.
**Fix**: Either eager-write on first transfer, or document the "opt-in time-weighted" behavior.

### #353. recordBurn function unused (token never calls)
**Severity**: MEDIUM
**Description**: Dead code surface. If a future change calls it after computeFeesAndReserve, dailyBurnedAmount double-counts.
**Fix**: Remove function or document as fallback.

### #354. previewCheckout 8-iteration cap may not converge
**Severity**: MEDIUM
**Description**: Edge cases in fee calculation may not converge in 8 iterations; returns underestimated gross.
**Fix**: Revert if not converged, OR return a third value indicating convergence.

### #355-#362. Various other findings
- **#355**: getEffectiveBurnRate ignores ecosystemMinBps inflation (per #345)
- **#356**: burnSink can be soft-burn vault (deployer-controlled by default)
- **#357**: baseBurnBps/sanctumBps/ecosystemBps stored but unused
- **#358**: lastFeePolicyChange shared between setFeePolicy and setAdaptiveFees
- **#359**: setToken has no validation it's actual VFIDE
- **#360**: SeerScoreZeroWarning only fires inside computeFeesAndReserve
- **#361**: dailyBurnedAmount only resets via _resetDayIfNeeded (called by certain functions)
- **#362**: 7-day MODULE_CHANGE_DELAY for proposeModules is good but inconsistent with other 48h delays
**Severity**: MEDIUM-LOW
**Fix**: Various — see Round 18 detailed audit.

---

## Round 19 — EmergencyControl + CircuitBreaker + FraudRegistry

### #363. EmergencyBreaker.toggle is single-key DAO control with 0 cooldown on activation
**Severity**: CRITICAL
**Location**: `VFIDESecurity.sol:504-516`
**Description**: Cooldown applies only to deactivation; activation is instant. One DAO key compromise = instant `halted=true` = entire token halted (when wired). Recovery requires 1h cooldown for deactivation.
**Fix**: Require committee co-signature for activation, not just deactivation. Or: rotate DAO to AdminMultiSig per #391.

### #364. EmergencyControl.daoToggle has only 5-minute anti-flap cooldown for system-wide halt
**Severity**: CRITICAL
**Description**: 5-minute anti-flap is too short for protocol-wide halt. Captured DAO key can flip halt every 5 minutes.
**Fix**: Increase cooldown to hours; require committee co-sign for activation.

### #365. EC committeeVote threshold can be set arbitrarily low by DAO
**Severity**: CRITICAL
**Description**: setThreshold is onlyDAO with no timelock. DAO compromise: add attacker member (1h queue), set threshold = 1, attacker votes alone, halts protocol.
**Fix**: 24h timelock on setThreshold; enforce floor `_threshold >= max(2, memberCount / 3)`.

### #366. CircuitBreaker.manualTrigger by single key with EMERGENCY_PAUSER_ROLE
**Severity**: CRITICAL
**Description**: Single role-holder can pause the entire system via _trigger -> emergencyController.emergencyPause().
**Fix**: Require multi-sig of EMERGENCY_PAUSER_ROLE holders; or remove on-chain enforcement (CircuitBreaker as signal-only).

### #367. checkAndTrigger is permissionless and triggers on threshold violations
**Severity**: CRITICAL
**Description**: Anyone can call checkAndTrigger; if thresholds are breached, the breaker fires. With low TVL or compromised SUSPICIOUS_ACTIVITY_REPORTER_ROLE, easily exploited.
**Fix**:
- Require minimum TVL before volume threshold checks engage
- Cap suspicious activity counter incrementing rate (max 1/hour per reporter)
- Add 1-hour cooldown on checkAndTrigger

### #368. EC committee voting accumulates within epoch; member additions can complete stalled halt votes
**Severity**: HIGH
**Description**: Adding a member during an in-progress vote can push it over threshold without resetting.
**Fix**: Reset votes on membership changes that would meet threshold under new count.

### #369. EC committee can pass halt with stale vote timing (analyzed; logic correct)
**Severity**: ACKNOWLEDGED
**Description**: Vote timing logic verified to correctly reset on expiry.

### #370. EC.proposeRecovery requires breaker.halted() — but halt is reversible by DAO
**Severity**: HIGH
**Description**: Recovery flow requires system halted. DAO controls halt. Captured DAO can halt (#364), then attacker (also a committee member) proposes recovery for own benefit. 14-day timelock + supermajority is the defense.
**Fix**: Document the trust model. The 14-day timelock is critical; don't reduce.

### #371. FraudRegistry sybil resistance: 3 NEUTRAL-score reporters can flag any address
**Severity**: HIGH
**Location**: `FraudRegistry.sol:69, 178-213`
**Description**: MIN_REPORTER_SCORE = 5000 (NEUTRAL). New users default to NEUTRAL. 3 sybil wallets = pendingReview. Per-false-complaint penalty only 50 points = 100-round attack budget per sybil.
**Fix**: Raise MIN_REPORTER_SCORE to 6500-7000 (TIER_3); raise per-false-complaint penalty to 500.

### #372. FraudRegistry confirmFraud is single-key DAO with 48h appeal window only
**Severity**: HIGH
**Description**: 48-hour appeal window is too short for real-world response. Single DAO call after 48h activates 30-day escrow.
**Fix**:
- Extend appeal window to 7 days minimum.
- Two-step confirmFraud: initial DAO call + 24h delay + multisig confirm.

### #373. FraudRegistry permanent ban means permanent escrow
**Severity**: HIGH
**Description**: Permanently banned users have all transfers escrowed for 30 days, every transfer, forever. Functionally a slow freeze.
**Fix**: User decision per "no freeze" principle. If keeping FraudRegistry, document clearly that permanent ban = perpetual 30-day delay.

### #374. FraudRegistry rescueStuckEscrow allows DAO to redirect funds after 120 days total
**Severity**: HIGH
**Description**: 30-day release + 90-day rescue delay = 120 days. After that, DAO can rescue to any address. Effectively a DAO seizure path if they wait long enough.
**Fix**: Send rescue to original sender, not arbitrary recipient.

### #375. FraudRegistry rescueExcessTokens allows DAO to drain donations or accounting drift
**Severity**: HIGH
**Description**: DAO can claim balance > totalActiveEscrowed.
**Fix**: Document; optionally restrict recipient to sender of donated tokens (off-chain coordination).

### #376-#390. Various other findings
- **#376**: CB price oracle setter no timelock
- **#377**: CB no minimum-warmup TVL gate
- **#378**: EC removeMember resets votes
- **#379**: FR escrowTransfer routes correctly through vault recovery (good)
- **#380**: FR clearFlag doesn't auto-process refunds
- **#381**: FR no paginated getPendingEscrows
- **#382**: EC refreshRecoveryEpoch DAO-only
- **#383**: CB no auto-scaling sensitivity
- **#384**: FR.escrowedTransfers grows unboundedly
- **#385**: FR no user opt-out
- **#386**: EC committee max 21 members
- **#387**: CB DEFAULT_ADMIN_ROLE bootstrap centralization
- **#388**: EC.minCooldown hardcoded 5min (no setter despite event signature)
- **#389**: FR complaintCount cap 100 per target
- **#390**: EC stuck recovery proposal cancellation paths
**Severity**: MEDIUM-LOW
**Fix**: See Round 19 detailed audit.

---

## Round 20 — AdminMultiSig

### #391. AdminMultiSig is deployed but granted authority over nothing
**Severity**: CRITICAL — HEADLINE FINDING
**Location**: `scripts/deploy-full.ts:277` and absence in `transfer-governance.ts`
**Description**: AdminMultiSig is deployed and exported as `NEXT_PUBLIC_ADMIN_MULTISIG_ADDRESS` for the frontend, but no script transfers any contract's ownership to AdminMultiSig. Verified: `grep -rn "transferOwnership.*AdminMultiSig"` returns no matches anywhere. AdminMultiSig can only govern itself (target allowlist defaults to address(this) only). Every "deployer holds X" finding from rounds 1-19 stands as written. The multisig is **purely ornamental**.

**Impact**: Subsumes the severity of dozens of other findings. The "deployer compromise" attack model is the actual threat surface, not "3-of-5 council compromise."

**Fix**:
1. Update transfer-governance.ts and apply-full.ts to transfer ownership/DAO of every governed contract to AdminMultiSig:
```
- VFIDEToken.transferOwnership(adminMultisig)
- VaultHub.transferOwnership(adminMultisig)
- EcosystemVault.transferOwnership(adminMultisig)
- ProofScoreBurnRouter.transferOwnership(adminMultisig)
- Treasury.transferOwnership(adminMultisig)
- EmergencyControl.setModules(adminMultisig, breaker, ledger)
- EmergencyBreaker.setDAO(adminMultisig)
- DAOTimelock admin → adminMultisig
- FraudRegistry.setDAO(adminMultisig)
```
2. Bootstrap AdminMultiSig allowlists via 5/5 emergency proposals (or extend constructor to seed them) for each external contract + its onlyOwner selectors.
3. Document the wiring sequence in deploy scripts so it cannot be skipped.
4. Add a deploy-time validation check: refuse to mark deployment "complete" if any production contract's owner == deployer.

### #392. updateCouncilMember requires 5/5 EMERGENCY approvals — including from the lost-key member
**Severity**: CRITICAL
**Description**: With 5-member council and unanimous emergency requirement, one lost key permanently blocks council rotation. The lost member cannot approve their own replacement. Council is permanently stuck at 4 active + 1 dead, AND no other 5/5 emergency action is possible (including allowlist additions for new contracts).
**Fix**: Lower EMERGENCY_APPROVALS from 5 to 4 (4-of-5).

### #393. vetoProposal flips status to Vetoed on first call; no quorum required
**Severity**: HIGH
**Description**: 3 of 5 to APPROVE, 1 of 5 to VETO. Single bad-faith member blocks all governance.
**Fix**: Require veto quorum matching approval quorum:
```solidity
proposal.hasVetoed[msg.sender] = true;
proposal.vetoCount++;
uint256 requiredVetos = proposal.proposalType == ProposalType.EMERGENCY 
    ? EMERGENCY_APPROVALS : REQUIRED_APPROVALS;
if (proposal.vetoCount >= requiredVetos) {
    proposal.status = ProposalStatus.Vetoed;
}
```

### #394. Bootstrap window: community veto is permissionless when neither seer nor vfideToken is set
**Severity**: HIGH
**Location**: `AdminMultiSig.sol:391-411`
**Description**: At deploy, both seer and vfideToken can be zero. Until governance proposes setSeer/setVFIDEToken (each requires a self-targeting proposal), community veto runs without ANY eligibility check. Anyone (100 fresh wallets) can veto every approved proposal. Bootstrap proposals are themselves vetoable.
**Fix**: Constructor must require both `_seer` and `_vfideToken` non-zero. OR: add `require(address(vfideToken) != address(0), "AdminMultiSig: not configured")` at start of communityVeto.

### #395. Community veto threshold + minScore inherits NEUTRAL-default sybil weakness from FraudRegistry
**Severity**: HIGH
**Description**: vetoMinScore = 5000 (NEUTRAL) means any user with a vault passes the score gate. Real gate is 10K VFIDE stake × 100 = 1M VFIDE total cost. Determined attacker can fund this for high-stakes proposals.
**Fix**: Raise vetoMinScore to 6500-7000; or implement score-weighted vetos.

### #396. Council members are fixed at construction with no rotation path other than 5/5 emergency
**Severity**: HIGH
**Description**: No CRITICAL-tier or DAO-override path for member rotation. 5/5 EMERGENCY only.
**Fix**: Add CRITICAL-tier (3/5, 48h) path for non-emergency rotation.

### #397. setExecutionGasLimit can be set as low as 100k via proposal
**Severity**: MEDIUM
**Description**: Floor is 100k. Setting to 100k could cause some complex external calls to fail. Recovery via setExecutionGasLimit itself works (it fits in 100k).
**Fix**: Document.

### #398. Selector allowlist allows the same selectors across all proposal types
**Severity**: MEDIUM
**Description**: Constructor enables the same 8 selectors for CONFIG, CRITICAL, AND EMERGENCY. Some functions like updateCouncilMember have `onlyEmergencyProposalExecutionContext` so the dual-layer check works, but proposal can be created as CONFIG and waste council attention before failing.
**Fix**: Validate at create-time that the selector's required execution context matches the proposed type.

### #399. proposalTypeTargetAllowed and proposalTypeSelectorAllowed are separate — allows any allowed selector on any allowed target
**Severity**: MEDIUM
**Description**: If a future proposal adds a dangerous selector globally (e.g., transferOwnership), it becomes callable on every allowed target.
**Fix**: Make allowlist `(target, selector)` keyed: `proposalTypeAllowed[type][target][selector] = bool`.

### #400. Approvals can continue past required threshold (no over-approval — verified safe)
**Severity**: ACKNOWLEDGED

### #401. No upper bound on proposal data size
**Severity**: LOW
**Description**: Large _data payload increases gas but only proposer pays.

### #402. Constructor doesn't validate council members are EOAs vs contracts
**Severity**: INFO
**Description**: Allows nested multisigs as council members; flexibility, but worth documenting.

### #403. No way to query the current proposal selector allowlist (no enumeration)
**Severity**: LOW
**Description**: Off-chain consumers must track via events.

### #404. Proposals cannot be rescinded by their proposer
**Severity**: LOW
**Description**: Proposer must veto if they change their mind.

### #405. Community veto window for EMERGENCY = ~25h; for CRITICAL = ~72h; for CONFIG = ~48h
**Severity**: ACKNOWLEDGED
**Description**: Reasonable values.

### #406. No protection against executing a proposal whose target was removed from allowlist post-creation
**Severity**: MEDIUM
**Description**: Proposal A targets contract X. 5/5 emergency removes X from allowlist. Proposal A can still be executed.
**Fix**: Re-check allowlist at execute time.

### #407. Approval doesn't check proposal hasn't expired
**Severity**: LOW
**Description**: Members can approve expired proposals; only execute checks expiry.
**Fix**: Add expiry check in approveProposal.

### #408. No event emitted on proposal expiry
**Severity**: LOW
**Description**: Off-chain consumers see no signal when proposals silently expire.

### #409. setExecutionGasLimit's gating uses `executingProposalId != NO_ACTIVE_PROPOSAL` only; missing modifier
**Severity**: MEDIUM
**Description**: Doesn't have `onlyProposalExecutionContext` modifier. External re-entrancy could call setExecutionGasLimit during another proposal's execution.
**Fix**: Add the modifier:
```solidity
function setExecutionGasLimit(uint256 _gasLimit) external onlyProposalExecutionContext {
```

### #410. setVFIDEToken doesn't reject same address
**Severity**: INFO

### #411. updateCouncilMember edge cases verified safe
**Severity**: ACKNOWLEDGED

### #412. Public council array maintenance verified safe
**Severity**: ACKNOWLEDGED

### #413. Hardcoded timelock delays — no governance path to change them
**Severity**: ACKNOWLEDGED
**Description**: CONFIG_DELAY, CRITICAL_DELAY, EMERGENCY_DELAY, VETO_WINDOW, PROPOSAL_EXPIRY are constant. Intentional hardening but inflexible.

### #414. vetoThreshold = 100 is also constant; cannot be adjusted
**Severity**: MEDIUM
**Description**: As VFIDE adoption grows, 100 vetoers becomes negligible.
**Fix**: Make vetoThreshold settable via governance proposal (with timelock).


---

# Cross-cutting Halt/Freeze Inventory (per user's "no freeze" principle)

The user has stated a principle that no entity should be able to freeze or stop user money. The following tier-grouped list catalogs every halt/freeze/seizure mechanism currently in the codebase, organized by what removal would cost.

## Tier 1 — Remove with no functional trade-off

These can be removed with mechanical code changes; nothing legitimate breaks:

- **Delete `Pausable` from ProofScoreBurnRouter** (#346) — fee calculator does not need a pause mechanism
- **Make `ProofScoreBurnRouter.token` immutable** (#347) — set in constructor, never changeable
- **Delete `VFIDEToken.circuitBreaker` flag** (#311) — separate from external CircuitBreaker contract, redundant
- **Delete `emergencyBreaker` check in `VFIDEToken._transfer` lines 938-940** (#311) — token doesn't need external halt path
- **Wrap `FeeDistributor.receiveFee` call in try/catch** (#311 cross-ref) — fee credit shouldn't block transfer settlement
- **Cap `ecosystemMinBps` inflation at original totalFee** (#345) — closes silent fee inflation

## Tier 2 — Restrict admin powers to genuinely-immutable lists

- **Hardcode `systemExempt` list** (#315) — known-at-deploy protocol contracts only; no runtime add/remove
- **Hard-cap `setAntiWhale` lower bounds** in require()
- **Either delete `setSeerAutonomous` or make it advisory-only** (#308, #313) — wrap seer hooks in try/catch so seer can't halt transfers

## Tier 3 — Vault-level fixes (per-user money)

- **CardBoundVault.pause() requires guardian threshold + auto-unpause 7d** (#280) — single guardian can't permanently freeze
- **VaultHub.executeRecoveryRotation requires vault-side guardian approval** (#272-274) — not just hub approvers
- **Delete VaultRecoveryClaim verifier-only path** (#271) — accept that no-guardian users can't recover
- **Pause UserVaultLegacy factory; migrate existing vaults** (#285)

## Tier 4 — Philosophical decisions

- **FraudRegistry escrow** (#371-#375): The 30-day escrow is functionally a freeze with a timer. User has indicated this should remain (per "we will keep them then"). Document explicitly that flagged users have all transfers escrowed for 30 days, and permanently banned users have all transfers escrowed indefinitely.

## What CANNOT be removed without losing core functionality

These are user-controlled (user opted in) — the user has explicitly chosen to keep these:

- **The user's OWN guardian system** — user delegates pause/recovery rights to guardians of their choice. Self-imposed.
- **Withdrawal queue for large transfers** — user-configured threshold; self-imposed delay.
- **Token mint cap (200M)** — supply-level invariant, not per-user freeze.

---

# What's Still Unaudited

This audit covered ~60% of the contract suite and ~70% of the frontend. The following remain to audit:

## Contracts not yet audited (or only partially)

- **VFIDESecurity rest** (530 lines, EmergencyBreaker section covered) + PanicGuard
- **EscrowManager** — deprecated per V14 diff but still deployed
- **PayrollManager** (656 lines) — work-for-pay flow
- **ServicePool** (474 lines)
- **RevenueSplitter, DutyDistributor, LiquidityIncentives**
- **StablecoinRegistry**
- **ProofLedger** — referenced everywhere as logging endpoint
- **GovernanceHooks**
- **VFIDECommerce** (291 lines)
- **VFIDEAccessControl** — referenced by many contracts; understanding role grants matters
- **Future contracts** in `contracts/future/`:
  - CouncilElection
  - CouncilSalary  
  - SeerAutonomous (referenced but contract itself unaudited)
  - Badge contracts
  - VFIDEBridge (flagged as not ready for deployment)
  - VFIDEEnterpriseGateway

## Frontend slices not yet audited

- **Governance UI** (~30% of frontend)
- **Settings/Profile pages**
- **Admin dashboards**

## Infrastructure

- **Test coverage assessment** — earlier rounds noted heavy use of jest mocks vs real EVM
- **Deploy scripts comprehensive review** — given AdminMultiSig wiring gap (#391), the deploy chain itself needs adversarial audit
- **CI/CD pipeline** — what gets validated before deploy?
- **Indexer service** — only ABI mismatch (#79) and reorg handling (#80) examined

---

# Recommended Action Plan

## Phase 1 — Pre-mainnet blockers (must fix before any mainnet deploy)

1. Fix #306 (treasury param deploy blocker)
2. Fix #307 (permit struct hash)
3. Wire AdminMultiSig (#391) — biggest single fix
4. Lower EMERGENCY_APPROVALS to 4-of-5 (#392)
5. Fix veto quorum asymmetry (#393)
6. Fix #345 ecosystemMinBps fee inflation
7. Update transfer-governance.ts ordering (#327, #328)
8. Add OCP wrappers (#325, #326) — OR transfer ownership to AdminMultiSig directly, bypassing OCP

## Phase 2 — Halt mechanism consolidation (next sprint)

9. Pick ONE halt mechanism (per #363-#367 cross-cutting); remove parallel kill-switches
10. Tier 1 freeze removals (mechanical, no trade-off)
11. Tier 2 freeze restrictions (admin power constraints)
12. Tier 3 vault-level fixes

## Phase 3 — Score-system fixes (Seer)

13. Fix Seer.setScore lastActivity + history (#151, #177)
14. Fix resolveScoreDispute lastActivity (#159, #178)
15. Fix applyDecay reversibility (#152)
16. Fix SeerAutonomous brick condition (#179)

## Phase 4 — Frontend/API critical fixes

17. Fix RLS USING(true) bug (#48)
18. Implement missing endpoints (#91)
19. Fix all withAuth closure crashes (#72, #93, etc.)
20. Server-verify all tx_hash claims (#62, #95, #138)
21. Server-verify all pricing (#105)

## Phase 5 — Hardening

22. Add timelocks to remaining instant-effect functions
23. Bound all unbounded arrays (paginated views)
24. Resolve halt-mechanism inventory finalization
25. Complete unaudited contract slices

## Phase 6 — Ongoing

26. Test coverage with real EVM (not mocks)
27. Adversarial deploy script audit
28. Operational runbook for key rotation, emergency response

---

# Notes on Methodology

This audit was conducted by progressively reading source contracts and tracing data flows. Each round focused on a specific contract or area, with cross-references to prior findings. The cumulative finding count includes:

- Direct security vulnerabilities (the Critical and High items)
- Operational risks (the Medium items)
- Code hygiene and observability gaps (Low and Info items)
- Cross-cutting themes that emerge from multiple findings

**Findings I am most confident about**: deploy script issues (verified by reading scripts), missing wrappers (verified by reading OCP and referenced contracts), the multisig wiring gap (verified by grep), the permit struct hash bug (verified via direct keccak256 calculation), and the ecosystemMinBps fee inflation (verified with worked example).

**Findings I am least confident about**: anything in the early-round summaries that I extracted from compaction context rather than re-verifying in the current codebase. If acting on early-round findings, re-verify the relevant code path before committing time to a fix.

**False positives identified during audit**:
- #27, #28: proxy.ts at root and CSP config — initially flagged as broken; later verified correct in Next.js 16+

---

*End of audit findings document.*


---

## Round 21 — Remaining Slices (Audit Continuation)

Round 21 audited the previously-unaudited contract slice plus a deeper look at the deploy scripts. Full detail is in the companion document `VFIDE_AUDIT_R21.md`. Summary of new findings (#415 - #486):

### Critical / High highlights from R21

**#415** (CRITICAL — DEPLOY BLOCKER, supersedes #306): The VFIDEToken constructor REQUIRES `treasury` to be a contract (not an EOA), but `deploy-full.ts:123` passes `deployer.address`. Constructor reverts. Prior #306 had the direction backwards. Fix: deploy AdminMultiSig in Layer 1 (before VFIDEToken), pass `book.AdminMultiSig` as treasury.

**#416** (CRITICAL): `transfer-governance.ts` doesn't transfer ownership/DAO of 11+ governed contracts (VaultHub, BurnRouter, EcosystemVault, SanctumVault, FeeDistributor admin, StablecoinRegistry, PayrollManager, LiquidityIncentives, EmergencyControl, CircuitBreaker, plus AdminMultiSig itself never used as governance for any).

**#417** (HIGH): `DevReserveVestingVault.DAO` is `immutable`. Cannot be rotated. Deployer-as-DAO is permanent.

**#425** (HIGH): GuardianRegistry — DAO can override user's guardian preferences instantly (add/remove/setThreshold for any vault).

**#427** (HIGH): GuardianLock — DAO can unlock and cancel any in-progress vote unilaterally.

**#428** (HIGH): PanicGuard — DAO can quarantine any vault for up to 90 days. Direct violation of "no freeze" principle.

**#429** (CRITICAL): PanicGuard.setGlobalRisk(true) — single DAO key kill-switch. Currently dormant since SecurityHub was removed; documented as latent risk.

**#431** (HIGH): EmergencyBreaker.setDAO instant, no timelock.

**#436** (HIGH): PayrollManager.emergencyWithdraw allows DAO to drain any stream to ANY address (7-day timelock).

**#446** (HIGH): ServicePool.pause() halts all `claimPayment` with no timelock; ADMIN_ROLE single-key DoS on worker pay.

**#456** (HIGH): MerchantRegistry.dao, token, vaultHub, seer all `immutable` — no rotation path; long-term flexibility lost.

**#462** (HIGH): DevReserveVestingVault.emergencyFreeze has no DAO unfreeze; only beneficiary can unpause.

**#464** (HIGH): DevReserveVestingVault BENEFICIARY and DAO are `immutable`; key loss = unrecoverable vest.

**#470, #471** (HIGH): GovernanceHooks reverts on SeerGuardian flag — bricks all DAO proposal execution and voting if guardian fails.

**#473, #474** (MEDIUM-HIGH): VFIDEBridge owner can set max amount to 0 instantly (halt) and bridge fee without timelock.

**#477** (HIGH): SeerAutonomous.daoOverride accepts arbitrary expiry — DAO can grant indefinite enforcement immunity.

**#481** (MEDIUM): Frontend SuggestionsTab and DiscussionsTab use hardcoded mock data; user submissions don't persist.

**#485, #486** (HIGH): Test infrastructure has 316 mock-heavy tests; no end-to-end deploy integration test would catch the kinds of bugs found in this audit.

### Cross-cutting from R21

1. Many "DAO can do X" findings reduce to "deployer can do X" until #391 is fixed
2. Multiple instant admin/DAO setters; need timelock pass everywhere
3. Guardian/lock asymmetry varies between contracts; needs consolidation
4. Future contracts (VFIDEBridge, SeerAutonomous, MainstreamPayments) have similar centralization patterns
5. End-to-end deploy test is the biggest test-infra gap

### Updated cumulative count

~486 findings. Critical: ~46. High: ~84. Medium: ~118. Low: ~96. Info: ~124.

### Top 10 priorities (post-R21)

1. **#415** — Fix VFIDEToken treasury (deploy AdminMultiSig first; pass it as treasury) [DEPLOY BLOCKER]
2. **#307** — VFIDEToken permit struct hash missing deadline
3. **#391** — Wire AdminMultiSig comprehensively
4. **#416** — Update transfer-governance.ts for missing contracts
5. **#392** — Lower EMERGENCY_APPROVALS to 4-of-5
6. **#393** — Make AdminMultiSig veto require quorum
7. **#345** — Cap ecosystemMinBps fee inflation
8. **#363-#367** — Consolidate halt mechanisms
9. **#470, #471** — Wrap GovernanceHooks SeerGuardian calls in try/catch
10. **#436** — Restrict PayrollManager.emergencyWithdraw recipient

### What remains unaudited after R21

MainstreamPayments (1352 LOC), CouncilElection/Manager/Salary, Badge family (4 contracts), Subscription/Benefits/Enterprise, SeerGuardian/SeerSocial/SeerWorkAttestation, validate-* and verify-* scripts (~30 scripts), Indexer service, detailed frontend hooks audit.

*Round 21 complete. See `VFIDE_AUDIT_R21.md` for full detail of each finding.*


---

## Round 22 — Final Audit Slice

Round 22 closed out the remaining unaudited contract surface. Full detail in the companion document `VFIDE_AUDIT_R22.md`. Findings #487 — #524 (38 findings).

### Critical correction

**#487 (RETRACTION of #48)**: RLS is properly wired in lib/db.ts. `runWithDbUserAddressContext` uses `AsyncLocalStorage` and `applyDbUserAddressContext` calls `set_config('app.current_user_address', $1, true)` per query. Migrations use `current_setting('app.current_user_address', true)` correctly. The `USING(true)` policies are intentional public-readable policies (proposals, endorsements, basic user info). validate-deployment.ts at lines 147-159 explicitly checks for the wiring. Prior #48 should be removed from priority list.

### Critical / High highlights from R22

**#488** (CRITICAL): MainstreamPriceOracle.forceSetPrice allows DAO to drop price by 90% in 5 minutes. `MAX_FORCE_PRICE_DECREASE_BPS = 9000`. Compromised DAO key = 10× user payment manipulation.

**#490** (HIGH): MultiCurrencyRouter.setRecommendedRouter no timelock. Frontend trusts on-chain "recommended" router; swap to malicious router instant.

**#492** (HIGH): SessionKeyManager._enforceSeerAction blocks payment on "Delayed" Seer result. Honest user with one ambiguous flag has session-tap permanently broken.

**#496** (HIGH): BadgeManager.setQualificationRules instant. DAO can install rules where everyone qualifies; operators auto-award FOUNDING_MEMBER (+800 score).

**#497** (HIGH): BadgeManager.revokeBadge punishes user score immediately; DAO unilateral, no challenge.

**#501** (HIGH): CouncilElection vote weight = score-at-electionStart; sybils can pre-mint score before election.

**#503** (HIGH): CouncilElection.refreshCouncil DAO-callable with arbitrary subset; selective removal of dissenting members.

**#504** (HIGH): CouncilElection.removeCouncilMember "DAO can remove anyone for any reason" — no timelock.

**#509** (HIGH): SeerGuardian.autoCheckProposer flags proposers near governance threshold; DAO controls minForGovernance, effectively a censorship knob.

**#511** (HIGH): SeerGuardian daoOverride accepts arbitrary expiry; indefinite immunity grant.

**#512** (HIGH): SeerWorkAttestation single VERIFIER_ROLE = mints attestations → ServicePool payouts.

**#515** (HIGH): SubscriptionManager.emergencyCancel DAO unilateral when EmergencyBreaker.halted (which is single-DAO-key flip).

**#518** (HIGH): VFIDEEnterpriseGateway.setOracle no timelock.

**#523** (HIGH): verify-fee-burn-router-invariants uses MOCK Seer/Token, not real contracts.

**#524** (HIGH): verify-* scripts not run in CI; only frontend-abi-parity is invoked by validate-deployment.ts.

### Cross-cutting from R22

1. Future contracts have same centralization patterns as current ones — wiring AdminMultiSig must be repeated when they deploy
2. MainstreamPriceOracle 90% force-price-drop is most concerning new finding
3. Council removal/reinstatement asymmetry — DAO can override council's self-policing
4. SeerWorkAttestation single-verifier feeds ServicePool funds
5. validate-deployment.ts excellent but missing on-chain post-deploy phase
6. RLS retraction (#48) means database access layer is more secure than audit previously stated

### Updated cumulative count

~524 findings. Critical: ~50. High: ~95. Medium: ~135. Low: ~110. Info: ~134.

### Updated top 10 priorities (post-R22)

1. **#415** — VFIDEToken treasury [DEPLOY BLOCKER]
2. **#307** — VFIDEToken permit struct hash deadline
3. **#391** — Wire AdminMultiSig comprehensively
4. **#416** — Update transfer-governance.ts
5. **#392** — Lower EMERGENCY_APPROVALS to 4-of-5
6. **#393** — Make veto require quorum
7. **#345** — Cap ecosystemMinBps inflation
8. **#363-#367** — Consolidate halt mechanisms
9. **#488** — MainstreamPriceOracle force-decrease cap (90%→50%)
10. **#470, #471** — Wrap GovernanceHooks try/catch

Removed: **#48 RLS** — RETRACTED.

### What is now fully audited

Substantially the entire production contract suite, all future contracts at structural level, all major deploy/transfer/apply scripts, validate-deployment.ts pipeline, sample verify scripts, lib/db.ts RLS wiring.

### What is genuinely remaining (lower priority)

SeerSocial, SeerView, SeerPolicyGuard (sampled briefly), VFIDEBenefits, BridgeSecurityModule, detailed frontend hooks, indexer service code, each individual verify-* script content (~30 scripts).

The audit has reached diminishing returns — same patterns repeat. Further rounds would add instances rather than new categories.

*Audit complete after 22 rounds.*

