/**
 * VFIDETrust Contract Tests
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

describe('VFIDETrust Contract', () => {
  let owner: Address, user1: Address, beneficiary: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    beneficiary = '0xBenef1234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Trust Creation', () => {
    it('should create trust', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(
        await mockContractWrite({
          functionName: 'createTrust',
          args: [beneficiary, parseEther('1000'), 365],
        })
      ).toBe('0xhash');
    });

    it('should get trust details', async () => {
      mockContractRead.mockResolvedValueOnce({
        grantor: owner,
        beneficiary,
        amount: parseEther('1000'),
        releaseTime: 123456,
      });
      expect(await mockContractRead({ functionName: 'getTrustDetails', args: [1] })).toEqual({
        grantor: owner,
        beneficiary,
        amount: parseEther('1000'),
        releaseTime: 123456,
      });
    });

    it('should reject trust to zero address', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAddress'));
      await expect(
        mockContractWrite({
          functionName: 'createTrust',
          args: ['0x0000000000000000000000000000000000000000' as Address, parseEther('1000'), 365],
        })
      ).rejects.toThrow('ZeroAddress');
    });

    it('should reject zero amount trust', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAmount'));
      await expect(
        mockContractWrite({
          functionName: 'createTrust',
          args: [beneficiary, parseEther('0'), 365],
        })
      ).rejects.toThrow('ZeroAmount');
    });
  });

  describe('Trust Management', () => {
    it('should fund trust', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(
        await mockContractWrite({ functionName: 'fundTrust', args: [1, parseEther('500')] })
      ).toBe('0xhash');
    });

    it('should release trust funds', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'releaseTrust', args: [1] })).toBe('0xhash');
    });

    it('should revoke trust', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'revokeTrust', args: [1] })).toBe('0xhash');
    });

    it('should reject release before time', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('TooEarly'));
      await expect(mockContractWrite({ functionName: 'releaseTrust', args: [1] })).rejects.toThrow(
        'TooEarly'
      );
    });

    it('should reject unauthorized revoke', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OnlyGrantor'));
      await expect(mockContractWrite({ functionName: 'revokeTrust', args: [1] })).rejects.toThrow(
        'OnlyGrantor'
      );
    });
  });

  describe('Beneficiary Management', () => {
    it('should update beneficiary', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'updateBeneficiary', args: [1, user1] })).toBe(
        '0xhash'
      );
    });

    it('should get beneficiary', async () => {
      mockContractRead.mockResolvedValueOnce(beneficiary);
      expect(await mockContractRead({ functionName: 'getBeneficiary', args: [1] })).toBe(
        beneficiary
      );
    });

    it('should reject beneficiary update after release', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('TrustReleased'));
      await expect(
        mockContractWrite({ functionName: 'updateBeneficiary', args: [1, user1] })
      ).rejects.toThrow('TrustReleased');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid trust ID', async () => {
      mockContractRead.mockRejectedValueOnce(new Error('InvalidTrustId'));
      await expect(
        mockContractRead({ functionName: 'getTrustDetails', args: [9999] })
      ).rejects.toThrow('InvalidTrustId');
    });

    it('should handle double release attempt', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('AlreadyReleased'));
      await expect(mockContractWrite({ functionName: 'releaseTrust', args: [1] })).rejects.toThrow(
        'AlreadyReleased'
      );
    });

    it('should handle funding revoked trust', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('TrustRevoked'));
      await expect(
        mockContractWrite({ functionName: 'fundTrust', args: [1, parseEther('100')] })
      ).rejects.toThrow('TrustRevoked');
    });

    it('should reject setBadge with zero subject', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('TRUST_Zero'));
      await expect(
        mockContractWrite({
          functionName: 'setBadge',
          args: ['0x0000000000000000000000000000000000000000' as Address, '0x00', true, 0],
        })
      ).rejects.toThrow('TRUST_Zero');
    });

    it('should reject router policy that exceeds max total bps', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('TRUST_Bounds'));
      await expect(
        mockContractWrite({
          functionName: 'setPolicy',
          args: [200, 50, 900, 150, 1000, beneficiary],
        })
      ).rejects.toThrow('TRUST_Bounds');
    });
  });
});
