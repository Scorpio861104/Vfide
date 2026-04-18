'use client';

export const dynamic = 'force-dynamic';

import { BarChart3 } from 'lucide-react';
import FinancialDashboard from '@/components/FinancialDashboard';
import { PageWrapper, PageHeader } from '@/components/ui/PageLayout';

export default function InsightsPage() {
  return (
    <PageWrapper variant="cosmic">
      <PageHeader
        icon={<BarChart3 className="w-10 h-10 text-white" />}
        title="Insight Command"
        subtitle="Track treasury, revenue, and token momentum in real time."
        badge="Financial Intelligence"
        badgeColor="bg-cyan-400/15 text-cyan-200"
      />
      <div className="container mx-auto px-4 pb-24 md:pb-8">
        <h1 className="sr-only">Insight Command</h1>
        <FinancialDashboard />
      </div>
    </PageWrapper>
  );
}
