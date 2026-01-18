/**
 * ProofScore Quick Wins Guide
 * 
 * Shows users clear path to level up with actionable tasks
 * Replaces confusing 7-tier display with simple "what to do next"
 */

'use client';

interface QuickWin {
  id: string;
  title: string;
  points: number;
  estimatedTime: string;
  completed: boolean;
  action: string;
  actionUrl: string;
}

interface TierInfo {
  current: {
    name: string;
    min: number;
    max: number;
  };
  next: {
    name: string;
    min: number;
    benefits: string[];
  };
}

interface QuickWinsGuideProps {
  currentScore: number;
  onActionClick?: (winId: string) => void;
}

export function QuickWinsGuide({ currentScore, onActionClick }: QuickWinsGuideProps) {
  const tierInfo = getTierInfo(currentScore);
  const quickWins = getQuickWins(currentScore);
  const pointsToNext = tierInfo.next.min - currentScore;
  const progressPercent = Math.min(
    ((currentScore - tierInfo.current.min) / (tierInfo.next.min - tierInfo.current.min)) * 100,
    100
  );
  
  // Calculate estimated time to next tier
  const availableWins = quickWins.filter((w) => !w.completed);
  const availablePoints = availableWins.reduce((sum, w) => sum + w.points, 0);
  const totalEstimatedMinutes = availableWins.reduce(
    (sum, w) => sum + parseInt(w.estimatedTime),
    0
  );
  const canReachNext = availablePoints >= pointsToNext;
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🎯 Level Up Your ProofScore
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          Complete these quick tasks to unlock more features
        </p>
      </div>
      
      {/* Current Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your ProofScore</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {currentScore.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Next Tier</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {tierInfo.next.name}
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
              at {tierInfo.next.min.toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700 dark:text-gray-300">
              {tierInfo.current.name}
            </span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${progressPercent}%` }}
            >
              {progressPercent > 10 && (
                <span className="text-xs text-white font-bold">▶</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500 mt-1">
            <span>{tierInfo.current.min.toLocaleString()}</span>
            <span>{tierInfo.next.min.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      {/* Points Needed Info */}
      <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {pointsToNext.toLocaleString()} points needed
            </p>
            {canReachNext && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ⚡ Estimated time: {Math.round(totalEstimatedMinutes)} minutes
              </p>
            )}
          </div>
          {canReachNext && (
            <div className="text-green-600 dark:text-green-400 font-bold text-lg">
              ✓ Within reach!
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Wins to Level Up */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Quick Wins to Level Up:
        </h3>
        <div className="space-y-3">
          {quickWins.map((win) => (
            <QuickWinCard
              key={win.id}
              win={win}
              onClick={() => onActionClick?.(win.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Next Tier Benefits Preview */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-5 border-2 border-purple-300 dark:border-purple-600">
        <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span>🎁</span>
          <span>Unlock at {tierInfo.next.name}:</span>
        </h4>
        <ul className="space-y-2">
          {tierInfo.next.benefits.map((benefit, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function QuickWinCard({
  win,
  onClick,
}: {
  win: QuickWin;
  onClick: () => void;
}) {
  return (
    <div
      className={`rounded-lg p-4 border-2 flex items-center justify-between gap-4 ${
        win.completed
          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 cursor-pointer'
      } transition-colors`}
      onClick={win.completed ? undefined : onClick}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`text-2xl ${win.completed ? '' : 'animate-pulse'}`}>
          {win.completed ? '✅' : '⏳'}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {win.title}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              +{win.points} pts
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {win.estimatedTime} min
            </span>
          </div>
        </div>
      </div>
      {!win.completed && (
        <a
          href={win.actionUrl}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          {win.action}
        </a>
      )}
    </div>
  );
}

/**
 * Get tier information for current score
 */
function getTierInfo(currentScore: number): TierInfo {
  if (currentScore < 5000) {
    return {
      current: { name: 'New User', min: 0, max: 4999 },
      next: {
        name: 'Neutral',
        min: 5000,
        benefits: ['Basic platform access', 'Transaction capabilities', 'Community participation'],
      },
    };
  } else if (currentScore < 5400) {
    return {
      current: { name: 'Neutral', min: 5000, max: 5399 },
      next: {
        name: 'Governance',
        min: 5400,
        benefits: ['Vote on proposals', 'Influence platform direction', 'All Neutral benefits'],
      },
    };
  } else if (currentScore < 5600) {
    return {
      current: { name: 'Governance', min: 5400, max: 5599 },
      next: {
        name: 'Merchant',
        min: 5600,
        benefits: ['Sell products/services', 'Access merchant tools', 'All previous benefits'],
      },
    };
  } else if (currentScore < 7000) {
    return {
      current: { name: 'Merchant', min: 5600, max: 6999 },
      next: {
        name: 'Trusted',
        min: 7000,
        benefits: ['Endorse others', 'Become a mentor', 'Enhanced reputation', 'All previous benefits'],
      },
    };
  } else if (currentScore < 8000) {
    return {
      current: { name: 'Trusted', min: 7000, max: 7999 },
      next: {
        name: 'Elite',
        min: 8000,
        benefits: ['Council member eligibility', 'Advanced features', 'Elite status badge', 'All previous benefits'],
      },
    };
  } else {
    return {
      current: { name: 'Elite', min: 8000, max: 10000 },
      next: {
        name: 'Perfect',
        min: 10000,
        benefits: ['Maximum platform access', 'VIP status', 'All features unlocked'],
      },
    };
  }
}

/**
 * Get quick win tasks for current score
 */
function getQuickWins(currentScore: number): QuickWin[] {
  // TODO: Fetch actual completion status from backend
  // Mock data for now
  return [
    {
      id: 'complete-profile',
      title: 'Complete your profile',
      points: 50,
      estimatedTime: '2',
      completed: currentScore >= 5000,
      action: 'Complete Now',
      actionUrl: '/profile/edit',
    },
    {
      id: 'verify-email',
      title: 'Verify your email',
      points: 100,
      estimatedTime: '1',
      completed: false,
      action: 'Verify Email',
      actionUrl: '/settings/security',
    },
    {
      id: 'first-transaction',
      title: 'Make your first transaction',
      points: 50,
      estimatedTime: '5',
      completed: false,
      action: 'Send Payment',
      actionUrl: '/vault',
    },
  ];
}
