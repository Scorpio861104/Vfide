# VFIDE Ecosystem Constitution & Architecture
**Status:** Implemented & Verified
**Date:** November 25, 2025

This document outlines the finalized "Code is Law" architecture of the VFIDE ecosystem, ensuring strict adherence to **Anti-King**, **Anti-Whale**, and **Safe Banking** principles.

---

## 1. Anti-King (Decentralization & Separation of Powers)
The system is designed to eliminate centralized control through a strict separation of roles.

### The Judge (DAO)
*   **Contract:** `DAO.sol`
*   **Role:** Legislative & Judicial.
*   **Powers:**
    *   Can change system parameters (fees, thresholds).
    *   Can resolve disputes (overrule Seer flags).
    *   **Limitation:** Cannot seize user funds.
*   **Governance Model:** **Proof of Trust**. Voting power is determined by `ProofScore` (Reputation), not token balance.

### The Police (Seer & Deputies)
*   **Contract:** `VFIDETrust.sol` (Seer)
*   **Role:** Executive & Enforcement.
*   **Powers:**
    *   **Automated Justice:** Authorized "Deputies" (e.g., `VFIDECommerce`, `VFIDEStaking`) can automatically reward good behavior or punish bad behavior.
    *   **Instant Flagging:** Can freeze bad actors (`isFlagged`) instantly without waiting for a vote.
*   **Deputies:**
    *   **Commerce:** Auto-suspends merchants with high refund/dispute rates.
    *   **Staking:** Rewards long-term holders with higher Trust Scores.

### The Constitution (Immutable Rules)
*   **Supply:** `VFIDEToken.sol` has a hard cap of 200M VFIDE. Node rewards are strictly limited to the 75M allocation.

---

## 2. Anti-Whale (Meritocracy)
The system prevents wealth from translating directly into political dominance.

*   **Score-Weighted Voting:** A "Whale" with 1,000,000 VFIDE but a low Trust Score (e.g., 500) has **less voting power** than a "Citizen" with 1,000 VFIDE and a high Trust Score (e.g., 800).
*   **Vault-Only Economy:** Tokens must reside in Vaults (`VaultInfrastructure.sol`). This prevents anonymous hoarding and ensures all participants are part of the reputation system.

---

## 3. Safe Banking (User Sovereignty)
The system provides bank-grade security while maintaining non-custodial ownership.

*   **Vaults:** Every user owns a smart contract Vault, not just a wallet address.
*   **Panic Button:** `VFIDESecurity.sol` allows users to call `selfPanic()` to instantly freeze their own vault if they suspect a key compromise.
*   **Guardians:** Users can appoint friends/family as Guardians to recover access or approve large transfers.
*   **Non-Seizure:** The DAO can **freeze** a vault (via `SecurityHub`) for investigation, but the code contains **no function** for the DAO to transfer funds *out* of a user's vault. Ownership is absolute.

---

## 4. Economic Flow
1.  **Presale:** Users buy VFIDE -> Funds Treasury -> Mints VFIDE (from 75M Cap).
2.  **Dev Reserve:** 50M VFIDE pre-minted to DevReserveVestingVault with 3-month cliff and 36-month vesting.
3.  **Commerce:** Users spend VFIDE -> Merchants earn Trust -> Disputes punish Trust.
4.  **Burns:** Dynamic burn fees based on ProofScore reduce supply over time.

---

## Verified Contracts
*   `VFIDEToken.sol`: Hard caps (200M total, 50M dev reserve, 75M presale cap), Vault enforcement.
*   `VFIDETrust.sol`: Seer logic, Auth/Deputies.
*   `DAO.sol`: Score-weighted voting.
*   `VFIDECommerce.sol`: Merchant policing.
*   `VFIDESecurity.sol`: PanicGuard & Guardians.
*   `VaultInfrastructure.sol`: Create2 factory, Guardian recovery.
