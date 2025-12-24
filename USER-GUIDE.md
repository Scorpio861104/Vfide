# VFIDE User Guide
**Last Updated:** December 4, 2025  
**Version:** 1.0

---

## Welcome to VFIDE! 🚀

VFIDE is a revolutionary **zero-fee payment system** built on zkSync Era that combines **on-chain reputation** (ProofScore) with **secure vault custody** to create a fair, transparent financial ecosystem.

---

## Quick Start (5 Minutes)

### 1. **Connect Your Wallet**
1. Visit [vfide.io](https://vfide.io) (placeholder - replace with actual URL)
2. Click "Connect Wallet" in top-right corner
3. Select your wallet:
   - MetaMask (recommended)
   - WalletConnect
   - Coinbase Wallet
   - Rainbow
4. Approve connection to zkSync Era network

### 2. **Create Your Vault**
Your vault is a smart contract that holds your VFIDE tokens safely.

1. Navigate to **"My Vault"** page
2. Click **"Create Vault"**
3. Confirm transaction (gas fee: ~$0.50-1)
4. Your vault address will be displayed

**Important:** VFIDE tokens can ONLY be held in vaults, not directly in wallets. This prevents rug pulls and enables recovery features.

### 3. **Acquire VFIDE Tokens**
1. Go to **"Token Launch"** page
2. Choose your commitment tier:
   - **Founding ($0.03):** 180-day lock, 10% immediate unlock
   - **Oath ($0.05):** 90-day lock, 20% immediate unlock
   - **Public ($0.07):** Optional lock (bonus for locking), 100% immediate
3. Enter amount to purchase (max 500K VFIDE)
4. **Read and check ALL legal acknowledgments** (required)
5. Confirm purchase

**Note:** Voting power is based on ProofScore (earned through behavior), not tier.

**Commitment periods** are anti-dump mechanisms, not lockups. You can still use tokens for payments, governance, and commerce during commitment.

---

## Core Features

### 🏦 **Your Vault (Non-Custodial Security)**

**What is a Vault?**
- Smart contract wallet that holds your VFIDE
- YOU control it 100% (non-custodial)
- Enables guardian recovery if you lose access
- Required by protocol for security

**Vault Actions:**
```
✅ Transfer VFIDE to other vaults
✅ Make merchant payments (0% fee)
✅ Vote in DAO governance
✅ Set up guardians for recovery
✅ Execute arbitrary smart contract calls
```

**Setting Up Guardians:**
1. Go to **"Vault Settings"**
2. Click **"Add Guardian"**
3. Enter trusted address (friend, family, hardware wallet)
4. Confirm transaction
5. Repeat for up to 5 guardians

**Guardian Recovery Process:**
If you lose access to your wallet:
1. Guardian initiates recovery with new owner address
2. Other guardians approve (majority required)
3. After 30-day delay, ownership transfers
4. Your tokens are safe!

**Next of Kin:**
- Set ONE next-of-kin address
- If you have NO guardians, next-of-kin can recover instantly
- If you have guardians, next-of-kin needs guardian approval

---

### 📊 **ProofScore (Your Reputation)**

**What is ProofScore?**
- On-chain credit score from **0-1000**
- Everyone starts at **500 (neutral)**
- Earn points through good behavior
- Lose points for bad behavior

**How to Increase Your Score:**
- ✅ Complete payments without disputes
- ✅ Receive endorsements from high-score users
- ✅ Participate in DAO governance
- ✅ Maintain active usage (no decay)
- ✅ Hold capital in vault (bonus up to +50)
- ✅ Earn reputation badges

**Score Benefits:**
| Score Range | Benefits |
|-------------|----------|
| **800-1000 (Elite)** | 1.5% burn fee, instant merchant rebates, DAO eligibility, badge bonuses |
| **700-799 (High Trust)** | 2.0% burn fee, governance voting, merchant registration |
| **500-699 (Neutral)** | 2.5% burn fee, standard access |
| **350-499 (Low Trust)** | 3.5% burn fee, warnings |
| **1-349 (Risky)** | 4.5% burn fee, restricted access |

**Score Requirements:**
- **Governance Voting:** 540+
- **Merchant Registration:** 560+
- **Council Candidacy:** 700+

**What Lowers Your Score:**
- ❌ Payment disputes
- ❌ Chargebacks
- ❌ Scam reports
- ❌ Inactivity (5 points per week decay)
- ❌ Being flagged by DAO

---

### 💸 **Making Payments (Zero Fees!)**

**Pay a Merchant:**
1. Go to **"Pay"** page
2. Enter merchant address OR scan QR code
3. Enter amount
4. Add note/order ID (optional)
5. Confirm transaction

**Important:** Merchant payments have **0% protocol fee**. Only VFIDE token transfer fees apply (0.25%-5%, based on your ProofScore).

**Payment Flow:**
```
Your Vault → Merchant Vault
Fee: 0% protocol fee
Transfer Fee: 0.25%-5% (mostly burn, varies by ProofScore)
Speed: 2-3 seconds (zkSync)
Cost: ~$0.02 gas
```

---

### 🏪 **Become a Merchant**

**Requirements:**
- ProofScore: 560+ (minForMerchant)
- Active vault
- Business information

**Registration Steps:**
1. Go to **"Merchant Portal"**
2. Click **"Register as Merchant"**
3. Fill in business details:
   - Business name
   - Category (retail, services, digital goods)
   - Payout address (optional)
4. Confirm transaction
5. Start accepting payments immediately!

**Merchant Benefits:**
- ✅ **0% payment processing fees** (vs 2-3% traditional)
- ✅ Instant settlement (no 3-day holds)
- ✅ Customer trust scores visible
- ✅ Chargeback protection
- ✅ Rebate vault for high scores (800+)

**Accepting Payments:**
1. Generate payment link/QR code in portal
2. Share with customer
3. Customer scans and pays
4. Funds arrive in your vault instantly
5. No chargebacks (blockchain immutability)

**Merchant Dashboard:**
- Real-time transaction history
- Monthly volume statistics
- Customer ProofScore analytics
- Payment link generator
- QR code creator

---

### 🗳️ **DAO Governance**

**Who Can Vote?**
- ProofScore 540+ required
- Must have active vault

**Voting Power:**
- Based on your **ProofScore** (not token balance)
- Score 800 = 800 voting power
- Prevents plutocracy

**How to Vote:**
1. Go to **"Governance"** page
2. Browse active proposals
3. Read proposal details
4. Click "Vote For" or "Vote Against"
5. Confirm transaction

**Governance Fatigue:**
- Voting too frequently reduces your power
- Each vote adds 5% fatigue
- Recover 5% per day
- Max fatigue: 90% (retains 10% power)
- Encourages thoughtful participation

**Creating Proposals:**
1. Must have ProofScore 540+
2. Click **"Create Proposal"**
3. Select type:
   - Generic (general changes)
   - Financial (treasury spending)
   - Protocol Change (parameter updates)
   - Security Action (emergency response)
4. Fill in details:
   - Target contract
   - Function to call
   - Parameters
   - Description
5. Voting period: 3 days default
6. Minimum votes required: 5,000 score-points

**Proposal Lifecycle:**
```
Created → Voting (3 days) → Passed/Failed → Queued (timelock) → Executed
```

**Timelock:**
- Passed proposals wait 3 days before execution
- Gives community time to exit if malicious
- Emergency council can veto

---

### 🔒 **Security Features**

**Circuit Breakers:**
If you see "Circuit Breaker Active" banner:
- System-wide emergency pause activated
- Your funds are safe (locked in vault)
- No transfers possible until cleared
- DAO will announce resolution timeline

**Guardian Locks:**
If vault shows "Guardian Lock Active":
- Your guardians froze your vault (suspicious activity detected)
- Contact your guardians to resolve
- Prevents theft during security incident
- Can be unlocked by guardian vote

**Panic Guard:**
If system shows "Panic Mode":
- Critical vulnerability detected
- All operations paused
- Emergency council activated
- Monitor Discord/Twitter for updates

**Blacklist/Sanctions:**
- OFAC-sanctioned addresses automatically blocked
- Cannot send or receive VFIDE
- Compliance with US regulations

---

## Common Questions (FAQ)

### **Q: Why can't I hold VFIDE in my wallet?**
**A:** VFIDE uses "vault-only" transfers for security. Vaults prevent rug pulls, enable recovery, and provide guardian protection. Your vault IS your wallet for VFIDE.

### **Q: What happens if I lose my private keys?**
**A:** If you set up guardians, they can recover your vault to a new address after majority approval + 30-day delay. If you set next-of-kin without guardians, they recover instantly.

### **Q: Why do I pay transfer fees but merchants don't?**
**A:** VFIDE transfer fees (0.25-5% based on ProofScore) are deflationary burns that reduce supply. Merchant payment processing is 0% to compete with credit cards (2-3% fees). Two different operations.

### **Q: How do I increase my ProofScore?**
**A:** Complete transactions, get endorsed by high-score users, participate in governance, stay active, and avoid disputes.

### **Q: Can I sell my VFIDE?**
**A:** Yes, but commitment periods have restrictions:
- Founding tier (180-day lock): Only 10% unlocked immediately
- Oath tier (90-day lock): Only 20% unlocked immediately
- Public tier (no lock): 100% unlocked immediately

After commitment period ends, transfer freely.

### **Q: What if a merchant scams me?**
**A:** File dispute through **"Dispute Resolution"** in your transaction history. DAO arbitration council reviews. If merchant found guilty, their ProofScore drops and you get refund from insurance pool.

### **Q: Is VFIDE an investment?**
**A:** **NO.** VFIDE tokens are **utility tokens** for payments, governance, and commerce. Not securities. Not investment contracts. Review legal disclaimers before purchase.

### **Q: Which networks does VFIDE support?**
**A:** Currently **zkSync Era only**. Multi-chain expansion planned for 2026.

### **Q: How do I withdraw to USD?**
**A:** Use merchant portal to convert VFIDE → stablecoin (USDC) → off-ramp to bank via:
- Coinbase
- Kraken
- Binance
- Local exchanges

---

## Troubleshooting

### **"Transaction Failed"**
- **Check gas:** Ensure you have ETH on zkSync Era for gas
- **Check balance:** Verify vault has sufficient VFIDE
- **Check locks:** Ensure vault isn't guardian-locked
- **Check score:** Some actions require minimum ProofScore

### **"Vault Not Found"**
- Create vault first (see section 2)
- Ensure connected to zkSync Era network
- Clear browser cache and reconnect wallet

### **"Insufficient ProofScore"**
- Current requirement not met
- Build reputation through usage
- Get endorsements from high-score users
- Wait for activity score to increase

### **"Circuit Breaker Active"**
- System emergency pause
- Wait for DAO announcement
- Monitor official channels
- Your funds are safe

---

## Safety Tips

1. ✅ **Set up guardians immediately** after creating vault
2. ✅ **Never share private keys** with anyone (not even guardians)
3. ✅ **Verify merchant addresses** before large payments
4. ✅ **Start with small test transactions**
5. ✅ **Enable 2FA** on your wallet app
6. ✅ **Use hardware wallet** for large holdings
7. ✅ **Keep ProofScore high** to earn trust
8. ❌ **Never rush** - scammers use urgency tactics
9. ❌ **Never click unknown links** - phishing is common
10. ❌ **Never promise returns** - it's not an investment

---

## Getting Help

### **Official Channels:**
- **Website:** https://vfide.io
- **Discord:** https://discord.gg/vfide (placeholder)
- **Twitter:** https://twitter.com/VFIDEofficial (placeholder)
- **GitHub:** https://github.com/Scorpio861104/Vfide
- **Email:** support@vfide.io (placeholder)

### **Emergency Contacts:**
- **Security Issues:** security@vfide.io
- **Bug Bounty:** bounty@vfide.io
- **Legal Questions:** legal@vfide.io

### **Documentation:**
- Smart Contract Docs: `/CONTRACTS.md`
- Architecture: `/ARCHITECTURE.md`
- Security Model: `/SECURITY.md`
- Developer Guide: `/DEVELOPER-GUIDE.md`

---

## Glossary

**Vault:** Smart contract wallet that holds your VFIDE tokens securely

**ProofScore:** Your on-chain reputation score (0-1000)

**Guardian:** Trusted address that can help recover your vault

**Commitment Period:** Time-based anti-dump mechanism (NOT a lockup)

**Burn Fee:** Deflationary transfer fee (0.25%-5%) that reduces supply

**DAO:** Decentralized Autonomous Organization (community governance)

**zkSync Era:** Layer 2 scaling solution for Ethereum (low fees, fast)

**Timelock:** Delay mechanism for DAO proposals (3 days)

**Circuit Breaker:** Emergency pause system for security

**Next of Kin:** Backup recovery address for vault access

---

**Welcome to the future of finance. Welcome to VFIDE.** 🚀
