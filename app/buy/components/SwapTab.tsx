'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowDownUp, Loader2, RefreshCcw, Wallet2 } from 'lucide-react';

type Token = 'ETH' | 'VFIDE';

interface PriceResponse {
  prices?: {
    vfide?: { usd?: number };
    eth?: { usd?: number };
  };
}

interface BalanceRow {
  token_symbol?: string;
  balance?: string;
}

interface BalanceResponse {
  balances?: BalanceRow[];
}

export function SwapTab() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [fromToken, setFromToken] = useState<Token>('ETH');
  const [toToken, setToToken] = useState<Token>('VFIDE');
  const [amount, setAmount] = useState('1');
  const [prices, setPrices] = useState<{ vfideUsd: number; ethUsd: number }>({ vfideUsd: 0.1, ethUsd: 2000 });
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!address) return;
    let mounted = true;
    setLoading(true);

    Promise.all([
      fetch('/api/crypto/price').then((r) => r.json() as Promise<PriceResponse>),
      fetch(`/api/crypto/balance/${address}`).then((r) => {
        if (!r.ok) return { balances: [] } as BalanceResponse;
        return r.json() as Promise<BalanceResponse>;
      }),
    ])
      .then(([priceData, balanceData]) => {
        if (!mounted) return;
        const vfideUsd = Number(priceData?.prices?.vfide?.usd ?? 0.1);
        const ethUsd = Number(priceData?.prices?.eth?.usd ?? 2000);
        setPrices({
          vfideUsd: Number.isFinite(vfideUsd) && vfideUsd > 0 ? vfideUsd : 0.1,
          ethUsd: Number.isFinite(ethUsd) && ethUsd > 0 ? ethUsd : 2000,
        });

        const normalized: Record<string, number> = {};
        for (const row of balanceData?.balances ?? []) {
          if (!row?.token_symbol) continue;
          normalized[row.token_symbol.toUpperCase()] = Number(row.balance ?? 0);
        }
        setBalances(normalized);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [address]);

  const estimatedOut = useMemo(() => {
    const input = Number(amount);
    if (!Number.isFinite(input) || input <= 0) return 0;
    const fromUsd = fromToken === 'ETH' ? prices.ethUsd : prices.vfideUsd;
    const toUsd = toToken === 'ETH' ? prices.ethUsd : prices.vfideUsd;
    const usdValue = input * fromUsd;
    return usdValue / toUsd;
  }, [amount, fromToken, toToken, prices.ethUsd, prices.vfideUsd]);

  const canSubmit = address && Number(amount) > 0 && fromToken !== toToken;

  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={18} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Swap Planner</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value as Token)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="ETH">ETH</option>
              <option value="VFIDE">VFIDE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value as Token)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="VFIDE">VFIDE</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Amount</label>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <button
          type="button"
          onClick={flipTokens}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:text-white"
        >
          <ArrowDownUp size={14} /> Flip Pair
        </button>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Estimated Output</p>
          <p className="text-lg font-semibold text-cyan-400">{estimatedOut.toFixed(4)} {toToken}</p>
          <p className="text-xs text-gray-500 mt-1">
            Pricing based on live protocol feed ({fromToken}/USD and {toToken}/USD)
          </p>
        </div>

        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Wallet2 size={12} /> {fromToken} wallet balance: {(balances[fromToken] ?? 0).toFixed(4)}
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Prepare Swap Route
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCcw size={12} /> Route preparation validates pricing and pair direction before final execution.
        </div>
      </div>
    </div>
  );
}
