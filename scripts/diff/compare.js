#!/usr/bin/env node
/*
 Compare differential outputs between EVM and zkSync runs.
 Expects diff-out/hardhat.json and diff-out/zkSyncSepoliaTestnet.json (or other pairs via env):
   DIFF_EVM_NET=hardhat DIFF_ZK_NET=zkSyncSepoliaTestnet node scripts/diff/compare.js
*/

const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  const evmNet = process.env.DIFF_EVM_NET || 'hardhat';
  const zkNet = process.env.DIFF_ZK_NET || 'zkSyncSepoliaTestnet';
  const aPath = path.join(process.cwd(), 'diff-out', `${evmNet}.json`);
  const bPath = path.join(process.cwd(), 'diff-out', `${zkNet}.json`);
  if (!fs.existsSync(aPath) || !fs.existsSync(bPath)) {
    console.error('Missing diff outputs. Expected files:', aPath, bPath);
    process.exit(2);
  }
  const A = readJson(aPath);
  const B = readJson(bPath);

  const keys = ['name', 'symbol', 'decimals', 'totalSupply'];
  const diffs = [];
  for (const k of keys) {
    const va = A[k];
    const vb = B[k];
    if (String(va) !== String(vb)) {
      diffs.push({ key: k, evm: va, zk: vb });
    }
  }

  if (diffs.length === 0) {
    console.log('[diff] No differences found across keys:', keys.join(', '));
    process.exit(0);
  } else {
    console.log('[diff] Differences found:');
    for (const d of diffs) {
      console.log(` - ${d.key}: evm=${d.evm} vs zk=${d.zk}`);
    }
    process.exit(1);
  }
}

main();
