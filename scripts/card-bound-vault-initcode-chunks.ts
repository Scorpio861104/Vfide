import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHUNK_COUNT = 4;
const CHUNK_BYTES = 8_000;
const ZERO_HEX_PREFIX = '0x';

interface Artifact {
  bytecode: string;
}

function loadCardBoundVaultBytecode(): string {
  const artifactPath = resolve(
    process.cwd(),
    'artifacts/contracts/vault/CardBoundVault.sol/CardBoundVault.json'
  );
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as Artifact;
  if (!artifact.bytecode || !artifact.bytecode.startsWith(ZERO_HEX_PREFIX)) {
    throw new Error(`CardBoundVault artifact at ${artifactPath} is missing creation bytecode`);
  }
  return artifact.bytecode.slice(2);
}

function chunkBytecode(bytecode: string): string[] {
  const hexPerChunk = CHUNK_BYTES * 2;
  const chunks: string[] = [];
  for (let offset = 0; offset < bytecode.length; offset += hexPerChunk) {
    chunks.push(bytecode.slice(offset, offset + hexPerChunk));
  }
  if (chunks.length > CHUNK_COUNT) {
    throw new Error(
      `CardBoundVault creation bytecode requires ${chunks.length} chunks; expected <= ${CHUNK_COUNT}. ` +
        'Increase CHUNK_COUNT and update CardBoundVaultInitCodeStore before deploying.'
    );
  }
  while (chunks.length < CHUNK_COUNT) {
    chunks.push('');
  }
  return chunks;
}

function renderChunk(index: number, chunk: string): string {
  const name = `CardBoundVaultInitCodeChunk${index}`;
  return `// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Holds chunk ${index} of CardBoundVault creation bytecode for deployable EIP-3860-safe storage.
/// @title ${name}
/// @author Vfide
contract ${name} {
    /// @notice get
    /// @return _bytes _bytes
    function get() external pure returns (bytes memory) {
        return hex"${chunk}";
    }
}
`;
}

function chunkPath(index: number): string {
  return resolve(process.cwd(), `contracts/vault/CardBoundVaultInitCodeChunk${index}.sol`);
}

function main() {
  const mode = process.argv.includes('--write')
    ? 'write'
    : process.argv.includes('--check')
      ? 'check'
      : undefined;
  if (!mode) {
    throw new Error('Usage: tsx scripts/card-bound-vault-initcode-chunks.ts --check|--write');
  }

  const bytecode = loadCardBoundVaultBytecode();
  const chunks = chunkBytecode(bytecode);
  const rendered = chunks.map((chunk, index) => renderChunk(index, chunk));

  if (mode === 'write') {
    rendered.forEach((content, index) => writeFileSync(chunkPath(index), content));
    console.log(
      `Generated ${CHUNK_COUNT} CardBoundVault initcode chunks; source bytecode bytes=${bytecode.length / 2}; chunk sizes=${JSON.stringify(
        chunks.map((chunk) => chunk.length / 2)
      )}`
    );
    return;
  }

  const mismatches: string[] = [];
  rendered.forEach((expected, index) => {
    const path = chunkPath(index);
    let actual = '';
    try {
      actual = readFileSync(path, 'utf8');
    } catch (_error) {
      mismatches.push(`${path}: missing`);
      return;
    }
    if (actual !== expected) {
      mismatches.push(`${path}: stale or manually edited`);
    }
  });

  if (mismatches.length > 0) {
    throw new Error(
      'CardBoundVault initcode chunks are stale. Run `npm run contract:initcode-chunks:write` after compiling.\n' +
        mismatches.join('\n')
    );
  }

  console.log(
    `CardBoundVault initcode chunks match artifact bytecode; source bytecode bytes=${bytecode.length / 2}; chunk sizes=${JSON.stringify(
      chunks.map((chunk) => chunk.length / 2)
    )}`
  );
}

main();
