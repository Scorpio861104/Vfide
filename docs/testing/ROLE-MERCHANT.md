# Role: Merchant - Test Script

## 🎯 Your Mission
Test the merchant system: register as a merchant, accept payments, and manage your store.

---

## ✅ Prerequisites Checklist
- [ ] Wallet set up (see TESTER-ONBOARDING.md)
- [ ] On Sepolia network
- [ ] Have 0.03+ Sepolia ETH
- [ ] Have VFIDE tokens (buy from presale first or get from Deployer)
- [ ] Have contract addresses (see CONTRACT-ADDRESSES.md)
- [ ] Your ProofScore is 600+ (check with Deployer if unsure)

---

## 🧪 TEST 1: Create Your Vault First

You need a vault before becoming a merchant.

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[VAULT_HUB_ADDRESS]#writeContract`
2. Connect MetaMask
3. Find function: `createVault`
4. Click "Write"
5. Confirm in MetaMask

### Expected Result:
- ✅ Transaction succeeds
- ✅ You now have a personal vault

### Find Your Vault Address:
1. Click "Read Contract" tab
2. Find: `vaultOf`
3. Enter your wallet address
4. Click "Query"
5. Save the vault address: _______________

### Record:
- Transaction hash: _______________
- Your vault address: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 2: Register as Merchant

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[MERCHANT_REGISTRY_ADDRESS]#writeContract`
2. Connect MetaMask
3. Find function: `addMerchant`
4. Enter:
   - `metadata`: `0x0000000000000000000000000000000000000000000000000000000000000001` 
   - (This is a placeholder - any 32-byte hex works)
5. Click "Write"
6. Confirm

### Expected Result:
- ✅ Transaction succeeds
- ✅ You're now a registered merchant

### Verify:
1. Click "Read Contract" tab
2. Find: `isMerchant`
3. Enter your wallet address
4. Should return: `true`

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 3: Receive a Payment

You need a buyer (another tester) to send you a payment.

### Tell Your Buyer:
1. Your wallet address: _______________
2. Payment amount: 100 VFIDE tokens
3. They use the CommerceEscrow contract

### Buyer Steps (share with them):
```
1. Go to CommerceEscrow contract
2. First approve tokens:
   - Go to VFIDEToken contract
   - Function: approve
   - spender: [COMMERCE_ESCROW_ADDRESS]
   - amount: 100000000000000000000 (100 tokens with 18 decimals)
   
3. Create payment:
   - Go to CommerceEscrow contract  
   - Function: createPayment
   - orderId: 0x0000000000000000000000000000000000000000000000000000000000000001
   - merchant: [YOUR_MERCHANT_ADDRESS]
   - amount: 100000000000000000000
```

### Expected Result:
- ✅ Payment created in escrow
- ✅ Tokens locked in escrow contract

### Record:
- Buyer's tx hash: _______________
- Order ID: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 4: Confirm Delivery (Release Payment)

After "delivering" to your buyer, confirm to release funds.

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[COMMERCE_ESCROW_ADDRESS]#writeContract`
2. Find function: `confirmDelivery`
3. Enter:
   - `orderId`: `0x0000000000000000000000000000000000000000000000000000000000000001`
   - (Same order ID from TEST 3)
4. Click "Write"
5. Confirm

### Expected Result:
- ✅ Transaction succeeds
- ✅ Tokens sent to your vault (minus fees)
- ✅ Fees automatically burned/distributed

### Check Your Balance:
1. Go to VFIDEToken contract
2. Read Contract → `balanceOf`
3. Enter YOUR VAULT address (not wallet)
4. See your balance increased

### Record:
- Transaction hash: _______________
- Tokens received: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 5: Check Fee Deduction

### Calculate Expected:
- Payment: 100 VFIDE
- Your ProofScore: _____ (check with Seer contract)
- Expected fee: _____% (0.25% if score 9000+, up to 5% if low)
- Expected receive: _____ VFIDE

### Verify:
Compare your actual received amount with expected.

### Record:
- Expected: _______________
- Actual: _______________
- Fees correct? ✅ Pass / ❌ Fail

---

## 🧪 TEST 6: Dispute a Payment (Optional)

Have a buyer create a new payment, then test the dispute flow.

### Steps:
1. Buyer creates payment (new order ID)
2. Instead of confirming, find function: `disputePayment`
3. Enter the order ID
4. Click "Write"

### Expected Result:
- ✅ Payment marked as disputed
- ✅ Requires DAO intervention to resolve

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 7: Withdraw from Vault

Get tokens from your vault to your wallet.

### Steps:
1. Go to VaultInfrastructure contract
2. Find function: `withdrawFromVault`
3. Enter:
   - `amount`: Your vault balance (in wei - add 18 zeros)
4. Click "Write"
5. Confirm

### Expected Result:
- ✅ Tokens now in your wallet (not vault)

### Record:
- Transaction hash: _______________
- Tokens withdrawn: _______________
- Result: ✅ Pass / ❌ Fail

---

## 📊 Test Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Create vault | ⬜ | |
| 2. Register as merchant | ⬜ | |
| 3. Receive payment | ⬜ | Need buyer |
| 4. Confirm delivery | ⬜ | |
| 5. Check fees | ⬜ | |
| 6. Dispute payment | ⬜ | Optional |
| 7. Withdraw from vault | ⬜ | |

---

## 🐛 Found a Bug?

Report to testing chat with:
1. Which test failed
2. Transaction hash
3. Screenshot of error
4. Your wallet address
