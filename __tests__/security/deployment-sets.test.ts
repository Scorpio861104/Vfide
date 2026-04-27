import fs from 'fs';
import { describe, it, expect } from '@jest/globals';

describe('deployment contract set policy', () => {
  it('keeps VFIDETestnetFaucet out of PRODUCTION_SET and in TESTNET_SET', () => {
    const productionSet = fs.readFileSync('contracts/PRODUCTION_SET.md', 'utf-8');
    const testnetSet = fs.readFileSync('contracts/TESTNET_SET.md', 'utf-8');
    const deployableSection = productionSet.split('## Excluded From Production Set')[0] ?? productionSet;

    expect(deployableSection).not.toContain('- VFIDETestnetFaucet.sol');
    expect(productionSet).toContain('VFIDETestnetFaucet.sol (testnet-only utility; listed in TESTNET_SET.md)');
    expect(testnetSet).toContain('VFIDETestnetFaucet.sol');
  });
});
