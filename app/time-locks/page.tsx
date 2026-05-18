'use client';

export const dynamic = 'force-dynamic';

import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';

export default function TimeLocksPage() {
  return (
    <ComingSoonPage
      title="Transaction Time Locks"
      tagline="Configurable delays for high-value outgoing payments"
      description={
        'Set tiered delay windows on outgoing transactions based on amount: tiny payments execute immediately, ' +
        'medium payments wait an hour, large payments wait a day. Gives you a window to cancel a transaction ' +
        'if your key is compromised — the attacker has to wait before draining your wallet, and you can intervene.'
      }
      requirements={[
        'User-configurable timelock contract per wallet (or integration with CardBoundVault\'s existing withdrawal queue)',
        'Frontend cancel-pending-transaction UI with proper authorization checks',
        'Notification path so the user is alerted to a pending high-value outflow they didn\'t expect',
        'Integration with the existing 48-hour governance timelocks (consistent UX patterns)',
      ]}
      alternative={{
        href: '/vault',
        label: 'Vault withdrawal queue',
        description: 'CardBoundVault already implements a withdrawal queue for high-value outflows. The user-configurable wallet-level timelock is the missing piece.',
      }}
      backHref="/"
    />
  );
}
