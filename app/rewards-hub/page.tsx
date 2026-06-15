'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { m, AnimatePresence , LazyMotion, domAnimation } from 'framer-motion';
import {
  Target, Award, Star, Crown, Medal, Tag, Search, Info, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { TabTrigger } from '@/components/ui/TabTrigger';
import DailyQuestsPanel from '@/components/gamification/DailyQuestsPanel';
import OnboardingChecklist from '@/components/gamification/OnboardingChecklist';

// Lazy-load tab component subtrees
import nextDynamic from 'next/dynamic';

const AchievementsTabContent = nextDynamic(
  () => import('@/app/achievements/components/AchievementsTab').then(m => ({ default: m.AchievementsTab })),
  { loading: () => <LoadingSpinner />, ssr: false }
);
const BadgeCollectionTab = nextDynamic(
  () => import('@/app/badges/components/CollectionTab').then(m => ({ default: m.CollectionTab })),
  { loading: () => <LoadingSpinner />, ssr: false }
);
const BenefitsOverviewTab = nextDynamic(
  () => import('@/app/benefits/components/OverviewTab').then(m => ({ default: m.OverviewTab })),
  { loading: () => <LoadingSpinner />, ssr: false }
);
const HeadhunterDashboardTab = nextDynamic(
  () => import('@/app/headhunter/components/DashboardTab').then(m => ({ default: m.DashboardTab })),
  { loading: () => <LoadingSpinner />, ssr: false }
);
const LeaderboardContent = nextDynamic(
  () => import('./components/LeaderboardContent'),
  { loading: () => <LoadingSpinner />, ssr: false }
);

const EndorsementsContent = nextDynamic(
  () => import('./components/EndorsementsContent'),
  { loading: () => <LoadingSpinner />, ssr: false }
);

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

type TabId =
  | 'quests'
  | 'achievements'
  | 'badges'
  | 'leaderboard'
  | 'endorsements'
  | 'benefits'
  | 'referrals'
  | 'about';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'quests',       label: 'Quests',        icon: Target  },
  { id: 'achievements', label: 'Achievements',  icon: Award   },
  { id: 'badges',       label: 'Badges',        icon: Star    },
  { id: 'leaderboard',  label: 'Your ProofScore', icon: ShieldCheck },
  { id: 'endorsements', label: 'Endorsements',  icon: Medal   },
  { id: 'benefits',     label: 'Benefits',      icon: Tag     },
  { id: 'referrals',    label: 'Referrals',     icon: Search  },
  { id: 'about',        label: 'About rewards', icon: Info    },
];

function RewardsHubInner() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get('tab') as TabId | null) ?? 'quests';
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find(t => t.id === initial) ? initial : 'quests'
  );

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative text-white">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 pt-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Reputation & Engagement</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Rewards Hub
            </span>
          </h1>
          <p className="text-white/50 text-base">
            Earn recognition through participation — not speculation.
          </p>
        </m.div>

        {/* Tab bar */}
        <div
          className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/5 mb-8 pb-px"
          role="tablist"
          aria-label="Rewards sections"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabTrigger
              key={id}
              active={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'text-white border-b-2 border-accent -mb-px'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={14} />
              {label}
            </TabTrigger>
          ))}
        </div>

        {/* Tab content */}
        <LazyMotion features={domAnimation}>
          <AnimatePresence mode="wait">
            <m.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === 'quests' && <DailyQuestsPanel />}
              {activeTab === 'achievements' && (
                <div className="space-y-6">
                  <AchievementsTabContent />
                </div>
              )}
              {activeTab === 'badges' && (
                <div className="space-y-6">
                  <BadgeCollectionTab />
                </div>
              )}
              {activeTab === 'leaderboard' && <LeaderboardContent />}
              {activeTab === 'endorsements' && <EndorsementsContent />}
              {activeTab === 'benefits' && <BenefitsOverviewTab />}
              {activeTab === 'referrals' && <HeadhunterDashboardTab />}
              {activeTab === 'about' && <AboutRewardsContent />}
            </m.div>
          </AnimatePresence>
        </LazyMotion>
      </div>

      {activeTab === 'quests' && <OnboardingChecklist />}
      {/* Token policy disclosure — always visible per Seer Constitution §3 */}
      <div className="container mx-auto max-w-4xl px-4 mt-10 border-t border-white/5 pt-8">
        <AboutRewardsContent />
      </div>

      <Footer />
    </div>
  );
}

function AboutRewardsContent() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-black mb-4 text-white">No Token Rewards</h2>
      <p className="text-zinc-400 mb-6 leading-relaxed">
        VFIDE is a governance utility token. It is not a yield-bearing asset, a profit-sharing
        instrument, or a speculative vehicle. There are no referral bonuses, merchant incentives,
        lock bonuses, or profit-sharing rewards — by design, to keep VFIDE from being classified
        as a security.
      </p>
      <h3 className="text-lg font-bold mb-3 text-white">What VFIDE is for</h3>
      <ul className="space-y-2 text-zinc-300 mb-8">
        {[
          'Governance voting rights — shape protocol rules, fees, and treasury allocations.',
          'Protocol access — unlock merchant tiers and advanced vault features as your ProofScore grows.',
          'Governance duty points — earned by participating in Seer panels, not by holding.',
        ].map(item => (
          <li key={item} className="flex gap-2">
            <span className="text-accent flex-shrink-0">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <h3 className="text-lg font-bold mb-3 text-white">Why no rewards?</h3>
      <p className="text-zinc-400 leading-relaxed">
        Because rewards create speculation, and speculation hurts the people we are building for.
        The communities we serve — street vendors in Accra, OFWs in Manila, freelancers in
        Medellín — need stable, predictable financial tools. Not another token to chase.
      </p>
    </div>
  );
}

export default function RewardsHubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    }>
      <RewardsHubInner />
    </Suspense>
  );
}
