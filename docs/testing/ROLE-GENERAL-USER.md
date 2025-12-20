# Role: General User - Test Script

## 🎯 Your Mission
Test basic user features: create vault, send/receive tokens, build trust score.

This is the easiest role - great for first-time testers!

---

## ✅ Prerequisites Checklist
- [ ] Wallet set up (see TESTER-ONBOARDING.md)
- [ ] On Sepolia network
- [ ] Have 0.02+ Sepolia ETH
- [ ] Have contract addresses (see CONTRACT-ADDRESSES.md)
- [ ] (Optional) Some VFIDE tokens from presale or Deployer

---

## 🧪 TEST 1: Check Your Trust Score

Every user starts with a neutral score.

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[SEER_ADDRESS]#readContract`
2. Find function: `getScore`
3. Enter your wallet address
4. Click "Query"

### Expected Result:
- ✅ Returns a number (likely 5000 = neutral)
- Score range: 0-10000

### Your Score:
- Score: _______________
- Tier: 
  - 8000+ = Elite
  - 7000+ = High Trust
  - 5000+ = Neutral
  - 3500+ = Low Trust
  - Below = Risky

---

## 🧪 TEST 2: Create Your Personal Vault

Your vault is a secure place to store tokens.

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[VAULT_HUB_ADDRESS]#writeContract`
2. Connect MetaMask
3. Find function: `createVault`
4. Click "Write"
5. Confirm in MetaMask
6. Wait for confirmation

### Find Your Vault Address:
1. Click "Read Contract" tab
2. Find: `vaultOf`
3. Enter your wallet address
4. Click "Query"
5. Save this address!

### Record:
- Transaction hash: _______________
- Your vault address: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 3: Get Some Tokens

### Option A: Buy from Presale
See [ROLE-PRESALE-BUYER.md](./ROLE-PRESALE-BUYER.md) for steps.

### Option B: Ask Deployer
Message the Deployer: "Can I get 100 test VFIDE tokens to address 0x___"

### Option C: Receive from Another Tester
Give another tester your address and they can send you tokens.

### Record:
- How you got tokens: _______________
- Amount received: _______________

---

## 🧪 TEST 4: Check Your Token Balance

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[VFIDE_TOKEN_ADDRESS]#readContract`
2. Find: `balanceOf`
3. Enter your wallet address
4. Click "Query"

### Alternative - In MetaMask:
1. Click "Import tokens"
2. Paste VFIDE token address
3. See balance directly in wallet

### Record:
- Balance: _______________ VFIDE

---

## 🧪 TEST 5: Deposit Tokens to Your Vault

### Step 5A: Approve Tokens
1. Open VFIDEToken contract → Write Contract
2. Find: `approve`
3. Enter:
   - `spender`: [VAULT_HUB_ADDRESS]
   - `amount`: `100000000000000000000` (100 tokens)
4. Click "Write" and confirm

### Step 5B: Deposit
1. Open VaultInfrastructure contract → Write Contract
2. Find: `depositToVault`
3. Enter:
   - `amount`: `50000000000000000000` (50 tokens)
4. Click "Write" and confirm

### Expected Result:
- ✅ 50 tokens moved from wallet to vault

### Verify:
- Check wallet balance (should be 50 less)
- Check vault balance (enter VAULT address in balanceOf)

### Record:
- Transaction hash: _______________
- Wallet balance after: _______________
- Vault balance: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 6: Send Tokens to Another User

Find a testing partner and send them tokens.

### Steps:
1. Open VFIDEToken contract → Write Contract
2. Find: `transfer`
3. Enter:
   - `to`: [OTHER_TESTER_ADDRESS]
   - `amount`: `10000000000000000000` (10 tokens)
4. Click "Write" and confirm

### Expected Result:
- ✅ 10 tokens sent
- ✅ Other tester sees tokens in their wallet

### Record:
- Transaction hash: _______________
- Sent to: _______________
- Amount: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 7: Withdraw Tokens from Vault

Get your tokens back from the vault.

### Steps:
1. Open VaultInfrastructure contract → Write Contract
2. Find: `withdrawFromVault`
3. Enter:
   - `amount`: `50000000000000000000` (50 tokens - what you deposited)
4. Click "Write" and confirm

### Expected Result:
- ✅ 50 tokens back in your wallet
- ✅ Vault balance now 0

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 8: Make a Payment to a Merchant

Find a tester with Merchant role.

### Step 8A: Approve Tokens for Escrow
1. VFIDEToken → Write → `approve`
2. Enter:
   - `spender`: [COMMERCE_ESCROW_ADDRESS]
   - `amount`: `100000000000000000000`
3. Write and confirm

### Step 8B: Create Payment
1. Open CommerceEscrow contract → Write Contract
2. Find: `createPayment`
3. Enter:
   - `orderId`: `0x0000000000000000000000000000000000000000000000000000000000000002`
   - `merchant`: [MERCHANT_TESTER_ADDRESS]
   - `amount`: `50000000000000000000` (50 tokens)
4. Click "Write" and confirm

### Expected Result:
- ✅ Payment locked in escrow
- ✅ Merchant can see pending payment

### Record:
- Transaction hash: _______________
- Merchant address: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 9: Check Trust Score After Activity

Your score may change based on your activity.

### Steps:
1. Open Seer contract → Read Contract
2. `getScore` with your address

### Record:
- Score before testing: _______________
- Score after testing: _______________
- Changed? ✅ Yes / ❌ No

---

## 📊 Test Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Check trust score | ⬜ | |
| 2. Create vault | ⬜ | |
| 3. Get tokens | ⬜ | |
| 4. Check balance | ⬜ | |
| 5. Deposit to vault | ⬜ | |
| 6. Send to user | ⬜ | Need partner |
| 7. Withdraw from vault | ⬜ | |
| 8. Pay merchant | ⬜ | Need merchant |
| 9. Recheck score | ⬜ | |

---

## 🎉 Bonus Tests (If You Have Time)

### Bonus A: Endorse Another User
If you have high score (8000+):
1. Seer contract → Write → `endorse`
2. Enter a friend's address
3. Their score should improve!

### Bonus B: Check Multiple Balances
1. Your wallet balance
2. Your vault balance
3. Verify they add up correctly

---

## 🐛 Found a Bug?

Report to testing chat with:
1. Which test failed
2. Transaction hash
3. Screenshot of error
4. Your wallet address
