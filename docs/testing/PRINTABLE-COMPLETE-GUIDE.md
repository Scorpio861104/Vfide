# VFIDE TESTNET TESTING GUIDE
## Complete Printable Version

---
---
---

# SECTION 1: TESTER ONBOARDING

## 🎯 What You'll Be Testing
VFIDE is a decentralized payment protocol. You'll help test buying tokens, making payments, and security features.

---

## 📋 STEP 1: Create a Wallet (5 minutes)

### Option A: MetaMask (Recommended)
1. Go to https://metamask.io/download/
2. Click "Install MetaMask for [your browser]"
3. Click "Create a new wallet"
4. Create a password (write it down!)
5. **IMPORTANT**: Write down your 12-word Secret Recovery Phrase on paper
6. Confirm the phrase by clicking words in order
7. Done! You now have a wallet

### Option B: Rabby Wallet
1. Go to https://rabby.io/
2. Click "Install"
3. Follow setup steps (similar to MetaMask)

---

## 📋 STEP 2: Add Sepolia Testnet (2 minutes)

### For MetaMask:
1. Click the network dropdown (top left, says "Ethereum Mainnet")
2. Click "Show test networks" toggle at bottom
3. If you don't see Sepolia:
   - Click "Add network"
   - Click "Add network manually"
   - Enter these details:

```
Network Name: Sepolia
RPC URL: https://ethereum-sepolia-rpc.publicnode.com
Chain ID: 11155111
Currency Symbol: ETH
Explorer: https://sepolia.etherscan.io
```

4. Select "Sepolia" from the network list

---

## 📋 STEP 3: Get Free Test ETH (5 minutes)

You need fake ETH to pay for gas. It's FREE!

### Faucet Options (try in order):

**1. Google Cloud Faucet (Easiest - 0.05 ETH)**
- Go to: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- Paste your wallet address
- Click "Request"

**2. Alchemy Faucet (0.5 ETH - requires free account)**
- Go to: https://sepoliafaucet.com/
- Sign up for free Alchemy account
- Paste your wallet address

**3. Infura Faucet (0.5 ETH)**
- Go to: https://www.infura.io/faucet/sepolia
- Create free account

### How to Find Your Wallet Address:
1. Open MetaMask
2. Click on your account name at top
3. Your address will be copied (starts with 0x...)

---

## 📋 STEP 4: Get Your Role Assignment

Contact the **Deployer** with:
1. Your wallet address: _________________________________
2. Your preferred role:

| Role | What You'll Do | Difficulty |
|------|----------------|------------|
| Presale Buyer | Buy tokens at different prices | Easy |
| Merchant | Accept payments, manage store | Medium |
| Guardian | Test security/emergency features | Medium |
| General User | Create vault, send tokens | Easy |

---

## ✅ Onboarding Checklist

☐ Wallet created  
☐ Sepolia network added  
☐ Got test ETH (balance > 0.01)  
☐ Got role assignment  
☐ Got contract addresses  
☐ Ready to test!  

---
---
---

# SECTION 2: CONTRACT ADDRESSES

## ⚠️ DEPLOYER: Fill in after deployment!

**Network:** Sepolia Testnet  
**Chain ID:** 11155111  
**Deployed By:** _________________________________  
**Deployed On:** _________________________________  

---

## 🔑 Core Contracts

### Token Contract (Add to MetaMask)
```
VFIDEToken: _________________________________
Symbol: VFIDE | Decimals: 18
```

### Presale Contract
```
VFIDEPresale: _________________________________
```

---

## 📋 All Contract Addresses

```
CORE:
  VFIDEToken:           _________________________________
  VFIDEPresale:         _________________________________
  StablecoinRegistry:   _________________________________

INFRASTRUCTURE:
  VaultInfrastructure:  _________________________________
  ProofLedger:          _________________________________
  Seer:                 _________________________________

GOVERNANCE:
  DAO:                  _________________________________
  DAOTimelock:          _________________________________

COMMERCE:
  MerchantRegistry:     _________________________________
  CommerceEscrow:       _________________________________

SECURITY:
  SecurityHub:          _________________________________
  GuardianRegistry:     _________________________________
  GuardianLock:         _________________________________
  PanicGuard:           _________________________________
  EmergencyBreaker:     _________________________________

VESTING:
  DevReserveVault:      _________________________________

TEST STABLECOINS:
  Mock USDC:            _________________________________
  Mock USDT:            _________________________________
```

---

## 👥 Team Addresses

| Role | Address | Name |
|------|---------|------|
| Deployer | _________________________________ | __________ |
| Treasury | _________________________________ | N/A |
| User 1 | _________________________________ | __________ |
| User 2 | _________________________________ | __________ |
| User 3 | _________________________________ | __________ |
| Merchant | _________________________________ | __________ |
| Guardian 1 | _________________________________ | __________ |
| Guardian 2 | _________________________________ | __________ |
| Guardian 3 | _________________________________ | __________ |

---
---
---

# SECTION 3: PRESALE BUYER TESTS

## ✅ Prerequisites
☐ Wallet set up  
☐ On Sepolia network  
☐ Have 0.02+ ETH  
☐ Have contract addresses  

---

## 🧪 TEST 1: Buy with ETH (No Lock)

**Steps:**
1. Open: https://sepolia.etherscan.io/address/[PRESALE_ADDRESS]#writeContract
2. Click "Connect to Web3"
3. Find: `buyWithETH`
4. Enter:
   - `lockPeriod`: `0`
   - `payableAmount`: `0.001`
5. Click "Write" → Confirm

**Expected:** Transaction succeeds

**Record:**
- TX Hash: _________________________________
- Result: ☐ Pass  ☐ Fail
- Notes: _________________________________

---

## 🧪 TEST 2: Buy with ETH (90-Day Lock)

**Steps:**
1. Find: `buyWithETH`
2. Enter:
   - `lockPeriod`: `7776000`
   - `payableAmount`: `0.001`
3. Write → Confirm

**Expected:** 50% bonus tokens

**Record:**
- TX Hash: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 3: Buy with ETH (180-Day Lock)

**Steps:**
1. `lockPeriod`: `15552000`
2. `payableAmount`: `0.001`

**Expected:** 100% bonus tokens

**Record:**
- TX Hash: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 4: Check Allocation

**Steps:**
1. Read Contract → `purchases`
2. Enter your address
3. Query

**Record:**
- Total tokens: _________________________________
- Locked tokens: _________________________________
- Lock ends: _________________________________

---

## 🧪 TEST 5: Referral Purchase

**Steps:**
1. Find: `buyWithETHReferral`
2. Enter:
   - `lockPeriod`: `0`
   - `referrer`: [FRIEND_ADDRESS]
   - `payableAmount`: `0.001`

**Record:**
- TX Hash: _________________________________
- Referrer: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 6: Claim Tokens

**Steps:**
1. (Wait for lock to expire or Deployer fast-forwards)
2. Find: `claim`
3. Write → Confirm

**Record:**
- TX Hash: _________________________________
- Tokens received: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 📊 Presale Test Summary

| Test | Status |
|------|--------|
| 1. Buy ETH (no lock) | ☐ |
| 2. Buy ETH (90-day) | ☐ |
| 3. Buy ETH (180-day) | ☐ |
| 4. Check allocation | ☐ |
| 5. Referral | ☐ |
| 6. Claim | ☐ |

---
---
---

# SECTION 4: GENERAL USER TESTS

## ✅ Prerequisites
☐ Wallet set up  
☐ On Sepolia network  
☐ Have 0.02+ ETH  
☐ Have some VFIDE tokens  

---

## 🧪 TEST 1: Check Trust Score

**Steps:**
1. Open: https://sepolia.etherscan.io/address/[SEER_ADDRESS]#readContract
2. Find: `getScore`
3. Enter your address
4. Query

**Your Score:** _______________ (5000 = neutral)

---

## 🧪 TEST 2: Create Vault

**Steps:**
1. Open: [VAULT_HUB]#writeContract
2. Find: `createVault`
3. Write → Confirm

**Find Vault:**
1. Read → `vaultOf` → your address

**Your Vault:** _________________________________

**Record:**
- TX Hash: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 3: Deposit to Vault

**Step A: Approve**
1. VFIDEToken → Write → `approve`
   - `spender`: [VAULT_HUB_ADDRESS]
   - `amount`: `100000000000000000000`

**Step B: Deposit**
1. VaultHub → Write → `depositToVault`
   - `amount`: `50000000000000000000`

**Record:**
- TX Hash: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 4: Send Tokens

**Steps:**
1. VFIDEToken → Write → `transfer`
   - `to`: [OTHER_TESTER]
   - `amount`: `10000000000000000000`

**Record:**
- TX Hash: _________________________________
- Sent to: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 5: Withdraw from Vault

**Steps:**
1. VaultHub → Write → `withdrawFromVault`
   - `amount`: [YOUR_VAULT_BALANCE]

**Record:**
- TX Hash: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 📊 General User Summary

| Test | Status |
|------|--------|
| 1. Check score | ☐ |
| 2. Create vault | ☐ |
| 3. Deposit | ☐ |
| 4. Send tokens | ☐ |
| 5. Withdraw | ☐ |

---
---
---

# SECTION 5: MERCHANT TESTS

## ✅ Prerequisites
☐ Have 0.03+ ETH  
☐ Have VFIDE tokens  
☐ Have vault created  
☐ ProofScore 600+  

---

## 🧪 TEST 1: Register as Merchant

**Steps:**
1. Open: [MERCHANT_REGISTRY]#writeContract
2. Find: `addMerchant`
3. Enter:
   - `metadata`: `0x0000000000000000000000000000000000000000000000000000000000000001`
4. Write → Confirm

**Verify:**
- Read → `isMerchant` → your address = true

**Record:**
- TX Hash: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 2: Receive Payment

**Tell Buyer:**
- Your address: _________________________________
- Payment: 100 VFIDE

**Buyer does:**
1. Approve tokens for escrow
2. `createPayment` with your address

**Record:**
- Buyer TX: _________________________________
- Order ID: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 3: Confirm Delivery

**Steps:**
1. CommerceEscrow → Write → `confirmDelivery`
   - `orderId`: [FROM_TEST_2]
2. Confirm

**Check:** Your vault balance increased

**Record:**
- TX Hash: _________________________________
- Received: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 📊 Merchant Summary

| Test | Status |
|------|--------|
| 1. Register | ☐ |
| 2. Receive payment | ☐ |
| 3. Confirm delivery | ☐ |

---
---
---

# SECTION 6: GUARDIAN TESTS

## ⚠️ REQUIRES 3 GUARDIANS COORDINATING

## 👥 Guardian Team

| # | Address | Name |
|---|---------|------|
| 1 | _________________________________ | __________ |
| 2 | _________________________________ | __________ |
| 3 | _________________________________ | __________ |

---

## 🧪 TEST 1: Approve & Register

**Step A: Approve**
1. VFIDEToken → `approve`
   - `spender`: [GUARDIAN_LOCK]
   - `amount`: `10000000000000000000000`

**Step B: Register**
1. GuardianRegistry → `register`
   - `stake`: `1000000000000000000000`

**Verify:** `isGuardian` = true

**Record:**
- TX Hash: _________________________________
- Result: ☐ Pass  ☐ Fail

---

## 🧪 TEST 2: Multi-Guardian Panic Test

**⚠️ ALL 3 GUARDIANS DO THIS TOGETHER**

**Guardian 1:**
1. PanicGuard → `triggerPanic`
2. Confirm
3. Tell Guardian 2

**Guardian 2:**
1. Same: `triggerPanic`
2. Confirm
3. Should activate panic (2/3)

**Guardian 3:**
1. Verify: `isPanicActive` = true

**Record:**
- G1 TX: _________________________________
- G2 TX: _________________________________
- Panic Active: ☐ Yes  ☐ No

---

## 🧪 TEST 3: Exit Guardian Role

**Steps:**
1. GuardianRegistry → `unregister`
2. Confirm
3. Tokens returned

**Record:**
- TX Hash: _________________________________
- Tokens returned: ☐ Yes  ☐ No

---

## 📊 Guardian Summary

| Test | Status |
|------|--------|
| 1. Register | ☐ |
| 2. Multi-panic | ☐ |
| 3. Exit | ☐ |

---
---
---

# SECTION 7: BUG REPORT TEMPLATE

**Tester Name:** _________________________________

**Role:** ☐ Buyer  ☐ Merchant  ☐ Guardian  ☐ User

**Test Failed:** _________________________________

**Transaction Hash:** _________________________________

**Error Message:**
```


```

**Expected Behavior:**


**Actual Behavior:**


**Severity:**
☐ 🔴 Critical (funds at risk)
☐ 🟠 High (feature broken)
☐ 🟡 Medium (works with issues)
☐ 🟢 Low (cosmetic)

**Screenshot Attached:** ☐ Yes  ☐ No

---
---
---

# QUICK REFERENCE CARD

## Key Addresses (Fill in)
```
Token:    _________________________________
Presale:  _________________________________
VaultHub: _________________________________
Escrow:   _________________________________
Seer:     _________________________________
```

## Common Values
```
100 tokens = 100000000000000000000
50 tokens  = 50000000000000000000
10 tokens  = 10000000000000000000
1 token    = 1000000000000000000

90 days  = 7776000 seconds
180 days = 15552000 seconds
```

## Faucets
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- https://sepoliafaucet.com/

## Block Explorer
- https://sepolia.etherscan.io

---
---
---

# SECTION 7: FRONTEND TESTING

## 🖥️ Using the Web Interface

Instead of Etherscan, you can use our web frontend to test everything with a nice UI!

### Get the URL

**Ask the Deployer for the frontend URL:**

Frontend URL: ________________________________

Options:
- Local: `http://192.168.x.x:3000`
- Tunnel: `https://xxxxx.ngrok.io`
- Deployed: `https://vfide.vercel.app`

---

### Connect Your Wallet

1. Open the frontend URL in your browser
2. Click **"Connect Wallet"** (top right)
3. Select MetaMask
4. **Make sure you're on Sepolia network**
5. Approve the connection

---

### Pages to Test

| Page | URL | What to Test |
|------|-----|--------------|
| **Home** | `/` | Overview, connect wallet |
| **Token Launch** | `/token-launch` | Buy presale tokens |
| **Vault** | `/vault` | Create vault, deposit/withdraw |
| **Merchant** | `/merchant` | Register as merchant |
| **Pay** | `/pay` | Make payments |
| **Dashboard** | `/dashboard` | View balances, score |
| **Governance** | `/governance` | DAO proposals |
| **Guardians** | `/guardians` | Security features |

---

### Frontend Test Checklist

**Wallet Connection:**
☐ Connect MetaMask works  
☐ Shows correct network (Sepolia)  
☐ Shows your wallet address  
☐ Disconnect works  

**Token Launch Page (`/token-launch`):**
☐ Shows 3 tiers ($0.03, $0.05, $0.07)  
☐ Shows availability per tier  
☐ Can select lock period  
☐ Buy button submits transaction  
☐ Balance updates after purchase  

**Vault Page (`/vault`):**
☐ Create vault button works  
☐ Shows vault address  
☐ Deposit tokens works  
☐ Shows vault balance  
☐ Withdraw works  

**Dashboard (`/dashboard`):**
☐ Shows token balance  
☐ Shows ProofScore  
☐ Shows trust tier  

**Merchant Page (`/merchant`):**
☐ Register button works  
☐ Shows merchant status  

**Pay Page (`/pay`):**
☐ Can enter merchant address  
☐ Can enter amount  
☐ Shows fee preview  
☐ Payment succeeds  

---

### Common Frontend Issues

**"Wrong Network"**
→ Switch MetaMask to Sepolia

**"Transaction Failed"**
→ Check you have Sepolia ETH for gas

**Page shows "0x0000..."**
→ Contracts not deployed yet - ask Deployer

**"Cannot read property of undefined"**
→ Check console (F12) for errors, report to Deployer

**Wallet won't connect**
→ Refresh page, reconnect MetaMask, clear cache

---

### For Deployer: Frontend Setup

```bash
# 1. Deploy contracts first
# 2. Configure frontend
cd frontend
cp .env.testnet.example .env.local
# Edit .env.local with deployed addresses

# 3. Run frontend
npm install
npm run dev

# 4. Share with testers via ngrok
ngrok http 3000
```

---

**END OF DOCUMENT**
