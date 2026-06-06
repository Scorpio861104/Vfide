# VFIDE Full Repo Audit — Vault, WalletConnect, and Deployment Logic

## Scope

This pass re-audited the wallet/vault/deployment path from source evidence after the prior deployment-health pass incorrectly treated WalletConnect as generally optional. The audit focused on the actual vault flow, wallet providers, env validation, health probes, CI stubs, docs, auth/session, contracts, scripts, and tests.

## Confirmed source evidence

### Vault creation is wallet-gated and transaction-signed

`hooks/useVaultHub.ts` imports wagmi wallet primitives (`useAccount`, `useWriteContract`, `useChainId`, `useSwitchChain`) and derives `userAddress` from `useAccount()`. Its `createVault()` path refuses to run without a connected wallet (`Connect your wallet to create a vault.`), validates VaultHub config, switches to the operational chain when needed, simulates `VaultHub.ensureVault(userAddress)`, calls `writeContractAsync()` for `ensureVault`, waits for the transaction receipt, and refetches `vaultOf`. This proves vault creation is not a server-only or env-only action; it requires a connected wallet and a wallet-signed transaction.

### The required onboarding chapter depends on RainbowKit/wagmi wallet connection

`components/wizard/chapters/CreateVaultChapter.tsx` is explicitly documented as a required chapter that calls `VaultHub.ensureVault` via `useVaultHub.createVault`. It imports `useAccount`, `ConnectButton`, `VfideConnectButton`, and `useVaultHub`. When disconnected it disables the primary action and renders `VfideConnectButton`; when on the wrong chain it uses `switchToPreferredChain()` plus `ConnectButton.Custom` for manual chain switching. The UI copy says the user must connect a wallet to create a vault.

### The app wallet stack intentionally remains RainbowKit/wagmi

`lib/providers/Web3Providers.tsx` wraps non-marketing routes with `WagmiProvider` and `RainbowKitProvider`, then runs `WalletAuthManager`. Comments explicitly state the wallet stack intentionally remains RainbowKit and should not be swapped to `VFIDEWalletProvider` until `ensureVaultExists` is implemented against VaultHub. This ties the production app flow to the RainbowKit/wagmi connector stack.

### Wallet auth/session also depends on connected wallet signatures

`lib/providers/Web3Providers.tsx` triggers `useAuth().authenticate()` after `useAccount()` reports a connected address. `hooks/useAPI.ts` requests a challenge for the connected address and signs it with `useSignMessage`. `app/api/auth/challenge/route.ts` issues chain-bound SIWE challenges for supported chain IDs, and `app/api/auth/route.ts` validates SIWE challenge binding and verifies the wallet signature before issuing the httpOnly JWT. `app/api/user/state/route.ts` then requires the query address to match the authenticated wallet.

### Config drift existed around WalletConnect and health checks

On `main`, `lib/wagmi.ts` disabled the WalletConnect connector when no real project id was present, which is acceptable for local/test determinism, but `lib/validateProduction.ts` described WalletConnect as optional and did not fail strict production validation when both `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` and `NEXT_PUBLIC_WAGMI_PROJECT_ID` were missing or placeholder values. This contradicted the vault-capable deployment requirements documented in `.env.*.example`, `README.md`, and `docs/guides/VERCEL-DEPLOYMENT-GUIDE.md`.

On `main`, `/api/health` required stale `NEXT_PUBLIC_CONTRACT_ADDRESS` even though runtime contract resolution uses canonical keys such as `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS` and `NEXT_PUBLIC_VAULT_HUB_ADDRESS` via `lib/contracts.ts` and `lib/chains.ts`. CI workflows also populated the stale key for health readiness.

## Fixes applied

- Kept local/dev/test WalletConnect fallback behavior in `lib/wagmi.ts`, but corrected comments so it is not framed as production optional.
- Added strict-production validation in `lib/validateProduction.ts` requiring at least one real WalletConnect/RainbowKit project ID via `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` or `NEXT_PUBLIC_WAGMI_PROJECT_ID`, rejecting known placeholders.
- Updated `/api/health` to require canonical vault-capable env keys: `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`, `NEXT_PUBLIC_VAULT_HUB_ADDRESS`, plus either WalletConnect project-id key.
- Updated health tests to use canonical contract env keys and added regressions for missing WalletConnect project ID and `NEXT_PUBLIC_WAGMI_PROJECT_ID` fallback.
- Replaced stale CI health env stubs from `NEXT_PUBLIC_CONTRACT_ADDRESS` to `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS` + `NEXT_PUBLIC_VAULT_HUB_ADDRESS`.
- Cleaned `.env.local.example` and `docs/README_FRONTEND.md` language so deploy/runtime docs no longer claim WalletConnect is optional for production vault onboarding.

## Verification

Verification artifacts are recorded in `audit/full-vault-walletconnect/checks/`.
