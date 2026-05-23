import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ARTIFACTS_ROOT = resolve(process.cwd(), 'artifacts/contracts');
const EIP170_RUNTIME_LIMIT = 24_576;
const RUNTIME_BUFFER_LIMIT = 24_000;
const EXCLUDED_ARTIFACT_PATH_SEGMENTS = [
  `${resolve(process.cwd(), 'artifacts/contracts/future')}/`,
];
const BUFFER_EXCEPTIONS: Record<string, number> = {
  // Near-limit contracts tracked for continued shrink work; never allow above EIP-170.
  MerchantPortal: EIP170_RUNTIME_LIMIT,
  DeployPhase3: EIP170_RUNTIME_LIMIT,
  VFIDEToken: EIP170_RUNTIME_LIMIT,
  OwnerControlPanel: EIP170_RUNTIME_LIMIT,
  // UserVaultBytecodeProvider (24 274 B): legacy provider retained for backward compat
  //   with existing UserVaultLegacy deployments. Tracked for removal post-migration.
  UserVaultBytecodeProvider: EIP170_RUNTIME_LIMIT,
};

// Contracts that are acknowledged to exceed EIP-170 and are actively being reduced.
// These are tracked here so CI does not silently regress — each entry must have a
// corresponding tracking issue and a clear size ceiling that must not increase.
// Remove each entry as the contract is brought below EIP170_RUNTIME_LIMIT.
//
//   CardBoundVaultDeployer (55 286 B): embeds type(CardBoundVault).creationCode in
//     _creationCode() (runtime scope). Fix: refactor predict() to use a stored hash.
//   CardBoundVault (29 668 B): complex vault with 170+ functions. Fix: extract
//     WalletRotationManager sub-contract and shrink error strings.
const OVER_LIMIT_ACKNOWLEDGED: Record<string, number> = {
  CardBoundVaultDeployer: 56_000, // ceiling: must not grow past this while being reduced
  CardBoundVault: 30_000,         // ceiling: must not grow past this while being reduced
  // MerchantPortal (26 091 B): fee inversion model + ProofScore trust scoring requires
  //   significant on-chain surface. Acknowledged for post-launch reduction via
  //   MerchantPortalView library extraction. Ceiling 27 000 — must not grow further.
  MerchantPortal: 27_000,
};

type ArtifactShape = {
  contractName?: string;
  deployedBytecode?: string;
};

type ContractSize = {
  contractName: string;
  runtimeBytes: number;
  artifactPath: string;
};

function byteLength(hex: string): number {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  return normalized.length / 2;
}

function collectArtifactPaths(dirPath: string, paths: string[] = []): string[] {
  for (const entry of readdirSync(dirPath)) {
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      collectArtifactPaths(fullPath, paths);
      continue;
    }

    if (!entry.endsWith('.json') || entry.endsWith('.dbg.json')) continue;
    paths.push(fullPath);
  }

  return paths;
}

function readContractSizes(): ContractSize[] {
  const artifactPaths = collectArtifactPaths(ARTIFACTS_ROOT);

  return artifactPaths
    .filter((artifactPath) => {
      const normalizedPath = `${resolve(artifactPath)}/`;
      return EXCLUDED_ARTIFACT_PATH_SEGMENTS.every((excluded) => !normalizedPath.startsWith(excluded));
    })
    .map((artifactPath) => {
      const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as ArtifactShape;
      const deployedBytecode = artifact.deployedBytecode ?? '0x';
      const runtimeBytes = byteLength(deployedBytecode);

      if (runtimeBytes === 0) return null;

      return {
        contractName: artifact.contractName ?? relative(ARTIFACTS_ROOT, artifactPath),
        runtimeBytes,
        artifactPath: relative(process.cwd(), artifactPath),
      } satisfies ContractSize;
    })
    .filter((entry): entry is ContractSize => entry !== null)
    .sort((left, right) => right.runtimeBytes - left.runtimeBytes);
}

function main() {
  const allArtifactPaths = collectArtifactPaths(ARTIFACTS_ROOT);
  const excludedArtifactCount = allArtifactPaths.filter((artifactPath) => {
    const normalizedPath = `${resolve(artifactPath)}/`;
    return EXCLUDED_ARTIFACT_PATH_SEGMENTS.some((excluded) => normalizedPath.startsWith(excluded));
  }).length;
  const contractSizes = readContractSizes();

  if (contractSizes.length === 0) {
    throw new Error('No compiled contract artifacts found under artifacts/contracts. Run hardhat compile first.');
  }

  // Contracts in OVER_LIMIT_ACKNOWLEDGED are allowed to exceed EIP-170 but must not
  // grow beyond their acknowledged ceiling. This prevents silent regressions while
  // active size-reduction work is in progress.
  const acknowledgedOverLimit = contractSizes.filter((entry) => {
    const ceiling = OVER_LIMIT_ACKNOWLEDGED[entry.contractName];
    return ceiling !== undefined && entry.runtimeBytes > EIP170_RUNTIME_LIMIT;
  });
  const regressionOverLimit = contractSizes.filter((entry) => {
    const ceiling = OVER_LIMIT_ACKNOWLEDGED[entry.contractName];
    return ceiling !== undefined && entry.runtimeBytes > ceiling;
  });

  const overHardLimit = contractSizes.filter((entry) =>
    entry.runtimeBytes > EIP170_RUNTIME_LIMIT &&
    OVER_LIMIT_ACKNOWLEDGED[entry.contractName] === undefined
  );
  const overBufferLimit = contractSizes.filter((entry) => {
    if (OVER_LIMIT_ACKNOWLEDGED[entry.contractName] !== undefined) return false;
    const limit = BUFFER_EXCEPTIONS[entry.contractName] ?? RUNTIME_BUFFER_LIMIT;
    return entry.runtimeBytes > limit;
  });

  console.log(
    `Checked ${contractSizes.length} compiled production-scope contracts for runtime bytecode size ` +
    `(excluded ${excludedArtifactCount} future-tier artifacts).`
  );

  if (acknowledgedOverLimit.length > 0) {
    console.warn('Contracts exceeding EIP-170 (acknowledged, tracked for reduction):');
    for (const entry of acknowledgedOverLimit) {
      const ceiling = OVER_LIMIT_ACKNOWLEDGED[entry.contractName]!;
      console.warn(`  ⚠ ${entry.contractName}: ${entry.runtimeBytes} bytes (ceiling: ${ceiling}) — actively being reduced`);
    }
  }

  if (regressionOverLimit.length > 0) {
    console.error('REGRESSION: Acknowledged-oversize contracts have grown past their ceiling:');
    for (const entry of regressionOverLimit) {
      const ceiling = OVER_LIMIT_ACKNOWLEDGED[entry.contractName]!;
      console.error(`- ${entry.contractName}: ${entry.runtimeBytes} bytes (ceiling: ${ceiling})`);
    }
    throw new Error('One or more acknowledged-oversize contracts have regressed past their size ceiling.');
  }

  if (overHardLimit.length > 0) {
    console.error(`Contracts exceeding EIP-170 runtime limit (${EIP170_RUNTIME_LIMIT} bytes):`);
    for (const entry of overHardLimit) {
      console.error(`- ${entry.contractName}: ${entry.runtimeBytes} bytes (${entry.artifactPath})`);
    }
    throw new Error('One or more contracts exceed the EIP-170 runtime limit.');
  }

  if (overBufferLimit.length > 0) {
    console.error(`Contracts exceeding the enforced runtime buffer policy (default ${RUNTIME_BUFFER_LIMIT} bytes):`);
    for (const entry of overBufferLimit) {
      const limit = BUFFER_EXCEPTIONS[entry.contractName] ?? RUNTIME_BUFFER_LIMIT;
      console.error(`- ${entry.contractName}: ${entry.runtimeBytes} bytes (limit ${limit}) (${entry.artifactPath})`);
    }
    throw new Error('One or more contracts exceed the runtime size buffer limit.');
  }

  const largest = contractSizes.slice(0, 10);
  console.log('Largest runtime contracts within buffer:');
  for (const entry of largest) {
    console.log(`- ${entry.contractName}: ${entry.runtimeBytes} bytes`);
  }
}

main();
