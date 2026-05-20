/**
 * EIP-3860 initcode size enforcement.
 *
 * Complements scripts/verify-contract-size-buffer.ts (which checks the EIP-170
 * deployed-bytecode limit) by checking the EIP-3860 initcode limit (49,152 bytes,
 * introduced in Shanghai).
 *
 * A contract whose initcode exceeds 49,152 bytes will revert on deployment via
 * CREATE/CREATE2 on post-Shanghai chains, even if its deployed bytecode is small.
 *
 * Usage:
 *   npx tsx scripts/verify-contract-initcode-size.ts
 *
 * Exits non-zero if any production contract is over the limit (or over the
 * project's tighter early-warning buffer).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ARTIFACTS_ROOT = resolve(process.cwd(), 'artifacts/contracts');

// EIP-3860 hard limit. Code that emits initcode larger than this cannot be
// deployed on post-Shanghai EVM (Mainnet, Base, OP, Arbitrum, Polygon, etc.).
const EIP3860_INITCODE_LIMIT = 49_152;

// Early-warning buffer — encourages staying under the wire so future small
// changes don't push a contract over.
const INITCODE_BUFFER_LIMIT = 48_000;

// `contracts/future/*` is intentionally excluded (not deployed in Phase 1).
const EXCLUDED_PATH_SEGMENTS = [
  `${resolve(process.cwd(), 'artifacts/contracts/future')}/`,
];

// Per-contract overrides — only allowed UP TO the EIP-3860 hard limit.
// This is the staging table: as size-refactor PRs land, entries here get
// removed so the buffer policy reasserts itself.
const BUFFER_EXCEPTIONS: Record<string, number> = {
  // Currently being tracked for the EIP-170 / EIP-3860 size-refactor effort
  // (see EIP170_SIZE_REFACTOR_PLAN.md). Each MUST come down below
  // INITCODE_BUFFER_LIMIT before mainnet.
};

type ArtifactShape = {
  contractName?: string;
  bytecode?: string;
};

type InitcodeSize = {
  contractName: string;
  initcodeBytes: number;
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

function readInitcodeSizes(): InitcodeSize[] {
  const artifactPaths = collectArtifactPaths(ARTIFACTS_ROOT);

  return artifactPaths
    .filter((artifactPath) => {
      const normalizedPath = `${resolve(artifactPath)}/`;
      return EXCLUDED_PATH_SEGMENTS.every((excluded) => !normalizedPath.startsWith(excluded));
    })
    .map((artifactPath) => {
      const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as ArtifactShape;
      const initcode = artifact.bytecode ?? '0x';
      const initcodeBytes = byteLength(initcode);

      if (initcodeBytes === 0) return null;

      return {
        contractName: artifact.contractName ?? relative(ARTIFACTS_ROOT, artifactPath),
        initcodeBytes,
        artifactPath: relative(process.cwd(), artifactPath),
      } satisfies InitcodeSize;
    })
    .filter((entry): entry is InitcodeSize => entry !== null)
    .sort((left, right) => right.initcodeBytes - left.initcodeBytes);
}

function main() {
  const sizes = readInitcodeSizes();

  if (sizes.length === 0) {
    throw new Error(
      'No compiled contract artifacts found under artifacts/contracts. Run hardhat compile first.'
    );
  }

  const overHardLimit = sizes.filter((entry) => entry.initcodeBytes > EIP3860_INITCODE_LIMIT);
  const overBufferLimit = sizes.filter((entry) => {
    const limit = BUFFER_EXCEPTIONS[entry.contractName] ?? INITCODE_BUFFER_LIMIT;
    return entry.initcodeBytes > limit;
  });

  console.log(
    `Checked ${sizes.length} compiled production-scope contracts for initcode size (EIP-3860).`
  );

  if (overHardLimit.length > 0) {
    console.error(
      `Contracts exceeding EIP-3860 initcode limit (${EIP3860_INITCODE_LIMIT} bytes):`
    );
    for (const entry of overHardLimit) {
      const overBy = entry.initcodeBytes - EIP3860_INITCODE_LIMIT;
      console.error(
        `- ${entry.contractName}: ${entry.initcodeBytes} bytes ` +
        `(over by ${overBy}, +${Math.round((100 * overBy) / EIP3860_INITCODE_LIMIT)}%) ` +
        `(${entry.artifactPath})`
      );
    }
    throw new Error('One or more contracts exceed the EIP-3860 initcode limit.');
  }

  if (overBufferLimit.length > 0) {
    console.error(
      `Contracts exceeding the enforced initcode buffer policy (default ${INITCODE_BUFFER_LIMIT} bytes):`
    );
    for (const entry of overBufferLimit) {
      const limit = BUFFER_EXCEPTIONS[entry.contractName] ?? INITCODE_BUFFER_LIMIT;
      console.error(`- ${entry.contractName}: ${entry.initcodeBytes} bytes (limit ${limit}) (${entry.artifactPath})`);
    }
    throw new Error('One or more contracts exceed the initcode size buffer limit.');
  }

  const largest = sizes.slice(0, 10);
  console.log('Largest initcode contracts within buffer:');
  for (const entry of largest) {
    console.log(`- ${entry.contractName}: ${entry.initcodeBytes} bytes`);
  }
}

main();
