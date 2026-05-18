'use client';

/**
 * Flash Loans: directory of all registered lenders.
 *
 * Paginated read of `getLenders(offset, limit)` + per-lender
 * `getLenderInfo`. Surfaces the pool's overall liquidity composition
 * so prospective lenders can size the competition and borrower
 * integrators can pick a target address. The cheapest lender that
 * fits a target amount is also available via `findBestLender`.
 */

import { useState, useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { Users, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useLenderCount,
  useGetLenders,
} from '@/hooks/useFlashLoan';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';
import { VFIDEFlashLoanABI } from '@/lib/abis';

const PAGE_SIZE = 10n;
const VFIDE_DECIMALS = 18;

export function LendersTab() {
  const addrs = useContractAddresses();
  const configured = isConfiguredContractAddress(addrs.VFIDEFlashLoan);

  const [page, setPage] = useState(0n);

  const { count } = useLenderCount();
  const { addresses, isLoading: addressesLoading } = useGetLenders(page * PAGE_SIZE, PAGE_SIZE);

  // Pull every lender's info in one batched read so the table renders fast.
  const { data: infosRaw, isLoading: infosLoading } = useReadContracts({
    contracts: addresses.map((a) => ({
      address: addrs.VFIDEFlashLoan,
      abi: VFIDEFlashLoanABI as any,
      functionName: 'getLenderInfo',
      args: [a],
    } as const)),
    query: { enabled: addresses.length > 0 && configured },
  });

  const rows = useMemo(() => {
    if (!infosRaw) return [];
    return addresses.map((address, i) => {
      const entry = infosRaw[i];
      if (entry?.status !== 'success' || !Array.isArray(entry.result)) {
        return { address, balance: 0n, feeBps: 0n, earned: 0n, loanCount: 0n, paused: false };
      }
      const r = entry.result as readonly unknown[];
      return {
        address,
        balance: r[0] as bigint,
        feeBps: r[1] as bigint,
        earned: r[2] as bigint,
        loanCount: r[4] as bigint,
        paused: !!r[5],
      };
    });
  }, [addresses, infosRaw]);

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">VFIDEFlashLoan isn&rsquo;t deployed on this network yet.</p>
      </div>
    );
  }

  const loading = addressesLoading || infosLoading;
  const totalPages = count > 0n ? (count - 1n) / PAGE_SIZE + 1n : 0n;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">No lenders registered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-zinc-400">
                <th className="text-left px-4 py-3 font-medium">Lender</th>
                <th className="text-right px-4 py-3 font-medium">Available</th>
                <th className="text-right px-4 py-3 font-medium">Fee</th>
                <th className="text-right px-4 py-3 font-medium">Earned</th>
                <th className="text-right px-4 py-3 font-medium">Loans</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.address} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-white">
                    {r.address.slice(0, 10)}…{r.address.slice(-6)}
                    {r.paused && (
                      <span className="ml-2 text-amber-400 text-xs">(paused)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-white">
                    {formatUnits(r.balance, VFIDE_DECIMALS)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-cyan-400">
                    {(Number(r.feeBps) / 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-emerald-400">
                    {formatUnits(r.earned, VFIDE_DECIMALS)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400">
                    {r.loanCount.toString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1n && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Page {page + 1n} of {totalPages} · {count.toString()} lender{count === 1n ? '' : 's'} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => (p > 0n ? p - 1n : 0n))}
              disabled={page === 0n}
              aria-label="Previous page"
              className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <ChevronLeft size={12} aria-hidden="true" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => (p + 1n < totalPages ? p + 1n : p))}
              disabled={page + 1n >= totalPages}
              aria-label="Next page"
              className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Next <ChevronRight size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
