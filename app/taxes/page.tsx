'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useFinancialIntelligence } from '@/lib/financialIntelligence';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Download, Calculator } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export default function TaxesPage() {
  const { address } = useAccount();
  const { taxEvents, taxSummary, loading } = useFinancialIntelligence(address);
  const [year, setYear] = useState(new Date().getFullYear());

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-4xl space-y-6">
        {/* Tax accuracy disclaimer */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <strong className="text-amber-300">Not tax advice.</strong>{' '}
          <span className="text-amber-100">
            This report is computed from transactions VFIDE has recorded for your wallet.
            It does not include off-platform activity, transfers on other chains, cost-basis adjustments,
            or jurisdiction-specific rules. Use it as a starting point and consult a qualified tax professional before filing.
          </span>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="badge-live"><span className="badge-live-dot" />Tax Intelligence</span>
            </div>
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                <FileText size={32} className="text-emerald-400" />Tax Report
              </span>
            </h1>
            <p className="text-white/50 mt-1">Capital gains & losses for tax filing</p>
          </div>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50">
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </motion.div>

        {/* Summary cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="analytics-card p-4">
            <div className="text-xs text-white/40 mb-1">Short-Term Gains</div>
            <div className="text-2xl font-bold text-emerald-400">+${taxSummary.shortTermGains.toFixed(2)}</div>
          </div>
          <div className="analytics-card p-4">
            <div className="text-xs text-white/40 mb-1">Long-Term Gains</div>
            <div className="text-2xl font-bold text-emerald-400">+${taxSummary.longTermGains.toFixed(2)}</div>
          </div>
          <div className="analytics-card p-4">
            <div className="text-xs text-white/40 mb-1">Total Losses</div>
            <div className="text-2xl font-bold text-red-400">-${taxSummary.totalLosses.toFixed(2)}</div>
          </div>
          <div className="analytics-card p-4">
            <div className="text-xs text-white/40 mb-1">Net Gain/Loss</div>
            <div className={`text-2xl font-bold ${taxSummary.netGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {taxSummary.netGain >= 0 ? '+' : '-'}${Math.abs(taxSummary.netGain).toFixed(2)}
            </div>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card-premium p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-400 mb-1">Tax Disclaimer</div>
            <p className="text-sm text-white/50">
              This is an estimate based on your on-chain transaction history using FIFO cost basis method.
              Consult a qualified tax professional for accurate tax advice. VFIDE is not a tax advisor.
            </p>
          </div>
        </motion.div>

        {/* Events List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card-premium overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Calculator size={16} className="text-accent" />Tax Events ({taxEvents.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (taxEvents.length === 0) return;
                  const headers = ['Date', 'Type', 'Token', 'Amount (USD)', 'Gain/Loss (USD)'];
                  const rows = taxEvents.map(e => [
                    new Date(e.timestamp).toISOString().split('T')[0],
                    e.type, e.token, e.amount.toFixed(2),
                    e.gain !== undefined ? e.gain.toFixed(2) : '',
                  ]);
                  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `tax-events-${year}.csv`; a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={taxEvents.length === 0}
                className="btn-premium-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40">
                <Download size={12} />Export CSV
              </button>
              <button disabled title="PDF export requires server-side pipeline. Not wired up yet."
                className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/30 cursor-not-allowed">
                Export PDF
              </button>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {taxEvents.length === 0 ? (
              <div className="p-10 text-center text-white/40">No tax events found for {year}</div>
            ) : (
              taxEvents.slice(0, 10).map(event => (
                <div key={event.id} className="p-4 flex items-center justify-between hover:bg-white/2 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        event.type === 'capital-gain' ? 'bg-emerald-500/20 text-emerald-400'
                        : event.type === 'capital-loss' ? 'bg-red-500/20 text-red-400'
                        : event.type === 'income' ? 'bg-accent/20 text-accent'
                        : 'bg-white/10 text-white/40'
                      }`}>{event.type}</span>
                      <span className="font-medium text-white text-sm">{event.token}</span>
                    </div>
                    <div className="text-xs text-white/40">{new Date(event.timestamp).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white">${event.amount.toFixed(2)}</div>
                    {event.gain !== undefined && (
                      <div className={`text-xs ${event.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {event.gain >= 0 ? '+' : ''}{event.gain.toFixed(2)} gain
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Cost Basis Method */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-card-premium p-5">
          <h3 className="font-semibold text-white mb-3">Cost Basis Method</h3>
          <div className="flex gap-2 mb-2">
            {['FIFO', 'LIFO', 'HIFO'].map(method => (
              <button key={method} disabled
                title={method === 'FIFO' ? undefined : 'Not implemented yet'}
                className={`px-4 py-2 rounded-xl text-sm font-medium cursor-not-allowed ${
                  method === 'FIFO' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 text-white/30'
                }`}>{method}</button>
            ))}
          </div>
          <p className="text-xs text-white/30">
            FIFO (First In, First Out) is the default and currently the only method implemented.
            LIFO and HIFO are placeholders pending a per-method calculation rewrite.
          </p>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
