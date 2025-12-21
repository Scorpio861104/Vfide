# VFIDE Architecture - Simple Overview

## Core Philosophy
VFIDE = **V**erified **F**inance for **IDE**ntity - A commerce token with built-in trust scoring.

---

## The 5-Minute Explanation

### What is VFIDE?
A token where your **reputation affects your fees**. Good behavior = lower costs.

### How does it work?

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREATE VAULT ──► 2. GET PROOFSCORE ──► 3. TRADE/PAY        │
│        ↓                    ↓                     ↓             │
│   Safe storage         Reputation            Lower fees        │
│                        (0-100%)              (0.25%-5%)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Contract Map (Just 6 Core Contracts)

```
                    ┌──────────────────┐
                    │   VFIDEToken     │  ◄── THE TOKEN
                    │   (ERC-20)       │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   VaultHub   │    │     Seer     │    │  BurnRouter  │
│  (Accounts)  │    │ (Reputation) │    │   (Fees)     │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   User Vaults         ProofScore           Fee Split
   (Custody)           (0-10000)         (Burn/Eco/Charity)
```

### What Each Does:

| Contract | Purpose | User Interaction |
|----------|---------|------------------|
| **VFIDEToken** | The token itself | Transfer, hold |
| **VaultHub** | Creates secure wallets | Create vault, manage funds |
| **Seer** | Calculates trust score | View score, earn reputation |
| **BurnRouter** | Calculates fees based on score | Automatic on transfers |
| **EcosystemVault** | Distributes rewards | Claim merchant/council rewards |
| **Commerce** | Handles purchases | Buy/sell with escrow |

---

## ProofScore (Your Reputation)

**Scale: 0-10000** (displayed as 0-100%)

### How You Earn Score:
| Action | Points | Category |
|--------|--------|----------|
| Create a vault | +500 | Setup |
| Complete purchase | +2 | Commerce |
| Be a merchant | +5/sale | Commerce |
| Get endorsed | Varies | Social |
| Hold tokens | Varies | Stability |
| DAO participation | Varies | Governance |

### How Score Affects You:
| Score | Fee | Status |
|-------|-----|--------|
| 0-200 | 5% | Untrusted |
| 2000 | 4% | Building trust |
| 5000 | 2.5% | Average |
| 8000 | 0.75% | Trusted |
| 9000+ | 0.25% | Highly trusted |

---

## Fee Breakdown

When you transfer VFIDE, fees are automatically calculated:

```
Total Fee (0.25% - 5%)
        │
        ├── 85.7% → BURNED (reduces supply)
        │
        ├── 11.4% → Ecosystem (development, rewards)
        │
        └── 2.9%  → Sanctum (charity)
```

**Commerce Payments: 0% Fees!**
- Merchant payments via escrow = no fees
- Only transfer fees apply to speculative trading

---

## Security Features

### For Users:
- **Multi-guardian vaults** - 2-of-N recovery
- **Cooldowns** - Limits rapid withdrawals
- **Freeze capability** - Lock if compromised

### For System:
- **Anti-whale limits** - Max 1% per transfer, 2% wallet cap
- **Daily caps** - Max 2.5% daily movement
- **Burn caps** - Sustainable deflation
- **Circuit breaker** - Emergency pause

---

## Governance (DAO)

```
Token Holders → Proposals → Vote → Execute
                              ↓
                        Timelock (48h delay)
                              ↓
                        Council Oversight
```

**Who can participate:**
- ProofScore ≥ 5400 (54%) for voting
- ProofScore ≥ 6000 (60%) for proposals

---

## Quick Start Checklist

1. ☐ Get VFIDE tokens
2. ☐ Create a vault (through VaultHub)
3. ☐ Your ProofScore starts at 5500 (55%)
4. ☐ Make purchases → Score increases
5. ☐ Hold long-term → Score increases
6. ☐ Lower fees unlock as score grows

---

## FAQ

**Q: Do I need a vault?**
A: Recommended. +500 score bonus, better security.

**Q: What's the minimum score to do things?**
A: No minimum for transfers. 54% for DAO voting. 56% for merchant status.

**Q: How fast do fees burn supply?**
A: Max 500K tokens/day burned. Supply floor at 50M (25% of initial).

**Q: What if I'm a new user with no history?**
A: You start at 50% score (neutral). Fees are ~2.5%. Build trust to lower them.

**Q: Can merchants get paid in stablecoins?**
A: Yes! Enterprise Gateway supports auto-conversion to USDC/USDT.

---

## Contract Addresses (TBD)

| Contract | Address |
|----------|---------|
| VFIDEToken | `0x...` |
| VaultHub | `0x...` |
| Seer | `0x...` |
| BurnRouter | `0x...` |
| EcosystemVault | `0x...` |
| Commerce | `0x...` |

*Addresses will be published after deployment*

---

## Need More Detail?

- **Full Tokenomics**: See [ECONOMICS.md](./ECONOMICS.md)
- **All Contracts**: See [CONTRACTS.md](./CONTRACTS.md)
- **Technical Spec**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security**: See [AUDIT-REPORT.md](./FINAL-AUDIT-REPORT.md)
