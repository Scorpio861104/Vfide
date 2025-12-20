# Role: Guardian - Test Script

## 🎯 Your Mission
Test the security system: register as a guardian, stake tokens, and test emergency controls.

⚠️ **IMPORTANT:** Guardians protect the network. This is a critical role. Follow steps exactly!

---

## ✅ Prerequisites Checklist
- [ ] Wallet set up (see TESTER-ONBOARDING.md)
- [ ] On Sepolia network
- [ ] Have 0.05+ Sepolia ETH (guardians do more transactions)
- [ ] Have 1000+ VFIDE tokens (required stake)
- [ ] Have contract addresses (see CONTRACT-ADDRESSES.md)
- [ ] High ProofScore (700+) recommended
- [ ] Coordinating with 2 other Guardian testers

---

## 👥 Guardian Team Coordination

Guardians work together. Find your team:

| Guardian | Wallet Address | Name |
|----------|----------------|------|
| Guardian 1 | _______________ | _______________ |
| Guardian 2 | _______________ | _______________ |
| Guardian 3 | _______________ | _______________ |

---

## 🧪 TEST 1: Check Guardian Requirements

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[GUARDIAN_REGISTRY_ADDRESS]#readContract`
2. Find: `minStake`
3. Click "Query"
4. Note the minimum stake: _______________ tokens

### Expected Result:
- ✅ Shows minimum stake required (likely 1000 VFIDE)

---

## 🧪 TEST 2: Approve Tokens for Staking

### Steps:
1. Open VFIDEToken contract on Etherscan
2. Write Contract → `approve`
3. Enter:
   - `spender`: [GUARDIAN_LOCK_ADDRESS]
   - `amount`: `10000000000000000000000` (10,000 tokens - more than enough)
4. Click "Write"
5. Confirm

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 3: Register as Guardian

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[GUARDIAN_REGISTRY_ADDRESS]#writeContract`
2. Connect MetaMask
3. Find function: `register`
4. Enter:
   - `stake`: `1000000000000000000000` (1000 tokens with 18 decimals)
5. Click "Write"
6. Confirm

### Expected Result:
- ✅ Transaction succeeds
- ✅ Tokens locked in GuardianLock contract
- ✅ You're now a registered guardian

### Verify:
1. Read Contract → `isGuardian`
2. Enter your address
3. Should return: `true`

### Record:
- Transaction hash: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 4: Check Guardian Status

### Steps:
1. Read Contract → `guardianInfo`
2. Enter your address
3. Note your info:
   - Stake amount: _______________
   - Active status: _______________
   - Join time: _______________

---

## 🧪 TEST 5: Vote on Security Issue (Simulated)

⚠️ **Coordinate with Deployer** - They may need to create a security proposal first.

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[PANIC_GUARD_ADDRESS]#writeContract`
2. Find function: `voteForPanic` or similar
3. Follow Deployer's instructions for the specific proposal
4. Click "Write"
5. Confirm

### Record:
- Transaction hash: _______________
- What you voted on: _______________
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 6: Multi-Guardian Panic Test

⚠️ **COORDINATE WITH ALL 3 GUARDIANS** - Do this together!

This tests the 2/3 quorum requirement for emergency actions.

### Guardian 1 Steps:
1. Go to PanicGuard contract
2. Function: `triggerPanic` (or similar)
3. Enter reason: `0x0000000000000000000000000000000000000000000000000000000000000001`
4. Write and confirm
5. Tell Guardian 2 to proceed

### Guardian 2 Steps:
1. Same function: `triggerPanic`
2. Same reason
3. Write and confirm
4. This should trigger panic mode (2/3 reached)

### Guardian 3 Steps:
1. Observe - don't vote yet
2. Verify panic mode activated

### Expected Result:
- ✅ After 2/3 guardians vote, panic activates
- ✅ Check `isPanicActive` returns `true`

### Record:
- Guardian 1 tx: _______________
- Guardian 2 tx: _______________
- Panic activated? ✅ Yes / ❌ No
- Result: ✅ Pass / ❌ Fail

---

## 🧪 TEST 7: Check Emergency Breaker Status

### Steps:
1. Open: `https://sepolia.etherscan.io/address/[EMERGENCY_BREAKER_ADDRESS]#readContract`
2. Check: `isPaused`
3. Check: `pauseReason`

### Expected Result:
- Shows current emergency status

### Record:
- Is paused: _______________
- Pause reason: _______________

---

## 🧪 TEST 8: Exit Guardian Role (End of Testing)

⚠️ Only do this when testing is complete!

### Steps:
1. Open GuardianRegistry contract
2. Find function: `unregister` or `exit`
3. Click "Write"
4. Confirm

### Expected Result:
- ✅ Your staked tokens returned
- ✅ No longer a guardian

### Record:
- Transaction hash: _______________
- Tokens returned: _______________
- Result: ✅ Pass / ❌ Fail

---

## 📊 Test Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Check requirements | ⬜ | |
| 2. Approve tokens | ⬜ | |
| 3. Register as guardian | ⬜ | |
| 4. Check status | ⬜ | |
| 5. Vote on issue | ⬜ | Need Deployer |
| 6. Multi-guardian panic | ⬜ | Need 3 guardians |
| 7. Check breaker status | ⬜ | |
| 8. Exit guardian role | ⬜ | End of testing |

---

## ⚠️ Critical Notes for Guardians

1. **Don't trigger panic randomly** - coordinate with team
2. **Keep your stake** - don't withdraw until testing ends
3. **Stay online during tests** - guardians work together
4. **Report any security bugs** immediately to Deployer

---

## 🐛 Found a Bug?

Report to testing chat with:
1. Which test failed
2. Transaction hash
3. Screenshot of error
4. All 3 guardian addresses involved
