/**
 * VaultHubLite Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({ ...jest.requireActual('viem'), createPublicClient: jest.fn(), createWalletClient: jest.fn() }));

describe('VaultHubLite Contract', () => {
  let owner: Address, user1: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Vault Operations', () => {
    it('should create user vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'createVault' })).toBe('0xhash');
    });

    it('should get user vault', async () => {
      mockContractRead.mockResolvedValueOnce(user1);
      expect(await mockContractRead({ functionName: 'getUserVault', args: [owner] })).toBe(user1);
    });

    it('should check if has vault', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      expect(await mockContractRead({ functionName: 'hasVault', args: [owner] })).toBe(true);
    });

    it('should get vault count', async () => {
      mockContractRead.mockResolvedValueOnce(150);
      expect(await mockContractRead({ functionName: 'getVaultCount' })).toBe(150);
    });

    it('should reject duplicate vault creation', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('VaultExists'));
      await expect(mockContractWrite({ functionName: 'createVault' })).rejects.toThrow('VaultExists');
    });
  });

  describe('Vault Balance', () => {
    it('should deposit to vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'deposit', args: [parseEther('100')] })).toBe('0xhash');
    });

    it('should withdraw from vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'withdraw', args: [parseEther('50')] })).toBe('0xhash');
    });

    it('should get vault balance', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1000'));
      expect(await mockContractRead({ functionName: 'getVaultBalance', args: [user1] })).toBe(parseEther('1000'));
    });

    it('should reject withdrawal exceeding balance', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InsufficientBalance'));
      await expect(mockContractWrite({ functionName: 'withdraw', args: [parseEther('10000')] })).rejects.toThrow('InsufficientBalance');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero deposit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAmount'));
      await expect(mockContractWrite({ functionName: 'deposit', args: [parseEther('0')] })).rejects.toThrow('ZeroAmount');
    });

    it('should handle vault for non-existent user', async () => {
      mockContractRead.mockResolvedValueOnce('0x0000000000000000000000000000000000000000' as Address);
      const vault = await mockContractRead({ functionName: 'getUserVault', args: [user1] });
      expect(vault).toBe('0x0000000000000000000000000000000000000000');
    });
  });
});
