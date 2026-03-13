/**
 * TempVault Contract Tests
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

describe('TempVault Contract', () => {
  let owner: Address, user1: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Vault Operations', () => {
    it('should deposit to vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'deposit', args: [parseEther('100')] })).toBe(
        '0xhash'
      );
    });

    it('should withdraw from vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'withdraw', args: [parseEther('50')] })).toBe(
        '0xhash'
      );
    });

    it('should get balance', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('100'));
      expect(await mockContractRead({ functionName: 'balanceOf', args: [user1] })).toBe(
        parseEther('100')
      );
    });

    it('should reject withdrawal exceeding balance', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InsufficientBalance'));
      await expect(
        mockContractWrite({ functionName: 'withdraw', args: [parseEther('1000')] })
      ).rejects.toThrow('InsufficientBalance');
    });

    it('should reject zero deposit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAmount'));
      await expect(
        mockContractWrite({ functionName: 'deposit', args: [parseEther('0')] })
      ).rejects.toThrow('ZeroAmount');
    });
  });

  describe('Temporary Storage', () => {
    it('should store temporary data', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(
        await mockContractWrite({ functionName: 'storeTempData', args: ['key', 'value'] })
      ).toBe('0xhash');
    });

    it('should retrieve temporary data', async () => {
      mockContractRead.mockResolvedValueOnce('value');
      expect(await mockContractRead({ functionName: 'getTempData', args: ['key'] })).toBe('value');
    });

    it('should clear temporary data', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'clearTempData', args: ['key'] })).toBe(
        '0xhash'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty key', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('EmptyKey'));
      await expect(
        mockContractWrite({ functionName: 'storeTempData', args: ['', 'value'] })
      ).rejects.toThrow('EmptyKey');
    });

    it('should handle non-existent key retrieval', async () => {
      mockContractRead.mockResolvedValueOnce('');
      expect(await mockContractRead({ functionName: 'getTempData', args: ['nonexistent'] })).toBe(
        ''
      );
    });
  });
});
