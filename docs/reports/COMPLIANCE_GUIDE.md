# US Compliance & Legal Guide

To operate the Vfide ecosystem in the United States, strict adherence to regulatory frameworks (SEC, FinCEN, OFAC) is required. The codebase has been updated to support these controls.

## 1. Technical Controls Implemented

### A. KYC/AML Gating (`VFIDEPresale.sol`)
*   **Mechanism**: A `kycVerified` whitelist has been added.
*   **Effect**: Only addresses explicitly whitelisted by the admin can participate in the presale.
*   **Action Required**: You must integrate an off-chain KYC provider (e.g., Sumsub, Jumio) and use a backend script to call `setKycStatus(user, true)` for verified users.

### B. Sanctions Screening (`VFIDEToken.sol`)
*   **Mechanism**: A `isBlacklisted` mapping has been added to the token core.
*   **Effect**: Addresses on this list cannot send or receive tokens.
*   **Action Required**: You must monitor the OFAC SDN list and update this blacklist via `setBlacklist(user, true)`.

### C. Merchant Compliance (`MerchantPortal.sol`)
*   **Mechanism**: Merchants must be `kycVerified` before registering.
*   **Effect**: Ensures all businesses accepting payments are known entities, satisfying basic AML requirements.

## 2. Operational Requirements (Non-Code)

### A. Legal Entity
*   You must form a legal entity (e.g., LLC, C-Corp) to act as the "Admin" and liability holder.
*   Register as a **Money Services Business (MSB)** with FinCEN if you custody funds or facilitate payments.

### B. Securities Law (Regulation D/S)
*   **Regulation D (506c)**: Allows selling to US Accredited Investors. You must verify accreditation status (income/net worth).
*   **Regulation S**: Allows selling to non-US persons.
*   **Disclaimer**: The token is likely a security. Do not market it as a "utility token" to avoid registration. Market it as a compliant digital asset.

### C. Tax Reporting
*   You must collect W-9s (US) and W-8BENs (Non-US) from participants.
*   Issue 1099 forms for rewards/staking income.

## 3. Deployment Checklist for US Compliance

1.  [ ] Deploy contracts.
2.  [ ] Set up a secure backend to process KYC data.
3.  [ ] **DO NOT** enable the presale (`setActive(true)`) until the KYC backend is live.
4.  [ ] Regularly update the OFAC blacklist on-chain.

*Disclaimer: This is a technical implementation guide, not legal advice. Consult a securities attorney.*
