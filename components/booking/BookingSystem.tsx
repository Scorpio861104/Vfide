'use client';
import { useState, useMemo } from 'react';
import { Calendar, Clock, User, Plus, Check, X } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export interface TimeSlot { id: string; dayOfWeek: number; startTime: string; endTime: string; available: boolean; }
export interface Booking { id: string; customerName: string; customerPhone?: string; service: string; date: number; startTime: string; endTime: string; status: 'confirmed'|'pending'|'cancelled'|'completed'; notes?: string; price: number; }

export function BookingManager({ bookings = [], slots = [], onConfirm, onCancel, onComplete }: { bookings: Booking[]; slots: TimeSlot[]; onConfirm?: (id: string) => void; onCancel?: (id: string) => void; onComplete?: (id: string) => void; }) {
  const { formatCurrency, formatDate } = useLocale();
  const [view, setView] = useState<'upcoming'|'past'|'slots'>('upcoming');
  const now = Date.now();
  const upcoming = useMemo(() => bookings.filter(b => b.date >= now && b.status !== 'cancelled').sort((a,b) => a.date - b.date), [bookings, now]);
  const past = useMemo(() => bookings.filter(b => b.date < now || b.status === 'completed').sort((a,b) => b.date - a.date), [bookings, now]);
  const colors: Record<string,string> = { confirmed:'emerald', pending:'amber', cancelled:'red', completed:'cyan' };
  return (<div className="space-y-6">
    <div className="flex gap-2">{(['upcoming','past','slots'] as const).map(v=>(<button key={v} onClick={()=>setView(v)} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${view===v?'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30':'bg-white/5 text-gray-400 border border-white/10'}`}>{v}{v==='upcoming'&&upcoming.length>0?` (${upcoming.length})`:''}</button>))}</div>
    {view!=='slots'&&<div className="space-y-2">{(view==='upcoming'?upcoming:past).map(b=>(<div key={b.id} className="p-4 bg-white/3 border border-white/5 rounded-xl"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><User size={16} className="text-gray-400"/><span className="text-white font-medium text-sm">{b.customerName}</span><span className={`px-2 py-0.5 rounded text-xs font-bold bg-${colors[b.status]}-500/20 text-${colors[b.status]}-400 capitalize`}>{b.status}</span></div><span className="text-cyan-400 font-mono font-bold">{formatCurrency(b.price)}</span></div><div className="text-gray-500 text-xs">{b.service} · {formatDate(b.date,'medium')} · {b.startTime}–{b.endTime}</div>{b.status==='pending'&&<div className="flex gap-2 mt-2"><button onClick={()=>onConfirm?.(b.id)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">Confirm</button><button onClick={()=>onCancel?.(b.id)} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold">Cancel</button></div>}{b.status==='confirmed'&&<button onClick={()=>onComplete?.(b.id)} className="mt-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold">Mark Complete</button>}</div>))}</div>}
    {(view==='upcoming'&&upcoming.length===0)&&<div className="text-center py-12"><Calendar size={48} className="mx-auto mb-4 text-gray-600"/><p className="text-gray-400">No upcoming bookings</p></div>}
  </div>);
}
