# VFIDE – System Spec (Part 1: Global, Token, Events, Presale, Vaults)

This document is **Part 1** of the full VFIDE ecosystem specification.  
It covers:

1. Global rules  
2. Token & supply  
3. Event / logging layer (ProofLedger)  
4. Presale  
5. Vaults & Dev vesting  

---

# 1. Global Concepts & Cross-Cutting Rules

1. **Fixed token supply** – 200,000,000 VFIDE. No minting after deployment.  
2. **No hidden taxes in the token** – all burns, fees, and splits happen in *external modules*, not inside ERC-20 transfers.  
3. **Vaults guard serious money** – large or sensitive movements must occur through vaults (with cooldowns, guardian approvals, PanicGuard checks).  
4. **Behavior is logged** – trust-relevant actions emit events into **ProofLedger**.  
5. **Trust is behavior-based** – ProofScore is based on actions, not identity.  
6. **DAO becomes ultimate authority** – after transition, all mutable parameters are changed only by DAO + timelock.

Every module must reinforce these rules.

---

# 2. Token & Supply Modules

## 2.1 VFIDE Token

**File:** `contracts/token/VFIDE.sol`  
**Type:** ERC-20, immutable supply

### Responsibilities
Implements standard ERC-20:

- `totalSupply()` – fixed at **200,000,000 VFIDE**  
- `balanceOf`  
- `transfer`  
- `approve`  
- `transferFrom`  
- `allowance`

### Initialization

Constructor mints the **entire supply once** and distributes to:

- `presaleDistributionVault` – presale fulfillment + initial liquidity  
- `devVestingVault` – **40,000,000 VFIDE** locked under vesting  
- `stakingRewardsVault` – pool for staking rewards  
- `sanctumVault` – impact/charity pool  
- `ecosystemOpsVault` – operations budget  

This allocation is fixed and must match public documentation.

### Constraints

- **NO mint() after deployment**  
- Optional `burn()` only allowed if:
  - Anyone may burn their own tokens, **or**
  - Only BurnManager may call it (controlled burns)

- NO blacklist functions  
- NO pausable transfers  
- NO “upgrade proxy” — contract is final, verified on explorer  

### Events

- Standard ERC-20: `Transfer`, `Approval`  
- No hidden or obscured event types

---

# 3. Event / EVT Layer – ProofLedger

## 3.1 ProofLedger

**File:** `contracts/trust/ProofLedger.sol`  
**Purpose:** Single authoritative on-chain event logger for trust-critical behavior.

### Design Goals

- Records only important actions that matter to trust  
- Structured + machine-indexable  
- Cannot be spoofed because only authorized modules may log  

### State

```solidity
mapping(address => bool) isAuthorizedEmitter;
mapping(bytes32 => bool) processed; // optional
```

### Core Function

```solidity
function logAction(
    address user,
    uint8 actionType,
    bytes32 contextHash
) external;
```

### actionType mapping (agreed)

1 = GuardianLock triggered  
2 = GuardianLock released  
3 = PanicGuard triggered  
4 = Chain-of-Return recovery initiated  
5 = Chain-of-Return recovery completed  
6 = Next-of-Kin transfer initiated  
7 = Next-of-Kin transfer completed  
8 = Large withdrawal requested  
9 = Large withdrawal executed  
10 = DAO dispute raised  
11 = DAO dispute resolved  
12 = Bounty reward paid  
13 = Sanctum disbursement executed  
14 = Burn executed (BurnManager)  
15+ reserved  

### contextHash

A `keccak256` hash of metadata (amounts, timestamps, proposal IDs, etc.).  
Full data is stored off-chain and referenced by this hash.

### Event

```solidity
event ActionLogged(
    address indexed user,
    uint8 indexed actionType,
    bytes32 contextHash
);
```

### Access Control

Only official modules may log, including:

- GuardianLock  
- PanicGuard  
- ChainOfReturn  
- NextOfKin  
- SanctumVault  
- BurnManager  
- DAO dispute/bounty logic  

DAO may add/remove emitters.

---

# 4. Presale Module

## 4.1 VFIDEPresale

**File:** `contracts/presale/VFIDEPresale.sol`  
**Purpose:** Transparent 3-tier presale with stablecoin pricing + vesting.

### Parameters

Total allocation: **75,000,000 VFIDE**

#### Tier Pricing & Behavior

| Tier | Name              | Price  | Lock / Vesting |
|------|-------------------|--------|----------------|
| 1    | Founding Scrolls | $0.03  | Longest        |
| 2    | Oath Takers      | $0.05  | Medium         |
| 3    | Public Presale   | $0.07  | Shortest       |

### State

```solidity
IERC20 stablecoin;
address presaleVault;
address presaleTokenVault;
mapping(uint8 => TierConfig) tiers;
mapping(address => UserPurchase) userPurchases;
uint256 totalTokensSold;
```

TierConfig:

```solidity
struct TierConfig {
    uint256 priceInStable;
    uint256 maxTokens;
    uint256 minContribution;
    uint256 maxContribution;
    uint64 startTime;
    uint64 endTime;
    uint64 vestingStart;
    uint64 vestingDuration;
}
```

UserPurchase:

```solidity
struct UserPurchase {
    uint256 totalTokensAllocated;
    uint256 totalPaidStable;
    uint256 totalClaimed;
}
```

### purchase()

Steps:

1. Validate tier window  
2. Validate min/max contribution  
3. Calculate token amount:  
   `amountStable * 10**vfideDecimals / priceInStable`  
4. Ensure total allocation does not exceed **75,000,000**  
5. Transfer stablecoins to `presaleVault`  
6. Increase user allocation  
7. Emit `Purchased`  

### claim()

- Computes vested amount:  
  `vested = allocated * (elapsed / vestingDuration)`  
- Claimable = vested - claimed  
- Sends VFIDE from `presaleTokenVault`  
- Emits `Claimed`

### Events

```solidity
event Purchased(address user, uint8 tierId, uint256 amountStable, uint256 tokenAmount);
event Claimed(address user, uint256 amount);
```

---

# 5. Vault & Dev Vesting System

## 5.1 VaultFactory

**Purpose:** Deploy standardized user vaults (minimal proxies).  
Ensures uniform, audited code for all vaults.

### State

```solidity
address vaultImplementation;
address controller; // VaultController
mapping(address => address[]) userVaults;
```

### createVault()

- Deploy clone of template  
- Initialize with:
  - owner  
  - controller  
  - guardian modules  
- Register with VaultController  
- Emit `VaultCreated`

```solidity
event VaultCreated(address owner, address vault);
```

---

## 5.2 StandardVault

**Purpose:** Main protected storage for user tokens.

### State

```solidity
address owner;
address controller;

mapping(address => uint256) balances;

uint64 withdrawalCooldown;
uint256 largeWithdrawalThreshold;

bool locked; // from GuardianLock

struct WithdrawalRequest {
    address token;
    uint256 amount;
    uint64  requestTime;
    bool    executed;
    bool    canceled;
}

WithdrawalRequest[] withdrawalRequests;
```

### Key Functions

#### deposit(token, amount)

- Owner only  
- Transfers token from owner to vault  
- Updates internal balance  
- Emits `Deposited`

#### requestWithdrawal(token, amount)

- Owner only  
- Requires sufficient balance  
- Creates WithdrawalRequest with `requestTime`  
- Emits `WithdrawalRequested`  
- If amount >= threshold → calls ProofLedger (actionType 8)

#### executeWithdrawal(id)

- Owner only  
- Requires:
  - Not executed/canceled  
  - Cooldown passed  
  - Vault **not** locked by GuardianLock  
  - PanicGuard allows withdrawal  
- Transfers token to owner  
- Marks executed  
- Emits `WithdrawalExecuted`  
- If large → log via ProofLedger (actionType 9)

#### cancelWithdrawal(id)

- Owner only  
- Marks request as canceled  
- Emits `WithdrawalCanceled`

### Events

```solidity
event Deposited(address owner, address token, uint256 amount);
event WithdrawalRequested(address owner, uint256 requestId, address token, uint256 amount);
event WithdrawalExecuted(address owner, uint256 requestId);
event WithdrawalCanceled(address owner, uint256 requestId);
```

---

## 5.3 DevVestingVault

**Purpose:** Enforce hard-coded vesting on **40M VFIDE** for the dev.

### State / Params

- `beneficiary` = founder  
- `cliff` = 3 months  
- `vestingDuration` = 36 months  
- `totalAllocated` = 40,000,000 VFIDE  
- `released` tracks already paid out  

### release()

- Requires current time ≥ `start + cliff`  
- Computes vested amount linearly over `vestingDuration`  
- `releasable = vested - released`  
- Transfers to `beneficiary`  
- Emits `TokensReleased`

```solidity
event TokensReleased(uint256 amount);
```

No emergency withdraw, no changeBeneficiary, no schedule edits.

---

## 5.4 VaultController

**Purpose:** Enforce which calls must come from a vault and manage system exemptions.

### State

```solidity
mapping(address => bool) isVault;
mapping(address => bool) systemExempt;
mapping(bytes4 => bool) functionVaultOnly;
address owner;
```

### Responsibilities

- `registerVault(vault)` – called by VaultFactory  
- `setSystemExempt(system, exempt)` – allow system contracts to bypass vault-only checks  
- `setFunctionVaultOnly(sig, enabled)` – mark functions that must only be called from vaults  

### Events

```solidity
event VaultRegistered(address vault);
event SystemExemptSet(address system, bool exempt);
event FunctionVaultOnlySet(bytes4 sig, bool enabled);
```

---

# END OF PART 1
