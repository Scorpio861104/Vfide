# Security & Logic Audit: VFIDE Trust & Enterprise Gateway

**Date**: November 28, 2025
**Scope**: `VFIDETrust.sol` (Seer) and `VFIDEEnterpriseGateway.sol` (Amazon Bridge)

## Executive Summary
Both contracts are logically sound and follow best practices (Checks-Effects-Interactions, Access Control). However, we identified **3 Low/Medium Severity Issues** and **2 Feature Improvements** that should be addressed to ensure enterprise-grade robustness.

---

## 1. VFIDEEnterpriseGateway.sol

### [Medium] Incompatibility with Fee-on-Transfer Tokens
**Issue**: The contract assumes that if it transfers `amount` from a user, it receives exactly `amount`.
*   If VFIDE (or a future token used) implements a transfer fee (e.g., 1% burn on transfer), the Gateway will receive `amount - fee`.
*   However, `orders[id].amount` records the full `amount`.
*   **Consequence**: When `settleOrder` is called, the contract attempts to send the full `amount` to the merchant. Eventually, the contract will run out of dust/fees and the last users will be unable to settle (Insolvency).
**Fix**: Check the balance *before* and *after* the transfer in `createOrder` to record the *actual* received amount.

### [Low] Lack of Emergency Rescue
**Issue**: If tokens are sent to the contract by mistake (not via `createOrder`), or if the `merchantWallet` is blacklisted (e.g., USDC blacklist), funds could be permanently stuck.
**Fix**: Add a `rescueFunds(token, amount, to)` function callable only by `DAO`.

### [Improvement] Batch Settlement (Gas Optimization)
**Observation**: Enterprise systems like Amazon process thousands of orders. Calling `settleOrder` one by one is gas-inefficient.
**Recommendation**: Add `settleBatch(bytes32[] calldata orderIds)` to allow settling multiple orders in a single transaction.

---

## 2. VFIDETrust.sol (Seer)

### [Low] Hardcoded Decimals Assumption
**Issue**: `calculateCapitalBonus` assumes the token has 18 decimals (`1000 * 1e18`).
*   If VFIDE is 18 decimals, this is fine.
*   If the DAO switches to a token with 6 decimals (like USDC), the bonus will never trigger (requires 1000 * 10^18 USDC, which is impossible).
**Fix**: Fetch `decimals()` from the token contract or allow the DAO to set a `capitalDivisor`.

### [Improvement] Stale Storage in Activity Score
**Observation**: `activityScore` in storage is only updated when `logActivity` is called. `getScore` calculates decay on-the-fly.
*   This is safe for now.
*   **Risk**: If future contracts read `activityScore` directly (storage read) instead of calling `getScore()`, they will see stale (undecayed) values.
**Recommendation**: Add a public `updateActivity(subject)` function that anyone can call to "touch" and actualize the decay in storage.

---

## Action Plan
1.  **Gateway**: Update `createOrder` to support Fee-on-Transfer tokens.
2.  **Gateway**: Add `settleBatch` and `rescueFunds`.
3.  **Trust**: Make `capitalDivisor` configurable.
