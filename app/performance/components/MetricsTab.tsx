'use client';

import { PerformanceMetricsGrid } from '@/components/performance/PerformanceMetricsGrid';

interface MetricsTabProps {
  metrics: any[];
  isLoading?: boolean;
}

export function MetricsTab({ metrics, isLoading = false }: MetricsTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h3 className="mb-2 text-xl font-bold text-white">Metrics</h3>
        <p className="mb-6 text-gray-400">A deeper look at live Core Web Vitals and runtime health.</p>
        <PerformanceMetricsGrid metrics={metrics} isLoading={isLoading} />
      </div>
    </div>
  );
}
