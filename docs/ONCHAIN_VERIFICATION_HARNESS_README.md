# On-Chain Verification Harness — what this is and how to run it

## TL;DR
This harness turns the five Solidity audits (Core Ownership, Recovery, Trust, Governance, Seer) from
**source-level + logic-model** evidence into a **compiled, runnable on-chain evidence chain**. It is the
"required next step" every on-chain cert flagged.

**It has NOT been run in the audit environment** — solc 0.8.30's download is blocked here and the verify-scripts
need a local node (also blocked). Everything below is staged to run where those exist. Do not treat any of it
as passing until you run it.

## Contents
1. **`docs/ONCHAIN_VERIFICATION_MANIFEST.md`** — maps every audited invariant → the specific hardhat test or
   verify-script that proves it (most already existed in `test/hardhat/`), and names the one coverage gap.
2. **`test/hardhat/SeerVerdictIgnoredBoundary.test.ts`** (NEW) + **`test/contracts/mocks/SeerAutonomousBoundaryMocks.sol`**
   (NEW) — fills that gap: proves the vault IGNORES a Frozen Seer verdict (and survives a reverting Seer hook)
   while a signed payment still executes. This is the crux the Seer cert rested on, previously source-only.
3. **`scripts/run-onchain-audit-verification.ts`** (NEW) — a runner that executes the audit-critical subset and
   prints a PASS/FAIL summary grouped by audit, so a green run is a traceable evidence chain back to the certs.

## How to run (compiler-equipped environment)
```bash
# 1. Compile (downloads solc 0.8.30 — this is the step blocked in the audit sandbox)
npm run contract:compile

# 2. Run the audit-critical tests (no RPC needed)
NODE_OPTIONS='--import tsx' tsx scripts/run-onchain-audit-verification.ts

# 3. Full coverage incl. invariant verify-scripts (needs a node at 127.0.0.1:8545)
#    e.g. in one shell:  npx hardhat node
#    then:
NODE_OPTIONS='--import tsx' tsx scripts/run-onchain-audit-verification.ts --with-scripts

# Or just run everything hardhat knows about:
npm run contract:test
```

## What a green run establishes
- The non-custodial invariant holds against the **real bytecode**, not just source: no-freeze (NonCustodial),
  recovery theft-resistance (R-8 + claim suites), inheritance threat model, fee-curve bounds, fraud-jury
  fairness, emergency/treasury timelocks, and — newly — **Seer's verdict cannot block or brick fund movement.**
- Each result maps 1:1 to a row in the manifest, which maps to a cert section.

## What it does NOT do
- It does not replace a professional third-party audit; it operationalizes the in-house audit findings.
- It was not executed here. The new test/mock were written against current signatures (CardBoundVault 14-arg
  ctor, `setSeerAutonomous` via admin facet, `beforeAction(address,uint8,uint256,address)`) mirrored from a
  known-good suite, and the project TypeScript typechecks at 0 errors — but the Solidity has not been compiled
  in this environment. A green `contract:test` is the confirmation.

## If the new Seer-boundary test fails to compile/run
The most likely cause is constructor-arity drift. The fixture mirrors `MerchantPayIntentEdgeCases.test.ts`
(kept in lockstep with the live constructor); diff against it and align the args. The assertions themselves are
minimal and stable: a signed payment moves the merchant balance and increments the vault nonce regardless of
the Seer verdict.
