'use client';

import { useReferralActivity } from '@/hooks/useHeadhunterHooks';

export function ActivityTab() {
  const { activity, isLoading } = useReferralActivity();

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Referral Activity</h3>
          <p className="text-gray-400">Recent invite conversions and bounty credits.</p>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Loading referral activity…</p>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-white font-semibold">{item.type === 'merchant' ? 'Merchant referral' : 'User referral'}</div>
                <div className="text-sm text-gray-300">{item.address}</div>
                <div className="text-xs text-cyan-300 mt-1">{item.status} • +{item.points} point{item.points === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
