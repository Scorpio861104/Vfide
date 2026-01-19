'use client';

import React, { useState } from 'react';
import { useFinancialIntelligence, SpendingCategory, FinancialHealth } from '@/lib/financialIntelligence';
import { useAccount } from 'wagmi';
import { Skeleton } from '@/components/ui/Skeleton';

// ============================================================================
// Financial Dashboard Component
// ============================================================================

export default function FinancialDashboard() {
  const { address } = useAccount();
  const {
    loading,
    spendingByCategory,
    dailySpending,
    financialHealth,
    taxSummary,
    transactions,
  } = useFinancialIntelligence(address);

  const [activeTab, setActiveTab] = useState<'overview' | 'spending' | 'taxes'>('overview');

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Financial Intelligence</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {(['overview', 'spending', 'taxes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          financialHealth={financialHealth}
          spendingByCategory={spendingByCategory}
          transactionCount={transactions.length}
        />
      )}

      {activeTab === 'spending' && (
        <SpendingTab
          spendingByCategory={spendingByCategory}
          dailySpending={dailySpending}
        />
      )}

      {activeTab === 'taxes' && (
        <TaxesTab taxSummary={taxSummary} />
      )}
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

interface OverviewTabProps {
  financialHealth: FinancialHealth;
  spendingByCategory: SpendingCategory[];
  transactionCount: number;
}

function OverviewTab({ financialHealth, spendingByCategory, transactionCount }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Health Score Card */}
      <div className="bg-linear-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-foreground/80">Financial Health Score</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Based on {transactionCount} transactions
            </p>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${financialHealth.score * 2.83} 283`}
                className="text-primary"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{financialHealth.score}</span>
            </div>
          </div>
        </div>

        {/* Score Factors */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          {Object.entries(financialHealth.factors).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-lg font-semibold">{value.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {financialHealth.recommendations.length > 0 && (
        <div className="bg-card rounded-xl p-4 border">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <LightbulbIcon />
            Recommendations
          </h4>
          <ul className="space-y-2">
            {financialHealth.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Transactions"
          value={transactionCount.toString()}
          icon={<ActivityIcon />}
        />
        <StatCard
          label="Categories"
          value={spendingByCategory.length.toString()}
          icon={<PieChartIcon />}
        />
        <StatCard
          label="Top Category"
          value={spendingByCategory[0]?.name || 'N/A'}
          icon={<TrendingUpIcon />}
        />
        <StatCard
          label="Active Days"
          value="30"
          icon={<CalendarIcon />}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Spending Tab
// ============================================================================

interface SpendingTabProps {
  spendingByCategory: SpendingCategory[];
  dailySpending: { date: string; amount: number; transactions: number }[];
}

function SpendingTab({ spendingByCategory, dailySpending }: SpendingTabProps) {
  const totalSpending = spendingByCategory.reduce((sum, cat) => sum + cat.amount, 0);
  const maxDailyAmount = Math.max(...dailySpending.map((d) => d.amount), 1);

  return (
    <div className="space-y-6">
      {/* Daily Spending Chart */}
      <div className="bg-card rounded-xl p-4 border">
        <h4 className="font-medium mb-4">Daily Spending (Last 30 Days)</h4>
        <div className="h-40 flex items-end gap-1">
          {dailySpending.map((day) => (
            <div
              key={day.date}
              className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t cursor-pointer group relative"
              style={{ height: `${(day.amount / maxDailyAmount) * 100}%`, minHeight: '4px' }}
            >
              <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                ${day.amount.toFixed(2)} • {day.transactions} tx
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{dailySpending[0]?.date}</span>
          <span>{dailySpending[dailySpending.length - 1]?.date}</span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-card rounded-xl p-4 border">
        <h4 className="font-medium mb-4">Spending by Category</h4>
        <div className="space-y-4">
          {spendingByCategory.map((category) => (
            <div key={category.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{category.name}</span>
                <span className="text-muted-foreground">
                  ${category.amount.toFixed(2)} ({category.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {category.trend === 'up' ? (
                  <TrendingUpIcon className="w-3 h-3 text-red-500" />
                ) : category.trend === 'down' ? (
                  <TrendingDownIcon className="w-3 h-3 text-green-500" />
                ) : (
                  <MinusIcon className="w-3 h-3" />
                )}
                <span>
                  {category.change > 0 ? '+' : ''}
                  {category.change.toFixed(1)}% vs last period
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t flex justify-between">
          <span className="font-medium">Total</span>
          <span className="font-bold">${totalSpending.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Taxes Tab
// ============================================================================

interface TaxesTabProps {
  taxSummary: {
    shortTermGains: number;
    longTermGains: number;
    totalLosses: number;
    netGain: number;
    harvestingOpportunities: unknown[];
  };
}

function TaxesTab({ taxSummary }: TaxesTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TaxCard
          label="Short-Term Gains"
          value={taxSummary.shortTermGains}
          type="gain"
        />
        <TaxCard
          label="Long-Term Gains"
          value={taxSummary.longTermGains}
          type="gain"
        />
        <TaxCard
          label="Total Losses"
          value={taxSummary.totalLosses}
          type="loss"
        />
        <TaxCard
          label="Net Gain/Loss"
          value={taxSummary.netGain}
          type={taxSummary.netGain >= 0 ? 'gain' : 'loss'}
        />
      </div>

      {/* Info Card */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-500">Tax Disclaimer</h4>
            <p className="text-sm text-muted-foreground mt-1">
              This is an estimate based on your transaction history. Consult a tax professional
              for accurate tax advice. Tax calculations use FIFO cost basis method.
            </p>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-card rounded-xl p-4 border">
        <h4 className="font-medium mb-4">Export Tax Report</h4>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
            Export CSV
          </button>
          <button className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">
            Export PDF
          </button>
          <button className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">
            TurboTax Format
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl p-4 border">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function TaxCard({ label, value, type }: { label: string; value: number; type: 'gain' | 'loss' }) {
  const isPositive = value >= 0;
  const colorClass = type === 'gain' 
    ? (isPositive ? 'text-green-500' : 'text-red-500')
    : 'text-red-500';

  return (
    <div className="bg-card rounded-xl p-4 border">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-semibold ${colorClass}`}>
        {type === 'loss' ? '-' : (isPositive ? '+' : '-')}${Math.abs(value).toFixed(2)}
      </div>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function LightbulbIcon() {
  return (
    <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function PieChartIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  );
}

function TrendingUpIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function TrendingDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}

function MinusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
