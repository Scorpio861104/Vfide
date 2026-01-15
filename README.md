# VFIDE - Trust-Based Web3 Payment Protocol

<div align="center">

![VFIDE Logo](https://via.placeholder.com/150x150/1e3a8a/ffffff?text=VFIDE)

**A revolutionary Web3 platform combining trust-based payments with social proof and decentralized governance**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Architecture](#architecture) • [Contributing](#contributing)

</div>

---

## 🌟 Overview

VFIDE is a comprehensive Web3 platform that reimagines digital payments through trust-based mechanisms, social proof scoring, and community governance. Built on Base, Polygon, and zkSync networks, VFIDE enables secure, transparent, and community-driven financial interactions.

### Key Highlights

- 🔐 **Secure Smart Vaults** - Guardian-protected asset management with recovery mechanisms
- 💰 **Trust-Based Payments** - Escrow system with proof-of-score endorsements
- 🎮 **Gamified Experience** - Quest system with XP, levels, and rewards
- 🏛️ **DAO Governance** - Community-driven platform decisions
- 📊 **Real-Time Analytics** - Comprehensive dashboard and insights
- 🌐 **Multi-Chain Support** - Seamlessly operate across Base, Polygon, and zkSync

---

## ✨ Features

### 🔒 Vault System
- **Smart Vaults** with time-lock protection
- **Guardian Network** for account recovery
- **Inheritance Management** (Next of Kin)
- **Security Events** monitoring and alerts
- **Multi-signature** support for enhanced security

### 💳 Payment Protocol
- **Escrow System** with automatic release
- **Proof Score** based trust verification
- **Payment Requests** with memo support
- **Transaction History** with detailed tracking
- **Fee Optimization** with burn mechanism (3.2% total)

### 🎯 Quest & Rewards
- **Daily & Weekly Quests** with progressive difficulty
- **XP System** with level progression
- **Achievement Badges** and milestones
- **Leaderboards** with monthly rankings
- **Reward Distribution** with anti-farming protection

### 🏪 Merchant Portal
- **Business Registration** with KYC verification
- **Payment Processing** with low fees
- **Analytics Dashboard** with revenue insights
- **Customer Management** with transaction history

### 🗳️ Governance
- **Proposal Creation** with voting power
- **Multi-choice Voting** system
- **Execution Queue** with timelock
- **Delegation** of voting rights
- **Governance Analytics** and history

### 🌐 Social Features
- **Posts & Stories** (24-hour expiry)
- **Endorsements** with proof-of-trust
- **Activity Feed** with real-time updates
- **Direct Messaging** with end-to-end encryption
- **Friend System** with connection management

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+ database
- **MetaMask** or compatible Web3 wallet
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/Scorpio861104/Vfide.git
cd Vfide

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Initialize database
psql $DATABASE_URL < init-db.sql

# Run database migrations
cd migrations && npm install && npm run migrate:up && cd ..

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Docker Compose (Recommended)

```bash
# Start all services (app, database, Redis, WebSocket)
docker-compose up

# The app will be available at http://localhost:3000
```

---

## 📖 Documentation

### User Guides
- **[Quick Reference](QUICK-REFERENCE.md)** - Essential features and shortcuts
- **[Wallet Integration Guide](WALLET-INTEGRATION-GUIDE.md)** - Connect and manage wallets
- **[Vault Guide](WALLET-VAULT-AUDIT.md)** - Secure your assets with Smart Vaults
- **[Merchant Portal Guide](MERCHANT-PORTAL-GUIDE.md)** - Set up your business
- **[Governance Guide](GOVERNANCE-IMPLEMENTATION-GUIDE.md)** - Participate in DAO decisions

### Developer Documentation
- **[API Reference](COMPLETE-BACKEND-FEATURES.md)** - Complete API documentation
- **[Architecture Overview](COMPLETE-INFRASTRUCTURE-SUMMARY.md)** - System design and components
- **[Testing Strategy](TESTING_STRATEGY.md)** - Unit, integration, and E2E tests
- **[Deployment Guide](VERCEL-DEPLOYMENT-GUIDE.md)** - Production deployment

### Technical Guides
- **[Security Audit](CRYPTO-FINANCIAL-AUDIT.md)** - Crypto and financial security
- **[Responsive Design](RESPONSIVE-DESIGN-AUDIT.md)** - Mobile-first approach
- **[Network Configuration](NETWORK-CONNECTION-FIX.md)** - Multi-chain setup
- **[Database Migrations](migrations/README.md)** - Schema version control

📚 **[Complete Documentation Index](docs/README.md)** - All guides and references

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4 + Framer Motion
- **Web3:** wagmi v2, RainbowKit, viem
- **State Management:** TanStack Query
- **Testing:** Jest, Playwright, Testing Library

**Backend**
- **Runtime:** Node.js with Next.js API Routes
- **Database:** PostgreSQL 15+ with connection pooling
- **Real-time:** Socket.IO for WebSocket connections
- **Caching:** Redis 7 for rate limiting and sessions
- **Monitoring:** Sentry (optional), structured logging

**Smart Contracts**
- **Networks:** Base, Polygon, zkSync (testnet & mainnet)
- **Standards:** ERC-20, ERC-721, ERC-1155
- **Key Contracts:** VaultHub, CommerceEscrow, VFIDE Token, Governance

### Project Structure

```
Vfide/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # Backend API endpoints (36 routes)
│   └── (routes)/          # Frontend pages
├── components/            # React components (200+)
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   ├── wallet/           # Wallet and vault components
│   └── features/         # Feature-specific components
├── lib/                   # Utility libraries and helpers
│   ├── contracts/        # Smart contract ABIs and addresses
│   ├── hooks/            # Custom React hooks (50+)
│   └── utils/            # Helper functions
├── migrations/            # Database migration scripts
├── websocket-server/      # Standalone WebSocket server
├── docs/                  # Comprehensive documentation
└── __tests__/            # Test suites
```

### Database Schema

42+ tables covering:
- **User Management:** users, profiles, sessions
- **Vault System:** vaults, guardians, recovery_events, transactions
- **Commerce:** payment_requests, transactions, escrow_events
- **Social:** posts, stories, endorsements, messages
- **Gamification:** quests, achievements, badges, leaderboard
- **Governance:** proposals, votes, delegation
- **Merchant:** merchants, merchant_kyc, merchant_transactions
- **Analytics:** analytics_events with indexed queries

---

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure the following:

#### Core Settings
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vfide

# Network Mode
NEXT_PUBLIC_IS_TESTNET=true          # true for testnet, false for mainnet
NEXT_PUBLIC_DEFAULT_CHAIN=base       # base, polygon, or zksync
```

#### Blockchain RPCs
```bash
# Testnet RPCs
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_ZKSYNC_SEPOLIA_RPC=https://sepolia.era.zksync.dev

# Mainnet RPCs
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org
NEXT_PUBLIC_POLYGON_RPC=https://polygon-rpc.com
NEXT_PUBLIC_ZKSYNC_RPC=https://mainnet.era.zksync.io
```

See `.env.example` for complete configuration options.

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Specific test suites
npm run test:mobile          # Mobile responsiveness
npm run test:contract        # Contract interactions
npm run test:security        # Security tests
npm run test:accessibility   # A11y tests

# All tests
npm run test:all
```

### Test Coverage

- **Unit Tests:** 200+ test suites
- **Integration Tests:** API and database
- **E2E Tests:** Critical user flows
- **Security Tests:** Auth and validation
- **Accessibility Tests:** WCAG 2.1 AA

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NEXT_PUBLIC_IS_TESTNET=false`
- [ ] Configure production database with SSL
- [ ] Set strong `JWT_SECRET`
- [ ] Enable error tracking (Sentry)
- [ ] Configure CORS origins
- [ ] Run database migrations
- [ ] Set up CI/CD

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

See [VERCEL-DEPLOYMENT-GUIDE.md](VERCEL-DEPLOYMENT-GUIDE.md) for detailed instructions.

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run test:all`
5. Submit a pull request

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Conventional commits for history
- 100% test coverage for new features

---

## 📊 Project Status

### Current Version: 2.0.0

**Production Ready** ✅

- ✅ Core functionality (36 API endpoints)
- ✅ Smart contract integration (15+ contracts)
- ✅ Multi-chain support (Base, Polygon, zkSync)
- ✅ Wallet & Vault system (100%)
- ✅ Quest & Gamification
- ✅ Social features
- ✅ Merchant portal with KYC
- ✅ DAO governance
- ✅ Responsive design (320px-3840px+)
- ✅ Comprehensive testing (200+ tests)
- ✅ Complete documentation (140,000+ words)

### Performance Metrics

- **Lighthouse Score:** 95+ (mobile & desktop)
- **Test Coverage:** 85%+
- **Load Time:** <2s on 3G
- **Accessibility:** WCAG 2.1 AA

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Website:** [https://vfide.com](https://vfide.com)
- **Documentation:** [https://docs.vfide.com](https://docs.vfide.com)
- **Discord:** [https://discord.gg/vfide](https://discord.gg/vfide)
- **Twitter:** [@VFIDEProtocol](https://twitter.com/VFIDEProtocol)
- **GitHub:** [https://github.com/Scorpio861104/Vfide](https://github.com/Scorpio861104/Vfide)

---

## 📞 Support

Need help?

- **Documentation:** Check our [comprehensive guides](docs/)
- **Issues:** Open a [GitHub Issue](https://github.com/Scorpio861104/Vfide/issues)
- **Discord:** Join our [community server](https://discord.gg/vfide)
- **Email:** support@vfide.com

---

<div align="center">

**[⬆ back to top](#vfide---trust-based-web3-payment-protocol)**

Made with 💙 by the VFIDE Community

</div>
