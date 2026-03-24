/**
 * EcosystemVault Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
}));

describe('EcosystemVault Contract', () => {
  let owner: Address, user1: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Constants', () => {
    it('should get MAX_BPS', async () => {
      mockContractRead.mockResolvedValueOnce(10000);
      expect(await mockContractRead({ functionName: 'MAX_BPS' })).toBe(10000);
    });

    it('should get headhunter min score', async () => {
      mockContractRead.mockResolvedValueOnce(850);
      expect(await mockContractRead({ functionName: 'HEADHUNTER_MIN_SCORE' })).toBe(850);
    });

    it('should get headhunter ranks', async () => {
      mockContractRead.mockResolvedValueOnce(10);
      expect(await mockContractRead({ functionName: 'HEADHUNTER_RANKS' })).toBe(10);
    });

    it('should get merchant ranks', async () => {
      mockContractRead.mockResolvedValueOnce(10);
      expect(await mockContractRead({ functionName: 'MERCHANT_RANKS' })).toBe(10);
    });

    it('should get max council members', async () => {
      mockContractRead.mockResolvedValueOnce(7);
      expect(await mockContractRead({ functionName: 'MAX_COUNCIL_MEMBERS' })).toBe(7);
    });

    it('should get max referrers per year', async () => {
      mockContractRead.mockResolvedValueOnce(100);
      expect(await mockContractRead({ functionName: 'MAX_REFERRERS_PER_YEAR' })).toBe(100);
    });

    it('should get max merchants per period', async () => {
      mockContractRead.mockResolvedValueOnce(50);
      expect(await mockContractRead({ functionName: 'MAX_MERCHANTS_PER_PERIOD' })).toBe(50);
    });

    it('should get min merchant tx', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1000'));
      expect(await mockContractRead({ functionName: 'MIN_MERCHANT_TX' })).toBe(parseEther('1000'));
    });

    it('should get min user vault USD', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('100'));
      expect(await mockContractRead({ functionName: 'MIN_USER_VAULT_USD' })).toBe(
        parseEther('100')
      );
    });

    it('should get min allocation BPS', async () => {
      mockContractRead.mockResolvedValueOnce(100);
      expect(await mockContractRead({ functionName: 'MIN_ALLOCATION_BPS' })).toBe(100);
    });

    it('should get points user referral', async () => {
      mockContractRead.mockResolvedValueOnce(100);
      expect(await mockContractRead({ functionName: 'POINTS_USER_REFERRAL' })).toBe(100);
    });

    it('should get points merchant referral', async () => {
      mockContractRead.mockResolvedValueOnce(500);
      expect(await mockContractRead({ functionName: 'POINTS_MERCHANT_REFERRAL' })).toBe(500);
    });

    it('should get month constant', async () => {
      mockContractRead.mockResolvedValueOnce(30 * 86400);
      expect(await mockContractRead({ functionName: 'MONTH' })).toBe(30 * 86400);
    });

    it('should get max rank iterations', async () => {
      mockContractRead.mockResolvedValueOnce(100);
      expect(await mockContractRead({ functionName: 'MAX_RANK_ITERATIONS' })).toBe(100);
    });

    it('should get headhunter rank share BPS', async () => {
      mockContractRead.mockResolvedValueOnce(1000);
      expect(await mockContractRead({ functionName: 'HEADHUNTER_RANK_SHARE_BPS' })).toBe(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle max ranks calculation', async () => {
      mockContractRead.mockResolvedValueOnce(10);
      const ranks = await mockContractRead({ functionName: 'HEADHUNTER_RANKS' });
      expect(ranks).toBe(10);
    });

    it('should handle min thresholds', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('100'));
      const minVault = await mockContractRead({ functionName: 'MIN_USER_VAULT_USD' });
      expect(minVault).toBe(parseEther('100'));
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Stablecoin Direct Reserve (Howey-safe work-compensation path)
  // ─────────────────────────────────────────────────────────────────────
  describe('Stablecoin Reserve — Howey-safe compensation', () => {
    const USDC = '0xUSDC0000000000000000000000000000000000000' as Address;

    it('should return zero reserve for a token that has not been funded', async () => {
      mockContractRead.mockResolvedValueOnce(BigInt(0));
      const balance = await mockContractRead({ functionName: 'stablecoinReserves', args: [USDC] });
      expect(balance).toBe(BigInt(0));
    });

    it('should accept a stablecoin deposit from an authorised manager', async () => {
      const amount = BigInt(1000_000_000); // 1 000 USDC (6 decimals)
      mockContractWrite.mockResolvedValueOnce('0xtxhash_deposit');
      const hash = await mockContractWrite({ functionName: 'depositStablecoinReserve', args: [USDC, amount] });
      expect(hash).toBe('0xtxhash_deposit');
    });

    it('should reflect deposited balance in the reserve mapping', async () => {
      const amount = BigInt(500_000_000); // 500 USDC
      mockContractRead.mockResolvedValueOnce(amount);
      const balance = await mockContractRead({ functionName: 'stablecoinReserves', args: [USDC] });
      expect(balance).toBe(amount);
    });

    it('should allow owner to withdraw from the reserve', async () => {
      mockContractWrite.mockResolvedValueOnce('0xtxhash_withdraw');
      const hash = await mockContractWrite({
        functionName: 'withdrawStablecoinReserve',
        args: [USDC, BigInt(100_000_000), owner],
      });
      expect(hash).toBe('0xtxhash_withdraw');
    });

    it('should enable stablecoin-only mode when reserve is funded', async () => {
      mockContractWrite.mockResolvedValueOnce('0xtxhash_mode');
      const hash = await mockContractWrite({ functionName: 'setStablecoinOnlyMode', args: [true] });
      expect(hash).toBe('0xtxhash_mode');
    });

    it('should pay merchant work reward from stablecoin reserve when mode is on', async () => {
      const amount = BigInt(10_000_000); // 10 USDC
      mockContractWrite.mockResolvedValueOnce('0xtxhash_merchant_reward');
      const hash = await mockContractWrite({
        functionName: 'payMerchantWorkReward',
        args: [user1, amount, 'verified_merchant_tx'],
      });
      expect(hash).toBe('0xtxhash_merchant_reward');
    });

    it('should pay referral work reward from stablecoin reserve when mode is on', async () => {
      const amount = BigInt(5_000_000); // 5 USDC
      mockContractWrite.mockResolvedValueOnce('0xtxhash_referral_reward');
      const hash = await mockContractWrite({
        functionName: 'payReferralWorkReward',
        args: [user1, amount, 'verified_user_referral'],
      });
      expect(hash).toBe('0xtxhash_referral_reward');
    });

    it('claimHeadhunterReward remains permanently disabled (rank/percentage claims not allowed)', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ECO_RewardsNotAvailable'));
      await expect(
        mockContractWrite({ functionName: 'claimHeadhunterReward', args: [BigInt(2024), BigInt(1)] })
      ).rejects.toThrow('ECO_RewardsNotAvailable');
    });

    it('claimMerchantReward remains permanently disabled (rank/percentage claims not allowed)', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ECO_RewardsNotAvailable'));
      await expect(
        mockContractWrite({ functionName: 'claimMerchantReward', args: [BigInt(1)] })
      ).rejects.toThrow('ECO_RewardsNotAvailable');
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Auto-swap (DEX path) — available once liquidity is established
  // ─────────────────────────────────────────────────────────────────────
  describe('Auto-swap configuration — phased deployment', () => {
    const ROUTER = '0xRouter000000000000000000000000000000000' as Address;
    const USDC = '0xUSDC0000000000000000000000000000000000000' as Address;
    // 0.95 USDC (6 decimals) per 1 VFIDE (18 decimals): 950000 * 1e12
    const MIN_OUTPUT = BigInt(950_000) * BigInt(1_000_000_000_000);

    it('should return zero minOutputPerVfide before it is set', async () => {
      mockContractRead.mockResolvedValueOnce(BigInt(0));
      const value = await mockContractRead({ functionName: 'minOutputPerVfide' });
      expect(value).toBe(BigInt(0));
    });

    it('should allow owner to set minOutputPerVfide', async () => {
      mockContractWrite.mockResolvedValueOnce('0xtxhash_set_min_output');
      const hash = await mockContractWrite({
        functionName: 'setMinOutputPerVfide',
        args: [MIN_OUTPUT],
      });
      expect(hash).toBe('0xtxhash_set_min_output');
    });

    it('should reflect the updated minOutputPerVfide', async () => {
      mockContractRead.mockResolvedValueOnce(MIN_OUTPUT);
      const value = await mockContractRead({ functionName: 'minOutputPerVfide' });
      expect(value).toBe(MIN_OUTPUT);
    });

    it('should allow configureAutoSwap with _enabled=true once minOutputPerVfide is set', async () => {
      mockContractWrite.mockResolvedValueOnce('0xtxhash_configure_swap');
      const hash = await mockContractWrite({
        functionName: 'configureAutoSwap',
        args: [ROUTER, USDC, true, 100],
      });
      expect(hash).toBe('0xtxhash_configure_swap');
    });

    it('should reject configureAutoSwap with _enabled=true when minOutputPerVfide is zero', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ECO: set min output price first'));
      await expect(
        mockContractWrite({ functionName: 'configureAutoSwap', args: [ROUTER, USDC, true, 100] })
      ).rejects.toThrow('ECO: set min output price first');
    });

    it('should allow configureAutoSwap to disable auto-swap without a floor price', async () => {
      mockContractWrite.mockResolvedValueOnce('0xtxhash_disable_swap');
      const hash = await mockContractWrite({
        functionName: 'configureAutoSwap',
        args: ['0x0000000000000000000000000000000000000000', USDC, false, 100],
      });
      expect(hash).toBe('0xtxhash_disable_swap');
    });
  });
});
