#!/usr/bin/env node
/*
 Compare scenario outputs between EVM and zkSync captures.
 Compares moved amount and deltas in balances.
*/
const fs = require('fs');
const path = require('path');

function read(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function main() {
  const evmNet = process.env.DIFF_EVM_NET || 'hardhat';
  const zkNet = process.env.DIFF_ZK_NET || 'zkSyncSepoliaTestnet';
  const a = path.join(process.cwd(), 'diff-out', `${evmNet}-scenario.json`);
  const b = path.join(process.cwd(), 'diff-out', `${zkNet}-scenario.json`);
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    console.error('Missing scenario outputs:', a, b);
    process.exit(2);
  }
  const A = read(a);
  const B = read(b);

  const diffs = [];
  if (String(A.moved) !== String(B.moved)) diffs.push({ key: 'moved', a: A.moved, b: B.moved });

  const deltaADeployer = BigInt(A.after.deployer) - BigInt(A.before.deployer);
  const deltaAVault = BigInt(A.before.vault) - BigInt(A.after.vault);
  const deltaBDeployer = BigInt(B.after.deployer) - BigInt(B.before.deployer);
  const deltaBVault = BigInt(B.before.vault) - BigInt(B.after.vault);

  if (deltaADeployer !== deltaBDeployer) diffs.push({ key: 'deltaDeployer', a: deltaADeployer.toString(), b: deltaBDeployer.toString() });
  if (deltaAVault !== deltaBVault) diffs.push({ key: 'deltaVault', a: deltaAVault.toString(), b: deltaBVault.toString() });

  if (diffs.length === 0) {
    console.log('[diff-scenario] OK: no differences');
    process.exit(0);
  } else {
    console.log('[diff-scenario] Differences:');
    for (const d of diffs) console.log(` - ${d.key}: evm=${d.a} zk=${d.b}`);
    process.exit(1);
  }
}

main();
