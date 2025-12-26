# VFIDE Architecture

## System Overview

VFIDE is a trust-based payment protocol built as a multi-chain solution on Base, Polygon, and zkSync, featuring vault-only custody, on-chain reputation (ProofScore), and zero-fee merchant payments.

## Core Components

### 1. VFIDEToken (Core Asset)
- **Purpose:** ERC20 token with vault-only transfer enforcement
- **Supply:** 200M max, 50M dev reserve, 75M presale cap
- **Transfers:** Only between vaults (not direct wallet-to-wallet)
- **Fees:** 0.25%-5% on transfers (NOT on payments), ProofScore-adjusted
- **File:** `contracts/VFIDEToken.sol` (466 lines)

### 2. VaultInfrastructure (Custody Layer)
- **Purpose:** Non-custodial smart contract vaults for users
- **Features:** Guardian recovery (2-of-3), time-locked transfers, emergency freeze
- **Benefits:** Prevents lost funds, enables recovery, family/business accounts
- **File:** `contracts/VaultInfrastructure.sol` (486 lines)

### 3. VFIDETrust (Reputation System)
- **Purpose:** On-chain credit score (0-10000, 10x precision) affecting fees and privileges
- **Components:** 6 factors - capital, behavior, social, credentials, activity, fixed
- **Mechanics:** Endorsements, decay, fatigue, anti-gaming measures
- **File:** `contracts/VFIDETrust.sol` (631 lines)

### 4. MerchantPortal (Commerce Layer)
- **Purpose:** Payment processing with 0% merchant fees
- **Features:** Merchant registry, payment escrow, dispute resolution, rebates
- **Protocol Fee:** 0% (verified in code)
- **File:** `contracts/MerchantPortal.sol` (562 lines)

### 5. ProofScoreBurnRouter (Fee Engine)
- **Purpose:** Dynamic fee calculation and token burning
- **Base Fees:** 2% burn, 0.5% sanctum, 0.5% ecosystem
- **Adjustments:** -0.5% high trust (≥8000), +1.5% low trust (≤4000)
- **Charity Split:** 67% sanctum, 17% ecosystem, 17% fixed causes
- **File:** `contracts/ProofScoreBurnRouter.sol` (202 lines)

### 6. DAO (Governance)
- **Purpose:** Score-weighted community governance
- **Voting Power:** tokens × ProofScore / 1000
- **Proposal Types:** Generic, Financial, Protocol, Security
- **Protections:** Timelock (3 days), quorum, fatigue system
- **File:** `contracts/DAO.sol` (187 lines)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Layer                           │
│  (Wallets connect to vaults, not direct token holding) │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              VaultInfrastructure                        │
│  • Vault creation/management                           │
│  • Guardian recovery (2-of-3)                          │
│  • Emergency controls                                  │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                 VFIDEToken                              │
│  • ERC20 with vault-only transfers                     │
│  • ProofScore-aware fee routing                        │
│  • Circuit breaker & policy lock                       │
└────┬────────────┴───────────────┬────────────────────┬──┘
     │                            │                    │
     ▼                            ▼                    ▼
┌─────────────┐      ┌────────────────────┐    ┌──────────────┐
│MerchantPortal│     │VFIDETrust          │    │SecurityHub   │
│• 0% fees     │◄────│• ProofScore (0-1000│    │• Cross-contract│
│• Payments    │     │• 6 components      │    │  security    │
│• Escrow      │     │• Endorsements      │    │• Alerts      │
└─────┬────────┘     └────────────────────┘    └──────────────┘
      │                       │
      ▼                       ▼
┌─────────────────────────────────────────┐
│      ProofScoreBurnRouter               │
│  • Dynamic fees (0.25%-5%)              │
│  • Fee split (40% burn/10% sanctum/50% eco) │
│  • Deflationary mechanism               │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│              DAO Governance             │
│  • Score-weighted voting                │
│  • Timelock protection                  │
│  • Parameter adjustments                │
└─────────────────────────────────────────┘
```

## Key Design Decisions

### Vault-Only Custody
**Why:** Users never hold tokens directly, only through smart contract vaults.

**Benefits:**
- Recovery if keys lost (via guardians)
- Prevents accidental burns/transfers to wrong address
- Enables family/business shared accounts
- Multi-sig capability at vault level

**Trade-offs:**
- Higher gas costs (~50-100k per operation)
- More complex UX (vault creation step)
- Requires guardian trust

### ProofScore Reputation
**Why:** On-chain credit score determines fees and privileges.

**Benefits:**
- Sybil resistance (capital requirements)
- Rewards long-term good actors
- Reduces fees for trusted users
- Enables uncollateralized features

**Trade-offs:**
- Complex calculation (more gas)
- Requires initial bootstrap period
- Gaming vectors exist (though mitigated)

### Zero Merchant Fees
**Why:** Merchants pay 0%, customers pay 0% for payments.

**Benefits:**
- Competitive vs Stripe (2.9%) and Coinbase (1%)
- Attracts merchants to platform
- Customer-friendly experience

**How it works:**
- Token transfers have 0.25%-5% fees (ProofScore-based)
- Payments use vault-to-vault transfers (0% protocol fee)
- Platform funded by transfer fees, not payment fees

## Contract Dependencies

```
VFIDEToken (core)
    ├─ depends on: VFIDETrust (ProofScore lookups)
    ├─ depends on: ProofScoreBurnRouter (fee routing)
    ├─ depends on: SecurityHub (security checks)
    └─ depends on: DAO (governance)

VaultInfrastructure
    ├─ depends on: VFIDEToken (vault balances)
    └─ depends on: VFIDETrust (vault scoring)

MerchantPortal
    ├─ depends on: VFIDEToken (payments)
    ├─ depends on: VFIDETrust (merchant scoring)
    └─ depends on: VaultInfrastructure (vault verification)

ProofScoreBurnRouter
    ├─ depends on: VFIDETrust (score lookups)
    └─ called by: VFIDEToken (fee routing)

VFIDETrust
    ├─ stores: ProofScore data
    └─ called by: All contracts (score lookups)

DAO
    ├─ depends on: VFIDEToken (voting power)
    ├─ depends on: VFIDETrust (score weighting)
    └─ controls: All contracts (governance)
```

## Security Model

### Access Control
- **DAO:** Controls all parameter changes, emergency actions
- **Timelock:** 3-day minimum for governance changes
- **Circuit Breaker:** Emergency stop for critical issues
- **Policy Lock:** Prevents changes after audit

### Emergency Procedures
1. **Circuit Breaker Activation:** DAO votes, timelock, halt all transfers
2. **Guardian Recovery:** 2-of-3 guardians approve vault recovery
3. **Pause Mechanism:** Individual contracts can be paused
4. **Emergency Withdrawal:** Last resort if contract compromised

### Upgrade Strategy
- Contracts use proxy pattern where needed
- Critical contracts (token, vault) are non-upgradeable
- Governance contracts can be upgraded via DAO vote
- All upgrades require timelock delay

## Gas Optimization

### Current Gas Costs (estimated)
- Vault creation: ~500k gas
- Vault-to-vault transfer: ~150k gas
- Payment processing: ~200k gas
- ProofScore lookup: ~10-20k gas
- Fee calculation: ~30-40k gas

### Optimization Opportunities
1. **Cache ProofScore:** Avoid repeated storage reads
2. **Pack structs:** Reduce storage slots
3. **Batch operations:** Process multiple actions in one tx
4. **Use unchecked:** Safe arithmetic without overflow checks

## Testing Strategy

### Test Coverage (700+ files)
- Unit tests: Individual function testing
- Integration tests: Multi-contract interactions
- Boundary tests: Edge cases (0, 1, max values)
- Security tests: Reentrancy, access control, overflows
- Fuzzing: Property-based testing (echidna, medusa, foundry)
- Gas tests: Efficiency monitoring

### Test Organization
```
test/
├── token/          (25 batches)
├── burnrouter/     (20 batches)
├── dao/            (25 batches)
├── escrow/         (25 batches)
├── security/       (25 batches)
├── boundaries/     (40+ batches)
├── merchant/       (lifecycle tests)
├── concurrent/     (parallel operations)
└── gas/            (efficiency tests)
```

## Deployment Process

### Phase 1: TestNet (1 week)
1. Deploy to Base Sepolia testnet ✅
2. Verify all contracts
3. Test with community
4. Gather feedback
5. Fix any issues

### Phase 2: External Audit (2-4 weeks)
1. Prepare audit package
2. Professional audit firm
3. Fix critical/high issues
4. Re-audit if needed
5. Publish audit report

### Phase 3: Mainnet Launch (1 week)
1. Deploy to Base mainnet
2. Initialize parameters
3. Transfer ownership to DAO
4. Activate circuit breaker
5. Gradual rollout

### Phase 4: Post-Launch (Ongoing)
1. Monitor for issues
2. Bug bounty program
3. Community governance
4. Parameter adjustments
5. Feature additions

## Future Enhancements

### Planned Features
- Subscription payments
- Recurring billing
- Multi-currency support
- Cross-chain bridges
- Mobile SDKs
- Merchant APIs

### Research Areas
- Quadratic voting in DAO
- Zero-knowledge ProofScore
- Layer 3 scaling
- Account abstraction integration
- AI-powered fraud detection

## References

- **Contracts:** `contracts/` directory
- **Tests:** `test/` directory (700+ files)
- **Economics:** See `ECONOMICS.md`
- **Security:** See `SECURITY.md`
- **Deployment:** See `DEPLOYMENT.md`
