'use client';

import React, { useState } from 'react';
import { useFinancialIntelligence } from '@/lib/financialIntelligence';
import { useAccount } from 'wagmi';

export default function TaxesPage() {
  const { address } = useAccount();
  const { taxEvents, taxSummary, loading } = useFinancialIntelligence(address);
  const [year, setYear] = useState(new Date().getFullYear());

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tax Report</h1>
          <p className="text-muted-foreground">Capital gains & losses for tax filing</p>
        </div>
        <select
          value={year}
          onChange={(e) =>  setYear(Number(e.target.value))}
          className="px-4 py-2 bg-card border border-border rounded-lg"
        >
          <option value={2026}>2026</option>
          <option value={2025}>2025</option>
          <option value={2024}>2024</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Short-Term Gains</div>
          <div className="text-2xl font-bold text-green-500">
            +${taxSummary.shortTermGains.toFixed(2)}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Long-Term Gains</div>
          <div className="text-2xl font-bold text-green-500">
            +${taxSummary.longTermGains.toFixed(2)}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Total Losses</div>
          <div className="text-2xl font-bold text-red-500">
            -${taxSummary.totalLosses.toFixed(2)}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Net Gain/Loss</div>
          <div className={`text-2xl font-bold ${taxSummary.netGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {taxSummary.netGain >= 0 ? '+' : '-'}${Math.abs(taxSummary.netGain).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-yellow-500 text-xl">⚠️</span>
          <div>
            <h4 className="font-medium text-yellow-500">Tax Disclaimer</h4>
            <p className="text-sm text-muted-foreground mt-1">
              This is an estimate based on your on-chain transaction history using FIFO cost basis method.
              Consult a qualified tax professional for accurate tax advice. VFIDE is not a tax advisor.
            </p>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-medium">Tax Events ({taxEvents.length})</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
              Export CSV
            </button>
            <button className="px-3 py-1.5 bg-muted rounded-lg text-sm">
              Export PDF
            </button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {taxEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No tax events found for {year}
            </div>
          ) : (
            taxEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      event.type === 'capital-gain'
                        ? 'bg-green-500/20 text-green-500'
                        : event.type === 'capital-loss'
                        ? 'bg-red-500/20 text-red-500'
                        : event.type === 'income'
                        ? 'bg-blue-500/20 text-blue-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {event.type}
                    </span>
                    <span className="font-medium">{event.token}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {new Date(event.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${event.amount.toFixed(2)}</div>
                  {event.gain !== undefined && (
                    <div className={`text-sm ${event.gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {event.gain >= 0 ? '+' : ''}{event.gain.toFixed(2)} gain
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cost Basis Method */}
      <div className="bg-card rounded-xl p-4 border">
        <h3 className="font-medium mb-3">Cost Basis Method</h3>
        <div className="flex gap-2">
          {['FIFO', 'LIFO', 'HIFO'].map((method) => (
            <button
              key={method}
              className={`px-4 py-2 rounded-lg text-sm ${
                method === 'FIFO'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          FIFO (First In, First Out) is the default and most commonly used method.
        </p>
      </div>
    </div>
  );
}
