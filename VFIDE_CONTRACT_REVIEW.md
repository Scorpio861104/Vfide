# VFIDE Contract Review

**Purpose.** For every contract in scope, document:
- What it does (plain language)
- Its complete external/public surface
- What state it owns and what it interacts with
- The threat model and existing defenses
- Test coverage that exists and gaps that don't
- Findings: bugs, dead code, unintended power, missing checks

**Scope.** 48 contracts (45 top-level + 3 service pools). Interfaces (27) reviewed lightly since they contain no logic. `contracts/future/` deferred per project decision. `contracts/legacy/` and `contracts/mocks/` excluded.

**Status legend.**
- ✅ Reviewed clean — no findings
- 🟡 Reviewed with notes — non-blocking observations
- 🔴 Reviewed with findings — needs action
- ⏳ Not yet reviewed

**Approach.** Read first, judge second. For each contract, the goal is "I understand exactly what this does and why every line is there." Findings get cataloged here for later remediation.

---

## Master Status Table

| # | Contract | LOC | Status | Critical |
|---|---|---|---|---|
| 1 | VFIDEToken | 1468 | 🟡 | Yes |
| 2 | CardBoundVault | ~1611 | ⏳ | Yes |
| 3 | VaultRecoveryClaim | ~857 | ⏳ | Yes |
| 4 | CardBoundVaultAdminManager | – | ⏳ | Yes |
| 5 | CardBoundVaultInheritanceManager | – | ⏳ | Yes |
| 6 | CardBoundVaultWithdrawalQueueManager | – | ⏳ | Yes |
| 7 | CardBoundVaultPaymentQueueManager | – | ⏳ | Yes |
| 8 | CardBoundVaultDeployer | – | ⏳ | Yes |
| 9 | VaultHub | – | ⏳ | Yes |
| 10 | VaultRegistry | – | ⏳ | Yes |
| 11 | VaultInfrastructure | – | ⏳ | Yes |
| 12 | FeeDistributor | – | ⏳ | Yes |
| 13 | ServicePool | – | ⏳ | Yes |
| 14 | pools/DAOPayrollPool | – | ⏳ | Yes |
| 15 | pools/MerchantCompetitionPool | – | ⏳ | Yes |
| 16 | pools/HeadhunterCompetitionPool | – | ⏳ | Yes |
| 17 | SanctumVault | – | ⏳ | Yes |
| 18 | ProofLedger | – | ⏳ | Yes |
| 19 | ProofScoreBurnRouter | – | ⏳ | Yes |
| 20 | Seer | – | ⏳ | Yes |
| 21 | VFIDECommerce | – | ⏳ | Yes |
| 22 | EscrowManager | – | ⏳ | Yes |
| 23 | MerchantPortal | – | ⏳ | Med |
| 24 | FraudRegistry | – | ⏳ | Med |
| 25 | DAO | – | ⏳ | Yes |
| 26 | DAOTimelock | – | ⏳ | Yes |
| 27 | DutyDistributor | – | ⏳ | Med |
| 28 | EcosystemVault | – | ⏳ | Yes |
| 29 | EcosystemVaultLib | – | ⏳ | Lib |
| 30 | EcosystemVaultView | – | ⏳ | View |
| 31 | LiquidityIncentives | – | ⏳ | Yes |
| 32 | DevReserveVestingVault | – | ⏳ | Yes |
| 33 | VFIDEFinance | – | ⏳ | Med |
| 34 | VFIDETermLoan | – | ⏳ | Med |
| 35 | VFIDEFlashLoan | – | ⏳ | Med |
| 36 | VFIDEPriceOracle | – | ⏳ | Med |
| 37 | PayrollManager | – | ⏳ | Med |
| 38 | StablecoinRegistry | – | ⏳ | Med |
| 39 | RevenueSplitter | – | ⏳ | Med |
| 40 | EmergencyControl | – | ⏳ | Yes |
| 41 | CircuitBreaker | – | ⏳ | Med |
| 42 | AdminMultiSig | – | ⏳ | Yes |
| 43 | OwnerControlPanel | – | ⏳ | Med |
| 44 | SystemHandover | – | ⏳ | Med |
| 45 | GovernanceHooks | – | ⏳ | Med |
| 46 | VFIDEAccessControl | – | ⏳ | Yes |
| 47 | DeployPhase3Peripherals | – | ⏳ | Deploy |
| 48 | SharedInterfaces | – | ⏳ | Interface |

---

## 1. VFIDEToken.sol

**LOC.** 1468
**Status.** 🟡 Reviewed with notes
**Criticality.** Maximum — this is the value substrate of the entire protocol.

### What it does

ERC-20 token implementing the VFIDE token: 200M fixed supply, no minting after genesis, 50M to dev reserve vesting vault, 150M to treasury. Includes burn-on-transfer fees routed through ProofScoreBurnRouter, vault-only enforcement to ensure VFIDE flows only between VFIDE vaults (not random EOAs), EIP-2612 permit, anti-whale limits, fraud-registry escrow integration, and an extensive timelocked admin surface for safely updating system addresses.

### Genesis distribution (verified correct)

- `MAX_SUPPLY = 200_000_000e18`
- `DEV_RESERVE_SUPPLY = 50_000_000e18`
- Dev reserve goes to `devReserveVestingVault` (a contract, verified by `extcodesize > 0` in constructor)
- Remaining 150M (`MAX_SUPPLY - DEV_RESERVE_SUPPLY`) goes to `treasury` (also required to be a contract)
- Both addresses exempt from whale limits at genesis (correct — system addresses need to move large amounts)

### Constants
| Constant | Value | Notes |
|---|---|---|
| `MAX_SUPPLY` | 200,000,000 × 1e18 | Fixed forever |
| `DEV_RESERVE_SUPPLY` | 50,000,000 × 1e18 | 25% of supply |
| `decimals` | 18 | Standard |
| `MAX_CIRCUIT_BREAKER_DURATION` | 7 days | Bound on circuit breaker activation |
| `FEE_BYPASS_COOLDOWN` | 7 days | Bound between fee-bypass invocations |
| `SINK_CHANGE_DELAY` | 48 hours | Timelock on sink address updates |

### External/public surface (76 functions)

**ERC-20 standard:**
- `balanceOf(address)` → uint256
- `allowance(address, address)` → uint256
- `approve(address, uint256)` → bool
- `increaseAllowance(address, uint256)` → bool
- `decreaseAllowance(address, uint256)` → bool
- `transfer(address, uint256)` → bool (nonReentrant)
- `transferFrom(address, address, uint256)` → bool (nonReentrant)
- `burn(uint256)` (nonReentrant) — voluntary burn

**EIP-2612 permit:**
- `DOMAIN_SEPARATOR()` → bytes32
- `permit(...)` — standard EIP-2612

**Owner-only timelocked setters (propose/apply/cancel pattern):**
Each of these has 3 functions: `setX` (propose), `applyX` (after timelock), `cancelX`. The set covers:
- VaultHub address
- EmergencyBreaker address
- SeerAutonomous address
- Ledger (ProofLedger) address
- BurnRouter (ProofScoreBurnRouter) address
- TreasurySink address
- SanctumSink address
- EcosystemDistributor address
- FraudRegistry address
- VaultOnly disable (one-way once policy locked)
- AntiWhale parameters
- WhaleLimitExempt per-address
- FeeBypass + CircuitBreaker (different semantics, also timelocked)

**Owner-only proposal/confirm pattern (separate from set/apply):**
- `proposeSystemExempt` / `confirmSystemExempt` / `cancelPendingExempt`
- `proposeWhitelist` / `confirmWhitelist` / `cancelPendingWhitelist`

**Public view helpers:**
- `isCircuitBreakerActive()` — true if circuit breaker is active
- `isFeeBypassed()` — true if fees are currently being bypassed
- `getExpectedNetAmount(from, to, amount)` — preview net amount after fees
- `remainingDailyLimit(account)` — preview remaining daily limit
- `cooldownRemaining(account)` — preview cooldown timer
- `canTransfer(from, to, amount)` → (bool, reason) — preview entire check
- `previewTransferFees(from, to, amount)` — detailed fee breakdown preview
- `totalBurnedToDate()` — cumulative burn counter
- `transactionFeesProcessed()` — cumulative fee counter

**Public maintenance:**
- `syncEmergencyFlags()` — anyone can clear expired emergency state (good — gas griefing irrelevant since it's permissionless)
- `lockPolicy()` — one-way; once locked, vault-only cannot be disabled

**Renounced:**
- `renounceOwnership()` — REVERTS. Ownership cannot be renounced.

### Storage state

- `_balances`, `_allowances` — standard ERC-20
- `totalSupply` — set once at genesis
- `vaultHub`, `emergencyBreaker`, `seerAutonomous`, `ledger`, `burnRouter`, `treasurySink`, `sanctumSink`, `ecosystemDistributor`, `fraudRegistry` — module addresses
- Their `pending*` variants for the timelock pattern
- `vaultOnly` — default `true` (vault-only mode ON at genesis — correct)
- `policyLocked` — default `false`, set once via `lockPolicy()`
- `feeBypass`, related state — emergency switch
- `systemExempt`, `whitelisted`, `whaleLimitExempt` — exemption mappings
- `dailyTransferred`, `windowStart` per-address — daily limit tracking
- `lastTransferAt` per-address — cooldown tracking
- `_cachedDomainSeparator`, `_cachedChainId` — EIP-712 caching
- Plus various `pending*` slots for timelock proposals

### Transfer flow analysis (the load-bearing path)

Reading `_transfer` carefully. The flow is:
1. **Zero checks** at the top (zero address, zero amount, self-transfer)
2. **Vault redirect for EOA recipients** — if vaultOnly is on and recipient is an EOA with a vault, redirect to their vault. Otherwise revert.
3. **Fraud escrow check** — if registry says sender requires escrow, route through registry contract instead of direct delivery
4. **Anti-whale checks** — daily limit, cooldown, max-per-transfer, max-wallet. Skipped for exempt addresses.
5. **Vault-only enforcement** — both from and to must be vaults, vault-owners, or exempt
6. **Balance debit** — pull amount from sender, revert on insufficient balance
7. **Fee calculation via BurnRouter** — if router exists, not bypassed, not exempt:
   - Call `burnRouter.computeFeesAndReserve(scoringFrom, logicalTo, amount)` returning burn/sanctum/eco amounts + sinks
   - Validate fee sum ≤ amount (prevents malicious router from setting fees > 100%)
   - Validate each returned sink against token-level configuration (prevents fee redirection)
   - Apply each fee to respective sink
   - Call `recordVolume()` and `recordBurn()` for adaptive fee tracking
8. **Daily transfer recording** — record gross amount (not net) so users can't bypass daily cap by paying fees
9. **Delivery** — either to fraud registry (if escrow required) or directly to recipient
10. **Invariant assertion** — `assert(remaining <= amount)` defense-in-depth

This flow has 12+ audit fixes baked in (M-7, F-17, C-01, H-8, F-31, C-1, C-2, etc.) and the comments explain what each fixed.

### Test coverage

23 tests in `test/hardhat/VFIDEToken.test.ts` covering:
- Genesis mint correctness
- Constructor validation (zero address, non-contract)
- Timelocked admin (system exempt propose/cancel/confirm at 48h)
- Whitelist propose/confirm
- Circuit breaker activation timelock + cleanup
- Emergency flag cleanup via syncEmergencyFlags
- Fee preview when burnRouter unset
- VaultOnly mode + EOA-to-vault redirect
- Sanctum sink edge cases (zero, post-policy-lock)
- Anti-whale: daily limit tracking using gross, not net
- canTransfer preview accuracy
- Daily limit enforcement across UTC boundaries
- Pending sink update cancellation
- Transfer preview behavior post-freeze-removal
- 6 permit-deadline tests in `VFIDETokenPermitDeadline.test.ts`

### Notes

**🟡 N-VFIDE-01: Test indentation issue at line 226.**
The error declaration block has inconsistent indentation:
```
    error VF_NoPending();
        error VF_Timelock();    // <-- extra indent
    error VF_TimelockActive();
```
Cosmetic only, but indicates a copy-paste artifact. No functional impact.

**🟡 N-VFIDE-02: ExternalCallFailed event uses non-indexed string.**
Several `try/catch` blocks emit `ExternalCallFailed("cfr", reason)` where `"cfr"` is the short tag. The event declares the first param as `indexed string`, which for strings means the keccak256 hash is indexed, not the string itself. Frontend filtering by exact tag is harder than it should be.
Recommend: change to `bytes32 indexed contextTag` with a known tag set, or accept that filtering needs to happen post-fetch.

**🟡 N-VFIDE-03: Coverage gap — fee distribution branches.**
The 23 existing tests don't appear to fully exercise the multi-sink fee distribution branches (lines 1020-1050). Need property tests that fuzz `(burnAmt, sanctumAmt, ecoAmt, burnSink, sanctumSink, ecoSink)` against the validation logic to ensure no combination of inputs can route fees to an unintended address. This is high-leverage given the validation logic is the only thing preventing malicious BurnRouter implementations from redirecting fees.

**🟡 N-VFIDE-04: ~~`setFeeBypass` duration unbounded~~ INVALID — duration IS bounded at MAX_CIRCUIT_BREAKER_DURATION (7 days) on line 760. I missed this on first read. Retracted.**

### Findings summary

No critical or high-severity findings on VFIDEToken. The transfer flow is heavily audited and defended. Notes are quality-of-life improvements and one coverage gap that property testing would close.

The strongest single defense is the **fee-sink validation against token-level configuration** (lines 1008-1019). A malicious BurnRouter implementation cannot redirect fees to unintended addresses because the token validates every returned sink. This is well-designed.

The strongest single concern is **the lack of property tests on the fee distribution logic.** Unit tests can verify expected paths; property tests catch the surprising combinations of inputs that humans don't think to write.

### Recommendations

1. **Add property tests via Echidna or Foundry on fee distribution.** Specifically: for any (burnAmt, sanctumAmt, ecoAmt) where sum ≤ amount, the fee distribution should either succeed-and-route-to-valid-sinks or revert. No path should route value to an unconfigured address.
2. **Fix N-VFIDE-01 (cosmetic indentation).** Trivial.
3. **Consider N-VFIDE-02 (event tag indexing).** Frontend convenience only; functionality unaffected.

---

*Next: CardBoundVault.sol — the user's primary contract.*
