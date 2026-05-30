'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useReadContracts, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { type Address, isAddress, erc20Abi, formatUnits } from 'viem';
import {
  Send,
  Loader2,
  AlertCircle,
  Users,
  Wallet,
  Search,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import RevenueSplitterABI from '@/lib/abis/RevenueSplitter.json';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { toast } from '@/lib/toast';
import { useLocale } from '@/lib/locale/LocaleProvider';

/**
 * RevenueSplitter is deployed per-merchant (or per-org). There's no
 * canonical address — each instance lives at the address its owner
 * deployed. So this page takes the splitter address as input and reads
 * its payees + balance for distribution.
 *
 * The token to distribute is also user-provided since splitters can
 * hold any ERC20. Defaults to the configured VFIDE token for convenience.
 */

function shortAddr(a: string) {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

interface PayeeRow {
  account: Address;
  shareBps: bigint;
}

export default function SplitterPage() {
  const { locale } = useLocale();
  void locale;

  const [splitterInput, setSplitterInput] = useState('');
  const [tokenInput, setTokenInput] = useState<string>(CONTRACT_ADDRESSES.VFIDEToken ?? '');
  const [submitting, setSubmitting] = useState(false);

  const splitter: Address | null = isAddress(splitterInput)
    ? (splitterInput as Address)
    : null;
  const token: Address | null = isAddress(tokenInput)
    ? (tokenInput as Address)
    : null;

  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Read splitter's payees, totalShares, owner. We always build the read
  // array with a concrete address (the splitter when defined, zero address
  // as a placeholder) and gate the actual fetch via query.enabled. Building
  // conditionally with `splitter ? [...] : []` breaks wagmi's type inference
  // because the empty-array branch is typed `never[]`.
  const splitterReadTarget = (splitter ?? '0x0000000000000000000000000000000000000000') as Address;
  const splitterReads = [
    {
      address: splitterReadTarget,
      abi: RevenueSplitterABI,
      functionName: 'getPayees' as const,
    },
    {
      address: splitterReadTarget,
      abi: RevenueSplitterABI,
      functionName: 'totalShares' as const,
    },
    {
      address: splitterReadTarget,
      abi: RevenueSplitterABI,
      functionName: 'owner' as const,
    },
    {
      address: splitterReadTarget,
      abi: RevenueSplitterABI,
      functionName: 'hasPendingPayeesUpdate' as const,
    },
  ] as const;

  const {
    data: splitterData,
    isLoading: splitterLoading,
    refetch: refetchSplitter,
  } = useReadContracts({
    contracts: splitterReads,
    query: { enabled: !!splitter },
  });

  const payees: PayeeRow[] = useMemo(() => {
    if (!splitterData?.[0] || splitterData[0].status !== 'success') return [];
    const tuples = splitterData[0].result as readonly { account: Address; shareBps: bigint }[];
    return tuples.map((t) => ({ account: t.account, shareBps: t.shareBps }));
  }, [splitterData]);
  const totalShares =
    splitterData?.[1]?.status === 'success'
      ? (splitterData[1].result as bigint)
      : 0n;
  const ownerAddr =
    splitterData?.[2]?.status === 'success'
      ? (splitterData[2].result as Address)
      : null;
  const hasPendingUpdate =
    splitterData?.[3]?.status === 'success' &&
    (splitterData[3].result as boolean) === true;

  // Read the token's symbol + decimals + the splitter's balance of it.
  // Same pattern as splitterReads: build the array unconditionally with
  // placeholders, gate the actual fetch via query.enabled.
  const tokenReadTarget = (token ?? '0x0000000000000000000000000000000000000000') as Address;
  const tokenReadBalanceArg = (splitter ?? '0x0000000000000000000000000000000000000000') as Address;
  const tokenReads = [
    {
      address: tokenReadTarget,
      abi: erc20Abi,
      functionName: 'symbol' as const,
    },
    {
      address: tokenReadTarget,
      abi: erc20Abi,
      functionName: 'decimals' as const,
    },
    {
      address: tokenReadTarget,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [tokenReadBalanceArg] as const,
    },
  ] as const;

  const {
    data: tokenData,
    isLoading: tokenLoading,
    refetch: refetchToken,
  } = useReadContracts({
    contracts: tokenReads,
    query: { enabled: !!splitter && !!token },
  });

  const tokenSymbol =
    tokenData?.[0]?.status === 'success' ? (tokenData[0].result as string) : '';
  const tokenDecimals =
    tokenData?.[1]?.status === 'success' ? (tokenData[1].result as number) : 18;
  const splitterBalance =
    tokenData?.[2]?.status === 'success' ? (tokenData[2].result as bigint) : 0n;

  const validInputs = !!splitter && !!token;
  const balanceZero = splitterBalance === 0n;

  async function handleDistribute() {
    if (!splitter || !token) return;
    setSubmitting(true);
    try {
      await writeContractAsync({
        address: splitter,
        abi: RevenueSplitterABI,
        functionName: 'distribute',
        args: [token],
      });
      toast.success('Distribution submitted.');
      // Refetch is driven by the useEffect below gated on isConfirmed.
      // The previous version used setTimeout(..., 2000) as a "wait a beat"
      // approximation \u2014 unreliable on slow blocks, premature on fast ones.
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Distribution failed';
      // RevenueSplitter uses require strings, not custom errors.
      if (msg.includes('no funds')) toast.error('Splitter has no balance of that token.');
      else if (msg.includes('RS: zero token')) toast.error('Token address required.');
      else if (msg.includes('rejected') || msg.includes('denied')) toast.info('Transaction cancelled.');
      else toast.error('Distribute failed: ' + msg.slice(0, 80));
    } finally {
      setSubmitting(false);
    }
  }

  // Refetch + confirmation toast when the chain confirms the distribute.
  useEffect(() => {
    if (isConfirmed) {
      void refetchSplitter();
      void refetchToken();
      toast.success('Distribution confirmed on-chain.');
    }
  }, [isConfirmed, refetchSplitter, refetchToken]);

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[550px] h-[550px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[450px] h-[450px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>
      <div className="relative container mx-auto px-4 max-w-3xl py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Revenue Distribution</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Revenue Splitter
            </span>
          </h1>
          <p className="text-white/50">Trigger payouts from a deployed splitter contract.</p>
        </motion.div>

          {/* Inputs */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <label
                htmlFor="splitter-address"
                className="text-xs text-zinc-400 mb-1.5 block"
              >
                Splitter contract address
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={14}
                  aria-hidden="true"
                />
                <input
                  id="splitter-address"
                  type="text"
                  placeholder="0x… (the merchant's deployed RevenueSplitter)"
                  value={splitterInput}
                  onChange={(e) => setSplitterInput(e.target.value.trim())}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              {splitterInput && !splitter && (
                <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} aria-hidden="true" /> Not a valid address.
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="splitter-token"
                className="text-xs text-zinc-400 mb-1.5 block"
              >
                Token to distribute
              </label>
              <input
                id="splitter-token"
                type="text"
                placeholder={
                  CONTRACT_ADDRESSES.VFIDEToken &&
                  isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken)
                    ? `${CONTRACT_ADDRESSES.VFIDEToken} (VFIDE)`
                    : '0x…'
                }
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.trim())}
                className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50"
              />
              {tokenInput && !token && (
                <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} aria-hidden="true" /> Not a valid address.
                </div>
              )}
            </div>
          </div>

          {/* Splitter info — only show once we have a valid address */}
          {splitter && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <Users size={14} aria-hidden="true" /> Splitter
                </h3>
                <button
                  type="button"
                  aria-label="Refresh splitter data"
                  onClick={() => {
                    void refetchSplitter();
                    void refetchToken();
                  }}
                  className="text-zinc-400 hover:text-cyan-400 transition-colors"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                </button>
              </div>

              {splitterLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin text-cyan-400" size={24} aria-hidden="true" />
                </div>
              )}

              {!splitterLoading && payees.length === 0 && (
                <div className="text-sm text-zinc-400">
                  No payees found. The address may not be a RevenueSplitter, or its payee
                  list may be empty. Distribute will revert if so.
                </div>
              )}

              {!splitterLoading && payees.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400 mb-2">
                    Owner: <span className="font-mono text-zinc-300">{ownerAddr ? shortAddr(ownerAddr) : '—'}</span>
                    {hasPendingUpdate && (
                      <span className="ml-3 text-amber-400">
                        ⚠️ Has pending payee update
                      </span>
                    )}
                  </div>
                  {payees.map((p, i) => {
                    const pct =
                      totalShares > 0n
                        ? Number((p.shareBps * 10000n) / totalShares) / 100
                        : 0;
                    return (
                      <div
                        key={`${p.account}-${i}`}
                        className="flex items-center gap-3 p-2 bg-zinc-900 rounded-lg"
                      >
                        <div className="flex-1 font-mono text-xs text-zinc-300">
                          {shortAddr(p.account)}
                        </div>
                        <div className="text-sm text-cyan-300 font-mono">
                          {p.shareBps.toString()} bps
                        </div>
                        <div className="text-xs text-zinc-500 w-14 text-right">
                          {pct.toFixed(2)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Token balance + Distribute action */}
          {validInputs && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                <Wallet size={14} aria-hidden="true" /> Distributable balance
              </h3>
              {tokenLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-cyan-400" size={20} aria-hidden="true" />
                </div>
              ) : (
                <div className="text-3xl font-bold text-white font-mono">
                  {formatUnits(splitterBalance, tokenDecimals)}{' '}
                  <span className="text-base text-zinc-400">{tokenSymbol || 'tokens'}</span>
                </div>
              )}
              <p className="text-xs text-zinc-500">
                Anyone can trigger distribution. The full balance is split pro-rata among
                payees in a single transaction.
              </p>
              <button
                type="button"
                onClick={handleDistribute}
                disabled={!validInputs || balanceZero || submitting || isPending || isConfirming || payees.length === 0}
                aria-label="Distribute splitter balance to payees"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold transition-colors"
              >
                {submitting || isPending || isConfirming ? (
                  <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                ) : (
                  <Send size={16} aria-hidden="true" />
                )}
                {isConfirming
                  ? 'Confirming…'
                  : isPending
                    ? 'Submitting…'
                    : balanceZero
                      ? 'No balance to distribute'
                      : `Distribute ${formatUnits(splitterBalance, tokenDecimals)} ${tokenSymbol || ''}`}
              </button>
            </div>
          )}
        </div>
      <Footer />
    </div>
  );
}
