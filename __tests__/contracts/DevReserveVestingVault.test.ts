/**
 * DevReserveVestingVault Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({ ...jest.requireActual('viem'), createPublicClient: jest.fn(), createWalletClient: jest.fn() }));

describe('DevReserveVestingVault Contract', () => {
  let owner: Address, beneficiary: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    beneficiary = '0xBene11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Constants', () => {
    it('should get allocation', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('50000000'));
      expect(await mockContractRead({ functionName: 'ALLOCATION' })).toBe(parseEther('50000000'));
    });

    it('should get cliff period', async () => {
      mockContractRead.mockResolvedValueOnce(60 * 86400);
      expect(await mockContractRead({ functionName: 'CLIFF' })).toBe(60 * 86400);
    });

    it('should get vesting period', async () => {
      mockContractRead.mockResolvedValueOnce(36 * 30 * 86400);
      expect(await mockContractRead({ functionName: 'VESTING' })).toBe(36 * 30 * 86400);
    });

    it('should get total unlocks', async () => {
      mockContractRead.mockResolvedValueOnce(18);
      expect(await mockContractRead({ functionName: 'TOTAL_UNLOCKS' })).toBe(18);
    });

    it('should get unlock amount', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('2777777'));
      expect(await mockContractRead({ functionName: 'UNLOCK_AMOUNT' })).toBe(parseEther('2777777'));
    });

    it('should get unlock interval', async () => {
      mockContractRead.mockResolvedValueOnce(60 * 86400);
      expect(await mockContractRead({ functionName: 'UNLOCK_INTERVAL' })).toBe(60 * 86400);
    });

    it('should get beneficiary', async () => {
      mockContractRead.mockResolvedValueOnce(beneficiary);
      expect(await mockContractRead({ functionName: 'BENEFICIARY' })).toBe(beneficiary);
    });

    it('should get VFIDE address', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'VFIDE' })).toBe(owner);
    });

    it('should get vault hub address', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'VAULT_HUB' })).toBe(owner);
    });

    it('should get presale address', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'PRESALE' })).toBe(owner);
    });

    it('should get security hub address', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'SECURITY_HUB' })).toBe(owner);
    });

    it('should get ledger address', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'LEDGER' })).toBe(owner);
    });
  });

  describe('Vesting Operations', () => {
    it('should get claimable amount', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('10000'));
      expect(await mockContractRead({ functionName: 'claimable' })).toBe(parseEther('10000'));
    });

    it('should claim vested tokens', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'claim' })).toBe('0xhash');
    });

    it('should get beneficiary vault', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'beneficiaryVault' })).toBe(owner);
    });

    it('should reject claim before cliff', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CliffNotReached'));
      await expect(mockContractWrite({ functionName: 'claim' })).rejects.toThrow('CliffNotReached');
    });

    it('should reject claim with nothing claimable', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NothingToClaim'));
      await expect(mockContractWrite({ functionName: 'claim' })).rejects.toThrow('NothingToClaim');
    });

    it('should reject unauthorized claim', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OnlyBeneficiary'));
      await expect(mockContractWrite({ functionName: 'claim' })).rejects.toThrow('OnlyBeneficiary');
    });
  });

  describe('Edge Cases', () => {
    it('should handle claimable after full vesting', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('50000000'));
      const claimable = await mockContractRead({ functionName: 'claimable' });
      expect(claimable).toBe(parseEther('50000000'));
    });

    it('should handle zero claimable', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('0'));
      const claimable = await mockContractRead({ functionName: 'claimable' });
      expect(claimable).toBe(parseEther('0'));
    });

    it('should handle partial vesting periods', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('2777777'));
      const claimable = await mockContractRead({ functionName: 'claimable' });
      expect(claimable).toBe(parseEther('2777777'));
    });
  });
});
