# VFIDE Smart Contract Reference

## Contract Overview

| Contract | LOC | Purpose | Status |
|----------|-----|---------|--------|
| VFIDEToken.sol | 448 | Core ERC20 with vault-only transfers | Production Ready |
| VaultInfrastructure.sol | 486 | Non-custodial vault system | Production Ready |
| VFIDETrust.sol | 631 | ProofScore reputation system | Production Ready |
| MerchantPortal.sol | 562 | 0% fee payment processing | Production Ready |
| ProofScoreBurnRouter.sol | 202 | Dynamic fee calculation | Production Ready |
| DAO.sol | 187 | Score-weighted governance | Production Ready |
| SecurityHub.sol | ~150 | Cross-contract security | Production Ready |
| RebateSystem.sol | ~120 | Merchant rebates | Production Ready |

**Total:** 26 core contracts, ~8000 lines of Solidity

---

## VFIDEToken.sol

### Purpose
Core ERC20 token with vault-only transfer enforcement and ProofScore-aware fees.

### Key Functions

#### Transfer (Vault-Only)
```solidity
function _update(address from, address to, uint256 value) internal override {
    if (from != address(0) && to != address(0)) {
        if (!isVault[from] && !isVault[to]) revert VF_NOT_VAULT_TRANSFER();
    }
    // Fee calculation and routing
    super._update(from, to, value);
}
```

#### Fee Calculation
```solidity
function calculateFee(address from, address to, uint256 amount) 
    public view returns (uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount) 
{
    uint256 proofScore = trustRegistry.getProofScore(from);
    uint256 feeBps = burnRouter.calculateFeeBps(proofScore);
    // Split: 2% burn, 0.5% sanctum, 0.5% ecosystem (base)
}
```

### Key State Variables
```solidity
uint256 public constant MAX_SUPPLY = 200_000_000 * 10**18;
uint256 public constant DEV_RESERVE_CAP = 40_000_000 * 10**18;
uint256 public constant NODE_REWARD_CAP = 75_000_000 * 10**18;

bool public circuitBreaker = false;
bool public policyLocked = false;

mapping(address => bool) public isVault;
```

### Events
```solidity
event FeeApplied(address indexed from, address indexed to, 
                 uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount,
                 address sanctumSink, address ecosystemSink);
event CircuitBreakerToggled(bool enabled);
event PolicyLocked();
```

### Access Control
- `onlyDAO()`: Parameter changes, circuit breaker
- `onlyOwner()`: Initial setup only
- Timelock protection on governance actions

---

## VaultInfrastructure.sol

### Purpose
Non-custodial smart contract vaults with guardian recovery.

### Key Functions

#### Create Vault
```solidity
function createVault(address[] memory guardians) external returns (address vaultAddress) {
    require(guardians.length >= 3, "Minimum 3 guardians");
    // Deploy vault contract
    // Set owner and guardians
    // Register with token contract
}
```

#### Guardian Recovery
```solidity
function initiateRecovery(address vaultAddress, address newOwner) external {
    require(isGuardian[msg.sender], "Not guardian");
    // Start recovery proposal
    // Requires 2-of-3 guardian approval
}
```

### Vault Structure
```solidity
struct Vault {
    address owner;
    address[] guardians;
    uint256 createdAt;
    bool frozen;
    uint256 recoveryThreshold; // Default: 2
}

struct Guardian {
    address guardianAddress;
    bool isActive;
    uint256 addedAt;
    bytes32 nameHash;
}
```

### Guardian Recovery Process
1. Guardian A calls `initiateRecovery(vault, newOwner)`
2. Guardian B calls `approveRecovery(vault)`
3. After 2-of-3 approval + 7-day timelock → ownership transfers
4. Old owner can cancel within timelock period

---

## VFIDETrust.sol

### Purpose
On-chain reputation system (ProofScore 0-10000, 10x precision for percentages).

### ProofScore Components

```solidity
struct ProofScoreComponents {
    uint256 capitalStability;      // 0-2000 (vault balance stability)
    uint256 behavioralConsistency; // 0-2000 (on-time payments, no disputes)
    uint256 socialEndorsements;    // 0-1500 (peer endorsements)
    uint256 credentials;           // 0-1500 (verified identity, KYC)
    uint256 activityLevel;         // 0-1500 (transaction frequency)
    uint256 fixedBonus;           // 0-1500 (discretionary, DAO-controlled)
}
```

### Key Functions

#### Get ProofScore
```solidity
function getProofScore(address user) public view returns (uint256) {
    ProofScoreComponents memory components = scores[user];
    uint256 total = components.capitalStability 
                  + components.behavioralConsistency
                  + components.socialEndorsements
                  + components.credentials
                  + components.activityLevel
                  + components.fixedBonus;
    return min(total, 10000); // 10x scale: 10000 = 100%
}
```

#### Endorse User
```solidity
function endorseUser(address user) external {
    uint256 myScore = getProofScore(msg.sender);
    require(myScore >= 5000, "Insufficient score to endorse"); // 50% = 5000
    require(endorsementStake >= MIN_ENDORSEMENT_STAKE, "Stake required");
    // Apply endorsement
    // Decay over time if user misbehaves
}
```

### Score Thresholds
```solidity
// 10x precision scale (0-10000)
uint256 public constant LOW_TRUST_THRESHOLD = 4000;  // 40% - +1.5% fee penalty
uint256 public constant HIGH_TRUST_THRESHOLD = 8000; // 80% - -0.5% fee reduction
uint256 public constant MIN_FOR_GOVERNANCE = 5400;   // 54% - Can vote
uint256 public constant MIN_FOR_MERCHANT = 5600;     // 56% - Can be merchant
uint256 public constant MIN_FOR_COUNCIL = 7000;      // 70% - Can be council member
```

### Anti-Gaming Measures
- **Capital requirement:** Must lock tokens to endorse
- **Endorsement decay:** Scores decay over time without activity
- **Fatigue system:** Limits on endorsement frequency
- **Slash mechanism:** Endorsers lose stake if endorsee misbehaves
- **Score caps:** Each component has maximum value

---

## MerchantPortal.sol

### Purpose
Payment processing with 0% merchant fees.

### Key Functions

#### Register Merchant
```solidity
function registerMerchant(bytes32 businessName) external {
    require(!merchants[msg.sender].isRegistered, "Already registered");
    merchants[msg.sender] = Merchant({
        isRegistered: true,
        isVerified: false,
        proofScore: 0,
        totalVolume: 0,
        transactionCount: 0,
        registeredAt: block.timestamp
    });
}
```

#### Process Payment
```solidity
function processPayment(address merchant, uint256 amount, bytes32 orderId) 
    external nonReentrant 
{
    require(merchants[merchant].isRegistered, "Merchant not registered");
    // 0% fee on payment itself
    // Uses vault-to-vault transfer (bypasses transfer fees)
    token.transferFrom(msg.sender, merchant, amount);
    emit PaymentProcessed(msg.sender, merchant, amount, orderId);
}
```

### Merchant Structure
```solidity
struct Merchant {
    bool isRegistered;
    bool isVerified;           // Manual verification by DAO
    uint256 proofScore;        // Inherited from trust registry
    uint256 totalVolume;       // Cumulative payment volume
    uint256 transactionCount;  // Total payments received
    uint256 registeredAt;      // Registration timestamp
    string businessName;       // Public business name
    bytes32 businessHash;      // Hash of business details
}
```

### Fee Structure
```solidity
uint256 public protocolFeeBps = 0; // 0% protocol fee (verified)

// Payment flow:
// Customer vault → Merchant vault: 0% fee
// (Transfer fees only apply to non-payment transfers)
```

---

## ProofScoreBurnRouter.sol

### Purpose
Dynamic fee calculation based on ProofScore, with deflationary burn mechanism.

### Fee Calculation

```solidity
function calculateFeeBps(uint256 proofScore) public view returns (uint256) {
    uint256 baseFee = baseBurnBps + baseSanctumBps + baseEcosystemBps; // 3%
    
    if (proofScore >= highTrustThreshold) {
        return baseFee - highTrustReductionBps; // -0.5% = 2.5% total
    } else if (proofScore <= lowTrustThreshold) {
        return baseFee + lowTrustPenaltyBps; // +1.5% = 4.5% total
    } else {
        return baseFee; // 3% total
    }
}
```

### Base Fee Parameters
```solidity
uint256 public baseBurnBps = 200;      // 2.0% → burned
uint256 public baseSanctumBps = 50;    // 0.5% → charity vault
uint256 public baseEcosystemBps = 50;  // 0.5% → ecosystem fund

// Trust modifiers
uint256 public highTrustReductionBps = 50;  // -0.5% for score ≥700
uint256 public lowTrustPenaltyBps = 150;    // +1.5% for score ≤350
```

### Charity Split (Sanctum Vault)
```solidity
// 67% to rotating cause
// 17% to ecosystem development
// 17% to fixed causes (education, etc.)

function distributeSanctumFees() external {
    uint256 sanctumBalance = token.balanceOf(sanctumVault);
    uint256 rotatingShare = sanctumBalance * 67 / 100;
    uint256 ecosystemShare = sanctumBalance * 17 / 100;
    uint256 fixedShare = sanctumBalance * 17 / 100;
    // Distribute to designated addresses
}
```

### Fee Examples
| ProofScore | Burn | Sanctum | Ecosystem | Total |
|------------|------|---------|-----------|-------|
| 800 (High) | 1.5% | 0.5%    | 0.5%      | 2.5%  |
| 500 (Normal)| 2.0%| 0.5%    | 0.5%      | 3.0%  |
| 200 (Low)  | 3.5% | 0.5%    | 0.5%      | 4.5%  |

---

## DAO.sol

### Purpose
Score-weighted governance for parameter changes and upgrades.

### Voting Power
```solidity
function getVotingPower(address account) public view returns (uint256) {
    uint256 balance = token.balanceOf(account);
    uint256 proofScore = trustRegistry.getProofScore(account);
    return balance * proofScore / 1000;
}
```

**Example:**
- User A: 10,000 VFIDE, ProofScore 800 → Voting Power = 8,000
- User B: 20,000 VFIDE, ProofScore 300 → Voting Power = 6,000
- User A has more voting power despite fewer tokens

### Proposal Types
```solidity
enum ProposalType {
    Generic,         // General proposals
    Financial,       // Treasury spending
    ProtocolChange,  // Parameter adjustments
    SecurityAction   // Emergency actions
}
```

### Proposal Flow
1. **Create:** Any user with 1000+ voting power can propose
2. **Delay:** 1-day review period before voting starts
3. **Vote:** 3-day voting period
4. **Queue:** If passed, enters timelock (3 days)
5. **Execute:** After timelock, anyone can execute

### Protections
```solidity
uint256 public constant MIN_VOTING_PERIOD = 3 days;
uint256 public constant MIN_TIMELOCK = 3 days;
uint256 public constant QUORUM_BPS = 1000; // 10% of total voting power

// Vote fatigue (prevents spam)
mapping(address => uint256) public lastVoteTime;
uint256 public constant VOTE_COOLDOWN = 1 days;
```

---

## Security Best Practices

### Access Control Patterns
```solidity
// DAO-only for critical functions
modifier onlyDAO() {
    if (msg.sender != dao) revert VF_NOT_DAO();
    _;
}

// Timelock for parameter changes
modifier afterTimelock(uint256 proposalId) {
    if (block.timestamp < proposals[proposalId].executeTime) 
        revert VF_TIMELOCK_NOT_EXPIRED();
    _;
}
```

### Reentrancy Protection
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function processPayment(...) external nonReentrant {
    // Safe from reentrancy attacks
}
```

### Circuit Breaker
```solidity
bool public circuitBreaker = false;

modifier whenNotCircuitBroken() {
    if (circuitBreaker) revert VF_CIRCUIT_BROKEN();
    _;
}

function toggleCircuitBreaker() external onlyDAO {
    circuitBreaker = !circuitBreaker;
    emit CircuitBreakerToggled(circuitBreaker);
}
```

### Policy Lock
```solidity
bool public policyLocked = false;

modifier whenNotPolicyLocked() {
    if (policyLocked) revert VF_POLICY_LOCKED();
    _;
}

function lockPolicy() external onlyDAO {
    policyLocked = true;
    emit PolicyLocked();
}
```

---

## Error Codes

```solidity
// Token errors
error VF_NOT_VAULT_TRANSFER();
error VF_EXCEEDS_SUPPLY_CAP();
error VF_CIRCUIT_BROKEN();
error VF_POLICY_LOCKED();

// Trust errors
error VF_INVALID_PROOF_SCORE();
error VF_INSUFFICIENT_SCORE();
error VF_ENDORSEMENT_COOLDOWN();

// Merchant errors
error VF_NOT_REGISTERED_MERCHANT();
error VF_MERCHANT_NOT_VERIFIED();
error VF_PAYMENT_FAILED();

// DAO errors
error VF_NOT_DAO();
error VF_TIMELOCK_NOT_EXPIRED();
error VF_QUORUM_NOT_REACHED();
error VF_PROPOSAL_NOT_PASSED();
```

---

## Contract Addresses (After Deployment)

### zkSync Era Mainnet
```
VFIDEToken:              TBD
VaultInfrastructure:     TBD
VFIDETrust:              TBD
MerchantPortal:          TBD
ProofScoreBurnRouter:    TBD
DAO:                     TBD
SecurityHub:             TBD
```

### zkSync Sepolia Testnet
```
VFIDEToken:              TBD
VaultInfrastructure:     TBD
VFIDETrust:              TBD
MerchantPortal:          TBD
ProofScoreBurnRouter:    TBD
DAO:                     TBD
SecurityHub:             TBD
```

---

## Integration Guide

### For DApp Developers

1. **Check if user has vault:**
```javascript
const hasVault = await vaultInfrastructure.hasVault(userAddress);
```

2. **Get user ProofScore:**
```javascript
const proofScore = await vfideTrust.getProofScore(userAddress);
```

3. **Calculate transfer fee:**
```javascript
const feeBps = await burnRouter.calculateFeeBps(proofScore);
const fee = amount.mul(feeBps).div(10000);
```

4. **Process payment (0% fee):**
```javascript
await merchantPortal.processPayment(merchantAddress, amount, orderId);
```

### For Merchants

1. **Register as merchant:**
```javascript
await merchantPortal.registerMerchant("My Business Name");
```

2. **Check payment status:**
```javascript
const payment = await merchantPortal.getPayment(orderId);
```

3. **Claim rebates (if eligible):**
```javascript
await rebateSystem.claimRebate();
```

---

## Testing Contracts

### Run all tests
```bash
npm test
```

### Run specific test suite
```bash
npx hardhat test test/token/VFIDEToken_Batch_01.test.js
```

### Coverage report
```bash
npm run coverage
```

### Fuzzing (Echidna)
```bash
echidna-test contracts/VFIDEToken.sol --contract VFIDEToken
```

---

## References

- **Architecture:** See `ARCHITECTURE.md`
- **Economics:** See `ECONOMICS.md`
- **Security:** See `SECURITY.md`
- **Deployment:** See `DEPLOYMENT.md`
- **Source Code:** `contracts/` directory
- **Tests:** `test/` directory (700+ files)
