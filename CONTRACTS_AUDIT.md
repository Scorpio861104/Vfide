# Contracts Audit

Files scanned: 75
Findings: high=0 medium=0 low=59

## Triage Notes

All remaining LOW findings have been reviewed and are intentional / idiomatic:

- **assembly** — Uniswap V3 vendored libraries (FullMath, TickMath) are well-audited and must not be modified. `extcodesize` / `extcodehash` are idiomatic contract-existence checks. `create2` is the standard CREATE2 deployment pattern.
- **weak-randomness** — These are NOT random-number generators. They are unique identifier hashes (action IDs, evidence hashes, refund IDs) where collision-resistance from `block.timestamp` / `block.number` plus other entropy (caller, nonce, length) is sufficient. Not used for prize selection or security-critical entropy.
- **require-no-message** — 3 in vendored Uniswap V3 `FullMath.sol` (do not modify vendored audited code). 1 in `VFIDETestnetFaucet.sol` (testnet-only contract, not deployed to mainnet).

## By category

- assembly: 48
- weak-randomness: 7
- require-no-message: 4

## Findings

- **LOW** [assembly] contracts/AdminMultiSig.sol:254 — assembly {
- **LOW** [assembly] contracts/DAO.sol:510 — assembly {
- **LOW** [assembly] contracts/DAOTimelock.sol:212 — assembly {
- **LOW** [assembly] contracts/DAOTimelock.sol:279 — assembly {
- **LOW** [assembly] contracts/DAOTimelock.sol:312 — assembly {
- **LOW** [assembly] contracts/future/MainstreamPayments.sol:1145 — assembly {
- **LOW** [weak-randomness] contracts/future/SeerGuardian.sol:414 — bytes32 actionId = keccak256(abi.encode(subject, activeRestriction[subject], block.timestamp));
- **LOW** [weak-randomness] contracts/future/SeerGuardian.sol:433 — bytes32 actionId = keccak256(abi.encode("score_adjust", subject, newDelta, block.timestamp));
- **LOW** [weak-randomness] contracts/future/SeerWorkAttestation.sol:232 — bytes32 evidence = keccak256(abi.encodePacked("gov_vote", proposalId, voter, block.number));
- **LOW** [weak-randomness] contracts/future/SeerWorkAttestation.sol:239 — bytes32 evidence = keccak256(abi.encodePacked("merchant_settle", settlementId, block.number));
- **LOW** [weak-randomness] contracts/future/SeerWorkAttestation.sol:246 — bytes32 evidence = keccak256(abi.encodePacked("bridge_relay", relayId, block.number));
- **LOW** [weak-randomness] contracts/future/SeerWorkAttestation.sol:253 — bytes32 evidence = keccak256(abi.encodePacked("mentorship", sessionId, block.number));
- **LOW** [assembly] contracts/future/VFIDEBridge.sol:1152 — assembly {
- **LOW** [assembly] contracts/legacy/VaultInfrastructure.sol:827 — assembly {
- **LOW** [assembly] contracts/legacy/VaultInfrastructure.sol:865 — assembly {
- **LOW** [assembly] contracts/legacy/VaultInfrastructure.sol:1274 — assembly { vault := create2(0, add(bytecode, 0x20), mload(bytecode), salt) }
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:26 — assembly {
- **LOW** [require-no-message] contracts/libraries/uniswapv3/FullMath.sol:34 — require(denominator > 0);
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:35 — assembly {
- **LOW** [require-no-message] contracts/libraries/uniswapv3/FullMath.sol:43 — require(denominator > prod1);
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:52 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:56 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:66 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:71 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/FullMath.sol:77 — assembly {
- **LOW** [require-no-message] contracts/libraries/uniswapv3/FullMath.sol:120 — require(result < type(uint256).max);
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:69 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:74 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:79 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:84 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:89 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:94 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:99 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:104 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:114 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:120 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:126 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:132 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:138 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:144 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:150 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:156 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:162 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:168 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:174 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:180 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:186 — assembly {
- **LOW** [assembly] contracts/libraries/uniswapv3/TickMath.sol:192 — assembly {
- **LOW** [weak-randomness] contracts/MerchantPortal.sol:540 — refundId = keccak256(abi.encode(msg.sender, customer, orderId, block.timestamp, customerRefunds[customer].length));
- **LOW** [require-no-message] contracts/testnet/VFIDETestnetFaucet.sol:320 — if (ethBal > 0) { (bool ok, ) = to.call{value: ethBal}(""); require(ok); }
- **LOW** [assembly] contracts/vault/CardBoundVault.sol:1379 — assembly {
- **LOW** [assembly] contracts/vault/CardBoundVaultPaymentQueueManager.sol:99 — assembly {
- **LOW** [assembly] contracts/vault/CardBoundVaultPaymentQueueManager.sol:135 — assembly {
- **LOW** [assembly] contracts/vault/CardBoundVaultWithdrawalQueueManager.sol:139 — assembly {
- **LOW** [assembly] contracts/vault/CardBoundVaultWithdrawalQueueManager.sol:173 — assembly {
- **LOW** [assembly] contracts/VFIDEToken.sol:253 — assembly { size := extcodesize(devReserveVestingVault) }
- **LOW** [assembly] contracts/VFIDEToken.sol:257 — assembly { size := extcodesize(treasury) }
- **LOW** [assembly] contracts/VFIDEToken.sol:1151 — assembly { size := extcodesize(addr) }
- **LOW** [assembly] contracts/VFIDEToken.sol:1156 — assembly { codeHash := extcodehash(addr) }
