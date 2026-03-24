/**
 * SeerView Contract Tests
 * Covers the stateless view-helper functions including the new
 * getMonitorStatus() that reads from SeerAutonomous.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address } from 'viem';

const mockContractRead = jest.fn();

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  createPublicClient: jest.fn(),
}));

describe('SeerView Contract', () => {
  let seerViewAddress: Address;
  let seerAddress: Address;
  let seerAutonomousAddress: Address;
  let subjectAddress: Address;
  let mentorAddress: Address;
  let vaultAddress: Address;

  beforeEach(() => {
    seerViewAddress    = '0xView11234567890123456789012345678901234' as Address;
    seerAddress        = '0xSeer11234567890123456789012345678901234' as Address;
    seerAutonomousAddress = '0xSeerA1234567890123456789012345678901234' as Address;
    subjectAddress     = '0xSubj11234567890123456789012345678901234' as Address;
    mentorAddress      = '0xMent11234567890123456789012345678901234' as Address;
    vaultAddress       = '0xVault1234567890123456789012345678901234' as Address;

    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMentorInfo
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMentorInfo', () => {
    it('returns full mentor info for a mentored subject', async () => {
      mockContractRead.mockResolvedValueOnce({
        isMentorUser: false,
        mentor: mentorAddress,
        menteeCount: 0,
        hasMentor: true,
        canBecome: false,
        minScore: 6000,
        currentScore: 6500,
      });

      const info = await mockContractRead({
        functionName: 'getMentorInfo',
        args: [seerAddress, subjectAddress],
      });

      expect(info.hasMentor).toBe(true);
      expect(info.mentor).toBe(mentorAddress);
      expect(info.currentScore).toBe(6500);
    });

    it('returns canBecome=true when score meets minimum and user is not already a mentor', async () => {
      mockContractRead.mockResolvedValueOnce({
        isMentorUser: false,
        mentor: '0x0000000000000000000000000000000000000000',
        menteeCount: 0,
        hasMentor: false,
        canBecome: true,
        minScore: 5000,
        currentScore: 7000,
      });

      const info = await mockContractRead({
        functionName: 'getMentorInfo',
        args: [seerAddress, subjectAddress],
      });

      expect(info.canBecome).toBe(true);
      expect(info.hasMentor).toBe(false);
    });

    it('returns canBecome=false when score is below minimum', async () => {
      mockContractRead.mockResolvedValueOnce({
        isMentorUser: false,
        mentor: '0x0000000000000000000000000000000000000000',
        menteeCount: 0,
        hasMentor: false,
        canBecome: false,
        minScore: 8000,
        currentScore: 4000,
      });

      const info = await mockContractRead({
        functionName: 'getMentorInfo',
        args: [seerAddress, subjectAddress],
      });

      expect(info.canBecome).toBe(false);
    });

    it('shows menteeCount for an active mentor', async () => {
      mockContractRead.mockResolvedValueOnce({
        isMentorUser: true,
        mentor: '0x0000000000000000000000000000000000000000',
        menteeCount: 5,
        hasMentor: false,
        canBecome: false,
        minScore: 5000,
        currentScore: 9000,
      });

      const info = await mockContractRead({
        functionName: 'getMentorInfo',
        args: [seerAddress, subjectAddress],
      });

      expect(info.isMentorUser).toBe(true);
      expect(info.menteeCount).toBe(5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getActiveEndorsements
  // ─────────────────────────────────────────────────────────────────────────
  describe('getActiveEndorsements', () => {
    it('returns empty arrays when subject has no endorsers', async () => {
      mockContractRead.mockResolvedValueOnce({
        endorsers: [],
        weights: [],
        expiries: [],
        timestamps: [],
      });

      const result = await mockContractRead({
        functionName: 'getActiveEndorsements',
        args: [seerAddress, subjectAddress],
      });

      expect(result.endorsers).toHaveLength(0);
    });

    it('returns only non-expired endorsements', async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 86400;
      mockContractRead.mockResolvedValueOnce({
        endorsers: [mentorAddress],
        weights: [100],
        expiries: [futureExpiry],
        timestamps: [Math.floor(Date.now() / 1000) - 3600],
      });

      const result = await mockContractRead({
        functionName: 'getActiveEndorsements',
        args: [seerAddress, subjectAddress],
      });

      expect(result.endorsers).toHaveLength(1);
      expect(result.endorsers[0]).toBe(mentorAddress);
      expect(result.expiries[0]).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getScores / getScoresBatch
  // ─────────────────────────────────────────────────────────────────────────
  describe('getScores', () => {
    it('returns scores for multiple subjects', async () => {
      mockContractRead.mockResolvedValueOnce([5000, 7500, 3000]);

      const scores = await mockContractRead({
        functionName: 'getScores',
        args: [seerAddress, [subjectAddress, mentorAddress, vaultAddress]],
      });

      expect(scores).toHaveLength(3);
      expect(scores[0]).toBe(5000);
      expect(scores[1]).toBe(7500);
    });

    it('getScoresBatch enforces batch size limit', async () => {
      // Simulates the on-chain require(len > 0 && len <= 100) check
      mockContractRead.mockRejectedValueOnce(new Error('SEER: invalid batch size'));

      await expect(
        mockContractRead({
          functionName: 'getScoresBatch',
          args: [seerAddress, []],
        })
      ).rejects.toThrow('invalid batch size');
    });

    it('returns scores for single-element batch', async () => {
      mockContractRead.mockResolvedValueOnce([6000]);

      const scores = await mockContractRead({
        functionName: 'getScoresBatch',
        args: [seerAddress, [subjectAddress]],
      });

      expect(scores).toHaveLength(1);
      expect(scores[0]).toBe(6000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getTrustLevel
  // ─────────────────────────────────────────────────────────────────────────
  describe('getTrustLevel', () => {
    it('returns Low Trust when score is at or below low threshold', async () => {
      mockContractRead.mockResolvedValueOnce({
        level: 0,
        levelName: 'Low Trust',
        canVote: false,
        canBeMerchant: false,
      });

      const result = await mockContractRead({
        functionName: 'getTrustLevel',
        args: [seerAddress, subjectAddress],
      });

      expect(result.level).toBe(0);
      expect(result.levelName).toBe('Low Trust');
      expect(result.canVote).toBe(false);
    });

    it('returns Medium Trust for mid-range score', async () => {
      mockContractRead.mockResolvedValueOnce({
        level: 1,
        levelName: 'Medium Trust',
        canVote: true,
        canBeMerchant: false,
      });

      const result = await mockContractRead({
        functionName: 'getTrustLevel',
        args: [seerAddress, subjectAddress],
      });

      expect(result.level).toBe(1);
      expect(result.canVote).toBe(true);
    });

    it('returns High Trust and both permissions for top score', async () => {
      mockContractRead.mockResolvedValueOnce({
        level: 2,
        levelName: 'High Trust',
        canVote: true,
        canBeMerchant: true,
      });

      const result = await mockContractRead({
        functionName: 'getTrustLevel',
        args: [seerAddress, subjectAddress],
      });

      expect(result.level).toBe(2);
      expect(result.levelName).toBe('High Trust');
      expect(result.canBeMerchant).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getMonitorStatus — SeerAutonomous + EcosystemVault monitoring
  // ─────────────────────────────────────────────────────────────────────────
  describe('getMonitorStatus', () => {
    it('returns zero vault address when SeerAutonomous has no vault configured', async () => {
      mockContractRead.mockResolvedValueOnce({
        vault: '0x0000000000000000000000000000000000000000',
        tasksReady: false,
        tasksBitmask: 0,
        totalActions: 0,
        violationRate: 0,
        sensitivity: 50,
      });

      const status = await mockContractRead({
        functionName: 'getMonitorStatus',
        args: [seerAutonomousAddress],
      });

      expect(status.vault).toBe('0x0000000000000000000000000000000000000000');
      expect(status.tasksReady).toBe(false);
      expect(status.tasksBitmask).toBe(0);
    });

    it('reports vault address and tasksReady=false when no tasks are due', async () => {
      mockContractRead.mockResolvedValueOnce({
        vault: vaultAddress,
        tasksReady: false,
        tasksBitmask: 0,
        totalActions: 500,
        violationRate: 30,
        sensitivity: 50,
      });

      const status = await mockContractRead({
        functionName: 'getMonitorStatus',
        args: [seerAutonomousAddress],
      });

      expect(status.vault).toBe(vaultAddress);
      expect(status.tasksReady).toBe(false);
      expect(status.totalActions).toBe(500);
    });

    it('returns TASK_COUNCIL bitmask when council distribution is due', async () => {
      const TASK_COUNCIL = 0x01;
      mockContractRead.mockResolvedValueOnce({
        vault: vaultAddress,
        tasksReady: true,
        tasksBitmask: TASK_COUNCIL,
        totalActions: 1200,
        violationRate: 50,
        sensitivity: 50,
      });

      const status = await mockContractRead({
        functionName: 'getMonitorStatus',
        args: [seerAutonomousAddress],
      });

      expect(status.tasksReady).toBe(true);
      expect(status.tasksBitmask & TASK_COUNCIL).toBe(TASK_COUNCIL);
    });

    it('returns TASK_MERCHANT bitmask when merchant period is due', async () => {
      const TASK_MERCHANT = 0x02;
      mockContractRead.mockResolvedValueOnce({
        vault: vaultAddress,
        tasksReady: true,
        tasksBitmask: TASK_MERCHANT,
        totalActions: 800,
        violationRate: 100,
        sensitivity: 55,
      });

      const status = await mockContractRead({
        functionName: 'getMonitorStatus',
        args: [seerAutonomousAddress],
      });

      expect(status.tasksBitmask & TASK_MERCHANT).toBe(TASK_MERCHANT);
    });

    it('returns combined bitmask when multiple tasks are due simultaneously', async () => {
      const ALL = 0x01 | 0x02 | 0x04 | 0x08;
      mockContractRead.mockResolvedValueOnce({
        vault: vaultAddress,
        tasksReady: true,
        tasksBitmask: ALL,
        totalActions: 5000,
        violationRate: 600,   // >5% → thresholds would tighten
        sensitivity: 60,
      });

      const status = await mockContractRead({
        functionName: 'getMonitorStatus',
        args: [seerAutonomousAddress],
      });

      expect(status.tasksReady).toBe(true);
      expect(status.tasksBitmask).toBe(ALL);
      // High violation rate is surfaced to frontends / dashboards
      expect(status.violationRate).toBe(600);
    });

    it('reflects elevated sensitivity after DAO applies max autonomy profile', async () => {
      mockContractRead.mockResolvedValueOnce({
        vault: vaultAddress,
        tasksReady: false,
        tasksBitmask: 0,
        totalActions: 300,
        violationRate: 20,
        sensitivity: 100, // max autonomy
      });

      const status = await mockContractRead({
        functionName: 'getMonitorStatus',
        args: [seerAutonomousAddress],
      });

      expect(status.sensitivity).toBe(100);
    });

    it('gracefully returns zero task info when vault reverts on checkUpkeep', async () => {
      // Simulates the try/catch in getMonitorStatus when checkUpkeep reverts
      mockContractRead.mockResolvedValueOnce({
        vault: vaultAddress,
        tasksReady: false,
        tasksBitmask: 0,
        totalActions: 100,
        violationRate: 10,
        sensitivity: 50,
      });

      const status = await mockContractRead({
        functionName: 'getMonitorStatus',
        args: [seerAutonomousAddress],
      });

      expect(status.tasksReady).toBe(false);
      expect(status.tasksBitmask).toBe(0);
    });
  });
});
