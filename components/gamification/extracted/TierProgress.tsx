'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function TierProgress({ tier, currentScore }: TierProgressProps) {
  const tierRange = tier.maxScore - tier.minScore;
  const scoreInTier = currentScore - tier.minScore;
  const progress = Math.min((scoreInTier / tierRange) * 100, 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl md:text-5xl">{tier.badge}</span>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              {tier.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{tier.description}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Score Progress
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {currentScore} / {tier.maxScore}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`bg-gradient-to-r ${tier.color} h-3 rounded-full transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Benefits */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Tier Benefits:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {tier.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
