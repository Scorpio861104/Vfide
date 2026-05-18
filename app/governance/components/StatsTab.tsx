'use client';

/**
 * StatsTab — live governance analytics, read directly from the DAO contract.
 *
 * Previous implementation had `hasLiveStats = false` hard-coded and showed a
 * "Live analytics unavailable" placeholder — the entire panel below it was
 * mock data. Phase 4 Turn 4 replaces that with real on-chain reads via useDAO.
 *
 * What's shown:
 *   • Proposal totals (lifetime + active)
 *   • Voter participation (total active voters, min participation requirement)
 *   • Protocol timing parameters (voting period, voting delay, proposal cooldown)
 *   • Quorum / vote threshold parameters
 *   • Caller-specific row when wallet connected (voting power, eligibility)
 *
 * What's NOT shown (deferred — see backlog "indexer-based governance stats"):
 *   • Pass/fail rate over time windows — requires enumerating all past
 *     proposals + decoding each to count executed/defeated. O(N) RPC calls.
 *   • Category breakdown — same enumeration cost.
 *   • Top voters leaderboard — requires aggregating Voted events.
 *
 * These are best served by an off-chain indexer pulling events, then exposed
 * via an API. Doing them client-side wouldn't scale beyond ~100 proposals.
 */

import { useAccount } from 'wagmi';
import { Vote, AlertCircle, Activity, Users, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { Numeric } from '@/components/ui/Numeric';
import { useDAO } from '@/hooks/useDAO';

function formatDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (s === 0) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  const days = Math.round(s / 86400);
  return `${days}d`;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}

function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2 text-zinc-400">
        {icon}
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-semibold text-zinc-100 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

export function StatsTab() {
  const { address } = useAccount();
  const dao = useDAO();

  if (!dao.daoConfigured) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8 text-center">
            <AlertCircle className="mx-auto text-amber-400 mb-3" size={28} />
            <p className="text-zinc-100 font-semibold">DAO is not configured for this environment.</p>
            <p className="text-zinc-400 text-sm mt-1">
              Set NEXT_PUBLIC_DAO_ADDRESS to view live governance analytics.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-1">Governance Analytics</h2>
          <p className="text-zinc-400 text-sm">Live data from the DAO contract.</p>
        </div>

        {/* Activity panel */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            Proposal activity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Vote size={14} />}
              label="Total proposals"
              value={<Numeric value={Number(dao.proposalCount)} format="integer" className="text-zinc-100" size="xl" weight={600} />}
              hint="Lifetime count since contract deployment."
            />
            <StatCard
              icon={<Activity size={14} />}
              label="Active now"
              value={<Numeric value={Number(dao.activeProposalCount)} format="integer" className="text-zinc-100" size="xl" weight={600} />}
              hint="Proposals currently open for voting or queued."
            />
            <StatCard
              icon={<Users size={14} />}
              label="Active voters"
              value={<Numeric value={Number(dao.totalActiveVoters)} format="integer" className="text-zinc-100" size="xl" weight={600} />}
              hint="Wallets that have cast at least one vote."
            />
          </div>
        </div>

        {/* Voting cycle */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-cyan-400" />
            Voting cycle
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Clock size={14} />}
              label="Voting delay"
              value={formatDuration(dao.votingDelay)}
              hint="Time between proposal submission and voting open."
            />
            <StatCard
              icon={<Clock size={14} />}
              label="Voting period"
              value={formatDuration(dao.votingPeriod)}
              hint="How long voters have to cast their vote."
            />
            <StatCard
              icon={<Clock size={14} />}
              label="Proposer cooldown"
              value={formatDuration(dao.proposalCooldown)}
              hint="Minimum gap between proposals from the same wallet."
            />
          </div>
        </div>

        {/* Quorum / thresholds */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-cyan-400" />
            Thresholds &amp; quorum
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Users size={14} />}
              label="Min participation"
              value={
                <Numeric
                  value={Number(dao.effectiveMinParticipation)}
                  format="integer"
                  className="text-zinc-100"
                  size="xl"
                  weight={600}
                />
              }
              hint={
                dao.effectiveMinParticipation !== dao.minParticipation
                  ? `Auto-adjusted from configured ${dao.minParticipation.toString()} based on active voters.`
                  : 'Minimum number of voters required for a proposal to pass.'
              }
            />
            <StatCard
              icon={<ShieldCheck size={14} />}
              label="Min votes required"
              value={<Numeric value={Number(dao.minVotesRequired)} format="integer" className="text-zinc-100" size="xl" weight={600} />}
              hint="Minimum combined vote weight (FOR + AGAINST) for the result to count."
            />
            <StatCard
              icon={<Users size={14} />}
              label="Configured min participation"
              value={<Numeric value={Number(dao.minParticipation)} format="integer" className="text-zinc-100" size="xl" weight={600} />}
              hint="DAO-set base threshold; effective value above may scale with council size."
            />
          </div>
        </div>

        {/* Caller-specific (only when connected) */}
        {address && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Vote size={16} className="text-cyan-400" />
              Your governance status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<Vote size={14} />}
                label="Voting power"
                value={
                  <Numeric value={Number(dao.votingPower)} format="integer" className="text-zinc-100" size="xl" weight={600} />
                }
                hint="ProofScore-derived vote weight."
              />
              <StatCard
                icon={<ShieldCheck size={14} />}
                label="Eligibility"
                value={
                  <span className={dao.isEligible ? 'text-emerald-300' : 'text-amber-300'}>
                    {dao.isEligible ? 'Eligible' : 'Below threshold'}
                  </span>
                }
                hint={dao.isEligible ? 'You can submit and vote on proposals.' : 'ProofScore is below the minimum required.'}
              />
              <StatCard
                icon={<Clock size={14} />}
                label="Proposal cooldown"
                value={
                  dao.cooldownActive ? (
                    <span className="text-amber-300">
                      until{' '}
                      {new Date(Number(dao.cooldownEndsAt) * 1000).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  ) : (
                    <span className="text-emerald-300">Available</span>
                  )
                }
                hint={dao.cooldownActive ? 'You must wait before submitting another proposal.' : 'You can submit a new proposal now.'}
              />
            </div>
          </div>
        )}

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-500">
          <p className="flex items-start gap-2">
            <Loader2 size={11} className="mt-0.5 shrink-0" />
            <span>
              Aggregate analytics (pass/fail rate, category breakdown, top voters) require enumerating
              every past proposal and are best served by an off-chain indexer. Tracked in the backlog
              for a future indexer integration pass.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
