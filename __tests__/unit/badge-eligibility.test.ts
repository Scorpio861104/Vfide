/**
 * Sample Unit Tests for Badge Eligibility Logic
 */

import { checkBadgeEligibility } from '@/lib/badge-eligibility';
import { BADGE_REGISTRY } from '@/lib/badge-registry';

describe('Badge Eligibility Logic', () => {
  describe('PIONEER badge', () => {
    it('should be eligible with account number <= 1000', () => {
      const result = checkBadgeEligibility(BADGE_REGISTRY.PIONEER, {
        proofScore: 5000,
        accountCreationNumber: 500,
        transactionCount: 0,
        votesCount: 0,
      });
      
      expect(result.eligible).toBe(true);
      expect(result.progress).toBe(100);
    });
    
    it('should not be eligible with account number > 1000', () => {
      const result = checkBadgeEligibility(BADGE_REGISTRY.PIONEER, {
        proofScore: 5000,
        accountCreationNumber: 1500,
        transactionCount: 0,
        votesCount: 0,
      });
      
      expect(result.eligible).toBe(false);
      expect(result.progress).toBe(0);
    });
  });
  
  describe('BRONZE_TRADER badge', () => {
    it('should show progress towards 10 transactions', () => {
      const result = checkBadgeEligibility(BADGE_REGISTRY.BRONZE_TRADER, {
        proofScore: 5000,
        transactionCount: 5,
        votesCount: 0,
      });
      
      expect(result.eligible).toBe(false);
      expect(result.progress).toBe(50);
      expect(result.requirements).toContain('5 / 10');
    });
    
    it('should be eligible with 10+ transactions', () => {
      const result = checkBadgeEligibility(BADGE_REGISTRY.BRONZE_TRADER, {
        proofScore: 5000,
        transactionCount: 15,
        votesCount: 0,
      });
      
      expect(result.eligible).toBe(true);
      expect(result.progress).toBe(100);
    });
  });
  
  describe('VOTING_STREAK_5 badge', () => {
    it('should check voting streak correctly', () => {
      const result = checkBadgeEligibility(BADGE_REGISTRY.VOTING_STREAK_5, {
        proofScore: 5000,
        votingStreak: 3,
        transactionCount: 0,
        votesCount: 10,
      });
      
      expect(result.eligible).toBe(false);
      expect(result.progress).toBe(60); // 3/5 = 60%
    });
  });
});
