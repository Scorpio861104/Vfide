'use client';

export const dynamic = 'force-dynamic';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Heart,
  Calendar,
  Copy,
} from 'lucide-react';
import { formatEther, type Address } from 'viem';
import { Footer } from '@/components/layout/Footer';
import { useSanctumVault, deriveDisbursementStatus } from '@/hooks/useSanctumVault';

/**
 * /sanctum/charities/[id] — detail view for a single DAO-approved charity.
 *
 * Tier 2 Phase 2 (2026-05-17). Built on `useSanctumVault.useCharityByAddress`
 * + filtering `useSanctumVault.disbursements` by recipient.
 *
 * The `[id]` URL segment is the charity's Ethereum address (matches what
 * `charityList(i)` returns; addresses are the natural primary key in
 * SanctumVault since they identify both the recipient wallet and the
 * registry entry).
 */
export default function CharityDetailPage() {
  const params = useParams();
  const rawId = (params?.id ?? '') as string;
  const isValidAddress =
    rawId.startsWith('0x') && rawId.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(rawId);

  const charityAddress = isValidAddress ? (rawId as Address) : undefined;

  const {
    configured,
    approvalsRequired,
    useCharityByAddress,
    disbursements,
    disbursementsLoading,
  } = useSanctumVault();

  const { data: charityRaw, isLoading: charityLoading, isError } = useCharityByAddress(charityAddress);

  // ── Guard: invalid URL ──────────────────────────────────────────────────
  if (!isValidAddress) {
    return (
      <DetailFrame>
        <ErrorPanel
          title="Invalid charity address"
          body={
            <>
              The address <code className="text-xs text-zinc-300">{rawId || '(empty)'}</code> is not
              a valid Ethereum address. The charity ID must be a 42-character{' '}
              <code className="text-xs text-zinc-300">0x…</code> address.
            </>
          }
        />
      </DetailFrame>
    );
  }

  // ── Guard: SanctumVault not configured for this network ─────────────────
  if (!configured) {
    return (
      <DetailFrame>
        <ErrorPanel
          title="SanctumVault not configured"
          body={
            <>
              The SanctumVault contract address is not configured for the current network. Charity
              data is unavailable.
            </>
          }
        />
      </DetailFrame>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (charityLoading) {
    return (
      <DetailFrame>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-8 animate-pulse">
          <div className="h-8 w-64 bg-zinc-700 rounded mb-4" />
          <div className="h-5 w-40 bg-zinc-700/70 rounded mb-8" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-zinc-700/50 rounded" />
            <div className="h-24 bg-zinc-700/50 rounded" />
            <div className="h-24 bg-zinc-700/50 rounded" />
          </div>
        </div>
      </DetailFrame>
    );
  }

  // ── Read failed ─────────────────────────────────────────────────────────
  if (isError || !charityRaw) {
    return (
      <DetailFrame>
        <ErrorPanel
          title="Charity not found"
          body={
            <>
              No charity is registered at this address, or the read from the contract failed. Try
              returning to the{' '}
              <Link href="/sanctum?tab=charities" className="text-cyan-400 hover:text-cyan-300">
                charity list
              </Link>
              .
            </>
          }
        />
      </DetailFrame>
    );
  }

  // Decode: getCharityInfo returns (bool active, string name, string category, uint64 addedAt)
  const tuple = charityRaw as readonly [boolean, string, string, bigint];
  const charity = {
    address: charityAddress!,
    active: tuple[0],
    name: tuple[1],
    category: tuple[2],
    addedAt: tuple[3],
  };

  // If the charity has been removed and was never populated, the tuple decodes
  // as all-zeros / empty strings. Detect that and present an empty state.
  if (!charity.name && !charity.category) {
    return (
      <DetailFrame>
        <ErrorPanel
          title="Charity not registered"
          body={
            <>
              No charity is currently registered at{' '}
              <code className="text-xs text-zinc-300">{charity.address}</code>. It may have been
              removed via DAO governance, or it was never approved.
            </>
          }
        />
      </DetailFrame>
    );
  }

  // ── Filter disbursements to this charity ────────────────────────────────
  const charityKey = charity.address.toLowerCase();
  const charityDisbursements = disbursements.filter(
    (d) => d.charity.toLowerCase() === charityKey,
  );
  const totalReceived = charityDisbursements
    .filter((d) => d.executed)
    .reduce((sum, d) => sum + d.amount, 0n);
  const pendingCount = charityDisbursements.filter((d) => !d.executed && !d.rejected).length;
  const executedCount = charityDisbursements.filter((d) => d.executed).length;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <DetailFrame>
      {/* Header card */}
      <div className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-xl p-6 md:p-8">
        <div className="flex items-start gap-4">
          <Heart className="w-10 h-10 md:w-12 md:h-12 text-pink-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">{charity.name}</h1>
              {charity.active && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  charity.active
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-zinc-700/40 text-zinc-500'
                }`}
              >
                {charity.active ? 'active' : 'inactive'}
              </span>
            </div>
            <p className="text-zinc-400 mt-1">{charity.category}</p>
            <AddressRow address={charity.address} />
            <div className="flex items-center gap-2 text-sm text-zinc-500 mt-2">
              <Calendar size={14} />
              <span>Added {formatTimestamp(charity.addedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile
          label="Total received"
          value={formatVFIDECompact(totalReceived)}
          sub={`${formatEther(totalReceived)} VFIDE`}
        />
        <StatTile label="Executed disbursements" value={String(executedCount)} sub="all-time" />
        <StatTile
          label="Pending"
          value={String(pendingCount)}
          sub={pendingCount > 0 ? `${approvalsRequired} approvals needed each` : 'none open'}
        />
      </div>

      {/* Disbursement history */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-zinc-100 mb-4">Disbursement history</h2>
        {disbursementsLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 bg-zinc-700/40 rounded animate-pulse" />
            ))}
          </div>
        ) : charityDisbursements.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No disbursements have been proposed for this charity yet.
          </p>
        ) : (
          <div className="space-y-2">
            {charityDisbursements
              .slice()
              .sort((a, b) => Number(b.proposedAt) - Number(a.proposedAt))
              .map((d) => {
                const status = deriveDisbursementStatus(d, approvalsRequired);
                return (
                  <div
                    key={d.id.toString()}
                    className="flex items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-200 truncate">
                        {d.description || `Disbursement #${d.id.toString()}`}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Proposed {formatTimestamp(d.proposedAt)} · {d.approvalCount}/
                        {approvalsRequired} approvals
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-bold text-pink-400">
                        {formatVFIDECompact(d.amount)}
                      </div>
                      <DisbursementBadge status={status} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Governance footer */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          Changes to this charity (additional info, removal, new disbursements) flow through DAO
          governance proposals. Visit{' '}
          <Link href="/governance" className="underline hover:text-blue-300">
            /governance
          </Link>{' '}
          to participate.
        </p>
      </div>
    </DetailFrame>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function DetailFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-16">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <Link
            href="/sanctum?tab=charities"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={16} /> Back to charities
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

function AddressRow({ address }: { address: Address }) {
  const copy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(address).catch(() => {});
    }
  };
  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
      <code className="bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 break-all">
        {address}
      </code>
      <button
        onClick={copy}
        title="Copy address"
        className="p-1 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
      >
        <Copy size={12} />
      </button>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
      <div className="text-xs text-zinc-400 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-zinc-100 mt-1">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{sub}</div>
    </div>
  );
}

function DisbursementBadge({ status }: { status: ReturnType<typeof deriveDisbursementStatus> }) {
  const styles: Record<string, string> = {
    executed: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    'approved-pending-execution': 'bg-amber-500/20 text-amber-400',
    pending: 'bg-zinc-700/40 text-zinc-400',
  };
  const labels: Record<string, string> = {
    executed: 'executed',
    rejected: 'rejected',
    'approved-pending-execution': 'awaiting execution',
    pending: 'pending approvals',
  };
  return (
    <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────

function formatVFIDECompact(wei: bigint): string {
  if (wei === 0n) return '0';
  const tokens = Number(wei) / 1e18;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  if (tokens >= 1) return tokens.toFixed(2);
  return tokens.toFixed(4);
}

function formatTimestamp(unixSec: bigint): string {
  if (unixSec === 0n) return '—';
  const ms = Number(unixSec) * 1000;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
