/**
 * Token Rewards — not available in this protocol.
 * VFIDE is a governance utility token; distributing rewards for engagement
 * would create an expectation of profits, conflicting with Howey compliance.
 */

'use client';

import { Award } from 'lucide-react';

interface RewardsDisplayProps {
  userId?: string;
}

export function RewardsDisplay({ userId: _userId }: RewardsDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-2">No Token Rewards</h3>
        <p className="text-gray-400 text-sm">
          VFIDE is a governance utility token. Token rewards for engagement
          activities are not offered — holding or using VFIDE cannot constitute
          an expectation of profits.
        </p>
      </div>
    </div>
  );
}
