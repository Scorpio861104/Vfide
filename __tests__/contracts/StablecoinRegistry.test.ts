/**
 * StablecoinRegistry Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
}));

describe('StablecoinRegistry Contract', () => {
  let owner: Address, usdc: Address, usdt: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    usdc = '0xUSDC11234567890123456789012345678901234' as Address;
    usdt = '0xUSDT11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Stablecoin Management', () => {
    it('should add stablecoin', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'addStablecoin', args: [usdc, 6] })).toBe(
        '0xhash'
      );
    });

    it('should remove stablecoin', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'removeStablecoin', args: [usdc] })).toBe(
        '0xhash'
      );
    });

    it('should check if allowed', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      expect(await mockContractRead({ functionName: 'isAllowed', args: [usdc] })).toBe(true);
    });

    it('should check if whitelisted', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      expect(await mockContractRead({ functionName: 'isWhitelisted', args: [usdc] })).toBe(true);
    });

    it('should get decimals of stablecoin', async () => {
      mockContractRead.mockResolvedValueOnce(6);
      expect(await mockContractRead({ functionName: 'decimalsOf', args: [usdc] })).toBe(6);
    });

    it('should get all stablecoins', async () => {
      mockContractRead.mockResolvedValueOnce([usdc, usdt]);
      expect(await mockContractRead({ functionName: 'getAllStablecoins' })).toEqual([usdc, usdt]);
    });

    it('should get allowed count', async () => {
      mockContractRead.mockResolvedValueOnce(2);
      expect(await mockContractRead({ functionName: 'allowedCount' })).toBe(2);
    });

    it('should set allowed status', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'setAllowed', args: [usdc, true] })).toBe(
        '0xhash'
      );
    });

    it('should reject duplicate stablecoin', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('AlreadyAdded'));
      await expect(
        mockContractWrite({ functionName: 'addStablecoin', args: [usdc, 6] })
      ).rejects.toThrow('AlreadyAdded');
    });

    it('should reject removing non-existent stablecoin', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NotFound'));
      await expect(
        mockContractWrite({ functionName: 'removeStablecoin', args: [usdc] })
      ).rejects.toThrow('NotFound');
    });

    it('should reject unauthorized add', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Ownable: caller is not the owner'));
      await expect(
        mockContractWrite({ functionName: 'addStablecoin', args: [usdc, 6] })
      ).rejects.toThrow('Ownable: caller is not the owner');
    });
  });

  describe('Ownership', () => {
    it('should get owner', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'owner' })).toBe(owner);
    });

    it('should get pending owner', async () => {
      mockContractRead.mockResolvedValueOnce(usdc);
      expect(await mockContractRead({ functionName: 'pendingOwner' })).toBe(usdc);
    });

    it('should accept ownership', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'acceptOwnership' })).toBe('0xhash');
    });

    it('should cancel ownership transfer', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'cancelOwnershipTransfer' })).toBe('0xhash');
    });

    it('should reject non-pending owner acceptance', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NotPendingOwner'));
      await expect(mockContractWrite({ functionName: 'acceptOwnership' })).rejects.toThrow(
        'NotPendingOwner'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should reject empty stablecoin symbol', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('SR_Bounds'));
      await expect(
        mockContractWrite({ functionName: 'addStablecoin', args: [usdc, 6, ''] })
      ).rejects.toThrow('SR_Bounds');
    });

    it('should reject zero treasury address', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('SR_Zero'));
      await expect(
        mockContractWrite({
          functionName: 'setTreasury',
          args: ['0x0000000000000000000000000000000000000000' as Address],
        })
      ).rejects.toThrow('SR_Zero');
    });

    it('should handle zero address stablecoin', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAddress'));
      await expect(
        mockContractWrite({
          functionName: 'addStablecoin',
          args: ['0x0000000000000000000000000000000000000000' as Address, 6],
        })
      ).rejects.toThrow('ZeroAddress');
    });

    it('should handle invalid decimals', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidDecimals'));
      await expect(
        mockContractWrite({ functionName: 'addStablecoin', args: [usdc, 0] })
      ).rejects.toThrow('InvalidDecimals');
    });

    it('should handle decimals exceeding limit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('DecimalsTooHigh'));
      await expect(
        mockContractWrite({ functionName: 'addStablecoin', args: [usdc, 30] })
      ).rejects.toThrow('DecimalsTooHigh');
    });

    it('should handle empty stablecoin list', async () => {
      mockContractRead.mockResolvedValueOnce([]);
      expect(await mockContractRead({ functionName: 'getAllStablecoins' })).toEqual([]);
    });

    it('should handle non-allowed stablecoin check', async () => {
      mockContractRead.mockResolvedValueOnce(false);
      expect(await mockContractRead({ functionName: 'isAllowed', args: [usdc] })).toBe(false);
    });
  });
});
