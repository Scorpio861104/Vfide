# VFIDE Testnet Runbook — Base Sepolia

> **Canonical operator guide for the Base Sepolia dry-run.**  
> Complete every step in order. Do not announce the testnet until Step 7 exits 0.

---

## Prerequisites

### 1. GitHub Secrets (repo → Settings → Secrets → Actions)

| Secret name | Value |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | Funded Base Sepolia EOA private key (0x…) |
| `BASE_SEPOLIA_RPC_URL` | Dedicated RPC — Alchemy or QuickNode Base Sepolia endpoint |
| `BASESCAN_API_KEY` | From https://basescan.org/myapikey |
| `CI_JWT_SECRET` | Any 32-byte random hex (used by release-gate CI job) |

> **Fund the deployer first.** Base Sepolia ETH faucet: https://www.alchemy.com/faucets/base-sepolia  
> You need ≥ 0.3 ETH for the full deployment. Keep 0.1 ETH in reserve for apply-full rounds.

### 2. Local `.env` setup

```bash
cp .env.example .env
```

Fill in at minimum:
```
BASE_SEPOLIA_RPC_URL=<your endpoint>
DEPLOYER_PRIVATE_KEY=<your key>
BASESCAN_API_KEY=<your key>
NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID=84532
NEXT_PUBLIC_IS_TESTNET=true
```

---

## Step 1 — Deploy all contracts

```bash
npx hardhat run scripts/deploy-full.ts --network baseSepolia
```

**Expected output:**  
- `✅ All contracts deployed` at the end  
- A `.deployments/baseSepolia.json` file created with all addresses  
- A `NEXT_PUBLIC_*` block printed to console — **copy this into your `.env`**

**If it fails mid-way:** The script is idempotent — re-running skips already-deployed contracts and continues from where it stopped.

---

## Step 2 — Copy emitted env block

After deploy-full.ts prints the `NEXT_PUBLIC_*` block, copy it into `.env`:

```bash
# The block looks like:
# NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=0x...
# NEXT_PUBLIC_VAULT_HUB_ADDRESS=0x...
# ... (all addresses)
```

Verify the addresses file:
```bash
cat .deployments/baseSepolia.json | python3 -m json.tool
```

---

## Step 3 — Wait 48 hours, then run apply-full

> ⚠️ **Security window:** Between deploy-full and the first apply-full, Seer enforcement is NOT active and burn floor is 0. Do NOT announce or expose the testnet publicly during this window.

```bash
# Run after 48 hours:
npx hardhat run scripts/apply-full.ts --network baseSepolia
```

Re-run every 48 hours until you see:
```
✅ All wiring complete.
```

This typically takes 3–4 rounds (6–8 days total).

---

## Step 4 — Execute GOV-D1 post-deploy governance step

After the Timelock is live, set the CouncilElection contract via Timelock:

```bash
# This is a manual Timelock proposal. Schedule it, wait 48h, then execute.
# The deployer EOA executes this via the DAO's Timelock:
npx hardhat run scripts/gov-set-council-election.ts --network baseSepolia
```

> If `scripts/gov-set-council-election.ts` doesn't exist yet, call:
> ```
> DAO.setCouncilElection(<CouncilElection address>)
> ```
> via Etherscan's Write Contract interface using the deployer wallet.

---

## Step 5 — Seed the Sanctum Fund

```bash
npx hardhat run scripts/seed-sanctum.ts --network baseSepolia
```

This sends **1,000,000 VFIDE** from the deployer to the SanctumVault as the initial protocol reserve. Adjust `SANCTUM_SEED_VFIDE` env var to override.

Expected output:
```
✅ SanctumVault seeded: 1000000 VFIDE deposited (tx: 0x...)
```

---

## Step 6 — Fund the testnet faucet

```bash
npx hardhat run scripts/fund-faucet.ts --network baseSepolia
```

Optional overrides:
```bash
FAUCET_FUND_VFIDE_AMOUNT=500000 npx hardhat run scripts/fund-faucet.ts --network baseSepolia
```

---

## Step 7 — Validate

```bash
npm run validate:testnet -- --network baseSepolia
```

**Must exit 0 before announcing.** This checks:
- All contract addresses reachable on-chain
- ProofScore initial state (all new addresses return NEUTRAL = 5000)
- SanctumVault balance > 0
- Faucet balance > 0
- MerchantPortal protocolFeeBps == 0
- Seer enforcement active
- Burn floor enforced

---

## Step 8 — Announce testnet

Once Step 7 exits 0:

1. Tweet the testnet announcement (see `docs/influencer-seeding-kit.md`)
2. Share with technical beta users / influencer list
3. Do NOT promote $VFIDE as a speculative asset — framing is always financial inclusion

---

## Post-deploy Ongoing Ops

| Task | When | Command |
|---|---|---|
| Re-run apply-full | Every 48h until "complete" | `npx hardhat run scripts/apply-full.ts --network baseSepolia` |
| Monitor Sanctum balance | Weekly | Check on Basescan |
| Developer key burn | 6 months after mainnet deploy | `OwnerControlPanel.renounceOwnership()` |
| Validate mainnet env | Before mainnet deploy | `npm run validate:mainnet` |

---

## Troubleshooting

**`Error: Deployment book not found`**  
→ Run deploy-full.ts first, or point `DEPLOYMENT_FILE` to the correct `.json`.

**`Error: Insufficient deployer balance`**  
→ Fund the deployer wallet. Need ≥ 0.3 ETH for deploy, 0.05 ETH per apply-full round.

**`apply-full: already applied`**  
→ Normal — the script is idempotent. The relevant wiring was already done in a previous round.

**`ProofScore returns 0 instead of 5000 for new address`**  
→ Check that `ProofLedger.setDefaultScore(5000)` was called in deploy-full (it should be). If missing, call it manually via Etherscan.

**Timelock not yet elapsed**  
→ On Base Sepolia the Timelock delay is 48 hours. Wait and retry.
