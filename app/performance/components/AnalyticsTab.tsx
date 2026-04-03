'use client';

import { motion } from 'framer-motion';
import { UserAnalyticsDashboard } from '@/components/performance/UserAnalyticsDashboard';

interface AnalyticsTabProps {
  analytics: any;
}

export function AnalyticsTab({ analytics }: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <UserAnalyticsDashboard analytics={analytics} />
      </motion.div>
    </div>
  );
}
