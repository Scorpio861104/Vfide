# VFIDE Testnet Runbook

Single canonical path for getting from a clean repo to "testnet announce-ready."
Every step is idempotent — safe to re-run.

The goal of this runbook is **mainnet parity**: the only difference between
testnet and mainnet should be the network endpoint and the testnet faucet.

---

## 0. Prerequisites

- Node `>=20 <25`, npm `>=10`
- A deployer wallet funded with native gas on the target testnet
- An EOA you control to act as the "bootstrap DAO" (will be replaced by the
  actual DAO contract address during apply-full.ts; do not use a long-lived
  hot key here)
- RPC URL + block-explorer API key for the target chain (Base Sepolia
  recommended for first deploy)

```bash
npm install
```

---

## 1. Configure environment

Copy `.env.example` → `.env` and fill the bootstrap section:

```bash
# Required everywhere
PRIVATE_KEY=0x...                              # deployer
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org  # or your provider's URL
BASESCAN_API_KEY=...

# Bootstrap addresses — for first testnet deploy, all can be the deployer.
# For mainnet, these MUST be set explicitly (no implicit deployer fallback).
ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true        # testnet only
BOOTSTRAP_ADMIN_ADDRESS=0x...
BOOTSTRAP_DAO_ADDRESS=0x...
BOOTSTRAP_BENEFICIARY_ADDRESS=0x...
BOOTSTRAP_TREASURY_SINK_ADDRESS=0x...
BOOTSTRAP_SANCTUM_SINK_ADDRESS=0x...
BOOTSTRAP_BURN_SINK_ADDRESS=0x...
BOOTSTRAP_ECOSYSTEM_SINK_ADDRESS=0x...
BOOTSTRAP_FEE_SINK_ADDRESS=0x...
BOOTSTRAP_POOL_ADMIN_ADDRESS=0x...
BOOTSTRAP_FAUCET_OWNER_ADDRESS=0x...
BOOTSTRAP_LEDGER_ADMIN_ADDRESS=0x...

# Required by VFIDEToken constructor — must be a deployed AdminMultiSig.
# If you don't have one yet, deploy-full.ts will create it before VFIDEToken.

# Testnet-only opt-in for the faucet
DEPLOY_TESTNET_FAUCET=true
```

For mainnet later:
- Set `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=false` (or unset)
- Set `DEPLOY_TESTNET_FAUCET=false` (or unset)
- Fill every `BOOTSTRAP_*_ADDRESS` with a real address — no implicit fallback

---

## 2. Compile + ABI sync

```bash
npx hardhat compile
npm run sync-abis            # copies fresh ABIs to lib/abis/
npm run sync-abis:check      # CI guard — exits non-zero on drift
```

`sync-abis` MUST be run after every compile and before any deploy that the
frontend will talk to. The wagmi layer reads from `lib/abis/`, and stale
ABIs produce silent "function not in ABI" failures at click time.

---

## 3. Deploy

```bash
npm run deploy:full -- --network baseSepolia
```

What happens:
- Layers 1–9 deploy all 28+ contracts in dependency order.
- Each deploy is checkpointed to `.deployments/baseSepolia.json` after
  success, so a mid-run failure can be resumed by re-running the same
  command without losing already-deployed addresses.
- The script enforces:
  - `TREASURY_ADDRESS` is a deployed contract (or `AdminMultiSig` is
    created on the fly via Layer 1)
  - EIP-170 bytecode size on every contract before any tx is sent
  - The faucet only deploys if `isTestnetChain && DEPLOY_TESTNET_FAUCET=true`
- Immediate wiring runs (ProofLedger loggers, GovernanceHooks → DAO, etc.).
- The Faucet ↔ EcosystemVault link is proposed (manager change queued for
  2 days; `faucet.setEcosystemVault` applied immediately).
- 48h-timelocked module DAO transfers and system-exempt proposals are
  queued.

After the deploy completes, the console prints a `.env` block. Copy it into
your `.env` (the `NEXT_PUBLIC_*_ADDRESS` lines).

---

## 4. Wait 48 hours, then finalize

```bash
npm run deploy:full:apply -- --network baseSepolia
```

What this does:
- Confirms each token module setter (`applyVaultHub`, `applyBurnRouter`,
  `applyFraudRegistry`, `applyLedger`).
- Walks the serialized system-exempt schedule (FeeDistributor →
  FraudRegistry → FlashLoan → EcosystemVault). One confirmation + one new
  proposal per run, so this is called every 48h until "All wiring complete"
  prints.
- Calls `Seer.applyDAOChange()`.
- Calls `MerchantPortal.applyDAO()`, `VFIDEFlashLoan.applyDAO()`,
  `VFIDETermLoan.applyDAO()`, `FraudRegistry.applyDAO_FR()`.
- Calls `VaultHub.applyRecoveryApprover()`.
- Calls `EcosystemVault.executeManagerChange()` to grant the faucet
  manager rights.

The first run handles round 1 of the system-exempt schedule. Re-run every
48h. After ~4 runs the script will print:

```
╔══════════════════════════════════════════════════════════════╗
║  ✅  All wiring complete.                                     ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. Fund the testnet faucet

```bash
# Defaults: 100,000 VFIDE + 0.5 ETH
npm run fund-faucet -- --network baseSepolia

# Or with overrides
FAUCET_FUND_VFIDE_AMOUNT=200000 \
FAUCET_FUND_ETH_AMOUNT=1 \
FAUCET_OPERATOR_ADDRESS=0xBackendApiWallet \
npm run fund-faucet -- --network baseSepolia
```

The script:
- Refuses to run on a non-testnet chain
- Refuses to run if `.deployments/<network>.json` doesn't have a faucet
  address (which happens if `DEPLOY_TESTNET_FAUCET=true` was not set at
  deploy time)
- Pre-checks deployer balances before sending
- Optionally adds a backend API wallet as an operator (the address that
  will call `claim()` on behalf of users)

The backend API wallet's private key goes into the deployment environment
as `FAUCET_OPERATOR_PRIVATE_KEY` (used by `app/api/faucet/claim/route.ts`).
Plus `FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER=true` (only allowed when
`NODE_ENV !== 'production'`; for production use a KMS-backed signer).

---

## 6. Validate

```bash
npm run validate:testnet -- --network baseSepolia
```

This is a single-shot pre-flight that confirms:
1. The chain id is a recognized testnet
2. Every contract in `REQUIRED_CONTRACTS` has a non-zero address in the book
3. `VFIDEToken.totalSupply() == 200_000_000 * 10^18`
4. The token's `vaultHub`, `burnRouter`, `fraudRegistry`, `ledger` are all
   wired (i.e. apply-full.ts actually finished)
5. The faucet holds ≥ 10,000 VFIDE and ≥ 0.05 ETH
6. `faucet.ecosystemVault()` matches `book.EcosystemVault`
7. `EcosystemVault.isManager(faucet) === true` (i.e. executeManagerChange ran)
8. Each governance-bearing module reports `dao() === book.DAO`
9. Every `NEXT_PUBLIC_*_ADDRESS` env var matches the deployment book

Exits non-zero on any failure. Wire this into CI before announcing.

---

## 7. Announce

When step 6 passes clean:
- Push the frontend with the new `NEXT_PUBLIC_*_ADDRESS` values
- Smoke-test: connect a wallet on the testnet chain, click "Claim Faucet,"
  verify VFIDE + ETH arrive, verify your vault is auto-created, send a
  small transfer to another user and confirm the ProofScore-based burn fee
  shows up in the FeeDistributor pools

---

## Mainnet differences

Repeat the same flow with these env changes:

| Variable                              | Testnet               | Mainnet (Base)         |
|---------------------------------------|-----------------------|------------------------|
| `--network`                           | `baseSepolia`         | `base`                 |
| `DEPLOY_TESTNET_FAUCET`               | `true`                | unset (or `false`)     |
| `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP`  | `true` for first run  | unset (must be `false`)|
| All `BOOTSTRAP_*_ADDRESS` values      | Can be deployer EOA   | Must be real addresses, ideally multisigs |
| `NEXT_PUBLIC_IS_TESTNET`              | `true`                | `false`                |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID`        | `84532`               | `8453`                 |

`deploy-full.ts` enforces these gates at the script level. `fund-faucet.ts`
and `validate-testnet-ready.ts` refuse to run on mainnet chain ids by design.

The contract surface is identical between the two — `VFIDETestnetFaucet`
is the ONLY contract that exists on testnet and not on mainnet. Everything
else (FraudRegistry, withdrawal queue, EcosystemVault, etc.) is bit-for-bit
the same.

---

## Troubleshooting

**"DEPLOY_TESTNET_FAUCET=true is not allowed on chainId X"** — you set the
env var on a mainnet chain. Unset it.

**`EcosystemVault.isManager(faucet)` is false after apply-full.ts** — the
2-day timelock hasn't elapsed yet. The schedule:
- t=0: deploy-full.ts queues the change
- t=2d: apply-full.ts runs `executeManagerChange()`

If you ran apply-full.ts before the 2-day mark, the call no-ops with
`ECO_ChangeNotReady`. Re-run apply-full.ts after the delay.

**"function not in ABI" runtime errors in the frontend** — `lib/abis/`
drift. Run `npx hardhat compile && npm run sync-abis` and rebuild.

**Faucet returns 503 "Faucet signer unavailable"** — `FAUCET_OPERATOR_PRIVATE_KEY`
is missing or malformed in the deployed environment, or
`FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER` is not `true`. Production should use a
KMS-backed signer instead; the local-signer path is testnet only.
