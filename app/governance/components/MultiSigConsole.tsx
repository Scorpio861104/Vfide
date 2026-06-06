'use client';

/**
 * MultiSigConsole — read-only console for the live AdminMultiSig protocol-governance multisig.
 *
 * Renders REAL on-chain state from useAdminMultiSig: the M-of-N config (required approvals,
 * delays per proposal class, veto window) and the actual recent proposals with their approval /
 * veto progress and status. No mock data — when the contract isn't configured, the parent decides
 * what to show (this component assumes `configured` is true when mounted).
 */

import { ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react';
import {
  useAdminMultiSig,
  type MultiSigProposalStatus,
  type MultiSigProposalType,
} from '@/hooks/useAdminMultiSig';

function shortAddr(a: string): string {
  return a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function formatDelay(sec: number): string {
  if (sec <= 0) return 'none';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  if (d >= 1) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  const m = Math.floor((sec % 3600) / 60);
  if (h >= 1) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${Math.floor(sec / 60)}m`;
}

const STATUS_STYLE: Record<MultiSigProposalStatus, string> = {
  Pending: 'bg-amber-500/20 text-amber-300',
  Approved: 'bg-blue-500/20 text-blue-300',
  Executed: 'bg-emerald-500/20 text-emerald-300',
  Vetoed: 'bg-red-500/20 text-red-300',
  Expired: 'bg-zinc-600/30 text-zinc-400',
};

const TYPE_STYLE: Record<MultiSigProposalType, string> = {
  CONFIG: 'bg-cyan-500/15 text-cyan-300',
  CRITICAL: 'bg-orange-500/15 text-orange-300',
  EMERGENCY: 'bg-red-500/15 text-red-300',
};

function StatusIcon({ status }: { status: MultiSigProposalStatus }) {
  switch (status) {
    case 'Executed':
      return <CheckCircle2 size={14} className="text-emerald-400" aria-hidden="true" />;
    case 'Vetoed':
      return <XCircle size={14} className="text-red-400" aria-hidden="true" />;
    case 'Expired':
      return <AlertTriangle size={14} className="text-zinc-400" aria-hidden="true" />;
    default:
      return <Clock size={14} className="text-amber-400" aria-hidden="true" />;
  }
}

export function MultiSigConsole() {
  const { config, proposalCount, proposals, isLoading } = useAdminMultiSig();

  return (
    <div className="space-y-6">
      {/* Config card */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-emerald-400" />
          Council Guardian Approval configuration
        </h3>
        {isLoading && !config ? (
          <p className="text-sm text-zinc-400">Loading on-chain config…</p>
        ) : config ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <Stat label="Required approvals" value={`${config.requiredApprovals}-of-${config.councilSize}`} />
            <Stat label="Emergency approvals" value={`${config.emergencyApprovals}`} />
            <Stat label="Veto threshold" value={`${config.vetoThreshold}`} />
            <Stat label="Config delay" value={formatDelay(config.configDelaySec)} />
            <Stat label="Critical delay" value={formatDelay(config.criticalDelaySec)} />
            <Stat label="Emergency delay" value={formatDelay(config.emergencyDelaySec)} />
            <Stat label="Veto window" value={formatDelay(config.vetoWindowSec)} />
            <Stat label="Proposal expiry" value={formatDelay(config.proposalExpirySec)} />
            <Stat label="Total proposals" value={`${proposalCount}`} />
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Configuration unavailable.</p>
        )}
      </div>

      {/* Proposals */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 mb-4">
          <FileText size={16} className="text-accent" />
          Recent multi-sig proposals
        </h3>
        {isLoading && proposals.length === 0 ? (
          <p className="text-sm text-zinc-400">Loading proposals…</p>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No proposals yet. CONFIG / CRITICAL / EMERGENCY actions will appear here once submitted.
          </p>
        ) : (
          <ul className="space-y-3">
            {proposals.map((p) => {
              const approvalTarget =
                config?.[p.type === 'EMERGENCY' ? 'emergencyApprovals' : 'requiredApprovals'] ?? 0;
              const approvalPct =
                approvalTarget > 0
                  ? Math.min(100, Math.round((p.approvalCount / approvalTarget) * 100))
                  : 0;
              return (
                <li key={p.id} className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-4" data-testid="multisig-proposal">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-zinc-100 font-semibold">#{p.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${TYPE_STYLE[p.type]}`}>
                          {p.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1 ${STATUS_STYLE[p.status]}`}>
                          <StatusIcon status={p.status} />
                          {p.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 break-words">{p.description || '(no description)'}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Proposer {shortAddr(p.proposer)} · Target {shortAddr(p.target)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${approvalPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {p.approvalCount}/{approvalTarget || '?'} approvals
                      {p.vetoCount > 0 ? ` · ${p.vetoCount} veto${p.vetoCount === 1 ? '' : 's'}` : ''}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs mb-0.5">{label}</p>
      <p className="text-zinc-100 font-semibold">{value}</p>
    </div>
  );
}
