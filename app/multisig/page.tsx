'use client';

export const dynamic = 'force-dynamic';

import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';

export default function MultisigPage() {
  return (
    <ComingSoonPage
      title="Multi-Signature Wallet"
      tagline="A shared wallet that requires multiple approvals before any payment goes out"
      description={
        'A multi-signature wallet (sometimes called a "multi-sig" or "Safe") is a shared wallet that requires several people to approve a transaction before it can run. ' +
        'For example, a 2-of-3 multi-sig has three keyholders, and any two of them must sign before money moves. ' +
        'Useful for treasuries, shared business accounts, DAOs, and high-value personal wallets that want defense against any single key being lost or compromised. ' +
        'This page is reserved for that feature — it is designed and named in the navigation, but the per-user multi-sig vault is not yet shipped in this release.'
      }
      requirements={[
        'Multi-sig factory contract (Safe-compatible) deployed to Base',
        'Per-user multi-sig registry so the app can list which shared wallets a user belongs to',
        'Proposal → confirmation → execution flow integrated with the existing payment pipeline',
        'Recovery path that respects the M-of-N threshold (overlaps with Guardians)',
      ]}
      alternative={{
        href: '/guardians',
        label: 'Use Guardians instead — available today',
        description:
          'VFIDE\'s native protection against a lost or stolen wallet key is the Guardian system on your CardBoundVault. Guardians are people you choose who can collectively authorize you to rotate to a new key if your old one is compromised. It covers the same threat (single-key loss) with a different mechanism. Note: VFIDE\'s governance contract (AdminMultiSig) is a separate, protocol-level multi-sig for council actions and is unrelated to this user-facing feature.',
      }}
      backHref="/"
    />
  );
}
