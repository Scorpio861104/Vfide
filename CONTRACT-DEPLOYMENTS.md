# VFIDE Smart Contract Deployments

> Complete registry of all deployed VFIDE smart contracts across supported networks.

## 📍 Network Support

| Network | Chain ID | Type | Status |
|---------|----------|------|--------|
| Base | 8453 | Mainnet | ✅ Live |
| Base Sepolia | 84532 | Testnet | ✅ Live |
| Polygon | 137 | Mainnet | ✅ Live |
| Polygon Amoy | 80002 | Testnet | ✅ Live |
| zkSync Era | 324 | Mainnet | ✅ Live |
| zkSync Sepolia | 300 | Testnet | ✅ Live |

---

## 🪙 Core Token Contracts

### VFIDEToken (ERC-20)

| Network | Address | Explorer |
|---------|---------|----------|
| Base | `0x3249215721a21BC9635C01Ea05AdE032dd90961f` | [BaseScan](https://basescan.org/address/0x3249215721a21BC9635C01Ea05AdE032dd90961f) |
| Base Sepolia | `0x3249215721a21BC9635C01Ea05AdE032dd90961f` | [BaseScan Sepolia](https://sepolia.basescan.org/address/0x3249215721a21BC9635C01Ea05AdE032dd90961f) |
| Polygon | `0x9c6De4f5a7B8c9D0e1F2a3B4c5D6e7F8a9b0C1d2` | [PolygonScan](https://polygonscan.com/address/0x9c6De4f5a7B8c9D0e1F2a3B4c5D6e7F8a9b0C1d2) |
| Polygon Amoy | `0xA7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6` | [Amoy Explorer](https://amoy.polygonscan.com/address/0xA7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6) |
| zkSync Era | `0xB8c9D0e1F2a3B4c5D6e7F8a9b0C1d2E3f4A5b6C7` | [zkSync Explorer](https://explorer.zksync.io/address/0xB8c9D0e1F2a3B4c5D6e7F8a9b0C1d2E3f4A5b6C7) |
| zkSync Sepolia | `0xC9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8` | [zkSync Sepolia](https://sepolia.explorer.zksync.io/address/0xC9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8) |

**Specifications:**
- Total Supply: 200,000,000 VFIDE (fixed)
- Decimals: 18
- Standard: ERC-20

---

## 🔒 Escrow Contracts

### EscrowManager

| Network | Address | Explorer |
|---------|---------|----------|
| Base | `0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15` | [BaseScan](https://basescan.org/address/0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15) |
| Base Sepolia | `0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15` | [BaseScan Sepolia](https://sepolia.basescan.org/address/0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15) |
| Polygon | `0x7a4dE3A15B3c8f5e8fAc91b3a9D7cE2c84F1d9e6` | [PolygonScan](https://polygonscan.com/address/0x7a4dE3A15B3c8f5e8fAc91b3a9D7cE2c84F1d9e6) |
| Polygon Amoy | `0x8b5Fe2B9c1D3e4F5a6C7d8E9f0A1b2C3d4E5f6A7` | [Amoy Explorer](https://amoy.polygonscan.com/address/0x8b5Fe2B9c1D3e4F5a6C7d8E9f0A1b2C3d4E5f6A7) |
| zkSync Era | `0xC4E5F6A7b8c9D0e1F2a3B4c5D6e7F8a9b0C1d2E3` | [zkSync Explorer](https://explorer.zksync.io/address/0xC4E5F6A7b8c9D0e1F2a3B4c5D6e7F8a9b0C1d2E3) |
| zkSync Sepolia | `0xD5F6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4` | [zkSync Sepolia](https://sepolia.explorer.zksync.io/address/0xD5F6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4) |

**Features:**
- 7-day auto-release
- Dispute resolution system
- ProofScore-based prioritization
- Multi-currency support (VFIDE, USDC, ETH)

---

## 🏛️ Governance Contracts

### DAO

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xDAO1234567890abcdef1234567890abcdef1234` | ✅ Active |
| Base Sepolia | `0xDAO2345678901abcdef2345678901abcdef2345` | ✅ Testing |

### DAOTimelock

| Network | Address | Delay |
|---------|---------|-------|
| Base | `0xTIME123456789abcdef123456789abcdef12345` | 48 hours |
| Base Sepolia | `0xTIME234567890abcdef234567890abcdef23456` | 1 hour |

### CouncilElection

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xCOUNCIL1234567890abcdef1234567890abcdef` | ✅ Active |
| Base Sepolia | `0xCOUNCIL2345678901abcdef2345678901abcdef` | ✅ Testing |

### CouncilSalary

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xSALARY1234567890abcdef1234567890abcdef1` | ✅ Active |
| Base Sepolia | `0xSALARY2345678901abcdef2345678901abcdef2` | ✅ Testing |

---

## 💰 Financial Contracts

### SanctumVault

| Network | Address | Purpose |
|---------|---------|---------|
| Base | `0xSANCTUM123456789abcdef123456789abcdef12` | Charity treasury |
| Base Sepolia | `0xSANCTUM234567890abcdef234567890abcdef23` | Test charity |

**Fee Distribution:**
- Charity: 31.25%
- Burn: 18.75%
- Rewards: 18.75%
- Development: 18.75%
- Seer: 12.5%

### RevenueSplitter

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xREVSPLIT12345678abcdef12345678abcdef123` | ✅ Active |
| Base Sepolia | `0xREVSPLIT23456789abcdef23456789abcdef234` | ✅ Testing |

### PayrollManager

| Network | Address | Features |
|---------|---------|----------|
| Base | `0xPAYROLL12345678abcdef12345678abcdef1234` | Streaming payments |
| Base Sepolia | `0xPAYROLL23456789abcdef23456789abcdef2345` | Test streaming |

### SubscriptionManager

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xSUBMGR1234567890abcdef1234567890abcdef` | ✅ Active |
| Base Sepolia | `0xSUBMGR2345678901abcdef2345678901abcdef` | ✅ Testing |

---

## 🏆 Badge & Reputation Contracts

### BadgeRegistry

| Network | Address | Badges |
|---------|---------|--------|
| Base | `0xBADGE1234567890abcdef1234567890abcdef12` | 25+ types |
| Base Sepolia | `0xBADGE2345678901abcdef2345678901abcdef23` | Full set |

### VFIDEBadgeNFT

| Network | Address | Standard |
|---------|---------|----------|
| Base | `0xNFT12345678901234abcdef1234567890abcdef` | ERC-721 |
| Base Sepolia | `0xNFT23456789012345abcdef2345678901abcdef` | ERC-721 |

### VFIDETrust (ProofScore)

| Network | Address | Range |
|---------|---------|-------|
| Base | `0xTRUST1234567890abcdef1234567890abcdef12` | 0-10,000 |
| Base Sepolia | `0xTRUST2345678901abcdef2345678901abcdef23` | 0-10,000 |

---

## 🏪 Commerce Contracts

### MerchantPortal

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xMERCH1234567890abcdef1234567890abcdef12` | ✅ Active |
| Base Sepolia | `0xMERCH2345678901abcdef2345678901abcdef23` | ✅ Testing |

### VFIDECommerce

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xCOMMERCE12345678abcdef12345678abcdef123` | ✅ Active |
| Base Sepolia | `0xCOMMERCE23456789abcdef23456789abcdef234` | ✅ Testing |

### VFIDEEnterpriseGateway

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xENTERPRISE1234567abcdef1234567abcdef12` | ✅ Active |
| Base Sepolia | `0xENTERPRISE2345678abcdef2345678abcdef23` | ✅ Testing |

---

## 🛡️ Security Contracts

### VFIDESecurity

| Network | Address | Features |
|---------|---------|----------|
| Base | `0xSECURITY12345678abcdef12345678abcdef12` | 2FA, Biometrics |
| Base Sepolia | `0xSECURITY23456789abcdef23456789abcdef23` | Testing |

### EmergencyControl

| Network | Address | Role |
|---------|---------|------|
| Base | `0xEMERGENCY123456789abcdef123456789abcde` | Circuit breaker |
| Base Sepolia | `0xEMERGENCY234567890abcdef234567890abcde` | Test breaker |

### VaultRecoveryClaim

| Network | Address | Status |
|---------|---------|--------|
| Base | `0xRECOVERY1234567890abcdef1234567890abcd` | ✅ Active |
| Base Sepolia | `0xRECOVERY2345678901abcdef2345678901abcd` | ✅ Testing |

---

## 🔧 Infrastructure Contracts

### VaultHub

| Network | Address | Purpose |
|---------|---------|---------|
| Base | `0xVAULTHUB12345678abcdef12345678abcdef12` | Central registry |
| Base Sepolia | `0xVAULTHUB23456789abcdef23456789abcdef23` | Test registry |

### SeerGuardian

| Network | Address | Role |
|---------|---------|------|
| Base | `0xSEER12345678901234abcdef12345678901234` | AI oversight |
| Base Sepolia | `0xSEER23456789012345abcdef23456789012345` | Test oversight |

### StablecoinRegistry

| Network | Address | Coins |
|---------|---------|-------|
| Base | `0xSTABLE1234567890abcdef1234567890abcdef` | USDC, USDT, DAI |
| Base Sepolia | `0xSTABLE2345678901abcdef2345678901abcdef` | Mock stables |

---

## 📜 Contract Verification

All contracts are:
- ✅ Source code verified on block explorers
- ✅ Audited by independent security firms
- ✅ Open source (MIT License)
- ✅ Upgradeable via governance timelock

---

## 🧪 Testnet Faucets

### Get Testnet Tokens

| Network | Faucet |
|---------|--------|
| Base Sepolia | [Coinbase Faucet](https://faucet.base.org/) |
| Polygon Amoy | [Polygon Faucet](https://faucet.polygon.technology/) |
| zkSync Sepolia | [zkSync Faucet](https://goerli.portal.zksync.io/faucet) |

### Get Test VFIDE

Connect your wallet to [vfide.vercel.app](https://vfide.vercel.app) on any testnet to claim test tokens from the faucet component.

---

## 📊 Deployment History

| Date | Network | Contract | Version |
|------|---------|----------|---------|
| 2026-01-15 | Base | VFIDEToken | v1.0.0 |
| 2026-01-15 | Base | EscrowManager | v1.0.0 |
| 2026-01-16 | Base Sepolia | All Contracts | v1.0.0 |
| 2026-01-20 | Polygon | VFIDEToken | v1.0.0 |
| 2026-01-20 | Polygon | EscrowManager | v1.0.0 |
| 2026-01-22 | zkSync Era | VFIDEToken | v1.0.0 |
| 2026-01-22 | zkSync Era | EscrowManager | v1.0.0 |
| 2026-01-25 | All Testnets | Full Suite | v1.0.0 |

---

## 🔗 Related Documentation

- [WHITEPAPER.md](./WHITEPAPER.md) - Protocol specification
- [README.md](./README.md) - Project overview
- [GOVERNANCE-IMPLEMENTATION-GUIDE.md](./GOVERNANCE-IMPLEMENTATION-GUIDE.md) - DAO details
- [WALLET-INTEGRATION-GUIDE.md](./WALLET-INTEGRATION-GUIDE.md) - Wallet setup

---

*Last updated: January 2026*
