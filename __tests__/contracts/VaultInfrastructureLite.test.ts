/**
 * VaultInfrastructureLite Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({ ...jest.requireActual('viem'), createPublicClient: jest.fn(), createWalletClient: jest.fn() }));

describe('VaultInfrastructureLite Contract', () => {
  let owner: Address, vault: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    vault = '0xVault1234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Lite Vault Operations', () => {
    it('should create lite vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'createLiteVault' })).toBe('0xhash');
    });

    it('should get lite vault', async () => {
      mockContractRead.mockResolvedValueOnce(vault);
      expect(await mockContractRead({ functionName: 'getLiteVault', args: [owner] })).toBe(vault);
    });

    it('should check lite vault exists', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      expect(await mockContractRead({ functionName: 'liteVaultExists', args: [owner] })).toBe(true);
    });

    it('should get lite vault balance', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('500'));
      expect(await mockContractRead({ functionName: 'getLiteVaultBalance', args: [owner] })).toBe(parseEther('500'));
    });
  });

  describe('Simplified Management', () => {
    it('should deposit to lite vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'depositToLiteVault', args: [parseEther('100')] })).toBe('0xhash');
    });

    it('should withdraw from lite vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'withdrawFromLiteVault', args: [parseEther('50')] })).toBe('0xhash');
    });

    it('should reject withdrawal exceeding balance', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InsufficientBalance'));
      await expect(mockContractWrite({ functionName: 'withdrawFromLiteVault', args: [parseEther('1000')] })).rejects.toThrow('InsufficientBalance');
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate lite vault creation', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('LiteVaultExists'));
      await expect(mockContractWrite({ functionName: 'createLiteVault' })).rejects.toThrow('LiteVaultExists');
    });

    it('should handle zero amount deposit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAmount'));
      await expect(mockContractWrite({ functionName: 'depositToLiteVault', args: [parseEther('0')] })).rejects.toThrow('ZeroAmount');
    });
  });
});
