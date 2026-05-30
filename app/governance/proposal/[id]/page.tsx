'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import { useLocale } from '@/lib/locale/LocaleProvider';
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Scale,
  Sparkles,
  XCircle,
  Vote,
  Copy,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import {
  useDAO,
  type ProposalRecord,
  ProposalStatus,
  proposalStatusLabel,
  proposalTypeLabel,
} from '@/hooks/useDAO';

/**
 * /governance/proposal/[id] — read-only proposal detail page.
 *
 * Tier 2 Phase 6 (2026-05-17). Built on `useDAO.fetchProposal()` +
 * `useDAO.hasVotedOn()`. Pattern mirrors `app/sanctum/charities/[id]/page.tsx`
 * (Phase 2): useParams + validation + 4 states (invalid URL, not configured,
 * loading, ready/missing).
 *
 * Scope decision: this page is **read-only**. Vote / finalize / execute /
 * withdraw actions stay on the main /governance page (where ProposalCard
 * renders them in their natural list context). The detail page exists for
 * shareable URLs, not as a duplicated action surface.
 *
 * The `[id]` URL segment is the numeric proposal ID (matches `getProposalDetails(id)`
 * which takes a `uint256`).
 */
export default function ProposalDetailPage() {
  const { locale } = useLocale();
  void locale;

  const params = useParams();
  const { address: connectedAddress } = useAccount();
  const dao = useDAO();

  const rawId = (params?.id ?? '') as string;

  // ID validation: must parse to a non-negative bigint
  let proposalId: bigint | undefined;
  let parseError: string | undefined;
  try {
    if (rawId === '' || !/^\d+$/.test(rawId)) {
      parseError = 'Proposal ID must be a positive integer.';
    } else {
      proposalId = BigInt(rawId);
    }
  } catch {
    parseError = 'Proposal ID could not be parsed.';
  }

  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (proposalId === undefined || !dao.daoConfigured) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const result = await dao.fetchProposal(proposalId);
        if (cancelled) return;
        setProposal(result);
        if (result && connectedAddress) {
          const voted = await dao.hasVotedOn(proposalId, connectedAddress as Address);
          if (!cancelled) setHasVoted(voted);
        } else {
          setHasVoted(null);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load proposal');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proposalId, dao, connectedAddress]);

  // ── Invalid URL ─────────────────────────────────────────────────────────
  if (parseError) {
    return (
      <DetailFrame>
        <ErrorPanel
          title="Invalid proposal ID"
          body={
            <>
              <code className="text-xs text-zinc-300">{rawId || '(empty)'}</code> is not a valid
              proposal ID. {parseError}
            </>
          }
        />
      </DetailFrame>
    );
  }

  // ── Not configured ──────────────────────────────────────────────────────
  if (!dao.daoConfigured) {
    return (
      <DetailFrame>
        <ErrorPanel
          title="DAO not configured"
          body="The DAO contract address is not configured for the current network. Proposal data is unavailable."
        />
      </DetailFrame>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DetailFrame>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-8">
          <Loader2 className="w-6 h-6 text-zinc-500 mx-auto animate-spin" />
          <p className="text-sm text-zinc-500 mt-3 text-center">Loading proposal…</p>
        </div>
      </DetailFrame>
    );
  }

  // ── Read error ──────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <DetailFrame>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-red-400 font-bold mb-1">Failed to load proposal</h3>
            <p className="text-sm text-zinc-400 break-words">{loadError}</p>
          </div>
        </div>
      </DetailFrame>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────
  if (!proposal) {
    return (
      <DetailFrame>
        <ErrorPanel
          title="Proposal not found"
          body={
            <>
              No proposal exists at ID <code className="text-xs text-zinc-300">{rawId}</code>.
              {' '}It may not have been created yet, or the ID is out of range. Total proposals
              created: <code className="text-xs text-zinc-300">{dao.proposalCount.toString()}</code>.
            </>
          }
        />
      </DetailFrame>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  const totalVotes = proposal.forVotes + proposal.againstVotes;
  const forPct = totalVotes > 0n ? Number((proposal.forVotes * 10000n) / totalVotes) / 100 : 0;
  const againstPct = totalVotes > 0n ? Number((proposal.againstVotes * 10000n) / totalVotes) / 100 : 0;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const votingActive = proposal.status === ProposalStatus.Active && proposal.endTime > now;

  return (
    <DetailFrame>
      {/* Header */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 md:p-8">
        <div className="flex items-start gap-3 flex-wrap mb-3">
          <StatusBadge status={proposal.status} />
          <TypeBadge ptype={proposal.ptype} />
          <span className="text-sm text-zinc-500 ml-auto">Proposal #{proposal.id.toString()}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-3">
          {extractTitle(proposal.description)}
        </h1>
        {proposal.description.length > extractTitle(proposal.description).length && (
          <p className="text-sm text-zinc-400 whitespace-pre-wrap">
            {proposal.description.slice(extractTitle(proposal.description).length).trim()}
          </p>
        )}
      </div>

      {/* Vote tallies */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Vote size={18} className="text-cyan-400" /> Vote tallies
        </h2>
        {totalVotes === 0n ? (
          <p className="text-sm text-zinc-500">No votes cast yet.</p>
        ) : (
          <div className="space-y-3">
            <VoteBar
              label="For"
              count={proposal.forVotes}
              pct={forPct}
              color="bg-emerald-500"
            />
            <VoteBar
              label="Against"
              count={proposal.againstVotes}
              pct={againstPct}
              color="bg-red-500"
            />
            <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-700">
              Total: <span className="text-zinc-300 tabular-nums">{totalVotes.toString()}</span> votes
            </div>
          </div>
        )}
        {connectedAddress && hasVoted !== null && (
          <div className="mt-4 pt-4 border-t border-zinc-700 text-sm">
            {hasVoted ? (
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 size={14} /> You voted on this proposal
              </span>
            ) : votingActive ? (
              <span className="text-zinc-400 inline-flex items-center gap-1">
                <Sparkles size={14} className="text-cyan-400" /> Voting is open — cast your vote
                via{' '}
                <Link href="/governance" className="text-cyan-400 hover:text-cyan-300 underline">
                  /governance
                </Link>
              </span>
            ) : (
              <span className="text-zinc-500">You did not vote on this proposal</span>
            )}
          </div>
        )}
      </div>

      {/* Schedule + targets */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-cyan-400" /> Schedule
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailRow label="Voting starts" value={formatTimestamp(proposal.startTime)} />
          <DetailRow label="Voting ends" value={formatTimestamp(proposal.endTime)} />
          <DetailRow label="Executed" value={proposal.executed ? 'Yes' : 'No'} />
          <DetailRow label="Queued" value={proposal.queued ? 'Yes' : 'No'} />
        </dl>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Scale size={18} className="text-cyan-400" /> Target call
        </h2>
        <dl className="space-y-3 text-sm">
          <AddressRow label="Proposer" address={proposal.proposer} />
          <AddressRow label="Target contract" address={proposal.target} />
          <DetailRow label="Native value" value={`${proposal.value.toString()} wei`} />
        </dl>
      </div>

      {/* Take action footer */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          Action buttons (vote / finalize / execute / withdraw) live on{' '}
          <Link href="/governance" className="underline hover:text-blue-200">
            /governance
          </Link>
          &apos;s main page, where each proposal renders with its full ProposalCard. This detail page is
          read-only for shareable URLs.
        </p>
      </div>
    </DetailFrame>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function DetailFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-16">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <Link
            href="/governance"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={16} /> Back to governance
          </Link>
          {children}
        </div>
      </div>
      <Footer />
    </>
  );
}

function ErrorPanel({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-amber-400 font-bold mb-1">{title}</h3>
        <p className="text-sm text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProposalStatus }) {
  const styles: Record<ProposalStatus, { bg: string; text: string; Icon: typeof Clock }> = {
    [ProposalStatus.Active]: { bg: 'bg-cyan-500/15 border-cyan-500/30', text: 'text-cyan-300', Icon: Sparkles },
    [ProposalStatus.Ended]: { bg: 'bg-zinc-500/15 border-zinc-500/30', text: 'text-zinc-300', Icon: Clock },
    [ProposalStatus.Expired]: { bg: 'bg-zinc-500/15 border-zinc-500/30', text: 'text-zinc-300', Icon: Clock },
    [ProposalStatus.Succeeded]: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-300', Icon: CheckCircle2 },
    [ProposalStatus.Defeated]: { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-300', Icon: XCircle },
    [ProposalStatus.Queued]: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-300', Icon: Clock },
    [ProposalStatus.Executed]: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-300', Icon: CheckCircle2 },
  };
  const s = styles[status] ?? styles[ProposalStatus.Ended];
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1 ${s.bg} ${s.text}`}>
      <s.Icon size={11} /> {proposalStatusLabel(status)}
    </span>
  );
}

function TypeBadge({ ptype }: { ptype: number }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-zinc-300">
      {proposalTypeLabel(ptype)}
    </span>
  );
}

function VoteBar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: bigint;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-300 font-semibold">{label}</span>
        <span className="text-zinc-400 tabular-nums">
          {count.toString()} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-zinc-200 mt-0.5">{value}</dd>
    </div>
  );
}

function AddressRow({ label, address }: { label: string; address: Address }) {
  const copy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(address).catch(() => {});
    }
  };
  const isZero = address === '0x0000000000000000000000000000000000000000';
  return (
    <div>
      <dt className="text-xs text-zinc-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-2 flex-wrap">
        <code className="bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 break-all">
          {address}
        </code>
        {!isZero && (
          <>
            <button
              onClick={copy}
              title="Copy address"
              className="p-1 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
            >
              <Copy size={12} className="text-zinc-400" />
            </button>
            <Link
              href={`/explorer/${address}`}
              className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
            >
              View <ExternalLink size={10} />
            </Link>
          </>
        )}
      </dd>
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function extractTitle(description: string): string {
  // First non-empty line up to ~120 chars
  const firstLine = description.split('\n')[0]?.trim() ?? '';
  if (firstLine.length <= 120) return firstLine || '(no title)';
  return firstLine.slice(0, 117) + '…';
}

function formatTimestamp(unixSec: bigint): string {
  if (unixSec === 0n) return '—';
  const ms = Number(unixSec) * 1000;
  try {
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
