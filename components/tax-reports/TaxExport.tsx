'use client';
import { useState, useMemo } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { exportCSV } from '@/components/export/csv-export';

export function TaxExport({ transactions = [], year }: { transactions: { date: number; type: string; category: string; amount: number; description: string; }[]; year?: number; }) {
  const { formatCurrency } = useLocale();
  const currentYear = year || new Date().getFullYear();
  const yearTx = useMemo(() => transactions.filter(t => new Date(t.date).getFullYear() === currentYear), [transactions, currentYear]);
  const income = yearTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = yearTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;
  const byCategory = useMemo(() => { const cats: Record<string, number> = {}; yearTx.filter(t => t.type === 'expense').forEach(t => cats[t.category] = (cats[t.category] || 0) + t.amount); return Object.entries(cats).sort((a, b) => b[1] - a[1]); }, [yearTx]);
  const handleExport = () => exportCSV({ filename: `vfide-tax-${currentYear}`, headers: ['Date','Type','Category','Description','Amount'], rows: yearTx.map(t => [new Date(t.date).toISOString().slice(0,10), t.type, t.category, t.description, t.type==='expense'?-t.amount:t.amount]) });
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="text-cyan-400"/>Tax Report — {currentYear}</h2><button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm font-bold"><Download size={14}/>Export CSV</button></div>
    <div className="grid grid-cols-3 gap-4"><div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4"><div className="text-gray-400 text-xs mb-1">Total Income</div><div className="text-emerald-400 font-bold text-lg font-mono">{formatCurrency(income)}</div></div><div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4"><div className="text-gray-400 text-xs mb-1">Total Expenses</div><div className="text-red-400 font-bold text-lg font-mono">{formatCurrency(expenses)}</div></div><div className={`${net>=0?'bg-emerald-500/5 border-emerald-500/15':'bg-red-500/5 border-red-500/15'} border rounded-xl p-4`}><div className="text-gray-400 text-xs mb-1">Net Income</div><div className={`${net>=0?'text-emerald-400':'text-red-400'} font-bold text-lg font-mono`}>{formatCurrency(net)}</div></div></div>
    <div className="bg-white/3 border border-white/10 rounded-xl p-5"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Expense Categories</h3><div className="space-y-2">{byCategory.map(([cat,amt])=>(<div key={cat} className="flex justify-between py-2 border-b border-white/5 last:border-0"><span className="text-gray-300 text-sm">{cat}</span><span className="text-white font-mono text-sm">{formatCurrency(amt)}</span></div>))}</div></div>
    <p className="text-gray-600 text-xs text-center">This is not tax advice. Consult a tax professional. Export this data for your accountant.</p>
  </div>);
}
