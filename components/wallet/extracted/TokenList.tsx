'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function TokenList({ tokens }: TokenListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">
        Token Balances
      </h3>
      <div className="space-y-3">
        {tokens.map((token, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl md:text-3xl shrink-0">{token.logo}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white">
                  {token.symbol}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{token.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white">
                {token.balanceFormatted}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ${token.valueUSD.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
