# VFIDE — Trust-Based Commerce Protocol

<p align="center">
  <img src="marketing/logo-placeholder.png" alt="VFIDE Logo" width="200"/>
</p>

<p align="center">
  <strong>Proof-of-Trust Commerce for Web3</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#security">Security</a>
</p>

---

## Overview

VFIDE is a trust-based commerce protocol built on zkSync Era. Unlike traditional crypto projects that rely on anonymous transactions, VFIDE introduces **ProofScore** — a reputation system that rewards honest behavior and enables trustworthy commerce.

**Core Philosophy:** *Trust is earned through actions, not purchased with wealth.*

## Features

### 🎯 ProofScore System
- Dynamic reputation score (0-10,000) calculated from on-chain behavior
- Higher scores unlock benefits: lower fees, faster settlements, governance power
- Decay mechanism ensures continuous positive behavior
- Badge system for achievements and milestones

### 🛒 Commerce & Escrow
- Trustless merchant-to-customer transactions
- Score-based escrow with adjustable release windows
- Dispute resolution with DAO mediation
- Multi-currency support (VFIDE + stablecoins)

### 🗳️ Governance
- Score-weighted voting (more trust = more influence)
- Council elections with term limits
- Timelocked treasury operations
- Governance fatigue prevention

### 🔐 Security
- User-controlled vaults with guardian recovery
- Emergency controls and circuit breakers
- Multi-sig treasury operations
- Comprehensive audit coverage

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VFIDE ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  VFIDEToken │  │    Seer     │  │  VaultHub   │         │
│  │  (ERC-20)   │  │ (ProofScore)│  │  (Wallets)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│  ┌──────┴────────────────┴────────────────┴──────┐         │
│  │              ProofScoreBurnRouter             │         │
│  │         (Fee Distribution & Burns)            │         │
│  └───────────────────────────────────────────────┘         │
│         │                │                │                 │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐         │
│  │  Commerce   │  │     DAO     │  │   Vaults    │         │
│  │   Escrow    │  │  Governance │  │  (Treasury) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- Foundry (for contract development)

### Installation

```bash
# Clone the repository
git clone https://github.com/Scorpio861104/Vfide.git
cd Vfide

# Install dependencies
npm install

# Install Foundry dependencies
forge install
```

### Build

```bash
# Compile contracts
forge build

# Run tests
forge test

# Run with verbose output
forge test -vvv
```

### Development

```bash
# Start local development node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

## Documentation

| Document | Description |
|----------|-------------|
| [WHITEPAPER.md](WHITEPAPER.md) | Full technical whitepaper |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture details |
| [CONTRACTS.md](CONTRACTS.md) | Smart contract documentation |
| [ECONOMICS.md](ECONOMICS.md) | Tokenomics and fee structure |
| [USER-GUIDE.md](USER-GUIDE.md) | End-user documentation |
| [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md) | Developer integration guide |
| [SECURITY.md](SECURITY.md) | Security model and practices |

## Smart Contracts

### Core Contracts
| Contract | Description |
|----------|-------------|
| `VFIDEToken` | ERC-20 token with burn mechanics |
| `Seer` | ProofScore calculation engine |
| `VaultHub` | User vault management |
| `ProofScoreBurnRouter` | Fee distribution and burns |

### Commerce Contracts
| Contract | Description |
|----------|-------------|
| `VFIDECommerce` | Escrow and settlement |
| `MerchantPortal` | Merchant registration and payments |
| `EscrowManager` | Dispute resolution |

### Governance Contracts
| Contract | Description |
|----------|-------------|
| `DAO` | Proposal and voting |
| `DAOTimelock` | Execution delays |
| `CouncilElection` | Council management |

## Security

VFIDE takes security seriously:

- ✅ **Comprehensive testing**: 90%+ code coverage
- ✅ **Fuzz testing**: Foundry invariant tests
- ✅ **Static analysis**: Slither, Mythril
- ✅ **Reentrancy protection**: ReentrancyGuard on all state-changing functions
- ✅ **Access control**: Role-based permissions
- ✅ **Timelocks**: All sensitive operations have delays

### Reporting Vulnerabilities

Please report security vulnerabilities to: security@vfide.io

See [SECURITY.md](SECURITY.md) for our full security policy.

## Deployment

### zkSync Era (Mainnet)
```bash
# Set environment variables
cp .env.example .env
# Edit .env with your private key

# Deploy to zkSync Era
npm run deploy:zksync
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

We welcome contributions! Please see our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- 🌐 Website: [vfide.io](https://vfide.io)
- 📖 Docs: [docs.vfide.io](https://docs.vfide.io)
- 🐦 Twitter: [@vfide_official](https://twitter.com/vfide_official)
- 💬 Discord: [discord.gg/vfide](https://discord.gg/vfide)

---

<p align="center">
  Built with ❤️ for the future of trust-based commerce
</p>
