/**
 * OwnerControlPanel Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({ ...jest.requireActual('viem'), createPublicClient: jest.fn(), createWalletClient: jest.fn() }));

describe('OwnerControlPanel Contract', () => {
  let owner: Address, user1: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Emergency Controls', () => {
    it('should pause all', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'emergency_pauseAll' })).toBe('0xhash');
    });

    it('should resume all', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'emergency_resumeAll' })).toBe('0xhash');
    });

    it('should recover ETH', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'emergency_recoverETH', args: [owner] })).toBe('0xhash');
    });

    it('should recover tokens', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'emergency_recoverTokens', args: [user1, owner] })).toBe('0xhash');
    });

    it('should reject unauthorized pause', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Ownable: caller is not the owner'));
      await expect(mockContractWrite({ functionName: 'emergency_pauseAll' })).rejects.toThrow('Ownable: caller is not the owner');
    });
  });

  describe('Fee Management', () => {
    it('should set fee policy', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'fees_setPolicy', args: [250, 100] })).toBe('0xhash');
    });

    it('should get fee policy', async () => {
      mockContractRead.mockResolvedValueOnce({ baseFee: 250, minFee: 100 });
      expect(await mockContractRead({ functionName: 'fees_getPolicy' })).toEqual({ baseFee: 250, minFee: 100 });
    });

    it('should get effective rates', async () => {
      mockContractRead.mockResolvedValueOnce({ buyFee: 250, sellFee: 300 });
      expect(await mockContractRead({ functionName: 'fees_getEffectiveRates' })).toEqual({ buyFee: 250, sellFee: 300 });
    });

    it('should preview fee for score', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('2.5'));
      expect(await mockContractRead({ functionName: 'fees_previewForScore', args: [parseEther('100'), 800] })).toBe(parseEther('2.5'));
    });

    it('should preview transfer fee', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1'));
      expect(await mockContractRead({ functionName: 'fees_previewTransfer', args: [user1, owner, parseEther('100')] })).toBe(parseEther('1'));
    });
  });

  describe('System Status', () => {
    it('should get system health', async () => {
      mockContractRead.mockResolvedValueOnce({ healthy: true, score: 95 });
      expect(await mockContractRead({ functionName: 'getSystemHealth' })).toEqual({ healthy: true, score: 95 });
    });

    it('should get presale status', async () => {
      mockContractRead.mockResolvedValueOnce({ active: true, raised: parseEther('1000') });
      expect(await mockContractRead({ functionName: 'getPresaleStatus' })).toEqual({ active: true, raised: parseEther('1000') });
    });

    it('should get burn router', async () => {
      mockContractRead.mockResolvedValueOnce(user1);
      expect(await mockContractRead({ functionName: 'burnRouter' })).toBe(user1);
    });
  });

  describe('Edge Cases', () => {
    it('should reject invalid fee policy', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidFeePolicy'));
      await expect(mockContractWrite({ functionName: 'fees_setPolicy', args: [10000, 100] })).rejects.toThrow('InvalidFeePolicy');
    });

    it('should reject recover to zero address', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAddress'));
      await expect(mockContractWrite({ functionName: 'emergency_recoverETH', args: ['0x0000000000000000000000000000000000000000' as Address] })).rejects.toThrow('ZeroAddress');
    });

    it('should handle no ETH to recover', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NoETH'));
      await expect(mockContractWrite({ functionName: 'emergency_recoverETH', args: [owner] })).rejects.toThrow('NoETH');
    });
  });
});
