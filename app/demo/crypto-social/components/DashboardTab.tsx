'use client';

import { CreatorDashboard } from '@/components/social/CreatorDashboard';

export function DashboardTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold">Creator Dashboard</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Comprehensive analytics and earnings management for content creators.
          Track your revenue, top supporters, and content performance.
        </p>

        <CreatorDashboard />
      </div>
    </div>
  );
}
