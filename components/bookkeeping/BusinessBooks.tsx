'use client';

import { useMemo, useState } from 'react';
import { Download, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { exportCSV } from '@/components/export/csv-export';

export interface BookTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: number;
  source: 'auto' | 'manual';
}

interface BusinessBooksProps {
  transactions?: BookTransaction[];
  onAddExpense?: (expense: Omit<BookTransaction, 'id' | 'source'>) => void;
}

const PERIODS = ['month', 'quarter', 'year'] as const;
const EXPENSE_CATS = [
  'Supplies',
  'Inventory/COGS',
  'Rent',
  'Utilities',
  'Marketing',
  'Transport',
  'Equipment',
  'Insurance',
  'Professional Services',
  'Phone/Internet',
  'Other',
];
const DEFAULT_EXPENSE_CATEGORY = EXPENSE_CATS[0] ?? 'Other';

export function BusinessBooks({ transactions = [], onAddExpense }: BusinessBooksProps) {
  const { formatCurrency, formatDate } = useLocale();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('month');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    category: DEFAULT_EXPENSE_CATEGORY,
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const periodStart = useMemo(() => {
    const now = new Date();

    if (period === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    }

    if (period === 'quarter') {
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    }

    return new Date(now.getFullYear(), 0, 1).getTime();
  }, [period]);

  const periodTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date >= periodStart),
    [transactions, periodStart],
  );

  const income = periodTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = periodTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const profit = income - expenses;
  const margin = income > 0 ? (profit / income) * 100 : 0;

  const resetForm = () => {
    setForm({
      amount: '',
      category: DEFAULT_EXPENSE_CATEGORY,
      description: '',
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const handleAdd = () => {
    if (!form.amount || !form.description) {
      return;
    }

    onAddExpense?.({
      type: 'expense',
      amount: Number.parseFloat(form.amount),
      category: form.category || DEFAULT_EXPENSE_CATEGORY,
      description: form.description,
      date: new Date(form.date).getTime(),
    });

    setShowAdd(false);
    resetForm();
  };

  const handleExport = () => {
    exportCSV({
      filename: `vfide-books-${period}`,
      headers: ['Date', 'Type', 'Category', 'Description', 'Amount'],
      rows: periodTransactions.map((transaction) => [
        formatDate(transaction.date, 'short'),
        transaction.type,
        transaction.category,
        transaction.description,
        transaction.type === 'expense' ? -transaction.amount : transaction.amount,
      ]),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((currentPeriod) => (
            <button
              key={currentPeriod}
              onClick={() => setPeriod(currentPeriod)}
              className={`rounded-xl border px-3 py-2 text-sm font-bold capitalize transition-colors ${
                period === currentPeriod
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-400'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              This {currentPeriod}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-gray-400"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => setShowAdd((value) => !value)}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/20 px-3 py-2 text-sm font-bold text-cyan-400"
          >
            <Plus size={14} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <div className="mb-1 text-xs text-gray-400">Revenue</div>
          <div className="font-mono text-xl font-bold text-emerald-400">{formatCurrency(income)}</div>
        </div>
        <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
          <div className="mb-1 text-xs text-gray-400">Expenses</div>
          <div className="font-mono text-xl font-bold text-red-400">{formatCurrency(expenses)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-1 text-xs text-gray-400">Profit</div>
          <div className={`font-mono text-xl font-bold ${profit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {formatCurrency(profit)}
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4">
          <div className="mb-1 text-xs text-gray-400">Margin</div>
          <div className="text-xl font-bold text-cyan-400">{margin.toFixed(1)}%</div>
        </div>
      </div>

      {showAdd && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              placeholder="Amount"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
            />
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
            >
              {EXPENSE_CATS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What for?"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-xl border border-white/10 py-2.5 font-bold text-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.amount || !form.description}
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 font-bold text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/3 p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">Recent</h3>
        <div className="space-y-2">
          {periodTransactions.slice(0, 15).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between border-b border-white/5 py-2 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  {transaction.type === 'income' ? (
                    <TrendingUp size={14} className="text-emerald-400" />
                  ) : (
                    <TrendingDown size={14} className="text-red-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm text-white">{transaction.description}</div>
                  <div className="text-xs text-gray-500">{transaction.category}</div>
                </div>
              </div>
              <span
                className={`font-mono text-sm font-bold ${
                  transaction.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

