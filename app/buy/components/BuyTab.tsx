'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Wallet, Calculator, BadgeDollarSign } from 'lucide-react';

interface PriceResponse {
  success?: boolean;
  prices?: {
    vfide?: { usd?: number };
  };
}

interface FeeResponse {
  success?: boolean;
  fees?: {
    slow?: { maxFeePerGas?: string };
    standard?: { maxFeePerGas?: string };
    fast?: { maxFeePerGas?: string };
  };
}

export function BuyTab() {
  const [loading, setLoading] = useState(false);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [usdBudget, setUsdBudget] = useState('100');
  const [feeTier, setFeeTier] = useState<'slow' | 'standard' | 'fast'>('standard');
  const [networkFeeEstimate, setNetworkFeeEstimate] = useState<Record<'slow' | 'standard' | 'fast', number>>({
    slow: 0.75,
    standard: 1.2,
    fast: 2.0,
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      fetch('/api/crypto/price').then((r) => r.json() as Promise<PriceResponse>),
      fetch('/api/crypto/fees').then((r) => r.json() as Promise<FeeResponse>),
    ])
      .then(([priceData, feeData]) => {
        if (!mounted) return;
        const fetchedPrice = Number(priceData?.prices?.vfide?.usd ?? 0);
        setPriceUsd(Number.isFinite(fetchedPrice) && fetchedPrice > 0 ? fetchedPrice : 0.1);

        const gwei = 1e9;
        const slowWei = Number(feeData?.fees?.slow?.maxFeePerGas ?? gwei.toString());
        const standardWei = Number(feeData?.fees?.standard?.maxFeePerGas ?? (1.5 * gwei).toString());
        const fastWei = Number(feeData?.fees?.fast?.maxFeePerGas ?? (2 * gwei).toString());

        // Rough ETH fee estimate for a swap-size tx (200k gas) converted with a conservative 2k ETH/USD.
        const gasUnits = 200000;
        const ethUsd = 2000;
        setNetworkFeeEstimate({
          slow: (slowWei / 1e18) * gasUnits * ethUsd,
          standard: (standardWei / 1e18) * gasUnits * ethUsd,
          fast: (fastWei / 1e18) * gasUnits * ethUsd,
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const parsedBudget = Number(usdBudget);
  const quote = useMemo(() => {
    if (!priceUsd || !Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return { vfideGross: 0, vfideNet: 0, feeUsd: 0 };
    }

    const feeUsd = networkFeeEstimate[feeTier] ?? 0;
    const usableUsd = Math.max(parsedBudget - feeUsd, 0);
    const vfideGross = parsedBudget / priceUsd;
    const vfideNet = usableUsd / priceUsd;
    return { vfideGross, vfideNet, feeUsd };
  }, [feeTier, networkFeeEstimate, parsedBudget, priceUsd]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={18} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">VFIDE Buy Planner</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Budget (USD)</label>
            <input
              type="number"
              min="1"
              value={usdBudget}
              onChange={(e) => setUsdBudget(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Network Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(['slow', 'standard', 'fast'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setFeeTier(tier)}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold capitalize transition-colors ${
                    feeTier === tier
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Live Price</p>
            <p className="text-sm font-semibold text-white">
              {priceUsd ? `$${priceUsd.toFixed(4)} / VFIDE` : 'Unavailable'}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Estimated Fee</p>
            <p className="text-sm font-semibold text-white">${quote.feeUsd.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Estimated VFIDE</p>
            <p className="text-sm font-semibold text-cyan-400">{quote.vfideNet.toFixed(2)} VFIDE</p>
          </div>
        </div>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <BadgeDollarSign size={16} className="text-emerald-400" />
          <h4 className="text-sm font-semibold text-white">Execution Paths</h4>
        </div>
        <ul className="space-y-1 text-xs text-gray-400">
          <li>• Use wallet-funded swap in the Swap tab for immediate on-chain execution.</li>
          <li>• Use marketplace and merchant flows for spend-first acquisition patterns.</li>
          <li>• Track resulting activity in the History tab.</li>
        </ul>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Wallet size={14} />
        Price and fee estimates refresh from protocol APIs; final execution values depend on chain conditions.
      </div>
    </div>
  );
}
