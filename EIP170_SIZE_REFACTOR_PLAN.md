# EIP-170 / EIP-3860 Size Refactor Plan

**Status:** ❌ BLOCKER for mainnet deployment. 7 contracts exceed Ethereum's
EIP-170 (24,576 byte deployed) and/or EIP-3860 (49,152 byte initcode) limits.

This document is the **engineering plan**. It is intentionally separated from
the Slither cleanup (PR #235) so the static-analysis gate can land independently.

## Inventory

Measured against `solc 0.8.30 --via-ir --optimize --optimize-runs 0`
(matches the project's hardhat config):

| # | Contract | Deployed | Initcode | Severity | Strategy |
|--:|---|---:|---:|:---:|---|
| 1 | `vault/CardBoundVaultDeployer.sol` | **55,334** (+125%) | 55,380 (+12%) | 🔴 | **Embeds CardBoundVault — fixed by shrinking #2** |
| 2 | `vault/CardBoundVault.sol` | 29,708 (+20%) | 54,177 (+10%) | 🔴 | **Library extraction** |
| 3 | `VaultHub.sol` | 23,801 (under) | 69,095 (+40%) | 🔴 | **Library extraction** + remove `type(...).creationCode` if any |
| 4 | `MerchantPortal.sol` | 26,091 (+6%) | under | 🟠 | Library extraction OR inline-helper extraction |
| 5 | `EcosystemVault.sol` | 25,683 (+4%) | under | 🟠 | Same |
| 6 | `VFIDEToken.sol` | 25,392 (+3%) | under | 🟡 | Optimizer tuning + small extractions |
| 7 | `future/SeerAutonomous.sol` | 24,645 (+0.3%) | under | 🟢 | Optimizer tuning alone may suffice |

## Why the deployer is so big

`contracts/vault/CardBoundVaultDeployer.sol` is only 146 source lines, but it
references `type(CardBoundVault).creationCode` and uses
`new CardBoundVault{salt:...}(...)`. The Solidity compiler must therefore
**embed the entire creation code of `CardBoundVault`** (54,177 bytes) into the
deployer's runtime code. This is a **derived** size violation: shrinking
`CardBoundVault` automatically shrinks the deployer.

**This means item #2 is the real work; #1 follows for free.**

## Refactor strategy: stateless library extraction

The standard, audited pattern for shrinking large contracts is:

1. Identify pure / view-mostly logic blocks that don't touch the contract's
   storage layout in a way that requires `this`.
2. Extract them into `library` contracts with `internal` (inlined, no extcall)
   or `external` (`delegatecall`-ed, code lives in a separate deployed contract)
   functions.
3. `external` libraries are the size win — their bytecode is **not** copied
   into the consumer contract; only a small `delegatecall` thunk is.
4. Storage layout in the host contract is **unchanged** (libraries only see
   storage refs we hand them).
5. Recompile, measure, iterate until under the limit with a buffer.

### Concrete extraction targets for `CardBoundVault`

The contract is 1,753 lines. Candidate library splits (preserving storage
layout, not introducing new state):

- `CardBoundVaultIntentLib` — EIP-712 digest computation, nonce/replay/
  deadline/chainId checks, signature recovery. Pure functions on calldata
  structs. Estimate: 6–9 KB savings.
- `CardBoundVaultGuardianLib` — guardian threshold checks, recovery vote
  tallies, guardian rotation cooldown logic. Estimate: 4–6 KB savings.
- `CardBoundVaultQueueLib` — withdrawal-queue index management, expiry
  housekeeping. Estimate: 2–3 KB savings.
- `CardBoundVaultViewLib` — heavy view aggregators (status snapshots,
  summary builders). Pure read of storage refs. Estimate: 3–4 KB savings.

Combined target: **~15–22 KB removed from `CardBoundVault.sol`**, putting it
comfortably under both limits.

### Concrete extraction targets for `VaultHub`

`VaultHub.sol` is only 670 lines but its initcode is 69 KB — meaning the
constructor or its inheritance graph pulls in heavy creation code. First
investigation step: check whether `VaultHub` itself uses
`type(SomethingHeavy).creationCode` — if yes, that's the real culprit.

- `VaultHubInheritanceLib` — the inheritance / next-of-kin / memorial-state
  helpers. Estimate: 3–5 KB savings.
- `VaultHubRecoveryLib` — force-recovery approval bookkeeping.
  Estimate: 2–4 KB savings.

### `MerchantPortal` (+1,515 bytes deployed)

Only 6% over. A single `MerchantPortalSettlementLib` extraction
(token validation, fee calculations, score-checks) should suffice.

### `EcosystemVault` (+1,107 bytes deployed)

Same scale as `MerchantPortal`. Extract `EcosystemVaultDistributionLib`
for the dispatch logic. Alternatively, raise `optimize-runs` to 1000+
and re-measure (but this trades runtime gas for size).

### `VFIDEToken` (+816 bytes deployed)

Smallest violation. Two viable approaches:

1. Extract `VFIDETokenPermitLib` (EIP-2612 permit logic) — clean, ~1 KB.
2. Tighten `optimize-runs` to a higher value (500–1000) — measure trade-off.

Recommendation: do **both** — option 2 first (free if it works), option 1
otherwise.

### `SeerAutonomous` (+69 bytes deployed)

Trivial. Either:
1. Bump `optimize-runs` slightly.
2. Inline one or two small `internal` functions.

## Rollout plan

This refactor must NOT be a single mega-PR. Recommended order, each as a
separate PR with full test pass + Slither-clean gate:

1. **PR-A (smallest): `SeerAutonomous` + `VFIDEToken`**
   - Lowest risk; proves the technique on production code.
   - 1–2 days of work + review.
2. **PR-B: `EcosystemVault` + `MerchantPortal`**
   - Medium risk; isolates settlement logic in libraries.
   - 2–3 days of work + review.
3. **PR-C: `VaultHub`** (the harder mid-tier)
   - Investigate the 69 KB initcode root cause first.
   - 3–5 days.
4. **PR-D: `CardBoundVault`** (the big one)
   - Multi-library split. Heaviest review burden because vault holds funds.
   - **External audit recommended specifically on PR-D** because it's the
     direct successor of the most security-critical contract.
   - 1–2 weeks of work + audit + soak.

Total realistic timeline: **3–6 weeks of engineering + audit**, not a
single afternoon.

## Acceptance gate (per PR)

For each refactor PR:

```bash
# 1. Compile clean — NO size warnings on any contracts/*.sol
npx hardhat compile 2>&1 | grep -E "exceeds (24576|49152) bytes" \
                     | grep -v "test/contracts/" \
  && { echo "FAIL: production contract still over limit"; exit 1; } \
  || echo "PASS: no production-size violations"

# 2. Slither still 0 findings (CI gate enforces this)
slither contracts --solc-args "--via-ir --optimize --optimize-runs 0" \
                  --json /tmp/slither.json
python3 -c "import json; assert len(json.load(open('/tmp/slither.json'))['results']['detectors'])==0"

# 3. Hardhat tests pass with NO new failures vs. baseline
npx hardhat test

# 4. Storage layout unchanged (CRITICAL — libraries must not shift slots)
forge inspect contracts/vault/CardBoundVault.sol:CardBoundVault storage > new.json
diff baseline.json new.json && echo "PASS: storage layout preserved"
```

## What I (the AI) am NOT going to do unsupervised

- I will **not** ship a multi-thousand-byte refactor of `CardBoundVault`
  in a single autonomous run. The cost of getting it wrong (lost funds,
  bricked vaults, storage-layout corruption) is higher than the cost of
  doing it carefully with a human reviewer in the loop.
- I will **not** raise `optimize-runs` blindly without measuring runtime
  gas impact — that's a deployment-cost tradeoff that needs user input.
- I will **not** modify `vault/CardBoundVaultDeployer.sol` directly — its
  size is a *consequence* of `CardBoundVault`'s size, not an independent
  issue.

## What I CAN do safely in a follow-up session

- **PR-A (Seer + VFIDEToken)** — small, mechanical, testable. Happy to do
  this autonomously with full test coverage.
- **Prepare the library skeletons** for PR-B, PR-C, PR-D so a human dev
  can finish them quickly.
- **Add a CI size-budget check** that fails the build on any production
  contract over the limit (so we don't regress on deferred items either).

## References

- EIP-170 (deployed code size limit, Spurious Dragon, 24,576 bytes):
  https://eips.ethereum.org/EIPS/eip-170
- EIP-3860 (initcode size limit, Shanghai, 49,152 bytes):
  https://eips.ethereum.org/EIPS/eip-3860
- Solidity docs on libraries:
  https://docs.soliditylang.org/en/v0.8.30/contracts.html#libraries
- "Diamond pattern" (alternative for very large contracts):
  https://eips.ethereum.org/EIPS/eip-2535
