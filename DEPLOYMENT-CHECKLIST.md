# 🚀 VFIDE Deployment Checklist

**Version:** 1.0  
**Date:** January 2, 2026  
**Network:** Base Mainnet (Primary), Polygon, zkSync

---

## Pre-Deployment Verification

### ✅ Smart Contract Checklist

#### Core Contracts
- [ ] **VFIDEToken** compiled without errors
- [ ] **VaultInfrastructure (VaultHub)** compiled
- [ ] **DAO** compiled
- [ ] **DAOTimelock** compiled
- [ ] **Seer (ProofLedger)** compiled
- [ ] **VFIDEPresale** compiled
- [ ] **PayrollManager** compiled
- [ ] **BadgeRegistry** compiled
- [ ] **CouncilElection** compiled

#### Contract Verification
- [ ] All contracts pass `forge test --match-contract` tests
- [ ] Slither audit shows no CRITICAL or HIGH issues
- [ ] Foundry coverage >= 90% for core contracts
- [ ] No `TODO` or `FIXME` comments in production code
- [ ] All compiler warnings resolved

#### Security Measures
- [ ] Access control modifiers verified (onlyAdmin, onlyOwner)
- [ ] Reentrancy guards on all external functions with state changes
- [ ] Integer overflow protection (Solidity 0.8.x checked math)
- [ ] No floating pragma (use exact version: `0.8.30`)
- [ ] Events emitted for all state changes
- [ ] Emergency pause mechanisms tested

---

## Environment Setup

### Contract Deployment Variables
Create `.env` file with:

```bash
# Network Configuration
PRIVATE_KEY=0x...                    # Deployer wallet (KEEP SECRET)
RPC_URL_BASE=https://...             # Base RPC endpoint
RPC_URL_POLYGON=https://...          # Polygon RPC endpoint  
RPC_URL_ZKSYNC=https://...           # zkSync RPC endpoint

# Verification
BASESCAN_API_KEY=...                 # For contract verification
POLYGONSCAN_API_KEY=...              # For Polygon verification
ETHERSCAN_API_KEY=...                # Fallback

# Frontend Configuration
NEXT_PUBLIC_ALCHEMY_ID=...           # Alchemy API key
NEXT_PUBLIC_WALLETCONNECT_ID=...    # WalletConnect project ID
NEXT_PUBLIC_ENABLE_TESTNETS=false   # Disable for production

# Contract Addresses (filled after deployment)
NEXT_PUBLIC_DAO_ADDRESS=0x...
NEXT_PUBLIC_TIMELOCK_ADDRESS=0x...
NEXT_PUBLIC_SEER_ADDRESS=0x...
NEXT_PUBLIC_VAULT_HUB_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_PRESALE_ADDRESS=0x...
```

### Deployment Wallet
- [ ] Deployer wallet has sufficient native tokens for gas
  - Base: >= 0.5 ETH
  - Polygon: >= 50 MATIC
  - zkSync: >= 0.1 ETH
- [ ] Deployer wallet is secured with hardware wallet
- [ ] Multi-sig setup ready for ownership transfer after deployment

---

## Deployment Steps

### Step 1: Deploy Smart Contracts

#### A. Deploy to Base (Primary Network)
```bash
# Test on Base Sepolia first
forge script script/Deploy.s.sol:DeployVfide \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --broadcast \
  --verify \
  --private-key $PRIVATE_KEY

# After testing, deploy to Base Mainnet
forge script script/Deploy.s.sol:DeployVfide \
  --rpc-url $RPC_URL_BASE \
  --broadcast \
  --verify \
  --private-key $PRIVATE_KEY \
  --slow # Use slow mode for mainnet
```

**Record Addresses:**
- [ ] VFIDEToken: `0x...`
- [ ] VaultHub: `0x...`
- [ ] DAO: `0x...`
- [ ] DAOTimelock: `0x...`
- [ ] Seer: `0x...`
- [ ] Presale: `0x...`

#### B. Verify Contract Code on Basescan
```bash
forge verify-contract <ADDRESS> <CONTRACT_NAME> \
  --chain base \
  --etherscan-api-key $BASESCAN_API_KEY
```

- [ ] All contracts verified with green checkmark
- [ ] Contract source matches deployed bytecode

#### C. (Optional) Deploy to Polygon & zkSync
Repeat steps A & B for additional networks.

---

### Step 2: Initialize Contracts

#### Set Up DAO Parameters
```bash
# Set voting parameters
cast send $DAO_ADDRESS "setParams(uint64,uint256)" \
  604800 5000 \  # 7 days, 5000 quorum
  --rpc-url $RPC_URL_BASE \
  --private-key $PRIVATE_KEY
```

- [ ] Voting period set (default: 7 days)
- [ ] Quorum set (default: 5,000)
- [ ] Timelock delay set (default: 48 hours)
- [ ] Min ProofScore for governance (default: 540)

#### Set Up Presale
```bash
# Set presale parameters
cast send $PRESALE_ADDRESS "setParams(uint256,uint256,uint256)" \
  <FOUNDING_PRICE> <OATH_PRICE> <PUBLIC_PRICE> \
  --rpc-url $RPC_URL_BASE \
  --private-key $PRIVATE_KEY
```

- [ ] Tier prices set ($0.03, $0.05, $0.07)
- [ ] Max purchase limits configured (500K VFIDE)
- [ ] Lock periods configured (180d, 90d, optional)
- [ ] Presale start/end times set

#### Link Contract Modules
```bash
# Link DAO to Timelock
cast send $DAO_ADDRESS "setModules(address,address,address,address)" \
  $TIMELOCK_ADDRESS $SEER_ADDRESS $VAULT_HUB_ADDRESS $HOOKS_ADDRESS \
  --rpc-url $RPC_URL_BASE \
  --private-key $PRIVATE_KEY
```

- [ ] DAO → Timelock linked
- [ ] DAO → Seer linked
- [ ] DAO → VaultHub linked
- [ ] Timelock → DAO admin set

---

### Step 3: Deploy Frontend

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Set environment variables in Vercel dashboard
# Then deploy
vercel --prod
```

**Environment Variables (Vercel Dashboard):**
- [ ] `NEXT_PUBLIC_ALCHEMY_ID`
- [ ] `NEXT_PUBLIC_WALLETCONNECT_ID`
- [ ] `NEXT_PUBLIC_DAO_ADDRESS`
- [ ] `NEXT_PUBLIC_TIMELOCK_ADDRESS`
- [ ] `NEXT_PUBLIC_SEER_ADDRESS`
- [ ] `NEXT_PUBLIC_VAULT_HUB_ADDRESS`
- [ ] `NEXT_PUBLIC_TOKEN_ADDRESS`
- [ ] `NEXT_PUBLIC_PRESALE_ADDRESS`
- [ ] `NEXT_PUBLIC_CHAIN_ID=8453` (Base mainnet)

#### Frontend Verification
- [ ] Homepage loads without errors
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Contract addresses match deployed contracts
- [ ] All pages render correctly:
  - [ ] `/` (Home)
  - [ ] `/vault` (Vault management)
  - [ ] `/badges` (Badge collection)
  - [ ] `/leaderboard` (Rankings)
  - [ ] `/governance` (DAO)
  - [ ] `/payroll` (Salary streaming)
  - [ ] `/presale` (Token sale)

---

## Post-Deployment Testing

### Contract Interaction Tests

#### Test 1: Vault Creation
```bash
# User creates vault
cast send $VAULT_HUB_ADDRESS "createVault()" \
  --rpc-url $RPC_URL_BASE \
  --private-key $USER_PRIVATE_KEY
```
- [ ] Vault created successfully
- [ ] User's vault address returned
- [ ] Initial ProofScore = 500

#### Test 2: Token Purchase (Presale)
```bash
# User purchases tokens
cast send $PRESALE_ADDRESS "purchase(uint8,uint256)" \
  2 1000000000000000000000 \  # PUBLIC tier, 1000 VFIDE
  --value 70000000000000000 \  # 0.07 ETH
  --rpc-url $RPC_URL_BASE \
  --private-key $USER_PRIVATE_KEY
```
- [ ] Purchase succeeds
- [ ] Tokens credited to vault
- [ ] Lock period recorded (if applicable)

#### Test 3: Zero-Fee Payment
```bash
# User makes payment
cast send $VAULT_HUB_ADDRESS "transfer(address,uint256)" \
  <RECIPIENT_VAULT> 100000000000000000000 \  # 100 VFIDE
  --rpc-url $RPC_URL_BASE \
  --private-key $USER_PRIVATE_KEY
```
- [ ] Payment succeeds
- [ ] Zero fee charged
- [ ] Both parties' ProofScore increases

#### Test 4: DAO Proposal
```bash
# Create proposal
cast send $DAO_ADDRESS "propose(uint8,address,uint256,bytes,string)" \
  0 $TARGET 0 "0x" "Test proposal" \
  --rpc-url $RPC_URL_BASE \
  --private-key $USER_PRIVATE_KEY
```
- [ ] Proposal created
- [ ] Voting delay applied (1 day)
- [ ] Proposal ID returned

#### Test 5: Vote on Proposal
```bash
# Vote (after delay)
cast send $DAO_ADDRESS "vote(uint256,bool)" \
  1 true \  # Proposal #1, vote FOR
  --rpc-url $RPC_URL_BASE \
  --private-key $USER_PRIVATE_KEY
```
- [ ] Vote recorded
- [ ] Voting power calculated from ProofScore
- [ ] Governance fatigue applied

---

## Security Post-Deployment

### Ownership Transfer
```bash
# Transfer ownership to multi-sig
cast send $DAO_ADDRESS "setAdmin(address)" \
  $MULTISIG_ADDRESS \
  --rpc-url $RPC_URL_BASE \
  --private-key $DEPLOYER_PRIVATE_KEY
```

- [ ] DAO admin → Multi-sig
- [ ] Timelock admin → DAO contract
- [ ] Token ownership (if applicable) → DAO
- [ ] Deployer key rotated or destroyed

### Access Control Audit
- [ ] No single address has absolute control
- [ ] All admin functions protected by multi-sig
- [ ] Emergency functions require DAO approval
- [ ] Blacklist/whitelist functions audited

---

## Monitoring Setup

### On-Chain Monitoring
- [ ] **Tenderly** alerts configured:
  - High-value transactions (>$10K)
  - Failed transactions
  - Contract upgrades
  - Emergency pause triggers
  
- [ ] **OpenZeppelin Defender** monitoring:
  - Admin function calls
  - Timelock queue additions
  - Governance proposals

### Frontend Monitoring
- [ ] **Vercel Analytics** enabled
- [ ] **Sentry** error tracking configured
- [ ] **Google Analytics** (optional)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)

### Alerts
- [ ] Discord/Slack webhook for critical events
- [ ] Email alerts for contract admin actions
- [ ] SMS for emergency situations

---

## Documentation

### Public Documentation
- [ ] **User Guide** updated with mainnet addresses
- [ ] **API Documentation** published
- [ ] **Smart Contract Docs** (NatSpec) on docs site
- [ ] **FAQ** page created
- [ ] **Video tutorials** (optional)

### Internal Documentation
- [ ] Deployment runbook (this document)
- [ ] Incident response plan
- [ ] Contract upgrade procedures
- [ ] Key management procedures

---

## Marketing & Launch

### Pre-Launch (T-7 days)
- [ ] Announce launch date on social media
- [ ] Press release drafted
- [ ] Influencer partnerships confirmed
- [ ] Community AMAs scheduled

### Launch Day (T-0)
- [ ] Presale opens
- [ ] Tweet launch announcement
- [ ] Update website banner
- [ ] Discord announcement
- [ ] Submit to DeFi aggregators:
  - [ ] CoinGecko
  - [ ] CoinMarketCap
  - [ ] DeFi Llama
  - [ ] Dapp Radar

### Post-Launch (T+1 week)
- [ ] Monitor for bugs/exploits
- [ ] Collect user feedback
- [ ] Address critical issues immediately
- [ ] Publish 1-week metrics report

---

## Rollback Plan

### If Critical Bug Found

1. **Immediate Actions:**
   - [ ] Pause presale contract
   - [ ] Announce issue on all channels
   - [ ] Activate emergency multi-sig

2. **Investigation:**
   - [ ] Identify root cause
   - [ ] Assess impact (users/funds affected)
   - [ ] Develop fix

3. **Remediation:**
   - [ ] Deploy patched contracts
   - [ ] Migrate user data (if needed)
   - [ ] Compensate affected users

4. **Resume:**
   - [ ] Test fixes on testnet
   - [ ] Audit fixes
   - [ ] Relaunch with announcement

---

## Final Verification

### Pre-Launch Sign-Off

**Contract Team:**
- [ ] All contracts deployed and verified
- [ ] All tests passing
- [ ] Security audit complete

**Frontend Team:**
- [ ] All pages functional
- [ ] Mobile responsive
- [ ] Wallet integration working

**Operations Team:**
- [ ] Monitoring active
- [ ] Multi-sig configured
- [ ] Support channels ready

**Marketing Team:**
- [ ] Launch materials ready
- [ ] Community engaged
- [ ] Partners notified

---

## 🎉 LAUNCH AUTHORIZATION

**Authorized by:**
- [ ] CEO/Founder: _________________ Date: _______
- [ ] CTO: _________________ Date: _______
- [ ] Lead Developer: _________________ Date: _______
- [ ] Security Auditor: _________________ Date: _______

**Launch Status:** [ ] GO / [ ] NO-GO

**Launch Date/Time:** ___________________

**Network:** [ ] Base Mainnet [ ] Polygon [ ] zkSync

---

## Post-Launch Checklist (First 24 Hours)

- [ ] Monitor first 10 vault creations
- [ ] Monitor first 100 token purchases
- [ ] Monitor first DAO proposal
- [ ] Check gas costs are reasonable
- [ ] Verify zero fees are working
- [ ] Check ProofScore calculations
- [ ] Monitor error logs (Sentry)
- [ ] Response to user support tickets < 1 hour

---

**Document Version:** 1.0  
**Last Updated:** January 2, 2026  
**Next Review:** Post-launch +1 week
