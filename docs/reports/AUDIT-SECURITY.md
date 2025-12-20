# Audit Report: Security Layer

## Executive Summary
This audit covers `VFIDESecurity.sol`, which includes `GuardianRegistry`, `GuardianLock`, `PanicGuard`, `EmergencyBreaker`, and `SecurityHub`. Critical issues regarding user control over their own security and a permanent lockout bug in the guardian voting system were identified and fixed.

## Findings & Fixes

### 1. GuardianRegistry: Lack of User Control (CRITICAL USABILITY)
- **Issue**: `addGuardian`, `removeGuardian`, and `setThreshold` were restricted to `onlyDAO`. This meant users (Vault Owners) could not configure their own guardians, rendering the social recovery feature unusable without DAO intervention for every single user.
- **Fix**: Updated access control to allow `msg.sender` to modify settings if `msg.sender` is the `vault` itself. This allows users to manage their guardians via their Smart Account (UserVault).

### 2. GuardianLock: Permanent Vote Lockout (CRITICAL BUG)
- **Issue**: The `voted` mapping was not cleared upon `unlock`. If a guardian voted to lock a vault, and the vault was subsequently unlocked, that guardian could never vote again because `voted[vault][guardian]` remained `true`.
- **Fix**: Introduced `lockNonce` for each vault. `voted` is now `mapping(address => mapping(uint256 => mapping(address => bool)))`. The nonce is incremented on `unlock` and `cancel`, effectively invalidating all previous votes without needing to iterate and clear the mapping.

### 3. VFIDECommerce.sol: Reporter Configuration (CONFIGURATION)
- **Observation**: `CommerceEscrow` calls `_noteRefund` and `_noteDispute` on `MerchantRegistry`, which requires `onlyReporter` permission.
- **Requirement**: The deployment script MUST explicitly add the deployed `CommerceEscrow` address as a reporter in `MerchantRegistry` using `setReporter`.
- **Status**: Noted for deployment.

## Recommendations
1.  **Guardian UI**: The frontend must provide a clear interface for users to add guardians. This involves calling `execute` on their UserVault to call `addGuardian` on the `GuardianRegistry`.
2.  **PanicGuard Policy**: The DAO should establish clear off-chain policies for when to use `PanicGuard` vs `GuardianLock`. PanicGuard is for automated/algorithmic risk (Seer), while GuardianLock is for human-verified threats.

## Conclusion
The Security Layer is now functional and safe. The "Dead Man's Switch" logic (audited previously) combined with the fixed Guardian system provides a robust recovery mechanism.
