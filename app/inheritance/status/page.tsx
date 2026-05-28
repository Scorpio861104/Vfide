'use client';

/**
 * Inheritance status page.
 *
 * The owner's home base for the inheritance system. Shows what's
 * configured, what's pending, and what to do next. Plus the proof-of-life
 * wallet management and active-claim status if any.
 *
 * Five panels, top-to-bottom:
 *   1. State banner — current state code + remaining time in window
 *   2. Pending proposal — only visible during a 30-day cooldown
 *   3. Confirmed heirs — guardian addresses, commitments hidden
 *   4. Proof-of-life wallet — set / clear
 *   5. Active claim — only during VETO_PERIOD / CLAIM_WINDOW
 *
 * Reads everything via useInheritance. Writes go through the same hook
 * with their normal tx-pending-and-receipt flow.
 */

import { useEffect, useState } from 'react';
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Eye,
  Loader2,
  Lock,
} from 'lucide-react';
import { isAddress, type Address } from 'viem';
import {
  useInheritance,
  INHERITANCE_STATE_LABEL,
  type InheritanceStateCode,
} from '@/hooks/useInheritance';

function formatRemaining(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'ready';
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function InheritanceStatusPage() {
  const inh = useInheritance();
  // Tick every minute so countdowns render correctly without rAF.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (inh.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 md:pt-[3.5rem] pb-12">
      <Heading />

      <StateBanner state={inh.state} windowEnd={Number(inh.windowEnd)} nowSec={nowSec} />

      {inh.pendingConfig && (
        <PendingProposalPanel
          effectiveAt={Number(inh.pendingConfig.effectiveAt)}
          pendingHeirCount={inh.pendingConfig.pendingHeirCount}
          pendingVersion={Number(inh.pendingConfig.pendingVersion)}
          nowSec={nowSec}
          onConfirm={inh.confirmConfig}
          onCancel={inh.cancelConfigChange}
          isWritePending={inh.isWritePending}
        />
      )}

      <ConfirmedHeirsPanel
        heirs={inh.heirs}
        configVersion={Number(inh.configVersion)}
        onClearAll={inh.clearAllHeirs}
        isWritePending={inh.isWritePending}
        canEdit={inh.state === 0 && !inh.pendingConfig}
      />

      <ProofOfLifePanel
        polWallet={inh.proofOfLifeWallet}
        onSet={inh.setProofOfLife}
        isWritePending={inh.isWritePending}
      />

      {inh.claim && (
        <ActiveClaimPanel
          state={inh.state}
          initiator={inh.claim.initiator}
          reasonHash={inh.claim.reasonHash}
          vetoCount={Number(inh.claim.vetoCount)}
          vetoThreshold={Number(inh.claim.vetoThreshold)}
          windowEnd={Number(inh.windowEnd)}
          nowSec={nowSec}
          onOverride={inh.ownerOverride}
          onCleanup={inh.cleanupMemorial}
          isWritePending={inh.isWritePending}
        />
      )}
    </div>
  );
}

// ─── Heading ───────────────────────────────────────────────────────────────

function Heading() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Inheritance</h1>
      <p className="mt-1 text-sm text-gray-400">
        Manage your heir configuration, proof-of-life wallet, and respond to
        active claims. Shares stay hidden on-chain until inheritance is
        claimed.
      </p>
    </div>
  );
}

// ─── State banner ───────────────────────────────────────────────────────────

function StateBanner({
  state,
  windowEnd,
  nowSec,
}: {
  state: InheritanceStateCode;
  windowEnd: number;
  nowSec: number;
}) {
  const remaining = Math.max(0, windowEnd - nowSec);
  const tone =
    state === 0
      ? 'border-white/10 bg-white/5 text-gray-300'
      : state === 1 || state === 2
        ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
        : state === 3
          ? 'border-accent/30 bg-accent/5 text-accent'
          : 'border-gray-500/30 bg-gray-500/5 text-gray-400';
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-center gap-3">
        {state === 0 && <Shield size={20} />}
        {(state === 1 || state === 2) && <AlertTriangle size={20} />}
        {state === 3 && <Clock size={20} />}
        {state === 4 && <Lock size={20} />}
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider opacity-70">State</div>
          <div className="text-base font-semibold">
            {INHERITANCE_STATE_LABEL[state]}
          </div>
        </div>
        {state !== 0 && state !== 4 && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider opacity-70">Window ends in</div>
            <div className="font-mono text-base font-semibold">
              {formatRemaining(remaining)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pending proposal panel ─────────────────────────────────────────────────

function PendingProposalPanel({
  effectiveAt,
  pendingHeirCount,
  pendingVersion,
  nowSec,
  onConfirm,
  onCancel,
  isWritePending,
}: {
  effectiveAt: number;
  pendingHeirCount: number;
  pendingVersion: number;
  nowSec: number;
  onConfirm: () => Promise<unknown>;
  onCancel: () => Promise<unknown>;
  isWritePending: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, effectiveAt - nowSec);
  const canConfirm = remaining <= 0;

  async function safe(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed.');
    }
  }

  return (
    <section className="rounded-xl border border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center gap-2 text-accent">
        <Clock size={16} />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Pending proposal — version {pendingVersion}
        </h2>
      </div>
      <p className="mt-2 text-sm text-gray-300">
        You proposed a new inheritance configuration with {pendingHeirCount}{' '}
        heir{pendingHeirCount === 1 ? '' : 's'}.{' '}
        {canConfirm ? (
          <strong className="text-emerald-300">
            The 30-day cooldown has elapsed. You can confirm now.
          </strong>
        ) : (
          <>
            The 30-day cooldown is{' '}
            <span className="font-mono text-accent">{formatRemaining(remaining)}</span>{' '}
            from completion.
          </>
        )}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => safe(onConfirm)}
          disabled={!canConfirm || isWritePending}
          className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {isWritePending ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Submitting…
            </span>
          ) : (
            'Confirm proposal'
          )}
        </button>
        <button
          type="button"
          onClick={() => safe(onCancel)}
          disabled={isWritePending}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50"
        >
          Cancel proposal
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </section>
  );
}

// ─── Confirmed heirs panel ──────────────────────────────────────────────────

function ConfirmedHeirsPanel({
  heirs,
  configVersion,
  onClearAll,
  isWritePending,
  canEdit,
}: {
  heirs: { guardian: Address; commitment: string }[];
  configVersion: number;
  onClearAll: () => Promise<unknown>;
  isWritePending: boolean;
  canEdit: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function handleClear() {
    setError(null);
    try {
      await onClearAll();
      setConfirmClear(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed.');
    }
  }

  if (heirs.length === 0) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Users size={16} />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            No heirs configured
          </h2>
        </div>
        <p className="mt-2 text-sm text-gray-400">
          You haven&apos;t set up inheritance yet. Without configured heirs,
          the vault will not be inheritable.
        </p>
        <a
          href="/inheritance/setup"
          className="mt-3 inline-block rounded-lg bg-cyan-500/20 px-3 py-2 text-sm text-accent hover:bg-accent/30"
        >
          Set up inheritance
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-200">
          <Users size={16} />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Heirs — version {configVersion}
          </h2>
        </div>
        <span className="text-xs text-gray-500">{heirs.length} of 5</span>
      </div>

      <div className="mt-3 space-y-2">
        {heirs.map((heir, i) => (
          <div
            key={`${heir.guardian}-${i}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 p-3"
          >
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-gray-500">
                Heir {i + 1}
              </div>
              <div className="truncate font-mono text-xs text-gray-300">
                {heir.guardian}
              </div>
              <div className="truncate font-mono text-[10px] text-gray-500">
                commit: {heir.commitment.slice(0, 12)}…{heir.commitment.slice(-8)}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] text-accent">
                <Eye size={10} /> share hidden
              </div>
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-4 border-t border-white/5 pt-3 text-xs">
          {confirmClear ? (
            <div className="space-y-2">
              <p className="text-amber-200">
                Clear all heirs? This starts a 30-day cooldown before taking
                effect.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isWritePending}
                  className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                >
                  {isWritePending ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" /> Submitting…
                    </span>
                  ) : (
                    'Yes, clear all'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="text-gray-500 hover:text-red-400"
            >
              Clear all heirs (starts 30-day cooldown)
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </section>
  );
}

// ─── Proof of life panel ────────────────────────────────────────────────────

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function ProofOfLifePanel({
  polWallet,
  onSet,
  isWritePending,
}: {
  polWallet: Address;
  onSet: (addr: Address) => Promise<unknown>;
  isWritePending: boolean;
}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasWallet = polWallet !== ZERO_ADDRESS;

  async function handleSet(addr: string) {
    setError(null);
    if (!isAddress(addr)) {
      setError('Not a valid address.');
      return;
    }
    try {
      await onSet(addr as Address);
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed.');
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-gray-200">
        <Lock size={16} />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Proof-of-life wallet
        </h2>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        An optional second wallet that can cancel an inheritance claim
        without spending power. Useful if your primary key is the one
        you&apos;d lose. Store this wallet&apos;s key somewhere you can reach
        even when your phone is gone.
      </p>

      {hasWallet ? (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-200">
          <CheckCircle2 size={12} className="mr-1 inline" />
          {polWallet}
        </div>
      ) : (
        <div className="mt-3 text-xs text-gray-500">No POL wallet set.</div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="0x…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs text-white"
        />
        <button
          type="button"
          onClick={() => handleSet(input)}
          disabled={isWritePending || !input}
          className="rounded-lg bg-cyan-500/20 px-3 py-2 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {hasWallet ? 'Replace' : 'Set'}
        </button>
        {hasWallet && (
          <button
            type="button"
            onClick={() => handleSet(ZERO_ADDRESS)}
            disabled={isWritePending}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </section>
  );
}

// ─── Active claim panel ─────────────────────────────────────────────────────

function ActiveClaimPanel({
  state,
  initiator,
  reasonHash,
  vetoCount,
  vetoThreshold,
  windowEnd,
  nowSec,
  onOverride,
  onCleanup,
  isWritePending,
}: {
  state: InheritanceStateCode;
  initiator: Address;
  reasonHash: string;
  vetoCount: number;
  vetoThreshold: number;
  windowEnd: number;
  nowSec: number;
  onOverride: () => Promise<unknown>;
  onCleanup: () => Promise<unknown>;
  isWritePending: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, windowEnd - nowSec);
  const showOverride = state === 1; // VETO_PERIOD
  const showCleanup = state === 3 && remaining <= 0; // MEMORIAL ended

  async function safe(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed.');
    }
  }

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-amber-300">
        <AlertTriangle size={16} />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Active inheritance claim
        </h2>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-black/20 p-2">
          <dt className="text-gray-500">Initiated by</dt>
          <dd className="mt-0.5 truncate font-mono text-gray-200">{initiator}</dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2">
          <dt className="text-gray-500">Veto count</dt>
          <dd className="mt-0.5 font-mono text-gray-200">
            {vetoCount} / {vetoThreshold}
          </dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2 sm:col-span-2">
          <dt className="text-gray-500">Reason hash</dt>
          <dd className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
            {reasonHash}
          </dd>
        </div>
      </dl>

      {showOverride && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-200">
            You can prove you&apos;re alive by clicking below from your active
            wallet or your proof-of-life wallet. This cancels the claim and
            returns the vault to normal.
          </p>
          <button
            type="button"
            onClick={() => safe(onOverride)}
            disabled={isWritePending}
            className="mt-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {isWritePending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Submitting…
              </span>
            ) : (
              "I'm alive — cancel claim"
            )}
          </button>
        </div>
      )}

      {showCleanup && (
        <div className="mt-4 rounded-lg border border-gray-500/30 bg-gray-500/5 p-3">
          <p className="text-xs text-gray-300">
            Memorial period has ended. Anyone can finalize closure of the
            vault.
          </p>
          <button
            type="button"
            onClick={() => safe(onCleanup)}
            disabled={isWritePending}
            className="mt-2 rounded-lg bg-gray-500/20 px-3 py-2 text-sm text-gray-300 hover:bg-gray-500/30 disabled:opacity-50"
          >
            Close vault
          </button>
        </div>
      )}

      {state === 2 && (
        <p className="mt-3 text-xs text-amber-200">
          Inheritance is in the claim window. Heirs reveal their secrets from
          the heir claim page. Anyone can call finalize once heirs have
          revealed or the window expires.
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </section>
  );
}
