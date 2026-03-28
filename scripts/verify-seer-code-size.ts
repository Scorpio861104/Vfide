import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EIP170_RUNTIME_LIMIT = 24_576;
const EIP3860_INITCODE_LIMIT = 49_152;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function byteLength(hex: string): number {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  return normalized.length / 2;
}

function main() {
  const artifactPath = resolve(process.cwd(), 'artifacts/contracts/Seer.sol/Seer.json');
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as {
    bytecode: string;
    deployedBytecode: string;
  };

  const initcodeBytes = byteLength(artifact.bytecode ?? '0x');
  const runtimeBytes = byteLength(artifact.deployedBytecode ?? '0x');

  assert(runtimeBytes <= EIP170_RUNTIME_LIMIT,
    `Seer runtime size ${runtimeBytes} exceeds EIP-170 limit ${EIP170_RUNTIME_LIMIT}`);
  assert(initcodeBytes <= EIP3860_INITCODE_LIMIT,
    `Seer initcode size ${initcodeBytes} exceeds EIP-3860 limit ${EIP3860_INITCODE_LIMIT}`);

  console.log(`Seer size verification passed (runtime=${runtimeBytes}, initcode=${initcodeBytes})`);
}

main();
