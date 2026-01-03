# VFIDE User Guide
**Version:** 2.0  
**Last Updated:** January 2, 2026

---

## Welcome to VFIDE! 🚀

VFIDE is a revolutionary **zero-fee payment system** built on Base, Polygon, and zkSync that combines **on-chain reputation** (ProofScore) with **secure vault custody** to create a fair, transparent financial ecosystem.

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
4. Approve connection to Base network (or Polygon/zkSync)

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

**ProofScore Tiers (Enhanced):**
| Tier | Score Range | Color | Benefits |
|------|-------------|-------|----------|
| **Legendary** | 960-1000 | Purple | All benefits + special recognition |
| **Elite** | 850-959 | Gold | 1.5% burn fee + priority support |
| **Verified** | 750-849 | Blue | 2.0% burn fee + merchant features |
| **Trusted** | 650-749 | Green | 2.5% burn fee + governance |
| **Citizen** | 540-649 | Cyan | Standard access |
| **Newbie** | 500-539 | Gray | Learning phase |

**Score Requirements:**
- **Governance Voting:** 100+
- **Proposal Creation:** 100+
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
Speed: 2-3 seconds (Base/Polygon/zkSync)
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

### 🎮 **Gamification & Rewards**

**XP System:**
- Earn **Experience Points (XP)** based on your ProofScore
- Formula: `XP = (ProofScore - 540) × 10`
- Example: Score 850 = 3,100 XP
- View your XP on dashboard and badges page

**Levels:**
- Level = XP ÷ 100
- Example: 3,100 XP = Level 31
- Displayed on your profile and leaderboard
- Higher levels unlock special badges

**Badge Collection:**
1. Visit **"Badges"** page
2. Browse **28+ badges** across 7 categories:
   - **Activity**: GENESIS_CITIZEN, FIRST_TRANSACTION, ACTIVE_MEMBER
   - **Milestones**: EARLY_ADOPTER, WHALE, DIAMOND_HANDS
   - **Reputation**: TRUSTED_MEMBER, ELITE, LEGENDARY
   - **Engagement**: ACTIVE_VOTER, PROPOSAL_MASTER
   - **Commerce**: MERCHANT, HIGH_VOLUME_TRADER
   - **Achievements**: GUARDIAN_ANGEL, RECOVERY_HERO
   - **Special**: FOUNDING_MEMBER, COUNCIL_MEMBER
3. Check your **XP Progress Bar** at the top
4. See your current **Level** and progress to next level
5. Filter badges by:
   - **Category** (dropdown selector)
   - **Search** (by badge name)
   - **Earned vs Locked** (toggle)
6. Click **"Mint Badge"** to claim eligible NFT on-chain
7. Badges are **ERC-721 NFTs** stored in your wallet

**Badge Types:**
- **Permanent**: Never expire (e.g., FOUNDING_MEMBER, GENESIS_CITIZEN)
- **Temporary**: Expire after 90 days (must renew with score maintenance)
- **Score-Dependent**: Require minimum ProofScore to unlock
- **Activity-Based**: Earned through specific actions

**Badge Requirements (Examples):**
| Badge | Requirement | Type |
|-------|-------------|------|
| GENESIS_CITIZEN | Created vault in first 1000 users | Permanent |
| FIRST_TRANSACTION | Completed first VFIDE payment | Permanent |
| TRUSTED_MEMBER | ProofScore 750+ for 30 days | Score-dependent |
| ACTIVE_VOTER | Voted 10+ times in governance | Activity |
| MERCHANT | Registered as merchant | Status |
| WHALE | Hold 100K+ VFIDE | Capital |
| GUARDIAN_ANGEL | Set up 3+ guardians | Security |
| COUNCIL_MEMBER | Elected to DAO council | Achievement |

**Leaderboard Rankings:**
1. Go to **"Leaderboard"** page
2. See your rank among all users
3. Leaderboard columns:
   - **Rank** (#1, #2, #3, etc.)
   - **User Address** (your address highlighted in blue)
   - **ProofScore** (primary ranking metric)
   - **Level** (calculated from XP)
   - **XP** (total experience points)
   - **Tier** (Newbie → Legendary)
   - **Badges** (count of earned badges)
4. Track your **rank changes** over time
5. View **Activity Feed** on the right sidebar:
   - Recent badge earnings
   - Level ups
   - XP gains
   - Leaderboard climbs
   - Real-time updates

**Earning XP & Badges:**
- Complete first transaction: **+10 points** → FIRST_TRANSACTION badge
- Vote in governance: **+5 points per vote** → ACTIVE_VOTER after 10
- Add guardians: **+10 points** → GUARDIAN_ANGEL badge (3+ guardians)
- Reach milestones: **100 transactions** → HIGH_VOLUME_TRADER
- Maintain high score: **750+ for 30 days** → TRUSTED_MEMBER
- Council member: **Automatic COUNCIL_MEMBER** badge
- Hold capital: **100K+ VFIDE** → WHALE badge
- Early adopter: **First 1000 vaults** → GENESIS_CITIZEN

---

### 💰 **Payroll & Salary Streaming**

**For Employers:**
Create continuous salary streams with multi-asset support.

**Setting Up Payroll:**
1. Go to **"Payroll"** page
2. Click **"Create Stream"**
3. Fill in stream details:
   - **Recipient Address** (employee's vault or wallet)
   - **Token** (select from supported assets):
     - VFIDE (18 decimals)
     - USDC (6 decimals)
     - USDT (6 decimals)
     - DAI (18 decimals)
     - WETH (18 decimals)
   - **Amount per Month** (e.g., 5,000 USDC)
   - **Duration** (months: 1, 3, 6, 12, or custom)
4. **Review** stream details:
   - Monthly payment rate
   - Per-second streaming rate
   - Total amount needed
   - Estimated runway (months remaining)
5. **Approve** token spending (one-time per token)
6. **Create Stream** (confirm transaction)

**Stream Management:**
- **Active Streams Tab**: View all running payrolls
  - Recipient address
  - Token type
  - Monthly rate
  - Earned amount
  - Total allocated
  - Runway remaining
  - Actions (top-up, pause, cancel)
- **History Tab**: See past payments and events
  - Stream created
  - Top-ups
  - Withdrawals
  - Pauses/resumes
  - Cancellations
- **Top-Up**: Add funds to extend runway
  - Enter additional amount
  - Extends stream duration automatically
- **Pause/Resume**: Control stream flow
  - Paused streams stop accruing
  - Resume continues from current balance
- **Cancel**: Stop stream and reclaim unused funds
  - Employee keeps earned amount
  - Employer gets remaining balance back

**Notifications & Alerts:**
- 🔔 **Low Runway Alert**: When < 30 days remaining
- ✅ **Stream Created**: Confirmation message
- ⏰ **Stream Ending Soon**: 7-day advance warning
- ❌ **Stream Ended**: When duration completes
- 💰 **Top-Up Needed**: Automatic reminders every 3 days

**For Employees:**
- View your **incoming streams** on Payroll page
- See **earned amount** vs **total allocation** in real-time
- **Withdraw** earned funds anytime (no waiting period)
- Track **monthly earnings** in dashboard
- Export **payment history** for tax purposes (CSV)
- Receive notifications when:
  - New stream created for you
  - Stream topped up
  - Stream ending soon
  - Stream cancelled

**Stream History Tracking:**
Every stream logs:
- ✅ Stream created (timestamp + initial amount)
- ✅ Top-ups (amount added, new runway)
- ✅ Withdrawals (employee claims, amount)
- ✅ Stream paused (timestamp)
- ✅ Stream resumed (timestamp)
- ✅ Stream cancelled (final balances)

**Guard Rails:**
- ⚠️ Cannot create stream without sufficient token balance
- ⚠️ Cannot set rate > available funds
- ⚠️ Low runway warnings prevent surprise interruptions
- ⚠️ Cannot delete stream history (permanent audit trail)
- ⚠️ Minimum stream duration: 1 day
- ⚠️ Maximum stream duration: 1000 days (~3 years)

---

### 🗳️ **DAO Governance (Enhanced)**

**Who Can Vote?**
- ProofScore 100+ required (lowered from 540+)
- Must have active vault
- No token balance requirement (score-based, not plutocratic)

**Voting Power:**
- Based on your **ProofScore** (not token balance)
- Score 850 = 850 voting power
- Prevents whale manipulation

**How to Vote:**
1. Go to **"Governance"** page
2. Browse active proposals in **"Active Proposals"** tab
3. Read proposal details:
   - Title & description
   - Proposer address & score
   - Target contract & calldata
   - Current vote counts
   - Time remaining
   - Quorum progress (visual bar)
4. Click **"Vote For"** or **"Vote Against"**
5. Confirm transaction
6. Your vote is recorded on-chain

**Governance Fatigue:**
- Voting too frequently reduces your power
- Each vote adds 5% fatigue
- Recover 5% per day (passive recovery)
- Max fatigue: 90% (you retain 10% minimum power)
- Encourages thoughtful participation
- View your fatigue % on governance page

**Creating Proposals (Enhanced):**
1. Must have ProofScore 100+ to create proposals
2. Go to **"Governance"** → **"Create Proposal"** tab
3. **Use a Template** (recommended for first-time users):
   - **Fee Parameter Changes**
     - Adjust burn fees, transfer limits, etc.
     - Pre-filled with current values
     - Clear parameter descriptions
   - **Treasury Allocation**
     - Request DAO treasury funds
     - Built-in validation for amounts
     - Requires justification
   - **Security Audit Funding**
     - Fund smart contract audits
     - Preset audit firm recommendations
     - Budget templates included
   - **Contract Upgrades**
     - Propose new contract versions
     - Safety checklist included
     - Timelock enforcement
   - **System Parameter Updates**
     - Adjust score thresholds, limits, etc.
     - Impact analysis tools
     - Rollback options
4. OR create **from scratch**:
   - Select proposal type:
     - Parameter Change (fees, limits, etc.)
     - Treasury Spend (funding requests)
     - Contract Upgrade (new versions)
     - Other (general proposals)
   - Fill in details:
     - **Title** (min 10 characters, max 100)
     - **Description** (min 50 characters, Markdown supported)
     - **Target Contract** (for technical proposals)
     - **Calldata** (hex format, optional)
     - **Treasury Amount** (if requesting funds)
     - **Recipient Address** (if treasury proposal)
5. **Preview** your proposal before submitting
   - Review all fields
   - Check calldata validity
   - Verify recipient addresses
6. **Submit** (requires transaction confirmation)
7. Voting starts after **1-day delay** (flash loan protection)
8. Voting period: **7 days** (extended from 3 days)
9. Minimum votes required: **5,000 score-points** (quorum)

**Proposal Lifecycle (Enhanced):**
1. **Created** - Proposal submitted, awaiting delay
2. **Pending** - 1-day delay before voting (anti-manipulation)
3. **Active** - 7-day voting period, accept votes
4. **Passed** - Vote succeeded + quorum met
5. **Failed** - Vote failed or quorum not met
6. **Queued** - Passed proposals enter 48-hour timelock
7. **Executable** - Timelock expired, ready to execute
8. **Executed** - Changes applied to contracts
9. **Expired** - Not executed within 7 days of queue

**Timelock Queue (New UI):**
- View all queued transactions in **"Governance"** → **"Timelock Queue"** tab
- Passed proposals wait **48 hours** before execution (reduced from 3 days)
- **Real-time countdown** shows time until executable
- **Visual status indicators**:
  - 🟢 **Ready** - Executable now
  - 🟡 **Pending** - Still in timelock
  - ✅ **Executed** - Completed
  - ❌ **Expired** - Missed execution window
- **One-click execution** when ready (any user can execute)
- Transactions **expire after 7 days** if not executed
- **Bulk execution** for multiple ready proposals
- **Cancel button** for emergency council (if needed)

**Quorum Visualization:**
- Progress bars show **current votes vs required quorum**
- Color-coded indicators:
  - Red: < 25% quorum
  - Yellow: 25-75% quorum
  - Green: 75-100% quorum
  - Blue: > 100% quorum (passed)
- Projected outcome based on current votes
- Historical quorum data for past proposals

**Proposal Templates Benefits:**
- ✅ Faster proposal creation (5 min vs 30 min)
- ✅ Reduced errors (validated inputs)
- ✅ Consistent formatting (easier to read)
- ✅ Built-in safety checks (prevents mistakes)
- ✅ Educational tooltips (learn as you go)

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
**A:** Complete transactions, get endorsed by high-score users, participate in governance, stay active, avoid disputes, and earn badges.

### **Q: How do badges work?**
**A:** Badges are ERC-721 NFTs earned by meeting specific criteria (score thresholds, activity milestones, achievements). Some are permanent, others require maintaining eligibility. Mint them on the Badges page.

### **Q: Can I trade my badges?**
**A:** Some badges are transferable NFTs (e.g., FOUNDING_MEMBER), others are soulbound and cannot be transferred (e.g., COUNCIL_MEMBER). Check individual badge details.

### **Q: What are XP and levels for?**
**A:** XP (Experience Points) and levels visualize your reputation growth. Higher levels unlock special badges and increase your standing on the leaderboard. They're calculated from your ProofScore: `XP = (Score - 540) × 10, Level = XP ÷ 100`.

### **Q: How does payroll streaming work?**
**A:** Employers deposit funds into a stream contract that releases tokens continuously per-second to employees. Employees can withdraw earned amounts anytime without waiting for "payday". Streams support VFIDE, USDC, USDT, DAI, and WETH.

### **Q: Can I create payroll streams for non-VFIDE tokens?**
**A:** Yes! The payroll system supports 5 tokens: VFIDE, USDC, USDT, DAI, and WETH. Select your preferred token when creating the stream.

### **Q: What happens if my payroll stream runs out of funds?**
**A:** You'll receive notifications when runway drops below 30 days. The stream stops when funds are depleted, but you can top-up anytime to extend it. Employees keep all earned amounts.

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
**A:** Currently **Base Sepolia (testnet)**. Mainnet on Base, Polygon, and zkSync planned for Q2 2025.

### **Q: How do I withdraw to USD?**
**A:** Use merchant portal to convert VFIDE → stablecoin (USDC) → off-ramp to bank via:
- Coinbase
- Kraken
- Binance
- Local exchanges

---

## Troubleshooting

### **"Transaction Failed"**
- **Check gas:** Ensure you have ETH on Base (or your selected network) for gas
- **Check balance:** Verify vault has sufficient VFIDE
- **Check locks:** Ensure vault isn't guardian-locked
- **Check score:** Some actions require minimum ProofScore

### **"Vault Not Found"**
- Create vault first (see section 2)
- Ensure connected to Base Sepolia network (for testnet)
- Clear browser cache and reconnect wallet

### **"Insufficient ProofScore"**
- Current requirement not met
- Build reputation through usage
- Get endorsements from high-score users
- Wait for activity score to increase
- Earn badges for bonus points

### **"Circuit Breaker Active"**
- System emergency pause
- Wait for DAO announcement
- Monitor official channels
- Your funds are safe

### **"Badge Mint Failed"**
- Check eligibility requirements
- Verify you haven't already minted this badge
- Ensure sufficient gas (ETH) for minting
- Try again after refreshing page

### **"Payroll Stream Creation Failed"**
- Verify sufficient token balance
- Check token approval (may need to approve first)
- Ensure recipient address is valid
- Try increasing gas limit

---

## Safety Tips

1. ✅ **Set up guardians immediately** after creating vault
2. ✅ **Never share private keys** with anyone (not even guardians)
3. ✅ **Verify merchant addresses** before large payments
4. ✅ **Start with small test transactions**
5. ✅ **Enable 2FA** on your wallet app
6. ✅ **Use hardware wallet** for large holdings
7. ✅ **Keep ProofScore high** to earn trust
8. ✅ **Earn badges** to boost reputation
9. ✅ **Monitor payroll streams** for low runway alerts
10. ✅ **Vote thoughtfully** to avoid governance fatigue
11. ❌ **Never rush** - scammers use urgency tactics
12. ❌ **Never click unknown links** - phishing is common
13. ❌ **Never promise returns** - it's not an investment

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
- Smart Contract Docs: [CONTRACTS.md](CONTRACTS.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Security Model: [SECURITY.md](SECURITY.md)
- Developer Guide: [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md)
- Deployment Guide: [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)

---

## Glossary

**Vault:** Smart contract wallet that holds your VFIDE tokens securely

**ProofScore:** Your on-chain reputation score (0-1000)

**Guardian:** Trusted address that can help recover your vault

**Commitment Period:** Time-based anti-dump mechanism (NOT a lockup)

**Burn Fee:** Deflationary transfer fee (0.25%-5%) that reduces supply

**DAO:** Decentralized Autonomous Organization (community governance)

**Base/Polygon/zkSync:** Layer 2 scaling solutions for Ethereum (low fees, fast)

**Timelock:** Delay mechanism for DAO proposals (48 hours)

**Circuit Breaker:** Emergency pause system for security

**Next of Kin:** Backup recovery address for vault access

**XP (Experience Points):** Reputation metric calculated from ProofScore

**Level:** Gamification tier based on XP (Level = XP ÷ 100)

**Badges:** ERC-721 NFT achievements earned through activity/milestones

**Leaderboard:** Global ranking of users by ProofScore

**Payroll Streaming:** Continuous per-second salary payments

**Proposal Templates:** Pre-configured governance proposal formats

**Quorum:** Minimum votes required for proposal to pass (5,000 score-points)

**Governance Fatigue:** Voting power reduction from frequent participation

---

## Changelog (Version 2.0)

### New Features:
- 🎮 **Gamification system** (badges, XP, levels, leaderboard)
- 📊 **Enhanced governance** (proposal templates, timelock queue UI, quorum viz)
- 💰 **Multi-asset payroll** (USDC, USDT, DAI, WETH support)
- 📈 **Leaderboard rankings** with real-time activity feed
- 🎖️ **28+ badges** across 7 categories
- 🕒 **Timelock queue dashboard** with countdowns
- 📝 **Proposal templates** for easier governance participation
- 🔔 **Payroll notifications** for low runway alerts
- 📜 **Stream history tracking** with full audit logs

### Improvements:
- Lowered governance requirements (100+ score instead of 540+)
- Extended voting period (7 days instead of 3 days)
- Reduced timelock delay (48 hours instead of 3 days)
- Enhanced ProofScore tiers (6 tiers with better visualization)
- Improved merchant rebate system
- Better error messages and troubleshooting

---

**Welcome to the future of finance. Welcome to VFIDE.** 🚀
