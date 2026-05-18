# Environment Contract Address Matrix

This matrix aligns contract address env keys used by validation and runtime wiring.

## Required By `validate:env` (blocking)

- `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`
- `NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_VAULT_HUB_ADDRESS`
- `NEXT_PUBLIC_DAO_ADDRESS`
- `NEXT_PUBLIC_SEER_ADDRESS`
- `NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS`
- `NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS`
- `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS`
- `NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS`
- `NEXT_PUBLIC_DEV_VAULT_ADDRESS`

## Required By Runtime `lib/contracts.ts` (warnings/errors if missing)

- `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`
- `NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS`
- `NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS`
- `NEXT_PUBLIC_VAULT_HUB_ADDRESS`
- `NEXT_PUBLIC_SEER_ADDRESS`
- `NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS`
- `NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS`
- `NEXT_PUBLIC_SEER_VIEW_ADDRESS`
- `NEXT_PUBLIC_DAO_ADDRESS`
- `NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS`
- `NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS`
- `NEXT_PUBLIC_BADGE_NFT_ADDRESS`
- `NEXT_PUBLIC_SECURITY_HUB_ADDRESS`
- `NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS`
- `NEXT_PUBLIC_PANIC_GUARD_ADDRESS`
- `NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS`
- `NEXT_PUBLIC_BURN_ROUTER_ADDRESS`
- `NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS`
- `NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS`
- `NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS`
- `NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS`
- `NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS`
- `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS`
- `NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS`
- `NEXT_PUBLIC_DEV_VAULT_ADDRESS`
- `NEXT_PUBLIC_SEER_SOCIAL_ADDRESS`
- `NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS`
- `NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS`
- `NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS`

## Operational Notes

- For local feature development, placeholder addresses can be used when contract calls are not exercised.
- For staging/production, every runtime key above should be set to deployed addresses to avoid runtime call failures.
- Keep `.env.local` synchronized with deployment manifests after each deployment batch.

## Multi-Chain Deployments (v19.10 DOCS-1)

When VFIDE is deployed to more than one chain (Base + Polygon + zkSync, for example), every contract address envvar **must** be set in chain-scoped form. Without this, the frontend silently falls back to the unscoped envvar — which holds the address from a different chain — and transactions fail or land in the wrong place.

### Pattern

For each contract envvar listed above, the chain-scoped form is:

```
NEXT_PUBLIC_<CONTRACT>_ADDRESS_<chainId>
```

Examples:

```bash
# Single-chain deploy (Base mainnet only, default fallback works)
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=0xabc...

# Multi-chain deploy: set BOTH the unscoped (acts as default) AND each chain's scoped form
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=0xabc...
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_8453=0xabc...      # Base mainnet
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_137=0xdef...       # Polygon
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_324=0xghi...       # zkSync Era
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_84532=0xjkl...     # Base Sepolia
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_80002=0xmno...     # Polygon Amoy
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_300=0xpqr...       # zkSync Sepolia Testnet
```

This uses the `resolveChainScopedAddress()` machinery in `lib/contracts.ts`. The chain-scoped envvar wins; the unscoped form is a default fallback.

### Supported chain IDs

| Chain | ID | Notes |
|---|---|---|
| Base mainnet | 8453 | Primary mainnet target |
| Base Sepolia | 84532 | Primary testnet |
| Polygon mainnet | 137 | Future target |
| Polygon Amoy | 80002 | Polygon testnet |
| zkSync Era | 324 | Future target — see notes below |
| zkSync Sepolia Testnet | 300 | zkSync testnet — see notes below |

### Required envvar for multi-chain deploys

In addition to chain-scoped addresses, set the supported-chains list:

```bash
NEXT_PUBLIC_SUPPORTED_CHAIN_IDS=8453,137,324
```

This:
- Tells `lib/contracts.ts` that this is a multi-chain deploy.
- Tells `lib/security/siweChallenge.ts` to allow auth challenges for these chains and reject unknown ones (v19.7 XCHAIN-3).
- Tells `lib/indexer/multiChain.ts` how many indexer processes to spawn (v19.11 XCHAIN-2).

### zkSync-specific note (XCHAIN-4)

`CardBoundVaultDeployer.predict()` reverts on zkSync chains 324 and 300 with `CBD_zkSync_predict_off-chain_only` — the EVM CREATE2 formula doesn't apply to zkSync's bytecode-hash-based scheme. Use `lib/crypto/zkSyncAddress.ts.predictVaultAddress()` off-chain instead. Frontend code calling `predict()` must check chain ID first.

### Validation

Before launching a multi-chain deploy, run:

```bash
npm run -s validate:env -- --multi-chain
```

This checks that every contract has a chain-scoped address for every chain in `NEXT_PUBLIC_SUPPORTED_CHAIN_IDS`. Missing entries fail the check.
