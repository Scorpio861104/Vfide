# VFIDE Developer Integration Guide
**Last Updated:** December 4, 2025  
**Version:** 1.0  
**Target Audience:** dApp developers, merchants, integrators

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Contract Addresses](#contract-addresses)
3. [Core Concepts](#core-concepts)
4. [Integration Patterns](#integration-patterns)
5. [API Reference](#api-reference)
6. [Code Examples](#code-examples)
7. [Testing](#testing)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm install ethers@^6.0.0 viem@^1.0.0

# Or use wagmi for React apps
npm install wagmi@^2.0.0 @rainbow-me/rainbowkit@^2.0.0
```

### Minimal Integration (5 minutes)

```typescript
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

// 1. Setup client
const client = createPublicClient({
  chain: base,
  transport: http()
})

// 2. Contract addresses (replace with actual mainnet addresses)
const VFIDE_TOKEN = '0x...'
const VAULT_HUB = '0x...'
const MERCHANT_PORTAL = '0x...'

// 3. Check if user has vault
const userVault = await client.readContract({
  address: VAULT_HUB,
  abi: vaultHubAbi,
  functionName: 'vaultOf',
  args: [userAddress]
})

if (userVault === '0x0000000000000000000000000000000000000000') {
  // User needs to create vault first
  console.log('Please create vault before using VFIDE')
}

// 4. Get user's ProofScore
const seerAddress = '0x...' // VFIDETrust contract
const proofScore = await client.readContract({
  address: seerAddress,
  abi: seerAbi,
  functionName: 'getScore',
  args: [userAddress]
})

console.log(`User ProofScore: ${proofScore}/1000`)
```

---

## Contract Addresses

### Base Mainnet (DEPLOY THESE FIRST)
```typescript
export const VFIDE_CONTRACTS = {
  // Core
  VFIDEToken: '0x...', // ERC20 with vault-only transfers
  VaultInfrastructure: '0x...', // Vault factory + registry
  
  // Trust & Reputation
  VFIDETrust: '0x...', // ProofScore + ProofLedger
  ProofScoreBurnRouter: '0x...', // Dynamic fee calculator
  
  // Governance
  DAO: '0x...', // Score-weighted governance
  DAOTimelockV2: '0x...', // 3-day execution delay
  
  // Commerce
  MerchantPortal: '0x...', // 0% fee payment processing
  MerchantRebateVault: '0x...', // High-score merchant rebates
  
  // Treasury & Vaults
  EcoTreasuryVault: '0x...', // Ecosystem fund
  SanctumVault: '0x...', // Charity fund
  DevReserveVestingVault: '0x...', // Team vesting
  
  // Token Sale
  GuardianNodeSale: '0x...', // Commitment-based presale
  
  // Infrastructure
  VFIDESecurity: '0x...', // SecurityHub (locks, circuit breakers)
  SystemHandover: '0x...', // Progressive decentralization
  RevenueSplitter: '0x...', // Multi-recipient payments
  
  // Optional
  VFIDECommerce: '0x...', // Advanced escrow
  VFIDEFinance: '0x...', // Treasury management
  SubscriptionManager: '0x...', // Recurring payments
}
```

### Base Sepolia Testnet (LIVE NOW)
```typescript
export const VFIDE_CONTRACTS_TESTNET = {
  // Base Sepolia - Chain ID 84532
  VFIDEToken: '0xf57992ab9F8887650C2a220A34fe86ebD00c02f5',
  VaultHubLite: '0x1508fa7D70A88F3c5E89d3a82f668cD92Fa902B5',
  Seer: '0x90b672C009F0F16201E7bE2c6696d1c375d28422',
  VFIDEPresale: '0x89aefb047B6CB2bB302FE2734DDa452985eF1658',
  MerchantPortal: '0x62Be75642b9334a5276a733c5E40B91eD8a6055d',
  DAO: '0xA462F4C2825f48545a9217FD65B7eB621ea8b507',
  // See BASE_SEPOLIA_DEPLOYMENT.md for full list
}
```

---

## Core Concepts

### 1. Vault-Only Architecture

**CRITICAL:** VFIDE tokens CANNOT be held directly in EOA wallets. All holders must use UserVault contracts.

```solidity
// ❌ WRONG - Direct transfer to wallet fails
vfideToken.transfer(userWallet, amount); // Reverts with "Token_NotVault"

// ✅ CORRECT - Transfer to user's vault
address userVault = vaultHub.vaultOf(userWallet);
vfideToken.transfer(userVault, amount); // Works!
```

**Why vault-only?**
- Prevents rug pulls (tokens locked in audited contracts)
- Enables guardian recovery
- Standardizes custody model
- Simplifies security audits

### 2. ProofScore System

ProofScore is an on-chain reputation score (0-10000, 10x precision) that affects:
- **Transfer fees:** 0.25%-5% based on score (high trust pays less)
- **Governance power:** Voting weight = score (not tokens)
- **Access privileges:** Minimum scores for actions

**Score Components:**
```
ProofScore = Fixed Score (manual) 
           + Activity Score (0-200 based on usage)
           + Endorsement Score (10 points per endorsement, max 5)
           + Badge Score (varies by badge)
           + Capital Bonus (up to +50 for holding capital)
           + Reputation Delta (DAO rewards/punishments)
```

### 3. Fee Model

**Transfer Fees (0.25%-5%):**
- Applied on VFIDE token transfers (vault-to-vault)
- Dynamic based on sender's ProofScore (≥8000 = 0.25%, ≤4000 = 5%)
- Split: 40% burn (deflationary) + 10% Sanctum (charity) + 50% Ecosystem (council, staking, incentives)

**Payment Fees (0%):**
- Merchant payments via MerchantPortal have 0% protocol fee
- Only transfer fees apply (0.25%-5% based on ProofScore)
- Merchants save 2-3% vs credit cards

### 4. Commitment Periods

NOT lockups - tokens remain usable during commitment:
- ✅ Make payments
- ✅ Vote in governance
- ✅ Use in commerce

Commitment tiers:
- Founding ($0.03): 180-day mandatory lock, 10% immediate unlock
- Oath ($0.05): 90-day mandatory lock, 20% immediate unlock
- Public ($0.07): Optional lock, 100% immediate (bonus for locking)

---

## Integration Patterns

### Pattern 1: Merchant Payment Acceptance

```typescript
// Merchant Integration Example
import { usePrepareContractWrite, useContractWrite } from 'wagmi'

function AcceptPayment({ merchantAddress, amount, orderId }) {
  // 1. Check customer has vault
  const customerVault = await vaultHub.read.vaultOf([customerAddress])
  
  if (customerVault === '0x0000000000000000000000000000000000000000') {
    return <div>Customer must create vault first</div>
  }
  
  // 2. Check customer ProofScore (optional - assess risk)
  const score = await vfideTrust.read.getScore([customerAddress])
  const riskLevel = score < 4000 ? 'HIGH' : score < 5000 ? 'MEDIUM' : 'LOW'
  
  // 3. Process payment via MerchantPortal
  const { config } = usePrepareContractWrite({
    address: VFIDE_CONTRACTS.MerchantPortal,
    abi: merchantPortalAbi,
    functionName: 'processPayment',
    args: [
      merchantAddress,
      VFIDE_CONTRACTS.VFIDEToken, // payment token
      amount,
      orderId
    ]
  })
  
  const { write: processPayment } = useContractWrite(config)
  
  return (
    <div>
      <p>Amount: {amount} VFIDE</p>
      <p>Risk Level: {riskLevel}</p>
      <button onClick={() => processPayment()}>
        Pay Merchant (0% fee)
      </button>
    </div>
  )
}
```

### Pattern 2: Vault Creation Flow

```typescript
// Helper function to ensure user has vault
async function ensureUserVault(userAddress: string, walletClient: any) {
  // Check if vault exists
  const vault = await publicClient.readContract({
    address: VFIDE_CONTRACTS.VaultInfrastructure,
    abi: vaultHubAbi,
    functionName: 'vaultOf',
    args: [userAddress]
  })
  
  if (vault !== '0x0000000000000000000000000000000000000000') {
    return vault // Vault already exists
  }
  
  // Create vault
  const { hash } = await walletClient.writeContract({
    address: VFIDE_CONTRACTS.VaultInfrastructure,
    abi: vaultHubAbi,
    functionName: 'createVault',
    args: [] // No args needed - derives from msg.sender
  })
  
  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash })
  
  // Get new vault address
  const newVault = await publicClient.readContract({
    address: VFIDE_CONTRACTS.VaultInfrastructure,
    abi: vaultHubAbi,
    functionName: 'vaultOf',
    args: [userAddress]
  })
  
  return newVault
}
```

### Pattern 3: ProofScore-Gated Actions

```typescript
// Require minimum ProofScore for action
async function checkProofScoreRequirement(
  userAddress: string,
  minScore: number,
  actionName: string
): Promise<boolean> {
  const score = await publicClient.readContract({
    address: VFIDE_CONTRACTS.VFIDETrust,
    abi: vfideTrustAbi,
    functionName: 'getScore',
    args: [userAddress]
  })
  
  if (score < minScore) {
    throw new Error(
      `${actionName} requires ProofScore ${minScore}+. Current: ${score}`
    )
  }
  
  return true
}

// Usage
await checkProofScoreRequirement(user, 540, 'Vote in governance')
await checkProofScoreRequirement(merchant, 560, 'Register as merchant')
await checkProofScoreRequirement(candidate, 700, 'Run for council')
```

### Pattern 4: Guardian Setup

```typescript
// Add guardians to vault for recovery
async function setupGuardians(
  vaultAddress: string,
  guardians: string[],
  walletClient: any
) {
  for (const guardian of guardians) {
    const { hash } = await walletClient.writeContract({
      address: vaultAddress,
      abi: userVaultAbi,
      functionName: 'setGuardian',
      args: [guardian, true] // true = add, false = remove
    })
    
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Guardian ${guardian} added`)
  }
}
```

### Pattern 5: DAO Proposal Creation

```typescript
// Create governance proposal
async function createProposal({
  proposalType, // 0=Generic, 1=Financial, 2=ProtocolChange, 3=SecurityAction
  targetContract,
  functionSignature,
  calldata,
  description,
  walletClient
}) {
  // Check eligibility (ProofScore 540+)
  await checkProofScoreRequirement(userAddress, 540, 'Create proposal')
  
  const { hash } = await walletClient.writeContract({
    address: VFIDE_CONTRACTS.DAO,
    abi: daoAbi,
    functionName: 'propose',
    args: [
      proposalType,
      targetContract,
      0, // value (ETH to send)
      calldata,
      description
    ]
  })
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  
  // Extract proposal ID from events
  const proposalId = receipt.logs[0].topics[1] // Simplified - parse properly
  
  return proposalId
}
```

---

## API Reference

### VFIDEToken

```solidity
interface IVFIDEToken {
    // ERC20 Standard
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    
    // Vault-Only Enforcement
    function vaultOnly() external view returns (bool);
    function systemExempt(address who) external view returns (bool);
    
    // ProofScore Integration
    function burnRouter() external view returns (address);
    
    // Security
    function isBlacklisted(address user) external view returns (bool);
    function securityHub() external view returns (address);
}
```

### VaultInfrastructure

```solidity
interface IVaultHub {
    // Vault Creation
    function createVault() external returns (address vault);
    
    // Registry
    function vaultOf(address owner) external view returns (address vault);
    function ownerOf(address vault) external view returns (address owner);
    function isVault(address addr) external view returns (bool);
    
    // Stats
    function vaultCount() external view returns (uint256);
}

interface IUserVault {
    // Ownership
    function owner() external view returns (address);
    
    // Guardians
    function setGuardian(address guardian, bool active) external;
    function isGuardian(address addr) external view returns (bool);
    function guardianCount() external view returns (uint8);
    
    // Recovery
    function requestRecovery(address proposedOwner) external;
    function approveRecovery() external;
    function finalizeRecovery() external;
    
    // Operations
    function transferVFIDE(address toVault, uint256 amount) external returns (bool);
    function execute(address target, uint256 value, bytes calldata data) 
        external returns (bytes memory result);
}
```

### VFIDETrust (Seer)

```solidity
interface ISeer {
    // ProofScore
    function getScore(address subject) external view returns (uint16);
    function setScore(address subject, uint16 score, string calldata reason) external;
    
    // Thresholds
    function lowTrustThreshold() external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function minForGovernance() external view returns (uint16);
    function minForMerchant() external view returns (uint16);
    
    // Endorsements
    function endorse(address subject) external;
    function removeEndorsement(address subject) external;
    function endorsementsReceived(address subject) external view returns (uint256);
    
    // Activity
    function recordActivity(address subject) external;
    function lastActivity(address subject) external view returns (uint256);
}
```

### MerchantPortal

```solidity
interface IMerchantPortal {
    // Registration
    function registerMerchant(string calldata businessName, string calldata category) external;
    
    // Payment Processing
    function processPayment(
        address customer,
        address merchant,
        address token,
        uint256 amount,
        string calldata orderId
    ) external;
    
    // Merchant Info
    struct MerchantInfo {
        bool registered;
        bool suspended;
        string businessName;
        string category;
        uint64 registeredAt;
        uint256 totalVolume;
        uint256 txCount;
        address payoutAddress;
    }
    function merchants(address merchant) external view returns (MerchantInfo memory);
}
```

### DAO

```solidity
interface IDAO {
    // Proposals
    function propose(
        ProposalType ptype,
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external returns (uint256 proposalId);
    
    // Voting
    function vote(uint256 proposalId, bool support) external;
    
    // Execution
    function finalize(uint256 proposalId) external;
    function queue(uint256 proposalId) external;
    function execute(uint256 proposalId) external;
    
    // Proposal Info
    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        bytes data;
        string description;
        ProposalType ptype;
        uint64 start;
        uint64 end;
        bool executed;
        bool queued;
        uint256 forVotes;
        uint256 againstVotes;
    }
}
```

---

## Code Examples

### Example 1: Complete Merchant Integration

```typescript
// Full merchant integration with React + wagmi
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi'
import { parseEther, formatEther } from 'viem'

export function MerchantCheckout({ orderId, itemName, priceUSD }) {
  const { address } = useAccount()
  
  // 1. Check if user has vault
  const { data: userVault } = useContractRead({
    address: VFIDE_CONTRACTS.VaultInfrastructure,
    abi: vaultHubAbi,
    functionName: 'vaultOf',
    args: [address],
    watch: true
  })
  
  // 2. Get ProofScore for risk assessment
  const { data: proofScore } = useContractRead({
    address: VFIDE_CONTRACTS.VFIDETrust,
    abi: seerAbi,
    functionName: 'getScore',
    args: [address]
  })
  
  // 3. Get VFIDE balance
  const { data: vfideBalance } = useContractRead({
    address: VFIDE_CONTRACTS.VFIDEToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userVault]
  })
  
  // 4. Calculate VFIDE amount (assuming 1 VFIDE = $0.10)
  const vfideAmount = parseEther((priceUSD / 0.10).toString())
  
  // 5. Prepare payment transaction
  const { config } = usePrepareContractWrite({
    address: VFIDE_CONTRACTS.MerchantPortal,
    abi: merchantPortalAbi,
    functionName: 'processPayment',
    args: [
      address, // customer
      MERCHANT_ADDRESS, // merchant (your address)
      VFIDE_CONTRACTS.VFIDEToken,
      vfideAmount,
      orderId
    ],
    enabled: vfideBalance >= vfideAmount
  })
  
  const { write: payMerchant, isLoading, isSuccess } = useContractWrite(config)
  
  // Render
  if (!userVault || userVault === '0x0000000000000000000000000000000000000000') {
    return <div>Please create VFIDE vault first</div>
  }
  
  if (vfideBalance < vfideAmount) {
    return <div>Insufficient VFIDE balance</div>
  }
  
  return (
    <div className="checkout">
      <h2>{itemName}</h2>
      <p>Price: ${priceUSD} USD ({formatEther(vfideAmount)} VFIDE)</p>
      <p>Your ProofScore: {proofScore}/1000</p>
      <p>Risk Level: {proofScore > 700 ? 'LOW' : proofScore > 500 ? 'MEDIUM' : 'HIGH'}</p>
      
      <button onClick={() => payMerchant()} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Pay with VFIDE (0% fee)'}
      </button>
      
      {isSuccess && <div>✅ Payment successful! Order #{orderId}</div>}
    </div>
  )
}
```

### Example 2: Bulk Payment Splitter

```typescript
// Split payment among multiple recipients
async function splitPayment(
  fromVault: string,
  recipients: Array<{address: string, share: number}>, // share in basis points (10000 = 100%)
  totalAmount: bigint,
  walletClient: any
) {
  // Validate shares add up to 100%
  const totalShares = recipients.reduce((sum, r) => sum + r.share, 0)
  if (totalShares !== 10000) {
    throw new Error('Shares must total 100% (10000 basis points)')
  }
  
  // Send to each recipient
  for (const recipient of recipients) {
    const amount = (totalAmount * BigInt(recipient.share)) / BigInt(10000)
    
    // Get recipient's vault
    const recipientVault = await publicClient.readContract({
      address: VFIDE_CONTRACTS.VaultInfrastructure,
      abi: vaultHubAbi,
      functionName: 'vaultOf',
      args: [recipient.address]
    })
    
    if (recipientVault === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Recipient ${recipient.address} has no vault`)
    }
    
    // Transfer from user's vault
    const { hash } = await walletClient.writeContract({
      address: fromVault,
      abi: userVaultAbi,
      functionName: 'transferVFIDE',
      args: [recipientVault, amount]
    })
    
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Sent ${amount} VFIDE to ${recipient.address}`)
  }
}

// Usage
await splitPayment(
  userVault,
  [
    { address: '0xAlice...', share: 5000 }, // 50%
    { address: '0xBob...', share: 3000 },   // 30%
    { address: '0xCarol...', share: 2000 }  // 20%
  ],
  parseEther('1000'), // 1000 VFIDE total
  walletClient
)
```

### Example 3: ProofScore Dashboard

```typescript
// Display comprehensive ProofScore breakdown
async function getProofScoreBreakdown(userAddress: string) {
  const seer = VFIDE_CONTRACTS.VFIDETrust
  
  // Get components
  const [
    totalScore,
    activityScore,
    endorsements,
    lastActivity,
    badges
  ] = await Promise.all([
    publicClient.readContract({
      address: seer,
      abi: seerAbi,
      functionName: 'getScore',
      args: [userAddress]
    }),
    publicClient.readContract({
      address: seer,
      abi: seerAbi,
      functionName: 'activityScore',
      args: [userAddress]
    }),
    publicClient.readContract({
      address: seer,
      abi: seerAbi,
      functionName: 'endorsementsReceived',
      args: [userAddress]
    }),
    publicClient.readContract({
      address: seer,
      abi: seerAbi,
      functionName: 'lastActivity',
      args: [userAddress]
    }),
    publicClient.readContract({
      address: seer,
      abi: seerAbi,
      functionName: 'getUserBadges',
      args: [userAddress]
    })
  ])
  
  // Calculate decay
  const daysSinceActivity = (Date.now() / 1000 - Number(lastActivity)) / 86400
  const decayWeeks = Math.floor(daysSinceActivity / 7)
  const decayPenalty = decayWeeks * 5 // 5 points per week
  
  return {
    total: totalScore,
    breakdown: {
      activity: activityScore,
      endorsements: endorsements * 10, // 10 points each
      badges: badges.length * 20, // Varies by badge
      decay: -decayPenalty
    },
    thresholds: {
      governance: 540,
      merchant: 560,
      council: 700,
      elite: 800
    },
    canVote: totalScore >= 540,
    canMerchant: totalScore >= 560,
    canCouncil: totalScore >= 700,
    isElite: totalScore >= 800
  }
}
```

---

## Testing

### Local Development Setup

```bash
# 1. Clone repo
git clone https://github.com/Scorpio861104/Vfide.git
cd Vfide

# 2. Install dependencies
npm install
forge install

# 3. Run local node (or use Base Sepolia testnet)
anvil

# 4. Deploy contracts locally
forge script script/Deploy.s.sol:DeployVfide --rpc-url http://127.0.0.1:8545 --broadcast

# 5. Run tests
forge test -vvv
```

### Integration Testing Checklist

- [ ] User can create vault
- [ ] User can purchase VFIDE tokens
- [ ] User can transfer VFIDE between vaults
- [ ] Merchant can register (with 560+ ProofScore)
- [ ] Customer can pay merchant (0% fee)
- [ ] User can set up guardians
- [ ] Guardian recovery flow works
- [ ] ProofScore increases with activity
- [ ] ProofScore decreases with inactivity
- [ ] DAO voting works (540+ score required)
- [ ] Proposal execution after timelock
- [ ] Circuit breaker pauses system
- [ ] Blacklisted addresses cannot transfer

---

## Security Best Practices

### 1. Always Check Vault Existence

```typescript
// ❌ BAD - Assumes vault exists
await vfideToken.write.transfer([recipientVault, amount])

// ✅ GOOD - Verify vault first
const vault = await vaultHub.read.vaultOf([recipient])
if (vault === '0x0000000000000000000000000000000000000000') {
  throw new Error('Recipient has no vault')
}
await vfideToken.write.transfer([vault, amount])
```

### 2. Handle Circuit Breaker States

```typescript
// Check if system is paused
const circuitBreaker = await vfideToken.read.circuitBreaker()
if (circuitBreaker) {
  return <div>System paused for emergency maintenance</div>
}
```

### 3. Validate ProofScore Requirements

```typescript
// Don't let users attempt actions they can't complete
const score = await seer.read.getScore([userAddress])
const minScore = await seer.read.minForGovernance() // 540

if (score < minScore) {
  return <div>ProofScore {score}/1000 - Need {minScore}+ to vote</div>
}
```

### 4. Use Try/Catch for Contract Calls

```typescript
try {
  await walletClient.writeContract({
    address: merchantPortal,
    abi: merchantPortalAbi,
    functionName: 'processPayment',
    args: [customer, merchant, token, amount, orderId]
  })
} catch (error) {
  if (error.message.includes('MERCH_LowTrust')) {
    alert('Customer ProofScore too low for this merchant')
  } else if (error.message.includes('MERCH_Suspended')) {
    alert('Merchant account suspended')
  } else {
    console.error('Payment failed:', error)
  }
}
```

### 5. Rate Limit User Actions

```typescript
// Prevent spam attacks
const lastTx = localStorage.getItem('lastVFIDETx')
if (lastTx && Date.now() - parseInt(lastTx) < 3000) {
  alert('Please wait 3 seconds between transactions')
  return
}
localStorage.setItem('lastVFIDETx', Date.now().toString())
```

---

## Troubleshooting

### Error: "Token_NotVault"
**Cause:** Trying to transfer VFIDE to non-vault address  
**Fix:** Get recipient's vault address via `vaultHub.vaultOf(recipient)`

### Error: "UV_NotOwner"
**Cause:** Calling vault function from wrong address  
**Fix:** Ensure `msg.sender` is vault owner or use guardian recovery

### Error: "DAO_NotEligible"
**Cause:** ProofScore too low for governance  
**Fix:** Build reputation to 540+ before voting/proposing

### Error: "MERCH_NotRegistered"
**Cause:** Merchant not registered in portal  
**Fix:** Call `merchantPortal.registerMerchant()` with 560+ score

### Error: "VF_LOCKED"
**Cause:** SecurityHub has locked vault due to suspicious activity  
**Fix:** Contact guardians to review and unlock

### Gas Estimation Failures
**Cause:** L2 gas estimation can sometimes be flaky  
**Fix:** Manually set gas limit: `gas: 2000000n`

---

## Support & Resources

### Documentation
- **Architecture:** `/ARCHITECTURE.md`
- **Contracts:** `/CONTRACTS.md`
- **Security:** `/SECURITY.md`
- **User Guide:** `/USER-GUIDE.md`

### Developer Resources
- **Contract ABIs:** `/abis/` directory
- **Deployment Scripts:** `/script/Deploy.s.sol`
- **Test Examples:** `/test/foundry/`
- **Interface Definitions:** `/contracts/interfaces/`

### Community
- **GitHub Issues:** https://github.com/Scorpio861104/Vfide/issues
- **Developer Discord:** https://discord.gg/vfide-dev (placeholder)
- **API Questions:** dev@vfide.io

### Security
- **Bug Bounty:** bounty@vfide.io
- **Vulnerabilities:** security@vfide.io
- **PGP Key:** [link to key]

---

## Changelog

### v1.1.0 (December 26, 2025)
- Base Sepolia testnet deployment (32 contracts)
- Multi-chain support (Base, Polygon, zkSync)
- Updated frontend for Base Sepolia

### v1.0.0 (December 4, 2025)
- Initial release
- Core contracts: VFIDEToken, VaultInfrastructure, VFIDETrust, MerchantPortal, DAO
- Full developer API documentation

---

**Happy building with VFIDE! 🚀**

For questions, join our developer community or open a GitHub issue.
