# VFIDE — Trust-Based Digital Payment Platform

<div align="center">

**Build Trust. Earn Reputation. Lower Your Fees.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-00FF88?style=for-the-badge)](https://vfide.vercel.app)
[![Multi-Chain](https://img.shields.io/badge/Multi--Chain-Base%20%7C%20Polygon%20%7C%20zkSync-00F0FF?style=for-the-badge)](https://vfide.vercel.app)

</div>

---

## 🌟 What is VFIDE?

VFIDE is a **trust-based payment platform** that rewards good behavior with lower fees. Unlike traditional payment systems where everyone pays the same rate regardless of their history, VFIDE uses your **ProofScore** — a transparent reputation score — to determine your transaction fees.

**The concept is simple:**
- **Be trustworthy → Pay less**
- **Build reputation → Unlock features**
- **Help others → Earn rewards**

---

## 📊 How ProofScore Works

Your **ProofScore** is a number from 0 to 10,000 that represents your reputation in the VFIDE ecosystem. It affects your transaction fees and what features you can access.

### ProofScore Tiers

| Tier | Score Range | Transaction Fee | What You Can Do |
|------|-------------|-----------------|-----------------|
| 🟢 **Elite** | 8,000 – 10,000 | **0.25%** | Everything + Endorse others, Council eligible |
| 🔵 **High Trust** | 7,000 – 7,999 | **1.0%** | Voting + Merchant + Council participation |
| 🟡 **Neutral** | 5,000 – 6,999 | **2.0%** | Voting + Become a Merchant |
| 🟠 **Low Trust** | 3,500 – 4,999 | **3.5%** | Basic transfers only |
| 🔴 **Risky** | 0 – 3,499 | **5.0%** | Limited features, higher fees |

> **New users start at 5,000 (Neutral)** — you have a clean slate to build from!

### How Fees Work

When you transfer VFIDE tokens, a small percentage is automatically burned based on your ProofScore:

```
Example: Sending 1,000 VFIDE
├── Elite (8,000+ score):    Fee = 2.5 VFIDE   (0.25%)
├── High Trust (7,000+):     Fee = 10 VFIDE    (1.0%)
├── Neutral (5,000+):        Fee = 20 VFIDE    (2.0%)
├── Low Trust (3,500+):      Fee = 35 VFIDE    (3.5%)
└── Risky (<3,500):          Fee = 50 VFIDE    (5.0%)
```

**The burned tokens are permanently removed from circulation**, making VFIDE deflationary over time.

---

## 🏆 How to Improve Your ProofScore

Your ProofScore increases when you participate positively in the ecosystem:

| Activity | Points Earned | Notes |
|----------|---------------|-------|
| 🗳️ **Vote on Proposals** | +10-25 | Participate in governance |
| 💬 **Send Messages** | +5-10 | Engage with the community |
| 👍 **Endorse Others** | +15-30 | Vouch for trustworthy users (requires Elite) |
| 💳 **Complete Transactions** | +5-20 | Based on amount and frequency |
| 🏅 **Earn Badges** | +15-50 | Complete achievements |
| 👨‍🏫 **Mentor New Users** | +50 | When your mentee reaches 7,000 score |
| 📅 **Consistent Activity** | +15 | 30-day activity streaks |

### Ways to Lose Score

| Activity | Points Lost | Notes |
|----------|-------------|-------|
| ⚠️ **Failed Transactions** | -5-20 | Canceled or rejected payments |
| 🚫 **Disputes Lost** | -50-200 | Arbitration ruled against you |
| ⏰ **Inactivity** | -5/month | Score decays slowly if inactive |
| 🔴 **Community Reports** | -25-100 | Verified reports from trusted users |

---

## 🔐 Your Personal Vault

Every VFIDE user can create a **personal vault** — a smart contract wallet that holds your VFIDE tokens securely on the blockchain.

### Vault Features

| Feature | Description |
|---------|-------------|
| 💰 **Deposit** | Transfer VFIDE from your wallet to your vault |
| 💸 **Withdraw** | Transfer VFIDE from your vault to any address |
| 🔒 **Security** | Only you can access your vault funds |
| 📊 **Track Balance** | Real-time balance displayed in dashboard |

### How to Use Your Vault

1. **Connect Wallet** — Use MetaMask, Coinbase Wallet, or WalletConnect
2. **Create Vault** — One-time setup (gas fees apply)
3. **Deposit VFIDE** — Approve tokens, then deposit any amount
4. **Withdraw Anytime** — Send to yourself or any address

---

## 🏪 Merchant System

Become a **VFIDE Merchant** to accept payments and build your business on the platform.

### Requirements to Become a Merchant

| Requirement | Details |
|-------------|---------|
| 📈 **Minimum ProofScore** | 5,600 or higher |
| 📝 **Registration** | Submit business name and category |
| ✅ **Verification** | On-chain registration (gas fees apply) |

### Merchant Features

| Feature | Description |
|---------|-------------|
| 💳 **Accept Payments** | Receive VFIDE from customers |
| 📱 **QR Code Payments** | Generate payment QR codes |
| 🔄 **Auto-Convert** | Automatically convert to stablecoins (optional) |
| 💵 **Custom Payout Address** | Receive funds to any wallet |
| 📊 **Sales Analytics** | Track volume, transaction count |
| ⭐ **Customer Reviews** | Build reputation through feedback |

### Merchant Categories

- 🛒 Retail
- 🍔 Food & Beverage
- 💻 Digital Services
- 🎮 Gaming
- 🎨 Art & Collectibles
- 📚 Education
- 🛠️ Professional Services
- Other

---

## 🗳️ Governance & Voting

VFIDE is **community-governed** through a Decentralized Autonomous Organization (DAO). Token holders can propose and vote on changes to the protocol.

### Voting Requirements

| Action | Minimum ProofScore |
|--------|-------------------|
| 🗳️ **Vote on Proposals** | 5,400+ |
| 📝 **Create Proposals** | 7,000+ (Council member) |
| 👥 **Run for Council** | 7,000+ |
| 🎯 **Endorse Candidates** | 8,000+ (Elite) |

### Proposal Types

| Type | Description | Voting Period |
|------|-------------|---------------|
| 🔧 **Parameter Change** | Adjust fees, thresholds | 7 days |
| 💰 **Treasury Spend** | Allocate community funds | 14 days |
| ⚡ **Emergency** | Urgent security fixes | 3 days |
| 🏛️ **Constitution** | Major governance changes | 21 days |

### How Voting Works

1. **Proposal Created** — Council member submits proposal
2. **Discussion Period** — Community discusses (24-48 hours)
3. **Voting Opens** — Eligible users cast votes
4. **Quorum Check** — Minimum participation required
5. **Execution** — Passed proposals are executed on-chain

---

## 👨‍🏫 Mentorship Program

High-trust users can become **Mentors** to help newcomers succeed in the VFIDE ecosystem.

### Mentor Requirements

| Requirement | Details |
|-------------|---------|
| 📈 **Minimum ProofScore** | 7,000+ |
| 🎖️ **Good Standing** | No recent disputes or reports |

### Mentor Benefits

| Benefit | Details |
|---------|---------|
| 🏅 **Exclusive Badge** | "Mentor" badge on your profile |
| ⭐ **Bonus Points** | +50 ProofScore when mentee reaches 7,000 |
| 👥 **Capacity** | Sponsor up to 10 mentees |
| 🚀 **Priority Access** | Early access to new features |

### How Mentorship Works

1. **Register as Mentor** — Requires 7,000+ ProofScore
2. **Accept Mentees** — New users can request sponsorship
3. **Guide & Support** — Help them understand the platform
4. **Earn Rewards** — Get points when they succeed

---

## 🤝 Endorsements & Social Trust

Users can **endorse** each other to build a web of trust throughout the ecosystem.

### Endorsement Categories

| Category | Description |
|----------|-------------|
| 🔧 **Technical** | Skilled in development, smart contracts |
| ✅ **Trustworthy** | Reliable in transactions and commitments |
| 💡 **Helpful** | Assists others in the community |
| 🚀 **Innovative** | Creates valuable contributions |
| 🤝 **Collaborative** | Great team player |

### Endorsement Requirements

| Requirement | Details |
|-------------|---------|
| 📈 **To Give Endorsements** | 8,000+ ProofScore (Elite) |
| 🎯 **To Receive** | Any ProofScore |
| 🏆 **Guardian Status** | 5+ trustworthy endorsements |

---

## 🏅 Badge System

Earn **badges** by completing achievements. Badges increase your ProofScore and show your accomplishments.

### Badge Categories

| Category | Examples |
|----------|----------|
| 📊 **Activity & Streaks** | Daily Active, Streak Master, Power User |
| 🤝 **Trust & Community** | Trusted Endorser, Community Builder, Mentor |
| 💼 **Commerce & Merchants** | Verified Merchant, High Volume Seller |
| 🏛️ **Governance** | Active Voter, Proposal Creator, Council Member |
| 🎯 **Special Achievements** | Early Adopter, Bug Hunter, Ambassador |

### Badge Rarities

| Rarity | Points | Duration | Examples |
|--------|--------|----------|----------|
| ⚪ **Common** | 10-15 | Temporary | Daily Active, First Transaction |
| 🔵 **Rare** | 25-35 | 1 Year | Trusted Endorser, Mentor |
| 🟣 **Epic** | 40-50 | Permanent | Community Builder, Council Member |
| 🟡 **Legendary** | 75-100 | Permanent | Founding Member, Protocol Guardian |

---

## ⛓️ Supported Blockchains

VFIDE is deployed on multiple chains for flexibility and low fees:

| Chain | Network | Status | Best For |
|-------|---------|--------|----------|
| 🔵 **Base** | Coinbase L2 | ✅ Live | Coinbase users, low fees |
| 🟣 **Polygon** | Ethereum L2 | ✅ Live | High speed, low fees |
| ⚡ **zkSync** | ZK Rollup | ✅ Live | Privacy, security |

### Testnet (for testing)

| Chain | Network | Faucet |
|-------|---------|--------|
| 🔵 **Base Sepolia** | Testnet | [Get Test ETH](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) |
| 🟣 **Polygon Amoy** | Testnet | [Get Test MATIC](https://faucet.polygon.technology/) |
| ⚡ **zkSync Sepolia** | Testnet | [Get Test ETH](https://portal.zksync.io/faucet) |

---

## 💰 Token Economics

### VFIDE Token

| Property | Value |
|----------|-------|
| 📛 **Name** | VFIDE Token |
| 🔤 **Symbol** | VFIDE |
| 🔢 **Decimals** | 18 |
| 📊 **Supply** | Deflationary (burns on transfers) |

### Fee Distribution

When you transfer VFIDE tokens, the fee is distributed as follows:

```
Transfer Fee (0.25% - 5% based on ProofScore)
├── 🔥 Burned (60%) — Permanently removed from circulation
├── 🏛️ Treasury (25%) — Community governance fund
└── 🛡️ Security Fund (15%) — Insurance against exploits
```

---

## 🛡️ Security Features

### Smart Contract Security

| Feature | Description |
|---------|-------------|
| 🔒 **Non-Custodial** | You always control your keys |
| ✅ **Audited Contracts** | Third-party security audits |
| 🚨 **Emergency Pause** | Council can pause in emergencies |
| 🔐 **Upgradeable** | Fixes can be deployed if needed |

### Account Security

| Feature | Description |
|---------|-------------|
| 🔑 **Wallet-Based Auth** | No passwords to hack |
| 📱 **Multi-Wallet Support** | MetaMask, Coinbase, WalletConnect |
| 🔄 **Session Management** | Automatic disconnection |
| 🛡️ **Transaction Signing** | All actions require wallet approval |

---

## 🚀 Getting Started

### Step 1: Connect Your Wallet

1. Visit [vfide.vercel.app](https://vfide.vercel.app)
2. Click **"Connect Wallet"**
3. Choose MetaMask, Coinbase Wallet, or WalletConnect
4. Approve the connection in your wallet

### Step 2: Create Your Vault

1. Navigate to the **Vault** page
2. Click **"Create Vault"**
3. Confirm the transaction in your wallet
4. Wait for blockchain confirmation

### Step 3: Get VFIDE Tokens

**Testnet (Free for Testing):**
- Use the faucet to get test tokens
- Available on Base Sepolia, Polygon Amoy, zkSync Sepolia

**Mainnet:**
- Swap on supported DEXs
- Receive from other users

### Step 4: Start Building Trust

1. 🗳️ Vote on governance proposals
2. 💬 Engage with the community
3. 💳 Complete transactions
4. 🏅 Earn badges
5. 👨‍🏫 Consider becoming a mentor

---

## 📱 Mobile Support

VFIDE is fully responsive and works on:

- 📱 **Smartphones** — iPhone, Android
- 📱 **Foldable Devices** — Samsung Z Fold, Z Flip
- 💻 **Tablets** — iPad, Android tablets
- 🖥️ **Desktop** — All modern browsers

---

## ❓ Frequently Asked Questions

<details>
<summary><strong>What happens if my ProofScore drops?</strong></summary>

Your transaction fees will increase based on your new tier. You can always rebuild your score by participating positively in the ecosystem.
</details>

<details>
<summary><strong>Can I lose my vault funds?</strong></summary>

Only you can access your vault. As long as you control your wallet private keys, your funds are safe. Never share your seed phrase!
</details>

<details>
<summary><strong>How long does it take to reach Elite status?</strong></summary>

It depends on your activity level. Consistent daily participation, voting, and positive interactions can help you reach Elite (8,000+) within a few months.
</details>

<details>
<summary><strong>Are there gas fees?</strong></summary>

Yes, blockchain transactions require gas fees paid in the native token (ETH on Base/zkSync, MATIC on Polygon). We've deployed on L2 chains to keep fees minimal.
</details>

<details>
<summary><strong>Is VFIDE available in my country?</strong></summary>

VFIDE is a decentralized protocol accessible globally. However, users are responsible for complying with their local regulations regarding cryptocurrency.
</details>

---

## 📞 Support & Community

| Channel | Link |
|---------|------|
| 🌐 **Website** | [vfide.vercel.app](https://vfide.vercel.app) |
| 📖 **Documentation** | [docs](./docs/) |
| 🐛 **Report Issues** | [GitHub Issues](https://github.com/Scorpio861104/Vfide/issues) |

---

## 📜 License

VFIDE is open-source software. See [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built with ❤️ for the decentralized future**

*Trust is earned, not given. Start building yours today.*

</div>

