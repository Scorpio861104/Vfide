# VFIDE Frontend

The VFIDE frontend is a Next.js 16 application using the App Router, React 19, TypeScript, and Tailwind CSS 4. It provides a complete user interface for the VFIDE decentralized commerce protocol.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later
- npm, yarn, or pnpm
- A Web3 wallet (MetaMask recommended)

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

1. Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Update environment variables:
   - Add your RPC URLs (get free keys from Alchemy or Infura)
   - Add WalletConnect Project ID from https://cloud.walletconnect.com
   - Update contract addresses after deployment

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
frontend/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Homepage
│   ├── merchant/            # Merchant portal
│   ├── pay/                 # Payment checkout
│   ├── trust/               # Trust explorer
│   ├── vault/               # Vault manager
│   ├── guardians/           # Personal guardians management
│   ├── governance/          # DAO governance
│   ├── treasury/            # Treasury dashboard
│   ├── subscriptions/       # Subscription manager
│   ├── profile/             # User profile
│   ├── layout.tsx           # Root layout with Web3Provider
│   └── globals.css          # Global styles
├── components/              # Reusable components
│   ├── GlobalNav.tsx        # Navigation bar
│   ├── Footer.tsx           # Footer
│   └── ConnectWalletButton.tsx  # Wallet connection (SimpleWalletConnect.tsx)
├── contexts/                # React contexts
│   └── Web3Provider.tsx     # wagmi + React Query provider
├── hooks/                   # Custom React hooks
│   ├── useVFIDEBalance.ts   # VFIDE token balance
│   ├── useProofScore.ts     # ProofScore retrieval
│   └── useMerchantStatus.ts # Merchant status check
├── lib/                     # Libraries and utilities
│   ├── wagmi.ts             # wagmi configuration
│   ├── contracts.ts         # Contract addresses and ABIs
│   └── utils.ts             # Helper functions
├── public/                  # Static assets
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
├── next.config.ts           # Next.js configuration
└── tailwind.config.js       # Tailwind CSS configuration
```

## 🎨 Design System

### Theme - "Future-Knight" Aesthetic

The VFIDE design combines bold typography with futuristic cyberpunk elements.

**Color Palette:**
- **Armor Black**: `#1A1A1D` (dark background)
- **Panel Grey**: `#2A2A2F` (cards/panels)
- **Border Grey**: `#3A3A3F` (borders)
- **Cyber Cyan**: `#00F0FF` (primary accent)
- **Accent Blue**: `#0080FF` (secondary accent)
- **Parchment**: `#F5F3E8` (primary text)
- **Muted Grey**: `#A0A0A5` (secondary text)
- **Success Green**: `#50C878`
- **Warning Orange**: `#FFA500`
- **Danger Red**: `#C41E3A`

**Typography:**
- **Medieval**: Cinzel (headings, branding)
- **Cyber**: Orbitron (body, UI elements)

### Component Patterns

All pages follow consistent patterns:
- Sticky navigation bar with wallet connection
- Hero section with page title
- Grid-based card layouts
- Responsive design (mobile-first)
- Hover effects and transitions
- Consistent spacing and borders

## 🔌 Web3 Integration

### wagmi Configuration

The app uses wagmi v3 for blockchain interactions:
- **Chains**: Ethereum, Polygon, Arbitrum, Sepolia (testnet)
- **Connectors**: MetaMask (injected), WalletConnect, Coinbase Wallet

### Contract Interactions

All contract ABIs are defined in `lib/contracts.ts`. Custom hooks in `hooks/` provide easy access to:
- Token balances
- ProofScore data
- Merchant status
- Vault information

### Example Usage

```tsx
import { useAccount } from 'wagmi'
import { useVFIDEBalance } from '@/hooks/useVFIDEBalance'
import { useProofScore, getScoreTier } from '@/hooks/useProofScore'

function MyComponent() {
  const { address } = useAccount()
  const { balance } = useVFIDEBalance(address)
  const { score } = useProofScore(address)
  const tier = getScoreTier(score)
  
  return (
    <div>
      <p>Balance: {balance?.toString()} VFIDE</p>
      <p>ProofScore: {score} ({tier})</p>
    </div>
  )
}
```

## 📄 Pages Overview

### Homepage (`/`)
- Hero section with VFIDE branding
- Feature cards (Payments, Trust, Vaults, Guardians, Governance, Treasury)
- "How It Works" section
- Trust metrics
- Call-to-action

### Merchant Portal (`/merchant`)
- Dashboard with sales stats
- Payment link generator
- QR code generation
- Recent transactions
- Merchant ProofScore display

### Payment Checkout (`/pay`)
- Merchant information
- Amount display
- Payment method selection (VFIDE, USDC, USDT)
- Fee breakdown
- Secure payment button
- Escrow information

### Trust Explorer (`/trust`)
- ProofScore search
- Score breakdown and components
- Leaderboard
- Tier information

### Vault Manager (`/vault`)
- Balance overview
- Deposit/withdraw actions
- Guardian management (2/3 multisig)
- Security features
- Transaction history

### Guardians (`/guardians`)
- Personal guardian management (trusted contacts for vault recovery)
- Next of Kin designation
- Recovery chain setup
- Pending guardian actions

### DAO Governance (`/governance`)
- Voting power display
- Active proposals
- Vote FOR/AGAINST functionality
- Governance fatigue tracker

### Treasury Dashboard (`/treasury`)
- Total treasury balance
- Sustainability ratio
- Fee split (35% burn, 20% Sanctum Fund, 15% DAO payroll, 20% merchant pool, 10% headhunter pool)
- Vault balances
- Recent transactions

### Subscriptions (`/subscriptions`)
- Active subscription list
- Pause/resume/cancel actions
- Recurring payment management

### Profile (`/profile`)
- User overview
- Quick actions
- Recent activity

## 🛠️ Development Guidelines

### Code Style

- Use TypeScript for all new files
- Follow React best practices (hooks, composition)
- Use `"use client"` directive for client components
- Prefer server components when possible
- Use Tailwind utility classes for styling

### Performance

- Optimize images with Next.js Image component
- Use dynamic imports for heavy components
- Minimize client-side JavaScript
- Leverage Next.js caching

### Accessibility

- Use semantic HTML
- Include proper ARIA labels
- Ensure keyboard navigation
- Test with screen readers

## 🐛 Known Issues

None currently tracked. See GitHub Issues for bugs and feature requests.

## 🚧 Backlog

- [ ] Implement QR code generation (library installed, needs integration)
- [ ] Add loading states for all async operations
- [ ] Implement error boundaries
- [ ] Add transaction confirmation modals
- [ ] Create reusable form components
- [ ] Add unit tests
- [ ] Add E2E tests with Playwright
- [ ] Optimize bundle size
- [ ] Add analytics (PostHog/Mixpanel)
- [ ] Implement real-time updates (WebSocket/polling)
- [ ] Add notification system
- [ ] Create admin dashboard

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [wagmi Documentation](https://wagmi.sh)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)

## 📝 License

See main repository LICENSE file.
