# Solidity Contracts Cross-Analysis Audit
**Date:** April 28, 2026  
**Scope:** Core VFIDE contracts (25+ files, excluding mocks, security, interfaces, future, pools, scripts)  
**Focus:** State management, access control, fee calculations, module wiring, cross-contract calls

---

## Executive Summary

| Category | Count |
|----------|-------|
| **Critical** | 5 |
| **High** | 8 |
| **Medium** | 7 |
| **Low** | 4 |

---

## CRITICAL ISSUES

### C-1: Governance Timelock Pattern Inconsistency (Governance Control Fragmentation)
**Affected Contracts:**
- VFIDEAccessControl, VaultRegistry, DAO, DAOTimelock, StablecoinRegistry, MerchantPortal, SanctumVault

**Issue Category:** Access Control Inconsistency

**Specific Code Locations/Patterns:**
- `VFIDEAccessControl.transferAdminRole()` (line ~40): Atomic transfer, no timelock
- `StablecoinRegistry.setGovernance()` (line ~64): Immediate governance rotation, no timelock
- `DAO.setModules()`: Uses DAOTimelock mechanism (48h delay)
- `DAOTimelock.setAdmin()`: Immediate via onlyTimelockSelf (no additional delay)
- `VaultRegistry` (constructor takes governance with no rotation mechanism initially)
- `MerchantPortal` (line ~150): Has DAO_CHANGE_DELAY = 48h but immediate activation path exists
- `SanctumVault.setDAO()` (line ~165): Uses 48h DAO_CHANGE_DELAY

**Why This Is a Problem:**
1. **Inconsistent governance security**: Some critical contracts can have governance/admin rotated instantly without timelock, while others enforce 48-hour delays
2. **Silent failure path**: If StablecoinRegistry is compromised, governance can flip with no delay, breaking token decimals validation across EcosystemVault/MerchantPortal
3. **Attack surface**: VFIDEAccessControl and StablecoinRegistry lack timelocks on governance changes, enabling instantaneous control transfer
4. **No pause/cancellation mechanism**: Unlike DAO pattern (pending + execute), single-step governance rotation means no recovery window

**Severity:** CRITICAL

**Remediation:**
```solidity
// StablecoinRegistry: Add timelock
address public pendingGovernance;
uint64 public pendingGovernanceAt;
uint64 public constant GOVERNANCE_CHANGE_DELAY = 48 hours;

function setGovernance(address newGovernance) external onlyGovernance {
  // Queue change
  pendingGovernance = newGovernance;
  pendingGovernanceAt = uint64(block.timestamp) + GOVERNANCE_CHANGE_DELAY;
}

function applyGovernance() external onlyGovernance {
  require(pendingGovernanceAt != 0 && block.timestamp >= pendingGovernanceAt);
  governance = pendingGovernance;
  delete pendingGovernance;
  delete pendingGovernanceAt;
}
```

---

### C-2: Decimal Validation Gap in StablecoinRegistry → Multi-Contract Fee Calculation Chain
**Affected Contracts:**
- StablecoinRegistry, EcosystemVault, MerchantPortal, ProofScoreBurnRouter, VFIDEToken

**Issue Category:** Token/Decimals Type Incompatibility

**Specific Code Locations/Patterns:**
```solidity
// StablecoinRegistry (line 50-52): Validates decimals at add time
require(reportedDecimals != decimals) revert SR_DecimalsMismatch();

// BUT: No enforcement that USDC stays 6 decimals if re-added
// No audit trail if token is removed/re-added with wrong decimals

// EcosystemVault (line 120+): Assumes stablecoin decimals match stored value
// MerchantPortal (line 180+): Converts amounts without decimal verification
// ProofScoreBurnRouter (no stablecoin handling - works with VFIDE only, 18 decimals)
```

**Why This Is a Problem:**
1. **Silent decimal mismatch**: If USDC (6 decimals) is removed and replaced with fake-18-decimal token:
   - MerchantPortal may refund 1e6 units of fake token for payment of 1e18 units (1e12 overflow)
   - Fee splits in FeeDistributor would apply wrong percentages to multi-decimal transfers
2. **No removal blocking**: Can remove USDC during active payment processing, orphaning received tokens
3. **Inconsistent enforcement**: Only addStablecoin validates decimals; setAllowed(true) bypasses check
4. **No re-validation cycle**: Decimals stored once; if token interface is hacked to return different decimals, no audit re-check

**Code Flow Breach:**
```
MerchantPortal.processPayment(customer, merchant, USDC, 100e6)
  → Assumes USDC.decimals() == stablecoins[USDC].decimals (6)
  → If attacker replaces USDC.decimals to return 18, math breaks
  → No re-validation in MerchantPortal.acceptToken() path
```

**Severity:** CRITICAL

**Remediation:**
```solidity
// StablecoinRegistry: Cache and re-validate
mapping(address => uint8) public storedDecimals;

function validateStablecoinDecimals(address token) external view returns (bool) {
  require(stablecoins[token].allowed, "not allowed");
  uint8 current = IERC20MetadataSR(token).decimals();
  require(current == stablecoins[token].decimals, "decimals mismatch");
  return true;
}

// MerchantPortal: Validate before payment
function processPayment(address token, uint256 amount) {
  require(vaultHub.acceptedTokens(token), "token not accepted");
  require(stablecoinRegistry.validateStablecoinDecimals(token), "decimals corrupted");
  // ... proceed
}
```

---

### C-3: ProofScore Interface Mismatch Across Three Separate Seer Integrations
**Affected Contracts:**
- VFIDEToken, ProofScoreBurnRouter, MerchantPortal, VFIDEFlashLoan, Seer, GovernanceHooks

**Issue Category:** Access Control + Role Definition Conflict

**Specific Code Locations/Patterns:**
```solidity
// VFIDEToken (line 12-20): References ISeer, calls getScore(user)
IProofLedger public ledger;
IProofScoreBurnRouterToken public burnRouter;

// ProofScoreBurnRouter (line 120+): Imports ISeer, has getScore(address) → uint16 checks
ISeer public seer;
// Calls: seer.getScore(from) returns uint16 on 0-10000 scale

// MerchantPortal: Calls seer.getScore(customer) for minMerchantScore check
// BUT: Different threshold interpretation
ISeer public seer;
uint16 public minMerchantScore = 5600; // 56% on 0-10000 scale

// VFIDEFlashLoan returns no Seer validation initially, then added
ISeerFL public seer;
// No getScore calls in flashLoan path

// Seer.sol (line 220+): Multiple module integration points
ISeerAutonomous_DAO seerAutonomous; 
// onScoreChange() callback may not fire consistently

// GovernanceHooks: Calls seer.getScore() differently
require(seer.getScore(voter) >= minForGovernance, "low score");
// BUT: minForGovernance may be different from minForGov in other contracts
```

**Why This Is a Problem:**
1. **Score threshold fragmentation**: Four different score requirements exist:
   - ProofScoreBurnRouter: LOW_SCORE_THRESHOLD (4000), HIGH_SCORE_THRESHOLD (8000), minTotalBps (25-500 bps curve)
   - MerchantPortal: minMerchantScore = 5600
   - VFIDETermLoan: TIER_1_SCORE (5000), TIER_2_SCORE (6000), TIER_3_SCORE (7000), TIER_4_SCORE (8000)
   - GovernanceHooks: seer.minForGovernance() (likely 6000+)
   - Result: User with score 5800 is merchant-eligible (5600) but NOT loan-eligible (needs 6000)
   - Result: User with score 4500 pays max ProofScoreBurnRouter fees but cannot be merchant or borrower
2. **Inconsistent Seer module binding**: ISeer interface called in 6+ contracts but no guaranteed initialization order
   - If Seer operator address changes, which contracts are notified?
   - If Seer.setOperatorLimits() called, does ProofScoreBurnRouter know?
3. **Silent score 0 handling**:
   - ProofScoreBurnRouter (line 530): `// L-03: Emitted when seer returns score 0 for a user`
   - But VFIDEToken doesn't check this scenario and may accept score 0 as valid
   - MerchantPortal may reject score 0 user silently (0 < minMerchantScore)
4. **No cross-contract event coordination**: When Seer.setScore() changes a user's score:
   - ProofScoreBurnRouter fee curve updates dynamically
   - BUT: MerchantPortal merchant eligibility doesn't re-broadcast (user was eligible 1 block ago, not now)
   - Result: User can initiate payment as merchant, but score drops before settlement → state mismatch

**Severity:** CRITICAL

**Remediation:**
```solidity
// Create canonical Seer score threshold constants
// lib/ScoringConstants.sol
library ScoringConstants {
  uint16 constant LOW_TRUST = 4000;     // ≤40%
  uint16 constant NEUTRAL = 5000;       // 50%
  uint16 constant MODERATE = 6000;      // 60%
  uint16 constant HIGH_TRUST = 8000;    // ≥80%
}

// All contracts reference same constants
// MerchantPortal.sol
import "./lib/ScoringConstants.sol";
uint16 public minMerchantScore = ScoringConstants.MODERATE; // 6000

// Add cross-contract score validation
function validateScoreEligibility(address user, bytes32 operation) external view {
  uint16 score = seer.getScore(user);
  if (operation == keccak256("merchant")) {
    require(score >= ScoringConstants.MODERATE, "score too low for merchant");
  } else if (operation == keccak256("loan")) {
    require(score >= ScoringConstants.MODERATE, "score too low for loan");
  }
}
```

---

### C-4: Vault Guardian Setup Enforcement Mismatch (CardBoundVault vs VaultHub)
**Affected Contracts:**
- CardBoundVault, VaultHub, VaultInfrastructure, VaultRegistry

**Issue Category:** Initialization State Mismatch + Cross-Contract Validation

**Specific Code Locations/Patterns:**
```solidity
// CardBoundVault (line 45-49): Enforces maximum VFIDE without guardian
uint256 public constant MAX_VFIDE_WITHOUT_GUARDIAN = 50_000e18;

// ISSUE: No active enforcement in receive path
// Missing: receive() { require(msg.sender == hub); /* no guardian check */ }

// VaultHub (line 80-85): Tracks guardian setup separately
mapping(address => bool) public guardianSetupComplete;
uint256 public constant GUARDIAN_SETUP_GRACE = 30 days;
error VH_GuardianSetupRequired(); 

// MISMATCH: 
// 1. CardBoundVault doesn't call VaultHub.guardianSetupComplete()
// 2. VaultHub has guardianSetupComplete but CardBoundVault has MAX_VFIDE_WITHOUT_GUARDIAN
// 3. Which takes precedence?
//    - If CardBoundVault has 50k VFIDE but guardianSetupComplete=true, is it safe?
//    - If CardBoundVault has 30k VFIDE but guardianSetupComplete=false, is it locked?

// VaultInfrastructure (line 220+): UserVaultLegacy has different threshold
// NO MAX_VFIDE_WITHOUT_GUARDIAN equivalent in UserVaultLegacy
// UserVaultLegacy allows transfers even without guardian

// VaultRegistry (line 350+): No guardian setup check on recovery
// Recovery allows new wallet to take over EVEN IF original had incomplete guardian setup
```

**Why This Is a Problem:**
1. **Dual enforcement creates bypass**: User creates vault, gets 49.9k VFIDE, then:
   - CardBoundVault.receive() doesn't validate guardianSetupComplete
   - User initiates transfer before GUARDIAN_SETUP_GRACE expires
   - Vault transfers the 49.9k + 100 = 50k (under limit)
   - But VaultHub.guardianSetupComplete=false (not yet finalized)
   - Result: User can move max VFIDE without setting up guardians
2. **Recovery path ignores guardian setup**: VaultRecoveryClaim doesn't check:
   - Is the vault (being claimed) guardian-setup-complete?
   - If not, should a longer challenge period apply?
   - CURRENT: New wallet claims vault with potentially no guardian setup, gets instant ownership
3. **Inconsistent definitions**: 
   - CardBoundVault: MAX_VFIDE = 50k (hard limit, per heuristic)
   - VaultHub: GUARDIAN_SETUP_GRACE = 30 days (soft grace period)
   - No synchronization: If GRACE expires, does CardBoundVault increase MAX_VFIDE?
4. **UserVaultLegacy bypass**: Legacy vaults have no MAX_VFIDE_WITHOUT_GUARDIAN, so:
   - Old vault + new CardBoundVault migration may allow excess holding
   - No rebalancing requirement

**Severity:** CRITICAL

**Remediation:**
```solidity
// CardBoundVault.sol: Add enforced guardian check
function _validateGuardianSetup(uint256 incomingAmount) internal view {
  IVaultHubGuardianSetup hub = IVaultHubGuardianSetup(hub);
  
  if (!hub.guardianSetupComplete(address(this))) {
    uint256 projected = IERC20(vfideToken).balanceOf(address(this)) + incomingAmount;
    require(projected <= MAX_VFIDE_WITHOUT_GUARDIAN, "guardian setup required");
  }
}

// In receive/transfer paths:
function _receiveTransfer(address toVault, uint256 amount) internal {
  _validateGuardianSetup(amount);
  // ... proceed
}

// VaultRecoveryClaim: Add setup check
function _initiateRecoveryClaim(address vault, address claimant) internal {
  IVaultHubGuardianSetup vh = IVaultHubGuardianSetup(vaultHub);
  bool setupComplete = vh.guardianSetupComplete(vault);
  
  // Extend challenge period for incomplete setup
  uint64 challengePeriod = !setupComplete 
    ? GUARDIAN_SETUP_GRACE // 30 days
    : CHALLENGE_PERIOD;    // 7 days
  
  claims[claimId].challengeEndsAt = uint64(block.timestamp) + challengePeriod;
}
```

---

### C-5: Fee Distribution Callback Silent Failure (VFIDEToken → FeeDistributor.receiveFee())
**Affected Contracts:**
- VFIDEToken, FeeDistributor, ProofScoreBurnRouter

**Issue Category:** Cross-Contract Call Assumption + Silent Failure

**Specific Code Locations/Patterns:**
```solidity
// VFIDEToken (line 280-290): Calls BurnRouter, then tries to notify FeeDistributor
address public ecosystemDistributor; // FeeDistributor

function _transfer(address from, address to, uint256 amount) internal {
  // ... compute fee via burnRouter ...
  
  if (address(ecosystemDistributor) != address(0)) {
    try IEcosystemDistributor(ecosystemDistributor).receiveFee(feeAmount) {
      // Fee credited
    } catch {
      // SILENT FAILURE: ecosystem distribution skipped
    }
  }
}

// FeeDistributor (line 75-90): receiveFee() called from VFIDEToken
interface IEcosystemDistributor {
    function receiveFee(uint256 amount) external;
}

function receiveFee(uint256 amount) external nonReentrant {
  // F-33 FIX: Allow both VFIDEToken and authorized fee sources
  bool isVFIDEToken = msg.sender == address(vfideToken);
  bool isAuthorizedSource = authorizedFeeSources[msg.sender];
  if (!isVFIDEToken && !isAuthorizedSource) revert NotAuthorized();
  totalReceived += amount;
  emit FeeReceived(amount);
}

// ISSUE: totalReceived += amount updates but tokens NOT transferred yet
// Tokens sit in VFIDEToken, moved later by distribute() call
```

**Why This Is a Problem:**
1. **Async accounting mismatch**:
   - VFIDEToken.receiveFee() increments totalReceived
   - But FeeDistributor.distribute() expects tokens to be in its balance
   - If distribute() called before tokens arrive: `balance < minDistributionAmount` revert
2. **Silent ecosystem sink update**: If ecosystemDistributor address is 0 or call fails:
   - burnRouter still calculated ecoFees
   - But FeeDistributor never learns about it
   - Ecosystem funds are not distributed, burning instead
3. **No return value validation**: VFIDEToken doesn't check receiveFee() actually succeeded
   - If FeeDistributor becomes paused: receive calls fail silently
   - Fees accumulate in VFIDEToken balance, never distributed
4. **Cross-contract synchronization**: ProofScoreBurnRouter fee split assumes:
   - baseEcosystemBps % of burn fee → ecosystemDistributor
   - But if ecosystemDistributor call fails, baseEcosystemBps is lost
   - ProofScoreBurnRouter has NO knowledge of the failure

**Severity:** CRITICAL  
(Causes protocol revenue leakage - ecosystem funds not distributed)

**Remediation:**
```solidity
// VFIDEToken.sol: Require successful FeeDistributor callback
function _transfer(address from, address to, uint256 amount) internal {
  (uint256 ecoFee, uint256 burnFee, uint256 sanctumFee) = burnRouter.computeFees(from, to, amount);
  
  // Require FeeDistributor callback succeeds (no try-catch silent fail)
  if (address(ecosystemDistributor) != address(0)) {
    IEcosystemDistributor(ecosystemDistributor).receiveFee(ecoFee);
    // Exception raised if receiveFee() fails
  }
  
  // Ensure tokens are transferred to FeeDistributor before callback
  _balances[address(this)] -= totalFee;
  _balances[address(feeDistributor)] += totalFee;
  emit Transfer(address(this), address(feeDistributor), totalFee);
}

// FeeDistributor.sol: Track fee receipt explicitly
uint256 public lastFeeReceiptTime;
mapping(address => uint256) public pendingFeeReceipts;

function receiveFee(uint256 amount) external nonReentrant {
  require(msg.sender == address(vfideToken), "not vfide");
  require(vfideToken.balanceOf(address(this)) >= amount, "tokens not transferred");
  
  totalReceived += amount;
  lastFeeReceiptTime = block.timestamp;
  emit FeeReceived(amount);
}
```

---

## HIGH SEVERITY ISSUES

### H-1: Inconsistent Spend Limit Enforcement Across Vault Implementations
**Affected Contracts:**
- CardBoundVault, VaultInfrastructure (UserVaultLegacy)

**Issue Category:** Data Structure Misalignment + Role Definition Conflict

**Specific Code Locations/Patterns:**
```solidity
// CardBoundVault (line 60-65): Per-transfer limit + daily limit
uint256 public maxPerTransfer;
uint256 public dailyTransferLimit;
uint256 public spentToday;
uint64 public dayStart;

// UserVaultLegacy (line 290-300): Legacy different structure
uint256 public largeTransferThreshold;
struct PendingTransaction {
  address toVault;
  uint256 amount;
  uint64 requestTime;
  bool approved;
  bool executed;
}

// MISMATCH:
// - CardBoundVault enforces maxPerTransfer + dailyTransferLimit in _confirmTransfer()
// - UserVaultLegacy has largeTransferThreshold queuing, no daily limit
// - Recovery from UserVaultLegacy → CardBoundVault migration updates limits?
```

**Why This Is a Problem:**
User migrates from UserVaultLegacy (10k threshold, no daily limit) to CardBoundVault (500k per transfer, 2M daily):
- If legacy vault had 100k pending withdrawal queue
- New CardBoundVault may apply different enforcement
- Attacker could exploit migration window

**Severity:** HIGH

---

### H-2: Fee Policy Cooldown Bypass in ProofScoreBurnRouter
**Affected Contracts:**
- ProofScoreBurnRouter

**Issue Category:** Timing/Lock Mechanism Conflict

**Specific Code Locations/Patterns:**
```solidity
// ProofScoreBurnRouter (line 50-55):
uint64 public lastFeePolicyChange;
uint64 public constant FEE_POLICY_COOLDOWN = 1 days;
bool public feePolicyInitialized;

// (line 520+): setBaseFees() check
function setBaseFees(uint16 _burnBps, uint16 _sanctumBps, uint16 _ecoSystemBps) external onlyOwner {
  require(block.timestamp >= lastFeePolicyChange + FEE_POLICY_COOLDOWN, "too soon");
  
  // BUT: Missing feePolicyInitialized check in setPolicy()
  // Initial policy set might bypass cooler if called as "setPolicy" vs "setBaseFees"
}
```

**Why This Is a Problem:**
If contract has two setter methods, one checks cooldown, one doesn't → instant fee flip possible.

**Severity:** HIGH

---

### H-3: Seer Score Cache Invalidation Chain (Stale Score in Burn Router)
**Affected Contracts:**
- Seer, ProofScoreBurnRouter, VFIDEToken

**Issue Category:** Timing/Lock Mechanism Conflict

**Specific Code Locations/Patterns:**
```solidity
// ProofScoreBurnRouter (line 450-470): Score caching
mapping(address => uint16) public cachedTimeWeightedScore;
uint64 public constant MIN_SCORE_UPDATE_INTERVAL = 1 hours;

// VFIDEToken (line 280+): Calls burnRouter.computeFees()
// using current score, but what if Seer.setScore() just updated?
// burnRouter caches score, so lag possible

function computeFees(...) {
  uint16 currentScore = seer.getScore(from);
  // uses currentScore immediately, no cache check
}
```

**Why This Is a Problem:**
Two transactions in same block:
1. Seer updates user score from 9000 → 2000 (fraud detected)
2. User transfers VFIDE before burnRouter cache clears
3. Fee computed with old (high) score = low fee
4. Result: User pays reduced fee due to stale cache

**Severity:** HIGH

---

### H-4: DAO Recovery Circular Dependency (DAOTimelock ↔ DAO)
**Affected Contracts:**
- DAO, DAOTimelock

**Issue Category:** Cross-Contract Call Assumptions

**Specific Code Locations/Patterns:**
```solidity
// DAO.sol (line 60-80): Constructor
constructor(address _admin, address _timelock, address _seer, address _hub, address _hooks) {
  admin = _admin;
  timelock = IDAOTimelock(_timelock);
  // emergencyApprover initialized to timelock
  emergencyApprover = _timelock;
}

// Emergency rescue path:
// DAO.emergencyRescueReady = true → DAOTimelock.execute() emerges as only path
// But what if DAOTimelock is compromised?
// DAO cannot recover because emergencyApprover == timelock

// DAOTimelock (line 40-60): setAdmin()
function setAdmin(address _admin) external onlyTimelockSelf {
  admin = _admin;
}

// ISSUE: If admin corrupted, cannot reset without successful timelock execution
// Which means compromised DAO is queuing the fix (recursion)
```

**Why This Is a Problem:**
No bootstrap recovery if DAOTimelock admin is corrupted. DAO and DAOTimelock can enter deadlock state.

**Severity:** HIGH

---

### H-5: Guardian Count Underflow in Vault Recovery (VaultRecoveryClaim)
**Affected Contracts:**
- VaultRecoveryClaim, CardBoundVault

**Issue Category:** Data Structure Misalignment

**Specific Code Locations/Patterns:**
```solidity
// VaultRecoveryClaim (line 620-630): MIN_GUARDIAN_APPROVALS check
uint8 public constant MIN_GUARDIAN_APPROVALS = 2;

// But CardBoundVault (line 280-300): allowsGuardian setup 
function setGuardian(address guardian, bool active) {
  if (active) guardianCount++;
  else if (guardianCount > 0) guardianCount--;
}

// RACE: 
// 1. Recovery claim initiated with 2 guardians
// 2. Guardians self-remove before votes cast
// 3. guardianCount = 0
// 4. MIN_GUARDIAN_APPROVALS = 2 still required, but 0 guardians exist
// Result: Recovery frozen forever
```

**Why This Is a Problem:**
Claim becomes impossible if guardians drop below minimum before voting.

**Severity:** HIGH

---

### H-6: EcosystemVault Allocation Rebalance Timing (Fee Splits Mismatch)
**Affected Contracts:**
- EcosystemVault, ProofScoreBurnRouter, FeeDistributor

**Issue Category:** Fee/Reward Calculation Conflicts

**Specific Code Locations/Patterns:**
```solidity
// EcosystemVault (line 100-110): Allocation percentages
uint16 councilBps = 5000;      // 50% to council
uint16 merchantBps = 2500;     // 25% to merchant pool
uint16 headhunterBps = 1500;   // 15% to headhunter pool
uint16 operationsBps = 1000;   // 10% to operations

// ProofScoreBurnRouter (line 60-65): Different split
uint16 baseBurnBps = 150;      // 1.5%
uint16 baseSanctumBps = 5;     // 0.05%
uint16 baseEcosystemBps = 20;  // 0.2%

// DISCONNECT:
// BurnRouter says 0.2% → ecosystem
// EcosystemVault receives and splits 50% council, 25% merchant...
// But if ProofScoreBurnRouter.baseEcosystemBps changed to 10%, EcosystemVault doesn't rescale its splits
// Council might get 50% of 0.1% instead of 0.2%
```

**Why This Is a Problem:**
If ProofScoreBurnRouter fee policy changes, EcosystemVault allocations don't auto-adjust, causing revenue misalignment.

**Severity:** HIGH

---

### H-7: FlashLoan Fee Split Silent Fail to FeeDistributor
**Affected Contracts:**
- VFIDEFlashLoan, FeeDistributor

**Issue Category:** Cross-Contract Call Assumptions + Fee Calculation Conflicts

**Specific Code Locations/Patterns:**
```solidity
// VFIDEFlashLoan (line 330-350): Fee distribution
uint256 lenderFee = (fee * 90) / 100;  // 90% to lender
uint256 protocolFee = fee - lenderFee; // 10% to protocol (FeeDistributor)

if (protocolFee > 0) {
  try IFeeDistributor_FL(feeDistributor).receiveFee(protocolFee) {
    totalProtocolFees += protocolFee;
  } catch {
    // SILENT FAIL: protocol fee dropped
  }
}

// FeeDistributor (line 64): receiveFee() 
function receiveFee(uint256 amount) external nonReentrant {
  bool isVFIDEToken = msg.sender == address(vfideToken);
  bool isAuthorizedSource = authorizedFeeSources[msg.sender];
  if (!isVFIDEToken && !isAuthorizedSource) revert NotAuthorized();
  // ...
}

// ISSUE: VFIDEFlashLoan not authorized unless manually added
// If not in authorizedFeeSources[], receiveFee() reverts (silently caught)
// Protocol fees accumulate in VFIDEFlashLoan, never distributed
```

**Why This Is a Problem:**
Flash loan protocol fees stuck in VFIDEFlashLoan, never reaching FeeDistributor for 5-way split.

**Severity:** HIGH

---

### H-8: DAOTimelock Secondary Executor Inconsistent Delay
**Affected Contracts:**
- DAOTimelock

**Issue Category:** Timing/Lock Mechanism Conflict

**Specific Code Locations/Patterns:**
```solidity
// DAOTimelock (line 80-120): Primary vs secondary executor
function execute(bytes32 id) external payable nonReentrant {
  // Check block.timestamp >= op.eta
  require(block.timestamp >= op.eta, "too early");
}

function executeBySecondary(bytes32 id) external {
  // Check secondary delay on top of ETA
  require(block.timestamp >= op.eta + SECONDARY_EXECUTOR_DELAY, "secondary delay");
  // SECONDARY_EXECUTOR_DELAY = 3 days (fixed)
}

// TIMING ISSUE:
// Primary: ETA + 0 = can execute at ETA
// Secondary: ETA + 3 days = must wait extra 3 days
// BUT: If ETA is 30 days out, why 3 more?
// If ETA is 12 hours out, 3 days is excessive

// No proportional scaling
```

**Why This Is a Problem:**
Secondary executor has fixed 3-day additional delay regardless of primary ETA, potentially making backup execution ineffective for urgent governance.

**Severity:** HIGH

---

## MEDIUM SEVERITY ISSUES

### M-1: ProofScoreBurnRouter Score Snapshot Array Gas Unbounded
**Affected Contracts:**
- ProofScoreBurnRouter

**Issue Category:** Timing/Lock Mechanism Conflicts

**Code:**
```solidity
mapping(address => ScoreSnapshot[]) public scoreHistory;
uint256 public constant MAX_SCORE_SNAPSHOTS = 32; // Hard cap
// BUT: scoreHistory array grows with each updateScore() call
// If called more than 32 times, gas for iteration explodes
```

**Severity:** MEDIUM

---

### M-2: SanctumVault Approval Requirement Can Be Reduced to 1 Without Consensus
**Affected Contracts:**
- SanctumVault

**Issue Category:** Access Control Inconsistency

**Code:**
```solidity
uint8 public approvalsRequired = 2; // M-2 FIX: Default to 2
// setApprovalsRequired(uint8 required) external onlyDAO {
//   approvalsRequired = required; // No lower bound check!
// }
// DAO can set to 1, eliminating multi-approval requirement
```

**Severity:** MEDIUM

---

### M-3: VaultRecoveryClaim Challenge Period Extension Not Applied to All Paths
**Affected Contracts:**
- VaultRecoveryClaim

**Issue Category:** Timing/Lock Mechanism Conflict

**Code:**
```solidity
// F-54 FIX: Active vault challenge period extended
if (vaultLastActivity[vault] > block.timestamp - VAULT_ACTIVITY_WINDOW) {
  challengePeriod = ACTIVE_VAULT_CHALLENGE_PERIOD; // 14 days
} else {
  challengePeriod = CHALLENGE_PERIOD; // 7 days
}

// BUT: Only applied in guardian path, not verifier-only path
// If verifier path initiated, uses VERIFIER_ONLY_CHALLENGE_PERIOD (14 days fixed)
// Activity window check doesn't apply
```

**Severity:** MEDIUM

---

### M-4: CircuitBreaker Price Sample Window Vulnerability to Single Spike
**Affected Contracts:**
- CircuitBreaker

**Issue Category:** Timing/Lock Mechanism Conflict

**Code:**
```solidity
uint256[10] public priceSamples;
uint8 public priceSampleIndex;

// Stores last 10 price samples
// But: CircuitBreaker can trigger on single sample if drop > threshold
// F-31 FIX mentions rolling window, but enforcement missing
```

**Severity:** MEDIUM

---

### M-5: EmergencyControl Foundation Member Change Delay Only on Foundation-Initiated Changes
**Affected Contracts:**
- EmergencyControl

**Issue Category:** Access Control Inconsistency

**Code:**
```solidity
// Foundation-initiated member changes queued for 24 hours
// But: DAO-initiated immediate changes (bypasses queue)
// DAO can add/remove emergency committee members instantly
```

**Severity:** MEDIUM

---

### M-6: VFIDETermLoan Score Tiers Not Synchronized with Seer Thresholds
**Affected Contracts:**
- VFIDETermLoan, Seer

**Issue Category:** Access Control Inconsistency

**Code:**
```solidity
uint16 public constant TIER_1_SCORE = 5000;  // Neutral
uint16 public constant TIER_2_SCORE = 6000;
// ...vs...
// Seer: minForGovernance = 6000?, minForMerchant = 5600?
// No canonical constant file
```

**Severity:** MEDIUM

---

### M-7: DutyDistributor Lacks Rate Limiting for maxPointsPerUser
**Affected Contracts:**
- DutyDistributor

**Issue Category:** Access Control Inconsistency

**Code:**
```solidity
function onVoteCast(...) {
  if (userPoints[voter] + pointsPerVote <= maxPointsPerUser) {
    userPoints[voter] += pointsPerVote;
  }
}
// Per-user rate limit but NO per-epoch or per-day cooldown
// User can vote in every block to reach cap instantly
```

**Severity:** MEDIUM

---

## LOW SEVERITY ISSUES

### L-1: StablecoinRegistry Pause State Not Checked in Critical Paths
**Affected Contracts:**
- StablecoinRegistry

**Issue Category:** Access Control Inconsistency

**Code:**
```solidity
contract StablecoinRegistry is Ownable, Pausable {
  function addStablecoin(...) external onlyGovernance whenNotPaused {
    // Checked
  }
  
  function isAllowed(address stable) external view returns (bool) {
    // NO whenNotPaused check in view function
    // But pause state retrieved by MerchantPortal could be stale
  }
}
```

**Severity:** LOW

---

### L-2: ProofScoreBurnRouter Missing Bounds on microTxMaxUsd6
**Affected Contracts:**
- ProofScoreBurnRouter

**Issue Category:** Data Structure Misalignment

**Code:**
```solidity
uint256 public microTxMaxUsd6; // No bounds check
// Can be set to 0 or >1M, breaking micro-transaction logic
```

**Severity:** LOW

---

### L-3: DevReserveVestingVault Backdating Allow 30 Days Without Justification Comment
**Affected Contracts:**
- DevReserveVestingVault

**Issue Category:** Timing/Lock Mechanism Conflict

**Code:**
```solidity
// H-08 FIX: Prevent DAO from backdating more than 30 days
require(timestamp >= uint64(block.timestamp) - 30 days, "DV: too far in past");
// Why 30 days? No justification in code comment
// Seems arbitrary compared to other timelock windows (7/14/48 days)
```

**Severity:** LOW

---

### L-4: VaultRegistry Username Collision Not Prevented Across Vaults
**Affected Contracts:**
- VaultRegistry

**Issue Category:** Data Structure Misalignment

**Code:**
```solidity
mapping(bytes32 => bool) public usernameTaken;
// FINAL-06: collision-safe storage of all vaults sharing recovery id
mapping(bytes32 => address[]) public vaultsByRecoveryId;

// But usernameTaken is 1:1, not 1:many
// If two users claim same hashed username in different phrasings
// Risk of hash collision (though cryptographically low)
```

**Severity:** LOW

---

## SUMMARY TABLE

| Severity | Issue ID | Contracts Affected | Category |
|----------|----------|-------------------|----------|
| CRITICAL | C-1 | 7 | Access Control |
| CRITICAL | C-2 | 5 | Token Type Incompatibility |
| CRITICAL | C-3 | 6 | Role Definition Conflict |
| CRITICAL | C-4 | 4 | Initialization Mismatch |
| CRITICAL | C-5 | 3 | Cross-Contract Call |
| HIGH | H-1 | 2 | Data Structure Misalignment |
| HIGH | H-2 | 1 | Timing Conflict |
| HIGH | H-3 | 3 | Timing Conflict |
| HIGH | H-4 | 2 | Circular Dependency |
| HIGH | H-5 | 2 | Data Structure Misalignment |
| HIGH | H-6 | 3 | Fee Calculation Conflict |
| HIGH | H-7 | 2 | Cross-Contract Call |
| HIGH | H-8 | 1 | Timing Conflict |
| MEDIUM | M-1..M-7 | 8 | Various |
| LOW | L-1..L-4 | 4 | Various |

---

## REMEDIATION PRIORITY

1. **Immediate (24hrs):**
   - C-1: Add timelock to StablecoinRegistry governance rotation
   - C-2: Implement decimal validation re-check in MerchantPortal
   - C-5: Remove `try-catch` from FeeDistributor callback, require success

2. **High Priority (1 week):**
   - C-3: Create ScoringConstants library, synchronize thresholds
   - C-4: Enforce guardian setup validation in CardBoundVault
   - H-1: Align spend limit enforcement across vault types
   - H-2: Verify fee policy setters all enforce cooldown

3. **Medium Priority (2 weeks):**
   - H-3 through H-8: Implement caching, delay adjustment, authorization fixes
   - M-1 through M-7: Add bounds checks, rate limits, synchronization

---

**Audit Completed:** April 28, 2026  
**Next Steps:** Schedule remediation standups per priority tier
