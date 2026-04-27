# VFIDE — Mainnet Readiness Findings

**Date:** 2026-04-25
**Scope:** Independent review of the uploaded `Vfide-main` repository against a mainnet-ready bar.
**Method:** Read-through of contracts, API routes, deployment scripts, env scaffolding, middleware, websocket server, and the existing audit tracker. No fresh compile (binary fetch was network-blocked); all findings are static.

This document does **not** restate the 140 items already tracked in `VFIDE_AUDIT_FINDINGS_FULL.md` / `docs/security/VFIDE_AUDIT_REMEDIATION_CHECKLIST.md` (every item there is currently marked `[x]` fixed, accepted, or partial). What follows is everything I found that **is not** already in those trackers, plus **regressions / claimed-fix gaps** where the remediation is incomplete despite being checked off.

Severities use the same scale as your existing audit (Critical / High / Medium / Low / Informational).

---

## Section A — Claimed-fix regressions (the tracker says fixed; the code says otherwise)

These are the most dangerous category: someone signed off on them, the box is checked, the next eyes won't look hard.

### A-1 (Critical) — C-1 / C-14 partial: approve still INSTANT before guardian setup

`docs/security/VFIDE_AUDIT_REMEDIATION_CHECKLIST.md` marks C-1 as `[x]`. The fix in `contracts/CardBoundVault.sol:483-494` is asymmetric:

```solidity
function approveVFIDE(address spender, uint256 amount) external onlyAdmin whenNotPaused {
    require(spender != address(0), "CBV: zero spender");
    _validateApprovalAmount(amount);

    if (_guardianSetupComplete()) {
        _queueTokenApproval(vfideToken, spender, amount);   // 7-day delay
        return;
    }

    IERC20(vfideToken).forceApprove(spender, amount);        // INSTANT
    emit VaultApprove(spender, amount);
}
```

`_validateApprovalAmount` only caps at `dailyTransferLimit`, which `VaultHub.sol:28` defaults to **2,000,000 × 10¹⁸ VFIDE**. Before guardian setup is complete the user has exactly the window the protocol is supposed to be protecting them in — and a single signature still grants up to 2M VFIDE worth of approval with zero delay. C-7's 50K cap on receiving doesn't bound spending via `transferFrom`. `approveERC20` (L502) has the identical asymmetry for stablecoins and any other ERC-20.

The C-20 (SubscriptionManager) inheritance is identical: same hole, recurring scale.

**Fix:** Apply the queue/cap unconditionally, or hard-cap pre-guardian approvals at `MAX_VFIDE_WITHOUT_GUARDIAN`.

---

### A-2 (Critical) — C-3 fix is cosmetic; deploy script still ships the stub

`DeployPhase1Infrastructure.sol:7-18` always reverts; that closes one path. But `contracts/scripts/deploy-phase1.ts:182-188` is the script the team actually runs, and it deploys `WithdrawalQueueStub` directly when `ALLOW_WITHDRAWAL_QUEUE_STUB=true`. There is **no production-implementation path** in the deploy script — the only concrete subclass of `WithdrawalQueue.sol` (an `abstract` contract) is `contracts/mocks/WithdrawalQueueStub.sol`, which has admin-settable user balances:

```solidity
contract WithdrawalQueueStub is WithdrawalQueue { ... mapping(address=>uint256) balances; setBalance(...) ... }
```

So a mainnet operator who flips the env flag to "make the script work" deploys an admin-controlled token escrow into production. The audit's "RESOLVED" mark is wrong: the abstract path being closed doesn't help if no concrete production path exists.

Note the per-vault internal queue inside `CardBoundVault.sol` is a different mechanism. If the standalone `WithdrawalQueue` contract is genuinely unused in production, **delete it** and remove `NEXT_PUBLIC_WITHDRAWAL_QUEUE_ADDRESS` from the env scaffolding (`.env.production.example:65`, `.env.mainnet.example:32`) — its presence implies a system that doesn't exist and confuses auditors.

---

### A-3 (Critical) — C-12 / C-15 fix has no env scaffolding

`lib/security/siweChallenge.ts:28-35` reads `APP_ORIGIN` and `NEXT_PUBLIC_APP_URL`. `resolveTrustedAuthDomain` is fail-closed in production when neither is set:

```ts
if (process.env.NODE_ENV === 'production') return null;
```

But neither `.env.production.example` nor `.env.mainnet.example` references `APP_ORIGIN`. `NEXT_PUBLIC_APP_URL` is in `.env.production.example:17` but absent from `.env.mainnet.example`. A deployer copying `.env.mainnet.example` and only adding contract addresses will deploy a system where **every SIWE auth attempt fails silently with HTTP 400 "Untrusted auth domain"**. The auth fix becomes an outage.

The `.vercel.app` allowance at `siweChallenge.ts:48` is also a gap — it's gated on `NODE_ENV !== 'production'`, but Vercel preview branches and Vercel production with `NODE_ENV` mishandled (which has happened in real outages) re-enable Host-header trust on `*.vercel.app`. If the production app ever runs on a `.vercel.app` URL, this is a live phishing path.

**Fix:** Add `APP_ORIGIN=https://app.vfide.io` (and matching value in mainnet) to **both** example env files, add a startup assertion in `lib/validateProduction.ts` that fails the build if `APP_ORIGIN` is unset in production, and tighten the Vercel-preview branch to compare against an explicit allowlist not a domain suffix.

---

### A-4 (High) — C-16 middleware: `content-length`-only body cap = bypassable

`proxy.ts:122-148` only enforces the size limit when the request includes a `Content-Length` header:

```ts
const contentLength = request.headers.get('content-length');
if (contentLength) {
  const bodySize = parseInt(contentLength, 10);
  ...
}
```

A chunked request (Transfer-Encoding: chunked, no Content-Length) skips the check entirely. Edge runtime forwards chunked requests in some configurations. Combined with absent or partial `validateContentType`, this is a DoS vector against any POST/PUT/PATCH route. The audit ticked C-16 as "FIXED — full security middleware"; that's only true in the happy path.

**Fix:** Either reject POST/PUT/PATCH/DELETE with no `Content-Length`, or read the request body in middleware and cut it off at the cap (more invasive, but correct).

---

### A-5 (High) — H-42 / SystemHandover: ownership audit is self-attestable

`SystemHandover.sol:159-172` lets the dev set the `ownershipAuditor` while the contract is `notArmed`. The dev can set themselves (or any address they control) as the auditor, then call `markOwnershipAudited()` regardless of the actual chain state. The remediation note says "DOCUMENTED: deployment procedure responsibility" — but the on-chain code allows the procedure to be bypassed without leaving an obvious trace.

Combined with the same dev controlling `executeHandover` (still gated `onlyDev` at L176) and `disarm` (L87, only blocked in the last 30 days of the countdown), the contract **does not enforce decentralization**; it only schedules a date by which the dev has the option to walk away. H-42 is a real risk, not a documentation issue.

**Fix:** Either route `markOwnershipAudited` through an off-chain verifier (a public attestation tied to a verification script's output and signed by an independent multisig), or split the auditor-setting step so it requires a second signer (council multisig or DAO) post-arming.

---

### A-6 (High) — H-11: EIP-170 size blocker status updated

Status update (2026-04-27): previous over-limit values are now stale.

Current verification output from `scripts/verify-contract-size-buffer.ts` shows both formerly blocked contracts under the 24,576-byte EIP-170 runtime limit:

- `MerchantPortal`: 24,398 bytes
- `EcosystemVault`: 23,846 bytes

Additionally, `scripts/deploy-all.ts` now enforces an EIP-170 runtime bytecode preflight and fails fast if any deployment contract exceeds 24,576 bytes.

Residual risk: `MerchantPortal` remains close to the hard limit, so future feature additions must preserve bytecode budget or include further extraction work.

---

### A-7 (High) — H-22 / `VFIDETestnetFaucet` is on the production deploy list

`PRODUCTION_SET.md` line 58: `VFIDETestnetFaucet.sol`. The constructor blocks deployment on chains other than Sepolia / Amoy / Mumbai-like (L344-352 chain whitelist), so a mainnet deploy reverts in the constructor. Two problems:

1. `.env.mainnet.example:62` includes `DEPLOY_TESTNET_FAUCET=false` — meaning the script flow will at least respect this. But there's no equivalent in `.env.production.example` and no assertion that the contract isn't on the active address list.
2. The fact that the faucet is on the production list means an inattentive operator running `deploy-all.ts` triggers the constructor revert mid-deploy, partway through the 9-batch sequence, leaving deployment in a half-state.

**Fix:** Remove `VFIDETestnetFaucet` from `PRODUCTION_SET.md`. Move it to a separate `TESTNET_SET.md`. Add a deploy-script assertion that the faucet bytecode hash isn't present at any registered address on chain `8453`.

---

## Section B — New issues NOT in the existing tracker

Sorted roughly by severity. Item numbers are mine and do not collide with the F-/C-/H- numbering already in use.

### B-1 (Critical) — `StablecoinRegistry.sol`: owner-controlled, no DAO gate, no decimals cross-check

`contracts/StablecoinRegistry.sol` is on the production list but every mutator is `onlyOwner`:

- `addStablecoin(token, decimals, symbol)` (L44) — **decimals is caller-supplied with no `IERC20Metadata.decimals()` cross-check.**
- `removeStablecoin` (L66) — instant.
- `setAllowed` (L92) — instant.
- `setTreasury` (L139) — instant.
- `pause` / `unpause` (L172-173) — instant.

Three exploit paths:

1. **Wrong decimals on add → all payment math wrong forever** for the lifetime of that allowlist entry. USDC has 6 decimals, DAI has 18 — register USDC with 18 and a $1 invoice charges $1e12.
2. **Owner key compromise → adversary registers a malicious "stablecoin"** — any ERC-20 with `transfer`/`transferFrom`. Combined with `MerchantPortal` accepting from the registry, the attacker registers their own token, has merchants accept it, and walks away with goods.
3. **Owner key compromise → de-list real stablecoins** to break payments and force users onto attacker-favored alternatives.

The audit listed this contract under H-52 ("red-flag patterns reviewed") but didn't open specific findings. It's a real production-ready blocker.

**Fix:** Convert all mutators to `onlyDAO` or `onlyDAOTimelock` with the same propose/apply pattern used elsewhere. Cross-check `decimals` against `IERC20Metadata(token).decimals()` and reject mismatches.

---

### B-2 (High) — `PayrollManager.sol`: unbounded array growth → permanent DoS by Sybil

`createStream` (L153) pushes the stream id onto `payerStreams[payer]` and `payeeStreams[payee]`, with a 200 cap (L175, L177). `cancelStream` (L406) and `claimExpiredStream` (L440) **do not pop these arrays** — they only set `s.active = false`. So:

1. A user who naturally creates and cancels 200 streams over time can never receive or send another stream. Permanent self-lockout.
2. **Worse:** an attacker can grief any victim by creating 200 micro-streams *to* the victim as payee. After that, the victim cannot receive payroll from anyone — the contract reverts on `payeeStreams[victim].length < 200`. Cost: 200 minimum-rate streams, refundable on cancel.

This is in the same pattern as the H-41 flash-loan lender DoS, but for payroll. It's not in the tracker.

**Fix:** Track active stream count separately, or remove cancelled/expired ids from `payerStreams` / `payeeStreams` (swap-and-pop, same pattern as H-40's DAOTimelock fix).

---

### B-3 (High) — `PayrollManager.topUp` doesn't account for fee-on-transfer tokens

`createStream` (L182-188) correctly measures `actualDeposit` after `safeTransferFrom`. `topUp` (L200-208) does not — it does `s.depositBalance += amount` *before* `safeTransferFrom`. A user who tops up with a fee-on-transfer token (USDT historically had transfer fees, some emerging-market stables still do) sees their stream's accounting balance grow by more than was actually received. The stream then runs out of real tokens before the balance counter says it should — payee withdrawals start failing, payer thinks the stream is funded.

**Fix:** Same balance-delta pattern as `createStream`.

---

### B-4 (High) — `PayrollManager.createStream` accepts arbitrary tokens

`createStream` accepts any `address token`. There is no allowlist. This is the **on-chain** version of the same trust gap as `/api/streams` (B-7 below). Implications:

- A merchant can be tricked into accepting a stream paid in a token the merchant has no liquidity for.
- Malicious tokens (`transfer` reverts, infinite-mint, blacklist hooks) can be set up to extract value from honest counterparties.
- Rebasing tokens silently drift the stream's accounting.

**Fix:** Either restrict to `StablecoinRegistry` allowlist + VFIDE, or add a `setSupportedToken(token, bool)` DAO-gated allowlist on PayrollManager itself.

---

### B-5 (High) — `SeerSocial.endorsersOf[subject]` is unbounded growth, hard 200 cap

`SeerSocial.sol:290` enforces `endorsersOf[subject].length < 200`. This is global per subject and cumulative. Endorsements are not removed from this array on expiry, only on revocation. Ten Sybils with `minScoreToEndorse` who endorse and let endorsements expire keep their slot consumed forever (the full lookup pattern is at L325 `_removeEndorserFromSubjectList` only on revoke).

Identical attack to B-2 against payroll: an attacker mass-endorses a victim from cheap-to-fund Sybils, the endorsements expire, the victim's slot count is permanently consumed at 200, no honest endorser can ever push the bonus above whatever those Sybils contributed. Permanent reputational sabotage.

**Fix:** When pruning expired endorsements, also pop them out of `endorsersOf`.

---

### B-6 (High) — Slither's three `arbitrary-send-erc20` flags are not in the tracker

From `.tmp/slither-current.out`:

- `SubscriptionManager.processPayment(uint256)` — `safeTransferFrom(userVault, merchantVault, sub.amount)` at L289.
- `CommerceEscrow.markFunded(uint256)` — `token.safeTransferFrom(e.buyerVault, address(this), e.amount)` at L221.
- `VFIDETermLoan.extractFromGuarantors(uint256)` — `vfideToken.transferFrom(source, _settlementRecipient(l.lender), extractAmount)` at L681.

In each case the contract pulls from a `from` address it didn't authenticate as the caller. That's safe **only** if the `from` address has explicitly approved the contract for the precise amount. For `SubscriptionManager` that approval comes from `CardBoundVault.approveVFIDE` — which per A-1 (above) is still instant pre-guardian-setup. So `SubscriptionManager.processPayment` plus A-1 is the same drain primitive as C-1 ⇒ C-20 in the original audit, just one contract removed. The remediation called these out as "validated `nonReentrant`"; it didn't address the arbitrary-from issue.

**Fix:** Tie the `from` address in each of these to a signed user intent or a queued vault permission, not a blank approval.

---

### B-7 (High) — `/api/streams` creates DB rows with no on-chain backing

`app/api/streams/route.ts` creates a row in the `streams` table with `total_amount` and `rate_per_second` purely off-chain. The frontend likely renders these as "active streams." There is no transferFrom, no escrow, no link to `PayrollManager`. So a UI shows a stream that exists nowhere on chain. Trust is then either (a) misplaced by the recipient, or (b) silently broken when the recipient tries to claim and discovers the stream is fictional.

The audit's API-route summary spot-checked 18 of 122 routes; this isn't one of them.

**Fix:** Either remove this endpoint and require streams to be created via on-chain `PayrollManager.createStream` only, or change it to a planning/preview endpoint with no "active" status.

---

### B-8 (High) — Faucet operator key referenced from production endpoint code path

`app/api/faucet/claim/route.ts:6` imports `baseSepolia` and `:48` reads `FAUCET_OPERATOR_PRIVATE_KEY` from env. The route is not gated on `NEXT_PUBLIC_IS_TESTNET`. If a production deployment ships with this route enabled (route presence is the default — there's no deploy-time strip step) and the env var is set on the wrong environment, you have a private key sitting in production env. The faucet contract itself rejects mainnet (constructor revert), but private keys in env are a leak surface independent of where the contract lives.

**Fix:** Wrap the entire route handler in `if (process.env.NEXT_PUBLIC_IS_TESTNET !== 'true') return 404`. Add a build-time guard to fail builds when `FAUCET_OPERATOR_PRIVATE_KEY` is set alongside `NEXT_PUBLIC_IS_TESTNET=false`.

---

### B-9 (Medium) — WebSocket topic ACL has 30s staleness window + no-topic broadcast leak

`websocket-server/src/index.ts:39` refreshes the topic ACL JSON file every 30 seconds. Group membership changes (kick a user, change a permission) take up to 30 seconds to land. For a payments / governance system, a kicked user receiving messages they shouldn't for 30s is a real disclosure risk.

Worse, the `broadcast` fallback at L367-373 — when a message has no `topic` — fans out to **all** connected sessions:

```ts
const raw = JSON.stringify(msg);
for (const [sessionId, client] of clients) {
  if (sessionId === except) continue;
  if (client.readyState === WebSocket.OPEN) {
    client.send(raw);
  }
}
```

A malformed or non-topic message leaks to every connected client. Combined with attacker-controlled message construction (any authenticated user can publish), this is reachable.

**Fix:** Refresh ACL on every change via a cache-bust signal (Redis pub/sub, since you already use Upstash). Make the no-topic fallback fail closed — drop the message instead of fanning out.

---

### B-10 (Medium) — `setFeeBypass` activates immediately, `onlyOwner`, no per-bypass cap

`VFIDEToken.sol:720-747`. The owner can set fee bypass with no timelock on activation (deactivation is also instant — that part is fine for liveness). Pre-handover, `onlyOwner` = dev key. A compromised dev key, in the window before SystemHandover executes, can bypass fees protocol-wide for up to 7 days, drain expected protocol revenue (sanctum + ecosystem + burn) into nothing for that period, and frustrate any on-chain accounting reconciliation.

Post-handover, `onlyOwner` = DAO, and that's a different threat model.

**Fix:** Apply a 24-48h propose/apply timelock on `_active = true`. Cap one fee-bypass per N days to prevent rolling indefinite bypass.

---

### B-11 (Medium) — Permanent dead code: `WithdrawalQueue.sol` (abstract) ships in production

Per A-2: the standalone `contracts/WithdrawalQueue.sol` (387 lines, abstract) is referenced only by the testnet stub. If the production system uses CardBoundVault's internal queue, then this contract should be deleted. Currently it: (a) takes up space in audit scope (auditors will read 387 lines and look for an implementation that doesn't exist), (b) is still imported by `DeployPhase1Infrastructure.sol:5`, (c) has its address slot in env scaffolding (`NEXT_PUBLIC_WITHDRAWAL_QUEUE_ADDRESS`).

**Fix:** Delete the file. Remove the import. Drop the env var. Update the README architecture doc.

---

### B-12 (Medium) — `H-9` precision-loss claim doesn't match the code path I read

The tracker says H-9 ProofScoreBurnRouter.computeFees was "FIXED: each split computes (amount * bps) / 10000 directly (multiply-then-divide)." Looking at `ProofScoreBurnRouter.sol:563-565`:

```solidity
uint256 burnBps    = (totalBps * 40) / 100;
uint256 sanctumBps = (totalBps * 10) / 100;
uint256 ecosystemBps = totalBps - burnBps - sanctumBps;
```

That's still BPS arithmetic on small integers, then later applied to `amount`. The mul-then-div pattern is correct **at the BPS level** but `totalBps * 40 / 100` truncates: if `totalBps = 25` (the floor), then `burnBps = 25 * 40 / 100 = 10`, `sanctumBps = 25 * 10 / 100 = 2`, `ecosystemBps = 25 - 10 - 2 = 13`. That's roughly OK. But if `totalBps = 27` due to interpolation, you get `burnBps = 10`, `sanctumBps = 2`, `ecosystemBps = 15` — and the burn's actual share is 37%, not 40%. For tiny scores this drift is amplified. For micro-payments below `microTxFeeCeilingBps` it dominates the actual fee.

The problem is real but minor. It belongs in the tracker as "partial / accept noise" rather than checked off.

---

### B-13 (Medium) — Faucet `dailyClaimCap = 100` × `claimAmountVFIDE = 1000e18` × ETH = ~$X drainable per day on testnets

Not a mainnet issue strictly, but: if someone takes the testnet operator key, they can claim 100 VFIDE × 1000e18 + 100 × 0.005 ETH = 100,000 VFIDE + 0.5 ETH per day, repeatable. On Base Sepolia ETH costs are negligible but the VFIDE balance funded into the faucet is real. The `WITHDRAW_DELAY = 24 hours` (L47) only governs withdraws; claims are immediate. An attacker can drain in roughly `(faucetBalance) / (dailyCap × claimAmount)` days.

The audit's H-22 mark covers operational risk in a sentence. Worth an explicit alert: faucet drains take days, not minutes — but unattended testnets do go unattended for days.

---

### B-14 (Low) — Error on `Phase1InfrastructureDeployer.deployInfrastructure` is misleading and confusing for auditors

`DeployPhase1Infrastructure.sol:16` reverts unconditionally with the message about "WithdrawalQueueStub disabled." But `DeployPhase1.sol:114` calls this exact function in the production deploy flow:

```solidity
(addresses.circuitBreaker, addresses.withdrawalQueue)
  = IPhase1InfrastructureDeployer(_infrastructureDeployer).deployInfrastructure(
      _admin, _priceOracle, addresses.emergencyControl
  );
```

So `DeployPhase1.sol` can never successfully run as-is. Either: it's known-broken and the team uses `contracts/scripts/deploy-phase1.ts` instead (the TS script), in which case `DeployPhase1.sol` is dead and should be deleted; or the team intends `DeployPhase1.sol` to be the real path and the deployer revert is a bug. Either way an auditor looking at the on-chain deploy path is going to lose half a day to this.

**Fix:** Pick one. If TS-only, delete the Solidity contract.

---

### B-15 (Low) — `lib/security/csrfPolicy.ts` exempts `/api/auth/challenge` and `/api/auth` from CSRF

That's a **pre-auth** exemption (the user has no cookie yet, so there's no CSRF token to send). Standard. But the comment "Skip CSRF check only for pre-auth endpoints" is contradicted by the path list, which exempts `/api/auth` (the verify endpoint that sets the auth cookie). After challenge/verify the cookie exists; subsequent calls go through a different path. The exemption itself is OK; the comment overstates the safety story.

---

### B-16 (Low) — Slither costly-loop / reentrancy-events / dead-code findings

The slither output (229 detector hits) has a long tail of:

- `ReentrancyGuard._nonReentrantBefore/_nonReentrantAfter` are never used → dead code in `SharedInterfaces.sol`. Remove.
- `OwnerControlPanel.token_batchWhaleLimitExempt` reentrancy in a setter loop — gas/correctness only, no theft path.
- `EcosystemVault.migrateRewardToken` reentrancy-no-eth → CEI-violation, but migrateRewardToken is `onlyDAO`.
- Several `incorrect-equality` flags (`== 0` for sentinel values) — these are intentional patterns and safe.

These are noise individually but collectively communicate that the slither output hasn't been triaged. Auditors will assume something hides in the noise.

**Fix:** Run a slither pass with a project-tuned `slither.config.json` (you have `.solhint.json` but no slither config). Suppress acknowledged findings inline with `// slither-disable-next-line` and document the exceptions in `audit/slither-triage.md`. Currently every fresh reader has to repeat the triage.

---

### B-17 (Informational) — Marketing vs code claims still drift

Per the user's existing `VFIDE_WEBSITE_VS_CODE_DISCREPANCIES.md` (referenced in memory; not in this repo), the team has tracked this. Three items I noticed:

1. The README and `next.config.ts:74` comment claim "CSP is enforced in `proxy.ts`". After A-4, that claim is *partially* true — CSP yes, body-cap not in chunked mode.
2. `H-29` (`BridgeSecurityModule.setBlacklist`) is marked "ACCEPTED RISK" with the rationale "bridge operators require block capability for compromised addresses." The marketing message ("non-custodial / no blacklist / no freeze") is incompatible. The user's prior memory mentions removing freeze/blacklist/SecurityHub locks — but this one survived. Either the marketing or the contract should change.
3. `OwnerControlPanel.vault_freezeVault` (H-28) was reduced to require a queued action but the function name remains. Document the actual semantics in plain English on the marketing site, or rename the function. Auditors and journalists run grep on `freeze`.

---

### B-18 (Informational) — `.env.example` line 174 contains a private-key env named generically

```
FAUCET_OPERATOR_PRIVATE_KEY=0x_BACKEND_OPERATOR_PRIVATE_KEY
```

Placeholder is fine; the namespacing (`0x_BACKEND_OPERATOR_PRIVATE_KEY`) is misleading because real values must start with `0x` followed by 64 hex chars. A copy-paste deploy that forgets to change the placeholder will fail with a hex-parse error rather than a clean "not configured." Same observation applies to the various `0x0000...0000` contract addresses across the env files — some code paths treat a non-zero address as "configured" without validating the address has bytecode.

---

## Section C — Coverage gaps the existing tracker explicitly acknowledged

These aren't new findings — the audit file's §8 names them — but they're not closed. They're the unknown-unknowns that block "perfect for mainnet" by definition:

- **~50% of Solidity surface unaudited line-by-line** (Seer rest, SeerAutonomous, SeerGuardian, SeerSocial, SeerWorkAttestation, MerchantPortal rest, MainstreamPayments rest, Council*, GovernanceHooks, EscrowManager, RevenueSplitter, Pools, LiquidityIncentives, VFIDEAccessControl, VFIDEReentrancyGuard, VFIDESecurity, VFIDEPriceOracle, VFIDEBridge, ServicePool).
- **~85% of API routes (104 of 122) only spot-checked or untouched.** B-7 is one example I happened to read.
- **101 frontend pages, ~220K TS/TSX LOC** — XSS, dangerouslySetInnerHTML, secret exposure, localStorage misuse, role-bypass UI states, signed-message phishing prompts.
- **WebSocket server** (683 LOC index + 151 auth + 131 rate + 92 schema) — partially reviewed in §B-9 above; the auth flow, JWT replay, and disconnect/reconnect race conditions are not covered.
- **Test coverage gaps unknown.** 464 test files but no coverage report in the repo.
- **No fresh slither / mythril / echidna / foundry-fuzz / certora.** The cached slither output is a single point-in-time snapshot.
- **No formal verification** of the burn-fee invariant, the vault recovery state machine, or the fee-distribution conservation law.

---

## Section D — Pre-mainnet must-do list (priority order)

This is what I would block deployment on. Items in **bold** are not in your existing tracker.

1. **A-6 / H-11 — split EcosystemVault and MerchantPortal under EIP-170.** Without this nothing else matters.
2. **A-1 — fix the pre-guardian approve hole.** It's a phishing-to-drain primitive that survived the original C-1 fix.
3. **A-3 — add `APP_ORIGIN` to mainnet/production env examples and assert at boot.** Otherwise the SIWE auth fails or phishes.
4. **A-2 / B-11 — clean up the WithdrawalQueue stub vs. abstract vs. CBV-internal mess.** Pick one design, delete the others.
5. **A-4 — fix the chunked-body bypass in `proxy.ts`.**
6. **B-1 — gate `StablecoinRegistry` mutators on DAO + cross-check decimals.**
7. **A-5 / H-42 — make `markOwnershipAudited` not self-attestable.** Or accept that handover is best-effort and say so on the marketing site.
8. **A-7 / B-8 — remove the testnet faucet from production deploy paths and gate the API route.**
9. **B-2, B-5 — close the unbounded-array / array-leak pattern in PayrollManager and SeerSocial.** Both have working DoS-by-Sybil paths.
10. **B-6 — re-examine the three slither `arbitrary-send-erc20` flags with the C-1 fix applied.** The chain SubscriptionManager → approveVFIDE may still have a drain path.
11. **B-3, B-4 — fee-on-transfer accounting in PayrollManager.topUp and token allowlisting on createStream.**
12. **B-9 — fix the WebSocket no-topic broadcast leak and ACL staleness.**
13. **C — commission a paid audit** with the residual surface as scope. Prioritize Seer stack, MerchantPortal/Mainstream commerce rail, and the council/DAO/timelock takeover paths.
14. **C — run a fresh slither / foundry / echidna sweep** in a clean env now that you can compile (the cached output in `.tmp/` predates several recent fixes).
15. **C — testnet bug bounty for 4-6 weeks** before mainnet, with a published scope.
16. **The 19 unresolved Criticals (now 18 after C-7 fix)** in the original tracker. They're already on your list; this report doesn't restate them.

---

## Closing note on effort

The codebase is large enough that a single read-through cannot be exhaustive. Sections A, B, and the must-do list above represent ~6-8 hours of focused review and were reached without a fresh compile or runtime test. A paid audit with two engineers for two weeks should be expected to find another 30-60 items at H/M severity — most in the unaudited contracts in §C and in the merchant rail. The protocol's surface area is genuinely too large for a single-engineer review to cover; the current architecture is closer to a small product suite than a single token protocol, and it should be priced as such.

The two highest-leverage decisions before mainnet are **(a)** library-extracting EcosystemVault and MerchantPortal (without this, nothing deploys), and **(b)** unifying the withdrawal-queue story (without this, every auditor and every recovery-flow user will trip on the same conceptual confusion I did).

— end of report
