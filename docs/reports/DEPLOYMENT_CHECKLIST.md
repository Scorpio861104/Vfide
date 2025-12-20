# VFIDE Ecosystem Deployment Checklist

This document outlines the critical steps required to deploy the VFIDE ecosystem correctly. Due to circular dependencies and strict security checks, the order of operations is paramount.

## ⚠️ Critical Pre-Deployment Notes

1.  **Circular Dependency**: `VFIDEToken` requires a contract address (`DevReserveVestingVault`) to mint the initial supply to. However, `DevReserveVestingVault` requires the `VFIDEToken` address to be immutable.
    *   **Solution**: We deploy a `TempVault` first, mint the reserve to it, deploy the real `DevReserveVestingVault`, and then move the funds.
2.  **System Exemptions**: The "Vault-Only" rule is strict. You **MUST** register system contracts as exempt immediately after deployment, or they will be non-functional.

---

## 🚀 Phase 1: Core & Token (The "Bootstrap" Phase)

1.  **Deploy `ProofLedger`**
    *   *Purpose*: Central logging for all contracts.
2.  **Deploy `TempVault`**
    *   *Purpose*: Temporary holder for the 40M Dev Reserve (satisfies `VFIDEToken`'s "!contract" check).
3.  **Deploy `VaultInfrastructure` (VaultHub)**
    *   *Note*: Will need `VFIDEToken` address set later.
4.  **Deploy `SecurityHub` & Components**
    *   `GuardianRegistry`
    *   `GuardianLock`
    *   `PanicGuard`
    *   `EmergencyBreaker`
    *   `SecurityHub` (wires them all together)
5.  **Deploy `VFIDEToken`**
    *   *Args*: `VaultHub`, `SecurityHub`, `ProofLedger`, `TempVault` (as devReserve).
    *   *Action*: 40M VFIDE is minted to `TempVault`.

---

## 🏗️ Phase 2: Ecosystem Infrastructure

6.  **Deploy `DevReserveVestingVault`**
    *   *Args*: `VFIDEToken`, `Beneficiary`, `VaultHub`, ...
7.  **Transfer Reserve**
    *   *Action*: Call `TempVault.withdraw(VFIDEToken, DevReserveVestingVault, 40M)`.
    *   *Result*: The vesting vault is now funded.
8.  **Deploy Trust Layer**
    *   `Seer`
    *   `ProofScoreBurnRouterPlus`
9.  **Deploy Finance Layer**
    *   `StablecoinRegistry`
    *   `EcoTreasuryVault`
10. **Deploy Commerce Layer**
    *   `MerchantRegistry`
    *   `CommerceEscrow`
11. **Deploy Presale**
    *   `VFIDEPresale`
12. **Deploy Governance**
    *   `DAO`
    *   `DAOTimelock` (or `SystemHandover`)

---

## 🔌 Phase 3: Wiring & Configuration (CRITICAL)

These steps must be executed via script or console immediately after deployment.

### A. Token Configuration
1.  **Set Burn Router**: `VFIDEToken.setBurnRouter(ProofScoreBurnRouterPlus.address)`
2.  **Set Treasury Sink**: `VFIDEToken.setTreasurySink(EcoTreasuryVault.address)`
3.  **Set Vault Hub**: `VFIDEToken.setVaultHub(VaultInfrastructure.address)` (if not set in constructor)

### B. System Exemptions (The "Vault-Only" Whitelist)
Call `VFIDEToken.setSystemExempt(address, true)` for:
*   [ ] `DevReserveVestingVault`
*   [ ] `EcoTreasuryVault`
*   [ ] `VFIDEStaking` (if deployed)
*   [ ] `CommerceEscrow`
*   [ ] `SanctumVault` (if deployed)
*   [ ] `VFIDEPresale`
*   [ ] `ProofScoreBurnRouterPlus`

### C. Registry & Treasury Setup
1.  **Link Treasury**: `StablecoinRegistry.setTreasury(EcoTreasuryVault.address)`
    *   *Why*: Presale buys will fail without this.
2.  **Whitelist Stablecoins**: `StablecoinRegistry.addAsset(USDC_Address, "USDC")`

### D. Module Linking
1.  **VaultHub**: `VaultInfrastructure.setVFIDE(VFIDEToken.address)`
2.  **Presale**: `VFIDEPresale.launchPresale(startTime)`

---

## ✅ Verification
*   Check `VFIDEToken.balanceOf(DevReserveVestingVault)` == 40,000,000.
*   Check `VFIDEPresale.buy()` works with a whitelisted stablecoin.
*   Check `VFIDEToken.transfer()` works between Vaults.
*   Check `VFIDEToken.transfer()` fails between EOAs.
