'use client';

import { CreatorDashboard } from '@/components/social/CreatorDashboard';

export function DashboardTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Dashboard</h3>
        <CreatorDashboard />
      </div>
    </div>
  );
}
