'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ReceiptText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';
import { BusinessBooks, type BookTransaction } from '@/components/bookkeeping/BusinessBooks';

interface ExpenseRecord {
  id: number;
  amount: number;
  currency: string;
  category: string;
  description: string;
  expenseDate: string;
  createdAt: number;
}

interface RevenuePoint {
  date: string;
  amount: number;
}

interface ExpenseSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
  orderCount: number;
  topCategories: Array<{ category: string; amount: number }>;
}

const EMPTY_SUMMARY: ExpenseSummary = {
  revenue: 0,
  expenses: 0,
  netProfit: 0,
  margin: 0,
  orderCount: 0,
  topCategories: [],
};

function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function MerchantExpensesPage() {
  const { address } = useAccount();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>(EMPTY_SUMMARY);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!address) {
      setExpenses([]);
      setRevenueSeries([]);
      setSummary(EMPTY_SUMMARY);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/merchant/expenses');
      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load merchant books');
      }

      setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      setRevenueSeries(Array.isArray(data.revenueSeries) ? data.revenueSeries : []);
      setSummary(data.summary ? {
        ...EMPTY_SUMMARY,
        ...data.summary,
        topCategories: Array.isArray(data.summary.topCategories) ? data.summary.topCategories : [],
      } : EMPTY_SUMMARY);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load merchant books');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAddExpense = useCallback(async (expense: Omit<BookTransaction, 'id' | 'source'>) => {
    try {
      const response = await fetch('/api/merchant/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          expenseDate: new Date(expense.date).toISOString().slice(0, 10),
        }),
      });
      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save expense');
    }
  }, [loadData]);

  const categories = useMemo(() => [
    'all',
    ...Array.from(new Set(expenses.map((expense) => expense.category))).sort(),
  ], [expenses]);

  const filteredExpenses = useMemo(() => (
    selectedCategory === 'all'
      ? expenses
      : expenses.filter((expense) => expense.category === selectedCategory)
  ), [expenses, selectedCategory]);

  const transactions = useMemo<BookTransaction[]>(() => {
    const incomeTransactions: BookTransaction[] = revenueSeries.map((point) => ({
      id: `revenue-${point.date}`,
      type: 'income',
      amount: Number(point.amount || 0),
      category: 'Sales',
      description: `Storefront revenue on ${point.date}`,
      date: new Date(`${point.date}T00:00:00Z`).getTime(),
      source: 'auto',
    }));

    const expenseTransactions: BookTransaction[] = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      type: 'expense',
      amount: Number(expense.amount || 0),
      category: expense.category,
      description: expense.description || 'Expense entry',
      date: new Date(`${expense.expenseDate}T00:00:00Z`).getTime(),
      source: 'manual',
    }));

    return [...incomeTransactions, ...expenseTransactions].sort((a, b) => b.date - a.date);
  }, [expenses, revenueSeries]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                <Wallet size={14} /> Expense tracking &amp; P&amp;L
              </div>
              <h1 className="text-4xl font-bold">Keep your books current from the merchant hub</h1>
              <p className="mt-3 max-w-3xl text-gray-400">
                Log daily operating costs, monitor revenue against expenses, and keep a simple profit-and-loss view without leaving VFIDE.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to manage expenses and profit tracking.
              </div>
            ) : loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="mb-1 text-xs text-gray-400">Revenue</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatMoney(summary.revenue)}</div>
                    <div className="mt-1 text-xs text-gray-500">{summary.orderCount} paid orders tracked</div>
                  </div>
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="mb-1 text-xs text-gray-400">Operating Expenses</div>
                    <div className="text-2xl font-bold text-red-400">{formatMoney(summary.expenses)}</div>
                    <div className="mt-1 text-xs text-gray-500">Manual book entries</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-1 text-xs text-gray-400">Net Profit</div>
                    <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {formatMoney(summary.netProfit)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Revenue minus expenses</div>
                  </div>
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <div className="mb-1 text-xs text-gray-400">Profit Margin</div>
                    <div className="text-2xl font-bold text-cyan-400">{summary.margin.toFixed(1)}%</div>
                    <div className="mt-1 text-xs text-gray-500">Current period view</div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                        <ReceiptText size={18} className="text-cyan-400" /> Business books
                      </div>
                      <BusinessBooks transactions={transactions} onAddExpense={handleAddExpense} />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold">Expense list</h2>
                        <select
                          value={selectedCategory}
                          onChange={(event) =>  setSelectedCategory(event.target.value)}
                          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category === 'all' ? 'All categories' : category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        {filteredExpenses.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                            No expenses logged yet for this filter.
                          </div>
                        ) : filteredExpenses.map((expense) => (
                          <div key={expense.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{expense.description || 'Expense entry'}</div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {expense.category} • {expense.expenseDate}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm font-bold text-red-400">-{formatMoney(expense.amount, expense.currency)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <h2 className="mb-4 text-lg font-bold">Top expense categories</h2>
                      <div className="space-y-3">
                        {summary.topCategories.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                            Add a few expense entries to see the biggest cost drivers.
                          </div>
                        ) : summary.topCategories.map((category) => (
                          <div key={category.category} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              {category.amount > 0 ? (
                                <TrendingDown size={14} className="text-red-400" />
                              ) : (
                                <TrendingUp size={14} className="text-emerald-400" />
                              )}
                              <span>{category.category}</span>
                            </div>
                            <span className="font-mono text-sm text-white">{formatMoney(category.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
