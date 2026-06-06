# How to Try VFIDE on Testnet

> **Network:** Base Sepolia (chain ID 84532)
> **Status:** Testnet — real contracts, test funds only

---

## 1. Get a wallet

Any EVM-compatible wallet works (MetaMask, Rainbow, Rabby).
Add Base Sepolia:
- RPC: `https://sepolia.base.org`
- Chain ID: `84532`
- Symbol: `ETH`
- Explorer: `https://sepolia.basescan.org`

---

## 2. Get test ETH

[Base Sepolia faucet](https://faucet.base.org) — 0.1 ETH per request, enough for gas.

---

## 3. Get test VFIDE

1. Open the app at **[testnet URL]**
2. Connect your wallet
3. Click **"Claim Faucet"** — you'll receive 1,000 VFIDE + a small ETH top-up
4. Your vault is created automatically on first claim

---

## 4. Things worth trying

**ProofScore:**
- Send small VFIDE transfers to other wallets — score moves in real time
- Score starts at 5,000 (NEUTRAL tier). Honest use pushes it up; suspicious patterns push it down.

**Merchant payments:**
- Connect as a merchant, register, set a pull permit
- Pay via the commerce flow — fee to merchant is exactly 0

**Governance:**
- Browse open proposals on the DAO page
- Vote — your ProofScore weight affects your voting power

**Vault:**
- Your CardBoundVault is automatically provisioned
- Try the recovery flow — nominate a guardian, see the 14-day wait

---

## 5. Read the code

Everything is open source: **[github URL]**

If you find something wrong — a bug, a misleading UI claim, a contract invariant that's off — open an issue or DM directly.

---

## What this is

A payment protocol. Not a yield product.
The merchant fee is hardcoded to zero. Freeze and seizure functions don't exist.
In 6 months the developer key burns.

Built for people the financial system extracts from.
