'use client';

export const dynamic = 'force-dynamic';

import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';

export default function AgentPage() {
  return (
    <ComingSoonPage
      title="Cash Agent Mode"
      tagline="Operator workflow for in-person cash-in / cash-out and customer support"
      description={
        'A dedicated interface for authorized agents (kiosks, corner stores, mobile money agents) to ' +
        'serve walk-in customers — recording cash-in, cash-out, payment-on-behalf, and recovery assistance ' +
        'against an immutable audit trail. Built for the financial-sovereignty mission: getting people ' +
        'who don\'t have a bank app onto VFIDE through a human intermediary they trust.'
      }
      requirements={[
        'Server-side audit log with append-only semantics (so an agent can\'t edit history)',
        'Agent registration & KYC flow (today there\'s no concept of an "authorized agent" in the contracts)',
        'On-chain settlement path that distinguishes agent-mediated vs direct transactions for fee accounting',
        'Per-agent rate limits and float caps enforced by the protocol, not just the UI',
        'Regulatory compliance review per jurisdiction before this can go live with real cash handling',
      ]}
      alternative={{
        href: '/merchant',
        label: 'Merchant Portal',
        description: 'A merchant can already accept VFIDE payments in-person via QR or payment links. The agent-mediated cash-handling workflow is the missing tier.',
      }}
      backHref="/"
    />
  );
}
