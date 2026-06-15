#!/usr/bin/env tsx
/**
 * run-onchain-audit-verification.ts
 *
 * Runs the hardhat tests + invariant verify-scripts that back the five Solidity audits (see
 * docs/ONCHAIN_VERIFICATION_MANIFEST.md) and prints a summary grouped by audit. This is the "run this" entry
 * point that turns the source-level audits into compiled on-chain evidence.
 *
 * REQUIRES a compiler-equipped environment: solc 0.8.30 (hardhat will download it) and, for the verify-scripts,
 * a local node at 127.0.0.1:8545. In the audit sandbox both are blocked, so this script is provided to be run
 * elsewhere — it has not been executed here.
 *
 * Usage:
 *   NODE_OPTIONS='--import tsx' tsx scripts/run-onchain-audit-verification.ts          # tests only
 *   NODE_OPTIONS='--import tsx' tsx scripts/run-onchain-audit-verification.ts --with-scripts   # + verify-scripts (needs RPC)
 */

import { execFileSync } from 'node:child_process';

interface Step { audit: string; what: string; cmd: string; args: string[]; needsRpc?: boolean }

// Hardhat suites are a mix of chai-runner and node:test-runner files. `hardhat test` runs the chai suites;
// the node:test suites are invoked directly. We list the audit-critical ones explicitly so the summary maps
// 1:1 to the manifest rather than burying them in the full run.
const NODE_TEST_SUITES: Record<string, string[]> = {
  'Core Ownership': [
    'test/hardhat/MerchantPayIntentEdgeCases.test.ts',
  ],
  Seer: [
    'test/hardhat/SeerVerdictIgnoredBoundary.test.ts', // the gap-fill (crux: verdict ignored on fund path)
  ],
};

// Chai-runner suites + verify-scripts, grouped by audit (run via hardhat test / tsx).
const STEPS: Step[] = [
  { audit: 'Core Ownership', what: 'no-freeze / non-custodial boundary', cmd: 'npx', args: ['hardhat', 'test', 'test/hardhat/NonCustodialNoFreeze.test.ts'] },
  { audit: 'Core Ownership', what: 'inheritance + threat model', cmd: 'npx', args: ['hardhat', 'test', 'test/hardhat/CardBoundVaultInheritance.test.ts', 'test/hardhat/CardBoundVaultInheritance.threats.test.ts'] },
  { audit: 'Core Ownership', what: 'next-of-kin inheritance invariants', cmd: 'npm', args: ['run', 'contract:verify:next-of-kin'], needsRpc: true },
  { audit: 'Recovery', what: 'R-8 guardian recovery (trustee gate, cooldown, challenge)', cmd: 'npx', args: ['hardhat', 'test', 'test/hardhat/CardBoundVaultRecovery.r8.test.ts'] },
  { audit: 'Recovery', what: 'recovery claim bootstrap + timelock', cmd: 'npx', args: ['hardhat', 'test', 'test/hardhat/VaultRecoveryClaim.bootstrap.test.ts', 'test/hardhat/VaultRecoveryClaim.timelocked.test.ts'] },
  { audit: 'Trust', what: 'fee-burn-router invariants (real)', cmd: 'npm', args: ['run', 'contract:verify:fee-burn-router:real'], needsRpc: true },
  { audit: 'Trust', what: 'ProofScore ↔ trust ↔ social consistency', cmd: 'npm', args: ['run', 'contract:verify:proofscore-trust'], needsRpc: true },
  { audit: 'Trust', what: 'fee guards + FraudRegistry', cmd: 'npx', args: ['hardhat', 'test', 'test/hardhat/ProofScoreBurnRouterFeeGuards.test.ts', 'test/hardhat/FraudRegistry.test.ts'] },
  { audit: 'Governance', what: 'EmergencyControl recovery + committee cap', cmd: 'npx', args: ['hardhat', 'test', 'test/hardhat/EmergencyControlRecovery.test.ts', 'test/hardhat/EmergencyControlRecoveryCommitteeCap.test.ts'] },
  { audit: 'Governance', what: 'DAO timelock execution + admin guardrail', cmd: 'npx', args: ['hardhat', 'test', 'test/hardhat/DAOTimelockExecutionFlow.test.ts', 'test/hardhat/DAOAdminTransferGuardrail.test.ts'] },
  { audit: 'Governance', what: 'treasury timelocks (no drain)', cmd: 'npx', args: ['hardhat', 'test', 'test/hardhat/EcoTreasuryVaultNotifierTimelock.test.ts'] },
  { audit: 'Governance', what: 'OwnerControlPanel guardrails', cmd: 'npm', args: ['run', 'contract:verify:ocp-guardrails'], needsRpc: true },
];

function run(cmd: string, args: string[]): { ok: boolean; detail: string } {
  try {
    execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
    return { ok: true, detail: '' };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const out = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim();
    return { ok: false, detail: out.slice(-500) || err.message || 'failed' };
  }
}

function main() {
  const withScripts = process.argv.includes('--with-scripts');
  const results: Array<{ audit: string; what: string; ok: boolean; skipped?: boolean; detail?: string }> = [];

  // 1) node:test suites
  for (const [audit, files] of Object.entries(NODE_TEST_SUITES)) {
    for (const f of files) {
      process.stdout.write(`[${audit}] node --test ${f} … `);
      const r = run('node', ['--test', f]);
      process.stdout.write(r.ok ? 'PASS\n' : 'FAIL\n');
      results.push({ audit, what: f, ok: r.ok, detail: r.ok ? undefined : r.detail });
    }
  }

  // 2) chai suites + (optionally) verify-scripts
  for (const s of STEPS) {
    if (s.needsRpc && !withScripts) {
      results.push({ audit: s.audit, what: s.what, ok: true, skipped: true });
      continue;
    }
    process.stdout.write(`[${s.audit}] ${s.what} … `);
    const r = run(s.cmd, s.args);
    process.stdout.write(r.ok ? 'PASS\n' : 'FAIL\n');
    results.push({ audit: s.audit, what: s.what, ok: r.ok, detail: r.ok ? undefined : r.detail });
  }

  // Summary grouped by audit
  console.log('\n──────── ON-CHAIN AUDIT VERIFICATION SUMMARY ────────');
  const audits = [...new Set(results.map((r) => r.audit))];
  let anyFail = false;
  for (const a of audits) {
    const rows = results.filter((r) => r.audit === a);
    const pass = rows.filter((r) => r.ok && !r.skipped).length;
    const skip = rows.filter((r) => r.skipped).length;
    const fail = rows.filter((r) => !r.ok).length;
    if (fail > 0) anyFail = true;
    console.log(`${fail === 0 ? '✓' : '✗'} ${a}: ${pass} passed${skip ? `, ${skip} skipped (need --with-scripts + RPC)` : ''}${fail ? `, ${fail} FAILED` : ''}`);
    for (const r of rows.filter((x) => !x.ok)) console.log(`    ✗ ${r.what}\n      ${(r.detail ?? '').replace(/\n/g, '\n      ')}`);
  }
  console.log('─────────────────────────────────────────────────────');
  if (!withScripts) console.log('Note: verify-scripts skipped. Re-run with --with-scripts and a node at 127.0.0.1:8545 for full coverage.');
  process.exit(anyFail ? 1 : 0);
}

main();
