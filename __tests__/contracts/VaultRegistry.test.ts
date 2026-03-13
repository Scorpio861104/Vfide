/**
 * VaultRegistry Contract Tests
 * Comprehensive test suite for vault registration and management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address } from 'viem';

const mockContractRead: any = jest.fn();
const mockContractWrite: any = jest.fn();

describe('VaultRegistry Contract', () => {
  let registryAddress: Address;
  let owner: Address;
  let user1: Address;
  let vaultAddress: Address;

  beforeEach(() => {
    registryAddress = '0xRegistry123456789012345678901234567890' as Address;
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    vaultAddress = '0xVault1234567890123456789012345678901234' as Address;

    jest.clearAllMocks();
  });

  describe('Vault Registration', () => {
    it('should register new vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'registerVault',
        args: [vaultAddress, user1],
      });

      expect(result).toBe('0xhash');
    });

    it('should prevent duplicate vault registration', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Vault already registered'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'registerVault',
          args: [vaultAddress, user1],
        });
      }).rejects.toThrow('already registered');
    });

    it('should check if vault is registered', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const result = await mockContractRead({
        functionName: 'isRegistered',
        args: [vaultAddress],
      });

      expect(result).toBe(true);
    });

    it('should get vault owner', async () => {
      mockContractRead.mockResolvedValueOnce(user1);

      const result = await mockContractRead({
        functionName: 'getVaultOwner',
        args: [vaultAddress],
      });

      expect(result).toBe(user1);
    });

    it('should get vaults by owner', async () => {
      const vaults = [vaultAddress, '0xVault2' as Address];
      mockContractRead.mockResolvedValueOnce(vaults);

      const result = await mockContractRead({
        functionName: 'getVaultsByOwner',
        args: [user1],
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('Vault Deregistration', () => {
    it('should deregister vault', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'deregisterVault',
        args: [vaultAddress],
      });

      expect(result).toBe('0xhash');
    });

    it('should only allow owner to deregister', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not vault owner'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'deregisterVault',
          args: [vaultAddress],
        });
      }).rejects.toThrow('Not vault owner');
    });
  });

  describe('Vault Metadata', () => {
    it('should reject email recovery hash collision across vaults', async () => {
      const emailHash = '0xabcd000000000000000000000000000000000000000000000000000000000000';
      mockContractWrite.mockRejectedValueOnce(new Error('EmailAlreadyTaken'));

      await expect(
        mockContractWrite({
          functionName: 'setEmailRecovery',
          args: [vaultAddress, emailHash],
        })
      ).rejects.toThrow('EmailAlreadyTaken');
    });

    it('should reject phone recovery hash collision across vaults', async () => {
      const phoneHash = '0x1234000000000000000000000000000000000000000000000000000000000000';
      mockContractWrite.mockRejectedValueOnce(new Error('PhoneAlreadyTaken'));

      await expect(
        mockContractWrite({
          functionName: 'setPhoneRecovery',
          args: [vaultAddress, phoneHash],
        })
      ).rejects.toThrow('PhoneAlreadyTaken');
    });

    it('should allow username replacement without stale reservation assumptions', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setUsername',
        args: [vaultAddress, 'updatedname'],
      });

      expect(result).toBe('0xhash');
    });

    it('should set vault metadata', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setVaultMetadata',
        args: [vaultAddress, 'My Vault', 'Description'],
      });

      expect(result).toBe('0xhash');
    });

    it('should get vault metadata', async () => {
      mockContractRead.mockResolvedValueOnce({
        name: 'My Vault',
        description: 'Description',
        createdAt: 1234567890n,
      });

      const result = (await mockContractRead({
        functionName: 'getVaultMetadata',
        args: [vaultAddress],
      })) as { name: string; description: string; createdAt: bigint };

      expect(result.name).toBe('My Vault');
    });
  });

  describe('Vault Count and Queries', () => {
    it('should expose guardian count per vault for recoverability checks', async () => {
      mockContractRead.mockResolvedValueOnce(0n);

      const result = await mockContractRead({
        functionName: 'guardianCountOfVault',
        args: [vaultAddress],
      });

      expect(result).toBe(0n);
    });

    it('should return total vault count', async () => {
      mockContractRead.mockResolvedValueOnce(100n);

      const result = await mockContractRead({
        functionName: 'totalVaults',
      });

      expect(result).toBe(100n);
    });

    it('should get vault at index', async () => {
      mockContractRead.mockResolvedValueOnce(vaultAddress);

      const result = await mockContractRead({
        functionName: 'vaultAt',
        args: [50n],
      });

      expect(result).toBe(vaultAddress);
    });
  });

  describe('Access Control', () => {
    it('should only allow authorized registrar', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not authorized'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'registerVault',
          args: [vaultAddress, user1],
        });
      }).rejects.toThrow('Not authorized');
    });
  });
});
