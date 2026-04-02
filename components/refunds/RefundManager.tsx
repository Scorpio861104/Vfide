'use client';
import { useState, useMemo } from 'react';
import { RotateCcw, Clock, Check, X } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export interface RefundRequest { id: string; orderId: string; customerName: string; amount: number; reason: string; status: 'pending'|'approved'|'processed'|'rejected'; type: 'full'|'partial'; createdAt: number; }

export function RefundManager({ requests = [], onApprove, onReject, onProcess }: { requests: RefundRequest[]; onApprove?: (id: string) => void; onReject?: (id: string) => void; onProcess?: (id: string) => void; }) {
  const { formatCurrency, formatDate } = useLocale();
  const [filter, setFilter] = useState<'all'|'pending'|'processed'>('all');
  const filtered = useMemo(() => filter==='all'?requests:requests.filter(r=>r.status===filter),[requests,filter]);
  const colors: Record<string,string> = {pending:'amber',approved:'cyan',processed:'emerald',rejected:'red'};
  return (<div className="space-y-6">
    <div className="flex gap-2">{(['all','pending','processed'] as const).map(f=>(<button key={f} onClick={()=>setFilter(f)} className={`px-3 py-2 rounded-xl text-xs font-bold capitalize ${filter===f?'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30':'bg-white/5 text-gray-400 border border-white/10'}`}>{f}</button>))}</div>
    <div className="space-y-2">{filtered.map(req=>(<div key={req.id} className="p-4 bg-white/3 border border-white/5 rounded-xl"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><RotateCcw size={16} className="text-gray-400"/><span className="text-white font-medium text-sm">{req.customerName}</span><span className={`px-2 py-0.5 rounded text-xs font-bold bg-${colors[req.status]}-500/20 text-${colors[req.status]}-400 capitalize`}>{req.status}</span></div><span className="text-cyan-400 font-mono font-bold">{formatCurrency(req.amount)}</span></div><p className="text-gray-500 text-xs mb-2">{req.reason}</p>{req.status==='pending'&&<div className="flex gap-2"><button onClick={()=>onApprove?.(req.id)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">Approve</button><button onClick={()=>onReject?.(req.id)} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold">Reject</button></div>}</div>))}</div>
    {filtered.length===0&&<div className="text-center py-12"><RotateCcw size={48} className="mx-auto mb-4 text-gray-600"/><p className="text-gray-400">No refund requests</p></div>}
  </div>);
}
