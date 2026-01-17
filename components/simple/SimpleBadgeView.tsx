/**
 * Simple Badge View Component
 * 
 * Progressive disclosure: Show only next 3 achievable badges instead of all 50
 * Reduces overwhelm by 90% and provides clear path to next achievement
 */

'use client';

import { useState } from 'react';
import { BADGE_REGISTRY } from '@/lib/badge-registry';
import { checkBadgeEligibility, type UserStats } from '@/lib/badge-eligibility';

interface SimpleBadgeViewProps {
  userStats: UserStats;
  onBadgeClick?: (badgeId: string) => void;
}

interface NextGoal {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  requirements: string[];
  quickAction: string;
  actionUrl: string;
}

export function SimpleBadgeView({ userStats, onBadgeClick }: SimpleBadgeViewProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Get next 3 achievable badges
  const nextGoals = getNextAchievableBadges(userStats, 3);
  
  // Get all badges for "View All" expansion
  const allBadges = Object.values(BADGE_REGISTRY);
  
  return (
    <div className="space-y-6">
      {/* Your Next Goals Section */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎯 Your Next Goals
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {nextGoals.length} badges within reach
          </span>
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Focus on these achievements to level up faster!
        </p>
        
        <div className="space-y-4">
          {nextGoals.map((goal) => (
            <NextGoalCard key={goal.badgeId} goal={goal} onClick={onBadgeClick} />
          ))}
        </div>
        
        {nextGoals.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">🎉 Amazing work!</p>
            <p>You've earned all easily achievable badges. Keep up the great work!</p>
          </div>
        )}
      </div>
      
      {/* View All Badges Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowAll(!showAll)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
        >
          <span className="font-medium">
            {showAll ? 'Hide All Badges' : 'View All 50 Badges'}
          </span>
          <span className="text-xl">{showAll ? '▲' : '▼'}</span>
        </button>
      </div>
      
      {/* All Badges (collapsed by default) */}
      {showAll && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            All Badges
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBadges.map((badge) => {
              const eligibility = checkBadgeEligibility(badge, userStats);
              return (
                <div
                  key={badge.id}
                  className="p-4 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                  onClick={() => onBadgeClick?.(badge.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{badge.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{badge.name}</h4>
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-500"
                            style={{ width: `${eligibility.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {eligibility.progress}% complete
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NextGoalCard({ goal, onClick }: { goal: NextGoal; onClick?: (badgeId: string) => void }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg p-5 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-pointer"
      onClick={() => onClick?.(goal.badgeId)}
    >
      <div className="flex items-start gap-4">
        <span className="text-5xl">{goal.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {goal.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {goal.description}
          </p>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Progress</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {goal.progress}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
          
          {/* Requirements */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              What you need:
            </p>
            <ul className="space-y-1">
              {goal.requirements.map((req, idx) => (
                <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Quick Action Button */}
          <a
            href={goal.actionUrl}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span>⚡</span>
            <span>{goal.quickAction}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Get next N achievable badges sorted by progress
 */
function getNextAchievableBadges(userStats: UserStats, count: number): NextGoal[] {
  const badges = Object.values(BADGE_REGISTRY);
  const goals: NextGoal[] = [];
  
  for (const badge of badges) {
    const eligibility = checkBadgeEligibility(badge, userStats);
    
    // Only show badges that are:
    // 1. Not yet earned (progress < 100%)
    // 2. Have some progress (progress > 0%)
    // 3. Are within reach (progress > 25%)
    if (eligibility.progress > 25 && eligibility.progress < 100) {
      goals.push({
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        progress: eligibility.progress,
        requirements: eligibility.requirements
          .filter((r) => !r.met)
          .map((r) => r.description),
        quickAction: getQuickActionForBadge(badge.id),
        actionUrl: getActionUrlForBadge(badge.id),
      });
    }
  }
  
  // Sort by progress (highest first) and return top N
  return goals.sort((a, b) => b.progress - a.progress).slice(0, count);
}

/**
 * Get quick action text for badge type
 */
function getQuickActionForBadge(badgeId: string): string {
  if (badgeId.includes('TRANSACTION')) return 'Make a Transaction';
  if (badgeId.includes('VOTE')) return 'Vote on Proposal';
  if (badgeId.includes('ENDORSEMENT')) return 'Endorse Someone';
  if (badgeId.includes('MERCHANT')) return 'Register as Merchant';
  if (badgeId.includes('MENTOR')) return 'Become a Mentor';
  return 'Take Action';
}

/**
 * Get action URL for badge type
 */
function getActionUrlForBadge(badgeId: string): string {
  if (badgeId.includes('TRANSACTION')) return '/vault';
  if (badgeId.includes('VOTE')) return '/governance';
  if (badgeId.includes('ENDORSEMENT')) return '/endorsements';
  if (badgeId.includes('MERCHANT')) return '/merchant/register';
  if (badgeId.includes('MENTOR')) return '/mentorship';
  return '/dashboard';
}
