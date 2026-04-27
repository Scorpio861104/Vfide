import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ARTIFACTS_ROOT = resolve(process.cwd(), 'artifacts/contracts');
const EIP170_RUNTIME_LIMIT = 24_576;
const RUNTIME_BUFFER_LIMIT = 24_000;
const BUFFER_EXCEPTIONS: Record<string, number> = {
  // Near-limit contracts tracked for continued shrink work; never allow above EIP-170.
  MerchantPortal: EIP170_RUNTIME_LIMIT,
  DeployPhase3: EIP170_RUNTIME_LIMIT,
  VFIDEToken: EIP170_RUNTIME_LIMIT,
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
  const contractSizes = readContractSizes();

  if (contractSizes.length === 0) {
    throw new Error('No compiled contract artifacts found under artifacts/contracts. Run hardhat compile first.');
  }

  const overHardLimit = contractSizes.filter((entry) => entry.runtimeBytes > EIP170_RUNTIME_LIMIT);
  const overBufferLimit = contractSizes.filter((entry) => {
    const limit = BUFFER_EXCEPTIONS[entry.contractName] ?? RUNTIME_BUFFER_LIMIT;
    return entry.runtimeBytes > limit;
  });

  console.log(`Checked ${contractSizes.length} compiled contracts for runtime bytecode size.`);

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