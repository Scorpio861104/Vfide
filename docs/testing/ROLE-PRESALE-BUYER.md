# Role: Presale Buyer - Test Script

## 🎯 Your Mission
Test the presale system by buying tokens at different tiers and lock periods.

---

## ✅ Prerequisites Checklist
- [ ] Wallet set up (see TESTER-ONBOARDING.md)
- [ ] On Sepolia network
- [ ] Have 0.02+ Sepolia ETH
- [ ] Have contract addresses (see CONTRACT-ADDRESSES.md)
- [ ] Have test USDC from Deployer (optional, for stablecoin tests)

---

## 🧪 TEST 1: Buy with ETH (No Lock)

### Steps:
1. Open Etherscan: `https://sepolia.etherscan.io/address/[PRESALE_ADDRESS]#writeContract`
2. Click "Connect to Web3" and connect MetaMask
3. Find function: `buyWithETH`
4. Enter:
   - `lockPeriod`: `0` (no lock)
   - `payableAmount`: `0.001` (at the top, this is ETH to send)
5. Click "Write"
6. Confirm in MetaMask
7. Wait for transaction to confirm

### Expected Result:
- ✅ Transaction succeeds
- ✅ You get tokens allocated (not in wallet yet - need to claim)

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail
- Notes: _______________

---

## 🧪 TEST 2: Buy with ETH (90-Day Lock for Bonus)

### Steps:
1. Same page as above
2. Find function: `buyWithETH`
3. Enter:
   - `lockPeriod`: `7776000` (90 days in seconds)
   - `payableAmount`: `0.001`
4. Click "Write"
5. Confirm in MetaMask

### Expected Result:
- ✅ Transaction succeeds
- ✅ You get 50% BONUS tokens for 90-day lock

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail
- Notes: _______________

---

## 🧪 TEST 3: Buy with ETH (180-Day Lock for Max Bonus)

### Steps:
1. Find function: `buyWithETH`
2. Enter:
   - `lockPeriod`: `15552000` (180 days in seconds)
   - `payableAmount`: `0.001`
3. Click "Write"
4. Confirm

### Expected Result:
- ✅ Transaction succeeds
- ✅ You get 100% BONUS tokens for 180-day lock

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail
- Notes: _______________

---

## 🧪 TEST 4: Check Your Allocation

### Steps:
1. On same page, click "Read Contract" tab
2. Find function: `purchases`
3. Enter your wallet address
4. Click "Query"

### Expected Result:
- ✅ Shows your total tokens
- ✅ Shows locked tokens
- ✅ Shows lock end time

### Record Your Allocation:
- Total tokens: _______________
- Locked tokens: _______________
- Lock ends: _______________

---

## 🧪 TEST 5: Buy with Stablecoin (USDC)

### Prerequisites:
- Get test USDC from Deployer
- Approve USDC spend first

### Step 5A: Approve USDC
1. Go to Mock USDC contract on Etherscan
2. Write Contract → `approve`
3. Enter:
   - `spender`: [PRESALE_ADDRESS]
   - `amount`: `1000000000` (1000 USDC with 6 decimals)
4. Click "Write" and confirm

### Step 5B: Buy Tokens
1. Go back to Presale contract
2. Find function: `buyWithStable`
3. Enter:
   - `stable`: [MOCK_USDC_ADDRESS]
   - `amount`: `100000000` (100 USDC)
   - `tier`: `0` (Tier 0 = $0.03)
   - `lockPeriod`: `0`
4. Click "Write"
5. Confirm

### Expected Result:
- ✅ Transaction succeeds
- ✅ Tokens allocated at $0.03 each

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail
- Notes: _______________

---

## 🧪 TEST 6: Referral Purchase

### Steps:
1. Get a friend's wallet address (another tester)
2. Find function: `buyWithETHReferral`
3. Enter:
   - `lockPeriod`: `0`
   - `referrer`: [FRIEND_ADDRESS]
   - `payableAmount`: `0.001`
4. Click "Write"
5. Confirm

### Expected Result:
- ✅ Transaction succeeds
- ✅ Referrer gets 5% bonus

### Record:
- Transaction hash: _______________
- Referrer address: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 7: Claim Tokens (After Lock Ends)

⚠️ **Note:** For testing, the Deployer may fast-forward time. Otherwise wait for lock to expire.

### Steps:
1. Find function: `claim`
2. Click "Write" (no parameters needed)
3. Confirm

### Expected Result:
- ✅ Tokens appear in your wallet
- ✅ Check balance in MetaMask

### Record:
- Transaction hash: _______________
- Tokens received: _______________
- Result: ✅ Pass / ❌ Fail

---

## 📊 Test Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Buy ETH (no lock) | ⬜ | |
| 2. Buy ETH (90-day lock) | ⬜ | |
| 3. Buy ETH (180-day lock) | ⬜ | |
| 4. Check allocation | ⬜ | |
| 5. Buy with USDC | ⬜ | |
| 6. Referral purchase | ⬜ | |
| 7. Claim tokens | ⬜ | |

---

## 🐛 Found a Bug?

Report to testing chat with:
1. Which test failed
2. Transaction hash
3. Screenshot of error
4. Your wallet address
