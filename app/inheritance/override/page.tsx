'use client';

/**
 * Proof-of-Life override page.
 *
 * This page is for the OTHER person — the trusted family member who
 * holds the proof-of-life key. They're not the vault owner. They're
 * someone the owner asked to step in if an inheritance claim ever
 * starts while the owner is still alive (in a coma, prison, on
 * retreat, phone lost).
 *
 * Flow:
 *   1. Land here via a link the owner gave them at setup time, or by
 *      pasting the vault address from a guardian's notification.
 *   2. Connect their POL wallet.
 *   3. The page verifies: vault is in VETO_PERIOD AND connected wallet ==
 *      snapshotProofOfLifeWallet on the target vault's inheritance manager.
 *   4. Single button: "I am alive — cancel the claim."
 *   5. After confirmation, the vault returns to NORMAL.
 *
 * The page is deliberately spartan. It doesn't show heir lists, share
 * amounts, or anything else — the POL holder doesn't need to see those
 * to do their one job. Keep the surface tiny so a stressed family
 * member can act under pressure.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Wallet,
  HeartPulse,
  Lock,
  Shield,
} from 'lucide-react';
import { isAddress, type Address, type Hex } from 'viem';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';
import CardBoundVaultInheritanceManagerABI from '@/lib/abis/CardBoundVaultInheritanceManager.json';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;

export default function OverridePage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <OverrideInner />
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

function OverrideInner() {
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

  // ─── Step 1: ask for the vault address. ─────────────────────────────
  if (!committedVault) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading />
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <label className="block text-xs uppercase tracking-wider text-gray-500">
            Vault address
          </label>
          <p className="mt-1 text-xs text-gray-500">
            From the alert you received, the link the owner gave you, or
            the inheritance envelope.
          </p>
          <div className="mt-3 flex gap-2">
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
              className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <OverrideContent
      vault={committedVault}
      onChange={() => setCommittedVault(undefined)}
    />
  );
}

function OverrideContent({
  vault,
  onChange,
}: {
  vault: Address;
  onChange: () => void;
}) {
  const { address: connectedAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // 1. Resolve the manager from the vault facade.
  const { data: managerAddressRaw, isLoading: isLoadingMgr } = useReadContract({
    address: vault,
    abi: CardBoundVaultABI,
    functionName: 'inheritanceManager',
    query: { enabled: !!vault },
  });
  const managerAddress = managerAddressRaw as Address | undefined;
  const isValidVault = !!managerAddress && managerAddress !== ZERO_ADDR;

  // 2. Read vault state + snapshot authority (owner admin + POL wallet).
  //    The snapshot fields are what governs override authority during an
  //    active claim — NOT the live config.
  const { data: stateData } = useReadContract({
    address: managerAddress,
    abi: CardBoundVaultInheritanceManagerABI,
    functionName: 'inheritanceState',
    query: { enabled: !!managerAddress, refetchInterval: 30_000 },
  });
  const { data: snapshotOwnerData } = useReadContract({
    address: managerAddress,
    abi: CardBoundVaultInheritanceManagerABI,
    functionName: 'snapshotOwnerAdmin',
    query: { enabled: !!managerAddress },
  });
  const { data: snapshotPolData } = useReadContract({
    address: managerAddress,
    abi: CardBoundVaultInheritanceManagerABI,
    functionName: 'snapshotProofOfLifeWallet',
    query: { enabled: !!managerAddress },
  });

  const stateTuple = (stateData as readonly [number, bigint] | undefined) ?? [0, 0n];
  const state = stateTuple[0];
  const windowEnd = Number(stateTuple[1]);
  const snapshotOwner = (snapshotOwnerData as Address | undefined) ?? ZERO_ADDR;
  const snapshotPol = (snapshotPolData as Address | undefined) ?? ZERO_ADDR;

  // 3. Local tick for the countdown.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // 4. Authority check (client-side; contract enforces too).
  const authorized = useMemo(() => {
    if (!connectedAddress) return false;
    const me = connectedAddress.toLowerCase();
    return (
      me === snapshotOwner.toLowerCase() ||
      (snapshotPol !== ZERO_ADDR && me === snapshotPol.toLowerCase())
    );
  }, [connectedAddress, snapshotOwner, snapshotPol]);

  const [txError, setTxError] = useState<string | null>(null);
  const [submittedTx, setSubmittedTx] = useState<Hex | null>(null);

  async function handleOverride() {
    setTxError(null);
    try {
      const hash = await writeContractAsync({
        address: vault,
        abi: CardBoundVaultABI,
        functionName: 'ownerOverrideClaim',
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setSubmittedTx(hash);
    } catch (e) {
      setTxError(e instanceof Error ? e.message : 'Override failed.');
    }
  }

  if (isLoadingMgr) return <LoadingPage />;

  // Invalid vault.
  if (!isValidVault) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading />
        <NoticeCard tone="red" icon={<AlertTriangle size={20} />} title="Vault not found">
          We couldn&apos;t reach an inheritance manager at that address.
          Double-check the address on your alert or envelope.
          <div className="mt-3">
            <button
              type="button"
              onClick={onChange}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300"
            >
              Enter a different vault
            </button>
          </div>
        </NoticeCard>
      </div>
    );
  }

  // Already submitted — show confirmation.
  if (submittedTx) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
        <Heading />
        <VaultBanner vault={vault} onChange={onChange} />
        <NoticeCard tone="emerald" icon={<CheckCircle2 size={20} />} title="Claim cancelled">
          The inheritance claim has been cancelled. The vault is back to
          normal. The owner should be notified through your usual channels.
          <p className="mt-2 break-all font-mono text-[10px] text-gray-400">
            tx: {submittedTx}
          </p>
        </NoticeCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12 space-y-6">
      <Heading />
      <VaultBanner vault={vault} onChange={onChange} />

      <StateBanner state={state} windowEnd={windowEnd} nowSec={nowSec} />

      {state !== 1 ? (
        <NoticeCard
          tone={state === 0 ? 'gray' : 'amber'}
          icon={state === 0 ? <Shield size={20} /> : <Lock size={20} />}
          title={
            state === 0
              ? 'No active claim'
              : state === 2
                ? 'Override window has passed'
                : 'Cannot override now'
          }
        >
          {state === 0 && (
            <>
              Nothing to override. The vault is in its normal state — no
              inheritance claim is active.
            </>
          )}
          {state === 2 && (
            <>
              The 30-day veto period has already elapsed. The claim has
              moved to the heir claim window. The proof-of-life override
              only works during the first 30 days.
            </>
          )}
          {state === 3 && <>The vault is in its memorial state. No override applies.</>}
          {state === 4 && <>The vault is closed. No override applies.</>}
        </NoticeCard>
      ) : !isConnected ? (
        <NoticeCard tone="cyan" icon={<Wallet size={20} />} title="Connect your wallet">
          You need to connect the proof-of-life wallet (or the owner&apos;s
          active wallet, if you are the owner) to override.
        </NoticeCard>
      ) : !authorized ? (
        <NoticeCard tone="amber" icon={<AlertTriangle size={20} />} title="Wrong wallet">
          The connected wallet is not the proof-of-life wallet or the
          owner admin for this vault&apos;s active claim. Disconnect and
          reconnect with the correct wallet.
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-200">
              Authorized addresses
            </summary>
            <dl className="mt-2 space-y-1">
              <div>
                <dt className="text-gray-500">Owner admin:</dt>
                <dd className="break-all font-mono text-[10px] text-gray-300">
                  {snapshotOwner}
                </dd>
              </div>
              {snapshotPol !== ZERO_ADDR && (
                <div>
                  <dt className="text-gray-500">Proof-of-life wallet:</dt>
                  <dd className="break-all font-mono text-[10px] text-gray-300">
                    {snapshotPol}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">You:</dt>
                <dd className="break-all font-mono text-[10px] text-gray-300">
                  {connectedAddress}
                </dd>
              </div>
            </dl>
          </details>
        </NoticeCard>
      ) : (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 text-emerald-300">
            <HeartPulse size={20} />
            <h2 className="text-base font-semibold">You are authorized to cancel this claim</h2>
          </div>
          <p className="mt-3 text-sm text-gray-300">
            Clicking below records on-chain that the vault owner is alive
            and cancels the inheritance claim. The vault returns to its
            normal state. There is no undo — the guardians will need to
            initiate again if circumstances change.
          </p>
          {txError && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {txError}
            </div>
          )}
          <button
            type="button"
            onClick={handleOverride}
            disabled={isWritePending}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-white font-bold disabled:opacity-50"
          >
            {isWritePending ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Submitting…
              </span>
            ) : (
              "I'm alive — cancel the claim"
            )}
          </button>
        </section>
      )}
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function Heading() {
  return (
    <div className="flex items-start gap-3">
      <HeartPulse size={28} className="mt-1 flex-shrink-0 text-emerald-300/80" />
      <div>
        <h1 className="text-2xl font-bold text-white">Proof of life</h1>
        <p className="mt-1 text-sm text-gray-400">
          Cancel an active inheritance claim. For the proof-of-life wallet
          or the owner&apos;s admin wallet.
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

function StateBanner({
  state,
  windowEnd,
  nowSec,
}: {
  state: number;
  windowEnd: number;
  nowSec: number;
}) {
  const remaining = Math.max(0, windowEnd - nowSec);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);

  const tone =
    state === 1
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-200'
      : 'border-white/10 bg-white/5 text-gray-300';

  const labels: Record<number, string> = {
    0: 'Normal',
    1: 'Veto period',
    2: 'Claim window',
    3: 'Memorial',
    4: 'Closed',
  };

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${tone}`}>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider opacity-70">Vault state</div>
        <div className="text-sm font-semibold">{labels[state] ?? 'Unknown'}</div>
      </div>
      {state === 1 && (
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider opacity-70">Time to override</div>
          <div className="font-mono text-sm font-semibold">
            {days >= 1 ? `${days}d ${hours}h` : `${hours}h`}
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
  tone: 'amber' | 'cyan' | 'emerald' | 'gray' | 'red';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const toneClass = {
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-200',
    cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-200',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200',
    gray: 'border-gray-500/30 bg-gray-500/5 text-gray-300',
    red: 'border-red-500/30 bg-red-500/5 text-red-300',
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
