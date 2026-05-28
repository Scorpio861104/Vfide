'use client';

/**
 * Heir claim page.
 *
 * Flow:
 *   1. User arrives via direct link with ?vault=0x... or pastes the vault
 *      address. They received this address in their inheritance envelope.
 *   2. Connect wallet — must match their guardian address from setup.
 *   3. Page detects state:
 *      - Vault not in CLAIM_WINDOW: show why (state + window end).
 *      - Connected wallet not an heir: show "you're not an heir of this vault."
 *      - Already revealed: show reveal status + wait for finalize.
 *      - Distribution finalized + payout > 0: show withdraw button.
 *      - Reveal phase + not revealed: show the reveal form (secret + share).
 *   4. Local validation: before submitting, recompute the commitment hash
 *      with the entered secret + share + heir address + vault + chainId +
 *      claim's config version, and compare to the on-chain commitment.
 *      If mismatch, surface the error inline rather than reverting on-chain.
 *
 * Honest constraints surfaced in the UI:
 *   - "Your share is hidden on-chain until you reveal here. We cannot tell
 *     you what your share is — that's in your envelope."
 *   - "Don't share this secret with anyone else."
 *   - "If you connect with the wrong wallet, the reveal will fail. The
 *     secret only works from your designated guardian address."
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import {
  Key,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Wallet,
  Clock,
  Lock,
  Download,
} from 'lucide-react';
import {
  isAddress,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  formatUnits,
  type Address,
  type Hex,
} from 'viem';
import { useInheritanceClaim } from '@/hooks/useInheritanceClaim';
import {
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

export default function HeirClaimPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ClaimInner />
    </Suspense>
  );
}

function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="animate-spin text-gray-400" size={28} />
    </div>
  );
}

function ClaimInner() {
  const searchParams = useSearchParams();
  const initialVault = searchParams.get('vault') ?? '';
  const [vaultInput, setVaultInput] = useState(initialVault);
  const [committedVault, setCommittedVault] = useState<Address | undefined>(
    isAddress(initialVault) ? (initialVault as Address) : undefined,
  );

  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const claim = useInheritanceClaim(committedVault, connectedAddress as Address | undefined);

  // Tick once per minute so countdowns update without an rAF loop.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  function submitVault() {
    const trimmed = vaultInput.trim();
    if (isAddress(trimmed)) {
      setCommittedVault(trimmed as Address);
    }
  }

  // ─── Step 1: ask for vault address if not provided ───────────────
  if (!committedVault) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading
          title="Claim an inheritance"
          subtitle="Enter the address of the vault you're claiming from. It's printed at the top of your envelope."
        />
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <label className="block text-xs uppercase tracking-wider text-gray-500">
            Vault address
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={vaultInput}
              onChange={(e) => setVaultInput(e.target.value)}
              placeholder="0x…"
              className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-sm text-white"
              onKeyDown={(e) => e.key === 'Enter' && submitVault()}
            />
            <button
              type="button"
              onClick={submitVault}
              disabled={!isAddress(vaultInput.trim())}
              className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300 hover:bg-accent/30 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ─── Step 2: not connected — prompt ──────────────────────────────
  if (!connectedAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading
          title="Claim an inheritance"
          subtitle="Connect your guardian wallet to continue."
        />
        <section className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <Wallet size={28} className="mx-auto text-gray-400" />
          <p className="mt-3 text-sm text-gray-300">
            Use the wallet listed in your inheritance envelope as your guardian
            address. The secret only works from that address.
          </p>
        </section>
        <VaultBanner vault={committedVault} onChange={() => setCommittedVault(undefined)} />
      </div>
    );
  }

  // ─── Step 3: loading or invalid vault ────────────────────────────
  if (claim.isLoading) {
    return <LoadingPage />;
  }

  if (!claim.isValidVault) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading title="Claim an inheritance" subtitle="" />
        <section className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center">
          <AlertTriangle className="mx-auto text-red-400" size={28} />
          <p className="mt-3 text-sm text-gray-300">
            We couldn&apos;t reach an inheritance manager for the address you
            entered. Double-check the vault address on your envelope.
          </p>
          <button
            type="button"
            onClick={() => setCommittedVault(undefined)}
            className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300"
          >
            Enter a different vault
          </button>
        </section>
      </div>
    );
  }

  // ─── Step 4: connected wallet isn't an heir of this vault ────────
  if (!claim.amHeir) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading title="Claim an inheritance" subtitle="" />
        <VaultBanner vault={committedVault} onChange={() => setCommittedVault(undefined)} />
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
          <AlertTriangle className="mx-auto text-amber-400" size={28} />
          <h3 className="mt-3 text-base font-semibold text-white">
            Not listed as an heir
          </h3>
          <p className="mt-2 text-sm text-gray-300">
            The connected wallet ({short(connectedAddress)}) isn&apos;t in this
            vault&apos;s heir list. Make sure you connected the wallet shown
            on your envelope.
          </p>
        </section>
      </div>
    );
  }

  // From here on, the connected wallet IS an heir of the target vault.
  return (
    <ClaimWorkflow
      vault={committedVault}
      heirAddress={connectedAddress as Address}
      chainId={BigInt(chainId)}
      claim={claim}
      nowSec={nowSec}
      onChangeVault={() => setCommittedVault(undefined)}
    />
  );
}

// ─── ClaimWorkflow — the heir is recognized; show the right step ───────────

function ClaimWorkflow({
  vault,
  heirAddress,
  chainId,
  claim,
  nowSec,
  onChangeVault,
}: {
  vault: Address;
  heirAddress: Address;
  chainId: bigint;
  claim: ReturnType<typeof useInheritanceClaim>;
  nowSec: number;
  onChangeVault: () => void;
}) {
  const remaining = Math.max(0, Number(claim.windowEnd) - nowSec);

  // Branch on state.
  const showRevealForm =
    claim.state === 2 && !claim.haveRevealed && !claim.distributionFinalized;
  const showWithdraw = claim.myStatus.readyToWithdraw;
  const showWaiting =
    claim.state === 2 && claim.haveRevealed && !claim.distributionFinalized;
  const showFinalizeButton =
    claim.state === 2 && (remaining <= 0 || claim.totalRevealedBasisPoints > 0n) && !claim.distributionFinalized;
  const showWrongState =
    claim.state !== 2 && claim.state !== 3 && claim.state !== 4 && !claim.distributionFinalized;
  const showMemorialState = claim.state === 3 && !claim.myStatus.readyToWithdraw;

  return (
    <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
      <Heading title="Claim an inheritance" subtitle="" />
      <VaultBanner vault={vault} onChange={onChangeVault} />
      <StateBanner state={claim.state} windowEnd={Number(claim.windowEnd)} nowSec={nowSec} />

      {showWrongState && (
        <NoticeCard tone="amber" icon={<Clock size={20} />} title="Not ready to claim">
          The vault is currently in <strong>{INHERITANCE_STATE_LABEL[claim.state]}</strong>.
          Inheritance claims can only be revealed during the 90-day Claim Window — which
          begins after the 30-day Veto Period closes with no veto and no owner override.
          Check back later.
        </NoticeCard>
      )}

      {showRevealForm && (
        <RevealForm
          vault={vault}
          heirAddress={heirAddress}
          chainId={chainId}
          configVersion={claim.claim?.claimConfigVersion ?? 0n}
          knownCommitment={claim.myCommitment}
          onSubmit={claim.claimShare}
          isWritePending={claim.isWritePending}
        />
      )}

      {showWaiting && (
        <NoticeCard tone="cyan" icon={<CheckCircle2 size={20} />} title="Your reveal is recorded">
          You revealed {(Number(claim.myStatus.revealedBps) / 100).toFixed(2)}% as your
          share. Wait for distribution finalization. Anyone can call finalize after
          all heirs reveal OR after the 90-day window expires.
          {showFinalizeButton && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => claim.finalizeDistribution()}
                disabled={claim.isWritePending}
                className="rounded-lg bg-cyan-500/20 px-3 py-2 text-sm text-cyan-300 hover:bg-accent/30 disabled:opacity-50"
              >
                {claim.isWritePending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> Submitting…
                  </span>
                ) : (
                  'Finalize distribution'
                )}
              </button>
            </div>
          )}
        </NoticeCard>
      )}

      {showWithdraw && (
        <WithdrawCard
          revealedBps={claim.myStatus.revealedBps}
          finalBps={claim.myStatus.finalBps}
          payoutAmount={claim.myStatus.payoutAmount}
          onWithdraw={claim.withdrawPayout}
          isWritePending={claim.isWritePending}
        />
      )}

      {showMemorialState && (
        <NoticeCard tone="gray" icon={<Lock size={20} />} title="Memorial state">
          The vault is in memorial state. {claim.haveRevealed
            ? 'Your share has been processed.'
            : 'No reveal was recorded for your address during the claim window.'}
        </NoticeCard>
      )}

      {claim.state === 4 && (
        <NoticeCard tone="gray" icon={<Lock size={20} />} title="Closed">
          This vault has been closed. No further claims are possible.
        </NoticeCard>
      )}
    </div>
  );
}

// ─── RevealForm — enter secret + share, validate locally ────────────────────

function RevealForm({
  vault,
  heirAddress,
  chainId,
  configVersion,
  knownCommitment,
  onSubmit,
  isWritePending,
}: {
  vault: Address;
  heirAddress: Address;
  chainId: bigint;
  configVersion: bigint;
  knownCommitment: Hex;
  onSubmit: (secret: Hex, basisPoints: bigint) => Promise<Hex>;
  isWritePending: boolean;
}) {
  const [secretInput, setSecretInput] = useState('');
  const [shareInput, setShareInput] = useState(''); // percentage as decimal string
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Hex | null>(null);

  // Parse share input → basis points (rounded). Reject anything outside (0, 100].
  const parsedBps = useMemo<bigint | null>(() => {
    const pct = parseFloat(shareInput);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null;
    return BigInt(Math.round(pct * 100));
  }, [shareInput]);

  // Parse secret — must be a 32-byte hex string with 0x prefix.
  const parsedSecret = useMemo<Hex | null>(() => {
    const s = secretInput.trim();
    if (!s) return null;
    if (!s.startsWith('0x')) return null;
    if (s.length !== 66) return null;
    if (!/^0x[0-9a-fA-F]{64}$/.test(s)) return null;
    return s as Hex;
  }, [secretInput]);

  // Compute local commitment + compare to on-chain. Helps catch typos before
  // burning gas. The contract will also verify, but the user feedback is
  // immediate this way.
  const localCommitment = useMemo<Hex | null>(() => {
    if (!parsedSecret || parsedBps === null) return null;
    const domain = keccak256(toBytes('VFIDE_INHERITANCE_V1'));
    const encoded = encodeAbiParameters(
      parseAbiParameters('bytes32, uint256, address, uint64, address, uint256, bytes32'),
      [domain, chainId, vault, configVersion, heirAddress, parsedBps, parsedSecret],
    );
    return keccak256(encoded);
  }, [parsedSecret, parsedBps, chainId, vault, configVersion, heirAddress]);

  const commitmentMatches =
    localCommitment !== null && localCommitment.toLowerCase() === knownCommitment.toLowerCase();
  const canSubmit = parsedSecret !== null && parsedBps !== null && commitmentMatches && !isWritePending;

  async function handleSubmit() {
    if (!canSubmit || !parsedSecret || parsedBps === null) return;
    setError(null);
    try {
      const tx = await onSubmit(parsedSecret, parsedBps);
      setSubmitted(tx);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reveal failed.');
    }
  }

  if (submitted) {
    return (
      <NoticeCard tone="emerald" icon={<CheckCircle2 size={20} />} title="Reveal submitted">
        Your reveal is on-chain. Wait for distribution to be finalized — either
        when all heirs reveal or when the 90-day window expires.
        <p className="mt-2 break-all font-mono text-[10px] text-gray-400">
          tx: {submitted}
        </p>
      </NoticeCard>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-cyan-300">
        <Key size={18} />
        <h2 className="text-base font-semibold">Reveal your share</h2>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        Enter the secret and share from your envelope. We compute the
        commitment locally first and compare to the on-chain record — typos
        will be caught here, before any transaction.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500">
            Heir secret (from envelope)
          </label>
          <input
            type="text"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs text-white"
          />
          {secretInput && parsedSecret === null && (
            <div className="mt-1 text-[10px] text-red-300">
              Must be a 32-byte hex string starting with 0x.
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500">
            Share (% from envelope)
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              value={shareInput}
              onChange={(e) => setShareInput(e.target.value)}
              placeholder="e.g. 25.00"
              className="w-32 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-right text-sm text-white"
            />
            <span className="text-sm text-gray-400">%</span>
            {parsedBps !== null && (
              <span className="text-[10px] text-gray-500">
                ({parsedBps.toString()} basis points)
              </span>
            )}
          </div>
        </div>

        {/* Local validation feedback. */}
        {parsedSecret && parsedBps !== null && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              commitmentMatches
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                : 'border-red-500/30 bg-red-500/5 text-red-300'
            }`}
          >
            {commitmentMatches ? (
              <>✓ Local commitment matches the on-chain record.</>
            ) : (
              <>
                ✗ The secret and share you entered do not match the commitment
                stored on-chain for your address. Double-check your envelope.
              </>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-white font-bold disabled:opacity-50"
        >
          {isWritePending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Submitting…
            </span>
          ) : (
            'Reveal share'
          )}
        </button>
      </div>
    </section>
  );
}

// ─── WithdrawCard — distribution finalized, time to withdraw ────────────────

function WithdrawCard({
  revealedBps,
  finalBps,
  payoutAmount,
  onWithdraw,
  isWritePending,
}: {
  revealedBps: bigint;
  finalBps: bigint;
  payoutAmount: bigint;
  onWithdraw: () => Promise<Hex>;
  isWritePending: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<Hex | null>(null);

  async function handleWithdraw() {
    setError(null);
    try {
      const hash = await onWithdraw();
      setTx(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdraw failed.');
    }
  }

  if (tx) {
    return (
      <NoticeCard tone="emerald" icon={<CheckCircle2 size={20} />} title="Inheritance claimed">
        Your share has been transferred to your heir vault. If you don&apos;t
        have one yet, a fresh vault was just created with your wallet as
        admin.
        <p className="mt-2 break-all font-mono text-[10px] text-gray-400">
          tx: {tx}
        </p>
      </NoticeCard>
    );
  }

  return (
    <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
      <div className="flex items-center gap-2 text-emerald-300">
        <Download size={18} />
        <h2 className="text-base font-semibold">Ready to withdraw</h2>
      </div>
      <p className="mt-2 text-sm text-gray-300">
        Distribution has been finalized. Your share is ready to transfer to
        your heir vault.
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-white/5 bg-black/20 p-2">
          <dt className="text-gray-500">Your revealed share</dt>
          <dd className="mt-0.5 font-mono text-sm text-white">
            {(Number(revealedBps) / 100).toFixed(2)}%
          </dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2">
          <dt className="text-gray-500">After redistribution</dt>
          <dd className="mt-0.5 font-mono text-sm text-white">
            {(Number(finalBps) / 100).toFixed(2)}%
          </dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2">
          <dt className="text-gray-500">Payout amount</dt>
          <dd className="mt-0.5 font-mono text-sm text-white">
            {formatUnits(payoutAmount, 18)} VFIDE
          </dd>
        </div>
      </dl>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleWithdraw}
        disabled={isWritePending}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-white font-bold disabled:opacity-50"
      >
        {isWritePending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Withdrawing…
          </span>
        ) : (
          `Withdraw ${formatUnits(payoutAmount, 18)} VFIDE`
        )}
      </button>

      <p className="mt-3 text-[10px] text-gray-500">
        Note: if you don&apos;t have a vault yet, one will be created for you
        as part of this transaction. Gas paid by you.
      </p>
    </section>
  );
}

// ─── Reusable bits ──────────────────────────────────────────────────────────

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
    </div>
  );
}

function VaultBanner({
  vault,
  onChange,
}: {
  vault: Address;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">
          Vault
        </div>
        <div className="truncate font-mono text-xs text-gray-200">{vault}</div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="text-xs text-gray-500 hover:text-gray-300"
      >
        Change
      </button>
    </div>
  );
}

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
      : state === 1
        ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
        : state === 2
          ? 'border-accent/30 bg-accent/5 text-accent'
          : state === 3
            ? 'border-gray-500/30 bg-gray-500/5 text-gray-300'
            : 'border-gray-700/30 bg-gray-700/5 text-gray-500';
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${tone}`}>
      {state === 0 && <Shield size={18} />}
      {state === 1 && <AlertTriangle size={18} />}
      {state === 2 && <Key size={18} />}
      {state === 3 && <Clock size={18} />}
      {state === 4 && <Lock size={18} />}
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider opacity-70">
          Vault state
        </div>
        <div className="text-sm font-semibold">{INHERITANCE_STATE_LABEL[state]}</div>
      </div>
      {state !== 0 && state !== 4 && (
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider opacity-70">
            Window ends in
          </div>
          <div className="font-mono text-sm font-semibold">
            {formatRemaining(remaining)}
          </div>
        </div>
      )}
    </div>
  );
}

function NoticeCard({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'amber' | 'cyan' | 'emerald' | 'gray';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const toneClass = {
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-200',
    cyan: 'border-accent/30 bg-accent/5 text-accent',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200',
    gray: 'border-gray-500/30 bg-gray-500/5 text-gray-300',
  }[tone];
  return (
    <section className={`rounded-xl border p-5 ${toneClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
