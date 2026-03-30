import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'lib/abis/index.ts');
const artifactsRoot = path.join(root, 'artifacts/contracts');

const ARTIFACT_OVERRIDES: Record<string, string> = {
  'BurnRouter.json': 'artifacts/contracts/ProofScoreBurnRouter.sol/ProofScoreBurnRouter.json',
  'DevReserveVesting.json': 'artifacts/contracts/DevReserveVestingVault.sol/DevReserveVestingVault.json',
  'ERC20.json': 'artifacts/contracts/SharedInterfaces.sol/IERC20.json',
  'UserVault.json': 'artifacts/contracts/VaultInfrastructure.sol/UserVaultLegacy.json',
  'UserVaultLite.json': 'artifacts/contracts/VaultInfrastructure.sol/UserVaultLegacy.json',
  'VaultHubLite.json': 'artifacts/contracts/VaultHub.sol/VaultHub.json',
};

const MANUAL_ABI_EXCEPTIONS = new Set<string>([
  'UserRewards.json',
]);

const PARITY_EXEMPTIONS = new Set<string>([
  // Intentional synthetic/helper ABIs not expected to byte-for-byte match one compiled artifact.
  'BurnRouter.json',
  'ERC20.json',
  'UserVaultLite.json',
  'VaultHubLite.json',
]);

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getExportedAbiFiles(indexContents: string): string[] {
  const matches = [...indexContents.matchAll(/import\s+\w+\s+from\s+'\.\/([^']+\.json)'/g)];
  const files = matches.map((m) => m[1]).filter((x): x is string => x !== undefined);
  return [...new Set(files)].sort();
}

function findArtifactByBasename(basename: string): string | null {
  const hit: string[] = [];

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === basename) {
        hit.push(fullPath);
      }
    }
  }

  walk(artifactsRoot);
  if (hit.length === 1) return hit[0] ?? null;
  if (hit.length === 0) return null;
  throw new Error(`Ambiguous artifact basename ${basename}: ${hit.map((p) => path.relative(root, p)).join(', ')}`);
}

function extractAbi(doc: unknown, sourcePath: string): unknown[] {
  if (Array.isArray(doc)) return doc;

  if (doc && typeof doc === 'object' && Array.isArray((doc as { abi?: unknown[] }).abi)) {
    return (doc as { abi: unknown[] }).abi;
  }

  throw new Error(`Unable to extract ABI array from ${sourcePath}`);
}

function main(): void {
  const indexContents = fs.readFileSync(indexPath, 'utf8');
  const abiFiles = getExportedAbiFiles(indexContents);

  const manualMissing: string[] = [];
  const hardMissing: string[] = [];
  const mismatches: Array<{ file: string; missingCount: number; firstMissing: string }> = [];

  for (const abiFile of abiFiles) {
    if (PARITY_EXEMPTIONS.has(abiFile)) {
      continue;
    }

    const frontendPath = path.join(root, 'lib/abis', abiFile);
    const overrideArtifact = ARTIFACT_OVERRIDES[abiFile]
      ? path.join(root, ARTIFACT_OVERRIDES[abiFile])
      : null;
    const discoveredArtifact = overrideArtifact ?? findArtifactByBasename(abiFile);

    if (!discoveredArtifact) {
      if (MANUAL_ABI_EXCEPTIONS.has(abiFile)) {
        manualMissing.push(abiFile);
      } else {
        hardMissing.push(abiFile);
      }
      continue;
    }

    const frontendAbi = extractAbi(readJson(frontendPath), frontendPath);
    const artifactAbi = extractAbi(readJson(discoveredArtifact), discoveredArtifact);

    const artifactSet = new Set(artifactAbi.map(stableSerialize));
    const missingFragments = frontendAbi
      .map(stableSerialize)
      .filter((fragment) => !artifactSet.has(fragment));

    if (missingFragments.length > 0) {
      mismatches.push({
        file: abiFile,
        missingCount: missingFragments.length,
        firstMissing: missingFragments[0] ?? '',
      });
    }
  }

  if (manualMissing.length > 0) {
    console.warn('Manual ABI exceptions (no compiled artifact available):');
    for (const name of manualMissing) {
      console.warn(`- ${name}`);
    }
  }

  if (hardMissing.length > 0) {
    console.error('Missing artifact mappings for frontend ABIs:');
    for (const name of hardMissing) {
      console.error(`- ${name}`);
    }
  }

  if (mismatches.length > 0) {
    console.error('ABI mismatch detected (frontend ABI includes fragments missing in artifact ABI):');
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch.file}: ${mismatch.missingCount} fragment(s) missing`);
      console.error(`  first missing fragment: ${mismatch.firstMissing}`);
    }
  }

  if (hardMissing.length > 0 || mismatches.length > 0) {
    process.exitCode = 1;
    return;
  }

  const checkedCount = abiFiles.length - manualMissing.length - PARITY_EXEMPTIONS.size;
  console.log(`ABI parity check passed for ${checkedCount} mapped frontend ABIs.`);
}

main();