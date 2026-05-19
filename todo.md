# Frontend Fix Plan — Base Default & Wallet Buttons

## Issue 1: Gathering zkSync on frontend should be Base

### Root Causes
- [x] zkSync testnet contracts were hardcoded in `lib/chains.ts` while Base uses env vars
      → `isChainReady('zksync')` returned `true` even with no env set; `isChainReady('base')` returned `false`
- [x] `getReadyChains()` had no ordering guarantee — zkSync could surface before Base
- [x] `RainbowKitProvider` had no `initialChain` prop — defaults weren't anchored to Base
- [x] `NetworkWarning.tsx` `switchChain` type assertion was too narrow (only `84532 | 8453`)

### Fixes Applied
- [x] `lib/chains.ts`: Removed hardcoded zkSync testnet addresses — now env-var driven like Base
- [x] `lib/chains.ts`: Updated `getReadyChains()` to always sort Base first
- [x] `lib/chains.ts`: Added `getPrimaryChain()` helper that always returns Base when ready
- [x] `lib/__mocks__/chains.ts`: Synced mock with the same changes
- [x] `lib/providers/Web3Providers.tsx`: Added `initialChain={CURRENT_CHAIN_ID}` to `RainbowKitProvider`
- [x] `components/ui/NetworkWarning.tsx`: Widened `switchChain` type to all 6 supported chain IDs

## Issue 2: Not all wallet buttons are working

### Root Causes
- [x] `components/wallet/ChainSelector.tsx` was missing (only test file existed)
- [x] `components/wallet/WalletSwitcher.tsx` used only injectedConnector — failed on mobile/no-MM
- [x] Multiple places used raw `<ConnectButton />` instead of the canonical `<VfideConnectButton />`
- [x] "Add Wallet" and "Switch" buttons had no disabled state when no connector was available

### Fixes Applied
- [x] Created `components/wallet/ChainSelector.tsx` — mobile-safe, overflow-proof dropdown
- [x] `components/wallet/WalletSwitcher.tsx`: Smart connector fallback chain (EIP-6963 → MM → injected → any)
- [x] `components/wallet/WalletSwitcher.tsx`: Add/Switch buttons show disabled state with no connector
- [x] `components/gamification/DailyQuestsPanel.tsx`: `<ConnectButton />` → `<VfideConnectButton size="md" />`
- [x] `components/settings/AccountSettings.tsx`: Same replacement
- [x] `components/wizard/VaultSetupWizard.tsx`: Same replacement
- [x] `components/wizard/chapters/WelcomeChapter.tsx`: Same replacement
- [x] `components/wizard/chapters/CreateVaultChapter.tsx`: Same replacement (keeps ConnectButton.Custom for chain modal)

## Status: All fixes complete ✅
