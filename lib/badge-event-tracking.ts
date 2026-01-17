/**
 * Badge Event Tracking System
 * 
 * Records user activities that affect badge eligibility
 * Provides real-time tracking for transactions, votes, endorsements, etc.
 * 
 * Features:
 * - Activity logging
 * - Streak tracking
 * - Time-based activity patterns
 * - Aggregated statistics
 * - Event persistence
 */

import { UserStats } from './badge-eligibility';

// Event types
export enum BadgeEventType {
  TRANSACTION = 'TRANSACTION',
  VOTE = 'VOTE',
  PROPOSAL_CREATED = 'PROPOSAL_CREATED',
  ENDORSEMENT_GIVEN = 'ENDORSEMENT_GIVEN',
  ENDORSEMENT_RECEIVED = 'ENDORSEMENT_RECEIVED',
  MERCHANT_REGISTRATION = 'MERCHANT_REGISTRATION',
  MENTOR_REGISTRATION = 'MENTOR_REGISTRATION',
  MENTEE_ADDED = 'MENTEE_ADDED',
  BUG_REPORT = 'BUG_REPORT',
  SECURITY_REPORT = 'SECURITY_REPORT',
  DOCUMENTATION_CONTRIBUTION = 'DOCUMENTATION_CONTRIBUTION',
  TUTORIAL_CREATED = 'TUTORIAL_CREATED',
  TRANSLATION_CONTRIBUTION = 'TRANSLATION_CONTRIBUTION',
  BETA_PARTICIPATION = 'BETA_PARTICIPATION',
  EVENT_ATTENDANCE = 'EVENT_ATTENDANCE',
}

export interface BadgeActivityEvent {
  userId: string;
  walletAddress: string;
  eventType: BadgeEventType;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ActivityStreak {
  type: 'voting' | 'daily' | 'early_bird' | 'night_owl' | 'weekend';
  count: number;
  lastTimestamp: number;
}

// In-memory storage (production should use database)
const activityEvents = new Map<string, BadgeActivityEvent[]>(); // userId -> events
const activityStreaks = new Map<string, Map<string, ActivityStreak>>(); // userId -> streakType -> streak
const activityStats = new Map<string, Partial<UserStats>>(); // userId -> stats

/**
 * Record a badge-related activity event
 */
export function recordBadgeEvent(event: BadgeActivityEvent): void {
  const { userId } = event;
  
  // Add to events list
  if (!activityEvents.has(userId)) {
    activityEvents.set(userId, []);
  }
  activityEvents.get(userId)!.push(event);

  // Update stats
  updateActivityStats(event);

  // Update streaks
  updateStreaks(event);

  // Persist event (would be database call in production)
  persistEvent(event);
}

/**
 * Update aggregated statistics based on event
 */
function updateActivityStats(event: BadgeActivityEvent): void {
  const { userId, eventType } = event;
  
  if (!activityStats.has(userId)) {
    activityStats.set(userId, {});
  }
  
  const stats = activityStats.get(userId)!;
  
  switch (eventType) {
    case BadgeEventType.TRANSACTION:
      stats.transactionCount = (stats.transactionCount || 0) + 1;
      break;
    
    case BadgeEventType.VOTE:
      stats.votesCount = (stats.votesCount || 0) + 1;
      break;
    
    case BadgeEventType.PROPOSAL_CREATED:
      stats.proposalsCreated = (stats.proposalsCreated || 0) + 1;
      break;
    
    case BadgeEventType.ENDORSEMENT_GIVEN:
      stats.endorsementsGiven = (stats.endorsementsGiven || 0) + 1;
      break;
    
    case BadgeEventType.ENDORSEMENT_RECEIVED:
      stats.endorsementsReceived = (stats.endorsementsReceived || 0) + 1;
      break;
    
    case BadgeEventType.MERCHANT_REGISTRATION:
      stats.isMerchant = true;
      break;
    
    case BadgeEventType.MENTOR_REGISTRATION:
      stats.isMentor = true;
      break;
    
    case BadgeEventType.MENTEE_ADDED:
      stats.mentees = (stats.mentees || 0) + 1;
      break;
    
    case BadgeEventType.BUG_REPORT:
      stats.bugReports = (stats.bugReports || 0) + 1;
      break;
    
    case BadgeEventType.SECURITY_REPORT:
      stats.securityReports = (stats.securityReports || 0) + 1;
      break;
    
    case BadgeEventType.DOCUMENTATION_CONTRIBUTION:
      stats.documentationContributions = (stats.documentationContributions || 0) + 1;
      break;
    
    case BadgeEventType.TUTORIAL_CREATED:
      stats.tutorialsCreated = (stats.tutorialsCreated || 0) + 1;
      break;
    
    case BadgeEventType.BETA_PARTICIPATION:
      stats.betaTester = true;
      break;
  }
}

/**
 * Update activity streaks
 */
function updateStreaks(event: BadgeActivityEvent): void {
  const { userId, eventType, timestamp } = event;
  
  if (!activityStreaks.has(userId)) {
    activityStreaks.set(userId, new Map());
  }
  
  const userStreaks = activityStreaks.get(userId)!;
  
  // Voting streak
  if (eventType === BadgeEventType.VOTE) {
    updateStreak(userStreaks, 'voting', timestamp);
  }
  
  // Daily activity streak
  updateDailyStreak(userStreaks, timestamp);
  
  // Time-based patterns
  const hour = new Date(timestamp).getHours();
  
  // Early bird (before 8 AM)
  if (hour < 8) {
    updateStreak(userStreaks, 'early_bird', timestamp);
  }
  
  // Night owl (after 10 PM)
  if (hour >= 22) {
    updateStreak(userStreaks, 'night_owl', timestamp);
  }
  
  // Weekend warrior
  const day = new Date(timestamp).getDay();
  if (day === 0 || day === 6) {
    updateStreak(userStreaks, 'weekend', timestamp);
  }
}

/**
 * Update a specific streak type
 */
function updateStreak(
  streaks: Map<string, ActivityStreak>,
  type: ActivityStreak['type'],
  timestamp: number
): void {
  const existing = streaks.get(type);
  
  if (!existing) {
    streaks.set(type, {
      type,
      count: 1,
      lastTimestamp: timestamp,
    });
    return;
  }
  
  // Check if consecutive (within 24 hours for daily, immediate for voting)
  const hoursSince = (timestamp - existing.lastTimestamp) / (1000 * 60 * 60);
  const isConsecutive = type === 'voting' ? hoursSince < 168 : hoursSince < 48; // 7 days for voting, 2 days for others
  
  if (isConsecutive) {
    existing.count++;
    existing.lastTimestamp = timestamp;
  } else {
    // Reset streak
    existing.count = 1;
    existing.lastTimestamp = timestamp;
  }
}

/**
 * Update daily activity streak
 */
function updateDailyStreak(streaks: Map<string, ActivityStreak>, timestamp: number): void {
  const existing = streaks.get('daily');
  const today = new Date(timestamp).toDateString();
  
  if (!existing) {
    streaks.set('daily', {
      type: 'daily',
      count: 1,
      lastTimestamp: timestamp,
    });
    return;
  }
  
  const lastDay = new Date(existing.lastTimestamp).toDateString();
  
  // Same day - don't increment
  if (today === lastDay) {
    return;
  }
  
  // Check if consecutive days
  const yesterday = new Date(timestamp);
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = yesterday.toDateString() === lastDay;
  
  if (isConsecutive) {
    existing.count++;
    existing.lastTimestamp = timestamp;
  } else {
    // Reset streak
    existing.count = 1;
    existing.lastTimestamp = timestamp;
  }
}

/**
 * Persist event to storage (would be database in production)
 */
async function persistEvent(event: BadgeActivityEvent): Promise<void> {
  try {
    // In production, this would save to database
    // For now, log for debugging
    console.log('Badge event recorded:', {
      type: event.eventType,
      user: event.userId,
      timestamp: new Date(event.timestamp).toISOString(),
    });
    
    // Call API endpoint to persist
    await fetch('/api/badges/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Failed to persist badge event:', error);
  }
}

/**
 * Get user's activity statistics
 */
export function getUserActivityStats(userId: string): Partial<UserStats> {
  return activityStats.get(userId) || {};
}

/**
 * Get user's activity streaks
 */
export function getUserStreaks(userId: string): Map<string, ActivityStreak> {
  return activityStreaks.get(userId) || new Map();
}

/**
 * Get user's voting streak count
 */
export function getVotingStreak(userId: string): number {
  const streaks = activityStreaks.get(userId);
  return streaks?.get('voting')?.count || 0;
}

/**
 * Get user's daily activity streak count
 */
export function getDailyStreak(userId: string): number {
  const streaks = activityStreaks.get(userId);
  return streaks?.get('daily')?.count || 0;
}

/**
 * Get all events for a user
 */
export function getUserEvents(userId: string): BadgeActivityEvent[] {
  return activityEvents.get(userId) || [];
}

/**
 * Get events by type for a user
 */
export function getUserEventsByType(
  userId: string,
  eventType: BadgeEventType
): BadgeActivityEvent[] {
  const events = activityEvents.get(userId) || [];
  return events.filter(e => e.eventType === eventType);
}

/**
 * Get event count by type
 */
export function getEventCount(userId: string, eventType: BadgeEventType): number {
  return getUserEventsByType(userId, eventType).length;
}

/**
 * Clear event data for user (for testing/cleanup)
 */
export function clearUserEventData(userId: string): void {
  activityEvents.delete(userId);
  activityStreaks.delete(userId);
  activityStats.delete(userId);
}

/**
 * Initialize user's activity data from historical records
 */
export async function initializeUserActivityData(
  userId: string,
  walletAddress: string
): Promise<void> {
  try {
    // Fetch historical events from database
    const response = await fetch(`/api/badges/events/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch user events');
    }
    
    const data = await response.json();
    const events: BadgeActivityEvent[] = data.events || [];
    
    // Replay events to rebuild stats and streaks
    for (const event of events) {
      updateActivityStats(event);
      updateStreaks(event);
    }
    
    // Store events
    activityEvents.set(userId, events);
    
    console.log(`Initialized activity data for user ${userId} with ${events.length} historical events`);
  } catch (error) {
    console.error(`Error initializing activity data for user ${userId}:`, error);
  }
}
