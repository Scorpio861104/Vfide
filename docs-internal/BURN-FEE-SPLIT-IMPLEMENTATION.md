# Burn Fee Split Implementation

## Overview
The "Burn Fee" logic has been refactored to support a 3-way split as requested:
1.  **Deflationary Burn**: Permanently removed from supply.
2.  **Sanctum Vault**: For humanitarian charities.
3.  **Ecosystem Vault**: For merchant fee reimbursements and ecosystem support.

## Technical Changes

### Contracts
- **`contracts/ProofScoreBurnRouter.sol`**:
    - Added `ecosystemSink` and `baseEcosystemBps`.
    - Updated `computeFees` to return `ecosystemAmount` and `ecosystemSink`.
    - Updated `setPolicy` to accept `baseEcosystemBps`.
    - Removed "Merchant Subsidy" logic (reducing sender fee) in favor of collecting fees into the Ecosystem Vault.
    - Kept "High Trust Reduction" for the Deflationary Burn component.

- **`contracts/VFIDEToken.sol`**:
    - Updated `IProofScoreBurnRouterToken` interface.
    - Updated `_transfer` to route `ecosystemAmount` to `ecosystemSink` (or Treasury fallback).
    - Updated `FeeApplied` event to include `ecosystemAmount` and `ecosystemSink`.

### Tests
- **`test/Verification.test.js`**:
    - Updated to verify that the Ecosystem Fee is collected (instead of subsidizing the burn fee).
- **`test/ProofScoreBurnRouter.test.js`**:
    - Updated to test the new 3-way split logic and API.
- **`test/burnrouter.operations.*.test.js`**:
    - Batch updated 22 files to match the new API.
- **`test/burnrouter.batch*.test.js`**:
    - Batch updated 20 files to match the new constructor.
- **`test/helpers.js`**:
    - Updated deployment helper to provide the 4th argument (Ecosystem Sink) to the router.

## Verification
- **Full Test Suite**: Passed (2899 passing tests).
- **Logic Verified**:
    - Fees are correctly split into 3 components.
    - High Trust senders still get a discount on the *Burn* portion.
    - Ecosystem and Sanctum portions remain constant to ensure sustainability.
