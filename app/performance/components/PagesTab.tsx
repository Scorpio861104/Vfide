'use client';

import { motion } from 'framer-motion';
import { PageMetricsDisplay } from '@/components/performance/PageMetricsDisplay';

interface PagesTabProps {
  pageMetrics: any;
  apiMetrics: any[];
  isLoading?: boolean;
}

export function PagesTab({ pageMetrics, apiMetrics, isLoading = false }: PagesTabProps) {
  return (
    <div className="space-y-6">
      <motion.div key="pages" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageMetricsDisplay pageMetrics={pageMetrics} apiMetrics={apiMetrics} isLoading={isLoading} />
      </motion.div>
    </div>
  );
}
