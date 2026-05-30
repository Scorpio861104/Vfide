'use client';

export const dynamic = 'force-dynamic';

import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function LendingPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <ComingSoonPage
      title="Peer-to-Peer Lending"
      tagline="Loans collateralized by ProofScore + guardian co-signing"
      description={
        'Borrow VFIDE from people in your network at terms you negotiate. Loans are co-signed by ' +
        'your guardian (who has skin in the game if you default), interest is set per-offer, and ' +
        'repayment terms range from 7 days to a year. If you default, your ProofScore takes a major ' +
        'hit (-2000) and guardian funds are slowly extracted to repay the lender.\n\n' +
        'Flash loans are a separate workflow — borrow any amount atomically within a single transaction.'
      }
      requirements={[
        'Lending pool contract deployed to Base (peer-to-peer loan registry with co-signer state machine)',
        'Guardian co-signing flow integrated with the existing guardians system',
        'Default extraction mechanism that respects the non-custodial invariant — guardians opt in to back specific loans, not all loans',
        'Off-chain matching service so borrowers can browse offers without scanning every block',
        'Flash loan ERC-3156 implementation (separate, simpler contract)',
      ]}
      alternative={{
        href: '/pay',
        label: 'Direct Pay',
        description: 'Until lending ships, the closest workflow is direct VFIDE transfers — useful for trusted lender-borrower pairs who handle terms off-platform.',
      }}
      backHref="/"
    />
  );
}
