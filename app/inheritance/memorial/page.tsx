'use client';

/**
 * Memorial page.
 *
 * Public, read-only view of a settled inheritance. No connect-wallet
 * required. The intent is that survivors — and future curious onlookers —
 * can verify everything settled correctly without needing to be a guardian
 * or heir themselves.
 *
 * What it shows:
 *   - The vault address.
 *   - Current inheritance state (MEMORIAL or CLOSED).
 *   - Days remaining in memorial state, or "Closed since …" if closed.
 *   - List of heirs who claimed, each with their final share %.
 *   - Total payout amount (cumulative across heirs).
 *   - Reason hash from the original claim initiation.
 *
 * What it does NOT show:
 *   - Heir secrets — those never go on-chain.
 *   - Heir shares before reveal — by design, hidden until claim.
 *   - Any PII or non-on-chain data.
 *
 * Reads-only. No writes. If the page is loaded for a vault that's still in
 * NORMAL or VETO or CLAIM state, we say so politely — the memorial page is
 * not the right place for a still-active claim.
 */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useReadContract,
  useReadContracts,
} from 'wagmi';
import {
  Clock,
  Lock,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Users,
} from 'lucide-react';
import { isAddress, formatUnits, type Abi, type Address, type Hex } from 'viem';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';
import CardBoundVaultInheritanceManagerABI from '@/lib/abis/CardBoundVaultInheritanceManager.json';
import { INHERITANCE_STATE_LABEL } from '@/hooks/useInheritance';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;

export default function MemorialPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <MemorialInner />
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

function MemorialInner() {
  const searchParams = useSearchParams();
  const initialVault = searchParams.get('vault') ?? '';
  const [vaultInput, setVaultInput] = useState(initialVault);
  const [committedVault, setCommittedVault] = useState<Address | undefined>(
    isAddress(initialVault) ? (initialVault as Address) : undefined,
  );

  function submitVault() {
    const trimmed = vaultInput.trim();
    if (isAddress(trimmed)) setCommittedVault(trimmed as Address);
  }

  // Step 1: ask for vault if not provided
  if (!committedVault) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading />
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
              className="rounded-lg bg-accent/20 px-4 py-2 text-sm text-accent hover:bg-accent/30 disabled:opacity-50"
            >
              View memorial
            </button>
          </div>
        </section>
      </div>
    );
  }

  return <MemorialContent vault={committedVault} onChange={() => setCommittedVault(undefined)} />;
}

function MemorialContent({
  vault,
  onChange,
}: {
  vault: Address;
  onChange: () => void;
}) {
  // 1. Get manager address.
  const { data: managerAddressRaw, isLoading: isLoadingMgr } = useReadContract({
    address: vault,
    abi: CardBoundVaultABI,
    functionName: 'inheritanceManager',
    query: { enabled: !!vault },
  });
  const managerAddress = managerAddressRaw as Address | undefined;
  const isValidVault = !!managerAddress && managerAddress !== ZERO_ADDR;

  // 2. Bulk-read the public state we need for the memorial.
  const { data: coreReads, isLoading: isLoadingCore } = useReadContracts({
    contracts: managerAddress
      ? [
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceState' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceInitiator' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceReasonHash' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'payoutBalance' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'totalPaidOut' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'distributionFinalized' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'getRevealersOfActiveClaim' },
        ]
      : [],
    query: { enabled: !!managerAddress, refetchInterval: 120_000 },
  });

  const stateTuple = (coreReads?.[0]?.result as readonly [number, bigint] | undefined) ?? [0, 0n];
  const state = stateTuple[0];
  const windowEnd = stateTuple[1];
  const initiator = (coreReads?.[1]?.result as Address | undefined) ?? ZERO_ADDR;
  const reasonHash = (coreReads?.[2]?.result as Hex | undefined) ?? ('0x' as Hex);
  const payoutBalance = (coreReads?.[3]?.result as bigint | undefined) ?? 0n;
  const totalPaidOut = (coreReads?.[4]?.result as bigint | undefined) ?? 0n;
  const distributionFinalized = (coreReads?.[5]?.result as boolean | undefined) ?? false;
  const revealers = (coreReads?.[6]?.result as readonly Address[] | undefined) ?? [];

  if (isLoadingMgr || isLoadingCore) return <LoadingPage />;

  if (!isValidVault) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading />
        <section className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center">
          <AlertTriangle className="mx-auto text-red-400" size={28} />
          <p className="mt-3 text-sm text-gray-300">
            No inheritance manager found for that address.
          </p>
          <button
            type="button"
            onClick={onChange}
            className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300"
          >
            Enter a different vault
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 md:pt-[3.5rem] pb-12">
      <Heading />
      <VaultBanner vault={vault} onChange={onChange} />

      <MemorialState state={state} windowEnd={Number(windowEnd)} />

      {state !== 3 && state !== 4 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-200">
            <AlertTriangle size={16} />
            <h2 className="text-sm font-semibold">Not yet a memorial</h2>
          </div>
          <p className="mt-2 text-sm text-gray-300">
            This vault is in <strong>{INHERITANCE_STATE_LABEL[state as 0|1|2|3|4]}</strong>.
            The memorial page is the public record once an inheritance has fully
            settled. Come back when the vault enters its memorial state.
          </p>
        </section>
      )}

      {(state === 3 || state === 4) && (
        <>
          <SummaryCard
            initiator={initiator}
            reasonHash={reasonHash}
            payoutBalance={payoutBalance}
            totalPaidOut={totalPaidOut}
            distributionFinalized={distributionFinalized}
            revealersCount={revealers.length}
          />
          <HeirsTable
            managerAddress={managerAddress!}
            revealers={revealers}
            totalPaidOut={totalPaidOut}
          />
          {state === 4 && (
            <NoticeCard tone="gray" icon={<Lock size={20} />} title="Vault closed">
              The memorial period has ended and the vault is permanently
              closed. The event history above is the final on-chain record.
            </NoticeCard>
          )}
        </>
      )}
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function Heading() {
  return (
    <div className="flex items-start gap-3">
      <Heart size={28} className="mt-1 flex-shrink-0 text-rose-300/60" />
      <div>
        <h1 className="text-2xl font-bold text-white">Memorial</h1>
        <p className="mt-1 text-sm text-gray-400">
          Public record of a settled inheritance. Read-only.
        </p>
      </div>
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

function MemorialState({ state, windowEnd }: { state: number; windowEnd: number }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, windowEnd - nowSec);
  const days = Math.floor(remaining / 86400);

  if (state === 3) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
        <div className="flex items-center gap-3 text-accent">
          <Clock size={20} />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider opacity-70">State</div>
            <div className="text-base font-semibold">Memorial — read only</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider opacity-70">
              Closes in
            </div>
            <div className="font-mono text-base font-semibold">{days}d</div>
          </div>
        </div>
      </div>
    );
  }
  if (state === 4) {
    return (
      <div className="rounded-xl border border-gray-500/30 bg-gray-500/5 p-4">
        <div className="flex items-center gap-3 text-gray-300">
          <Lock size={20} />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider opacity-70">State</div>
            <div className="text-base font-semibold">Closed</div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function SummaryCard({
  initiator,
  reasonHash,
  payoutBalance,
  totalPaidOut,
  distributionFinalized,
  revealersCount,
}: {
  initiator: Address;
  reasonHash: Hex;
  payoutBalance: bigint;
  totalPaidOut: bigint;
  distributionFinalized: boolean;
  revealersCount: number;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
        Summary
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <dt className="text-gray-500">Initiated by</dt>
          <dd className="mt-1 truncate font-mono text-sm text-gray-200">{initiator}</dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <dt className="text-gray-500">Heirs who revealed</dt>
          <dd className="mt-1 font-mono text-sm text-gray-200">{revealersCount}</dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <dt className="text-gray-500">Vault balance at finalize</dt>
          <dd className="mt-1 font-mono text-sm text-gray-200">
            {formatUnits(payoutBalance, 18)} VFIDE
          </dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <dt className="text-gray-500">Total paid to heirs</dt>
          <dd className="mt-1 font-mono text-sm text-gray-200">
            {formatUnits(totalPaidOut, 18)} VFIDE
          </dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-3 sm:col-span-2">
          <dt className="text-gray-500">Reason hash</dt>
          <dd className="mt-1 truncate font-mono text-[10px] text-gray-400">
            {reasonHash}
          </dd>
        </div>
      </dl>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-300">
        <CheckCircle2 size={10} />
        {distributionFinalized ? 'Distribution finalized' : 'Pre-finalization'}
      </div>
    </section>
  );
}

function HeirsTable({
  managerAddress,
  revealers,
  totalPaidOut,
}: {
  managerAddress: Address;
  revealers: readonly Address[];
  totalPaidOut: bigint;
}) {
  // For each revealer, batch-read their final claim status from the manager.
  const { data, isLoading } = useReadContracts({
    contracts: revealers.length > 0
      ? revealers.map((heir) => ({
          address: managerAddress,
          abi: CardBoundVaultInheritanceManagerABI as Abi,
          functionName: 'getHeirClaimStatus' as const,
          args: [heir],
        }))
      : [],
    query: { enabled: revealers.length > 0 },
  });

  if (revealers.length === 0) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <Users className="mx-auto text-gray-500" size={28} />
        <p className="mt-3 text-sm text-gray-400">
          No heirs revealed during the claim window. The vault entered memorial
          without distributing funds.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
          Heirs
        </h2>
        <span className="text-xs text-gray-500">{revealers.length} revealed</span>
      </div>
      {isLoading ? (
        <div className="mt-4 flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {revealers.map((heir, i) => {
            const tuple = data?.[i]?.result as
              | readonly [bigint, bigint, bigint, boolean]
              | undefined;
            const revealedBps = tuple?.[0] ?? 0n;
            const finalBps = tuple?.[1] ?? 0n;
            const payout = tuple?.[2] ?? 0n;
            const pctOfTotal =
              totalPaidOut > 0n
                ? Number((payout * 10000n) / totalPaidOut) / 100
                : 0;
            return (
              <div
                key={heir}
                className="rounded-lg border border-white/5 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">
                      Heir
                    </div>
                    <div className="truncate font-mono text-xs text-gray-200">
                      {heir}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">
                      Final share
                    </div>
                    <div className="font-mono text-sm text-white">
                      {(Number(finalBps) / 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="text-gray-500">Revealed</div>
                    <div className="font-mono text-gray-300">
                      {(Number(revealedBps) / 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Payout</div>
                    <div className="font-mono text-gray-300">
                      {formatUnits(payout, 18)} VFIDE
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">% of total</div>
                    <div className="font-mono text-gray-300">{pctOfTotal.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
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
