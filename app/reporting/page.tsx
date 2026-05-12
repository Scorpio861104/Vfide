'use client';

export const dynamic = 'force-dynamic';

import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';

export default function ReportingPage() {
  return (
    <ComingSoonPage
      title="Reports & Dashboards"
      tagline="Cross-feature reporting and custom analytics"
      description={
        'A unified place to build custom reports, schedule recurring exports, and assemble dashboards ' +
        'that combine merchant analytics, ProofScore trends, treasury flow, and protocol-wide metrics. ' +
        'Useful for finance teams, DAO contributors, and merchants tracking multiple stores at once.'
      }
      requirements={[
        'Server-side report scheduling + delivery (email/webhook)',
        'Dashboard layout persistence (currently nothing here is saved to a server)',
        'Query builder backed by the read replicas, not the primary DB',
        'Export pipeline for CSV / JSON / PDF that respects RLS so users only see their own data',
      ]}
      alternative={{
        href: '/merchant/analytics',
        label: 'Merchant Analytics',
        description: 'Per-merchant revenue, customers, and trends are live and server-backed today. The cross-feature reporting layer is what\'s pending.',
      }}
      backHref="/"
    />
  );
}
