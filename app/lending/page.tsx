'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Search, Tag, Wallet } from 'lucide-react';
import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { isFeatureEnabled } from '@/lib/features';
import { BrowseTab } from './components/BrowseTab';
import { OfferTab } from './components/OfferTab';
import { MyLoansTab } from './components/MyLoansTab';

type TabId = 'browse' | 'offer' | 'myloans';

const TABS: { id: TabId; label: string; icon: typeof Search }[] = [
  { id: 'browse', label: 'Browse Offers', icon: Search },
  { id: 'offer', label: 'Post Offer', icon: Tag },
  { id: 'myloans', label: 'My Loans', icon: Wallet },
];

/**
 * Peer-to-Peer Lending.
 *
 * SWITCH: gated behind NEXT_PUBLIC_ENABLE_LENDING. When the lending-pool contract is
 * deployed + the off-chain matching service is live, set that env var to 'true' and this
 * page serves the full Browse / Offer / My Loans experience. Until then it renders the
 * coming-soon page (no behavioural change for current production).
 *
 * The three tab components (BrowseTab/OfferTab/MyLoansTab) are fully built and self-contained
 * (each does its own contract reads against VFIDETermLoan); flipping the flag mounts them.
 */
export default function LendingPage() {
  const { locale } = useLocale();
  void locale;
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('browse');

  if (!isFeatureEnabled('lending')) {
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

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-4xl font-bold">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Peer-to-Peer Lending
            </span>
          </h1>
        </div>
        <p className="text-white/60 mb-8">
          Loans co-signed by your guardian, with ProofScore-based limits and per-offer terms.
        </p>

        <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Lending sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={
                  selected
                    ? 'tab-pill-active flex items-center gap-2'
                    : 'tab-pill-inactive flex items-center gap-2'
                }
              >
                <Icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {!isConnected && (
          <p className="text-sm text-white/40 mb-4">
            Connect your wallet to post offers or manage your loans.
          </p>
        )}

        {activeTab === 'browse' && <BrowseTab />}
        {activeTab === 'offer' && <OfferTab />}
        {activeTab === 'myloans' && <MyLoansTab />}
      </div>
    </div>
  );
}
