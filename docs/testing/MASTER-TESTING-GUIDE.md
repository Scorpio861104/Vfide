# VFIDE Master Testing Guide

## 🚀 Quick Start for Deployer

### Step 1: Deploy to Testnet

```bash
# Set your private key (with 0x prefix)
export PRIVATE_KEY=0x_your_private_key_here_

# Deploy to Sepolia
cd /workspaces/Vfide
forge script script/Deploy.s.sol:DeployVfide \
  --fork-url https://ethereum-sepolia-rpc.publicnode.com \
  --broadcast \
  -vvv
```

### Step 2: Save Contract Addresses

Copy all deployed addresses to:
- [docs/testing/CONTRACT-ADDRESSES.md](./CONTRACT-ADDRESSES.md)
- [script/testnet/TestnetConfig.sol](../../script/testnet/TestnetConfig.sol)

### Step 3: Fund Test Accounts

Send test USDC/tokens to testers as needed.

### Step 4: Share with Team

Send testers:
1. Link to [TESTER-ONBOARDING.md](./TESTER-ONBOARDING.md)
2. Link to [CONTRACT-ADDRESSES.md](./CONTRACT-ADDRESSES.md)
3. Their assigned role

---

## 👥 Recommended Team Setup

| Role | People | Difficulty | Docs |
|------|--------|------------|------|
| Deployer | 1 | Expert | This file |
| Presale Buyer | 2-3 | Easy | [ROLE-PRESALE-BUYER.md](./ROLE-PRESALE-BUYER.md) |
| General User | 2-3 | Easy | [ROLE-GENERAL-USER.md](./ROLE-GENERAL-USER.md) |
| Merchant | 1-2 | Medium | [ROLE-MERCHANT.md](./ROLE-MERCHANT.md) |
| Guardian | 3 | Medium | [ROLE-GUARDIAN.md](./ROLE-GUARDIAN.md) |

**Minimum team:** 4 people (1 deployer, 1 buyer, 1 merchant, 1 general)  
**Recommended:** 8-10 people  
**Maximum:** Unlimited buyers/general users

---

## 💰 Funding Requirements

| Wallet | ETH Needed | Purpose |
|--------|------------|---------|
| Deployer | 0.05 | Deploy contracts |
| Treasury | 0 | Receives funds |
| Per Buyer | 0.02 | Gas for presale |
| Per Merchant | 0.03 | More transactions |
| Per Guardian | 0.05 | Staking + voting |
| Per General | 0.02 | Basic tests |

**Get free Sepolia ETH:**
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia

---

## 📋 Testing Order

### Phase 1: Setup (Day 1)
1. ✅ Deployer deploys all contracts
2. ✅ Deployer updates CONTRACT-ADDRESSES.md
3. ✅ All testers complete onboarding
4. ✅ Deployer enables presale tier 0

### Phase 2: Presale Testing (Day 1-2)
1. ✅ Buyers test presale purchases
2. ✅ Test all 3 tiers ($0.03, $0.05, $0.07)
3. ✅ Test all lock periods (0, 90, 180 days)
4. ✅ Test referral system
5. ✅ Deployer fast-forwards time for claim testing
6. ✅ Buyers claim tokens

### Phase 3: Core Features (Day 2-3)
1. ✅ All users create vaults
2. ✅ Test deposits and withdrawals
3. ✅ Test token transfers
4. ✅ Merchants register
5. ✅ Test payment flows

### Phase 4: Commerce (Day 3-4)
1. ✅ Buyers pay merchants
2. ✅ Merchants confirm deliveries
3. ✅ Verify fee calculations
4. ✅ Test dispute flow

### Phase 5: Security (Day 4-5)
1. ✅ Guardians register and stake
2. ✅ Test multi-guardian voting
3. ✅ Test panic mode activation
4. ✅ Test emergency recovery
5. ✅ Guardians exit

### Phase 6: Cleanup
1. ✅ Collect all test results
2. ✅ Document bugs found
3. ✅ Verify all features work together

---

## 📊 Test Coverage Checklist

### Token Tests
- [ ] Buy with ETH
- [ ] Buy with stablecoin
- [ ] Buy with referral
- [ ] Claim tokens
- [ ] Transfer tokens
- [ ] Check balances

### Vault Tests
- [ ] Create vault
- [ ] Deposit tokens
- [ ] Withdraw tokens
- [ ] Check vault balance

### Commerce Tests
- [ ] Register merchant
- [ ] Create payment
- [ ] Confirm delivery
- [ ] Dispute payment
- [ ] Verify fees

### Trust Tests
- [ ] Check initial score
- [ ] Verify score changes with activity
- [ ] Endorse user (high score only)

### Guardian Tests
- [ ] Register guardian
- [ ] Stake tokens
- [ ] Vote on proposal
- [ ] Multi-sig panic (3 guardians)
- [ ] Exit guardian role

### Emergency Tests
- [ ] Trigger panic mode
- [ ] Verify system pauses
- [ ] Recovery process

---

## 🐛 Bug Tracking

When bugs are found:

1. **Create issue** with:
   - Role of tester
   - Test that failed
   - Transaction hash
   - Error message/screenshot
   - Expected vs actual behavior

2. **Severity levels:**
   - 🔴 Critical: Funds at risk, system broken
   - 🟠 High: Feature doesn't work
   - 🟡 Medium: Works but with issues
   - 🟢 Low: Minor/cosmetic

---

## 📁 Testing Files Index

```
docs/testing/
├── MASTER-TESTING-GUIDE.md    ← You are here
├── TESTER-ONBOARDING.md       ← Setup for all testers
├── CONTRACT-ADDRESSES.md      ← Deployed addresses
├── ROLE-PRESALE-BUYER.md      ← Presale tests
├── ROLE-MERCHANT.md           ← Merchant tests
├── ROLE-GUARDIAN.md           ← Guardian tests
└── ROLE-GENERAL-USER.md       ← Basic user tests
```

---

## ⏰ Suggested Timeline

| Day | Phase | Focus |
|-----|-------|-------|
| 1 | Setup | Deploy, onboard testers |
| 2 | Presale | All presale tests |
| 3 | Core | Vaults, transfers |
| 4 | Commerce | Payments, merchants |
| 5 | Security | Guardians, panic mode |
| 6 | Regression | Re-test any failures |
| 7 | Report | Compile results |

---

## ✅ Success Criteria

Testing is complete when:
- [ ] All role test scripts show ✅
- [ ] No 🔴 Critical bugs remain
- [ ] No 🟠 High bugs remain
- [ ] All testers can complete their flows
- [ ] Multi-person interactions work (buyer→merchant, guardian voting)
