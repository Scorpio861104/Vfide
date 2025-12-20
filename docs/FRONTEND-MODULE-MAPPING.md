# VFIDE Complete Frontend Module Mapping
**Purpose**: Map every smart contract function to a frontend UI component  
**Date**: December 3, 2025  
**Total Contracts**: 30+  
**Total Frontend Modules**: 17  

---

## 1. Core Token & Economics

### VFIDEToken.sol → Token Dashboard
**Contract Functions**:
- `balanceOf(address)` - Check token balance
- `transfer(address, uint256)` - Send tokens
- `approve(address, uint256)` - Approve spending
- `burn(uint256)` - Burn tokens (deflationary)
- `totalSupply()` - Total VFIDE in circulation

**Frontend Module**: `frontend/merchant/app/wallet/page.tsx`
```jsx
// Token Dashboard Component
export function TokenDashboard() {
  const { address } = useAccount();
  const balance = useBalance(address);
  const totalSupply = useTotalSupply();
  
  return (
    <Card title="⚔️ VFIDE Treasury">
      <div className="token-stats">
        <StatItem label="Your Balance" value={balance} suffix="VFIDE" />
        <StatItem label="Total Supply" value={totalSupply} suffix="VFIDE" />
        <StatItem label="Total Burned" value={calculateBurned()} suffix="VFIDE" />
        
        <div className="actions">
          <button className="btn-primary">🔥 Burn Tokens</button>
          <button className="btn-secondary">📤 Send Tokens</button>
        </div>
      </div>
    </Card>
  );
}
```

---

### ProofScoreBurnRouter.sol → ProofScore System
**Contract Functions**:
- `routeBurn(address, uint256)` - Route token burns (50% dead, 25% treasury, 25% rebate)
- `getProofScore(address)` - Get user's ProofScore (0-1000)
- `calculateBurnReward(uint256)` - Calculate ProofScore gain from burn

**Frontend Module**: `frontend/shared/components/ProofScoreBadge.tsx`
```jsx
// ProofScore Badge Component
export function ProofScoreBadge({ address }) {
  const proofScore = useProofScore(address);
  const tier = calculateTier(proofScore); // Bronze, Silver, Gold, Platinum
  
  return (
    <div className={`proofscore-badge ${tier}`}>
      <div className="badge-icon">{getTierIcon(tier)}</div>
      <div className="badge-text">
        <span className="score">{proofScore}</span>
        <span className="max">/1000</span>
        <span className="tier-label">{tier.toUpperCase()}</span>
      </div>
      <div className="badge-glow"></div>
    </div>
  );
}

// Tier calculation
function calculateTier(score) {
  if (score <= 500) return 'bronze';
  if (score <= 750) return 'silver';
  if (score <= 900) return 'elite';
  return 'platinum';
}

function getTierIcon(tier) {
  return {
    squire: '🛡️',
    knight: '⚔️',
    elite: '🏆',
    platinum: '👑'
  }[tier];
}
```

---

## 2. Trust & Reputation

### VFIDETrust.sol (Seer) → Trust Explorer
**Contract Functions**:
- `getProofScore(address)` - Get reputation score
- `recordEvent(address, string, int256)` - Log trust event
- `getHistory(address)` - Get trust event history
- `endorseMerchant(address)` - Endorse another user (+10 ProofScore)
- `disputeMerchant(address)` - File dispute (-50 ProofScore if upheld)

**Frontend Module**: `frontend/explorer/app/address/[id]/page.tsx`
```jsx
// Trust Profile Page
export function TrustProfilePage({ params }) {
  const { id: address } = params;
  const proofScore = useProofScore(address);
  const history = useTrustHistory(address);
  const endorsements = useEndorsements(address);
  
  return (
    <div className="trust-profile">
      <ProofScoreBadge address={address} size="large" />
      
      <Card title="📜 Trust History">
        <Timeline events={history} />
      </Card>
      
      <Card title="⚔️ Endorsements">
        <EndorsementList items={endorsements} />
      </Card>
      
      <Card title="⚠️ Disputes">
        <DisputeList address={address} />
      </Card>
    </div>
  );
}
```

---

## 3. Commerce & Payments

### MerchantPortal.sol → Merchant Dashboard
**Contract Functions**:
- `registerMerchant()` - Become a merchant (KYC-free)
- `getMerchantInfo(address)` - Get merchant data
- `getMonthlyVolume(address)` - Get current month's payment volume
- `getMonthlyLimit(address)` - Get ProofScore-based limit
- `updateSettings(string, string)` - Update merchant settings

**Frontend Module**: `frontend/merchant/app/(dashboard)/page.tsx`
```jsx
// Merchant Dashboard
export function MerchantDashboard() {
  const { address } = useAccount();
  const merchantInfo = useMerchantInfo(address);
  const monthlyVolume = useMonthlyVolume(address);
  const monthlyLimit = useMonthlyLimit(address);
  const proofScore = useProofScore(address);
  
  return (
    <div className="merchant-dashboard">
      <header className="dashboard-header">
        <h1>⚔️ Merchant Citadel</h1>
        <WalletConnectButton />
      </header>
      
      <div className="stats-grid">
        <StatCard
          title="ProofScore"
          value={proofScore}
          max={1000}
          icon="🛡️"
          tier={calculateTier(proofScore)}
        />
        <StatCard
          title="Monthly Volume"
          value={monthlyVolume}
          max={monthlyLimit}
          icon="💰"
          suffix="USD"
        />
        <StatCard
          title="Active Escrows"
          value={merchantInfo.activeEscrows}
          icon="⏳"
        />
        <StatCard
          title="Total Earnings"
          value={merchantInfo.totalEarnings}
          icon="⚔️"
          suffix="USD"
        />
      </div>
      
      <TransactionTable address={address} />
      
      <QuickActions />
    </div>
  );
}
```

---

### EscrowManager.sol → Escrow Interface
**Contract Functions**:
- `createEscrow(address, address, uint256, address)` - Create new escrow
- `releaseEscrow(uint256)` - Release payment to merchant
- `initiateDispute(uint256)` - Buyer disputes transaction
- `resolveDispute(uint256, bool)` - DAO resolves dispute
- `getEscrowDetails(uint256)` - Get escrow status

**Frontend Module**: `frontend/merchant/app/(dashboard)/escrow/page.tsx`
```jsx
// Escrow Manager
export function EscrowManager() {
  const { address } = useAccount();
  const activeEscrows = useActiveEscrows(address);
  
  return (
    <Card title="⏳ Active Escrows">
      <div className="escrow-list">
        {activeEscrows.map(escrow => (
          <EscrowCard key={escrow.id} escrow={escrow} />
        ))}
      </div>
    </Card>
  );
}

// Individual Escrow Card
function EscrowCard({ escrow }) {
  const timeRemaining = useTimeRemaining(escrow.releaseTime);
  
  return (
    <div className="escrow-card">
      <div className="escrow-header">
        <span className="buyer-address">{truncateAddress(escrow.buyer)}</span>
        <span className="amount">{escrow.amount} USDC</span>
      </div>
      
      <div className="escrow-timer">
        <HolographicHourglass timeRemaining={timeRemaining} />
        <span>{formatTime(timeRemaining)} remaining</span>
      </div>
      
      <div className="escrow-actions">
        {escrow.status === 'pending' && (
          <button className="btn-primary" onClick={() => releaseEscrow(escrow.id)}>
            ✅ Release Early
          </button>
        )}
        {escrow.status === 'disputed' && (
          <button className="btn-secondary" onClick={() => viewDispute(escrow.id)}>
            ⚠️ View Dispute
          </button>
        )}
      </div>
    </div>
  );
}
```

---

### VFIDECommerce.sol → Checkout Page
**Contract Functions**:
- `initiatePayment(address, uint256, address)` - Create payment
- `confirmPayment(uint256)` - Buyer confirms payment sent
- `getPaymentStatus(uint256)` - Check payment status

**Frontend Module**: `frontend/pay/app/[merchantId]/page.tsx`
```jsx
// Payment Checkout Page
export function CheckoutPage({ params }) {
  const { merchantId } = params;
  const merchantInfo = useMerchantInfo(merchantId);
  const proofScore = useProofScore(merchantId);
  
  return (
    <div className="checkout-page">
      <Card title="⚔️ VFIDE Secure Payment">
        <div className="merchant-info">
          <h2>{merchantInfo.name}</h2>
          <ProofScoreBadge address={merchantId} />
        </div>
        
        <div className="payment-details">
          <div className="line-item">
            <span>Item:</span>
            <span>{merchantInfo.itemName}</span>
          </div>
          <div className="line-item">
            <span>Price:</span>
            <span className="price">{merchantInfo.price} USDC</span>
          </div>
          <div className="line-item">
            <span>Escrow:</span>
            <span>7 days 🛡️</span>
          </div>
          {proofScore >= 750 && (
            <div className="line-item gas-subsidy">
              <span>Gas Fee:</span>
              <span className="free">FREE ✨ (merchant score ≥750)</span>
            </div>
          )}
        </div>
        
        <PaymentButton 
          merchantId={merchantId} 
          amount={merchantInfo.price}
        />
      </Card>
    </div>
  );
}
```

---

## 4. Vault Infrastructure

### VaultInfrastructure.sol → Vault Manager
**Contract Functions**:
- `createVault(address)` - Create new vault
- `deposit(uint256)` - Deposit tokens
- `withdraw(uint256)` - Withdraw tokens
- `lockVault(uint256)` - Lock vault (emergency)
- `getVaultBalance(address)` - Check vault balance

**Frontend Module**: `frontend/merchant/app/vault/page.tsx`
```jsx
// Vault Manager
export function VaultManager() {
  const { address } = useAccount();
  const vaults = useVaults(address);
  
  return (
    <div className="vault-manager">
      <Card title="🏰 Your Vaults">
        <div className="vault-grid">
          {vaults.map(vault => (
            <VaultCard key={vault.id} vault={vault} />
          ))}
        </div>
        
        <button className="btn-primary" onClick={createVault}>
          ⚔️ Create New Vault
        </button>
      </Card>
    </div>
  );
}

// Individual Vault Card
function VaultCard({ vault }) {
  return (
    <div className="vault-card">
      <div className="vault-icon">🏰</div>
      <div className="vault-balance">
        {vault.balance} VFIDE
      </div>
      <div className="vault-actions">
        <button className="btn-secondary">💰 Deposit</button>
        <button className="btn-secondary">📤 Withdraw</button>
        {vault.locked && <span className="locked-badge">🔒 Locked</span>}
      </div>
    </div>
  );
}
```

---

## 5. Guardian Nodes

### GuardianNodeSale.sol → Guardian Marketplace
**Contract Functions**:
- `buy(uint256)` - Purchase guardian nodes
- `balanceOf(address)` - Check node count
- `claimRewards()` - Claim node staking rewards
- `getNodeInfo(address, uint256)` - Get node details

**Frontend Module**: `frontend/merchant/app/guardians/page.tsx`
```jsx
// Guardian Node Marketplace
export function GuardianMarketplace() {
  const { address } = useAccount();
  const nodeCount = useNodeCount(address);
  const rewards = useNodeRewards(address);
  
  return (
    <div className="guardian-marketplace">
      <Card title="⚔️ Guardian Node Marketplace">
        <div className="marketplace-header">
          <StatItem label="Your Nodes" value={nodeCount} icon="🛡️" />
          <StatItem label="Unclaimed Rewards" value={rewards} suffix="VFIDE" icon="💰" />
        </div>
        
        <div className="node-tiers">
          <NodeTierCard
            tier="Bronze Node"
            price="1,000 VFIDE"
            benefits={["10% revenue share", "1 vote weight"]}
            icon="🛡️"
          />
          <NodeTierCard
            tier="Silver Node"
            price="10,000 VFIDE"
            benefits={["15% revenue share", "5 vote weight", "Council eligibility"]}
            icon="⚔️"
          />
          <NodeTierCard
            tier="Platinum Node"
            price="100,000 VFIDE"
            benefits={["25% revenue share", "20 vote weight", "Emergency powers"]}
            icon="👑"
          />
        </div>
        
        <button className="btn-primary">
          💰 Claim Rewards ({rewards} VFIDE)
        </button>
      </Card>
    </div>
  );
}
```

---

## 6. Governance (DAO)

### DAOTimelockV2.sol → Governance Portal
**Contract Functions**:
- `propose(address, bytes, string)` - Create proposal
- `vote(uint256, bool)` - Vote on proposal
- `execute(uint256)` - Execute passed proposal
- `getProposalState(uint256)` - Check proposal status

**Frontend Module**: `frontend/merchant/app/governance/page.tsx`
```jsx
// DAO Governance Portal
export function GovernancePortal() {
  const activeProposals = useActiveProposals();
  const votingPower = useVotingPower(useAccount().address);
  
  return (
    <div className="governance-portal">
      <Card title="⚖️ DAO Governance">
        <div className="voting-power">
          <h3>Your Voting Power</h3>
          <span className="power-value">{votingPower} votes</span>
        </div>
        
        <div className="proposals-list">
          {activeProposals.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
        
        <button className="btn-primary">
          📜 Create Proposal
        </button>
      </Card>
    </div>
  );
}

// Individual Proposal Card
function ProposalCard({ proposal }) {
  const [voted, setVoted] = useState(false);
  
  return (
    <div className="proposal-card">
      <h4>{proposal.title}</h4>
      <p>{proposal.description}</p>
      
      <div className="vote-progress">
        <div className="vote-bar">
          <div 
            className="vote-yes" 
            style={{ width: `${proposal.yesPercent}%` }}
          />
        </div>
        <div className="vote-counts">
          <span>✅ Yes: {proposal.yesVotes}</span>
          <span>❌ No: {proposal.noVotes}</span>
        </div>
      </div>
      
      {!voted && (
        <div className="vote-actions">
          <button className="btn-primary" onClick={() => vote(proposal.id, true)}>
            ✅ Vote Yes
          </button>
          <button className="btn-secondary" onClick={() => vote(proposal.id, false)}>
            ❌ Vote No
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### CouncilElection.sol → Council Voting
**Contract Functions**:
- `nominateSelf()` - Run for council seat
- `voteForCandidate(address)` - Vote for candidate
- `getCurrentCouncil()` - View elected council members

**Frontend Module**: `frontend/merchant/app/council/page.tsx`
```jsx
// Council Election Page
export function CouncilElection() {
  const candidates = useCandidates();
  const currentCouncil = useCurrentCouncil();
  
  return (
    <div className="council-election">
      <Card title="👑 Guardian Council">
        <div className="current-council">
          <h3>Current Council Members</h3>
          <div className="council-grid">
            {currentCouncil.map(member => (
              <CouncilMemberCard key={member.address} member={member} />
            ))}
          </div>
        </div>
        
        <div className="candidates">
          <h3>Election Candidates</h3>
          <div className="candidate-list">
            {candidates.map(candidate => (
              <CandidateCard key={candidate.address} candidate={candidate} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
```

---

## 7. Finance & Treasury

### VFIDEFinance.sol → Finance Dashboard
**Contract Functions**:
- `getTreasuryBalance()` - Check treasury balance
- `getRevenueStats()` - View revenue sources
- `getExpenseStats()` - View expenses
- `requestBudget(uint256, string)` - Request funds from DAO

**Frontend Module**: `frontend/merchant/app/finance/page.tsx`
```jsx
// Finance Dashboard (DAO Members Only)
export function FinanceDashboard() {
  const treasuryBalance = useTreasuryBalance();
  const revenueStats = useRevenueStats();
  const expenseStats = useExpenseStats();
  
  return (
    <div className="finance-dashboard">
      <Card title="💰 Treasury Overview">
        <div className="balance-display">
          <h2>{treasuryBalance} VFIDE</h2>
          <span className="balance-usd">${calculateUSD(treasuryBalance)}</span>
        </div>
        
        <div className="finance-grid">
          <RevenueChart data={revenueStats} />
          <ExpenseChart data={expenseStats} />
        </div>
        
        <div className="sustainability-ratio">
          <h3>Sustainability Ratio</h3>
          <span className="ratio">8.8x</span>
          <p>Treasury can sustain operations for 8.8 years at current burn rate</p>
        </div>
      </Card>
    </div>
  );
}
```

---

### RevenueSplitter.sol → Revenue Distribution View
**Contract Functions**:
- `split(uint256)` - Split revenue (25% guardians, 50% treasury, 25% burn)
- `getGuardianShare(address)` - Check guardian rewards
- `claimShare()` - Claim revenue share

**Frontend Module**: `frontend/merchant/app/revenue/page.tsx`
```jsx
// Revenue Distribution
export function RevenueDistribution() {
  const { address } = useAccount();
  const guardianShare = useGuardianShare(address);
  
  return (
    <Card title="💎 Revenue Distribution">
      <div className="split-visualization">
        <PieChart
          data={[
            { label: 'Guardians', value: 25, color: '#FFD700' },
            { label: 'Treasury', value: 50, color: '#00F0FF' },
            { label: 'Burned', value: 25, color: '#C41E3A' }
          ]}
        />
      </div>
      
      <div className="your-share">
        <h3>Your Guardian Share</h3>
        <span className="share-value">{guardianShare} VFIDE</span>
        <button className="btn-primary">💰 Claim Rewards</button>
      </div>
    </Card>
  );
}
```

---

## 8. Subscriptions

### SubscriptionManager.sol → Subscription Portal
**Contract Functions**:
- `createSubscription(address, uint256, uint256)` - Create recurring payment
- `cancelSubscription(uint256)` - Cancel subscription
- `processPayment(uint256)` - Process monthly charge
- `getActiveSubscriptions(address)` - View active subscriptions

**Frontend Module**: `frontend/merchant/app/subscriptions/page.tsx`
```jsx
// Subscription Manager
export function SubscriptionManager() {
  const { address } = useAccount();
  const subscriptions = useSubscriptions(address);
  
  return (
    <Card title="🔁 Recurring Subscriptions">
      <div className="subscription-list">
        {subscriptions.map(sub => (
          <SubscriptionCard key={sub.id} subscription={sub} />
        ))}
      </div>
      
      <button className="btn-primary">
        ➕ Create Subscription
      </button>
    </Card>
  );
}

// Individual Subscription Card
function SubscriptionCard({ subscription }) {
  return (
    <div className="subscription-card">
      <div className="sub-info">
        <h4>{subscription.merchant}</h4>
        <span className="amount">{subscription.amount} USDC/month</span>
        <span className="next-payment">
          Next payment: {formatDate(subscription.nextPayment)}
        </span>
      </div>
      <button className="btn-secondary" onClick={() => cancel(subscription.id)}>
        ❌ Cancel
      </button>
    </div>
  );
}
```

---

## 9. Emergency & Security

### EmergencyControl.sol → Emergency Panel (Admin Only)
**Contract Functions**:
- `pause()` - Emergency pause all operations
- `unpause()` - Resume operations
- `emergencyWithdraw(address, uint256)` - Emergency fund recovery

**Frontend Module**: `frontend/merchant/app/admin/emergency/page.tsx`
```jsx
// Emergency Control Panel (Admin Only)
export function EmergencyPanel() {
  const isPaused = useSystemPaused();
  
  return (
    <Card title="🚨 Emergency Control">
      <div className="emergency-status">
        <h3>System Status</h3>
        <span className={isPaused ? 'status-paused' : 'status-active'}>
          {isPaused ? '⏸️ PAUSED' : '✅ ACTIVE'}
        </span>
      </div>
      
      {!isPaused ? (
        <button className="btn-danger" onClick={pauseSystem}>
          ⏸️ EMERGENCY PAUSE
        </button>
      ) : (
        <button className="btn-primary" onClick={unpauseSystem}>
          ▶️ RESUME OPERATIONS
        </button>
      )}
    </Card>
  );
}
```

---

## 10. Complete Module Summary

| Contract | Frontend Module | Page URL | Key Features |
|----------|----------------|----------|--------------|
| **VFIDEToken** | Token Dashboard | `/wallet` | Balance, transfers, burns |
| **ProofScoreBurnRouter** | ProofScore Badge | (global component) | Score display, tier badges |
| **VFIDETrust (Seer)** | Trust Explorer | `/explorer/address/[id]` | History, endorsements, disputes |
| **MerchantPortal** | Merchant Dashboard | `/dashboard` | Stats, transactions, actions |
| **EscrowManager** | Escrow Interface | `/escrow` | Active escrows, release, disputes |
| **VFIDECommerce** | Checkout Page | `/pay/[merchantId]` | Payment processing |
| **VaultInfrastructure** | Vault Manager | `/vault` | Create, deposit, withdraw |
| **GuardianNodeSale** | Guardian Marketplace | `/guardians` | Buy nodes, claim rewards |
| **DAOTimelockV2** | Governance Portal | `/governance` | Proposals, voting |
| **CouncilElection** | Council Voting | `/council` | Elections, candidates |
| **VFIDEFinance** | Finance Dashboard | `/finance` | Treasury, budget |
| **RevenueSplitter** | Revenue Distribution | `/revenue` | Splits, claims |
| **SubscriptionManager** | Subscription Portal | `/subscriptions` | Recurring payments |
| **EmergencyControl** | Emergency Panel | `/admin/emergency` | Pause/unpause |
| **DevReserveVestingVault** | Vesting Tracker | `/finance/vesting` | Dev team vesting |
| **MerchantRebateVault** | Rebate Tracker | `/finance/rebates` | Ecosystem fees |
| **SystemHandover** | Decentralization Timeline | `/governance/handover` | DAO takeover countdown |

---

## 11. Frontend Project Structure (Complete)

```
frontend/
├── merchant/                       # merchant.vfide.com
│   ├── app/
│   │   ├── (dashboard)/           # Main merchant area
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   ├── escrow/            # Escrow management
│   │   │   ├── disputes/          # Dispute resolution
│   │   │   ├── vault/             # Vault manager
│   │   │   ├── guardians/         # Guardian marketplace
│   │   │   ├── governance/        # DAO proposals
│   │   │   ├── council/           # Council elections
│   │   │   ├── finance/           # Treasury view
│   │   │   ├── revenue/           # Revenue splits
│   │   │   ├── subscriptions/     # Recurring payments
│   │   │   ├── wallet/            # Token dashboard
│   │   │   └── settings/          # Merchant settings
│   │   ├── onboarding/            # <2 min KYC-free flow
│   │   ├── admin/                 # Emergency panel (admin only)
│   │   └── layout.tsx             # Professional theme wrapper
│   ├── components/
│   │   ├── WalletConnect.tsx
│   │   ├── Card.tsx
│   │   ├── ProofScoreBadge.tsx
│   │   ├── TransactionTable.tsx
│   │   ├── EscrowCard.tsx
│   │   ├── VaultCard.tsx
│   │   ├── NodeTierCard.tsx
│   │   ├── ProposalCard.tsx
│   │   └── StatCard.tsx
│   └── hooks/
│       ├── useProofScore.ts
│       ├── useEscrow.ts
│       ├── useMerchantStats.ts
│       ├── useVaults.ts
│       ├── useGuardianNodes.ts
│       └── useGovernance.ts
│
├── pay/                           # pay.vfide.com
│   ├── app/
│   │   ├── [merchantId]/          # Checkout pages
│   │   └── success/               # Payment success
│   └── components/
│       ├── CheckoutForm.tsx
│       ├── MerchantCard.tsx
│       └── PaymentButton.tsx
│
├── explorer/                      # explorer.vfide.com
│   ├── app/
│   │   ├── page.tsx               # Search + leaderboard
│   │   ├── address/[id]/          # Trust profile
│   │   └── stats/                 # Network stats
│   └── components/
│       ├── Leaderboard.tsx
│       ├── ProofScoreSearch.tsx
│       └── TransactionFeed.tsx
│
├── marketing/                     # vfide.com (Astro)
│   └── src/
│       ├── pages/
│       │   ├── index.astro        # Hero, value props
│       │   ├── how-it-works.astro
│       │   ├── merchants.astro
│       │   └── whitepaper.astro
│       └── components/
│           ├── Hero3D.astro       # Three.js Cross symbol
│           └── ValueProp.astro
│
└── shared/                        # Shared across all sites
    ├── components/
    │   ├── Navigation.tsx         # Unified nav
    │   ├── Footer.tsx             # Unified footer
    │   └── Logo.tsx        # Animated logo
    ├── contracts/                 # ABI files
    │   ├── VFIDEToken.json
    │   ├── ProofScoreBurnRouter.json
    │   ├── MerchantPortal.json
    │   ├── EscrowManager.json
    │   ├── VaultInfrastructure.json
    │   ├── GuardianNodeSale.json
    │   ├── DAOTimelockV2.json
    │   └── [30+ contract ABIs]
    ├── hooks/
    │   ├── useVFIDEContracts.ts   # Contract instances
    │   ├── useProofScore.ts       # ProofScore hooks
    │   └── useWallet.ts           # Wallet hooks
    └── utils/
        ├── formatters.ts          # Address, currency formatting
        ├── tierCalculator.ts      # ProofScore → tier
        └── contractHelpers.ts     # Contract call helpers
```

---

## 12. Implementation Priority

### Phase 1: Core (Weeks 1-4)
- [x] Design system document
- [ ] Set up Next.js monorepo
- [ ] WalletConnect component
- [ ] ProofScore badge component
- [ ] Merchant dashboard (read-only)
- [ ] Transaction table
- [ ] Escrow cards

### Phase 2: Payments (Weeks 5-6)
- [ ] Checkout page (`pay.vfide.com`)
- [ ] Payment button with animations
- [ ] Escrow creation (write transactions)
- [ ] Payment success animations

### Phase 3: Advanced (Weeks 7-10)
- [ ] Vault manager
- [ ] Guardian marketplace
- [ ] DAO governance portal
- [ ] Subscription manager
- [ ] Finance dashboard

### Phase 4: Marketing & Explorer (Weeks 11-12)
- [ ] Marketing site (`vfide.com`)
- [ ] Blockchain explorer (`explorer.vfide.com`)
- [ ] Leaderboard
- [ ] Trust profiles

---

## 13. Key React Hooks (Custom)

```typescript
// hooks/useProofScore.ts
export function useProofScore(address: string) {
  const { data, isLoading } = useContractRead({
    address: PROOFSCORE_ROUTER_ADDRESS,
    abi: ProofScoreBurnRouterABI,
    functionName: 'getProofScore',
    args: [address],
  });
  
  return {
    score: data ? Number(data) : 0,
    tier: calculateTier(Number(data)),
    isLoading,
  };
}

// hooks/useEscrow.ts
export function useActiveEscrows(merchantAddress: string) {
  const { data } = useContractRead({
    address: ESCROW_MANAGER_ADDRESS,
    abi: EscrowManagerABI,
    functionName: 'getActiveEscrows',
    args: [merchantAddress],
  });
  
  return data || [];
}

// hooks/useMerchantStats.ts
export function useMerchantStats(address: string) {
  const monthlyVolume = useMonthlyVolume(address);
  const monthlyLimit = useMonthlyLimit(address);
  const activeEscrows = useActiveEscrows(address);
  const totalEarnings = useTotalEarnings(address);
  
  return {
    monthlyVolume,
    monthlyLimit,
    limitUsagePercent: (monthlyVolume / monthlyLimit) * 100,
    activeEscrowCount: activeEscrows.length,
    totalEarnings,
  };
}
```

---

## 14. Conclusion

**What This Document Provides**:
- ✅ Every smart contract mapped to frontend module
- ✅ Complete component structure (17 modules)
- ✅ React hooks for each contract
- ✅ UI design for each feature
- ✅ Implementation priority roadmap

**Next Actions**:
1. Set up Next.js monorepo (`frontend/merchant`, `frontend/pay`, `frontend/explorer`)
2. Install dependencies (`wagmi`, `viem`, `framer-motion`, `three`)
3. Create shared component library (`WalletConnect`, `Card`, `ProofScoreBadge`)
4. Build merchant dashboard (read-only first)
5. Implement checkout page (with write transactions)

**Total Development Time**: 12 weeks (3 months) for full ecosystem

---

**END OF MODULE MAPPING**
