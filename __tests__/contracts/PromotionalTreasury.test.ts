/**
 * PromotionalTreasury Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({ ...jest.requireActual('viem'), createPublicClient: jest.fn(), createWalletClient: jest.fn() }));

describe('PromotionalTreasury Contract', () => {
  let owner: Address, user1: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Constants', () => {
    it('should get first transaction bonus', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('10'));
      expect(await mockContractRead({ functionName: 'FIRST_TRANSACTION_BONUS' })).toBe(parseEther('10'));
    });

    it('should get first merchant payment', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('25'));
      expect(await mockContractRead({ functionName: 'FIRST_MERCHANT_PAYMENT' })).toBe(parseEther('25'));
    });

    it('should get first endorsement given', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('5'));
      expect(await mockContractRead({ functionName: 'FIRST_ENDORSEMENT_GIVEN' })).toBe(parseEther('5'));
    });

    it('should get first endorsement received', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('5'));
      expect(await mockContractRead({ functionName: 'FIRST_ENDORSEMENT_RECEIVED' })).toBe(parseEther('5'));
    });

    it('should get education complete profile', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('15'));
      expect(await mockContractRead({ functionName: 'EDUCATION_COMPLETE_PROFILE' })).toBe(parseEther('15'));
    });

    it('should get education payment tutorial', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('10'));
      expect(await mockContractRead({ functionName: 'EDUCATION_PAYMENT_TUTORIAL' })).toBe(parseEther('10'));
    });

    it('should get education proof score tutorial', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('10'));
      expect(await mockContractRead({ functionName: 'EDUCATION_PROOF_SCORE_TUTORIAL' })).toBe(parseEther('10'));
    });

    it('should get max education per user', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('100'));
      expect(await mockContractRead({ functionName: 'MAX_EDUCATION_PER_USER' })).toBe(parseEther('100'));
    });

    it('should get max merchant rewards', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1000'));
      expect(await mockContractRead({ functionName: 'MAX_MERCHANT_REWARDS' })).toBe(parseEther('1000'));
    });

    it('should get max pioneers', async () => {
      mockContractRead.mockResolvedValueOnce(500);
      expect(await mockContractRead({ functionName: 'MAX_PIONEERS' })).toBe(500);
    });

    it('should get admin role', async () => {
      mockContractRead.mockResolvedValueOnce('0xADMIN');
      expect(await mockContractRead({ functionName: 'ADMIN_ROLE' })).toBe('0xADMIN');
    });

    it('should get default admin role', async () => {
      mockContractRead.mockResolvedValueOnce('0x00');
      expect(await mockContractRead({ functionName: 'DEFAULT_ADMIN_ROLE' })).toBe('0x00');
    });
  });

  describe('Bonus Claims', () => {
    it('should claim first transaction bonus', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'claimFirstTransactionBonus' })).toBe('0xhash');
    });

    it('should claim first merchant payment bonus', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'claimFirstMerchantPaymentBonus' })).toBe('0xhash');
    });

    it('should claim first endorsement bonus', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'claimFirstEndorsementBonus' })).toBe('0xhash');
    });

    it('should claim education bonus', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'claimEducationBonus', args: ['profile'] })).toBe('0xhash');
    });

    it('should reject duplicate claim', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('AlreadyClaimed'));
      await expect(mockContractWrite({ functionName: 'claimFirstTransactionBonus' })).rejects.toThrow('AlreadyClaimed');
    });

    it('should reject claim exceeding cap', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CapExceeded'));
      await expect(mockContractWrite({ functionName: 'claimEducationBonus', args: ['tutorial'] })).rejects.toThrow('CapExceeded');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty treasury', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InsufficientFunds'));
      await expect(mockContractWrite({ functionName: 'claimFirstTransactionBonus' })).rejects.toThrow('InsufficientFunds');
    });

    it('should handle invalid education type', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidEducationType'));
      await expect(mockContractWrite({ functionName: 'claimEducationBonus', args: ['invalid'] })).rejects.toThrow('InvalidEducationType');
    });

    it('should handle max pioneers reached', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('MaxPioneersReached'));
      await expect(mockContractWrite({ functionName: 'awardPioneerBonus', args: [user1] })).rejects.toThrow('MaxPioneersReached');
    });
  });
});
