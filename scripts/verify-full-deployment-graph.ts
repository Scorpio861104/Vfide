#!/usr/bin/env node

import { Contract, JsonRpcProvider, isAddress } from 'ethers';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

type AddressBook = Record<string, string | null | undefined>;

type DeploymentManifest = {
  addresses?: AddressBook;
};

type LinkCheck = {
  contractKey: string;
  getter: string;
  expectedKey: string;
};

type OwnerCheck = {
  contractKey: string;
  expectedEnv?: string;
  expectedManifestKey?: string;
};

type PendingCheck = {
  contractKey: string;
  getter: string;
};

const BLUE = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const LINK_CHECKS: LinkCheck[] = [
  { contractKey: 'vfideToken', getter: 'vaultHub', expectedKey: 'vaultHub' },
  { contractKey: 'vfideToken', getter: 'burnRouter', expectedKey: 'proofScoreBurnRouter' },
  { contractKey: 'vfideToken', getter: 'ledger', expectedKey: 'proofLedger' },
  { contractKey: 'vaultHub', getter: 'token', expectedKey: 'vfideToken' },
  { contractKey: 'proofScoreBurnRouter', getter: 'token', expectedKey: 'vfideToken' },
  { contractKey: 'proofScoreBurnRouter', getter: 'seer', expectedKey: 'seer' },
  { contractKey: 'ownerControlPanel', getter: 'token', expectedKey: 'vfideToken' },
  { contractKey: 'ownerControlPanel', getter: 'vaultHub', expectedKey: 'vaultHub' },
  { contractKey: 'ownerControlPanel', getter: 'seer', expectedKey: 'seer' },
];

const OWNER_CHECKS: OwnerCheck[] = [
  { contractKey: 'vfideToken', expectedEnv: 'EXPECTED_OWNER', expectedManifestKey: 'dao' },
  { contractKey: 'vaultHub', expectedEnv: 'EXPECTED_OWNER', expectedManifestKey: 'dao' },
  { contractKey: 'proofScoreBurnRouter', expectedEnv: 'EXPECTED_OWNER', expectedManifestKey: 'dao' },
  { contractKey: 'ownerControlPanel', expectedEnv: 'EXPECTED_OWNER', expectedManifestKey: 'dao' },
];

const PENDING_CHECKS: PendingCheck[] = [
  { contractKey: 'vfideToken', getter: 'pendingBurnRouterAt' },
  { contractKey: 'vfideToken', getter: 'pendingTreasurySinkAt' },
  { contractKey: 'vfideToken', getter: 'pendingSanctumSinkAt' },
  { contractKey: 'vfideToken', getter: 'pendingVaultHubAt' },
  { contractKey: 'vfideToken', getter: 'pendingLedgerAt' },
];

function norm(address: string): string {
  return address.toLowerCase();
}

function pickManifestPath(): string {
  if (process.env.DEPLOYMENT_FILE) {
    return resolve(process.cwd(), process.env.DEPLOYMENT_FILE);
  }

  const candidates = readdirSync(process.cwd())
    .filter((name) => /^deployments(-solo)?-.*\.json$/i.test(name))
    .map((name) => ({
      path: resolve(process.cwd(), name),
      mtime: statSync(resolve(process.cwd(), name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (!candidates.length) {
    throw new Error('No deployment manifest found. Set DEPLOYMENT_FILE=<path>.');
  }

  return candidates[0]!.path;
}

function loadManifest(path: string): DeploymentManifest {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as DeploymentManifest;
}

function requireAddress(book: AddressBook, key: string): string {
  const value = book[key];
  if (!value || !isAddress(value)) {
    throw new Error(`Missing or invalid address for key "${key}" in manifest`);
  }
  return value;
}

async function readAddressGetter(provider: JsonRpcProvider, contractAddress: string, getter: string): Promise<string> {
  const c = new Contract(contractAddress, [`function ${getter}() view returns (address)`], provider);
   
  const value = await (c as any)[getter]();
  return String(value);
}

async function readUintGetter(provider: JsonRpcProvider, contractAddress: string, getter: string): Promise<bigint> {
  const c = new Contract(contractAddress, [`function ${getter}() view returns (uint256)`], provider);
   
  const value = await (c as any)[getter]();
  return BigInt(value.toString());
}

async function run(): Promise<void> {
  const rpc = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpc);

  const manifestPath = pickManifestPath();
  const manifest = loadManifest(manifestPath);
  const addresses = manifest.addresses ?? {};

  console.log(`${BLUE}Using manifest:${RESET} ${manifestPath}`);
  console.log(`${BLUE}RPC:${RESET} ${rpc}`);

  let failures = 0;
  let warnings = 0;

  console.log(`\n${BLUE}1) Verifying contract graph links${RESET}`);
  for (const check of LINK_CHECKS) {
    const sourceAddress = addresses[check.contractKey];
    const expectedAddress = addresses[check.expectedKey];

    if (!sourceAddress || !expectedAddress) {
      warnings += 1;
      console.log(`${YELLOW}WARN${RESET} ${check.contractKey}.${check.getter} skipped (missing manifest keys)`);
      continue;
    }

    const onchain = await readAddressGetter(provider, sourceAddress, check.getter);
    if (norm(onchain) !== norm(expectedAddress)) {
      failures += 1;
      console.log(
        `${RED}FAIL${RESET} ${check.contractKey}.${check.getter} => ${onchain} (expected ${expectedAddress})`
      );
    } else {
      console.log(`${GREEN}PASS${RESET} ${check.contractKey}.${check.getter} => ${onchain}`);
    }
  }

  console.log(`\n${BLUE}2) Verifying ownership${RESET}`);
  for (const check of OWNER_CHECKS) {
    const contractAddress = addresses[check.contractKey];
    if (!contractAddress) {
      warnings += 1;
      console.log(`${YELLOW}WARN${RESET} ${check.contractKey}.owner skipped (missing manifest key)`);
      continue;
    }

    let expectedOwner: string | null = null;
    if (check.expectedEnv && process.env[check.expectedEnv] && isAddress(process.env[check.expectedEnv] as string)) {
      expectedOwner = process.env[check.expectedEnv] as string;
    } else if (check.expectedManifestKey) {
      const candidate = addresses[check.expectedManifestKey];
      expectedOwner = candidate && isAddress(candidate) ? candidate : null;
    }

    const onchainOwner = await readAddressGetter(provider, contractAddress, 'owner');

    if (!expectedOwner) {
      warnings += 1;
      console.log(`${YELLOW}WARN${RESET} ${check.contractKey}.owner => ${onchainOwner} (no expected owner configured)`);
      continue;
    }

    if (norm(onchainOwner) !== norm(expectedOwner)) {
      failures += 1;
      console.log(`${RED}FAIL${RESET} ${check.contractKey}.owner => ${onchainOwner} (expected ${expectedOwner})`);
    } else {
      console.log(`${GREEN}PASS${RESET} ${check.contractKey}.owner => ${onchainOwner}`);
    }
  }

  console.log(`\n${BLUE}3) Verifying pending timelocks are clear${RESET}`);
  for (const check of PENDING_CHECKS) {
    const contractAddress = addresses[check.contractKey];
    if (!contractAddress) {
      warnings += 1;
      console.log(`${YELLOW}WARN${RESET} ${check.contractKey}.${check.getter} skipped (missing manifest key)`);
      continue;
    }

    const pendingValue = await readUintGetter(provider, contractAddress, check.getter);
    if (pendingValue !== 0n) {
      failures += 1;
      console.log(`${RED}FAIL${RESET} ${check.contractKey}.${check.getter} => ${pendingValue}`);
    } else {
      console.log(`${GREEN}PASS${RESET} ${check.contractKey}.${check.getter} => 0`);
    }
  }

  console.log('\nSummary');
  console.log(`- failures: ${failures}`);
  console.log(`- warnings: ${warnings}`);

  if (failures > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
