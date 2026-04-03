/**
 * Fee Savings Tracker — Shows cumulative savings vs traditional processors
 * 
 * Every transaction shows: "You saved $0.36 on this purchase."
 * Dashboard shows: "Total saved: $847.23 across 312 transactions."
 * 
 * Comparison rates (what they'd pay elsewhere):
 * - Square: 2.6% + $0.10
 * - Stripe: 2.9% + $0.30
 * - PayPal: 3.49% + $0.49
 * - Etsy:   6.5% 
 * - Shopify: 2.9% + $0.30
 * 
 * VFIDE buyer fee: 0.25% - 1% (based on ProofScore)
 * VFIDE merchant fee: 0%
 * 
 * Usage:
 *   <FeeSavingsCard totalVolume={3000} transactionCount={45} buyerFeeBps={50} />
 *   <FeeSavingsInline amount={25.00} buyerFeeBps={50} />
 *   <FeeSavingsCalculator />  // Landing page widget
 */
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, DollarSign, Shield, Calculator, ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

// ── Competitor Rates ────────────────────────────────────────────────────────

interface ProcessorRate {
  name: string;
  percentFee: number;   // As decimal (0.029 = 2.9%)
  flatFee: number;      // Per-transaction flat fee in USD
  color: string;
}

const COMPETITORS: ProcessorRate[] = [
  { name: 'Square', percentFee: 0.026, flatFee: 0.10, color: '#006AFF' },
  { name: 'Stripe', percentFee: 0.029, flatFee: 0.30, color: '#635BFF' },
  { name: 'PayPal', percentFee: 0.0349, flatFee: 0.49, color: '#003087' },
  { name: 'Etsy', percentFee: 0.065, flatFee: 0, color: '#F1641E' },
  { name: 'Shopify', percentFee: 0.029, flatFee: 0.30, color: '#96BF48' },
];

function calculateCompetitorFee(rate: ProcessorRate, amount: number, txCount: number): number {
  return (amount * rate.percentFee) + (rate.flatFee * txCount);
}

function calculateVFIDEFee(amount: number, buyerFeeBps: number): number {
  return amount * (buyerFeeBps / 10000);
}

// ── Dashboard Card ──────────────────────────────────────────────────────────

interface FeeSavingsCardProps {
  totalVolume: number;       // Total USD volume processed
  transactionCount: number;
  buyerFeeBps: number;       // User's current fee tier (e.g., 50 = 0.5%)
  className?: string;
}

export function FeeSavingsCard({ totalVolume, transactionCount, buyerFeeBps, className = '' }: FeeSavingsCardProps) {
  const { formatCurrency } = useLocale();
  const vfideFee = calculateVFIDEFee(totalVolume, buyerFeeBps);

  const savings = useMemo(() =>
    COMPETITORS.map(c => ({
      ...c,
      theirFee: calculateCompetitorFee(c, totalVolume, transactionCount),
      saved: calculateCompetitorFee(c, totalVolume, transactionCount) - vfideFee,
    })).sort((a, b) => b.saved - a.saved),
    [totalVolume, transactionCount, vfideFee]
  );

  const maxSaved = savings[0]?.saved || 0;
  const avgSaved = savings.reduce((s, c) => s + c.saved, 0) / savings.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6 ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-emerald-500/20">
          <TrendingDown size={22} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Fee Savings</h3>
          <p className="text-gray-400 text-xs">vs traditional payment processors</p>
        </div>
      </div>

      {/* Hero number */}
      <div className="text-center py-4">
        <div className="text-4xl font-bold text-emerald-400 font-mono">
          {formatCurrency(avgSaved)}
        </div>
        <div className="text-gray-400 text-sm mt-1">
          saved across {transactionCount.toLocaleString()} transactions
        </div>
      </div>

      {/* Comparison bars */}
      <div className="space-y-3 mt-4">
        {savings.map(competitor => {
          const barWidth = maxSaved > 0 ? (competitor.saved / maxSaved) * 100 : 0;
          return (
            <div key={competitor.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">vs {competitor.name}</span>
                <span className="text-emerald-400 font-bold font-mono">{formatCurrency(competitor.saved)}</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: competitor.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Your VFIDE fee: {(buyerFeeBps / 100).toFixed(2)}% • Merchant fee: 0%
      </div>
    </motion.div>
  );
}

// ── Inline (per-transaction) ────────────────────────────────────────────────

interface FeeSavingsInlineProps {
  amount: number;
  buyerFeeBps: number;
  compareTo?: string; // Specific competitor name
}

export function FeeSavingsInline({ amount, buyerFeeBps, compareTo }: FeeSavingsInlineProps) {
  const { formatCurrency } = useLocale();
  const competitor = COMPETITORS.find(c => c.name === compareTo) ?? COMPETITORS[0];
  if (!competitor) return null;

  const theirFee = (amount * competitor.percentFee) + competitor.flatFee;
  const ourFee = amount * (buyerFeeBps / 10000);
  const saved = theirFee - ourFee;

  if (saved <= 0) return null;

  return (
    <span className="text-emerald-400 text-xs font-medium">
      Saved {formatCurrency(saved)} vs {competitor.name}
    </span>
  );
}

// ── Landing Page Calculator ─────────────────────────────────────────────────

export function FeeSavingsCalculator() {
  const [monthlyVolume, setMonthlyVolume] = useState<string>('3000');
  const [avgTransaction, setAvgTransaction] = useState<string>('25');
  const { formatCurrency } = useLocale();

  const volume = parseFloat(monthlyVolume) || 0;
  const avgTx = parseFloat(avgTransaction) || 25;
  const txCount = avgTx > 0 ? Math.round(volume / avgTx) : 0;

  const results = useMemo(() =>
    COMPETITORS.map(c => ({
      ...c,
      monthlyFee: calculateCompetitorFee(c, volume, txCount),
      yearlyFee: calculateCompetitorFee(c, volume * 12, txCount * 12),
    })),
    [volume, txCount]
  );

  const vfideFeeMonthly = calculateVFIDEFee(volume, 50); // Assume 0.5% for calculator
  const vfideFeeYearly = vfideFeeMonthly * 12;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          How much are you losing to fees?
        </h2>
        <p className="text-gray-400">Enter your monthly sales to see what you could save with VFIDE.</p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Monthly sales volume</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={monthlyVolume}
              onChange={e => setMonthlyVolume(e.target.value)}
              className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-mono focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Average transaction</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={avgTransaction}
              onChange={e => setAvgTransaction(e.target.value)}
              className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-mono focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {volume > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* VFIDE row */}
          <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-emerald-400" />
              <div>
                <div className="text-white font-bold">VFIDE</div>
                <div className="text-emerald-400 text-xs">0% merchant fee • 0.5% buyer fee</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-emerald-400 font-bold font-mono">{formatCurrency(vfideFeeMonthly)}/mo</div>
              <div className="text-gray-500 text-xs">{formatCurrency(vfideFeeYearly)}/yr</div>
            </div>
          </div>

          {/* Competitor rows */}
          {results.map(c => {
            const monthlySaved = c.monthlyFee - vfideFeeMonthly;
            return (
              <div key={c.name} className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-gray-300 font-medium">{c.name}</div>
                  <div className="text-gray-500 text-xs">{(c.percentFee * 100).toFixed(1)}%{c.flatFee > 0 ? ` + ${formatCurrency(c.flatFee)}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono">{formatCurrency(c.monthlyFee)}/mo</div>
                  <div className="text-emerald-400 text-xs font-bold">
                    Save {formatCurrency(monthlySaved)}/mo
                  </div>
                </div>
              </div>
            );
          })}

          {/* Annual savings callout */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-xl p-6 text-center mt-6">
            <div className="text-gray-400 text-sm mb-1">Estimated annual savings vs Square</div>
            <div className="text-4xl font-bold text-emerald-400 font-mono">
              {formatCurrency((results.find(r => r.name === 'Square')?.yearlyFee || 0) - vfideFeeYearly)}
            </div>
            <div className="text-gray-500 text-xs mt-2">That&apos;s money back in your pocket, not theirs.</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
