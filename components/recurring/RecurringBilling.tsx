'use client';
import { useState, useMemo } from 'react';
import { RefreshCw, Plus, Clock, Check, Pause, Play, X } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export interface Subscription { id: string; customerName: string; customerAddress: string; amount: number; interval: 'weekly'|'biweekly'|'monthly'; description: string; status: 'active'|'paused'|'cancelled'; nextBillingAt: number; createdAt: number; }

export function RecurringBilling({ subscriptions = [], onPause, onResume, onCancel }: { subscriptions: Subscription[]; onPause?: (id: string) => void; onResume?: (id: string) => void; onCancel?: (id: string) => void; }) {
  const { formatCurrency, formatDate } = useLocale();
  const stats = useMemo(() => ({ active: subscriptions.filter(s=>s.status==='active').length, mrr: subscriptions.filter(s=>s.status==='active').reduce((s,sub)=>s+sub.amount*(sub.interval==='weekly'?4:sub.interval==='biweekly'?2:1),0) }), [subscriptions]);
  return (<div className="space-y-6">
    <div className="grid grid-cols-2 gap-4"><div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-4"><div className="text-gray-400 text-xs mb-1">Active Subscriptions</div><div className="text-cyan-400 font-bold text-lg">{stats.active}</div></div><div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4"><div className="text-gray-400 text-xs mb-1">Monthly Recurring</div><div className="text-emerald-400 font-bold text-lg font-mono">{formatCurrency(stats.mrr)}</div></div></div>
    <div className="space-y-2">{subscriptions.map(sub=>(<div key={sub.id} className="p-4 bg-white/3 border border-white/5 rounded-xl"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><RefreshCw size={16} className="text-cyan-400"/><span className="text-white font-medium text-sm">{sub.customerName}</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${sub.status==='active'?'bg-emerald-500/20 text-emerald-400':sub.status==='paused'?'bg-amber-500/20 text-amber-400':'bg-gray-500/20 text-gray-500'} capitalize`}>{sub.status}</span></div><span className="text-cyan-400 font-mono font-bold">{formatCurrency(sub.amount)}/{sub.interval}</span></div><div className="text-gray-500 text-xs mb-2">{sub.description} · Next: {formatDate(sub.nextBillingAt,'short')}</div>{sub.status==='active'&&<button onClick={()=>onPause?.(sub.id)} className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold">Pause</button>}{sub.status==='paused'&&<button onClick={()=>onResume?.(sub.id)} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">Resume</button>}</div>))}</div>
  </div>);
}
