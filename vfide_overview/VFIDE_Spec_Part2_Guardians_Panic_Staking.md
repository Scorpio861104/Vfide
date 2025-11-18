
# VFIDE – System Spec (Part 2: Guardians, Recovery, PanicGuard, Staking)

This document is Part 2 of the VFIDE ecosystem spec. It covers:

6. Guardian registry
7. GuardianLock
8. Chain-of-Return (recovery)
9. Next-of-Kin
10. PanicGuard
11. Staking

---

## 6. Guardian & Recovery Modules

### 6.1 GuardianRegistry

**File:** `contracts/guardians/GuardianRegistry.sol`  
**Purpose:** Track guardians and approval thresholds per vault.

**State**

```solidity
mapping(address => address[]) guardians; // vault => guardians
mapping(address => mapping(address => bool)) isGuardian; // vault => guardian => true/false
mapping(address => uint8) minLockApprovals;     // vault => approvals needed to lock/unlock
mapping(address => uint8) minRecoveryApprovals; // vault => approvals needed for recovery
```

**Functions**

- `setGuardians(address vault, address[] newGuardians, uint8 lockApprovals, uint8 recoveryApprovals)`
  - Callable only by the vault owner (ideally via a function exposed on the vault that calls this).
  - Clears previous guardian list for the vault.
  - Sets new list and thresholds.
  - Updates `isGuardian` mapping accordingly.
  - Emits `GuardiansUpdated`.

- `getGuardians(address vault)` – view, returns guardians array.
- `getLockThreshold(address vault)` – view, returns `minLockApprovals[vault]`.
- `getRecoveryThreshold(address vault)` – view, returns `minRecoveryApprovals[vault]`.

**Event**

```solidity
event GuardiansUpdated(
    address indexed vault,
    address[] guardians,
    uint8 lockApprovals,
    uint8 recoveryApprovals
);
```

---

### 6.2 GuardianLock

**File:** `contracts/guardians/GuardianLock.sol`  
**Purpose:** Allow guardians to lock/unlock vaults (soft freeze).

**State**

```solidity
GuardianRegistry registry;

mapping(address => bool) locked; // vault -> locked state
mapping(address => mapping(address => bool)) lockVotes; // vault => guardian => voted to lock
mapping(address => uint8) lockVoteCount; // vault => number of lock votes

mapping(address => mapping(address => bool)) unlockVotes;
mapping(address => uint8) unlockVoteCount;
```

**Functions**

- `requestLock(address vault)`
  - Caller must be a guardian of `vault` per `GuardianRegistry`.
  - If `lockVotes[vault][msg.sender]` is false, set to true and increment `lockVoteCount[vault]`.
  - If `lockVoteCount[vault] >= registry.getLockThreshold(vault)`:
    - `locked[vault] = true`.
    - Emit `LockStatusChanged(vault, true)`.
    - Log via `ProofLedger.logAction(vaultOwner, 1, contextHash)`.

- `requestUnlock(address vault)`
  - Similar logic but using `unlockVotes` and `unlockVoteCount`.
  - Once threshold reached:
    - `locked[vault] = false`.
    - Emit `LockStatusChanged(vault, false)`.
    - Log via ProofLedger actionType 2.

- `isLocked(address vault)` – view.

**Integration with vaults**

- `StandardVault` calls `GuardianLock.isLocked(address(this))` in `executeWithdrawal` and blocks if true.

**Event**

```solidity
event LockStatusChanged(address indexed vault, bool locked);
```

---

### 6.3 ChainOfReturn (Recovery)

**File:** `contracts/guardians/ChainOfReturn.sol`  
**Purpose:** Controlled migration of assets from a compromised or lost vault to a new vault.

**State**

```solidity
struct RecoveryRequest {
    address oldVault;
    address newVault;
    uint64  createdAt;
    uint8   approvals;
    bool    executed;
}

mapping(bytes32 => RecoveryRequest) recoveryRequests;
mapping(bytes32 => mapping(address => bool)) approvedByGuardian;
uint64 public recoveryDelay; // e.g., 7 days
GuardianRegistry registry;
```

**Functions**

- `initiateRecovery(address oldVault, address newVault)`
  - Caller must be a guardian of `oldVault` or the owner (via a limited path).
  - `bytes32 requestId = keccak256(abi.encode(oldVault, newVault, block.timestamp));`
  - Create `RecoveryRequest` with `createdAt = block.timestamp`, approvals = 0, executed = false.
  - Emit `RecoveryInitiated(requestId, oldVault, newVault)`.
  - Log via ProofLedger actionType 4.

- `approveRecovery(bytes32 requestId)`
  - Caller must be a guardian of `oldVault` in that request.
  - If not already approved, set `approvedByGuardian[requestId][msg.sender] = true` and increment `approvals`.
  - Emit `RecoveryApproved(requestId, guardian)`.

- `executeRecovery(bytes32 requestId)`
  - Load request; require not executed.
  - Require `block.timestamp >= createdAt + recoveryDelay`.
  - Require `approvals >= registry.getRecoveryThreshold(oldVault)`.
  - From `oldVault`, call an internal function or use a controlled interface to transfer all supported assets to `newVault`.
  - Set `executed = true`.
  - Emit `RecoveryExecuted(requestId)`.
  - Log via ProofLedger actionType 5.

**Events**

```solidity
event RecoveryInitiated(bytes32 indexed requestId, address indexed oldVault, address indexed newVault);
event RecoveryApproved(bytes32 indexed requestId, address indexed guardian);
event RecoveryExecuted(bytes32 indexed requestId);
```

---

### 6.4 NextOfKin

**File:** `contracts/guardians/NextOfKin.sol`  
**Purpose:** Inheritance mechanism triggered after prolonged inactivity.

**State**

```solidity
struct NextOfKinConfig {
    address nextOfKinVault;
    uint64  lastActive;
    uint64  inactivityPeriod;
}

mapping(address => NextOfKinConfig) configs; // key: originVault
```

**Functions**

- `setNextOfKin(address originVault, address nextOfKinVault, uint64 inactivityPeriod)`
  - Only originVault owner (via the vault) can call.
  - Set `nextOfKinVault` and `inactivityPeriod`.
  - Set `lastActive = block.timestamp`.
  - Emit `NextOfKinSet`.

- `recordActivity(address originVault)`
  - Callable by originVault on any meaningful user action (deposit, withdrawal, staking, governance participation via this vault, etc.).
  - Update `lastActive = block.timestamp`.

- `initiateTransfer(address originVault)`
  - Caller can be a guardian or the next-of-kin vault owner.
  - Require `block.timestamp >= configs[originVault].lastActive + configs[originVault].inactivityPeriod`.
  - Start a transfer request (similar to recovery) with its own delay and optional guardian approvals.
  - Emit `NextOfKinTransferInitiated`.
  - Log via ProofLedger actionType 6.

- `executeTransfer(address originVault)`
  - After delay and any required approvals, move assets from originVault to `nextOfKinVault`.
  - Emit `NextOfKinTransferExecuted`.
  - Log via ProofLedger actionType 7.

**Events**

```solidity
event NextOfKinSet(address indexed originVault, address indexed nextOfKinVault, uint64 inactivityPeriod);
event NextOfKinTransferInitiated(address indexed originVault);
event NextOfKinTransferExecuted(address indexed originVault, address indexed nextOfKinVault);
```

---

## 7. PanicGuard & Global Risk Controls

### 7.1 PanicGuard

**File:** `contracts/security/PanicGuard.sol`  
**Purpose:** Temporarily tighten rules for withdrawals and sensitive actions during emergencies or suspicious patterns.

**State**

```solidity
bool   globalPanicActive;
uint64 globalPanicUntil;

mapping(address => bool)   userPanicActive;
mapping(address => uint64) userPanicUntil;

uint256 maxWithdrawalDuringPanic;
bool    blockNewVaultsDuringPanic;
bool    disableDirectTransfersDuringPanic;
address owner; // DAO after transition
```

**Functions**

- `setGlobalPanic(bool active, uint64 duration)`
  - Only owner (DAO/timelock).
  - If activating:
    - `globalPanicActive = true;`
    - `globalPanicUntil = block.timestamp + duration;`
    - Emit `GlobalPanicSet(true, globalPanicUntil)`.
    - Log to ProofLedger (global context).
  - If deactivating:
    - `globalPanicActive = false;`
    - `globalPanicUntil = 0;`
    - Emit `GlobalPanicSet(false, 0)`.

- `setUserPanic(address user, bool active, uint64 duration)`
  - Only authorized security modules or DAO.
  - If activating:
    - `userPanicActive[user] = true;`
    - `userPanicUntil[user] = block.timestamp + duration;`
  - If deactivating:
    - `userPanicActive[user] = false;`
    - `userPanicUntil[user] = 0;`
  - Emit `UserPanicSet(user, active, until)`.
  - Log via ProofLedger actionType 3 for that user.

- `canWithdraw(address user, uint256 amount)` (view helper)
  - If global or user panic is active and not expired, enforce:
    - `amount <= maxWithdrawalDuringPanic` or return false.

**Integration**

- `StandardVault.executeWithdrawal` checks `PanicGuard.canWithdraw(owner, amount)` and either blocks or adjusts behavior.

**Events**

```solidity
event GlobalPanicSet(bool active, uint64 until);
event UserPanicSet(address indexed user, bool active, uint64 until);
```

---

## 8. Staking & Rewards

### 8.1 StakingPool

**File:** `contracts/staking/StakingPool.sol`  
**Purpose:** Non-custodial staking with predictable rewards; behavior visible to trust system.

**State**

```solidity
IERC20 vfide;

struct StakeInfo {
    uint256 amount;
    uint64  stakeTime;
    uint64  lockDuration;
    uint256 rewardDebt; // for pool accounting
}

mapping(address => StakeInfo) stakes;
uint256 totalStaked;
uint256 accRewardPerShare; // scaled integer
uint64  lastRewardTime;
uint256 rewardRate; // rewards per second or per block
```

**Key functions**

- `updatePool()`
  - Called before stake/unstake/claim.
  - If `block.timestamp > lastRewardTime`:
    - `timeElapsed = block.timestamp - lastRewardTime`.
    - `reward = timeElapsed * rewardRate`.
    - `accRewardPerShare += reward * 1e12 / totalStaked` (if `totalStaked > 0`).
    - `lastRewardTime = block.timestamp`.

- `stake(uint256 amount, uint64 lockDuration)`
  - Require caller to be a vault (via VaultController) unless exempt.
  - Call `updatePool()`.
  - Settle pending rewards for user if any (using `rewardDebt`).
  - Transfer `amount` VFIDE from caller to pool.
  - Increase user `amount` and `totalStaked`.
  - Set `stakeTime = block.timestamp` and store `lockDuration`.
  - Compute new `rewardDebt = amount * accRewardPerShare / 1e12`.
  - Emit `Staked`.

- `unstake(uint256 amount)`
  - Require `amount <= stakes[user].amount`.
  - Require `block.timestamp >= stakeTime + lockDuration` (or apply penalty if early exit is allowed).
  - Call `updatePool()`.
  - Calculate pending rewards and pay them.
  - Decrease user's `amount` and `totalStaked`.
  - Update `rewardDebt`.
  - Transfer `amount` VFIDE back to user vault.
  - Emit `Unstaked`.

- `claimRewards()`
  - Call `updatePool()`.
  - Compute pending rewards = `stakes[user].amount * accRewardPerShare / 1e12 - rewardDebt`.
  - Transfer rewards from `stakingRewardsVault` to user vault.
  - Update `rewardDebt`.
  - Emit `RewardsClaimed`.

**Events**

```solidity
event Staked(address indexed user, uint256 amount, uint64 lockDuration);
event Unstaked(address indexed user, uint256 amount);
event RewardsClaimed(address indexed user, uint256 amount);
```

Staking history feeds into ProofScore as a sign of long-term alignment and responsible behavior.

---

_End of Part 2. Other parts cover Fees/Burns/Sanctum, Merchant flows, Seer/ProofScore system, DAO, Academy, Earnables, Bounty, and the global builder checklist._
