# VFIDE Frontend

The VFIDE frontend is a Next.js App Router application (TypeScript + React + Tailwind) that powers wallet-connected protocol experiences across finance, commerce, social, governance, and security route groups.

## Quick Start

### Prerequisites

- Node.js 18+
- npm (or equivalent)
- A wallet for Web3 flows (MetaMask, Coinbase Wallet, or WalletConnect-enabled wallet)

### Install

```bash
npm install
```

### Environment

1. Copy `.env.local.example` to `.env.local`.
2. Fill RPC and app environment values.
3. Configure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` only when WalletConnect is required.

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

## Project Structure

```text
app/                         # App Router pages and route groups
├── layout.tsx               # Root app layout
├── (auth)/                  # Wallet-gated authenticated routes
├── (finance)/               # Vault, payroll, treasury, escrow, etc.
├── (commerce)/              # Merchant, checkout, pay, marketplace
├── (social)/                # Feed, messaging, social hub
└── ...

components/                  # Reusable UI and feature components
├── wallet/                  # Wallet UX and network controls
├── layout/                  # WalletGate, navigation, shell components
└── ...

hooks/                       # Feature and protocol hooks
├── useEnhancedWalletConnect.ts
├── useWalletPersistence.ts
├── useVFIDEBalance.ts
├── useProofScore.ts
└── ...

lib/
├── wagmi.ts                 # wagmi/RainbowKit chain + connector config
├── abis/                    # ABI exports + runtime ABI normalization/validation
├── providers/               # CoreProviders + Web3Providers composition
└── ...

providers/                   # Cross-cutting providers (security, notifications)
public/                      # Static assets
```

## Web3 Integration

### Provider Architecture

- `CoreProviders` (`lib/providers/CoreProviders.tsx`) handles non-Web3 app shell concerns.
- `Web3Providers` (`lib/providers/Web3Providers.tsx`) is mounted in wallet-enabled route groups and owns:
  - `WagmiProvider` (with reconnect-on-mount)
  - `QueryClientProvider`
  - `RainbowKitProvider`
  - `SecurityProvider`
  - `useWalletPersistence` lifecycle behavior

This avoids loading wallet state globally on route groups that do not need Web3.

### Networks and Connectors

- Mainnets: Base, Polygon, zkSync Era
- Testnets: Base Sepolia, Polygon Amoy, zkSync Sepolia
- Connectors: injected providers (EIP-6963), MetaMask, Coinbase Wallet, optional WalletConnect

### ABI Source of Truth

- Frontend ABIs live in `lib/abis/`.
- Import from `lib/abis/index.ts` rather than reading ABI JSON files directly.
- ABI index normalizes both plain ABI arrays and artifact-style objects.

## Development Notes

- Use TypeScript for all new UI and hook code.
- Keep route-group provider boundaries intact; avoid introducing duplicate `WagmiProvider` trees.
- Prefer existing hooks/components over creating parallel wallet-connect implementations.
- Preserve wallet-gate behavior in route groups that require connection.

### Implemented Runtime Upgrades

- `components/qr/SmartQR.tsx` now generates standards-compliant QR payloads via real encoder output.
- `components/commerce/MerchantPOS.tsx` now performs concrete digital receipt preparation and delivery flow.
- `components/search/AdvancedSearch.tsx` now executes live `/api/merchant/products` queries with resilient fallback behavior.
- `lib/analytics.ts` now persists client analytics events and forwards ingestion payloads to `/api/analytics`.

## Resources

- https://nextjs.org/docs
- https://wagmi.sh
- https://www.rainbowkit.com/docs
