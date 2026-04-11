# VFIDE Mainnet Readiness — Final Assessment

**Date:** April 11, 2026
**Repo:** Vfide-main (upload 8)
**Scale:** 109 contracts · 33K Solidity LOC · 233K frontend LOC · 101 pages · 116 API routes

---

## Verdict: NOT YET — 3 categories of work remain

1. **SecurityHub removal** (previously completed, not merged into this repo)
2. **Deploy script is broken** (9 of 13 constructor calls have wrong args)
3. **Dead code cleanup + external audit**

Everything below is organized by severity.

---

## 🔴 BLOCKERS — Deploy will fail or mainnet is unsafe without these

### B-1. SecurityHub plumbing was never removed

The SecurityHub removal completed in our April 11 session was not merged into this upload. All 10 contracts still carry dead SecurityHub state vars, constructor params, events, and setter functions. The cleaned zip was delivered as `Vfide-main.zip` — its changes need to be applied to this repo.

**What SecurityHub actually does in this repo:** Nothing dangerous. `isLocked()` is never called. The only active calls are two `try securityHub.registerVault(vault) {} catch {}` in VaultHub (line 271) and VaultInfrastructure (line 1276) — both are no-ops wrapped in try/catch. But the dead plumbing:

- Wastes constructor gas and deployment complexity (every vault-layer contract needs a SecurityHub address param)
- Creates false audit surface (auditors will spend hours tracing a module that does nothing)
- Leaves `setSecurityHub`/`applySecurityHub` functions that could re-enable locking if called post-deploy

**Fix:** Merge the SecurityHub removal zip, or re-apply the changes from our session. Files affected: CardBoundVault, DevReserveVestingVault, MerchantPortal, VFIDEToken, OwnerControlPanel, SharedInterfaces, VFIDECommerce, VaultHub, VaultInfrastructure, Seer, deploy-all.ts.

---

### B-2. Deploy script has 9 of 13 wrong constructor calls

The deploy script (`scripts/deploy-all.ts`) would crash on the **first** contract. Here is every mismatch:

| Contract | Constructor signature | Script passes | Issue |
|---|---|---|---|
| DevReserveVestingVault | `(vfide, beneficiary, vaultHub, securityHub, ledger, allocation, dao)` — 7 params | `(deployer, deployer, 0x0, 0x0, 31536000, 7776000)` — 6 params | Missing `allocation` (50M) and `dao`. Numbers passed where addresses expected. |
| VaultHub | `(vfideToken, securityHub, ledger, dao)` — 4 params | `(deployer, deployed.VFIDEToken)` — 2 params | Only 2 of 4 args. `deployer` in `vfideToken` slot. |
| MerchantPortal | `(dao, vaultHub, seer, securityHub, ledger, feeSink)` — 6 params | `(VFIDEToken, VaultHub, Seer, ProofLedger, deployer)` — 5 params | Missing `securityHub` and `feeSink`. VFIDEToken in `dao` slot. |
| FeeDistributor | `(token, burn, sanctum, daoPayroll, merchantPool, headhunterPool, admin)` — 7 params | 6 params | Missing `admin` (7th param). |
| ProofScoreBurnRouter | `(seer, sanctumSink, burnSink, ecosystemSink)` — 4 params | `(VFIDEToken, Seer, deployer, deployer, deployer)` — 5 params | Extra param. VFIDEToken not in constructor at all. |
| DAOTimelock | `(admin)` — 1 param | `(deployer, ProofLedger)` — 2 params | Extra param. |
| DAO | `(admin, timelock, seer, hub, hooks)` — 5 params | `(DAOTimelock, Seer, VaultHub, ProofLedger)` — 4 params | Missing `admin` and `hooks`. |
| VFIDEFlashLoan | `(vfideToken, dao, seer, feeDistributor)` — 4 params | `(VFIDEToken, deployer)` — 2 params | Missing `seer` and `feeDistributor`. |
| VFIDETermLoan | `(token, dao, seer, vaultHub, feeDist)` — 5 params | `(VFIDEToken, Seer, VaultHub, deployer)` — 4 params | Missing `dao`. Seer occupies `dao` slot. |

**Correct calls (4 of 13):**

| Contract | Status |
|---|---|
| ProofLedger | ✅ `(deployer)` |
| VFIDEToken | ✅ `(DevReserve, treasury, 0x0, ProofLedger, treasurySink)` |
| Seer | ✅ `(deployer, ProofLedger, 0x0)` |
| FraudRegistry | ✅ `(deployer, Seer, VFIDEToken)` |
| VFIDETestnetFaucet | ✅ `(VFIDEToken, deployer)` |

**Fix:** Rewrite every `deploy()` call to match the actual Solidity constructor. Add a comment per param.

---

### B-3. 98 lines of dead code after `revert` in VaultHub

**File:** `contracts/VaultHub.sol`

Three functions have `revert("VH: force recovery disabled - non-custodial")` as their first statement, followed by 42, 23, and 33 lines of unreachable code respectively:

- `approveForceRecovery` (~line 268) — 42 dead lines
- `requestDAORecovery` (~line 348) — 23 dead lines
- `finalizeDAORecovery` (~line 376) — 33 dead lines

**Fix:** Delete all code after each `revert` statement, or replace each function body with just the revert.

---

### B-4. Dead `SecurityHub` contract in VFIDESecurity.sol

**File:** `contracts/VFIDESecurity.sol` line 535+

The entire `contract SecurityHub { ... }` is deployed by nothing and referenced by nothing. It should be removed.

Additionally, `PanicGuard` (same file, line 278+) still has `securityHub` address field (line 293), `setSecurityHub` (line 336), and an auth check referencing it (line 342). If PanicGuard is in the mainnet deploy graph, these need cleaning. If not, consider removing PanicGuard too.

---

### B-5. `ISecurityHub` interface is dead in SharedInterfaces.sol

**File:** `contracts/SharedInterfaces.sol` lines 76-79

After SecurityHub removal, this interface has zero consumers. Remove it.

---

### B-6. Full `hardhat compile` — zero errors, zero warnings

Cannot verify in this environment. Must be run locally after all fixes. This is the compilation gate.

---

### B-7. External security audit

109 contracts / 33K LOC with novel architecture. No independent firm has reviewed. This is non-negotiable for mainnet DeFi. Recommended: Trail of Bits, OpenZeppelin, Cyfrin, or Spearbit. Minimum scope: VFIDEToken, CardBoundVault, VaultHub, ProofScoreBurnRouter, FeeDistributor, FraudRegistry, SystemHandover, OwnerControlPanel.

---

## 🟡 HIGH PRIORITY — Should fix before mainnet

### H-1. Unbounded loop in CardBoundVault._queueWithdrawal

**File:** `contracts/CardBoundVault.sol` ~line 562

```solidity
for (uint256 i = 0; i < withdrawalQueue.length; i++) {
    if (!withdrawalQueue[i].executed && !withdrawalQueue[i].cancelled) active++;
}
```

Mitigated by `MAX_QUEUED = 20` — worst case scans 20 entries (historical + active). Acceptable but not ideal. A counter variable would be cleaner and more gas efficient.

### H-2. Fee bypass has no DAO veto

Owner can unilaterally `setFeeBypass(true, 7 days)`, disabling all burn/sanctum/ecosystem fees for a week. 1-day cooldown between activations exists, but no DAO approval gate. Acceptable if SystemHandover burns owner keys at 6 months.

### H-3. Orphaned WithdrawalQueue abstract contract

`contracts/WithdrawalQueue.sol` exists with its own implementation but `CardBoundVault` has an independent inline version. Two implementations = auditor confusion. Delete the standalone or wire it via inheritance.

### H-4. Frontend ABI parity

After SecurityHub removal, the following ABIs change:
- `OwnerControlPanel.token_setModules` loses `security` param
- `OwnerControlPanel.vault_setModules` loses `security` param
- Constructor ABIs change for 7+ contracts

Run `scripts/verify-frontend-abi-parity.ts` after contract changes. Regenerate all ABIs.

### H-5. Multisig for deployer/owner

Deploy script uses `deployer.address` for DAO, treasury, and every sink. Mainnet requires:
- Gnosis Safe multisig (3-of-5 minimum)
- Real sink addresses for sanctum/treasury/ecosystem
- Ownership transfer to multisig for all contracts
- Verification that all transfers completed

### H-6. Wiring step needs an apply script

The deploy script proposes module setters (48h timelock) but there's no `apply-all.ts` script. After 48 hours you need to call `applyVaultHub()`, `applyBurnRouter()`, `applyFraudRegistry()`, etc. This should be scripted, not manual.

---

## 🟢 MEDIUM PRIORITY — Fix before or shortly after launch

### M-1. Testnet soak period (2 weeks minimum)

Deploy to Base Sepolia with the corrected deploy script. Execute all flows:
- Vault creation → payment → fee distribution
- Guardian setup → wallet rotation → recovery
- Withdrawal queue: queue → wait 7 days → execute; queue → cancel
- FraudRegistry: complaint → threshold → 30-day escrow completion
- DAO proposal → vote → timelock → execute
- MerchantPortal: register → payment → refund
- FeeDistributor: accumulate → distribute → verify 35/20/15/20/10 split
- SystemHandover: arm → (test time) → execute

### M-2. Contract verification on block explorer

All contracts must be source-verified on Basescan. Add `--verify` to deploy or run `npx hardhat verify` post-deploy.

### M-3. Emergency runbook

Document: circuit breaker activation, fee bypass, vault pause (via guardians), DAO emergency proposal, and contract upgrade path (currently non-upgradeable — document this explicitly).

### M-4. Gas cost benchmarks

Benchmark on Base mainnet fork: vault creation, token transfer with fees, guardian signature verification, withdrawal queue operations, DAO vote. Document expected USD costs.

### M-5. API rate limiting

116 API routes with no evidence of rate limiting. Faucet and referral endpoints especially need per-wallet cooldowns enforced server-side.

### M-6. SystemHandover integration test

Simulate: arm → wait 180 days → execute → verify all ownership transfers. Test extension and abort paths. Verify behavior when no council exists.

---

## ✅ VERIFIED CLEAN — No action needed

| Item | Status | Detail |
|---|---|---|
| C-1: ProofScore-to-Vault mismatch | ✅ Fixed | `_resolveFeeScoringAddress()` resolves vault→owner via `vaultHub.ownerOfVault()` |
| Non-custodial guarantees | ✅ Solid | No freeze, no blacklist, no force recovery (disabled via revert), SecurityHub `isLocked()` never called in `_transfer` |
| Fee sink validation (F-17) | ✅ Solid | All BurnRouter-returned sinks validated against token config. Fee sum capped at transfer amount. |
| Reentrancy guards | ✅ Present | 408 `nonReentrant` instances. All state-changing external calls guarded. |
| Zero-address checks | ✅ Present | All constructors checked: VFIDEToken, CBV, VaultHub, MerchantPortal, FraudRegistry, FeeDistributor, EscrowManager, CircuitBreaker, SanctumVault |
| No `tx.origin` | ✅ Clean | Zero instances |
| No `selfdestruct` | ✅ Clean | Zero instances |
| No `delegatecall` | ✅ Clean | Zero instances |
| No hardcoded addresses | ✅ Clean | Only constant badge hashes |
| Presale removed | ✅ Confirmed | Zero references |
| ERC20 compliance | ✅ Complete | `increaseAllowance`, `decreaseAllowance`, `permit` (EIP-2612) |
| Token supply | ✅ Hardcapped | `MAX_SUPPLY = 200M`, enforced in `_mint`. 50M dev reserve vested 5 years. 35% fees burned. |
| FraudRegistry | ✅ Non-custodial | 30-day escrow, not freeze. DAO can clear false flags. |
| WithdrawalQueue | ✅ Functional | 7-day delay, MAX_QUEUED=20, queue/execute/cancel all implemented |
| Permit frontrun | ✅ Safe | Standard EIP-2612 implementation with nonce |
| Hardhat config | ✅ Ready | Base mainnet (chainId 8453) and Base Sepolia (84532) configured with Basescan verification |

---

## Deploy Sequence (after all blockers resolved)

```
 1. Merge SecurityHub removal zip from our April 11 session
 2. Rewrite deploy-all.ts to match actual constructor signatures
 3. Write apply-all.ts for post-48h wiring finalization
 4. Delete dead code (VaultHub revert tails, SecurityHub contract, ISecurityHub interface)
 5. npx hardhat compile                     → zero errors, zero warnings
 6. npx hardhat test                        → all tests pass
 7. Deploy to Base Sepolia                  → full testnet run
 8. Execute testnet soak flows              → 2-week minimum
 9. Engage external auditor                 → 4-8 week timeline
10. Address audit findings
11. Deploy Gnosis Safe multisig             → 3-of-5 minimum
12. Deploy contracts to Base mainnet        → via corrected deploy-all.ts
13. Verify all contracts on Basescan
14. Transfer ownership to multisig
15. Set real sink addresses (sanctum, treasury, ecosystem)
16. Arm SystemHandover                      → 6-month countdown
17. Wait 48h for wiring timelocks
18. Run apply-all.ts                        → finalize module wiring
19. Announce mainnet
```

---

## Contract Dependency Graph (deploy order)

```
Layer 1 — Foundation
  ProofLedger(admin)
  DevReserveVestingVault(vfide, beneficiary, vaultHub, ledger, 50_000_000e18, dao)
  VFIDEToken(devReserve, treasury, vaultHub=0x0, ledger, treasurySink)

Layer 2 — Trust Engine
  Seer(dao, ledger, hub=0x0)
  ProofScoreBurnRouter(seer, sanctumSink, burnSink, ecosystemSink)

Layer 3 — Vault System
  VaultHub(vfideToken, ledger, dao)

Layer 4 — Commerce
  FeeDistributor(token, burn, sanctum, daoPayroll, merchantPool, headhunterPool, admin)
  MerchantPortal(dao, vaultHub, seer, ledger, feeSink)

Layer 5 — Governance
  DAOTimelock(admin)
  DAO(admin, timelock, seer, hub, hooks)

Layer 6 — Finance
  VFIDEFlashLoan(vfideToken, dao, seer, feeDistributor)
  VFIDETermLoan(token, dao, seer, vaultHub, feeDist)

Layer 7 — Safety
  FraudRegistry(dao, seer, vfideToken)
  SystemHandover(all contracts to transfer)

Testnet only
  VFIDETestnetFaucet(vfideToken, owner)
```

*Note: Constructor signatures shown here reflect the post-SecurityHub-removal state. Current repo still has `securityHub` params — merge the removal zip first.*
