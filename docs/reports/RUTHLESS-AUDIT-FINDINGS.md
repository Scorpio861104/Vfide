# RUTHLESS LINE-BY-LINE AUDIT: DISCREPANCIES FOUND

## Overview
This document tracks **every discrepancy** between the VFIDE Ecosystem Overview specification and the actual contract implementation. Zero tolerance for mismatches.

---

## FINDINGS

### ❌ DISCREPANCY #1: setVaultFactory vs setVaultHub (TERMINOLOGY)
**Severity:** Minor (naming inconsistency, no functional impact)

**Overview Says:**
- Section 4.3: "`setVaultFactory` – central factory that creates vaults with the proper template and protections."

**Actual Implementation:**
- VFIDEToken.sol line 199: `function setVaultHub(address hub) external onlyOwner`
- VaultInfrastructure.sol IS both the hub (registry) and factory (CREATE2 deployer)

**Analysis:**
- Functionally correct: VaultHub/VaultInfrastructure performs factory role
- Terminology differs: "VaultFactory" (overview) vs "VaultHub" (code)
- No bug: just naming convention difference

**Resolution:**
- Option 1: Update overview to say "setVaultHub"
- Option 2: Add alias function `setVaultFactory` that calls `setVaultHub`
- **Recommendation:** Update overview for consistency

---

### ❌ DISCREPANCY #2: Withdrawal Cooldown Missing (FUNCTIONALITY)
**Severity:** CRITICAL (promised feature not implemented)

**Overview Says:**
- Section 4.4: "Large withdrawals or transfers from vaults can be subject to: **Time delays (cooldown)**."

**Actual Implementation:**
- VaultInfrastructure.sol, UserVault.transferVFIDE() line ~182-192
- NO cooldown logic implemented
- NO lastWithdrawal timestamp tracking
- NO withdrawal delay mechanism
- Instant transfers with only `onlyOwner` and `notLocked` checks

**Analysis:**
- Overview promises cooldown/time delay for large withdrawals
- UserVault allows instant transfers - zero friction beyond locks
- This is a **missing feature**, not just terminology

**Impact:**
- Users/investors expecting cooldown protection won't have it
- "Catch mistakes and hacks before funds vanish" goal not achieved
- Friction layer mentioned in section 2 (layer overview) is incomplete

**Resolution Required:**
- Option 1: Implement cooldown in UserVault.transferVFIDE()
  ```solidity
  uint256 public lastWithdrawalTime;
  uint256 public constant WITHDRAWAL_COOLDOWN = 24 hours; // configurable
  
  function transferVFIDE(address toVault, uint256 amount) external onlyOwner notLocked nonReentrant {
      require(block.timestamp >= lastWithdrawalTime + WITHDRAWAL_COOLDOWN, "UV:cooldown");
      lastWithdrawalTime = block.timestamp;
      // ... existing transfer logic
  }
  ```
- Option 2: Remove cooldown claims from overview if intentionally not implemented
- **Recommendation:** Implement cooldown - it's core to security promise

---

## AUDIT STATUS

**Sections Verified:**
- ✅ Token Supply Constants (200M/50M/50M) - PERFECT MATCH
- ✅ Presale Pricing (0.03/0.05/0.07) - PERFECT MATCH  
- ✅ Referral Bonuses (100bps/200bps) - PERFECT MATCH
- ✅ ProofScore Thresholds (350/700/540/560) - PERFECT MATCH
- ✅ Vesting Schedule (90 days + 1080 days) - PERFECT MATCH
- ✅ Council Size (12 members default) - PERFECT MATCH
- ✅ Vault-Only Enforcement - IMPLEMENTED CORRECTLY
- ⚠️ VaultHub/Factory Integration (terminology mismatch)
- ❌ Withdrawal Cooldown (MISSING IMPLEMENTATION)

**Sections Pending Deep Review:**
- [ ] Multi-guardian approval for withdrawals (section 4.4)
- [ ] GuardianLock implementation details (section 5.1)
- [ ] PanicGuard configuration (section 5.2)
- [ ] Chain-of-Return recovery (section 5.3)
- [ ] Next-of-Kin system (section 5.4)
- [ ] ProofLedger event logging (section 5.5)
- [ ] ProofScore calculation logic (section 6.1)
- [ ] Staking multipliers (section 6.1 outputs)
- [ ] Sanctum disbursement flow (section 7.4)
- [ ] Merchant Portal trust gating (section 7.5)
- [ ] DAO proposal types (section 8.2)
- [ ] Academy completion tracking (section 9)

---

### ❌ DISCREPANCY #3: Amount-Based Guardian Freeze Missing (FUNCTIONALITY)
**Severity:** MEDIUM (promised granularity not implemented)

**Overview Says:**
- Section 5.1: "Scope of freeze (full vault, specific functions, **or transfers above a threshold**)."

**Actual Implementation:**
- GuardianLock.sol: Binary freeze only - vault is either fully locked or fully unlocked
- NO transfer amount checking
- NO "freeze only large transfers" logic
- `threshold` variable refers to M-of-N guardians, not transfer amounts

**Analysis:**
- Overview promises granular freeze: allow small transfers, block large ones
- Implementation only supports all-or-nothing freeze
- This reduces flexibility of guardian protection

**Impact:**
- Users expecting "freeze only risky large transfers" won't get it
- Guardians can't let user make small transactions while blocking big ones
- Less nuanced protection than promised

**Resolution Required:**
- Option 1: Implement amount-based freeze logic in UserVault
  ```solidity
  uint256 public transferThreshold; // set by owner/guardians
  
  function transferVFIDE(address toVault, uint256 amount) external {
      if (amount > transferThreshold && transferThreshold > 0) {
          require(!securityHub.isLocked(address(this)), "UV:amount-locked");
      }
      // ... existing logic
  }
  ```
- Option 2: Remove "transfers above a threshold" from overview
- **Recommendation:** Clarify in overview that GuardianLock is binary (not amount-based)

---

### ❌ DISCREPANCY #4: ProofScore Calculation vs Manual Assignment (ARCHITECTURE)
**Severity:** CRITICAL (fundamental architectural mismatch)

**Overview Says:**
- Section 6.1: "A numerical trust score per wallet/vault/user profile, **powered by on-chain behavior and verified events**."
- "Inputs include: Transaction history (frequency, size, patterns). Voluntary verifications. Flags from PanicGuard or ProofLedger. Long-term consistency."

**Actual Implementation:**
- VFIDETrust.sol Seer contract (lines 114-145):
  - `getScore(address)` - returns stored uint16 or 500 default
  - `setScore(address, uint16, reason)` - **DAO manually sets score**
  - `reward(address, uint16, reason)` - DAO manually increases score
  - `penalize(address, uint16, reason)` - DAO manually decreases score
- **ZERO automated calculation logic**
- **ZERO transaction history analysis**
- **ZERO pattern detection**
- **ZERO ProofLedger integration for auto-scoring**

**Analysis:**
- Overview describes automated trust intelligence system
- Implementation is 100% manual score assignment by DAO
- No "powered by on-chain behavior" - it's powered by DAO manual input
- This is not a scoring "engine" - it's a score "registry"

**Impact:**
- Users expecting algorithmic trust assessment won't get it
- DAO must manually score every user (doesn't scale)
- "Behavior-driven" trust is impossible without calculation logic
- ProofScore is more like "DAO opinion" than "proof" of behavior

**Resolution Required:**
- Option 1: Implement automated ProofScore calculation engine
  ```solidity
  function calculateScore(address user) internal view returns (uint16) {
      uint16 base = NEUTRAL;
      // + Transaction frequency analysis
      // + Vault longevity bonus
      // + Staking commitment bonus
      // + DAO voting participation bonus
      // - PanicGuard flag penalties
      // - Recovery attempt penalties
      return clamp(base + adjustments, 0, MAX_SCORE);
  }
  ```
- Option 2: Rewrite overview to describe manual DAO-controlled scoring
- Option 3: Build off-chain calculator that DAO uses (semi-automated)
- **Recommendation:** Either implement automation OR clarify it's manual in overview

---

**Next Actions:**
1. ✅ Verified multi-guardian approval - only for full freeze, not per-withdrawal
2. ✅ Checked large withdrawal logic - no amount thresholds implemented
3. ✅ Audited PanicGuard - time-based quarantine implemented correctly
4. ✅ Reviewed ProofScore - MANUAL not automatic (CRITICAL MISMATCH)
5. [ ] Verify Sanctum disbursement flow matches overview
6. [ ] Check Merchant Portal trust gating implementation
7. [ ] Verify staking multipliers based on ProofScore
8. [ ] Check DAO proposal types match section 7.2

---

**Audit Started:** Current session  
**Last Updated:** Just now  
**Auditor:** Line-by-line ruthless precision check
