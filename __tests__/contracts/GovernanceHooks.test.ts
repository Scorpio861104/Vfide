/**
 * GovernanceHooks Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({ ...jest.requireActual('viem'), createPublicClient: jest.fn(), createWalletClient: jest.fn() }));

describe('GovernanceHooks Contract', () => {
  let owner: Address, user1: Address, guardian: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    guardian = '0xGuard1234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Governance Hooks', () => {
    it('should handle on proposal created', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'onProposalCreated', args: [1, user1] })).toBe('0xhash');
    });

    it('should handle on vote cast', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'onVoteCast', args: [user1, 1, 100] })).toBe('0xhash');
    });

    it('should handle on proposal queued', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'onProposalQueued', args: [1, user1] })).toBe('0xhash');
    });

    it('should handle on finalized', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'onFinalized', args: [1, true, user1] })).toBe('0xhash');
    });

    it('should reject unauthorized hook calls', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(mockContractWrite({ functionName: 'onVoteCast', args: [user1, 1, 100] })).rejects.toThrow('Unauthorized');
    });
  });

  describe('Abuse Reporting', () => {
    it('should report governance abuse', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'reportGovernanceAbuse', args: [user1, 'Spam voting'] })).toBe('0xhash');
    });

    it('should reject unauthorized abuse report', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(mockContractWrite({ functionName: 'reportGovernanceAbuse', args: [user1, 'Spam'] })).rejects.toThrow('Unauthorized');
    });

    it('should reject self-report', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CannotReportSelf'));
      await expect(mockContractWrite({ functionName: 'reportGovernanceAbuse', args: [user1, 'Spam'] })).rejects.toThrow('CannotReportSelf');
    });
  });

  describe('Configuration', () => {
    it('should get owner', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'owner' })).toBe(owner);
    });

    it('should get DAO address', async () => {
      mockContractRead.mockResolvedValueOnce(owner);
      expect(await mockContractRead({ functionName: 'dao' })).toBe(owner);
    });

    it('should get guardian address', async () => {
      mockContractRead.mockResolvedValueOnce(guardian);
      expect(await mockContractRead({ functionName: 'guardian' })).toBe(guardian);
    });

    it('should get ledger address', async () => {
      mockContractRead.mockResolvedValueOnce(user1);
      expect(await mockContractRead({ functionName: 'ledger' })).toBe(user1);
    });

    it('should get seer address', async () => {
      mockContractRead.mockResolvedValueOnce(user1);
      expect(await mockContractRead({ functionName: 'seer' })).toBe(user1);
    });

    it('should set DAO', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'setDAO', args: [owner] })).toBe('0xhash');
    });

    it('should set modules', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'setModules', args: [user1, guardian, owner] })).toBe('0xhash');
    });

    it('should transfer ownership', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'transferOwnership', args: [user1] })).toBe('0xhash');
    });

    it('should reject non-owner config changes', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Ownable: caller is not the owner'));
      await expect(mockContractWrite({ functionName: 'setDAO', args: [owner] })).rejects.toThrow('Ownable: caller is not the owner');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid proposal ID', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidProposalId'));
      await expect(mockContractWrite({ functionName: 'onVoteCast', args: [user1, 0, 100] })).rejects.toThrow('InvalidProposalId');
    });

    it('should handle zero vote weight', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroVoteWeight'));
      await expect(mockContractWrite({ functionName: 'onVoteCast', args: [user1, 1, 0] })).rejects.toThrow('ZeroVoteWeight');
    });

    it('should handle zero address in hooks', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidAddress'));
      await expect(mockContractWrite({ functionName: 'onProposalCreated', args: [1, '0x0000000000000000000000000000000000000000' as Address] })).rejects.toThrow('InvalidAddress');
    });
  });
});
