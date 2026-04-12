# Contract Runtime Size Report

Date: 2026-04-12  
Source: `artifacts/contracts/**/*.json` `deployedBytecode` runtime length  
EIP-170 runtime limit: 24,576 bytes

## Summary

- Contracts analyzed: 105
- Over EIP-170 limit: 0

## Over-Limit Contracts

None.

## Top 15 Largest Runtime Contracts

| Contract | Runtime Bytes | Status |
|---|---:|---|
| VFIDEToken | 24,465 | OK |
| Seer | 24,419 | OK |
| EcosystemVault | 24,358 | OK |
| VaultHub | 24,287 | OK |
| UserVaultBytecodeProvider | 23,705 | OK |
| Phase1InfrastructureDeployer | 23,648 | OK |
| OwnerControlPanel | 22,978 | OK |
| MerchantPortal | 22,725 | OK |
| SeerAutonomous | 22,478 | OK |
| UserVaultLegacy | 22,431 | OK |
| DAO | 19,851 | OK |
| DeployPhase3 | 19,032 | OK |
| VFIDEBridge | 17,427 | OK |
| VFIDETermLoan | 17,238 | OK |
| SeerSocial | 16,320 | OK |

## Notes

- This report checks deployed runtime bytecode size (`deployedBytecode`).
- EIP-170 rejects contract creation when resulting runtime code exceeds 24,576 bytes.
- Contracts near limit should be monitored for future growth (for example, `VFIDEToken`, `Seer`, `EcosystemVault`, `VaultHub`).
