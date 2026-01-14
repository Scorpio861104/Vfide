/**
 * Financial Intelligence Module
 * 
 * Provides spending insights, budgeting, and smart financial recommendations.
 * All computation is client-side for privacy.
 */

'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'unstake' | 'reward' | 'fee';
  amount: number;
  token: string;
  usdValue: number;
  timestamp: number;
  to?: string;
  from?: string;
  category?: string;
  note?: string;
  txHash?: string;
}

export interface SpendingCategory {
  name: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  change: number; // Percentage change from previous period
}

export interface DailySpending {
  date: string;
  amount: number;
  transactions: number;
}

export interface TokenHolding {
  token: string;
  balance: number;
  usdValue: number;
  change24h: number;
  change7d: number;
  allocation: number;
}

export interface FinancialHealth {
  score: number; // 0-100
  factors: {
    diversification: number;
    activity: number;
    stability: number;
    growth: number;
    savingsRate: number;
  };
  recommendations: string[];
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'daily' | 'weekly' | 'monthly';
  alerts: boolean;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  token: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  to: string;
  nextDate: number;
  isActive: boolean;
}

export interface TaxEvent {
  id: string;
  type: 'capital-gain' | 'capital-loss' | 'income' | 'fee';
  amount: number;
  costBasis?: number;
  gain?: number;
  timestamp: number;
  txHash: string;
  token: string;
}

export interface TaxSummary {
  shortTermGains: number;
  longTermGains: number;
  totalLosses: number;
  netGain: number;
  harvestingOpportunities: TaxLossOpportunity[];
}

export interface TaxLossOpportunity {
  token: string;
  currentValue: number;
  costBasis: number;
  unrealizedLoss: number;
  suggestion: string;
}

// ============================================================================
// Category Detection
// ============================================================================

const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  'DeFi': [/swap|pool|liquidity|farm|yield|stake/i],
  'NFT': [/nft|mint|opensea|blur|collection/i],
  'Gaming': [/game|play|reward|loot|token/i],
  'Subscription': [/recurring|subscription|monthly|weekly/i],
  'Transfers': [/send|transfer|payment/i],
  'Exchange': [/exchange|trade|convert/i],
  'Gas': [/fee|gas/i],
};

export function categorizeTransaction(tx: Transaction): string {
  if (tx.category) return tx.category;

  const text = `${tx.type} ${tx.note || ''} ${tx.to || ''}`.toLowerCase();

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return category;
    }
  }

  if (tx.type === 'send') return 'Transfers';
  if (tx.type === 'receive') return 'Income';
  if (tx.type === 'swap') return 'Exchange';
  if (tx.type === 'stake' || tx.type === 'unstake') return 'DeFi';
  if (tx.type === 'reward') return 'Income';
  if (tx.type === 'fee') return 'Gas';

  return 'Other';
}

// ============================================================================
// Analysis Functions
// ============================================================================

export function analyzeSpending(
  transactions: Transaction[],
  period: 'week' | 'month' | 'year' = 'month'
): SpendingCategory[] {
  const now = Date.now();
  const periodMs = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  }[period];

  const currentPeriod = transactions.filter(
    (tx) => tx.type === 'send' && now - tx.timestamp < periodMs
  );

  const previousPeriod = transactions.filter(
    (tx) =>
      tx.type === 'send' &&
      now - tx.timestamp >= periodMs &&
      now - tx.timestamp < periodMs * 2
  );

  // Group by category
  const currentByCategory: Record<string, number> = {};
  const previousByCategory: Record<string, number> = {};

  currentPeriod.forEach((tx) => {
    const cat = categorizeTransaction(tx);
    currentByCategory[cat] = (currentByCategory[cat] || 0) + tx.usdValue;
  });

  previousPeriod.forEach((tx) => {
    const cat = categorizeTransaction(tx);
    previousByCategory[cat] = (previousByCategory[cat] || 0) + tx.usdValue;
  });

  const totalCurrent = Object.values(currentByCategory).reduce((a, b) => a + b, 0);

  return Object.entries(currentByCategory)
    .map(([name, amount]): SpendingCategory => {
      const previous = previousByCategory[name] || 0;
      const change = previous ? ((amount - previous) / previous) * 100 : 0;

      return {
        name,
        amount,
        percentage: totalCurrent ? (amount / totalCurrent) * 100 : 0,
        trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
        change,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function calculateDailySpending(
  transactions: Transaction[],
  days: number = 30
): DailySpending[] {
  const now = Date.now();
  const result: DailySpending[] = [];

  for (let i = 0; i < days; i++) {
    const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
    const dayEnd = now - i * 24 * 60 * 60 * 1000;

    const dayTx = transactions.filter(
      (tx) =>
        tx.type === 'send' && tx.timestamp >= dayStart && tx.timestamp < dayEnd
    );

    result.unshift({
      date: new Date(dayStart).toISOString().split('T')[0] ?? '',
      amount: dayTx.reduce((sum, tx) => sum + tx.usdValue, 0),
      transactions: dayTx.length,
    });
  }

  return result;
}

export function assessFinancialHealth(
  transactions: Transaction[],
  holdings: TokenHolding[]
): FinancialHealth {
  const factors = {
    diversification: calculateDiversification(holdings),
    activity: calculateActivityScore(transactions),
    stability: calculateStabilityScore(holdings),
    growth: calculateGrowthScore(transactions, holdings),
    savingsRate: calculateSavingsRate(transactions),
  };

  const weights = {
    diversification: 0.2,
    activity: 0.15,
    stability: 0.25,
    growth: 0.25,
    savingsRate: 0.15,
  };

  const score = Object.entries(factors).reduce(
    (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
    0
  );

  return {
    score: Math.round(score),
    factors,
    recommendations: generateRecommendations(factors, holdings, transactions),
  };
}

function calculateDiversification(holdings: TokenHolding[]): number {
  if (holdings.length === 0) return 0;
  if (holdings.length === 1) return 20;

  // Herfindahl-Hirschman Index
  const hhi = holdings.reduce((sum, h) => sum + Math.pow(h.allocation, 2), 0);
  // Normalize: 10000 (max concentration) -> 0, ~1000 (good) -> 100
  return Math.max(0, Math.min(100, 100 - (hhi - 1000) / 90));
}

function calculateActivityScore(transactions: Transaction[]): number {
  const last30Days = transactions.filter(
    (tx) => Date.now() - tx.timestamp < 30 * 24 * 60 * 60 * 1000
  );

  // 0 tx = 0, 1-5 = 40, 6-20 = 70, 21+ = 100
  const count = last30Days.length;
  if (count === 0) return 0;
  if (count <= 5) return 40;
  if (count <= 20) return 70;
  return 100;
}

function calculateStabilityScore(holdings: TokenHolding[]): number {
  if (holdings.length === 0) return 0;

  // Stablecoins and low-volatility assets contribute to stability
  const stableAssets = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD'];
  const stableAllocation = holdings
    .filter((h) => stableAssets.includes(h.token.toUpperCase()))
    .reduce((sum, h) => sum + h.allocation, 0);

  // 20-40% stable is ideal
  if (stableAllocation >= 20 && stableAllocation <= 40) return 100;
  if (stableAllocation < 20) return 50 + stableAllocation * 2.5;
  return Math.max(0, 100 - (stableAllocation - 40) * 2);
}

function calculateGrowthScore(
  transactions: Transaction[],
  holdings: TokenHolding[]
): number {
  // Based on portfolio performance
  const avgChange = holdings.reduce((sum, h) => sum + h.change7d * h.allocation, 0) / 100;

  // Map -20% to 0, 0% to 50, +20% to 100
  return Math.max(0, Math.min(100, 50 + avgChange * 2.5));
}

function calculateSavingsRate(transactions: Transaction[]): number {
  const last30Days = transactions.filter(
    (tx) => Date.now() - tx.timestamp < 30 * 24 * 60 * 60 * 1000
  );

  const income = last30Days
    .filter((tx) => tx.type === 'receive' || tx.type === 'reward')
    .reduce((sum, tx) => sum + tx.usdValue, 0);

  const spending = last30Days
    .filter((tx) => tx.type === 'send')
    .reduce((sum, tx) => sum + tx.usdValue, 0);

  if (income === 0) return 50; // Neutral if no income

  const rate = ((income - spending) / income) * 100;
  // Map savings rate: 0% = 40, 20% = 70, 50%+ = 100
  return Math.max(0, Math.min(100, 40 + rate * 1.2));
}

function generateRecommendations(
  factors: FinancialHealth['factors'],
  holdings: TokenHolding[],
  transactions: Transaction[]
): string[] {
  const recommendations: string[] = [];

  if (factors.diversification < 50) {
    recommendations.push(
      'Consider diversifying your portfolio across more assets to reduce risk.'
    );
  }

  if (factors.stability < 50) {
    const stableAllocation = holdings
      .filter((h) => ['USDC', 'USDT', 'DAI'].includes(h.token.toUpperCase()))
      .reduce((sum, h) => sum + h.allocation, 0);

    if (stableAllocation < 20) {
      recommendations.push(
        'Consider allocating 20-30% of your portfolio to stablecoins for stability.'
      );
    }
  }

  if (factors.activity < 40) {
    recommendations.push(
      'Your account has been inactive. Consider reviewing your positions.'
    );
  }

  if (factors.savingsRate < 50) {
    recommendations.push(
      'Your spending exceeds your income. Consider setting up budget limits.'
    );
  }

  // Check for concentration
  const topHolding = holdings[0];
  if (topHolding && topHolding.allocation > 50) {
    recommendations.push(
      `${topHolding.token} represents ${topHolding.allocation.toFixed(0)}% of your portfolio. Consider rebalancing.`
    );
  }

  // Check for recurring high gas
  const gasFees = transactions
    .filter((tx) => tx.type === 'fee')
    .reduce((sum, tx) => sum + tx.usdValue, 0);

  const totalSpending = transactions
    .filter((tx) => tx.type === 'send')
    .reduce((sum, tx) => sum + tx.usdValue, 0);

  if (totalSpending > 0 && gasFees / totalSpending > 0.1) {
    recommendations.push(
      'Gas fees are consuming over 10% of your transactions. Consider batching or using L2s.'
    );
  }

  return recommendations;
}

// ============================================================================
// Tax Tracking
// ============================================================================

export function calculateTaxEvents(
  transactions: Transaction[],
  costBasisMethod: 'FIFO' | 'LIFO' | 'HIFO' = 'FIFO'
): TaxEvent[] {
  const events: TaxEvent[] = [];
  const holdings: Record<string, { amount: number; costBasis: number; timestamp: number }[]> = {};

  // Sort by timestamp
  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  for (const tx of sorted) {
    if (tx.type === 'receive' || tx.type === 'reward') {
      // Add to holdings
      if (!holdings[tx.token]) holdings[tx.token] = [];
      holdings[tx.token]!.push({
        amount: tx.amount,
        costBasis: tx.usdValue,
        timestamp: tx.timestamp,
      });

      if (tx.type === 'reward') {
        events.push({
          id: tx.id,
          type: 'income',
          amount: tx.usdValue,
          timestamp: tx.timestamp,
          txHash: tx.txHash || '',
          token: tx.token,
        });
      }
    } else if (tx.type === 'send' || tx.type === 'swap') {
      // Calculate gain/loss
      const tokenHoldings = holdings[tx.token] || [];
      let remaining = tx.amount;
      let totalCostBasis = 0;

      // Sort based on method
      const sortedHoldings = [...tokenHoldings].sort((a, b) => {
        if (costBasisMethod === 'FIFO') return a.timestamp - b.timestamp;
        if (costBasisMethod === 'LIFO') return b.timestamp - a.timestamp;
        return b.costBasis / b.amount - a.costBasis / a.amount; // HIFO
      });

      for (const h of sortedHoldings) {
        if (remaining <= 0) break;

        const used = Math.min(remaining, h.amount);
        totalCostBasis += (h.costBasis / h.amount) * used;
        h.amount -= used;
        remaining -= used;
      }

      // Remove empty holdings
      holdings[tx.token] = tokenHoldings.filter((h) => h.amount > 0);

      const gain = tx.usdValue - totalCostBasis;
      const _isLongTerm = sortedHoldings.some(
        (h) => Date.now() - h.timestamp > 365 * 24 * 60 * 60 * 1000
      );

      events.push({
        id: tx.id,
        type: gain >= 0 ? 'capital-gain' : 'capital-loss',
        amount: tx.usdValue,
        costBasis: totalCostBasis,
        gain,
        timestamp: tx.timestamp,
        txHash: tx.txHash || '',
        token: tx.token,
      });
    } else if (tx.type === 'fee') {
      events.push({
        id: tx.id,
        type: 'fee',
        amount: tx.usdValue,
        timestamp: tx.timestamp,
        txHash: tx.txHash || '',
        token: tx.token,
      });
    }
  }

  return events;
}

export function summarizeTaxYear(
  events: TaxEvent[],
  year: number = new Date().getFullYear()
): TaxSummary {
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();

  const yearEvents = events.filter(
    (e) => e.timestamp >= yearStart && e.timestamp < yearEnd
  );

  const gains = yearEvents.filter((e) => e.type === 'capital-gain' && (e.gain || 0) > 0);
  const losses = yearEvents.filter(
    (e) => e.type === 'capital-loss' || (e.type === 'capital-gain' && (e.gain || 0) < 0)
  );

  // Simplified - assumes all short-term for demo
  const shortTermGains = gains.reduce((sum, e) => sum + (e.gain || 0), 0);
  const longTermGains = 0;
  const totalLosses = Math.abs(losses.reduce((sum, e) => sum + (e.gain || 0), 0));

  return {
    shortTermGains,
    longTermGains,
    totalLosses,
    netGain: shortTermGains + longTermGains - totalLosses,
    harvestingOpportunities: [], // Would analyze current holdings
  };
}

// ============================================================================
// React Hook
// ============================================================================

export function useFinancialIntelligence(userAddress: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userAddress) {
      setLoading(false);
      return;
    }

    // Load data from storage/API
    const loadData = async () => {
      try {
        // In production, fetch from API/indexer
        const storedTx = localStorage.getItem(`vfide-tx-${userAddress}`);
        const storedHoldings = localStorage.getItem(`vfide-holdings-${userAddress}`);
        const storedBudgets = localStorage.getItem(`vfide-budgets-${userAddress}`);

        if (storedTx) setTransactions(JSON.parse(storedTx));
        if (storedHoldings) setHoldings(JSON.parse(storedHoldings));
        if (storedBudgets) setBudgets(JSON.parse(storedBudgets));
      } catch (error) {
        console.error('Failed to load financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userAddress]);

  const spendingByCategory = useMemo(
    () => analyzeSpending(transactions, 'month'),
    [transactions]
  );

  const dailySpending = useMemo(
    () => calculateDailySpending(transactions, 30),
    [transactions]
  );

  const financialHealth = useMemo(
    () => assessFinancialHealth(transactions, holdings),
    [transactions, holdings]
  );

  const taxEvents = useMemo(
    () => calculateTaxEvents(transactions),
    [transactions]
  );

  const taxSummary = useMemo(
    () => summarizeTaxYear(taxEvents),
    [taxEvents]
  );

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => {
      const updated = [...prev, tx];
      localStorage.setItem(`vfide-tx-${userAddress}`, JSON.stringify(updated));
      return updated;
    });
  }, [userAddress]);

  const updateHoldings = useCallback((newHoldings: TokenHolding[]) => {
    setHoldings(newHoldings);
    localStorage.setItem(`vfide-holdings-${userAddress}`, JSON.stringify(newHoldings));
  }, [userAddress]);

  const setBudget = useCallback((budget: Budget) => {
    setBudgets((prev) => {
      const existing = prev.findIndex((b) => b.id === budget.id);
      const updated = existing >= 0
        ? prev.map((b) => (b.id === budget.id ? budget : b))
        : [...prev, budget];
      localStorage.setItem(`vfide-budgets-${userAddress}`, JSON.stringify(updated));
      return updated;
    });
  }, [userAddress]);

  const checkBudgetAlert = useCallback((category: string): Budget | null => {
    const budget = budgets.find((b) => b.category === category && b.alerts);
    if (!budget) return null;

    if (budget.spent >= budget.limit * 0.9) {
      return budget;
    }
    return null;
  }, [budgets]);

  return {
    loading,
    transactions,
    holdings,
    budgets,
    spendingByCategory,
    dailySpending,
    financialHealth,
    taxEvents,
    taxSummary,
    addTransaction,
    updateHoldings,
    setBudget,
    checkBudgetAlert,
  };
}

export default useFinancialIntelligence;
