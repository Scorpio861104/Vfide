#!/usr/bin/env node
/**
 * COMP-1 FIX: deploy-time DEFAULT_ADMIN_ROLE verification.
 *
 * After contract deployment, several contracts have a
 * DEFAULT_ADMIN_ROLE (the standard OpenZeppelin AccessControl admin)
 * that, if left in the wrong hands, undermines the non-custodial
 * security model. Specifically:
 *
 *   - The deployer EOA should NOT retain DEFAULT_ADMIN_ROLE on any
 *     contract once deployment validation completes. It should be
 *     transferred to either AdminMultiSig (interim) or DAOTimelock
 *     (post-handover).
 *   - No address other than the intended admin (multisig/timelock)
 *     should hold the role.
 *   - The intended admin's address must match the on-chain config
 *     captured during deployment (.deployments/<network>.json).
 *
 * This script reads the deployment manifest, queries every contract
 * for `getRoleMemberCount(DEFAULT_ADMIN_ROLE)` and member addresses,
 * compares against the expected admin, and exits non-zero if any
 * contract has unexpected role holders.
 *
 * Run after every deploy:
 *   npx hardhat run scripts/verify-admin-roles.ts --network <name>
 *
 * Wire into CI's release-gate workflow so a deploy with mis-configured
 * roles can never reach production.
 *
 * Exit codes:
 *   0 — all contracts have exactly the expected admin
 *   1 — at least one contract has unexpected role holders
 *   2 — manifest missing or could not be read
 *   3 — RPC error during role enumeration
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Matches the structure deploy-full.ts checkpoints to .deployments/<network>.json (per OP-2)
type DeploymentManifest = {
  network: string;
  chainId: number;
  deployedAt: string;
  contracts: Record<string, string>; // name → address
  expectedAdmin: string;              // multisig OR timelock; never EOA after handover
  deployer: string;                    // EOA address; should not retain admin
};

// The standard OpenZeppelin AccessControl DEFAULT_ADMIN_ROLE is
// bytes32(0). All contracts using the standard pattern share this.
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Contracts in the VFIDE protocol that use AccessControl. If new
// AccessControl-based contracts are added, add them here too — the
// alternative (auto-discovery) requires ABI parsing which adds a
// dependency on hardhat artifacts. Explicit list is more reviewable.
const ACCESS_CONTROL_CONTRACTS = [
  'VFIDEToken',
  'StablecoinRegistry',
  'VaultHub',
  'DAO',
  'DAOTimelock',
  'Seer',
  'SeerAutonomous',
  'SeerGuardian',
  // MerchantRegistry and CommerceEscrow use the `onlyDAO` modifier pattern,
  // not OpenZeppelin AccessControl — they have no DEFAULT_ADMIN_ROLE to verify.
  // (Previous entry "VFIDECommerce" was a stale alias from when both lived in
  // VFIDECommerce.sol; the script's role lookup harmlessly fell through to the
  // "doesn't implement AccessControl" warning branch every run.)
  'MerchantPortal',
  'PayrollManager',
  'SubscriptionManager',
  'SanctumVault',
  'DevVault',
  'OwnerControlPanel',
  'GovernanceHooks',
  'FeeDistributor',
  'BadgeRegistry',
  'FraudRegistry',
  'SecurityHub',
  'VFIDEFlashLoan',
  'VFIDETermLoan',
];

interface CheckResult {
  contract: string;
  address: string;
  expectedAdmin: string;
  actualMembers: string[];
  pass: boolean;
  reason: string;
}

async function main() {
  const network = process.env.HARDHAT_NETWORK ?? process.argv[2];
  if (!network) {
    console.error('[verify-admin-roles] FATAL: pass network as arg or set HARDHAT_NETWORK');
    process.exit(2);
  }

  const manifestPath = join(process.cwd(), '.deployments', `${network}.json`);
  if (!existsSync(manifestPath)) {
    console.error(`[verify-admin-roles] FATAL: deployment manifest not found at ${manifestPath}`);
    console.error('[verify-admin-roles] Run deploy-full.ts first; manifest is checkpointed by OP-2.');
    process.exit(2);
  }

  let manifest: DeploymentManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    console.error(`[verify-admin-roles] FATAL: could not parse manifest: ${e}`);
    process.exit(2);
  }

  if (!manifest.expectedAdmin) {
    console.error('[verify-admin-roles] FATAL: manifest is missing expectedAdmin field.');
    console.error('[verify-admin-roles] This must be the multisig or timelock address;');
    console.error('[verify-admin-roles] never the deployer EOA after deployment validation.');
    process.exit(2);
  }

  // Hardhat ethers is loaded lazily so this script can be unit-tested
  // without hardhat in the loop. The check fails gracefully if hardhat
  // isn't available.
  let ethers: typeof import('ethers');
  let provider: Awaited<ReturnType<typeof import('ethers').getDefaultProvider>>;
  try {
    const hardhat = await import('hardhat');
    const hre = hardhat as any;
    ethers = hre.ethers as unknown as typeof import('ethers');
    provider = hre.ethers.provider as unknown as typeof provider;
  } catch {
    console.error('[verify-admin-roles] FATAL: hardhat ethers not available. Run via `npx hardhat run`.');
    process.exit(2);
  }

  // Minimal ABI for AccessControl introspection
  const accessControlAbi = [
    'function getRoleMemberCount(bytes32) view returns (uint256)',
    'function getRoleMember(bytes32, uint256) view returns (address)',
    'function hasRole(bytes32, address) view returns (bool)',
  ];

  const results: CheckResult[] = [];
  let anyFail = false;

  console.log(`[verify-admin-roles] Network: ${manifest.network} (chainId ${manifest.chainId})`);
  console.log(`[verify-admin-roles] Expected admin: ${manifest.expectedAdmin}`);
  console.log(`[verify-admin-roles] Deployer EOA:   ${manifest.deployer}`);
  console.log();

  for (const name of ACCESS_CONTROL_CONTRACTS) {
    const address = manifest.contracts[name];
    if (!address) {
      // Not deployed in this manifest. Either the contract was skipped
      // intentionally (e.g. a phased rollout) or the deploy partially
      // failed. Either way, skip with a notice — we only flag positive
      // mis-configurations, not absences.
      console.log(`  [SKIP] ${name} not present in manifest`);
      continue;
    }

    let actualMembers: string[];
    try {
      if (!provider) throw new Error('provider not initialized');
      const ctr = new ethers.Contract(address, accessControlAbi, provider);
      const count = Number(await ctr?.getRoleMemberCount?.(DEFAULT_ADMIN_ROLE) ?? 0);
      actualMembers = [];
      for (let i = 0; i < count; i++) {
        const member = await ctr?.getRoleMember?.(DEFAULT_ADMIN_ROLE, i);
        if (member) actualMembers.push(String(member).toLowerCase());
      }
    } catch (e) {
      console.error(`  [ERR] ${name} (${address}): ${e}`);
      // RPC error or contract doesn't implement AccessControl —
      // record but don't fail the whole check; flag as a warning.
      results.push({
        contract: name,
        address,
        expectedAdmin: manifest.expectedAdmin,
        actualMembers: [],
        pass: false,
        reason: `RPC/ABI error: ${e instanceof Error ? e.message : String(e)}`,
      });
      anyFail = true;
      continue;
    }

    const expected = manifest.expectedAdmin.toLowerCase();
    const deployer = manifest.deployer.toLowerCase();

    // Pass criteria:
    //   - Exactly one DEFAULT_ADMIN_ROLE member
    //   - That member equals manifest.expectedAdmin
    //   - The deployer EOA does NOT hold the role
    let pass = true;
    let reason = 'ok';

    if (actualMembers.length === 0) {
      pass = false;
      reason = 'No DEFAULT_ADMIN_ROLE holder. Contract may be uninitialized.';
    } else if (actualMembers.length > 1) {
      pass = false;
      reason = `Multiple holders: ${actualMembers.join(', ')}. Expected exactly one.`;
    } else if (actualMembers[0] !== expected) {
      pass = false;
      reason = `Holder ${actualMembers[0]} does not match expected admin ${expected}.`;
    } else if (actualMembers.includes(deployer)) {
      // Defensive: even if the count==1 case passed because expectedAdmin matched,
      // double-check that deployer isn't somehow in the list (would only happen
      // if expectedAdmin == deployer, which is itself a misconfig).
      pass = false;
      reason = `Deployer EOA still holds DEFAULT_ADMIN_ROLE. Transfer to multisig/timelock.`;
    }

    results.push({ contract: name, address, expectedAdmin: expected, actualMembers, pass, reason });
    if (!pass) anyFail = true;

    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name} (${address}): ${reason}`);
  }

  console.log();
  console.log(`[verify-admin-roles] Total: ${results.length} contracts checked`);
  console.log(`[verify-admin-roles] Pass:  ${results.filter((r) => r.pass).length}`);
  console.log(`[verify-admin-roles] Fail:  ${results.filter((r) => !r.pass).length}`);

  if (anyFail) {
    console.error();
    console.error('[verify-admin-roles] DEPLOY VERIFICATION FAILED.');
    console.error('[verify-admin-roles] Review the failures above and either:');
    console.error('  - Transfer DEFAULT_ADMIN_ROLE to the expected admin via the contract\'s grantRole/revokeRole pair, OR');
    console.error('  - Update manifest.expectedAdmin if the actual admin is intentionally different.');
    process.exit(1);
  }

  console.log('[verify-admin-roles] All contracts have correct admin. Deployment validated.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[verify-admin-roles] Unhandled error:', e);
  process.exit(3);
});
