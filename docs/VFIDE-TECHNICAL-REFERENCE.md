# VFIDE Technical Reference
## Complete Smart Contract & Function Catalog

**Version:** 1.0  
**Date:** 2026-01-23  
**Document Type:** Technical Reference - Smart Contracts, Functions, Features  
**Status:** Production

---

## Table of Contents

1. [Core Architecture](#1-core-architecture)
2. [Vault System](#2-vault-system)
3. [ProofScore & Trust System](#3-proofscore--trust-system)
4. [SEER Economic Engine](#4-seer-economic-engine)
5. [Merchant & Payment System](#5-merchant--payment-system)
6. [Security & Emergency Systems](#6-security--emergency-systems)
7. [Vault Registry & Recovery](#7-vault-registry--recovery)
8. [Governance & DAO](#8-governance--dao)
9. [Escrow System](#9-escrow-system)
10. [Badge & Achievement System](#10-badge--achievement-system)
11. [Social Payment Features](#11-social-payment-features)
12. [Referral & Incentive Systems](#12-referral--incentive-systems)
13. [Cross-Chain Operations](#13-cross-chain-operations)
14. [Stealth & Privacy Features](#14-stealth--privacy-features)
15. [Streaming Payments](#15-streaming-payments)
16. [Time Locks & Vesting](#16-time-locks--vesting)
17. [Multisig Operations](#17-multisig-operations)
18. [API Routes & Endpoints](#18-api-routes--endpoints)
19. [Complete Function Index](#19-complete-function-index)

---

## 1. Core Architecture

### 1.1 Smart Contract Addresses (Environment Variables)

```typescript
NEXT_PUBLIC_SEER_ADDRESS              // ProofScore contract
NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS // Merchant system
NEXT_PUBLIC_DAO_ADDRESS               // Governance
NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS      // Timelock for proposals
NEXT_PUBLIC_VAULT_FACTORY_ADDRESS     // Vault creation
NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS    // Vault lookup
NEXT_PUBLIC_ESCROW_ADDRESS            // Escrow contracts
NEXT_PUBLIC_BADGE_REGISTRY_ADDRESS    // Badge NFTs
NEXT_PUBLIC_HEADHUNTER_ADDRESS        // Referral system
NEXT_PUBLIC_MENTOR_ADDRESS            // Mentor/sponsor system
```

### 1.2 Network Configuration

```typescript
// Supported chains
chainId: 1     // Ethereum Mainnet
chainId: 137   // Polygon
chainId: 42161 // Arbitrum One
chainId: 10    // Optimism
chainId: 8453  // Base

// RPC Endpoints
NEXT_PUBLIC_ALCHEMY_KEY
NEXT_PUBLIC_INFURA_KEY
```

### 1.3 Token Standards

```typescript
// VFIDE Token: ERC-20 compatible
decimals: 18
totalSupply: Dynamic (deflationary)
burnable: true
transferFee: 0.25% - 5% (ProofScore-based)
```

---

## 2. Vault System

### 2.1 Vault Creation & Management

**Hook:** `useVaultHooks.ts`

#### Core Functions

```typescript
// 1. Check vault existence
useUserVault(): {
  vaultAddress: string | null
  hasVault: boolean
  isLoading: boolean
}

// 2. Create new vault
useCreateVault(): {
  createVault: () => Promise<Transaction>
  isLoading: boolean
}
// Creates non-custodial smart contract vault for user

// 3. Get vault balance
useVaultBalance(): {
  balance: bigint
  formatted: string
  isLoading: boolean
  refetchInterval: 2000ms
}

// 4. Transfer from vault
useTransferVFIDE(): {
  transfer: (to: string, amount: bigint) => Promise<Transaction>
  isLoading: boolean
}
```

### 2.2 Guardian System

```typescript
// 1. Get guardian list with maturity status
useVaultGuardiansDetailed(): {
  guardians: Array<{
    address: string
    addedAt: number
    isMature: boolean
    maturityDate: number
  }>
  isLoading: boolean
}

// 2. Check if guardian is mature
useIsGuardianMature(guardianAddress: string): {
  isMature: boolean
  maturityDate: number
  hoursRemaining: number
}

// 3. Add guardian with lock period
useSetGuardian(): {
  setGuardian: (guardianAddress: string) => Promise<Transaction>
  // Lock period: 7 days minimum before guardian can act
}

// 4. Guardian-initiated vault lock
useCastGuardianLock(vaultAddress: string): {
  lock: () => Promise<Transaction>
  // Emergency lock by mature guardian
}

// 5. Guardian vote on recovery claim
useGuardianVote(claimId: string, approve: boolean): {
  vote: () => Promise<Transaction>
  // Multi-sig voting for vault recovery
}

// 6. Cancel inheritance
useGuardianCancelInheritance(): {
  cancel: () => Promise<Transaction>
  // Prevent next-of-kin claim
}
```

### 2.3 Security Thresholds

```typescript
// Abnormal transaction detection
useAbnormalTransactionThreshold(): {
  threshold: bigint
  setThreshold: (amount: bigint) => Promise<Transaction>
}
// Triggers guardian notification if exceeded

// Balance snapshot modes
useSetBalanceSnapshotMode(mode: 'ABSOLUTE' | 'RELATIVE'): {
  setMode: () => Promise<Transaction>
}
// ABSOLUTE: Fixed amount
// RELATIVE: Percentage-based

// Create balance checkpoint
useUpdateBalanceSnapshot(): {
  update: () => Promise<Transaction>
  // Snapshot current balance for comparison
}

// Read snapshot
useBalanceSnapshot(): {
  snapshotBalance: bigint
  snapshotTime: number
  mode: 'ABSOLUTE' | 'RELATIVE'
}
```

### 2.4 Multi-Signature Transactions

```typescript
// Pending transaction system for large amounts
usePendingTransaction(txId: string): {
  transaction: {
    to: string
    amount: bigint
    createdAt: number
    expiresAt: number
    approvals: string[]
    threshold: number
    executed: boolean
  }
}

// Guardian approval
useApprovePendingTransaction(txId: string): {
  approve: () => Promise<Transaction>
  // Add guardian approval to pending TX
}

// Execute after threshold met
useExecutePendingTransaction(txId: string): {
  execute: () => Promise<Transaction>
  // Execute once approvals >= threshold
}

// Cleanup expired
useCleanupExpiredTransaction(txId: string): {
  cleanup: () => Promise<Transaction>
  // Remove expired pending transactions
}
```

### 2.5 Inheritance System

```typescript
// Check inheritance status
useInheritanceStatus(): {
  nextOfKin: string | null
  waitPeriod: number // seconds
  canClaim: boolean
  claimInitiatedAt: number
}

// Initiate Next-of-Kin claim
useInitiateClaim(): {
  initiate: (vaultAddress: string, proofDocuments: string[]) => Promise<Transaction>
  // Start recovery process with documentation
}
```

---

## 3. ProofScore & Trust System

### 3.1 Score Retrieval

**Hook:** `useProofScoreHooks.ts`

```typescript
// Get user's ProofScore
useProofScore(address?: string): {
  score: number           // 0-10000 scale
  tier: ScoreTier        // ELITE|HIGH_TRUST|NEUTRAL|LOW_TRUST|RISKY
  burnFee: number        // 0.25% - 5.0%
  permissions: {
    canVote: boolean      // ≥5400
    canMerchant: boolean  // ≥5600
    canCouncil: boolean   // ≥7000
    canEndorse: boolean   // ≥8000
  }
  isLoading: boolean
}
```

### 3.2 Score Tiers

```typescript
enum ScoreTier {
  ELITE = 8000-10000      // 0.25% fee, all permissions
  HIGH_TRUST = 6000-7999  // 0.50% fee, vote + merchant + council
  NEUTRAL = 4000-5999     // 1.00% fee, vote + merchant
  LOW_TRUST = 2000-3999   // 2.50% fee, limited access
  RISKY = 0-1999          // 5.00% fee, restricted
}

// Get tier object with details
getScoreTierObject(score: number): {
  name: string
  min: number
  max: number
  burnFee: number
  color: string  // UI color code
  description: string
}

// Get tier name only
getScoreTier(score: number): string
```

### 3.3 SEER Thresholds

```typescript
useSeerThresholds(): {
  minForGovernance: 5400  // Minimum to vote
  minForMerchant: 5600    // Minimum to accept payments
  minForCouncil: 7000     // Minimum for council membership
  minForEndorsement: 8000 // Minimum to endorse others
}
```

### 3.4 Endorsement System

```typescript
// Endorse another user (increases their score)
useEndorse(targetAddress?: string): {
  endorse: (reason: string) => Promise<Transaction>
  isLoading: boolean
  canEndorse: boolean  // Requires score ≥ 8000
}
// Cost: Endorser loses 50 points, target gains 100 points
// Cooldown: 7 days between same-user endorsements
```

### 3.5 Score Breakdown

```typescript
// Get detailed score components
useScoreBreakdown(address?: string): {
  breakdown: {
    baseScore: number         // Initial score
    transactionHistory: number // TX volume/count bonus
    accountAge: number        // Time-based bonus
    endorsements: number      // Peer endorsements
    badgeBonus: number        // Badge multipliers
    merchantBonus: number     // Merchant activity
    governanceBonus: number   // DAO participation
    penalties: number         // Negative events
  }
  totalScore: number
}
```

### 3.6 Badge Integration

```typescript
// Check badge ownership (badges boost score)
useHasBadge(badgeId: number, address?: string): {
  hasBadge: boolean
  badgeDetails: {
    id: number
    name: string
    scoreBoost: number  // Points added
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  }
}
```

---

## 4. SEER Economic Engine

### 4.1 Automated Fee Distribution

**All operations executed by smart contracts - zero manual intervention**

```typescript
// SEER Contract Address
const SEER_ADDRESS = process.env.NEXT_PUBLIC_SEER_ADDRESS

// Automatic fee split on every transfer
Transfer Event → {
  amount: bigint
  burnFee: 0.25% - 5.0% (ProofScore-based)
  
  // Instant atomic distribution:
  40% → BURN_ADDRESS (0x000...000)
  10% → SANCTUM_FUND (charity)
  50% → ECOSYSTEM_FUND (operations)
}
```

### 4.2 Burn Mechanism

```typescript
// Burns happen automatically on every transfer
// No function call needed - built into token transfer

Event TransferWithBurn {
  from: address
  to: address
  amount: uint256
  burnAmount: uint256      // 40% of fee
  sanctumAmount: uint256   // 10% of fee
  ecosystemAmount: uint256 // 50% of fee
  burnFeePercent: uint256  // Based on sender's ProofScore
}

// Burn address (tokens sent here are unrecoverable)
BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD
```

### 4.3 Service Payments (SEER Auto-Distribution)

```typescript
// Service payments are calculated and paid automatically
Contract ServicePaymentManager {
  // Auto-calculation based on:
  - completed on-chain work records
  - governance participation events
  - policy-configured payment rates
  - ecosystem fund availability
  
  // Automatic distribution on settlement cadence
  function distributeServicePayments() public {
    // Called by SEER-managed automation
    // No manual intervention required
  }
}

// User can claim eligible payments at any time
useClaimServicePayments(): {
  claim: () => Promise<Transaction>
  pendingPayments: bigint
}
```

### 4.4 DAO Governance Rewards (SEER Auto-Distribution)

```typescript
// Voting rewards distributed automatically
Contract DAORewards {
  // Auto-payment for participation:
  - Vote cast: 10 VFIDE
  - Proposal created: 50 VFIDE
  - Proposal passed: 200 VFIDE (proposer)
  
  // Paid immediately upon action via SEER
  Event VoteRewardPaid {
    voter: address
    proposalId: uint256
    reward: uint256
    timestamp: uint256
  }
}
```

### 4.5 Council Compensation (SEER Auto-Distribution)

```typescript
// Council salaries paid automatically quarterly
Contract CouncilSalary {
  // Quarterly distribution (5% of ecosystem fund)
  members: address[]
  quarterlyBudget: uint256
  
  // Auto-payment on quarter end
  function distributeQuarterlySalary() public {
    // Called by SEER timelock
    // Split equally among active council members
    for (member in activeMembers) {
      transfer(member, quarterlyBudget / activeMembers.length)
    }
  }
}

// Council member checks pending salary
useCouncilSalary(): {
  pendingSalary: bigint
  lastPaid: number
  nextPayment: number
  claim: () => Promise<Transaction>
}
```

### 4.6 Sanctum Fund (SEER Auto-Allocation)

```typescript
// Charitable allocations happen automatically
Contract SanctumFund {
  // 10% of every transfer fee → Sanctum
  // Auto-accumulation, DAO-controlled disbursement
  
  balance: uint256  // Accumulated charitable funds
  
  // DAO proposes and votes on charitable disbursements
  function proposeCharity(
    recipient: address,
    amount: uint256,
    description: string
  ) public onlyDAO
  
  // Auto-transfer after DAO approval
  function executeSanctumDisbursement(proposalId: uint256) public {
    // Called by DAO timelock after vote passes
  }
}
```

### 4.7 Ecosystem Fund Budget (SEER Auto-Funding)

```typescript
// 50% of fees → Ecosystem Fund (operations)
// Automatically allocated to budget categories

Contract EcosystemFund {
  // Auto-allocation percentages:
  infrastructure: 30%  // $13.7M/year at 10K daily txn
  development: 25%     // $11.4M/year
  security: 15%        // $6.8M/year
  marketing: 15%       // $6.8M/year
  servicePayments: 10% // $4.6M/year (work/governance compensation pool)
  council: 5%          // $2.3M/year (salaries)
  reserve: 50% of surplus // Emergency fund
  
  // Budget releases triggered by multi-sig
  function releaseQuarterlyBudget(category: string) public {
    // Requires 3/5 council approval
  }
}
```

---

## 5. Merchant & Payment System

### 5.1 Merchant Registration

**Hook:** `useMerchantHooks.ts`

```typescript
// Check merchant status
useIsMerchant(address?: string): {
  isMerchant: boolean
  suspended: boolean
  businessName: string
  category: string
  registeredAt: number
  totalVolume: bigint
  transactionCount: number
}

// Register as merchant
useRegisterMerchant(): {
  register: (
    businessName: string,
    category: 'RETAIL' | 'SERVICES' | 'DIGITAL' | 'FOOD' | 'OTHER',
    taxId?: string
  ) => Promise<Transaction>
  // Requires ProofScore ≥ 5600
}
```

### 5.2 Payment Processing

```typescript
// Process payment (merchant-initiated)
useProcessPayment(): {
  processPayment: (
    customer: string,
    amount: bigint,
    orderId: string,
    metadata: object
  ) => Promise<Transaction>
  // No processor fees - only burn fee + gas
}

// Direct merchant payout
usePayMerchant(): {
  pay: (merchant: string, amount: bigint, memo: string) => Promise<Transaction>
  // Customer-initiated payment
}

// Customer trust score for limits
useCustomerTrustScore(customerAddress?: string): {
  score: number
  dailyLimit: bigint   // Higher score = higher limit
  transactionLimit: bigint
}
```

### 5.3 Merchant Settings

```typescript
// Auto-convert to stablecoin
useSetAutoConvert(): {
  setAutoConvert: (enabled: boolean, stablecoin: 'USDC' | 'USDT' | 'DAI') => Promise<Transaction>
  // Automatically convert VFIDE revenue to stablecoin
}

// Set payout address
useSetPayoutAddress(): {
  setPayoutAddress: (address: string) => Promise<Transaction>
  // Separate address for receiving payments
}

// Merchant analytics
useMerchantAnalytics(): {
  analytics: {
    dailyVolume: bigint
    weeklyVolume: bigint
    monthlyVolume: bigint
    topCustomers: Array<{address: string, volume: bigint}>
    averageTransaction: bigint
    peakHours: number[]
  }
}
```

### 5.4 Fee Structure

```typescript
// Merchant payment fees
NO_PROCESSOR_FEE = true  // 0% platform fee
BURN_FEE = 0.25% - 5.0%  // Based on customer's ProofScore
GAS_FEE = variable       // Network gas cost

// Fee calculator
useFeeCalculator(amount: bigint): {
  burnFee: bigint       // Calculated from sender's score
  gasFee: bigint        // Estimated gas cost
  netAmount: bigint     // Amount - burnFee - gasFee
  effectiveFeePercent: number
}
```

---

## 6. Security & Emergency Systems

### 6.1 Vault Lock Mechanisms

**Hook:** `useSecurityHooks.ts`

```typescript
// Check if vault is locked (multi-layer)
useIsVaultLocked(vaultAddress?: string): {
  isLocked: boolean
  lockType: 'NONE' | 'EMERGENCY_BREAKER' | 'GUARDIAN_LOCK' | 'PANIC_GUARD'
  lockedAt: number
  lockedBy: string
}
// Lock hierarchy: EmergencyBreaker > GuardianLock > PanicGuard

// Quarantine status (panic mode)
useQuarantineStatus(vaultAddress?: string): {
  isQuarantined: boolean
  quarantineTimestamp: number
  releaseTime: number
}
```

### 6.2 Self-Panic System

```typescript
// Check if user can trigger panic
useCanSelfPanic(): {
  canPanic: boolean
  cooldownRemaining: number  // Must wait between panics
  accountAge: number         // Must be 30 days old
  lastPanic: number
}

// Trigger emergency vault freeze
useSelfPanic(): {
  panic: () => Promise<Transaction>
  // Immediately freezes all vault operations
  // 48-hour automatic release or guardian override
}
```

### 6.3 Guardian Emergency Actions

```typescript
// Guardian vault management
useVaultGuardians(vaultAddress?: string): {
  guardians: Array<{
    address: string
    addedAt: number
    isMature: boolean
    votingPower: number
  }>
}

// Check guardian status
useIsGuardian(vaultAddress?: string, guardianAddress?: string): {
  isGuardian: boolean
  canAct: boolean  // Mature + not suspended
}

// Guardian lock status
useGuardianLockStatus(vaultAddress?: string): {
  isLocked: boolean
  lockedBy: string
  lockedAt: number
  reason: string
}

// Cast guardian lock
useCastGuardianLock(vaultAddress: string): {
  lock: (reason: string) => Promise<Transaction>
  // Mature guardians can freeze vault
}
```

### 6.4 System-Wide Emergency

```typescript
// Global emergency status
useEmergencyStatus(): {
  isEmergency: boolean
  declaredAt: number
  declaredBy: string  // Council address
  reason: string
  affectedContracts: string[]
}

// Emergency breaker (council-only)
useEmergencyBreaker(): {
  activateEmergency: (
    reason: string,
    contracts: string[]
  ) => Promise<Transaction>
  // Requires 4/7 council approval
  // Pauses all specified contracts immediately
}
```

---

## 7. Vault Registry & Recovery

### 7.1 Vault Search Functions

**Hook:** `useVaultRegistry.ts`

```typescript
// Search by recovery ID
useSearchByRecoveryId(id: string): {
  vaultAddress: string | null
  owner: string
  createdAt: number
}

// Search by email (hashed)
useSearchByEmail(email: string): {
  vaultAddress: string | null
  // Email is hashed with salt for privacy
}

// Search by username
useSearchByUsername(username: string): {
  vaultAddress: string | null
  // Username must be unique
}

// Search by guardian
useSearchByGuardian(guardianAddress: string): {
  vaults: Array<{
    vaultAddress: string
    owner: string
    addedAt: number
  }>
}

// Search by wallet address
useSearchByWalletAddress(address: string): {
  vaultAddress: string | null
}

// Search by vault address
useSearchByVaultAddress(vaultAddress: string): {
  owner: string
  createdAt: number
  guardians: string[]
}

// Search by creation time
useSearchByCreationTime(timestamp: number): {
  vaults: string[]
}

// Enumerate vaults
useVaultByIndex(index: number): {
  vaultAddress: string
  owner: string
}

// Total vault count
useTotalVaults(): {
  count: number
}
```

### 7.2 Recovery Claim System

```typescript
// Initiate recovery claim
useInitiateClaim(): {
  initiate: (
    vaultAddress: string,
    claimType: 'INHERITANCE' | 'LOST_KEY' | 'EMERGENCY',
    proofDocuments: string[]  // IPFS hashes
  ) => Promise<Transaction>
  // Starts multi-sig recovery process
}

// Get claim status
useGetClaim(claimId: string): {
  claim: {
    vaultAddress: string
    claimant: string
    claimType: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHALLENGED' | 'FINALIZED'
    votes: Array<{guardian: string, approve: boolean, timestamp: number}>
    challengeDeadline: number
    finalizedAt: number
  }
}

// Guardian vote on claim
useGuardianVote(claimId: string, approve: boolean): {
  vote: () => Promise<Transaction>
  // Guardian casts vote on recovery claim
}

// Challenge a claim
useChallengeClaim(claimId: string): {
  challenge: (reason: string, evidence: string[]) => Promise<Transaction>
  // Original owner can contest claim
}

// Finalize claim
useFinalizeClaim(claimId: string): {
  finalize: () => Promise<Transaction>
  // Execute claim after approval threshold + challenge period
}

// Challenge time remaining
useChallengeTimeRemaining(claimId: string): {
  hoursRemaining: number
  canFinalize: boolean
}
```

### 7.3 Recovery Identifier Management

```typescript
// Set recovery ID
useSetRecoveryId(): {
  setRecoveryId: (id: string) => Promise<Transaction>
  // Unique identifier for vault recovery
}

// Set recovery email (hashed)
useSetRecoveryEmail(): {
  setEmail: (email: string) => Promise<Transaction>
  // Email stored as hash for privacy
}

// Set recovery username
useSetRecoveryUsername(): {
  setUsername: (username: string) => Promise<Transaction>
  // Public username for vault lookup
}
```

---

## 8. Governance & DAO

### 8.1 Proposal System

**Hook:** `useDAOHooks.ts`

```typescript
// Get DAO state
useDAOProposals(): {
  proposalCount: number
  activeProposals: Array<{
    id: number
    title: string
    description: string
    proposer: string
    status: 'PENDING' | 'ACTIVE' | 'SUCCEEDED' | 'DEFEATED' | 'EXECUTED'
    forVotes: bigint
    againstVotes: bigint
    abstainVotes: bigint
    startBlock: number
    endBlock: number
  }>
}

// Vote on proposal
useVote(proposalId: number, support: boolean): {
  vote: () => Promise<Transaction>
  // Requires ProofScore ≥ 5400
  // Voting power weighted by score
}

// Create proposal
useCreateProposal(): {
  propose: (
    title: string,
    description: string,
    targets: string[],
    values: bigint[],
    calldatas: bytes[],
    descriptionHash: bytes32
  ) => Promise<Transaction>
  // Requires ProofScore ≥ 7000
  // Proposer receives 50 VFIDE reward
}

// Execute proposal
useExecuteProposal(proposalId: number): {
  execute: () => Promise<Transaction>
  // After timelock delay + proposal passed
}
```

### 8.2 DAO Timelock

```typescript
// Timelock configuration
TIMELOCK_DELAY = 2 days  // Minimum delay before execution

// Queue proposal for execution
useQueueProposal(proposalId: number): {
  queue: () => Promise<Transaction>
  // After proposal passes vote
}

// Cancel proposal (admin only)
useCancelProposal(proposalId: number): {
  cancel: (reason: string) => Promise<Transaction>
  // Requires 5/7 council approval
}
```

### 8.3 Council System

```typescript
// Council membership
useCouncilMembers(): {
  members: Array<{
    address: string
    joinedAt: number
    proofScore: number  // Must maintain ≥7000
    votingPower: number
    active: boolean
  }>
  seats: number  // Governed council seats (initial 12, scalable to 21)
}

// Apply for council
useApplyForCouncil(): {
  apply: (platform: string) => Promise<Transaction>
  // Requires ProofScore ≥ 7000
  // Staking requirement: 10,000 VFIDE
}

// Council vote
useCouncilVote(proposalId: number, support: boolean): {
  vote: () => Promise<Transaction>
  // Council-specific proposals (emergency actions, etc.)
}
```

---

## 9. Escrow System

### 9.1 Escrow Contract

**Hook:** `lib/escrow/useEscrow.ts`

```typescript
// Main escrow interface
useEscrow(): {
  // Token approval management
  checkAllowance: (owner: string, spender: string) => Promise<bigint>
  approveToken: (spender: string, amount: bigint) => Promise<Transaction>
  
  // Escrow operations
  readEscrow: (escrowId: number) => Promise<EscrowRecord>
  formatEscrowAmount: (amount: bigint) => string
  getStateLabel: (state: number) => string
}
```

### 9.2 Escrow States

```typescript
enum EscrowState {
  CREATED = 0    // Escrow created, funds locked
  RELEASED = 1   // Funds released to merchant
  REFUNDED = 2   // Funds returned to buyer
  DISPUTED = 3   // Dispute raised, awaiting resolution
}

interface EscrowRecord {
  id: number
  buyer: string
  merchant: string
  token: string        // VFIDE or other ERC-20
  amount: bigint
  releaseTime: number  // Automatic release timestamp
  orderId: string
  state: EscrowState
  createdAt: number
}
```

### 9.3 Escrow Operations

```typescript
// Create escrow
useCreateEscrow(): {
  create: (
    merchant: string,
    amount: bigint,
    releaseTime: number,  // Unix timestamp
    orderId: string
  ) => Promise<Transaction>
  // Locks funds in escrow contract
}

// Release escrow (buyer or automatic)
useReleaseEscrow(escrowId: number): {
  release: () => Promise<Transaction>
  // Transfers funds to merchant
}

// Refund escrow
useRefundEscrow(escrowId: number): {
  refund: (reason: string) => Promise<Transaction>
  // Returns funds to buyer (requires merchant approval or timeout)
}

// Dispute escrow
useDisputeEscrow(escrowId: number): {
  dispute: (reason: string, evidence: string[]) => Promise<Transaction>
  // Pauses escrow, awaits council arbitration
}

// Resolve dispute (council only)
useResolveDispute(escrowId: number): {
  resolve: (
    action: 'RELEASE' | 'REFUND' | 'SPLIT',
    buyerPercent: number,
    merchantPercent: number
  ) => Promise<Transaction>
  // Council decision on disputed escrow
}
```

---

## 10. Badge & Achievement System

### 10.1 Badge Registry

**Hook:** `useBadgeHooks.ts`

```typescript
// Get user's badges
useUserBadges(address?: string): {
  badges: Array<{
    id: number
    name: string
    description: string
    imageURI: string
    mintedAt: number
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
    scoreBoost: number
  }>
  count: number
}

// Get badge NFTs
useBadgeNFTs(address?: string): {
  nfts: Array<{
    tokenId: number
    badgeId: number
    owner: string
    metadata: object
  }>
}

// Mint badge
useMintBadge(): {
  mint: (badgeId: number) => Promise<Transaction>
  // Requires eligibility criteria met
}

// Check mint eligibility
useCanMintBadge(badgeId: number, address?: string): {
  canMint: boolean
  reason: string
  requirements: {
    proofScore: number
    transactions: number
    accountAge: number
    otherCriteria: object
  }
  metRequirements: boolean
}
```

### 10.2 Achievement System

```typescript
// Achievement types
enum AchievementType {
  TRANSACTION_VOLUME   // Total volume milestones
  TRANSACTION_COUNT    // Number of transactions
  ENDORSEMENT_COUNT    // Endorsements received
  GUARDIAN_COUNT       // Active guardians
  MERCHANT_ACTIVITY    // Merchant-specific
  GOVERNANCE_PARTICIPATION
  REFERRAL_SUCCESS
  CONSECUTIVE_DAYS
  VAULT_SECURITY
}

// Check achievement progress
useAchievementProgress(achievementId: number): {
  progress: {
    current: number
    target: number
    percentage: number
    completed: boolean
  }
}

// Claim achievement
useClaimAchievement(achievementId: number): {
  claim: () => Promise<Transaction>
  // Mints badge + awards score boost
}
```

---

## 11. Social Payment Features

### 11.1 Social Payments

**Library:** `lib/socialPayments.ts`

```typescript
// Send payment with social context
sendSocialPayment(
  to: string,
  amount: bigint,
  socialContext: {
    platform: 'VFIDE' | 'TWITTER' | 'DISCORD' | 'TELEGRAM'
    contentId?: string  // Post/message ID
    contentType?: 'POST' | 'STORY' | 'COMMENT' | 'MESSAGE'
    memo?: string
  }
): Promise<Transaction>

// Split payment among multiple recipients
splitPayment(
  recipients: Array<{address: string, amount: bigint}>,
  memo: string
): Promise<Transaction>

// Request payment
requestPayment(
  from: string,
  amount: bigint,
  reason: string,
  expiresAt: number
): Promise<PaymentRequest>

// Payment request struct
interface PaymentRequest {
  id: string
  requester: string
  payer: string
  amount: bigint
  reason: string
  status: 'PENDING' | 'PAID' | 'DECLINED' | 'EXPIRED'
  createdAt: number
  expiresAt: number
}
```

### 11.2 Payment Streams

```typescript
// Create payment stream (continuous payment)
useCreatePaymentStream(): {
  create: (
    recipient: string,
    ratePerSecond: bigint,
    duration: number,
    startTime: number
  ) => Promise<Transaction>
  // Continuous payment at specified rate
}

// Stream info
usePaymentStream(streamId: number): {
  stream: {
    sender: string
    recipient: string
    ratePerSecond: bigint
    startTime: number
    stopTime: number
    withdrawn: bigint
    balance: bigint
  }
  currentlyStreaming: bigint
  canWithdraw: bigint
}

// Withdraw from stream
useWithdrawFromStream(streamId: number): {
  withdraw: (amount: bigint) => Promise<Transaction>
}

// Cancel stream
useCancelStream(streamId: number): {
  cancel: () => Promise<Transaction>
  // Remaining balance returned to sender
}
```

### 11.3 Social Tipping

```typescript
// Tip content creator
tipContent(
  creatorAddress: string,
  contentId: string,
  amount: bigint,
  platform: string
): Promise<Transaction>

// Get content tips
getContentTips(contentId: string): {
  tips: Array<{
    from: string
    amount: bigint
    timestamp: number
    message: string
  }>
  totalAmount: bigint
  tipCount: number
}
```

---

## 12. Referral & Incentive Systems

### 12.1 Headhunter Referral System

**Hook:** `useHeadhunterHooks.ts`

```typescript
// Get referral stats
useHeadhunterStats(): {
  stats: {
    points: number
    rank: number
    year: number
    quarter: number
    quarterEndTime: number
    referrals: number
    activeReferrals: number
  }
}

// Quarterly reward calculation
useHeadhunterReward(year: number, quarter: number): {
  reward: bigint
  canClaim: boolean
  claimed: boolean
  // Reward based on rank in leaderboard
}

// Pending referral
usePendingReferral(referredAddress: string): {
  isPending: boolean
  referrer: string
  referredAt: number
  activationStatus: 'PENDING' | 'ACTIVE' | 'FAILED'
}

// Claim quarterly reward
useClaimHeadhunterReward(year: number, quarter: number): {
  claim: () => Promise<Transaction>
  // Claim referral reward for completed quarter
}

// Generate referral link
useReferralLink(): {
  link: string  // Unique referral URL
  code: string  // Referral code
  uses: number
  maxUses: number
}

// Quarterly pool estimate
useQuarterlyPoolEstimate(): {
  estimatedPool: bigint
  yourProjectedReward: bigint
  yourRank: number
  topRanks: Array<{address: string, points: number}>
}

// Referral activity
useReferralActivity(): {
  activity: Array<{
    referred: string
    referredAt: number
    status: string
    pointsEarned: number
    bonusEarned: bigint
  }>
}

// Leaderboard
useLeaderboard(year: number, quarter: number): {
  leaderboard: Array<{
    rank: number
    address: string
    points: number
    referrals: number
    estimatedReward: bigint
  }>
  yourRank: number
}
```

### 12.2 Mentor System

**Hook:** `useMentorHooks.ts`

```typescript
// Get mentor info
useMentorInfo(address?: string): {
  isMentor: boolean
  menteeCount: number
  maxMentees: number
  requirements: {
    minScore: number
    minTransactions: number
    accountAge: number
  }
  metRequirements: boolean
}

// Check mentor status
useIsMentor(address?: string): {
  isMentor: boolean
}

// Become mentor
useBecomeMentor(): {
  apply: () => Promise<Transaction>
  // Requires score ≥ threshold + application review
}

// Sponsor mentee
useSponsorMentee(menteeAddress?: string): {
  sponsor: () => Promise<Transaction>
  // Mentor sponsors new user, provides initial score boost
}

// Mentee list
useMentees(): {
  mentees: Array<{
    address: string
    sponsoredAt: number
    currentScore: number
    progress: {
      transactions: number
      volume: bigint
      endorsements: number
    }
  }>
}
```

---

## 13. Cross-Chain Operations

### 13.1 Cross-Chain Transfer

```typescript
// Initiate cross-chain transfer
useCrossChainTransfer(): {
  transfer: (
    targetChain: number,    // Chain ID
    recipient: string,
    amount: bigint,
    bridge: 'LAYERZERO' | 'CCIP' | 'WORMHOLE'
  ) => Promise<Transaction>
  // Transfer VFIDE across chains
}

// Cross-chain status
useCrossChainStatus(transferId: string): {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  sourceChain: number
  targetChain: number
  amount: bigint
  confirmations: number
  estimatedTime: number
}
```

### 13.2 Multi-Chain Reputation

```typescript
// Aggregate reputation across chains
useMultiChainProofScore(address: string): {
  totalScore: number
  scoresByChain: {
    [chainId: number]: number
  }
  dominantChain: number
}

// Sync reputation cross-chain
useSyncProofScore(): {
  sync: (targetChain: number) => Promise<Transaction>
  // Sync ProofScore to another chain
}
```

---

## 14. Stealth & Privacy Features

### 14.1 Stealth Addresses

**Library:** `lib/stealthAddresses.ts`

```typescript
// Generate stealth address
generateStealthAddress(
  recipientPublicKey: string
): {
  stealthAddress: string
  ephemeralPublicKey: string
}

// Scan for stealth payments
scanStealthPayments(
  privateKey: string,
  ephemeralPublicKeys: string[]
): Array<{
  stealthAddress: string
  amount: bigint
  from: string
}>

// Send to stealth address
sendToStealthAddress(
  recipientPublicKey: string,
  amount: bigint
): Promise<Transaction>
```

### 14.2 Private Transactions (Future)

```typescript
// Zero-knowledge transfer (planned)
useZKTransfer(): {
  transfer: (
    to: string,
    amount: bigint,
    proof: ZKProof
  ) => Promise<Transaction>
  // Hidden amount/sender via zk-SNARKs
}
```

---

## 15. Streaming Payments

### 15.1 Payment Streams

```typescript
// Create continuous payment stream
useCreateStream(): {
  create: (
    recipient: string,
    ratePerSecond: bigint,  // VFIDE per second
    duration: number,        // seconds
    startTime: number
  ) => Promise<Transaction>
}

// Stream details
useStream(streamId: number): {
  stream: {
    sender: string
    recipient: string
    ratePerSecond: bigint
    startTime: number
    stopTime: number
    totalAmount: bigint
    withdrawn: bigint
    balance: bigint
    active: boolean
  }
  elapsedTime: number
  accumulatedAmount: bigint
}

// Withdraw from active stream
useWithdrawStream(streamId: number): {
  withdraw: (amount: bigint) => Promise<Transaction>
  // Recipient pulls accumulated funds
}

// Update stream rate
useUpdateStreamRate(streamId: number): {
  update: (newRate: bigint) => Promise<Transaction>
  // Sender adjusts payment rate
}

// Cancel stream
useCancelStream(streamId: number): {
  cancel: () => Promise<Transaction>
  // Stop stream, refund remaining balance
}

// Recipient's active streams
useRecipientStreams(address?: string): {
  streams: Array<{
    streamId: number
    sender: string
    ratePerSecond: bigint
    accumulatedAmount: bigint
    startTime: number
  }>
}
```

---

## 16. Time Locks & Vesting

### 16.1 Time-Locked Transfers

```typescript
// Create time-locked transfer
useCreateTimeLock(): {
  create: (
    recipient: string,
    amount: bigint,
    releaseTime: number
  ) => Promise<Transaction>
  // Funds released automatically at releaseTime
}

// Time lock details
useTimeLock(lockId: number): {
  lock: {
    sender: string
    recipient: string
    amount: bigint
    releaseTime: number
    released: boolean
    cancelable: boolean
  }
  canRelease: boolean
  timeRemaining: number
}

// Release time-locked funds
useReleaseTimeLock(lockId: number): {
  release: () => Promise<Transaction>
  // Anyone can trigger after releaseTime
}

// Cancel time lock (if allowed)
useCancelTimeLock(lockId: number): {
  cancel: () => Promise<Transaction>
  // Sender cancels before release (if cancelable)
}
```

### 16.2 Vesting Schedules

```typescript
// Create vesting schedule
useCreateVesting(): {
  create: (
    beneficiary: string,
    totalAmount: bigint,
    startTime: number,
    cliffDuration: number,  // seconds until first release
    vestingDuration: number, // total vesting period
    revocable: boolean
  ) => Promise<Transaction>
}

// Vesting details
useVesting(vestingId: number): {
  vesting: {
    beneficiary: string
    totalAmount: bigint
    startTime: number
    cliffEnd: number
    vestingEnd: number
    released: bigint
    revoked: boolean
  }
  vestedAmount: bigint
  releasableAmount: bigint
}

// Release vested tokens
useReleaseVesting(vestingId: number): {
  release: () => Promise<Transaction>
  // Beneficiary claims vested tokens
}

// Revoke vesting (if revocable)
useRevokeVesting(vestingId: number): {
  revoke: () => Promise<Transaction>
  // Stop vesting, return unvested tokens
}
```

---

## 17. Multisig Operations

### 17.1 Multisig Wallet

```typescript
// Multisig configuration
interface MultisigConfig {
  owners: string[]
  threshold: number  // Required signatures
  transactionCount: number
}

// Create multisig transaction
useCreateMultisigTx(): {
  create: (
    to: string,
    value: bigint,
    data: bytes,
    description: string
  ) => Promise<Transaction>
  // Propose transaction to multisig
}

// Multisig transaction details
useMultisigTx(txId: number): {
  transaction: {
    to: string
    value: bigint
    data: bytes
    executed: boolean
    confirmations: Array<{owner: string, timestamp: number}>
    threshold: number
  }
  canExecute: boolean
}

// Confirm multisig transaction
useConfirmMultisigTx(txId: number): {
  confirm: () => Promise<Transaction>
  // Add signature to transaction
}

// Revoke confirmation
useRevokeConfirmation(txId: number): {
  revoke: () => Promise<Transaction>
  // Remove signature before execution
}

// Execute multisig transaction
useExecuteMultisigTx(txId: number): {
  execute: () => Promise<Transaction>
  // Execute after threshold met
}

// Add/remove owners
useUpdateMultisigOwners(): {
  addOwner: (owner: string) => Promise<Transaction>
  removeOwner: (owner: string) => Promise<Transaction>
  changeThreshold: (newThreshold: number) => Promise<Transaction>
}
```

---

## 18. API Routes & Endpoints

### 18.1 Authentication & Security

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/verify-signature
GET    /api/auth/nonce
POST   /api/auth/csrf-token
```

### 18.2 Vault Operations

```
GET    /api/vault/[address]
POST   /api/vault/create
POST   /api/vault/transfer
GET    /api/vault/balance
GET    /api/vault/guardians
POST   /api/vault/guardian/add
POST   /api/vault/guardian/remove
GET    /api/vault/transactions
POST   /api/vault/lock
POST   /api/vault/unlock
GET    /api/vault/recovery-status
POST   /api/vault/recovery/initiate
POST   /api/vault/recovery/vote
```

### 18.3 ProofScore & Reputation

```
GET    /api/proofscore/[address]
GET    /api/proofscore/breakdown
POST   /api/proofscore/endorse
GET    /api/proofscore/endorsements
GET    /api/proofscore/tier
GET    /api/proofscore/thresholds
```

### 18.4 Merchant System

```
GET    /api/merchant/[address]
POST   /api/merchant/register
POST   /api/merchant/process-payment
GET    /api/merchant/transactions
GET    /api/merchant/analytics
POST   /api/merchant/settings
GET    /api/merchant/customer-score
```

### 18.5 Governance

```
GET    /api/dao/proposals
POST   /api/dao/proposal/create
POST   /api/dao/proposal/vote
GET    /api/dao/proposal/[id]
POST   /api/dao/proposal/execute
GET    /api/dao/council
GET    /api/dao/voting-power
```

### 18.6 Escrow

```
POST   /api/escrow/create
GET    /api/escrow/[id]
POST   /api/escrow/release
POST   /api/escrow/refund
POST   /api/escrow/dispute
```

### 18.7 Social & Messaging

```
GET    /api/social/feed
POST   /api/social/post
GET    /api/social/messages
POST   /api/social/message/send
POST   /api/social/payment
GET    /api/social/notifications
```

### 18.8 Analytics & Stats

```
GET    /api/stats/network
GET    /api/stats/user/[address]
GET    /api/stats/fees
GET    /api/stats/volume
GET    /api/stats/merchants
GET    /api/stats/dao
```

---

## 19. Complete Function Index

### A-C

- `approveToken()` - ERC-20 token approval
- `useAbnormalTransactionThreshold()` - Security threshold
- `useAchievementProgress()` - Achievement tracking
- `useActivityFeed()` - Transaction history
- `useApprovePendingTransaction()` - Multi-sig approval
- `useApplyForCouncil()` - Council membership
- `useBadgeNFTs()` - Badge NFT ownership
- `useBalanceSnapshot()` - Vault balance checkpoint
- `useBecomeMentor()` - Mentor registration
- `useCanMintBadge()` - Badge eligibility
- `useCanSelfPanic()` - Panic validation
- `useCancelMultisigTx()` - Revoke multisig
- `useCancelStream()` - Stop payment stream
- `useCancelTimeLock()` - Cancel time lock
- `useCastGuardianLock()` - Guardian emergency lock
- `useChallengeClaim()` - Contest recovery
- `useChallengeTimeRemaining()` - Challenge window
- `useClaimAchievement()` - Claim achievement
- `useClaimHeadhunterReward()` - Claim referral reward
- `useClaimStakingRewards()` - Claim staking
- `useCleanupExpiredTransaction()` - Remove expired TX
- `useConfirmMultisigTx()` - Sign multisig TX
- `useCouncilMembers()` - Council list
- `useCouncilSalary()` - Council compensation
- `useCouncilVote()` - Council-specific vote
- `useCreateEscrow()` - New escrow
- `useCreateMultisigTx()` - Propose multisig TX
- `useCreatePaymentStream()` - Start stream
- `useCreateProposal()` - DAO proposal
- `useCreateStream()` - Payment stream
- `useCreateTimeLock()` - Time-locked transfer
- `useCreateVault()` - New vault
- `useCreateVesting()` - Vesting schedule
- `useCrossChainStatus()` - Cross-chain TX status
- `useCrossChainTransfer()` - Cross-chain send
- `useCustomerTrustScore()` - Customer limits

### D-G

- `useDAOProposals()` - DAO state
- `useDisputeEscrow()` - Raise dispute
- `useEmergencyBreaker()` - System-wide emergency
- `useEmergencyStatus()` - Emergency state
- `useEndorse()` - Endorse user
- `useExecuteMultisigTx()` - Execute multisig
- `useExecutePendingTransaction()` - Execute multi-sig
- `useExecuteProposal()` - Execute DAO proposal
- `useFeeCalculator()` - Fee estimation
- `useFinalizeClaim()` - Complete recovery
- `useGetClaim()` - Claim status
- `useGuardianCancelInheritance()` - Cancel inheritance
- `useGuardianLockStatus()` - Lock state
- `useGuardianVote()` - Vote on recovery

### H-M

- `useHasBadge()` - Badge ownership check
- `useHeadhunterReward()` - Referral reward
- `useHeadhunterStats()` - Referral stats
- `useInheritanceStatus()` - Inheritance state
- `useInitiateClaim()` - Start recovery
- `useIsGuardian()` - Guardian check
- `useIsGuardianMature()` - Maturity check
- `useIsMentor()` - Mentor status
- `useIsMerchant()` - Merchant check
- `useIsVaultLocked()` - Lock check
- `useLeaderboard()` - Referral rankings
- `useMentees()` - Mentee list
- `useMentorInfo()` - Mentor details
- `useMerchantAnalytics()` - Merchant stats
- `useMerchantStatus()` - Merchant state
- `useMintBadge()` - Mint badge
- `useMultiChainProofScore()` - Cross-chain rep
- `useMultisigTx()` - Multisig TX details

### P-S

- `usePayMerchant()` - Pay merchant
- `usePaymentStream()` - Stream info
- `usePendingReferral()` - Referral pending
- `usePendingTransaction()` - Multi-sig pending
- `useProcessPayment()` - Merchant payment
- `useProofScore()` - Get ProofScore
- `useQueueProposal()` - Queue DAO proposal
- `useQuarterlyPoolEstimate()` - Referral pool
- `useQuarantineStatus()` - Panic status
- `useReadEscrow()` - Escrow details
- `useRecipientStreams()` - Recipient's streams
- `useReferralActivity()` - Referral history
- `useReferralLink()` - Generate link
- `useRefundEscrow()` - Refund escrow
- `useRegisterMerchant()` - Merchant registration
- `useReleaseEscrow()` - Release escrow
- `useReleaseTimeLock()` - Release time lock
- `useReleaseVesting()` - Release vested
- `useResolveDispute()` - Council arbitration
- `useRevokeConfirmation()` - Remove signature
- `useRevokeVesting()` - Stop vesting
- `useScoreBreakdown()` - Score components
- `useSearchByCreationTime()` - Vault search
- `useSearchByEmail()` - Email search
- `useSearchByGuardian()` - Guardian search
- `useSearchByRecoveryId()` - Recovery ID search
- `useSearchByUsername()` - Username search
- `useSearchByVaultAddress()` - Vault search
- `useSearchByWalletAddress()` - Wallet search
- `useSeerThresholds()` - Score thresholds
- `useSelfPanic()` - Emergency freeze
- `useSetAutoConvert()` - Auto stablecoin
- `useSetBalanceSnapshotMode()` - Snapshot mode
- `useSetGuardian()` - Add guardian
- `useSetPayoutAddress()` - Payout address
- `useSetRecoveryEmail()` - Set email
- `useSetRecoveryId()` - Set recovery ID
- `useSetRecoveryUsername()` - Set username
- `useSponsorMentee()` - Sponsor mentee
- `useStream()` - Stream details
- `useSyncProofScore()` - Sync cross-chain
- `useSystemStats()` - Network stats

### T-Z

- `useTimeLock()` - Time lock details
- `useTotalVaults()` - Vault count
- `useTransferVFIDE()` - Vault transfer
- `useUpdateBalanceSnapshot()` - Create snapshot
- `useUpdateMultisigOwners()` - Modify multisig
- `useUpdateStreamRate()` - Change rate
- `useUserBadges()` - User's badges
- `useUserVault()` - Vault check
- `useVaultBalance()` - Balance check
- `useVaultByIndex()` - Enumerate vaults
- `useVaultGuardians()` - Guardian list
- `useVaultGuardiansDetailed()` - Guardian details
- `useVaultHub()` - Hub operations
- `useVaultRegistry()` - Registry functions
- `useVesting()` - Vesting details
- `useVFIDEBalance()` - Token balance
- `useVote()` - DAO vote
- `useWithdrawFromStream()` - Stream withdrawal
- `useWithdrawStream()` - Withdraw stream
- `useZKTransfer()` - Private transfer (planned)

---

## Total Function Count

**Total Documented Functions:** 150+  
**Total API Endpoints:** 50+  
**Total Smart Contracts:** 15+  
**Total Hooks:** 120+  
**Total Library Functions:** 80+

---

## Appendix: Contract Addresses & ABI References

See `.env.example` for complete list of contract addresses.

**ABI Locations:**
- `/lib/abi/` - All contract ABIs
- `/lib/contracts/` - Contract interfaces
- `/types/` - TypeScript type definitions

---

**END OF TECHNICAL REFERENCE**

*This document catalogs every smart contract function, feature, and technical implementation in the VFIDE ecosystem. For implementation details, refer to source code in `/lib`, `/hooks`, and `/contracts` directories.*
