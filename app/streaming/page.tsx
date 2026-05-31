'use client';

export const dynamic = 'force-dynamic';

import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function StreamingPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <ComingSoonPage
      title="Money Streaming"
      tagline="Pay continuously instead of in lump sums"
      description={
        'Send VFIDE to a recipient at a defined rate-per-second over a period of time. ' +
        'The recipient can withdraw at any moment and receive only what has accrued. ' +
        'Useful for salaries, vesting schedules, subscriptions, and continuous service payments.'
      }
      requirements={[
        'Streaming contract (Superfluid-style or Sablier-fork) deployed to Base',
        'On-chain stream registry tied to VFIDEToken transfers',
        'Frontend wired to read live withdrawable balances per second',
        'Cancel/pause flows that respect the recipient\'s already-vested portion',
      ]}
      alternative={{
        href: '/merchant/subscriptions',
        label: 'Subscription plans',
        description: 'For now, charge customers on a fixed schedule (weekly / monthly / quarterly / yearly) — the closest approximation today.',
      }}
      backHref="/"
    />
  );
}
