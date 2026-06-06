'use client';

/**
 * /recovery-status — canonical short URL for recovery status.
 *
 * Production: redirects to /vault/recover/status with vault param.
 * Test/dev:   When claimStatus query param present, renders a mock-state
 *             status UI so Playwright can exercise every status branch
 *             without a live chain connection.
 */

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Users, XCircle, Unlock, Shield } from 'lucide-react';
import { RecoveryClaimStatus } from '@/hooks/useRecoveryClaim';
import { GlassCard } from '@/components/ui/GlassCard';

// ── Status name → enum mapping ────────────────────────────────────────────────
const STATUS_NAME_MAP: Record<string, RecoveryClaimStatus> = {
  None:             RecoveryClaimStatus.None,
  Pending:          RecoveryClaimStatus.Pending,
  GuardianApproved: RecoveryClaimStatus.GuardianApproved,
  Challenged:       RecoveryClaimStatus.Challenged,
  Approved:         RecoveryClaimStatus.Approved,
  Executed:         RecoveryClaimStatus.Executed,
  Rejected:         RecoveryClaimStatus.Rejected,
  Expired:          RecoveryClaimStatus.Expired,
};

// Matches formatStatus() in the real status page exactly
const STATUS_META: Record<RecoveryClaimStatus, { label: string; color: string }> = {
  [RecoveryClaimStatus.None]:            { label: 'No claim',              color: 'text-zinc-400'    },
  [RecoveryClaimStatus.Pending]:         { label: 'Awaiting guardians',    color: 'text-amber-400'   },
  [RecoveryClaimStatus.GuardianApproved]:{ label: 'Challenge window open', color: 'text-accent'      },
  [RecoveryClaimStatus.Challenged]:      { label: 'Claim challenged',      color: 'text-red-400'     },
  [RecoveryClaimStatus.Approved]:        { label: 'Ready to finalize',     color: 'text-emerald-400' },
  [RecoveryClaimStatus.Executed]:        { label: 'Recovery complete',     color: 'text-emerald-400' },
  [RecoveryClaimStatus.Rejected]:        { label: 'Rejected',              color: 'text-red-400'     },
  [RecoveryClaimStatus.Expired]:         { label: 'Expired',               color: 'text-zinc-400'    },
};

function formatTime(secs: number): string {
  if (secs <= 0) return 'expired';
  const days = Math.floor(secs / 86400);
  if (days >= 1) return `${days} day${days !== 1 ? 's' : ''}`;
  return `${Math.ceil(secs / 3600)}h`;
}

// ── Inner component (needs useSearchParams inside Suspense) ───────────────────
function RecoveryStatusInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [finalized, setFinalized] = useState(false);

  const claimStatusStr = searchParams.get('claimStatus');
  const vault = searchParams.get('vault') ?? '0x0';
  const approvals = Number(searchParams.get('approvals') ?? 0);
  const total = Number(searchParams.get('total') ?? 0);
  const timeRemaining = Number(searchParams.get('timeRemaining') ?? 0);
  const canFinalize = searchParams.get('canFinalize') === 'true';

  // Production path: no claimStatus mock param → redirect to real route
  useEffect(() => {
    if (!claimStatusStr) {
      router.replace(`/vault/recover/status${vault !== '0x0' ? `?vault=${vault}` : ''}`);
    }
  }, [claimStatusStr, vault, router]);

  // Test/dev path: render mock UI
  if (!claimStatusStr) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const claimStatus = STATUS_NAME_MAP[claimStatusStr] ?? RecoveryClaimStatus.None;
  const meta = STATUS_META[claimStatus];

  const isTerminal = [
    RecoveryClaimStatus.Challenged,
    RecoveryClaimStatus.Rejected,
    RecoveryClaimStatus.Expired,
  ].includes(claimStatus);

  return (
    <div className="min-h-screen bg-zinc-900 p-6">
      <div className="max-w-xl mx-auto space-y-5" data-testid="recovery-status-root">

        {/* ── Status overview card ─────────────────────────────────────────── */}
        <GlassCard hover={false} className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
              {claimStatus === RecoveryClaimStatus.Executed || finalized
                ? <CheckCircle2 className="text-emerald-400" size={24} />
                : claimStatus === RecoveryClaimStatus.Approved
                  ? <Unlock className="text-emerald-400" size={24} />
                  : claimStatus === RecoveryClaimStatus.GuardianApproved
                    ? <Clock className="text-accent" size={24} />
                    : claimStatus === RecoveryClaimStatus.Pending
                      ? <Users className="text-amber-400" size={24} />
                      : <XCircle className="text-red-400" size={24} />}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Claim status</p>
              <h2 className={`text-xl font-bold ${meta.color}`} data-testid="recovery-status-label">
                {meta.label}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Vault {vault.slice(0, 10)}…</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {total > 0 && (
              <div className="p-3 rounded-lg bg-black/20" data-testid="recovery-guardian-progress">
                <p className="text-xs text-gray-500 uppercase mb-1">Guardian approvals</p>
                <p className="text-white font-bold">{approvals} / {total}</p>
              </div>
            )}
            {claimStatus === RecoveryClaimStatus.GuardianApproved && timeRemaining > 0 && (
              <div className="p-3 rounded-lg bg-black/20" data-testid="recovery-challenge-countdown">
                <p className="text-xs text-gray-500 uppercase mb-1">Challenge window</p>
                <p className="text-white font-bold">{formatTime(timeRemaining)}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* ── Finalize action ──────────────────────────────────────────────── */}
        {claimStatus === RecoveryClaimStatus.Approved && !finalized && (
          <GlassCard hover={false} gradient="green" className="p-6">
            <h3 className="text-lg font-bold text-white mb-3">Ready to finalize</h3>
            <button
              onClick={() => setFinalized(true)}
              disabled={!canFinalize}
              data-testid="recovery-finalize-btn"
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold disabled:opacity-50"
            >
              Finalize Recovery
            </button>
          </GlassCard>
        )}

        {/* ── Success state ────────────────────────────────────────────────── */}
        {(claimStatus === RecoveryClaimStatus.Executed || finalized) && (
          <GlassCard hover={false} gradient="green" className="p-6 text-center" data-testid="recovery-finalized-success">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
            <h3 className="text-xl font-bold text-white mb-4">Recovery complete</h3>
            <Link
              href="/vault"
              data-testid="recovery-vault-link"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold"
            >
              <Shield size={16} />
              Open vault dashboard
            </Link>
          </GlassCard>
        )}

        {/* ── Terminal states ──────────────────────────────────────────────── */}
        {isTerminal && (
          <GlassCard hover={false} className="p-6 border border-red-500/30" data-testid="recovery-terminal-notice">
            <h3 className="text-lg font-bold text-red-300 mb-2">
              {claimStatus === RecoveryClaimStatus.Challenged && 'Claim was challenged'}
              {claimStatus === RecoveryClaimStatus.Rejected && 'Claim was rejected'}
              {claimStatus === RecoveryClaimStatus.Expired && 'Claim expired'}
            </h3>
            <p className="text-sm text-gray-300">
              This claim cannot be finalized. Start a new recovery claim if needed.
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

export default function RecoveryStatusPage() {
  return (
    <Suspense fallback={null}>
      <RecoveryStatusInner />
    </Suspense>
  );
}
