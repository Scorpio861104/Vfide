/**
 * Badge Monitor Service - Automatic Badge Assignment System
 * 
 * This service automatically detects when users meet badge criteria
 * and triggers badge minting without requiring manual claiming.
 * 
 * Features:
 * - Real-time eligibility checking
 * - Automatic badge minting
 * - Event-driven architecture
 * - Deduplication to prevent double-minting
 * - Error handling and retry logic
 */

import { checkBadgeEligibility, UserStats } from './badge-eligibility';
import { badgeRegistry } from './badge-registry';

// Types
export interface BadgeEvent {
  userId: string;
  walletAddress: string;
  badgeId: string;
  timestamp: number;
  autoMinted: boolean;
}

export interface PendingBadge {
  badgeId: string;
  userId: string;
  walletAddress: string;
  detectedAt: number;
  attemptCount: number;
}

// In-memory storage (production should use Redis/database)
const mintedBadges = new Map<string, Set<string>>(); // userId -> Set of badgeIds
const pendingBadges = new Map<string, PendingBadge[]>(); // userId -> pending badges
const processingLocks = new Map<string, boolean>(); // userId -> processing flag

/**
 * Check if user already has a badge
 */
function hasBadge(userId: string, badgeId: string): boolean {
  const userBadges = mintedBadges.get(userId);
  return userBadges ? userBadges.has(badgeId) : false;
}

/**
 * Mark badge as minted for user
 */
function markBadgeMinted(userId: string, badgeId: string): void {
  if (!mintedBadges.has(userId)) {
    mintedBadges.set(userId, new Set());
  }
  mintedBadges.get(userId)!.add(badgeId);
}

/**
 * Check user's eligibility for all badges and return newly earned badges
 */
export async function checkForNewBadges(
  userId: string,
  walletAddress: string,
  userStats: UserStats
): Promise<string[]> {
  const newBadges: string[] = [];

  // Check each badge in registry
  for (const [badgeId, badgeMetadata] of Object.entries(badgeRegistry)) {
    // Skip if user already has this badge
    if (hasBadge(userId, badgeId)) {
      continue;
    }

    // Check eligibility
    const eligibility = checkBadgeEligibility(badgeId, userStats);
    
    // If eligible, add to new badges list
    if (eligibility.isEligible) {
      newBadges.push(badgeId);
    }
  }

  return newBadges;
}

/**
 * Automatically mint badge for user
 */
async function autoMintBadge(
  userId: string,
  walletAddress: string,
  badgeId: string
): Promise<boolean> {
  try {
    // Call badge minting API
    const response = await fetch('/api/badges/auto-mint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        walletAddress,
        badgeId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to mint badge: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`Error auto-minting badge ${badgeId} for user ${userId}:`, error);
    return false;
  }
}

/**
 * Add pending badge to queue
 */
function addPendingBadge(userId: string, walletAddress: string, badgeId: string): void {
  if (!pendingBadges.has(userId)) {
    pendingBadges.set(userId, []);
  }
  
  const pending = pendingBadges.get(userId)!;
  
  // Check if already pending
  if (pending.some(p => p.badgeId === badgeId)) {
    return;
  }
  
  pending.push({
    badgeId,
    userId,
    walletAddress,
    detectedAt: Date.now(),
    attemptCount: 0,
  });
}

/**
 * Process pending badges for a user
 */
async function processPendingBadges(userId: string): Promise<void> {
  const pending = pendingBadges.get(userId);
  if (!pending || pending.length === 0) {
    return;
  }

  const remaining: PendingBadge[] = [];

  for (const badge of pending) {
    // Skip if already processed
    if (hasBadge(userId, badge.badgeId)) {
      continue;
    }

    // Increment attempt count
    badge.attemptCount++;

    // Try to mint
    const success = await autoMintBadge(userId, badge.walletAddress, badge.badgeId);
    
    if (success) {
      markBadgeMinted(userId, badge.badgeId);
      
      // Emit badge earned event
      emitBadgeEarnedEvent(userId, badge.walletAddress, badge.badgeId);
    } else {
      // Retry up to 3 times
      if (badge.attemptCount < 3) {
        remaining.push(badge);
      } else {
        console.error(`Failed to mint badge ${badge.badgeId} for user ${userId} after 3 attempts`);
      }
    }
  }

  // Update pending list
  if (remaining.length > 0) {
    pendingBadges.set(userId, remaining);
  } else {
    pendingBadges.delete(userId);
  }
}

/**
 * Emit badge earned event for notifications
 */
function emitBadgeEarnedEvent(userId: string, walletAddress: string, badgeId: string): void {
  const badge = badgeRegistry[badgeId];
  if (!badge) return;

  // Dispatch custom event for UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('badgeEarned', {
      detail: {
        userId,
        walletAddress,
        badgeId,
        badgeName: badge.name,
        badgeRarity: badge.rarity,
        points: badge.points,
        timestamp: Date.now(),
      },
    }));
  }

  // Log event
  console.log(`🏅 Badge earned: ${badge.name} by user ${userId}`);
}

/**
 * Main function to check and auto-assign badges
 * Call this after any user activity that could affect badge eligibility
 */
export async function monitorAndAssignBadges(
  userId: string,
  walletAddress: string,
  userStats: UserStats
): Promise<void> {
  // Prevent concurrent processing for same user
  if (processingLocks.get(userId)) {
    return;
  }

  try {
    processingLocks.set(userId, true);

    // Check for newly earned badges
    const newBadges = await checkForNewBadges(userId, walletAddress, userStats);

    // Add to pending queue
    for (const badgeId of newBadges) {
      addPendingBadge(userId, walletAddress, badgeId);
    }

    // Process pending badges
    await processPendingBadges(userId);
  } catch (error) {
    console.error(`Error monitoring badges for user ${userId}:`, error);
  } finally {
    processingLocks.delete(userId);
  }
}

/**
 * Initialize badge monitor for a user (load their existing badges)
 */
export async function initializeBadgeMonitor(
  userId: string,
  walletAddress: string
): Promise<void> {
  try {
    // Fetch user's existing badges from blockchain
    const response = await fetch(`/api/badges/user/${walletAddress}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch user badges');
    }

    const data = await response.json();
    const existingBadges = data.badges || [];

    // Initialize user's badge set
    if (!mintedBadges.has(userId)) {
      mintedBadges.set(userId, new Set());
    }

    // Mark all existing badges as minted
    for (const badgeId of existingBadges) {
      mintedBadges.get(userId)!.add(badgeId);
    }

    console.log(`Initialized badge monitor for user ${userId} with ${existingBadges.length} existing badges`);
  } catch (error) {
    console.error(`Error initializing badge monitor for user ${userId}:`, error);
  }
}

/**
 * Get pending badges for a user
 */
export function getPendingBadges(userId: string): PendingBadge[] {
  return pendingBadges.get(userId) || [];
}

/**
 * Get minted badges for a user
 */
export function getMintedBadges(userId: string): string[] {
  const badges = mintedBadges.get(userId);
  return badges ? Array.from(badges) : [];
}

/**
 * Clear monitor data for a user (for testing/cleanup)
 */
export function clearUserMonitorData(userId: string): void {
  mintedBadges.delete(userId);
  pendingBadges.delete(userId);
  processingLocks.delete(userId);
}
