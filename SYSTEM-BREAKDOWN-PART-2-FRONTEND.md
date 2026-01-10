# VFIDE System Breakdown - Part 2: Frontend Application
**Complete Technical Reference**  
**Date:** January 10, 2026  
**Part:** 2 of 4

---

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Application Pages](#application-pages)
4. [Components Library](#components-library)
5. [Custom Hooks](#custom-hooks)
6. [State Management](#state-management)
7. [Blockchain Integration](#blockchain-integration)
8. [UI/UX Features](#uiux-features)

---

## Overview

### Frontend Statistics
- **Framework:** Next.js 16.1.1 (App Router)
- **React Version:** 19.0.0
- **TypeScript Files:** 421 TSX files, 174 TS files
- **Total Lines:** ~22,939 lines (app pages)
- **Components:** 150+ reusable components
- **Pages:** 50+ application pages
- **Test Coverage:** 98.4% pass rate

### Architecture Pattern
```
Next.js App Router (RSC)
    │
    ├── Server Components (Static/Dynamic)
    │   ├── Fetch data server-side
    │   ├── SEO optimized
    │   └── Zero JS to client
    │
    └── Client Components ('use client')
        ├── Interactive UI
        ├── Blockchain hooks (wagmi)
        └── Real-time updates (WebSocket)
```

---

## Technology Stack

### Core Framework
```json
{
  "next": "16.1.1",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "typescript": "5.3.3"
}
```

### Blockchain Integration
```json
{
  "wagmi": "2.14.8",
  "@rainbow-me/rainbowkit": "2.2.1",
  "viem": "2.21.54",
  "ethers": "6.16.0"
}
```

### UI Libraries
```json
{
  "tailwindcss": "4.0.0",
  "@radix-ui/react-dialog": "1.1.15",
  "@radix-ui/react-alert-dialog": "1.1.15",
  "framer-motion": "11.14.4",
  "lucide-react": "latest"
}
```

### State & Data
```json
{
  "@tanstack/react-query": "5.62.13",
  "zustand": "5.0.3",
  "socket.io-client": "4.8.1"
}
```

### Development Tools
```json
{
  "jest": "29.7.0",
  "@testing-library/react": "16.1.0",
  "playwright": "1.49.1",
  "eslint": "9.18.0",
  "prettier": "3.4.2"
}
```

---

## Application Pages

### 1. Dashboard (`/dashboard`)
**File:** `frontend/app/dashboard/page.tsx`  
**Lines:** ~800 lines  
**Status:** ✅ Production Ready

#### Features
- Real-time VFIDE balance display
- ProofScore visualization with breakdown
- Activity feed (recent transactions)
- Quick actions (send, receive, stake)
- Notification center
- Portfolio overview
- Network selector

#### Components Used
```typescript
- BalanceCard
- ProofScoreCard
- ActivityFeed
- QuickActions
- NotificationBell
- NetworkSwitcher
- DashboardStats
```

#### Key Functions
```typescript
function Dashboard() {
  const { address } = useAccount()
  const { data: balance } = useBalance(address)
  const { data: proofScore } = useProofScore(address)
  const { data: vaultAddress } = useVaultAddress(address)
  
  // Real-time updates via WebSocket
  useWebSocket('balance', handleBalanceUpdate)
  useWebSocket('proofscore', handleScoreUpdate)
  
  return (
    <div className="dashboard-container">
      <BalanceCard balance={balance} />
      <ProofScoreCard score={proofScore} />
      <ActivityFeed address={address} />
      <QuickActions />
    </div>
  )
}
```

#### API Endpoints
```
GET /api/dashboard/stats
GET /api/dashboard/activity
GET /api/dashboard/notifications
POST /api/dashboard/mark-read
```

---

### 2. Vault Management (`/vault`)
**File:** `frontend/app/vault/page.tsx`  
**Lines:** ~900 lines  
**Status:** ✅ Production Ready

#### Features
- Vault creation wizard
- Guardian management (add/remove/replace)
- Transfer initiation (with time-lock)
- Pending transfers list
- Recovery initiation
- Emergency freeze
- Allowance setup
- Inheritance planning

#### Components
```typescript
- VaultCreationWizard
- GuardianPanel
- TransferForm
- PendingTransfersList
- RecoveryPanel
- EmergencyControls
- AllowanceManager
- InheritanceSetup
```

#### Key Hooks
```typescript
// Vault Creation
const { write: createVault, isLoading } = useCreateVault({
  guardians: [addr1, addr2, addr3],
  threshold: 2,
  onSuccess: (data) => {
    toast.success(`Vault created at ${data.vaultAddress}`)
  }
})

// Guardian Management
const { data: guardians } = useGuardians(vaultAddress)
const { write: addGuardian } = useAddGuardian(vaultAddress)
const { write: removeGuardian } = useRemoveGuardian(vaultAddress)

// Transfer Management
const { write: initiateTransfer } = useInitiateTransfer({
  vaultAddress,
  token: VFIDE_TOKEN_ADDRESS,
  to: recipient,
  amount: parseEther(amount),
  useTimeLock: true
})

// Recovery
const { write: initiateRecovery } = useInitiateRecovery({
  vaultAddress,
  newOwner: recoveryAddress
})
```

#### Contract Interactions
```solidity
// VaultHub
createVault(address[] guardians, uint256 threshold)
getVaultByOwner(address owner)
predictVaultAddress(address owner)

// UserVault
transfer(address token, address to, uint256 amount, bool useTimeLock)
addGuardian(address guardian)
removeGuardian(address guardian)
initiateRecovery(address newOwner)
approveRecovery()
emergencyFreeze()
```

---

### 3. Merchant Portal (`/merchant`)
**File:** `frontend/app/merchant/page.tsx`  
**Lines:** ~750 lines  
**Status:** ✅ Production Ready

#### Features
- Merchant registration form
- Business profile management
- Payment processing interface
- Sales analytics dashboard
- Dispute management
- Customer list
- Invoice generation
- QR code payment links

#### Registration Flow
```typescript
function MerchantRegistration() {
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const { data: proofScore } = useProofScore(address)
  
  // Check eligibility (min ProofScore 6000 = 60%)
  const isEligible = proofScore >= 6000
  
  const { write: registerMerchant } = useRegisterMerchant({
    businessName,
    category,
    onSuccess: () => {
      router.push('/merchant/dashboard')
    }
  })
  
  return (
    <Card>
      {!isEligible && (
        <Alert variant="warning">
          ProofScore must be 60%+ to register as merchant.
          Current: {proofScore / 100}%
        </Alert>
      )}
      <Input value={businessName} onChange={setBusinessName} />
      <Select value={category} onChange={setCategory} />
      <Button onClick={registerMerchant} disabled={!isEligible}>
        Register Merchant
      </Button>
    </Card>
  )
}
```

#### Payment Processing
```typescript
function ProcessPayment() {
  const { write: processPayment } = useProcessPayment({
    merchant: merchantAddress,
    amount: parseEther(amount),
    description,
    useEscrow: true,
    onSuccess: (data) => {
      toast.success(`Payment ${data.paymentId} processed`)
    }
  })
  
  return (
    <PaymentForm>
      <AmountInput />
      <DescriptionInput />
      <EscrowCheckbox />
      <SubmitButton onClick={processPayment}>
        Process Payment (0% fee)
      </SubmitButton>
    </PaymentForm>
  )
}
```

#### Analytics Dashboard
```typescript
function MerchantAnalytics() {
  const { data: stats } = useMerchantStats(merchantAddress)
  
  return (
    <Grid>
      <StatCard label="Total Sales" value={formatCurrency(stats.totalSales)} />
      <StatCard label="Transactions" value={stats.totalTransactions} />
      <StatCard label="Avg. Transaction" value={formatCurrency(stats.average)} />
      <StatCard label="Dispute Rate" value={`${stats.disputeRate}%`} />
    </Grid>
  )
}
```

---

### 4. Governance (`/governance`)
**File:** `frontend/app/governance/page.tsx`  
**Lines:** 2,781 lines ⚠️ (NEEDS SPLITTING)  
**Status:** ✅ Functional, ⚠️ Maintainability Issue

#### Features
- Proposal browsing (all, active, passed, failed)
- Proposal creation wizard
- Voting interface
- Vote delegation
- Timelock queue
- Council election
- Governance stats
- Voting history

#### Tabs Structure
```typescript
enum GovernanceTab {
  Proposals = 'proposals',
  CreateProposal = 'create',
  MyVotes = 'my-votes',
  Timelock = 'timelock',
  Council = 'council',
  Stats = 'stats'
}
```

#### Voting Interface
```typescript
function VotePanel({ proposalId }: { proposalId: number }) {
  const { data: proposal } = useProposal(proposalId)
  const { data: votingPower } = useVotingPower(address)
  const { write: castVote } = useCastVote(proposalId)
  
  const voteFor = () => castVote({ support: 1 })
  const voteAgainst = () => castVote({ support: 0 })
  const voteAbstain = () => castVote({ support: 2 })
  
  return (
    <Card>
      <VotingPowerDisplay power={votingPower} />
      <ProposalDetails proposal={proposal} />
      <VoteButtons>
        <Button variant="success" onClick={voteFor}>
          Vote For
        </Button>
        <Button variant="danger" onClick={voteAgainst}>
          Vote Against
        </Button>
        <Button variant="secondary" onClick={voteAbstain}>
          Abstain
        </Button>
      </VoteButtons>
      <VoteProgress proposal={proposal} />
    </Card>
  )
}
```

#### Proposal Creation
```typescript
function CreateProposal() {
  const [proposalType, setProposalType] = useState<ProposalType>('Generic')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  
  const { write: propose } = usePropose({
    proposalType,
    title,
    description,
    onSuccess: (data) => {
      router.push(`/governance/proposal/${data.proposalId}`)
    }
  })
  
  return (
    <ProposalForm>
      <TypeSelector value={proposalType} onChange={setProposalType} />
      <TitleInput value={title} onChange={setTitle} />
      <DescriptionEditor value={description} onChange={setDescription} />
      <SubmitButton onClick={propose}>
        Submit Proposal
      </SubmitButton>
    </ProposalForm>
  )
}
```

#### Voting Power Calculation
```
Voting Power = Token Balance × (ProofScore / 1000)

Examples:
- 1,000 VFIDE × (8000 / 1000) = 8,000 voting power
- 10,000 VFIDE × (9500 / 1000) = 95,000 voting power
- 100 VFIDE × (5000 / 1000) = 500 voting power
```

---

### 5. ProofScore (`/profile`)
**File:** `frontend/app/profile/page.tsx`  
**Lines:** ~600 lines  
**Status:** ✅ Production Ready

#### Features
- ProofScore breakdown (6 factors)
- Score history chart
- Endorsement panel (give/receive)
- Badge gallery
- Activity stats
- Reputation insights
- Improvement suggestions

#### Score Visualization
```typescript
function ProofScoreBreakdown() {
  const { data: breakdown } = useScoreBreakdown(address)
  
  return (
    <Card>
      <CircularProgress value={breakdown.total / 100} max={100}>
        {breakdown.total / 100}%
      </CircularProgress>
      
      <FactorBreakdown>
        <Factor label="Capital" value={breakdown.capital} weight={40} />
        <Factor label="Behavior" value={breakdown.behavior} weight={25} />
        <Factor label="Social" value={breakdown.social} weight={15} />
        <Factor label="Credentials" value={breakdown.credentials} weight={10} />
        <Factor label="Activity" value={breakdown.activity} weight={5} />
        <Factor label="Baseline" value={500} weight={5} />
      </FactorBreakdown>
    </Card>
  )
}
```

#### Endorsement System
```typescript
function EndorsementPanel() {
  const { data: endorsements } = useEndorsements(address)
  const { write: giveEndorsement } = useGiveEndorsement()
  
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  
  const handleEndorse = () => {
    giveEndorsement({
      recipient,
      message,
      onSuccess: () => {
        toast.success('Endorsement given!')
        setRecipient('')
        setMessage('')
      }
    })
  }
  
  return (
    <div>
      <GiveEndorsement>
        <AddressInput value={recipient} onChange={setRecipient} />
        <MessageInput value={message} onChange={setMessage} />
        <Button onClick={handleEndorse}>Endorse</Button>
      </GiveEndorsement>
      
      <ReceivedEndorsements>
        {endorsements.map(e => (
          <EndorsementCard key={e.id} endorsement={e} />
        ))}
      </ReceivedEndorsements>
    </div>
  )
}
```

---

### 6. Escrow System (`/escrow`)
**File:** `frontend/app/escrow/page.tsx`  
**Lines:** ~550 lines  
**Status:** ✅ Production Ready

#### Features
- Create escrow agreement
- Fund escrow
- Release funds (buyer approval)
- Refund request
- Dispute initiation
- Escrow history
- Multi-party escrow

#### Escrow Creation
```typescript
function CreateEscrow() {
  const [buyer, setBuyer] = useState('')
  const [seller, setSeller] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [releaseConditions, setReleaseConditions] = useState('')
  
  const { write: createEscrow } = useCreateEscrow({
    buyer,
    seller,
    amount: parseEther(amount),
    description,
    releaseConditions,
    onSuccess: (data) => {
      router.push(`/escrow/${data.escrowId}`)
    }
  })
  
  return (
    <EscrowForm>
      <ParticipantInputs>
        <AddressInput label="Buyer" value={buyer} onChange={setBuyer} />
        <AddressInput label="Seller" value={seller} onChange={setSeller} />
      </ParticipantInputs>
      <AmountInput value={amount} onChange={setAmount} />
      <DescriptionInput value={description} onChange={setDescription} />
      <ConditionsInput value={releaseConditions} onChange={setReleaseConditions} />
      <Button onClick={createEscrow}>Create Escrow</Button>
    </EscrowForm>
  )
}
```

---

### 7. Badge System (`/badges`)
**File:** `frontend/app/badges/page.tsx`  
**Lines:** ~500 lines  
**Status:** ✅ Production Ready

#### Features
- Badge gallery (11 achievement badges)
- Claim eligible badges
- Mint badge NFTs
- Badge leaderboard
- Badge requirements
- IPFS metadata

#### Badge Types
```typescript
enum BadgeType {
  EarlyAdopter = 'early-adopter',
  HighTrust = 'high-trust',
  Merchant = 'merchant',
  Guardian = 'guardian',
  Voter = 'voter',
  Endorser = 'endorser',
  StakeHolder = 'stake-holder',
  TopTrader = 'top-trader',
  Philanthropist = 'philanthropist',
  BugHunter = 'bug-hunter',
  Ambassador = 'ambassador'
}
```

#### Badge Gallery
```typescript
function BadgeGallery() {
  const { data: userBadges } = useUserBadges(address)
  const { write: claimBadge } = useClaimBadge()
  const { write: mintNFT } = useMintBadgeNFT()
  
  const badges = [
    {
      id: 1,
      name: 'Early Adopter',
      description: 'Joined during beta',
      requirement: 'Register before Jan 2026',
      earned: userBadges.includes(1)
    },
    // ... 10 more badges
  ]
  
  return (
    <Grid cols={3}>
      {badges.map(badge => (
        <BadgeCard key={badge.id}>
          <BadgeIcon src={badge.icon} earned={badge.earned} />
          <BadgeName>{badge.name}</BadgeName>
          <BadgeDescription>{badge.description}</BadgeDescription>
          {badge.earned ? (
            <Button onClick={() => mintNFT(badge.id)}>
              Mint NFT
            </Button>
          ) : (
            <Badge variant="secondary">Not Earned</Badge>
          )}
        </BadgeCard>
      ))}
    </Grid>
  )
}
```

---

### 8. Payroll Manager (`/payroll`)
**File:** `frontend/app/payroll/page.tsx`  
**Lines:** ~1,200 lines  
**Status:** ✅ Production Ready

#### Features
- Add employees
- Set salaries
- Payment schedules (weekly, bi-weekly, monthly)
- Bulk payments
- Payment history
- Payroll reports
- Tax calculations

---

### 9. Leaderboard (`/leaderboard`)
**File:** `frontend/app/leaderboard/page.tsx`  
**Lines:** ~450 lines  
**Status:** ✅ Production Ready

#### Features
- ProofScore rankings
- Transaction volume leaders
- Badge holders
- Merchant rankings
- Filter by category
- Time-based rankings (daily, weekly, all-time)

---

### 10. Admin Panel (`/admin`)
**File:** `frontend/app/admin/page.tsx`  
**Lines:** 2,118 lines ⚠️ (NEEDS SPLITTING)  
**Status:** ✅ Functional, ⚠️ Maintainability Issue

#### Features
- User management
- Contract configuration
- Emergency controls
- System monitoring
- Transaction analytics
- Blacklist management
- Circuit breaker control

---

## Components Library

### UI Components (`/components/ui`)

#### 1. Button Component
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export function Button({ 
  variant = 'primary', 
  size = 'md',
  loading,
  disabled,
  children,
  onClick 
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-all',
        variants[variant],
        sizes[size],
        loading && 'opacity-50 cursor-wait',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
```

#### 2. Card Component
```typescript
export function Card({ 
  title, 
  children, 
  footer 
}: CardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {title && (
        <div className="text-xl font-bold mb-4">{title}</div>
      )}
      <div className="card-content">{children}</div>
      {footer && (
        <div className="border-t pt-4 mt-4">{footer}</div>
      )}
    </div>
  )
}
```

#### 3. Dialog Component
```typescript
import * as Dialog from '@radix-ui/react-dialog'

export function DialogComponent({ 
  trigger, 
  title, 
  children, 
  onClose 
}: DialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>{title}</Dialog.Title>
          <div>{children}</div>
          <Dialog.Close asChild>
            <Button onClick={onClose}>Close</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

---

## Custom Hooks

### Vault Hooks (`/hooks/useVaultHooks.ts`)

```typescript
// Create Vault
export function useCreateVault() {
  const { writeContract } = useWriteContract()
  
  return useMutation({
    mutationFn: async ({ guardians, threshold }) => {
      return writeContract({
        address: VAULT_HUB_ADDRESS,
        abi: VaultHubABI,
        functionName: 'createVault',
        args: [guardians, threshold]
      })
    }
  })
}

// Get Vault Address
export function useVaultAddress(owner: Address) {
  return useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: VaultHubABI,
    functionName: 'getVaultByOwner',
    args: [owner],
    enabled: !!owner
  })
}

// Get Guardians
export function useGuardians(vaultAddress: Address) {
  return useReadContract({
    address: vaultAddress,
    abi: UserVaultABI,
    functionName: 'getGuardians',
    enabled: !!vaultAddress
  })
}

// Initiate Transfer
export function useInitiateTransfer(vaultAddress: Address) {
  const { writeContract } = useWriteContract()
  
  return useMutation({
    mutationFn: async ({ token, to, amount, useTimeLock }) => {
      return writeContract({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'transfer',
        args: [token, to, amount, useTimeLock]
      })
    }
  })
}
```

### ProofScore Hooks (`/hooks/useProofScoreHooks.ts`)

```typescript
// Get ProofScore
export function useProofScore(address: Address) {
  return useReadContract({
    address: VFIDE_TRUST_ADDRESS,
    abi: VFIDETrustABI,
    functionName: 'getProofScore',
    args: [address],
    enabled: !!address,
    watch: true // Real-time updates
  })
}

// Get Score Breakdown
export function useScoreBreakdown(address: Address) {
  return useReadContract({
    address: VFIDE_TRUST_ADDRESS,
    abi: VFIDETrustABI,
    functionName: 'getScoreBreakdown',
    args: [address],
    enabled: !!address
  })
}

// Give Endorsement
export function useGiveEndorsement() {
  const { writeContract } = useWriteContract()
  
  return useMutation({
    mutationFn: async ({ recipient, message }) => {
      return writeContract({
        address: VFIDE_TRUST_ADDRESS,
        abi: VFIDETrustABI,
        functionName: 'giveEndorsement',
        args: [recipient, message]
      })
    }
  })
}

// Get Endorsements
export function useEndorsements(address: Address) {
  return useReadContract({
    address: VFIDE_TRUST_ADDRESS,
    abi: VFIDETrustABI,
    functionName: 'getEndorsements',
    args: [address],
    enabled: !!address
  })
}
```

### Merchant Hooks (`/hooks/useMerchantHooks.ts`)

```typescript
// Register Merchant
export function useRegisterMerchant() {
  const { writeContract } = useWriteContract()
  
  return useMutation({
    mutationFn: async ({ businessName, category }) => {
      return writeContract({
        address: MERCHANT_PORTAL_ADDRESS,
        abi: MerchantPortalABI,
        functionName: 'registerMerchant',
        args: [businessName, category]
      })
    }
  })
}

// Process Payment
export function useProcessPayment() {
  const { writeContract } = useWriteContract()
  
  return useMutation({
    mutationFn: async ({ merchant, amount, description, useEscrow }) => {
      return writeContract({
        address: MERCHANT_PORTAL_ADDRESS,
        abi: MerchantPortalABI,
        functionName: 'processPayment',
        args: [merchant, amount, description, useEscrow]
      })
    }
  })
}

// Get Merchant Stats
export function useMerchantStats(merchant: Address) {
  return useReadContract({
    address: MERCHANT_PORTAL_ADDRESS,
    abi: MerchantPortalABI,
    functionName: 'getMerchantStats',
    args: [merchant],
    enabled: !!merchant
  })
}
```

### DAO Hooks (`/hooks/useDAOHooks.ts`)

```typescript
// Get Voting Power
export function useVotingPower(address: Address) {
  return useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'getVotingPower',
    args: [address],
    enabled: !!address
  })
}

// Create Proposal
export function usePropose() {
  const { writeContract } = useWriteContract()
  
  return useMutation({
    mutationFn: async ({ proposalType, title, description }) => {
      return writeContract({
        address: DAO_ADDRESS,
        abi: DAOABI,
        functionName: 'propose',
        args: [proposalType, title, description]
      })
    }
  })
}

// Cast Vote
export function useCastVote(proposalId: number) {
  const { writeContract } = useWriteContract()
  
  return useMutation({
    mutationFn: async ({ support }) => {
      return writeContract({
        address: DAO_ADDRESS,
        abi: DAOABI,
        functionName: 'castVote',
        args: [proposalId, support]
      })
    }
  })
}
```

---

## State Management

### 1. Wallet State (Wagmi)
```typescript
// hooks/useWallet.ts
import { useAccount, useBalance } from 'wagmi'

export function useWallet() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  
  return {
    address,
    isConnected,
    balance: balance?.value,
    formatted: balance?.formatted
  }
}
```

### 2. Theme State (Zustand)
```typescript
// stores/theme.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      }))
    }),
    { name: 'vfide-theme' }
  )
)
```

### 3. Notification State
```typescript
// stores/notifications.ts
import { create } from 'zustand'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timestamp: number
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [
      ...state.notifications,
      {
        ...notification,
        id: Math.random().toString(36),
        timestamp: Date.now()
      }
    ]
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  clearAll: () => set({ notifications: [] })
}))
```

---

## Real-Time Features

### WebSocket Integration
```typescript
// lib/websocket.ts
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function initWebSocket() {
  if (socket) return socket
  
  socket = io(process.env.NEXT_PUBLIC_WS_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  })
  
  socket.on('connect', () => {
    console.log('WebSocket connected')
  })
  
  socket.on('disconnect', () => {
    console.log('WebSocket disconnected')
  })
  
  return socket
}

export function useWebSocket(event: string, handler: (data: any) => void) {
  useEffect(() => {
    const ws = initWebSocket()
    ws.on(event, handler)
    
    return () => {
      ws.off(event, handler)
    }
  }, [event, handler])
}
```

### Real-Time Balance Updates
```typescript
function BalanceCard() {
  const { address } = useAccount()
  const [balance, setBalance] = useState<bigint>(0n)
  
  // Initial fetch
  const { data: initialBalance } = useBalance({ address })
  
  // WebSocket updates
  useWebSocket('balance:update', (data) => {
    if (data.address === address) {
      setBalance(BigInt(data.balance))
    }
  })
  
  useEffect(() => {
    if (initialBalance) {
      setBalance(initialBalance.value)
    }
  }, [initialBalance])
  
  return (
    <Card>
      <div className="text-3xl font-bold">
        {formatEther(balance)} VFIDE
      </div>
    </Card>
  )
}
```

---

## UI/UX Features

### 1. Loading States
```typescript
function LoadingButton({ loading, children, onClick }) {
  return (
    <Button disabled={loading} onClick={onClick}>
      {loading && <Spinner className="mr-2" />}
      {loading ? 'Processing...' : children}
    </Button>
  )
}
```

### 2. Toast Notifications
```typescript
import { toast } from 'sonner'

// Success
toast.success('Transaction confirmed!', {
  description: 'Your VFIDE transfer was successful',
  action: {
    label: 'View',
    onClick: () => router.push('/transactions')
  }
})

// Error
toast.error('Transaction failed', {
  description: error.message
})

// Loading
const toastId = toast.loading('Processing transaction...')
// Later:
toast.success('Complete!', { id: toastId })
```

### 3. Skeleton Loading
```typescript
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}
```

### 4. Error Boundaries
```typescript
'use client'

export default function ErrorBoundary({ 
  error, 
  reset 
}: { 
  error: Error
  reset: () => void 
}) {
  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

### 5. Responsive Design
```typescript
// Tailwind Breakpoints
sm: '640px'   // Mobile
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large Desktop

// Usage
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  gap-4
">
  {/* Cards */}
</div>
```

---

## Performance Optimization

### 1. Code Splitting
```typescript
// Dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

### 2. Memoization
```typescript
import { useMemo, useCallback } from 'react'

function ExpensiveComponent({ data }) {
  // Memoize expensive calculation
  const processedData = useMemo(() => {
    return data.map(item => /* expensive operation */)
  }, [data])
  
  // Memoize callback
  const handleClick = useCallback(() => {
    /* handler logic */
  }, [/* dependencies */])
  
  return <div>{/* render */}</div>
}
```

### 3. React Query Caching
```typescript
// Automatic caching and revalidation
const { data, isLoading } = useQuery({
  queryKey: ['balance', address],
  queryFn: () => fetchBalance(address),
  staleTime: 30000, // 30 seconds
  cacheTime: 300000, // 5 minutes
  refetchOnWindowFocus: true
})
```

---

**END OF PART 2 - FRONTEND APPLICATION**

**Next:** Part 3 - Architecture & Infrastructure  
**Total Parts:** 4  
**Document Status:** Complete and Downloadable
