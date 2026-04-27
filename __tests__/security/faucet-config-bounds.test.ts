import fs from 'fs';
import { describe, it, expect } from '@jest/globals';

describe('testnet faucet config bounds', () => {
  it('keeps explicit max bounds and validation guards for claim and cap setters', () => {
    const source = fs.readFileSync('contracts/VFIDETestnetFaucet.sol', 'utf-8');

    expect(source).toContain('error Faucet_InvalidConfig();');
    expect(source).toContain('MAX_CLAIM_AMOUNT_VFIDE');
    expect(source).toContain('MAX_CLAIM_AMOUNT_ETH');
    expect(source).toContain('MAX_DAILY_CLAIM_CAP');
    expect(source).toContain('MAX_OPERATOR_DAILY_CLAIM_CAP');

    expect(source).toContain('if (_vfide > MAX_CLAIM_AMOUNT_VFIDE || _eth > MAX_CLAIM_AMOUNT_ETH) revert Faucet_InvalidConfig();');
    expect(source).toContain('if (_cap == 0 || _cap > MAX_DAILY_CLAIM_CAP || _cap < operatorDailyClaimCap) revert Faucet_InvalidConfig();');
    expect(source).toContain('if (_cap > MAX_OPERATOR_DAILY_CLAIM_CAP || _cap > dailyClaimCap) revert Faucet_InvalidConfig();');
  });
});
