/**
 * VFIDEBadgeNFT Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({ ...jest.requireActual('viem'), createPublicClient: jest.fn(), createWalletClient: jest.fn() }));

describe('VFIDEBadgeNFT Contract', () => {
  let owner: Address, user1: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('NFT Operations', () => {
    it('should mint badge NFT', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'mint', args: [user1, 1] })).toBe('0xhash');
    });

    it('should get token URI', async () => {
      mockContractRead.mockResolvedValueOnce('ipfs://badge/1');
      expect(await mockContractRead({ functionName: 'tokenURI', args: [1] })).toBe('ipfs://badge/1');
    });

    it('should get balance of owner', async () => {
      mockContractRead.mockResolvedValueOnce(5);
      expect(await mockContractRead({ functionName: 'balanceOf', args: [user1] })).toBe(5);
    });

    it('should get owner of token', async () => {
      mockContractRead.mockResolvedValueOnce(user1);
      expect(await mockContractRead({ functionName: 'ownerOf', args: [1] })).toBe(user1);
    });

    it('should approve transfer', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'approve', args: [owner, 1] })).toBe('0xhash');
    });

    it('should reject mint to zero address', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('MintToZeroAddress'));
      await expect(mockContractWrite({ functionName: 'mint', args: ['0x0000000000000000000000000000000000000000' as Address, 1] })).rejects.toThrow('MintToZeroAddress');
    });

    it('should reject transfer of non-existent token', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('TokenDoesNotExist'));
      await expect(mockContractWrite({ functionName: 'transferFrom', args: [user1, owner, 9999] })).rejects.toThrow('TokenDoesNotExist');
    });
  });

  describe('Badge Metadata', () => {
    it('should get badge info', async () => {
      mockContractRead.mockResolvedValueOnce({ name: 'Pioneer', rarity: 'Legendary' });
      expect(await mockContractRead({ functionName: 'getBadgeInfo', args: [1] })).toEqual({ name: 'Pioneer', rarity: 'Legendary' });
    });

    it('should get badge level', async () => {
      mockContractRead.mockResolvedValueOnce(5);
      expect(await mockContractRead({ functionName: 'getBadgeLevel', args: [1] })).toBe(5);
    });

    it('should set badge URI', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'setBadgeURI', args: [1, 'ipfs://new'] })).toBe('0xhash');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid token ID', async () => {
      mockContractRead.mockRejectedValueOnce(new Error('InvalidTokenId'));
      await expect(mockContractRead({ functionName: 'tokenURI', args: [0] })).rejects.toThrow('InvalidTokenId');
    });

    it('should handle unauthorized mint', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(mockContractWrite({ functionName: 'mint', args: [user1, 1] })).rejects.toThrow('Unauthorized');
    });
  });
});
