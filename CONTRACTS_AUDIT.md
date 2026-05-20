# Contracts Audit

Files scanned: 75
Findings: high=0 medium=0 low=0

## Triage Notes

All remaining LOW findings have been reviewed and are intentional / idiomatic:

- **assembly** — Uniswap V3 vendored libraries (FullMath, TickMath) are well-audited and must not be modified. `extcodesize` / `extcodehash` are idiomatic contract-existence checks. `create2` is the standard CREATE2 deployment pattern.
- **weak-randomness** — These are NOT random-number generators. They are unique identifier hashes (action IDs, evidence hashes, refund IDs) where collision-resistance from `block.timestamp` / `block.number` plus other entropy (caller, nonce, length) is sufficient. Not used for prize selection or security-critical entropy.
- **require-no-message** — 3 in vendored Uniswap V3 `FullMath.sol` (do not modify vendored audited code). 1 in `VFIDETestnetFaucet.sol` (testnet-only contract, not deployed to mainnet).

## By category


## Findings

_No findings._

## Suppressed (59) — marked `audit-ok(<category>)`

These were flagged by the static scanner but have been triaged with an inline
`audit-ok(<category>): <reason>` annotation in the contract source.

- **LOW** [assembly] contracts/AdminMultiSig.sol:255 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/DAO.sol:511 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/DAOTimelock.sol:213 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/DAOTimelock.sol:281 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/DAOTimelock.sol:315 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [weak-randomness] contracts/MerchantPortal.sol:541 — refundId = keccak256(abi.encode(msg.sender, customer, orderId, block.timestamp, customerRefunds[customer].length)); — _Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller_
- **LOW** [assembly] contracts/VFIDEToken.sol:254 — assembly { size := extcodesize(devReserveVestingVault) } — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/VFIDEToken.sol:259 — assembly { size := extcodesize(treasury) } — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/VFIDEToken.sol:1154 — assembly { size := extcodesize(addr) } — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/VFIDEToken.sol:1160 — assembly { codeHash := extcodehash(addr) } — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/future/MainstreamPayments.sol:1146 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [weak-randomness] contracts/future/SeerGuardian.sol:415 — bytes32 actionId = keccak256(abi.encode(subject, activeRestriction[subject], block.timestamp)); — _Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller_
- **LOW** [weak-randomness] contracts/future/SeerGuardian.sol:435 — bytes32 actionId = keccak256(abi.encode("score_adjust", subject, newDelta, block.timestamp)); — _Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller_
- **LOW** [weak-randomness] contracts/future/SeerWorkAttestation.sol:233 — bytes32 evidence = keccak256(abi.encodePacked("gov_vote", proposalId, voter, block.number)); — _Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller_
- **LOW** [weak-randomness] contracts/future/SeerWorkAttestation.sol:241 — bytes32 evidence = keccak256(abi.encodePacked("merchant_settle", settlementId, block.number)); — _Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller_
- **LOW** [weak-randomness] contracts/future/SeerWorkAttestation.sol:249 — bytes32 evidence = keccak256(abi.encodePacked("bridge_relay", relayId, block.number)); — _Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller_
- **LOW** [weak-randomness] contracts/future/SeerWorkAttestation.sol:257 — bytes32 evidence = keccak256(abi.encodePacked("mentorship", sessionId, block.number)); — _Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller_
- **LOW** [assembly] contracts/future/VFIDEBridge.sol:1153 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/legacy/VaultInfrastructure.sol:828 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/legacy/VaultInfrastructure.sol:867 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/legacy/VaultInfrastructure.sol:1277 — assembly { vault := create2(0, add(bytecode, 0x20), mload(bytecode), salt) } — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:28 — assembly { — _file-level audit-ok marker_
- **LOW** [require-no-message] contracts/libraries/uniswapv3/FullMath.sol:36 — require(denominator > 0); — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:37 — assembly { — _file-level audit-ok marker_
- **LOW** [require-no-message] contracts/libraries/uniswapv3/FullMath.sol:45 — require(denominator > prod1); — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:54 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:58 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:68 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:73 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:79 — assembly { — _file-level audit-ok marker_
- **LOW** [require-no-message] contracts/libraries/uniswapv3/FullMath.sol:122 — require(result < type(uint256).max); — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:70 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:75 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:80 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:85 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:90 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:95 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:100 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:105 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:115 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:121 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:127 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:133 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:139 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:145 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:151 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:157 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:163 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:169 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:175 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:181 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:187 — assembly { — _file-level audit-ok marker_
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:193 — assembly { — _file-level audit-ok marker_
- **LOW** [require-no-message] contracts/testnet/VFIDETestnetFaucet.sol:321 — if (ethBal > 0) { (bool ok, ) = to.call{value: ethBal}(""); require(ok); } — _Reviewed: vendored audited code (Uniswap V3) or testnet-only contract; not deployed to mainnet_
- **LOW** [assembly] contracts/vault/CardBoundVault.sol:1380 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/vault/CardBoundVaultPaymentQueueManager.sol:100 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/vault/CardBoundVaultPaymentQueueManager.sol:137 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/vault/CardBoundVaultWithdrawalQueueManager.sol:140 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
- **LOW** [assembly] contracts/vault/CardBoundVaultWithdrawalQueueManager.sol:175 — assembly { — _Reviewed: idiomatic low-level pattern (extcodesize_
