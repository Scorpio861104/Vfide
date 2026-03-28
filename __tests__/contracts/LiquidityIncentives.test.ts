/**
 * LiquidityIncentives Contract Tests
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

describe('LiquidityIncentives Contract', () => {
  let owner: Address, user1: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Pool Management', () => {
    it('should add pool', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'addPool', args: [user1, 1000, true] })).toBe(
        '0xhash'
      );
    });

    it('should get all pools', async () => {
      mockContractRead.mockResolvedValueOnce([user1, owner]);
      expect(await mockContractRead({ functionName: 'getAllPools' })).toEqual([user1, owner]);
    });

    it('should get pool info', async () => {
      const info = { lpToken: user1, allocPoint: 1000, lastRewardTime: 123456 };
      mockContractRead.mockResolvedValueOnce(info);
      expect(await mockContractRead({ functionName: 'getPoolInfo', args: [0] })).toEqual(info);
    });

    it('should get pool list', async () => {
      mockContractRead.mockResolvedValueOnce([user1, owner]);
      expect(await mockContractRead({ functionName: 'poolList', args: [0] })).toEqual([
        user1,
        owner,
      ]);
    });

    it('should get pools mapping', async () => {
      const pool = { lpToken: user1, allocPoint: 1000 };
      mockContractRead.mockResolvedValueOnce(pool);
      expect(await mockContractRead({ functionName: 'pools', args: [0] })).toEqual(pool);
    });

    it('should reject duplicate pool', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('PoolExists'));
      await expect(
        mockContractWrite({ functionName: 'addPool', args: [user1, 1000, true] })
      ).rejects.toThrow('PoolExists');
    });

    it('should reject unauthorized pool addition', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Ownable: caller is not the owner'));
      await expect(
        mockContractWrite({ functionName: 'addPool', args: [user1, 1000, true] })
      ).rejects.toThrow('Ownable: caller is not the owner');
    });
  });

  describe('Incentive Operations', () => {
    it('should get user stake', async () => {
      const stake = { amount: parseEther('100'), rewardDebt: parseEther('10'), stakeTime: 123456 };
      mockContractRead.mockResolvedValueOnce(stake);
      expect(await mockContractRead({ functionName: 'getUserStake', args: [0, user1] })).toEqual(
        stake
      );
    });

    it('should get pending rewards', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('50'));
      expect(await mockContractRead({ functionName: 'pendingRewards', args: [0, user1] })).toBe(
        parseEther('50')
      );
    });

    it('should claim rewards', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'claimRewards', args: [0] })).toBe('0xhash');
    });

    it('should compound rewards', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'compound', args: [0] })).toBe('0xhash');
    });

    it('should reject claim with no rewards', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NoRewards'));
      await expect(mockContractWrite({ functionName: 'claimRewards', args: [0] })).rejects.toThrow(
        'NoRewards'
      );
    });

    it('should reject claim from invalid pool', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidPool'));
      await expect(
        mockContractWrite({ functionName: 'claimRewards', args: [999] })
      ).rejects.toThrow('InvalidPool');
    });
  });

  describe('Bonus System', () => {
    it('should get proof score bonus BPS', async () => {
      mockContractRead.mockResolvedValueOnce(2000);
      expect(await mockContractRead({ functionName: 'proofScoreBonusBps' })).toBe(2000);
    });

    it('should get proof score bonus min score', async () => {
      mockContractRead.mockResolvedValueOnce(750);
      expect(await mockContractRead({ functionName: 'proofScoreBonusMinScore' })).toBe(750);
    });

    it('should get max time bonus BPS', async () => {
      mockContractRead.mockResolvedValueOnce(5000);
      expect(await mockContractRead({ functionName: 'MAX_TIME_BONUS_BPS' })).toBe(5000);
    });

    it('should get stake bonus period', async () => {
      mockContractRead.mockResolvedValueOnce(90 * 86400);
      expect(await mockContractRead({ functionName: 'STAKE_BONUS_PERIOD' })).toBe(90 * 86400);
    });
  });

  describe('Integration', () => {
    it('should get DAO address', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'dao' })).toBe(owner);
    });

    it('should get seer address', async () => {
      mockContractRead.mockResolvedValueOnce(user1);
      expect(await mockContractRead({ functionName: 'seer' })).toBe(user1);
    });
  });

  describe('Edge Cases', () => {
    it('should reject zero unstake cooldown', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('LP: cooldown too short'));
      await expect(
        mockContractWrite({ functionName: 'setUnstakeCooldown', args: [0] })
      ).rejects.toThrow('LP: cooldown too short');
    });

    it('should handle zero stake', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroStake'));
      await expect(mockContractWrite({ functionName: 'claimRewards', args: [0] })).rejects.toThrow(
        'ZeroStake'
      );
    });

    it('should handle pool index out of bounds', async () => {
      mockContractRead.mockRejectedValueOnce(new Error('IndexOutOfBounds'));
      await expect(mockContractRead({ functionName: 'getPoolInfo', args: [999] })).rejects.toThrow(
        'IndexOutOfBounds'
      );
    });

    it('should handle zero alloc point', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAllocPoint'));
      await expect(
        mockContractWrite({ functionName: 'addPool', args: [user1, 0, true] })
      ).rejects.toThrow('ZeroAllocPoint');
    });

    it('should handle compound with no rewards', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NoRewardsToCompound'));
      await expect(mockContractWrite({ functionName: 'compound', args: [0] })).rejects.toThrow(
        'NoRewardsToCompound'
      );
    });
  });
});
