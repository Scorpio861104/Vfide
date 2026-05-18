'use client';

export const dynamic = 'force-dynamic';

import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';

export default function MultisigPage() {
  return (
    <ComingSoonPage
      title="Multi-Signature Wallet"
      tagline="Require multiple approvals before any transaction executes"
      description={
        'Configure an M-of-N approval scheme (e.g. 2-of-3, 3-of-5) where multiple wallets must ' +
        'sign before any outgoing payment, governance vote, or vault action runs. Used by treasuries, ' +
        'shared business accounts, and high-value personal wallets that want defense against single-key compromise.'
      }
      requirements={[
        'Multisig factory contract (Safe-compatible) deployed to Base',
        'Per-user multisig registry so the frontend can list which Safes a wallet belongs to',
        'Proposal / confirmation / execution flow integrated with the existing payment pipeline',
        'Recovery path that respects the M-of-N threshold (overlaps with Guardians)',
      ]}
      alternative={{
        href: '/guardians',
        label: 'Guardian-based recovery',
        description: 'Today VFIDE\'s native protection is guardian-set vault recovery, which covers the same threat (single key compromise) with a different mechanism.',
      }}
      backHref="/"
    />
  );
}
