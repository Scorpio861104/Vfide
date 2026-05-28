'use client';

export const dynamic = 'force-dynamic';

// TYPE-2: Explicit React type import for React.ElementType usage in MAIN_TABS definition
import type React from 'react';

/**
 * Governance — consolidated DAO surface (R90 T1-2).
 *
 * Previously split across:
 *   /governance  → Proposals, Create, Council, Stats, History
 *   /dao-hub     → Overview, Proposals, Treasury, Members  (overlapping!)
 *   /council     → Council overview, Members, Salary, Voting
 *   /elections   → Candidate list, election info
 *   /disputes    → Merchant disputes
 *   /treasury    → Protocol treasury
 *
 * Now unified under one URL with clear tab groups:
 *   Proposals | DAO Hub | Council | Elections | Treasury | Disputes
 *
 * The old routes redirect here.
 */

import { AnimatePresence, m } from 'framer-motion';
import {
  Vote, PlusCircle, Users, BarChart2, Clock,
  Crown, ScrollText, Gavel, Landmark, LayoutDashboard,
  AlertTriangle, Flag } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useState, Suspense} from 'react';
import { useSearchParams } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
// UX-3: Import SampleDataBanner to label hardcoded governance stats as illustrative
import { SampleDataBanner } from '@/components/ui/SampleDataBanner';

// Existing governance tabs
// CODE-1: CouncilTab is dead code — the consolidated council section uses CouncilOverviewTab etc.
// import { CouncilTab }   from './components/CouncilTab';
import { CreateTab }    from './components/CreateTab';
import { HistoryTab }   from './components/HistoryTab';
import { ProposalsTab } from './components/ProposalsTab';
import { StatsTab }     from './components/StatsTab';

// DAO Hub tabs (from /dao-hub)
import { OverviewTab as DaoOverviewTab }   from '@/app/dao-hub/components/OverviewTab';
import { MembersTab  as DaoMembersTab }    from '@/app/dao-hub/components/MembersTab';
import { TreasuryTab as DaoTreasuryTab }   from '@/app/dao-hub/components/TreasuryTab';

// Council detail tabs (from /council)
import { OverviewTab  as CouncilOverviewTab } from '@/app/council/components/OverviewTab';
import { MembersTab   as CouncilMembersTab  } from '@/app/council/components/MembersTab';
import { SalaryTab    as CouncilSalaryTab   } from '@/app/council/components/SalaryTab';
import { VotingTab    as CouncilVotingTab   } from '@/app/council/components/VotingTab';

// Elections content — extracted tab component
import { ElectionsTabContent } from './components/ElectionsTabContent';

// Disputes content — extracted tab component
import { DisputesTabContent } from './components/DisputesTabContent';
import AppealsTabContent from './components/AppealsTabContent';
import FraudTabContent from './components/FraudTabContent';

import { useLocale } from '@/hooks/useLocale';
import { GOVERNANCE_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

// ── Tab groups ────────────────────────────────────────────────────────────────

type MainTab = 'proposals' | 'dao' | 'council' | 'elections' | 'disputes' | 'appeals' | 'fraud';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ElementType }[] = [
  { id: 'proposals', label: 'Proposals', icon: Vote           },
  { id: 'dao',       label: 'DAO Hub',   icon: LayoutDashboard },
  { id: 'council',   label: 'Council',   icon: Crown          },
  { id: 'elections', label: 'Elections', icon: ScrollText     },
  { id: 'disputes',  label: 'Disputes',  icon: Gavel          },
  { id: 'appeals',   label: 'Appeals',   icon: AlertTriangle  },
  { id: 'fraud',     label: 'Fraud',     icon: Flag           },
];

type ProposalSub = 'list' | 'create' | 'stats' | 'history';
type DaoSub      = 'overview' | 'members' | 'treasury';
type CouncilSub  = 'overview' | 'members' | 'salary' | 'voting';

// UX-1: Valid tab IDs for type-safe URL parsing
const VALID_MAIN_TABS = new Set<MainTab>(['proposals', 'dao', 'council', 'elections', 'disputes', 'appeals', 'fraud']);
const VALID_DAO_SUBS  = new Set<DaoSub>(['overview', 'members', 'treasury']);

function GovernancePageInner() {
  const { isConnected } = useAccount();
  const [locale] = useLocale();
  const _govCopy = pickLocaleCopy(GOVERNANCE_TRANSLATIONS, locale);
  // UX-1: Read initial tab from URL search params so ?tab= links work correctly
  // and browser Back/Forward preserves the active tab context
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as MainTab | null;
  const daoParam = searchParams.get('dao') as DaoSub | null;

  const [mainTab,      setMainTab]      = useState<MainTab>(
    tabParam && VALID_MAIN_TABS.has(tabParam) ? tabParam : 'proposals'
  );
  const [proposalSub,  setProposalSub]  = useState<ProposalSub>('list');
  const [daoSub,       setDaoSub]       = useState<DaoSub>(
    daoParam && VALID_DAO_SUBS.has(daoParam) ? daoParam : 'overview'
  );
  const [councilSub,   setCouncilSub]   = useState<CouncilSub>('overview');

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />DAO Governance</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Governance
                </span>
              </h1>
              {/* R90-2: "treasury" is a sub-tab of DAO Hub, not a top-level tab — use "DAO Hub" */}
              <p className="text-white/50 text-lg">Proposals, council, elections, DAO Hub, and disputes &mdash; in one place.</p>
            </div>
            {/* UX-3: Hardcoded stats labeled as sample data until live governance API is wired */}
            <div className="flex flex-col items-end gap-2">
              <SampleDataBanner label="Stats shown are illustrative until live governance data is available." />
              <div className="flex items-center gap-2">
                <div className="analytics-card text-center px-5 py-3">
                  <div className="text-xl font-bold text-violet-400">247</div>
                  <div className="text-xs text-white/40">Proposals</div>
                </div>
                <div className="analytics-card text-center px-5 py-3">
                  <div className="text-xl font-bold text-cyan-400">18</div>
                  <div className="text-xs text-white/40">Active</div>
                </div>
                <div className="analytics-card text-center px-5 py-3">
                  <div className="text-xl font-bold text-emerald-400">89%</div>
                  <div className="text-xs text-white/40">Pass Rate</div>
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Primary tab bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-6"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          {/* A11Y-1: role=tablist so AT announces this as a tab widget */}
          <div role="tablist" aria-label="Governance sections" className="flex gap-2 overflow-x-auto scrollbar-hide">
            {MAIN_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                role="tab"
                aria-selected={mainTab === id}
                aria-controls={`gov-panel-${id}`}
                id={`gov-tab-${id}`}
                className={mainTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── PROPOSALS ── */}
          {mainTab === 'proposals' && (
            <m.div key="proposals"
              role="tabpanel" id="gov-panel-proposals" aria-labelledby="gov-tab-proposals"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              {/* Sub-tabs */}
              {/* A11Y-1: Proposals sub-tabs */}
              <div role="tablist" aria-label="Proposals sub-sections" className="flex gap-2 mb-6">
                {([
                  { id: 'list',    label: 'All Proposals', icon: Vote       },
                  { id: 'create',  label: 'Create',        icon: PlusCircle },
                  { id: 'stats',   label: 'Stats',         icon: BarChart2  },
                  { id: 'history', label: 'History',       icon: Clock      },
                ] as { id: ProposalSub; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setProposalSub(id)}
                    role="tab"
                    aria-selected={proposalSub === id}
                    aria-controls={`proposals-panel-${id}`}
                    className={proposalSub === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <m.div key={proposalSub}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}>
                  {proposalSub === 'list'    && <ProposalsTab onCreateProposal={() => setProposalSub('create')} />}
                  {proposalSub === 'create'  && <CreateTab />}
                  {proposalSub === 'stats'   && <StatsTab />}
                  {proposalSub === 'history' && <HistoryTab />}
                </m.div>
              </AnimatePresence>
            </m.div>
          )}

          {/* ── DAO HUB ── */}
          {mainTab === 'dao' && (
            <m.div key="dao"
              role="tabpanel" id="gov-panel-dao" aria-labelledby="gov-tab-dao"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <div className="flex gap-2 mb-6">
                {([
                  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
                  { id: 'members',   label: 'Members',   icon: Users           },
                  { id: 'treasury',  label: 'Treasury',  icon: Landmark        },
                ] as { id: DaoSub; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setDaoSub(id)}
                    className={daoSub === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <m.div key={daoSub}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}>
                  {daoSub === 'overview' && <DaoOverviewTab />}
                  {daoSub === 'members'  && <DaoMembersTab  />}
                  {daoSub === 'treasury' && <DaoTreasuryTab />}
                </m.div>
              </AnimatePresence>
            </m.div>
          )}

          {/* ── COUNCIL ── */}
          {mainTab === 'council' && (
            <m.div key="council"
              role="tabpanel" id="gov-panel-council" aria-labelledby="gov-tab-council"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <div className="flex gap-2 mb-6">
                {([
                  { id: 'overview', label: 'Overview', icon: Crown   },
                  { id: 'members',  label: 'Members',  icon: Users   },
                  { id: 'salary',   label: 'Salary',   icon: Landmark },
                  { id: 'voting',   label: 'Voting',   icon: Vote    },
                ] as { id: CouncilSub; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setCouncilSub(id)}
                    className={councilSub === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <m.div key={councilSub}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}>
                  {councilSub === 'overview' && <CouncilOverviewTab />}
                  {councilSub === 'members'  && <CouncilMembersTab  />}
                  {councilSub === 'salary'   && <CouncilSalaryTab   isConnected={isConnected} />}
                  {councilSub === 'voting'   && <CouncilVotingTab   isConnected={isConnected} />}
                </m.div>
              </AnimatePresence>
            </m.div>
          )}

          {/* ── ELECTIONS ── */}
          {mainTab === 'elections' && (
            <m.div key="elections"
              role="tabpanel" id="gov-panel-elections" aria-labelledby="gov-tab-elections"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <ElectionsTabContent />
            </m.div>
          )}

          {/* ── DISPUTES ── */}
          {mainTab === 'disputes' && (
            <m.div key="disputes"
              role="tabpanel" id="gov-panel-disputes" aria-labelledby="gov-tab-disputes"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <DisputesTabContent />
            </m.div>
          )}

          {/* ── APPEALS ── */}
          {mainTab === 'appeals' && (
            <m.div key="appeals"
              role="tabpanel" id="gov-panel-appeals" aria-labelledby="gov-tab-appeals"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <AppealsTabContent />
            </m.div>
          )}

          {/* ── FRAUD ── */}
          {mainTab === 'fraud' && (
            <m.div key="fraud"
              role="tabpanel" id="gov-panel-fraud" aria-labelledby="gov-tab-fraud"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <FraudTabContent />
            </m.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}

export default function GovernancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <GovernancePageInner />
    </Suspense>
  );
}
