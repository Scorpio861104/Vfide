/**
 * Automatic Badge Rewards Hook
 * 
 * React hook for integrating automatic badge assignment into the application
 * Monitors user activities and triggers badge checks automatically
 * 
 * Features:
 * - Automatic initialization on component mount
 * - Activity tracking helpers
 * - Real-time badge notifications
 * - Progress monitoring
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import {
  monitorAndAssignBadges,
  initializeBadgeMonitor,
  getPendingBadges,
  getMintedBadges,
  PendingBadge,
} from '@/lib/badge-monitor';
import {
  recordBadgeEvent,
  BadgeEventType,
  getUserActivityStats,
  getUserStreaks,
  initializeUserActivityData,
} from '@/lib/badge-event-tracking';
import {
  setupBadgeNotificationListeners,
  BadgeNotification,
  getPendingNotifications,
} from '@/lib/badge-notifications';
import { UserStats } from '@/lib/badge-eligibility';

export interface UseBadgeRewardsReturn {
  // State
  isInitialized: boolean;
  pendingBadges: PendingBadge[];
  mintedBadges: string[];
  notifications: BadgeNotification[];
  
  // Activity tracking
  recordTransaction: () => void;
  recordVote: () => void;
  recordProposal: () => void;
  recordEndorsementGiven: () => void;
  recordEndorsementReceived: () => void;
  recordMerchantRegistration: () => void;
  recordMentorRegistration: () => void;
  recordMenteeAdded: () => void;
  recordBugReport: () => void;
  recordSecurityReport: () => void;
  recordDocumentationContribution: () => void;
  recordTutorialCreated: () => void;
  
  // Manual check
  checkBadgesNow: () => Promise<void>;
  
  // Stats
  activityStats: Partial<UserStats>;
  votingStreak: number;
  dailyStreak: number;
}

/**
 * Hook for automatic badge rewards system
 */
export function useBadgeRewards(): UseBadgeRewardsReturn {
  const { address } = useAccount();
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingBadges, setPendingBadges] = useState<PendingBadge[]>([]);
  const [mintedBadges, setMintedBadges] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<BadgeNotification[]>([]);
  const [activityStats, setActivityStats] = useState<Partial<UserStats>>({});
  const [votingStreak, setVotingStreak] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);

  const userId = address || '';

  // Initialize badge system
  useEffect(() => {
    if (!address) return;

    const initialize = async () => {
      try {
        // Initialize badge monitor
        await initializeBadgeMonitor(userId, address);
        
        // Initialize activity tracking
        await initializeUserActivityData(userId, address);
        
        // Setup notification listeners
        setupBadgeNotificationListeners();
        
        setIsInitialized(true);
        
        // Update state
        updateState();
      } catch (error) {
        console.error('Error initializing badge rewards:', error);
      }
    };

    initialize();
  }, [address, userId]);

  // Update state from storage
  const updateState = useCallback(() => {
    if (!userId) return;

    setPendingBadges(getPendingBadges(userId));
    setMintedBadges(getMintedBadges(userId));
    setNotifications(getPendingNotifications());
    setActivityStats(getUserActivityStats(userId));
    
    const streaks = getUserStreaks(userId);
    setVotingStreak(streaks.get('voting')?.count || 0);
    setDailyStreak(streaks.get('daily')?.count || 0);
  }, [userId]);

  // Listen for badge earned events
  useEffect(() => {
    const handleBadgeEarned = () => {
      updateState();
    };

    window.addEventListener('badgeEarned', handleBadgeEarned);
    return () => window.removeEventListener('badgeEarned', handleBadgeEarned);
  }, [updateState]);

  // Helper to record activity and trigger badge check
  const recordActivityAndCheck = useCallback(
    async (eventType: BadgeEventType, metadata?: Record<string, any>) => {
      if (!address || !userId) return;

      // Record event
      recordBadgeEvent({
        userId,
        walletAddress: address,
        eventType,
        timestamp: Date.now(),
        metadata,
      });

      // Get updated stats
      const stats = getUserActivityStats(userId);
      
      // Trigger badge check
      await monitorAndAssignBadges(userId, address, stats as UserStats);
      
      // Update UI
      updateState();
    },
    [address, userId, updateState]
  );

  // Activity recording methods
  const recordTransaction = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.TRANSACTION);
  }, [recordActivityAndCheck]);

  const recordVote = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.VOTE);
  }, [recordActivityAndCheck]);

  const recordProposal = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.PROPOSAL_CREATED);
  }, [recordActivityAndCheck]);

  const recordEndorsementGiven = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.ENDORSEMENT_GIVEN);
  }, [recordActivityAndCheck]);

  const recordEndorsementReceived = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.ENDORSEMENT_RECEIVED);
  }, [recordActivityAndCheck]);

  const recordMerchantRegistration = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.MERCHANT_REGISTRATION);
  }, [recordActivityAndCheck]);

  const recordMentorRegistration = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.MENTOR_REGISTRATION);
  }, [recordActivityAndCheck]);

  const recordMenteeAdded = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.MENTEE_ADDED);
  }, [recordActivityAndCheck]);

  const recordBugReport = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.BUG_REPORT);
  }, [recordActivityAndCheck]);

  const recordSecurityReport = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.SECURITY_REPORT);
  }, [recordActivityAndCheck]);

  const recordDocumentationContribution = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.DOCUMENTATION_CONTRIBUTION);
  }, [recordActivityAndCheck]);

  const recordTutorialCreated = useCallback(() => {
    recordActivityAndCheck(BadgeEventType.TUTORIAL_CREATED);
  }, [recordActivityAndCheck]);

  // Manual badge check
  const checkBadgesNow = useCallback(async () => {
    if (!address || !userId) return;

    const stats = getUserActivityStats(userId);
    await monitorAndAssignBadges(userId, address, stats as UserStats);
    updateState();
  }, [address, userId, updateState]);

  return {
    isInitialized,
    pendingBadges,
    mintedBadges,
    notifications,
    recordTransaction,
    recordVote,
    recordProposal,
    recordEndorsementGiven,
    recordEndorsementReceived,
    recordMerchantRegistration,
    recordMentorRegistration,
    recordMenteeAdded,
    recordBugReport,
    recordSecurityReport,
    recordDocumentationContribution,
    recordTutorialCreated,
    checkBadgesNow,
    activityStats,
    votingStreak,
    dailyStreak,
  };
}
