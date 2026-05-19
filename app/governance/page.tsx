'use client';

export const dynamic = 'force-dynamic';

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

import { AnimatePresence, motion } from 'framer-motion';
import {
  Vote, PlusCircle, Users, BarChart2, Clock,
  Crown, ScrollText, Gavel, Landmark, LayoutDashboard,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { Footer } from '@/components/layout/Footer';

// Existing governance tabs
import { CouncilTab }   from './components/CouncilTab';
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

// ── Tab groups ────────────────────────────────────────────────────────────────

type MainTab = 'proposals' | 'dao' | 'council' | 'elections' | 'disputes';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ElementType }[] = [
  { id: 'proposals', label: 'Proposals', icon: Vote           },
  { id: 'dao',       label: 'DAO Hub',   icon: LayoutDashboard },
  { id: 'council',   label: 'Council',   icon: Crown          },
  { id: 'elections', label: 'Elections', icon: ScrollText     },
  { id: 'disputes',  label: 'Disputes',  icon: Gavel          },
];

type ProposalSub = 'list' | 'create' | 'stats' | 'history';
type DaoSub      = 'overview' | 'members' | 'treasury';
type CouncilSub  = 'overview' | 'members' | 'salary' | 'voting';

export default function GovernancePage() {
  const { isConnected } = useAccount();
  const [mainTab,      setMainTab]      = useState<MainTab>('proposals');
  const [proposalSub,  setProposalSub]  = useState<ProposalSub>('list');
  const [daoSub,       setDaoSub]       = useState<DaoSub>('overview');
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
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
              <p className="text-white/50 text-lg">Proposals, council, elections, treasury, and disputes — in one place.</p>
            </div>
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
        </motion.div>

        {/* Primary tab bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-6"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {MAIN_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                className={mainTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── PROPOSALS ── */}
          {mainTab === 'proposals' && (
            <motion.div key="proposals"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              {/* Sub-tabs */}
              <div className="flex gap-2 mb-6">
                {([
                  { id: 'list',    label: 'All Proposals', icon: Vote       },
                  { id: 'create',  label: 'Create',        icon: PlusCircle },
                  { id: 'stats',   label: 'Stats',         icon: BarChart2  },
                  { id: 'history', label: 'History',       icon: Clock      },
                ] as { id: ProposalSub; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setProposalSub(id)}
                    className={proposalSub === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={proposalSub}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}>
                  {proposalSub === 'list'    && <ProposalsTab onCreateProposal={() => setProposalSub('create')} />}
                  {proposalSub === 'create'  && <CreateTab />}
                  {proposalSub === 'stats'   && <StatsTab />}
                  {proposalSub === 'history' && <HistoryTab />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── DAO HUB ── */}
          {mainTab === 'dao' && (
            <motion.div key="dao"
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
                <motion.div key={daoSub}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}>
                  {daoSub === 'overview' && <DaoOverviewTab />}
                  {daoSub === 'members'  && <DaoMembersTab  />}
                  {daoSub === 'treasury' && <DaoTreasuryTab />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── COUNCIL ── */}
          {mainTab === 'council' && (
            <motion.div key="council"
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
                <motion.div key={councilSub}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}>
                  {councilSub === 'overview' && <CouncilOverviewTab />}
                  {councilSub === 'members'  && <CouncilMembersTab  />}
                  {councilSub === 'salary'   && <CouncilSalaryTab   isConnected={isConnected} />}
                  {councilSub === 'voting'   && <CouncilVotingTab   isConnected={isConnected} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── ELECTIONS ── */}
          {mainTab === 'elections' && (
            <motion.div key="elections"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <ElectionsTabContent />
            </motion.div>
          )}

          {/* ── DISPUTES ── */}
          {mainTab === 'disputes' && (
            <motion.div key="disputes"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <DisputesTabContent />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
