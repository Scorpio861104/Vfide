# VFIDE Tooling & Analysis Index

Date: 2025-11-18
Status: INITIAL INVENTORY (Populate statuses as tools run)

## Purpose
Central reference for the 14 (optionally 15) testing, fuzzing, static, symbolic, and integration tools applied to the VFIDE contract suite. Links scope → assertions → expected artifacts → operational commands. Drives coverage, security assurance, and audit sign‑off. No fee logic beyond burn distribution; VFIDE does not insure or replace lost funds.

## Core Contracts & Modules
- VFIDEToken: Burn routing, vault-only transfers, ProofScore-dependent behavior.
- VFIDECommerce: MerchantRegistry + CommerceEscrow (refund/dispute thresholds, auto-suspend, strike logic).
- VFIDEFinance: (Assumed) deposit/withdrawal w/ score constraints, vault interactions.
- VFIDETrust: (Assumed) trust attestations, revocation, score gating.
- Shared External Interfaces (Mocks): VaultHub, Seer, ProofLedger, SecurityHub.

## Tool Categories
1. Unit & Integration (Hardhat / Foundry)
2. Fuzz / Property (Echidna / Medusa / Custom harness scripts)
3. Static & Symbolic (Slither / Mythril)
4. Structural & Metrics (Solidity-Coverage / Surya / Contract Sizer / Gas Reporter)
5. Alternate Compilation & Execution (zkSync path)
6. External Monitoring / Simulation (Tenderly – optional)
7. System Integration (SecurityHub scenario tests)

## Tool Matrix
| # | Tool | Type | Primary Scope | Key Assertions | Artifacts | Frequency |
|---|------|------|---------------|----------------|-----------|-----------|
| 1 | Hardhat Tests | Unit/Integr. | All core contracts | Functional invariants, event emission, role paths | `foundry-test-results.txt`, `hardhat-test-results.txt` | CI per push |
| 2 | Foundry (forge) | Unit/Fuzz | Token, Commerce, Finance, Trust | Differential parity with Hardhat, fuzz branches | `foundry-fuzz-*.txt` | CI per push |
| 3 | Echidna | Property Fuzz | Token, Commerce | Supply invariant, vault-only transfer, auto-suspend thresholds | `echidna-*.txt` | Scheduled / on demand |
| 4 | Medusa | Stateful Fuzz | Finance, Trust, Commerce Escrow | Sequenced escrow states, deposit/withdraw ranges | `medusa-*.txt` | Scheduled |
| 5 | Mythril | Symbolic | Each contract individually | Reentrancy, integer overflow, tx origin misuse | `mythril-*.txt` | Nightly |
| 6 | Slither | Static | Full repo | Reentrancy, shadowing, complexity, dead code | `slither-report.txt` | CI per push |
| 7 | Solidity-Coverage | Coverage | Hardhat suite | Branch/function/statement % (esp. Commerce helpers) | `coverage.json`, `coverage-full-report.txt` | CI on demand |
| 8 | Surya | Structural | All contracts | Call graph, inheritance, modifiers mapping | `surya-graph.txt` | Weekly / on change |
| 9 | Contract Sizer | Metrics | Deployment-target contracts | Size within limits (exclude test helpers) | `contracts-size.txt` | CI per push |
|10 | Gas Reporter | Metrics | High-usage tx paths | Gas cost regression detection | `gas-report.txt` | CI per push |
|11 | zkSync Compile Path | Alt Compile | Token, Commerce | Compatibility / size / opcodes diff | `zksync-compile.txt` | Optional branch |
|12 | Tenderly (optional) | Simulation | Critical flows | Execution trace, storage diff, event timeline | External dashboard | Manual |
|13 | Custom Fuzz Harness | Fuzz | Finance, Trust edge paths | Complex multi-call sequences w/ score gating | `custom-fuzz-results.txt` | On demand |
|14 | SecurityHub Integration | Integration | Token + Commerce w/ locked vault | Proper revert / event logging on lock toggles | `securityhub-integration.txt` | CI per push |
|15 | Aggregator Script | Reporting | All above | Consolidated status & deltas | `/reports/latest/*` | CI per push |

(Note: #15 is organizational; functional tools counted as the original 14.)

## Contract-Specific Assertions
### VFIDEToken
- Invariant: Total supply reduces exactly by burn portion, cannot inflate via vault-only bypass.
- Fee Split: Burn router allocates categories (Permanent Burn, Governance, Ecosystem, Merchant, Sanctum) sum matches input.
- Access: Only approved vaults can initiate restricted transfers.
- Score Influence: ProofScore influences dynamic fee tiers (if implemented) without bypassing caps.

### VFIDECommerce (MerchantRegistry + CommerceEscrow)
- Merchant Add: Emits registration event; initial strikes=0, refunds=0, disputes=0.
- Auto-Suspend: Hit threshold T (refunds + disputes weighted) => status transitions to SUSPENDED.
- Strike Removal: Honest resolution reduces strike count; never underflow.
- Escrow Lifecycle: OPEN → FUNDED → RELEASED/REFUNDED/DISPUTED → RESOLVED preserves single terminal outcome.
- Dispute Window: Only disputable before terminal resolution.

### VFIDEFinance (Assumed Design — refine when code present)
- Deposit Constraints: Amount > 0 and within configured limits.
- Withdrawal Score Gate: ProofScore must meet minimum threshold.
- Rate Accrual: Interest / rewards mutation monotonic (if applicable).

### VFIDETrust (Assumed Design)
- Attestations: Unique issuer-target pairs; revocation resets only target-specific state.
- Score Impact: Trust revocation cannot inflate ProofScore.

## Tool → Assertion Mapping Highlights
| Tool | Token | Commerce | Finance | Trust |
|------|-------|----------|---------|-------|
| Hardhat | Core flows | Registry + escrow | Basic deposits/withdraw | Attest + revoke |
| Foundry | Fuzz fee math | Escrow state fuzz | Deposit/withdraw fuzz | Attestation permutations |
| Echidna | Supply invariant | Auto-suspend thresholds | (Later) deposit caps | (Later) trust uniqueness |
| Medusa | Complex burn sequences | Escrow multi-step race | Multi-call finance ops | Chained attest/revoke |
| Mythril | Overflow / auth | Reentrancy / state ordering | Arithmetic checks | Access control |
| Slither | Global patterns | Dead code helpers | Storage packing | Naming/shadowing |
| Coverage | Branch fee logic | Helper branches | Lifecycle branches | Score gating branches |
| Surya | Call graph sanity | Modifier ordering | Cross-module relationships | Graph cycles detection |

## Status Placeholders
Populate pass/fail and coverage % after initial runs:
- Hardhat: TBD
- Foundry: TBD
- Echidna: TBD
- Medusa: TBD
- Mythril: TBD
- Slither: TBD
- Coverage: TBD
- Surya: TBD
- Contract Sizer: TBD
- Gas Reporter: TBD
- zkSync: TBD
- Tenderly: TBD / Optional
- Fuzz Harness: TBD
- SecurityHub Integration: TBD
- Aggregator: Pending

## Command Cheatsheet (to be validated once configs updated)
```bash
# Hardhat tests
npm test

# Foundry build & tests
forge build
forge test -vv

# Coverage (disable viaIR if necessary via env)
COVERAGE=1 npx hardhat coverage

# Echidna (example)
echidna-test . --config echidna.yaml --contract VFIDEToken

# Medusa
medusa fuzz --config medusa.json

# Mythril
myth analyze contracts/VFIDEToken.sol -o json > mythril-VFIDEToken.txt

# Slither
slither . --print human-summary > slither-report.txt

# Surya graph
surya graph contracts/*.sol | dot -Tpng > surya-graph.png

# Contract sizer (Hardhat plugin assumed)
REPORT_SIZE=1 npx hardhat size-report > contracts-size.txt

# Gas reporter
GAS_REPORT=1 npm test > gas-report.txt

# zkSync compile (example)
npx hardhat compile --network zksync

# Aggregator script (placeholder)
./scripts/aggregate.sh
```

## Next Steps
1. Normalize compiler & tool configs (todo #2).
2. Run baseline Hardhat & Foundry to populate initial status table.
3. Introduce property tests (Echidna) and stateful fuzz (Medusa) focusing on highest-risk transitions.
4. Parallel static/symbolic (Slither/Mythril) → triage & patch.
5. Aggregate and publish consolidated report; feed into FINAL-14-TOOL-ECOSYSTEM-STATUS.

## Conventions
- All invariants phrased positively; failing case triggers revert or test assertion.
- No tool may alter production code semantics (only add test-only helpers or harness wrappers if strictly required).
- Coverage instrumentation avoided for foundry fuzz (keep fidelity).

## Disclaimers
- VFIDE economic model uses only burn-derived distributions; no registration or hidden fees.
- Sanctum vault allocation earmarked for humanitarian/charity—non-custodial expectation for users.
- No insurance functions: losses from user error or external exploit are not reimbursed.

---
Initial inventory complete. Update statuses as each tool run stabilizes.
