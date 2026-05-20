# ABI Call-Site Parity Audit

Cross-references every `functionName:` use site in the frontend against
the ABI it claims to use.

- Frontend files scanned: **1413**
- Call sites found: **593**
- ABI symbols resolved: **134**
- ABIs loaded: **70**

## Summary

| Severity | Count |
|---|---|
| HIGH (broken call) | 0 |
| MEDIUM (suspect) | 0 |
| INFO (manual review) | 0 |

## HIGH findings (0)

_None._

## MEDIUM findings (0)

_None._

## INFO (inline ABI — manually verified separately) (0)

_None._

## Suppressed (13) — marked `abi-parity-ok`

These call sites were flagged by the static parser but have been
manually verified against contract source and triaged with an inline
`abi-parity-ok: <reason>` annotation.

- `app/api/crypto/price/route.ts:209` (INFO) — Local/inline ABI symbol "POOL_ABI" for slot0 — manual review recommended — _POOL_ABI defined at top of file; slot0 takes 0 args_
- `app/api/crypto/price/route.ts:215` (INFO) — Local/inline ABI symbol "POOL_ABI" for token0 — manual review recommended — _POOL_ABI defined at top of file; slot0 takes 0 args_
- `app/api/merchant/payments/confirm/route.ts:146` (INFO) — Inline ABI used for decimals — manual review recommended — _inline ABI for ERC20 decimals(); 0-arg view function_
- `app/control-panel/components/SecurityComponents.tsx:26` (INFO) — Inline ABI used for owner — manual review recommended — _inline minimal ABI for OZ Ownable owner(); 0-arg view function_
- `app/headhunter/components/ClaimsTab.tsx:84` (INFO) — previewHeadhunterReward expects 3 args — args is conditional/spread, manual verification recommended — _previewHeadhunterReward(uint256 year, uint256 quarter, address user) — 3 args, statically present_
- `app/splitter/page.tsx:140` (INFO) — balanceOf expects 1 arg — args is conditional/spread, manual verification recommended — _balanceOf(address) — 1 arg, statically present_
- `components/vault/LockVaultPanel.tsx:188` (INFO) — Inline ABI used for queueLength — manual review recommended — _inline ABI for CardBoundVaultPaymentQueueManager.queueLength(); 0-arg view_
- `components/vault/LockVaultPanel.tsx:245` (INFO) — Inline ABI used for paymentQueue — manual review recommended — _inline ABI for paymentQueue(uint256); 1 arg, statically present_
- `hooks/useEscrowList.ts:176` (INFO) — escrows expects 1 arg — args is conditional/spread, manual verification recommended — _escrows(uint256 id) — 1 arg, statically present in .map callback_
- `hooks/useSanctumVault.ts:194` (INFO) — charityList expects 1 arg — args is conditional/spread, manual verification recommended — _charityList is a public address[] auto-getter — 1 uint256 index arg_
- `hooks/useSanctumVault.ts:217` (INFO) — getCharityInfo expects 1 arg — args is conditional/spread, manual verification recommended — _charityList is a public address[] auto-getter — 1 uint256 index arg_
- `hooks/useSanctumVault.ts:259` (INFO) — getDisbursement expects 1 arg — args is conditional/spread, manual verification recommended — _getDisbursement(uint256 proposalId) — 1 arg, statically present_
- `hooks/useStaking.ts:76` (INFO) — getPoolInfo expects 1 arg — args is conditional/spread, manual verification recommended — _getPoolInfo(address lpToken) — 1 arg, statically present_

