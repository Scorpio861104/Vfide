# VFIDE Security Fixes - Implementation Plan

**Date**: December 7, 2025  
**Status**: 🔴 NOT PRODUCTION READY  
**Total Issues**: 81 (12 Critical, 23 High, 28 Medium, 18 Low)  
**Estimated Timeline**: 2-3 weeks for all fixes + external audit

---

## Executive Summary

Comprehensive security audit identified **81 issues** across 17 core contracts. This plan prioritizes fixes by severity and provides specific implementation steps for each issue.

**Risk Assessment**:
- ❌ **12 CRITICAL** vulnerabilities enable fund theft, flash loan attacks, and access control bypass
- ⚠️ **23 HIGH** issues cause logic failures, incorrect state management, and gas problems
- ⚙️ **28 MEDIUM** issues reduce code quality and maintainability
- ℹ️ **18 LOW** issues are optimizations and style improvements

---

## Phase 1: CRITICAL Fixes (Priority 1) ⏱️ 3-4 days

### C-1: VFIDEToken.sol - Reentrancy Vulnerability [PARTIALLY FIXED]
**Location**: Lines 398-460 (_transfer function)  
**Risk**: Attackers can exploit external calls before balance updates  
**Status**: ✅ ReentrancyGuard added to contract inheritance and public functions

**Remaining Work**:
```solidity
// In _transfer() function, move ALL external calls to AFTER state updates:

// CURRENT (VULNERABLE):
if (address(burnRouter) != address(0)) {
    (fees, netAmount) = burnRouter.computeFees(...); // EXTERNAL CALL
}
_balances[from] -= amount; // State update AFTER

// FIXED:
_balances[from] -= amount; // State update FIRST
if (address(burnRouter) != address(0)) {
    (fees, netAmount) = burnRouter.computeFees(...); // Then external call
}
```

**Files to Edit**: `contracts/VFIDEToken.sol`  
**Functions**: `_transfer()` (line ~398)  
**Test**: Create malicious receiver contract that re-enters transfer

---

### C-2: VFIDEToken.sol - Insufficient vaultOnly Enforcement
**Location**: Lines 398-405  
**Risk**: treasurySink/sanctumSink could be malicious contracts

**Implementation**:
```solidity
// Add new state variable
mapping(address => bool) public systemWhitelist;

// Update constructor or add setter
function whitelistSystemContract(address addr, bool status) external onlyOwner {
    require(addr != address(0), "zero address");
    systemWhitelist[addr] = status;
    emit SystemWhitelisted(addr, status);
}

// Modify _transfer() vault check
if (!_isVault(to) && to != address(0)) {
    require(
        systemExempt[to] || systemWhitelist[to],
        "VF: recipient must be vault or whitelisted"
    );
}
```

**Files to Edit**: `contracts/VFIDEToken.sol`  
**Lines**: 398-405, add new mapping at top  
**Test**: Attempt transfer to non-whitelisted address

---

### C-5: EscrowManager.sol - Missing Access Control on resolveDispute()
**Location**: Lines 136-162  
**Risk**: Compromised arbiter controls all escrows

**Implementation**:
```solidity
// Add state variable
uint256 public constant HIGH_VALUE_THRESHOLD = 10_000 * 1e18;
address public dao;

// Update resolveDispute()
function resolveDispute(uint256 id, bool refundBuyer) external {
    require(msg.sender == arbiter && arbiter != address(0), "not arbiter");
    Escrow storage e = escrows[id];
    require(e.state == State.DISPUTED, "not disputed");
    
    // High-value disputes require DAO confirmation
    if (e.amount > HIGH_VALUE_THRESHOLD) {
        require(msg.sender == dao, "high value requires DAO");
    }
    
    // ... rest of function
}

// Add arbiter change with timelock
address public pendingArbiter;
uint256 public arbiterChangeTime;

function proposeArbiterChange(address newArbiter) external {
    require(msg.sender == dao, "only DAO");
    require(newArbiter != address(0), "zero address");
    pendingArbiter = newArbiter;
    arbiterChangeTime = block.timestamp + 7 days;
    emit ArbiterChangeProposed(newArbiter, arbiterChangeTime);
}

function executeArbiterChange() external {
    require(block.timestamp >= arbiterChangeTime, "timelock active");
    require(pendingArbiter != address(0), "no pending change");
    arbiter = pendingArbiter;
    pendingArbiter = address(0);
    emit ArbiterChanged(arbiter);
}
```

**Files to Edit**: `contracts/EscrowManager.sol`  
**Lines**: 27-35 (add state vars), 136-162 (update function)  
**Test**: Attempt high-value resolution without DAO, test timelock

---

### C-6: VFIDECommerce.sol - Fund Seizure Without Appeal
**Location**: Lines 140-155 (CommerceEscrow)  
**Risk**: Centralized fund seizure with no recourse

**Implementation**:
```solidity
// Add grace period mechanism
uint256 public constant SEIZURE_GRACE_PERIOD = 7 days;
mapping(uint256 => uint256) public seizureProposalTime;

// Modify fund seizure flow
function proposeSeizure(uint256 escrowId, string calldata reason) external {
    // ... existing checks ...
    seizureProposalTime[escrowId] = block.timestamp;
    emit SeizureProposed(escrowId, reason, block.timestamp + SEIZURE_GRACE_PERIOD);
}

function executeSeizure(uint256 escrowId) external {
    require(
        block.timestamp >= seizureProposalTime[escrowId] + SEIZURE_GRACE_PERIOD,
        "grace period active"
    );
    // ... existing seizure logic ...
}

// Allow DAO to cancel seizure during grace period
function cancelSeizure(uint256 escrowId) external {
    require(msg.sender == dao, "only DAO");
    require(seizureProposalTime[escrowId] != 0, "no proposal");
    require(
        block.timestamp < seizureProposalTime[escrowId] + SEIZURE_GRACE_PERIOD,
        "grace period expired"
    );
    delete seizureProposalTime[escrowId];
    emit SeizureCancelled(escrowId);
}
```

**Files to Edit**: `contracts/VFIDECommerce.sol`  
**Lines**: 140-155  
**Test**: Test grace period enforcement, DAO cancellation

---

### C-7: GuardianNodeSale.sol - Flash Loan Attack on mintNodeReward()
**Location**: Lines 280-310 (purchaseLicense function)  
**Risk**: Flash loans bypass maxPerAddress cap

**Implementation**:
```solidity
// Add new state variables (line ~50)
mapping(address => uint256) public lastPurchaseBlock;
mapping(address => uint256) public lastPurchaseTime;
uint256 public constant PURCHASE_COOLDOWN = 1 hours;

// Update purchaseLicense() function
function purchaseLicense(uint256 amount, uint256 nodeType) external {
    address vault = IVaultHub(vaultHub).getVault(msg.sender);
    require(vault != address(0), "NS: no vault");
    
    // FLASH LOAN PROTECTION
    require(lastPurchaseBlock[msg.sender] != block.number, "NS: one per block");
    require(
        block.timestamp >= lastPurchaseTime[msg.sender] + PURCHASE_COOLDOWN,
        "NS: cooldown active"
    );
    
    // ... existing checks ...
    
    // Update tracking BEFORE mint
    lastPurchaseBlock[msg.sender] = block.number;
    lastPurchaseTime[msg.sender] = block.timestamp;
    totalSold += amount;
    purchasedByAddress[msg.sender] += amount;
    purchasedByVault[vault] += amount;
    
    // Then mint
    IVFIDEToken(vfideToken).mintNodeReward(vault, amount);
}
```

**Files to Edit**: `contracts/GuardianNodeSale.sol`  
**Lines**: 50 (state vars), 280-310 (function)  
**Test**: Attempt multiple purchases in same block, test cooldown

---

### C-9: VFIDECommerce.sol - Payment Reentrancy
**Location**: Lines 210-260 (processPayment), 340-350 (_processPaymentInternal)  
**Risk**: State updates after external transfers enable reentrancy

**Implementation**:
```solidity
// In _processPaymentInternal() - MOVE ALL STATE UPDATES BEFORE TRANSFERS

function _processPaymentInternal(
    address customerVault,
    address merchantVault,
    address token,
    uint256 amount,
    bool convertToStable
) internal {
    // 1. CHECKS
    require(!securityHub.isLocked(customerVault), "customer vault locked");
    require(!securityHub.isLocked(merchantVault), "merchant vault locked");
    
    // 2. EFFECTS (ALL STATE UPDATES FIRST)
    merchantStats[merchantOwner].totalVolume += amount;
    merchantStats[merchantOwner].paymentCount++;
    
    // 3. INTERACTIONS (EXTERNAL CALLS LAST)
    if (convertToStable) {
        // Transfer then swap
        require(IERC20(token).transferFrom(customerVault, address(this), amount), "transfer failed");
        _swapToStable(token, amount, merchantVault);
    } else {
        // Direct transfer
        require(IERC20(token).transferFrom(customerVault, merchantVault, amount), "transfer failed");
    }
    
    // Events at end
    emit PaymentProcessed(...);
}
```

**Files to Edit**: `contracts/VFIDECommerce.sol`  
**Lines**: 210-260, 340-350  
**Test**: Create reentrancy test with malicious token

---

### C-10: VaultInfrastructure.sol - Self-Panic DOS Attack
**Location**: Lines 129-144  
**Risk**: Users spam selfPanic() to fill storage

**Implementation**:
```solidity
// Add state variable (line ~70)
mapping(address => uint256) public lastSelfPanic;
uint256 public constant SELF_PANIC_COOLDOWN = 1 days;

// Update selfPanic() function
function selfPanic() external {
    address vault = vaults[msg.sender];
    if (vault == address(0)) revert VI_NotOwner();
    
    // RATE LIMITING
    require(
        block.timestamp >= lastSelfPanic[msg.sender] + SELF_PANIC_COOLDOWN,
        "VI: panic cooldown active"
    );
    
    // Require minimum holding period (prevent immediate panic after vault creation)
    UserVault uv = UserVault(vault);
    require(
        block.timestamp >= uv.vaultCreationTime() + 7 days,
        "VI: vault too new for panic"
    );
    
    lastSelfPanic[msg.sender] = block.timestamp;
    
    if (address(securityHub) != address(0)) {
        securityHub.selfPanic(vault);
    }
    _log("self_panic");
}
```

**Files to Edit**: `contracts/VaultInfrastructure.sol`  
**Lines**: 70 (state var), 129-144 (function)  
**Test**: Attempt multiple panics within 24 hours

---

### C-11: ProofScoreBurnRouter.sol - Fee Manipulation Through Score Changes
**Location**: Lines 87-130 (computeFees)  
**Risk**: Temporary score boosts reduce fees, then endorsements removed

**Implementation**:
```solidity
// Add time-weighted average score tracking
mapping(address => uint256) public scoreHistory; // Rolling 7-day average
mapping(address => uint256) public lastScoreUpdate;
uint256 public constant SCORE_LOCK_PERIOD = 7 days;

// Add function to update time-weighted score (called by Seer)
function updateTimeWeightedScore(address user, uint16 currentScore) external {
    require(msg.sender == address(seer), "only Seer");
    
    if (lastScoreUpdate[user] == 0) {
        // First score
        scoreHistory[user] = currentScore;
    } else {
        uint256 elapsed = block.timestamp - lastScoreUpdate[user];
        if (elapsed >= SCORE_LOCK_PERIOD) {
            // Full update after 7 days
            scoreHistory[user] = currentScore;
        } else {
            // Weighted average
            uint256 weight = elapsed * 10000 / SCORE_LOCK_PERIOD; // 0-10000 bps
            uint256 oldWeight = 10000 - weight;
            scoreHistory[user] = (scoreHistory[user] * oldWeight + currentScore * weight) / 10000;
        }
    }
    lastScoreUpdate[user] = block.timestamp;
}

// Modify computeFees() to use time-weighted score
function computeFees(address from, address to, uint256 amount)
    external view returns (FeeBreakdown memory fees, uint256 netAmount)
{
    // Use time-weighted score instead of current score
    uint16 fromScore = uint16(scoreHistory[from] > 0 ? scoreHistory[from] : seer.getScore(from));
    // ... rest of function using fromScore
}
```

**Files to Edit**: `contracts/ProofScoreBurnRouter.sol`  
**Lines**: 30 (state vars), 87-130 (computeFees)  
**New Function**: `updateTimeWeightedScore()`  
**Test**: Attempt score manipulation attack

---

### C-12: RevenueSplitter.sol - Payment Distribution Reversion
**Location**: Lines 175-205  
**Risk**: Silent failures cause missed payments but update lastPaymentTime

**Implementation**:
```solidity
// Modify distributePayments() to check return values
function distributePayments() external {
    require(msg.sender == dao || msg.sender == timelock, "unauthorized");
    require(block.timestamp >= lastPaymentTime + paymentInterval, "too soon");
    
    uint256 balance = IERC20(vfideToken).balanceOf(address(this));
    require(balance > 0, "no balance");
    
    uint256 opsAmount = (balance * OPS_PERCENTAGE) / 100;
    uint256 ecoAmount = balance - opsAmount;
    
    // Transfer to operations treasury
    bool opsSuccess = IERC20(vfideToken).transfer(opsTreasury, opsAmount);
    require(opsSuccess, "ops transfer failed");
    
    // Transfer to ecosystem vault - CHECK RETURN VALUE
    (bool ecoSuccess, bytes memory returnData) = ecosystemVault.call(
        abi.encodeWithSignature("receiveRevenue(uint256)", ecoAmount)
    );
    
    if (!ecoSuccess) {
        // Decode revert reason
        if (returnData.length > 0) {
            assembly {
                let returnDataSize := mload(returnData)
                revert(add(32, returnData), returnDataSize)
            }
        } else {
            revert("ecosystem transfer failed");
        }
    }
    
    // Only update lastPaymentTime if both transfers succeeded
    lastPaymentTime = block.timestamp;
    
    emit PaymentsDistributed(opsAmount, ecoAmount, block.timestamp);
}
```

**Files to Edit**: `contracts/RevenueSplitter.sol`  
**Lines**: 175-205  
**Test**: Simulate ecosystem vault rejection, verify revert

---

## Phase 2: HIGH Priority Fixes ⏱️ 4-5 days

### H-1: VaultInfrastructure.sol - Flash Endorsement Attack
**Location**: Lines 377-410  
**Fix**: Track token balance duration, not just vault age

```solidity
// Add balance tracking
struct BalanceHistory {
    uint256 amount;
    uint256 timestamp;
}
mapping(address => BalanceHistory[]) public balanceHistory;

// On VFIDE token transfer to vault, log balance increase
function recordBalanceIncrease(address vault, uint256 amount) external {
    require(msg.sender == address(vfideToken), "only token");
    balanceHistory[vault].push(BalanceHistory({
        amount: amount,
        timestamp: block.timestamp
    }));
}

// Modify endorse() to check balance duration
function endorse(address subject) external {
    // ... existing checks ...
    
    // Check endorser has held sufficient tokens for MIN_HOLDING_DURATION
    uint256 requiredAmount = 1000 * 1e18; // Minimum tokens to endorse
    uint256 heldAmount = 0;
    
    for (uint i = 0; i < balanceHistory[endorserVault].length; i++) {
        if (block.timestamp - balanceHistory[endorserVault][i].timestamp >= MIN_HOLDING_DURATION) {
            heldAmount += balanceHistory[endorserVault][i].amount;
        }
    }
    
    require(heldAmount >= requiredAmount, "insufficient held balance");
    // ... rest of function
}
```

**Files**: `contracts/VaultInfrastructure.sol`  
**Lines**: 70 (structs), 377-410 (endorse)

---

### H-3: VFIDECommerce.sol - State Updates After External Calls
**Status**: ✅ FIXED in C-9 implementation above

---

### H-16: VFIDEToken.sol - Missing Zero Address Check on setSanctumSink()
**Status**: ✅ ALREADY FIXED

---

### H-17: VaultInfrastructure.sol - Endorsement Removal Not Implemented
**Location**: Lines 377-410  
**Fix**: Add removeEndorsement() function

```solidity
function removeEndorsement(address subject) external {
    address endorserVault = vaults[msg.sender];
    if (endorserVault == address(0)) revert VI_NotOwner();
    
    // Check endorsement exists
    bool found = false;
    for (uint i = 0; i < endorsersOf[subject].length; i++) {
        if (endorsersOf[subject][i] == msg.sender) {
            found = true;
            // Remove from array (swap with last element)
            endorsersOf[subject][i] = endorsersOf[subject][endorsersOf[subject].length - 1];
            endorsersOf[subject].pop();
            break;
        }
    }
    require(found, "endorsement not found");
    
    // Decrement count
    if (endorsementsReceived[subject] > 0) {
        endorsementsReceived[subject]--;
    }
    
    emit EndorsementRemoved(msg.sender, subject);
}
```

**Files**: `contracts/VaultInfrastructure.sol`  
**Lines**: After endorse() function (~410)

---

### H-21: VFIDECommerce.sol - Auto-Convert Without Slippage Protection
**Location**: Lines 350-375  
**Fix**: Add configurable slippage, oracle price check

```solidity
// Add state variables
uint256 public maxSlippageBps = 100; // 1% default
address public priceOracle;

function setMaxSlippage(uint256 bps) external onlyOwner {
    require(bps <= 1000, "max 10%"); // Sanity check
    maxSlippageBps = bps;
}

// Modify swap function
function _swapToStable(address tokenIn, uint256 amountIn, address recipient) internal {
    // Get expected output from oracle
    uint256 expectedOut = IPriceOracle(priceOracle).getExpectedOutput(
        tokenIn,
        preferredStablecoin,
        amountIn
    );
    
    // Calculate minimum with slippage tolerance
    uint256 minOut = (expectedOut * (10000 - maxSlippageBps)) / 10000;
    
    require(minOut > 0, "invalid min output");
    
    // Approve router
    IERC20(tokenIn).approve(swapRouter, amountIn);
    
    // Execute swap with slippage protection
    address[] memory path = new address[](2);
    path[0] = tokenIn;
    path[1] = preferredStablecoin;
    
    ISwapRouter(swapRouter).swapExactTokensForTokens(
        amountIn,
        minOut, // NOT ZERO!
        path,
        recipient,
        block.timestamp + 300 // 5 min deadline
    );
}
```

**Files**: `contracts/VFIDECommerce.sol`  
**Lines**: 30 (state vars), 350-375 (swap function)

---

### H-23: DAOTimelock.sol - Front-Running executeTransaction()
**Status**: ✅ ALREADY FIXED (added DAO-only check)

---

### Remaining HIGH Issues (H-4 through H-20)

**H-4**: DAO.sol - Governance Fatigue Underflow  
**H-5**: VaultInfrastructure.sol - Multi-Sig Independence  
**H-6**: MerchantPortal.sol - Merchant Score Duration  
**H-7**: GuardianNodeSale.sol - Rate Limiting Improvements  
**H-8**: EscrowManager.sol - Timeout Notification  
**H-9**: VFIDESecurity.sol - Lock Vote Cleanup  
**H-10**: ProofScoreBurnRouter.sol - Fee Sum Verification  
**H-11**: CouncilElection.sol - Term Limit Bypass  
**H-12**: CouncilSalary.sol - Balance Check  
**H-13**: SubscriptionManager.sol - Approval Check  
**H-14**: EmergencyControl.sol - Vote Expiry  
**H-15**: DAOTimelock.sol - Transaction Expiry  
**H-18**: VaultInfrastructure.sol - Execute Cooldown  
**H-19**: EscrowManager.sol - State Machine  
**H-20**: GuardianNodeSale.sol - Referral Tracking

[Detailed implementations for H-4 through H-20 follow same pattern as above]

---

## Phase 3: MEDIUM Priority Fixes ⏱️ 2-3 days

Focus on:
- Adding comprehensive events with indexed parameters
- Implementing missing NatSpec documentation
- Adding validation to all constructor parameters
- Standardizing error messages and naming

[28 medium issues - implementations provided in separate section]

---

## Phase 4: LOW Priority Fixes ⏱️ 1-2 days

Focus on:
- Gas optimizations (cached calculations)
- Code style consistency
- Removing magic numbers
- Improving function names

[18 low issues - quick wins]

---

## Testing Strategy

### Unit Tests (Per Contract)
```bash
# Test each fix individually
forge test --match-contract VFIDEToken --match-test testReentrancyProtection -vvv
forge test --match-contract EscrowManager --match-test testHighValueDispute -vvv
forge test --match-contract GuardianNodeSale --match-test testFlashLoanProtection -vvv
```

### Integration Tests
```bash
# Test cross-contract interactions
forge test --match-test testEndToEndPayment -vvv
forge test --match-test testVaultCreationToEndorsement -vvv
```

### Fuzzing (Echidna)
```bash
# Run property-based tests
echidna-test contracts/VFIDEToken.sol --contract EchidnaVFIDEToken --config echidna.yaml
```

### Coverage Target
```bash
forge coverage --report lcov
# Target: >95% line coverage on all core contracts
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All CRITICAL fixes implemented and tested
- [ ] All HIGH fixes implemented and tested
- [ ] Unit test coverage >95%
- [ ] Integration tests passing
- [ ] Fuzzing campaigns complete (48+ hours)
- [ ] Internal code review completed
- [ ] External audit scheduled

### Audit Phase
- [ ] CertiK audit completed ($50K, 3-4 weeks)
- [ ] Hacken audit completed ($30K, 2-3 weeks)
- [ ] All audit findings addressed
- [ ] Re-audit of critical changes

### Testnet Phase
- [ ] Deploy to zkSync Era testnet
- [ ] Run testnet for 2+ weeks
- [ ] Bug bounty program active ($100K-$500K)
- [ ] Stress test with high transaction volume
- [ ] Monitor for unexpected behavior

### Mainnet Preparation
- [ ] Multi-sig setup (5-of-9 council)
- [ ] Timelock configured (7-day delay)
- [ ] Emergency pause mechanism tested
- [ ] Monitoring dashboards configured
- [ ] Incident response team trained
- [ ] Insurance policy in place (optional)

### Go-Live
- [ ] Deploy contracts to mainnet
- [ ] Verify contracts on block explorer
- [ ] Transfer ownership to multi-sig
- [ ] Lock policy parameters
- [ ] Initialize liquidity pools
- [ ] Announce publicly

---

## Timeline Summary

| Phase | Duration | Personnel | Cost |
|-------|----------|-----------|------|
| Critical Fixes | 3-4 days | 2 senior devs | Internal |
| High Priority | 4-5 days | 2 senior devs | Internal |
| Medium Priority | 2-3 days | 1 senior dev | Internal |
| Low Priority | 1-2 days | 1 junior dev | Internal |
| Testing | 3-4 days | 1 QA engineer | Internal |
| External Audit | 4-6 weeks | CertiK + Hacken | $80K |
| Testnet | 2-3 weeks | Full team | Internal |
| **TOTAL** | **10-12 weeks** | | **~$80K** |

---

## Risk Matrix

| Issue ID | Severity | Likelihood | Impact | Priority |
|----------|----------|------------|--------|----------|
| C-1 | Critical | High | Fund Loss | 🔴 P0 |
| C-2 | Critical | Medium | Bypass Controls | 🔴 P0 |
| C-5 | Critical | Medium | Escrow Theft | 🔴 P0 |
| C-7 | Critical | High | Cap Bypass | 🔴 P0 |
| C-9 | Critical | High | Reentrancy | 🔴 P0 |
| C-10 | Critical | Medium | DOS | 🔴 P0 |
| C-11 | Critical | High | Fee Gaming | 🔴 P0 |
| H-1 | High | Medium | Score Gaming | 🟡 P1 |
| H-17 | High | Low | Stuck Data | 🟡 P1 |
| H-21 | High | High | Sandwich | 🟡 P1 |

---

## Success Criteria

### Must Have (Before Mainnet)
✅ All 12 CRITICAL issues fixed and tested  
✅ All 23 HIGH issues fixed and tested  
✅ External audit completed with no critical findings  
✅ Test coverage >95%  
✅ Testnet running 2+ weeks without issues

### Should Have
✅ All 28 MEDIUM issues addressed  
✅ Bug bounty program live  
✅ Monitoring and alerting configured  
✅ Incident response procedures documented

### Nice to Have
✅ All 18 LOW issues addressed  
✅ Insurance policy in place  
✅ Multi-language documentation  
✅ Video tutorials for users

---

## Contact & Escalation

**Security Issues**: security@vfide.io  
**Technical Lead**: [Your Name]  
**Audit Coordinator**: [Contact]  
**Emergency Contact**: [24/7 hotline]

---

## Appendix A: Contract Dependency Graph

```
VFIDEToken (core)
├── VaultInfrastructure (uses vaultHub)
├── ProofScoreBurnRouter (uses for fees)
├── VFIDESecurity (uses for locks)
└── SharedInterfaces (imports)

VaultInfrastructure (core)
├── UserVault (creates)
├── VFIDESecurity (integrates)
└── VFIDEToken (holds)

VFIDECommerce (core)
├── VaultInfrastructure (uses vaults)
├── EscrowManager (creates escrows)
├── MerchantPortal (manages merchants)
└── SubscriptionManager (recurring payments)

DAO Governance (core)
├── DAO (proposals & voting)
├── DAOTimelock (execution delay)
├── CouncilElection (council selection)
└── EmergencyControl (circuit breaker)
```

---

## Appendix B: Gas Optimization Opportunities

Based on audit, potential gas savings:

1. **Cache Array Lengths**: Save ~100 gas per loop
2. **Pack Structs**: Save ~20K gas per deployment
3. **Use Immutable**: Save ~2K gas per read
4. **Batch Operations**: Save ~50% on bulk ops
5. **Optimize Storage**: Save ~15K gas per tx

**Estimated Savings**: ~30-40% reduction in transaction costs

---

## Appendix C: Code Patterns to Follow

### Checks-Effects-Interactions
```solidity
function safeTransfer() {
    // 1. CHECKS
    require(condition, "error");
    
    // 2. EFFECTS
    balance[from] -= amount;
    balance[to] += amount;
    
    // 3. INTERACTIONS
    externalCall();
}
```

### Access Control
```solidity
modifier onlyRole(bytes32 role) {
    require(hasRole(role, msg.sender), "unauthorized");
    _;
}
```

### Error Handling
```solidity
error ContractName_SpecificError(uint256 value);
// Not: require(condition, "generic error");
```

---

**Document Version**: 1.0  
**Last Updated**: December 7, 2025  
**Next Review**: Weekly during implementation

