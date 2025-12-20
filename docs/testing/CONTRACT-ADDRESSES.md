# VFIDE Testnet Contract Addresses

## ⚠️ DEPLOYER: Update this file after deployment!

**Network:** Sepolia Testnet  
**Chain ID:** 11155111  
**Deployed By:** [DEPLOYER_ADDRESS]  
**Deployed On:** [DATE]  

---

## 🔑 Core Contracts (Copy these to your wallet)

### Token Contract (Add to MetaMask)
```
VFIDEToken: 0x_________________________________
```
- Symbol: VFIDE
- Decimals: 18

### Presale Contract (For buying tokens)
```
VFIDEPresale: 0x_________________________________
```

---

## 📋 All Contract Addresses

Copy-paste block for easy sharing:

```
============ VFIDE TESTNET ADDRESSES ============

CORE:
  VFIDEToken:           0x_________________________________
  VFIDEPresale:         0x_________________________________
  StablecoinRegistry:   0x_________________________________

INFRASTRUCTURE:
  VaultInfrastructure:  0x_________________________________
  ProofLedger:          0x_________________________________
  Seer:                 0x_________________________________

GOVERNANCE:
  DAO:                  0x_________________________________
  DAOTimelock:          0x_________________________________

COMMERCE:
  MerchantRegistry:     0x_________________________________
  CommerceEscrow:       0x_________________________________

SECURITY:
  SecurityHub:          0x_________________________________
  GuardianRegistry:     0x_________________________________
  GuardianLock:         0x_________________________________
  PanicGuard:           0x_________________________________
  EmergencyBreaker:     0x_________________________________

VESTING:
  DevReserveVault:      0x_________________________________

============================================
Network: Sepolia (Chain ID: 11155111)
RPC: https://ethereum-sepolia-rpc.publicnode.com
Explorer: https://sepolia.etherscan.io
============================================
```

---

## 🧪 Test Stablecoins (For Presale Testing)

These are mock stablecoins deployed for testing:

```
Mock USDC: 0x_________________________________
Mock USDT: 0x_________________________________
Mock DAI:  0x_________________________________
```

### How to Get Test Stablecoins:
1. Contact the Deployer
2. They will send you test USDC/USDT
3. Or use the faucet at: [FAUCET_URL if available]

---

## 👥 Team Addresses

| Role | Address | Name |
|------|---------|------|
| Deployer | 0x_________________________________ | [Name] |
| Treasury | 0x_________________________________ | N/A |
| Test User 1 | 0x_________________________________ | [Name] |
| Test User 2 | 0x_________________________________ | [Name] |
| Test User 3 | 0x_________________________________ | [Name] |
| Merchant 1 | 0x_________________________________ | [Name] |
| Guardian 1 | 0x_________________________________ | [Name] |
| Guardian 2 | 0x_________________________________ | [Name] |
| Guardian 3 | 0x_________________________________ | [Name] |

---

## 🔗 Quick Links

- **Block Explorer:** https://sepolia.etherscan.io
- **View Token:** https://sepolia.etherscan.io/token/[TOKEN_ADDRESS]
- **View Presale:** https://sepolia.etherscan.io/address/[PRESALE_ADDRESS]
- **Frontend (if deployed):** [FRONTEND_URL]

---

## 📝 Deployer Instructions

After running `forge script script/Deploy.s.sol`:

1. Copy the deployed addresses from the console output
2. Replace all `0x_________________________________` above with real addresses
3. Share this file with all testers
4. Update the TestnetConfig.sol file for automated tests:

```solidity
// In script/testnet/TestnetConfig.sol
address constant TOKEN = 0x...; // Paste real address
address constant PRESALE = 0x...; // Paste real address
// ... etc
```
