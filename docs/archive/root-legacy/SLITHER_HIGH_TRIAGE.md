# Slither HIGH Triage — `mainnet-readiness/slither-high-triage`

**Branch:** `mainnet-readiness/slither-high-triage`
**Base:** `main` @ `2ce853bf` (post PR #232 merge)
**Status:** ✅ HIGH findings cleared (13 → 0), `npx hardhat compile` clean

## Summary

| Metric                       | Before | After | Δ    |
|------------------------------|-------:|------:|-----:|
| Slither HIGH                 |    13  |   0   | -13  |
| Slither MEDIUM               |    93  |  91   |  -2  |
| Slither LOW                  |   591  | 591   |   0  |
| Slither Informational        |   335  | 335   |   0  |
| Slither Optimization         |    39  |  39   |   0  |
| `npx hardhat compile`        | ❌ FAIL | ✅ PASS | ✓ |

## Toolchain blockers fixed before triage

### B-1 — `SharedInterfaces.sol` non-virtual functions
`grantRole`, `revokeRole`, `renounceRole` (and `hasRole`/`getRoleAdmin` for hygiene)
were not marked `virtual` in `AccessControl`, but `VFIDEAccessControl.sol`
declares them as `override`. solc rejected with:
```
TypeError: Trying to override non-virtual function. Did you forget to add "virtual"?
```
**Fix:** added `virtual` modifier on all 5 functions in `contracts/SharedInterfaces.sol`.

### B-2 — `hardhat.config.ts` invalid `suppressWarnings` key
The `OwnerControlPanel.sol` per-file override carried `suppressWarnings: ["2394"]`,
which is not part of the solc standard-JSON input schema. Hardhat 3.x rejected
it as `Unknown key "suppressWarnings"` (severity: error), aborting compile.
**Fix:** removed the key; replaced with an explanatory comment. The underlying
solc 0.8.30 false-positive "unreachable code" warning is harmless.

## HIGH findings — triage (all 13)

All findings analyzed individually; each is a Slither false positive arising
from detector limitations around well-formed defensive patterns. Suppressions
applied with detailed inline justification comments (not blanket disables).

| #  | Detector              | Location                                       | Resolution |
|----|-----------------------|------------------------------------------------|------------|
| 1  | `weak-prng`           | `CardBoundVault._emitRecoverySplitReminder`    | Suppress — `block.timestamp % 7` is a deterministic weekly-event gate, not randomness; no value transfer. |
| 2  | `arbitrary-send-erc20`| `VFIDEFlashLoan.flashLoan`                     | Suppress — ERC-3156 repayment mechanic; borrower must pre-`approve()`; entire tx atomic. |
| 3  | `reentrancy-balance`  | `VFIDEFlashLoan.flashLoan`                     | Suppress — `nonReentrant`; the balance compare is the FoT/repayment guard itself. |
| 4  | `reentrancy-balance`  | `VFIDEFlashLoan.deposit`                       | Suppress — `nonReentrant`; balance diff is FoT-token rejection guard. |
| 5  | `incorrect-exp`       | `FullMath.mulDiv` (Uniswap V3 vendored)        | Suppress — `(3 * d) ^ 2` is intentional bitwise XOR (Hensel's-lifting seed); `**` would break the algorithm. |
| 6  | `arbitrary-send-erc20`| `CommerceEscrow.markFunded`                    | Suppress — `from` is `e.buyerVault`, recorded at open() and re-validated against `VaultHub.vaultOf(buyerOwner)`; pull-based escrow. |
| 7  | `uninitialized-state` | `VaultRegistry.vaultsByPhoneHash`              | Suppress — Solidity mappings are implicitly empty; explicit init is impossible. |
| 8  | `uninitialized-state` | `VaultRegistry.vaultsByEmailHash`              | Suppress — same as #7. |
| 9  | `uninitialized-state` | `VaultRegistry.vaultsByRecoveryId`             | Suppress — same as #7. |
| 10 | `arbitrary-send-erc20`| `VFIDETermLoan.extractFromGuarantors`          | Suppress — `source` constrained by `_isValidGuarantorSource`; guarantors pre-`approve()` at co-sign time; collateral seizure mechanic. |
| 11 | `unchecked-transfer`  | `VFIDETermLoan.extractFromGuarantors`          | Suppress — return value intentionally not checked; replaced with stronger balance-diff verification + try/catch (handles silent-fail tokens). |
| 12 | `reentrancy-eth`      | `DAOTimelock.execute`                          | Suppress — `nonReentrant`; `op.done = true` BEFORE external call; cross-fn reentrancy targets are admin-gated; post-call `delete` is bookkeeping. |
| 13 | `reentrancy-eth`      | `DAOTimelock.executeBySecondary`               | Suppress — same rationale as #12. |

## Files changed (10)

```
contracts/CommerceEscrow.sol               |  9 +++++++++   (suppress markFunded)
contracts/DAOTimelock.sol                  | 24 ++++++++++++++++++++++++   (suppress execute, executeBySecondary)
contracts/SharedInterfaces.sol             | 10 +++++-----   (B-1: add virtual)
contracts/VFIDEFlashLoan.sol               | 30 ++++++++++++++++++++++++++++++   (suppress deposit, flashLoan)
contracts/VFIDETermLoan.sol                | 20 ++++++++++++++++++++   (suppress extractFromGuarantors)
contracts/VaultRegistry.sol                | 11 +++++++++++   (suppress 3 mappings)
contracts/libraries/uniswapv3/FullMath.sol |  9 +++++++++   (suppress mulDiv)
contracts/vault/CardBoundVault.sol         |  7 +++++++   (suppress _emitRecoverySplitReminder)
hardhat.config.ts                          | 10 ++++++----   (B-2: remove suppressWarnings)
```

## Reproducibility

```bash
# Toolchain
node --version    # v22.22.2
solc --version    # 0.8.30
slither --version # 0.11.5

# Compile
npx hardhat compile
# → "Compiled 128 Solidity files with solc 0.8.30"

# Slither (matches CI invocation)
slither contracts \
  --solc-remaps "@openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink @uniswap=node_modules/@uniswap @layerzerolabs=node_modules/@layerzerolabs hardhat=node_modules/hardhat" \
  --solc-args "--via-ir --optimize --optimize-runs 0" \
  --filter-paths "node_modules|test|mock|mocks|legacy" \
  --exclude naming-convention,solc-version,reentrancy-events,reentrancy-benign \
  --json /tmp/slither.json

# Verify HIGH = 0
jq '[.results.detectors[] | select(.impact=="High")] | length' /tmp/slither.json
# → 0
```

## Known follow-ups (NOT addressed in this PR)

1. **EIP-170 deployed-bytecode size warnings** on 6 production contracts — these
   are warnings, not errors; deployment will fail on mainnet but compile/slither
   succeed. Real refactor required as a separate PR. Sizes (with current
   `runs=0` + `revertStrings: "strip"` + `metadata.bytecodeHash: "none"` already
   applied):

   | Contract                              | Deployed | Initcode |
   |---------------------------------------|---------:|---------:|
   | `EcosystemVault.sol`                  | 25,576   | —        |
   | `VFIDEToken.sol`                      | 25,394   | —        |
   | `MerchantPortal.sol`                  | 26,091   | —        |
   | `future/SeerAutonomous.sol`           | 24,645   | —        |
   | `vault/CardBoundVault.sol`            | 28,573   | 52,765   |
   | `vault/CardBoundVaultDeployer.sol`    | 53,922   | 53,968   |

   `CardBoundVaultDeployer` requires structural redesign (currently embeds
   `type(CardBoundVault).creationCode` as a runtime constant for CREATE2
   prediction). All easy levers are already pulled.

2. **91 MEDIUM findings** — to be triaged in a follow-up PR.

3. **`reentrancy-events` and `reentrancy-benign`** are excluded by repo policy
   (existing `slither.config.json`). Not changed in this PR.
