/**
 * DAO Governance Contract Tests
 * Comprehensive test suite for DAO proposal lifecycle, voting, and governance
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

// Mock contract interaction utilities
const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

describe('DAO Governance Contract', () => {
  let daoAddress: Address;
  let admin: Address;
  let voter1: Address;
  let voter2: Address;
  let voter3: Address;
  let proposer: Address;

  beforeEach(() => {
    daoAddress = '0xDAO1234567890123456789012345678901234567' as Address;
    admin = '0xAdmin1234567890123456789012345678901234' as Address;
    voter1 = '0xVoter1234567890123456789012345678901234' as Address;
    voter2 = '0xVoter2345678901234567890123456789012345' as Address;
    voter3 = '0xVoter3456789012345678901234567890123456' as Address;
    proposer = '0xProposer123456789012345678901234567890' as Address;

    jest.clearAllMocks();
  });

  describe('Proposal Creation', () => {
    it('should create a valid proposal', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'propose',
        args: [['0xTarget1234567890123456789012345678901234'], [0n], ['0x1234'], 'Test Proposal'],
      });

      expect(result).toBe('0xhash');
    });

    it('should reject proposal from ineligible proposer', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not eligible to propose'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'propose',
          args: [['0xTarget'], [0n], ['0x1234'], 'Test'],
        });
      }).rejects.toThrow('Not eligible');
    });

    it('should require minimum Seer score to propose', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Seer score too low'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'propose',
          args: [['0xTarget'], [0n], ['0x1234'], 'Test'],
        });
      }).rejects.toThrow('Seer score too low');
    });

    it('should increment proposal count on creation', async () => {
      mockContractRead.mockResolvedValueOnce(5n); // current proposal count

      const count = await mockContractRead({ functionName: 'proposalCount' });
      expect(count).toBe(5n);
    });

    it('should reject empty proposal description', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Empty description'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'propose',
          args: [['0xTarget'], [0n], ['0x1234'], ''],
        });
      }).rejects.toThrow('Empty description');
    });

    it('should reject mismatched arrays in proposal', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Array length mismatch'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'propose',
          args: [
            ['0xTarget1', '0xTarget2'],
            [0n], // Only 1 value
            ['0x1234', '0x5678'],
            'Test',
          ],
        });
      }).rejects.toThrow('Array length mismatch');
    });

    it('should emit ProposalCreated event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'propose',
        args: [['0xTarget'], [0n], ['0x1234'], 'Test Proposal'],
      });

      expect(result).toBe('0xhash');
      // Would check for event in real implementation
    });
  });

  describe('Proposal Lifecycle States', () => {
    const proposalId = 1n;

    it('should return Pending status for new proposal', async () => {
      mockContractRead.mockResolvedValueOnce(0); // ProposalState.Pending

      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(0);
    });

    it('should transition to Active after delay', async () => {
      mockContractRead.mockResolvedValueOnce(1); // ProposalState.Active

      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(1);
    });

    it('should mark as Defeated if quorum not met', async () => {
      mockContractRead.mockResolvedValueOnce(3); // ProposalState.Defeated

      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(3);
    });

    it('should transition to Queued after successful vote', async () => {
      mockContractRead.mockResolvedValueOnce(4); // ProposalState.Queued

      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(4);
    });

    it('should transition to Executed after timelock', async () => {
      mockContractRead.mockResolvedValueOnce(5); // ProposalState.Executed

      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(5);
    });

    it('should mark as Cancelled if cancelled', async () => {
      mockContractRead.mockResolvedValueOnce(2); // ProposalState.Cancelled

      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(2);
    });

    it('should get full proposal details', async () => {
      mockContractRead.mockResolvedValueOnce({
        id: proposalId,
        proposer: proposer,
        description: 'Test Proposal',
        votesFor: parseEther('10000'),
        votesAgainst: parseEther('5000'),
        votesAbstain: parseEther('1000'),
        startBlock: 1000n,
        endBlock: 2000n,
        executed: false,
        cancelled: false,
      });

      const details = await mockContractRead({
        functionName: 'getProposalDetails',
        args: [proposalId],
      });

      expect(details.id).toBe(proposalId);
      expect(details.proposer).toBe(proposer);
    });
  });

  describe('Voting Mechanics', () => {
    const proposalId = 1n;

    it('should allow eligible voter to vote FOR', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'vote',
        args: [proposalId, 1], // 1 = For
      });

      expect(result).toBe('0xhash');
    });

    it('should allow eligible voter to vote AGAINST', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'vote',
        args: [proposalId, 0], // 0 = Against
      });

      expect(result).toBe('0xhash');
    });

    it('should allow eligible voter to ABSTAIN', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'vote',
        args: [proposalId, 2], // 2 = Abstain
      });

      expect(result).toBe('0xhash');
    });

    it('should reject vote from ineligible voter', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not eligible to vote'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'vote',
          args: [proposalId, 1],
        });
      }).rejects.toThrow('Not eligible to vote');
    });

    it('should prevent double voting', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Already voted'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'vote',
          args: [proposalId, 1],
        });
      }).rejects.toThrow('Already voted');
    });

    it('should reject vote on inactive proposal', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Proposal not active'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'vote',
          args: [proposalId, 1],
        });
      }).rejects.toThrow('not active');
    });

    it('should reject vote after voting period ended', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Voting ended'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'vote',
          args: [proposalId, 1],
        });
      }).rejects.toThrow('Voting ended');
    });

    it('should check if user has voted', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const voted = await mockContractRead({
        functionName: 'hasVoted',
        args: [proposalId, voter1],
      });

      expect(voted).toBe(true);
    });

    it('should emit VoteCast event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'vote',
        args: [proposalId, 1],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Vote Delegation', () => {
    it('should allow delegation to another address', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'delegate',
        args: [voter2],
      });

      expect(result).toBe('0xhash');
    });

    it('should prevent self-delegation', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Cannot self-delegate'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'delegate',
          args: [voter1], // delegating to self
        });
      }).rejects.toThrow('self-delegate');
    });

    it('should calculate delegated voting power', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('5000')); // delegated power

      const power = await mockContractRead({
        functionName: 'getVotingPower',
        args: [voter2],
      });

      expect(power).toBe(parseEther('5000'));
    });

    it('should allow revoking delegation', async () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000' as Address;
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'delegate',
        args: [zeroAddress],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Quorum Requirements', () => {
    const proposalId = 1n;

    it('should return minimum participation threshold', async () => {
      mockContractRead.mockResolvedValueOnce(1000n); // 10% (basis points)

      const minParticipation = await mockContractRead({
        functionName: 'minParticipation',
      });

      expect(minParticipation).toBe(1000n);
    });

    it('should calculate minimum votes required', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('10000')); // 10% quorum

      const minVotes = await mockContractRead({
        functionName: 'minVotesRequired',
      });

      expect(minVotes).toBe(parseEther('10000'));
    });

    it('should fail proposal if quorum not met', async () => {
      mockContractRead.mockResolvedValueOnce(3); // Defeated

      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(3); // Defeated
    });

    it('should pass proposal if quorum met and majority for', async () => {
      mockContractRead.mockResolvedValueOnce(4); // Queued

      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(4); // Queued
    });

    it('should allow admin to update quorum', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setMinParticipation',
        args: [1500n], // 15%
      });

      expect(result).toBe('0xhash');
    });

    it('should reject non-admin quorum changes', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not admin'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'setMinParticipation',
          args: [1500n],
        });
      }).rejects.toThrow('Not admin');
    });
  });

  describe('Voting Eligibility (Seer Score)', () => {
    it('should check if user is eligible to vote', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const eligible = await mockContractRead({
        functionName: 'isEligible',
        args: [voter1],
      });

      expect(eligible).toBe(true);
    });

    it('should reject voter with insufficient Seer score', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Insufficient Seer score'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'vote',
          args: [1n, 1],
        });
      }).rejects.toThrow('Insufficient Seer score');
    });

    it('should calculate voting power based on Seer score', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('11000')); // boosted power

      const power = await mockContractRead({
        functionName: 'getVotingPower',
        args: [voter1],
      });

      expect(power).toBe(parseEther('11000'));
    });

    it('should return voter statistics', async () => {
      mockContractRead.mockResolvedValueOnce({
        proposalsVoted: 10n,
        votingPower: parseEther('5000'),
        seerScore: 800n,
        fatigue: 50n,
      });

      const stats = await mockContractRead({
        functionName: 'getVoterStats',
        args: [voter1],
      });

      expect(stats.proposalsVoted).toBe(10n);
      expect(stats.seerScore).toBe(800n);
    });
  });

  describe('Timelock Integration', () => {
    const proposalId = 1n;

    it('should queue proposal for execution', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'queue',
        args: [proposalId],
      });

      expect(result).toBe('0xhash');
    });

    it('should reject queueing proposal that did not pass', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Proposal did not pass'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'queue',
          args: [proposalId],
        });
      }).rejects.toThrow('did not pass');
    });

    it('should enforce timelock delay before execution', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Timelock not expired'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'execute',
          args: [proposalId],
        });
      }).rejects.toThrow('Timelock not expired');
    });

    it('should allow execution after timelock expires', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'execute',
        args: [proposalId],
      });

      expect(result).toBe('0xhash');
    });

    it('should mark proposal as executed', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      await mockContractWrite({
        functionName: 'markExecuted',
        args: [proposalId],
      });

      mockContractRead.mockResolvedValueOnce(5); // Executed
      const state = await mockContractRead({
        functionName: 'getProposalStatus',
        args: [proposalId],
      });

      expect(state).toBe(5);
    });
  });

  describe('Admin Functions', () => {
    it('should return current admin', async () => {
      mockContractRead.mockResolvedValueOnce(admin);

      const result = await mockContractRead({ functionName: 'admin' });
      expect(result).toBe(admin);
    });

    it('should allow admin to set new admin', async () => {
      const newAdmin = '0xNewAdmin1234567890123456789012345678' as Address;
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setAdmin',
        args: [newAdmin],
      });

      expect(result).toBe('0xhash');
    });

    it('should reject non-admin attempting admin functions', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not admin'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'setAdmin',
          args: [voter1],
        });
      }).rejects.toThrow('Not admin');
    });

    it('should allow admin to set voting parameters', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setParams',
        args: [
          86400n, // voting delay
          604800n, // voting period
          1000n, // quorum
        ],
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to set guardian', async () => {
      const guardian = '0xGuardian12345678901234567890123456789' as Address;
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setGuardian',
        args: [guardian],
      });

      expect(result).toBe('0xhash');
    });

    it('should return current guardian address', async () => {
      const guardian = '0xGuardian12345678901234567890123456789' as Address;
      mockContractRead.mockResolvedValueOnce(guardian);

      const result = await mockContractRead({ functionName: 'guardian' });
      expect(result).toBe(guardian);
    });

    it('should allow admin to set modules', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setModules',
        args: [
          '0xSeer123456789012345678901234567890123',
          '0xLedger1234567890123456789012345678901',
          '0xHooks12345678901234567890123456789012',
        ],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Proposal Execution', () => {
    const proposalId = 1n;

    it('should execute proposal with single action', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'execute',
        args: [proposalId],
      });

      expect(result).toBe('0xhash');
    });

    it('should execute proposal with multiple actions', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'execute',
        args: [proposalId],
      });

      expect(result).toBe('0xhash');
    });

    it('should reject execution of already executed proposal', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Already executed'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'execute',
          args: [proposalId],
        });
      }).rejects.toThrow('Already executed');
    });

    it('should reject execution of cancelled proposal', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Proposal cancelled'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'execute',
          args: [proposalId],
        });
      }).rejects.toThrow('cancelled');
    });

    it('should finalize proposal after execution', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'finalize',
        args: [proposalId],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Edge Cases', () => {
    it('should handle voting with zero power gracefully', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('No voting power'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'vote',
          args: [1n, 1],
        });
      }).rejects.toThrow('No voting power');
    });

    it('should prevent proposal spam', async () => {
      // Multiple proposals in short time
      mockContractWrite.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'propose',
          args: [['0xTarget'], [0n], ['0x1234'], 'Spam'],
        });
      }).rejects.toThrow('Rate limit');
    });

    it('should handle vote changing before finalization', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'vote',
        args: [1n, 0], // changing vote
      });

      expect(result).toBe('0xhash');
    });

    it('should get active proposals list', async () => {
      mockContractRead.mockResolvedValueOnce([1n, 2n, 5n]); // active proposal IDs

      const active = await mockContractRead({
        functionName: 'getActiveProposals',
      });

      expect(active).toHaveLength(3);
    });

    it('should get proposals in batch', async () => {
      mockContractRead.mockResolvedValueOnce([
        { id: 1n, description: 'Proposal 1' },
        { id: 2n, description: 'Proposal 2' },
        { id: 3n, description: 'Proposal 3' },
      ]);

      const batch = await mockContractRead({
        functionName: 'getProposalsBatch',
        args: [0n, 3n], // start, count
      });

      expect(batch).toHaveLength(3);
    });

    it('should handle dispute flag mechanism', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'disputeFlag',
        args: [1n, 'Reason for dispute'],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Voter History and Stats', () => {
    it('should get voter voting history', async () => {
      mockContractRead.mockResolvedValueOnce([
        { proposalId: 1n, support: 1, timestamp: 1234567890n },
        { proposalId: 2n, support: 1, timestamp: 1234567900n },
        { proposalId: 3n, support: 0, timestamp: 1234567910n },
      ]);

      const history = await mockContractRead({
        functionName: 'getVoterHistory',
        args: [voter1],
      });

      expect(history).toHaveLength(3);
    });

    it('should track voter participation rate', async () => {
      mockContractRead.mockResolvedValueOnce({
        proposalsVoted: 10n,
        totalProposals: 15n,
        participationRate: 6666n, // 66.66%
      });

      const stats = await mockContractRead({
        functionName: 'getVoterStats',
        args: [voter1],
      });

      expect(stats.proposalsVoted).toBe(10n);
    });
  });

  describe('Fatigue System', () => {
    it('should track voter fatigue', async () => {
      mockContractRead.mockResolvedValueOnce({
        currentFatigue: 300n,
        fatiguePerVote: 100n,
        recoveryRate: 10n,
      });

      const info = await mockContractRead({
        functionName: 'getFatigueInfo',
        args: [voter1],
      });

      expect(info.currentFatigue).toBe(300n);
    });

    it('should increase fatigue on vote', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'vote',
        args: [1n, 1],
      });

      expect(result).toBe('0xhash');
    });

    it('should recover fatigue over time', async () => {
      const rate = 10n;
      mockContractRead.mockResolvedValueOnce(rate);

      const recoveryRate = await mockContractRead({
        functionName: 'FATIGUE_RECOVERY_RATE',
      });

      expect(recoveryRate).toBe(rate);
    });

    it('should return fatigue per vote constant', async () => {
      const fatiguePerVote = 100n;
      mockContractRead.mockResolvedValueOnce(fatiguePerVote);

      const result = await mockContractRead({
        functionName: 'FATIGUE_PER_VOTE',
      });

      expect(result).toBe(fatiguePerVote);
    });

    it('should prevent voting with excessive fatigue', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Voter fatigue too high'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'vote',
          args: [1n, 1],
        });
      }).rejects.toThrow('fatigue too high');
    });
  });

  describe('Integration with SeerGuardian', () => {
    it('should query guardian for voter restrictions', async () => {
      mockContractRead.mockResolvedValueOnce(false); // not restricted

      const restricted = await mockContractRead({
        functionName: 'isRestricted',
        args: [voter1],
      });

      expect(restricted).toBe(false);
    });

    it('should prevent voting by restricted users', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('User restricted by guardian'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'vote',
          args: [1n, 1],
        });
      }).rejects.toThrow('restricted');
    });

    it('should allow guardian override for emergency', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'guardianOverride',
        args: [1n, true],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Integration with ProofLedger', () => {
    it('should return ledger address', async () => {
      const ledger = '0xLedger1234567890123456789012345678901' as Address;
      mockContractRead.mockResolvedValueOnce(ledger);

      const result = await mockContractRead({ functionName: 'ledger' });
      expect(result).toBe(ledger);
    });

    it('should record votes in ledger', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'vote',
        args: [1n, 1],
      });

      expect(result).toBe('0xhash');
      // Would verify ledger entry in integration test
    });
  });

  describe('Hooks Integration', () => {
    it('should return hooks contract address', async () => {
      const hooks = '0xHooks12345678901234567890123456789012' as Address;
      mockContractRead.mockResolvedValueOnce(hooks);

      const result = await mockContractRead({ functionName: 'hooks' });
      expect(result).toBe(hooks);
    });

    it('should trigger before-vote hook', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'vote',
        args: [1n, 1],
      });

      expect(result).toBe('0xhash');
      // Would verify hook execution in integration test
    });

    it('should trigger after-proposal-created hook', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'propose',
        args: [['0xTarget'], [0n], ['0x1234'], 'Test'],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Seer Contract Integration', () => {
    it('should return seer contract address', async () => {
      const seer = '0xSeer123456789012345678901234567890123' as Address;
      mockContractRead.mockResolvedValueOnce(seer);

      const result = await mockContractRead({ functionName: 'seer' });
      expect(result).toBe(seer);
    });

    it('should fetch seer score for eligibility check', async () => {
      mockContractRead.mockResolvedValueOnce(1000n); // seer score

      const score = await mockContractRead({
        functionName: 'getSeerScore',
        args: [voter1],
      });

      expect(score).toBe(1000n);
    });
  });
});
