'use client';
import { useState, useMemo } from 'react';
import { Package, AlertTriangle, Search, Plus, Minus } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export interface InventoryItem { id: string; productId: string; productName: string; sku: string; currentStock: number; lowStockThreshold: number; costPerUnit: number; variant?: string; }

export function InventoryManager({ items = [], onAdjustStock }: { items: InventoryItem[]; onAdjustStock?: (itemId: string, adjustment: number, reason: string) => void; }) {
  const { formatCurrency } = useLocale();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const stats = useMemo(() => ({ total: items.length, value: items.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0), low: items.filter(i => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold).length, out: items.filter(i => i.currentStock === 0).length }), [items]);
  const filtered = useMemo(() => { let r = items; if (search) r = r.filter(i => i.productName.toLowerCase().includes(search.toLowerCase())); if (filter === 'low') r = r.filter(i => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold); if (filter === 'out') r = r.filter(i => i.currentStock === 0); return r; }, [items, search, filter]);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-4"><div className="text-gray-400 text-xs mb-1">Products</div><div className="text-cyan-400 font-bold text-lg">{stats.total}</div></div>
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4"><div className="text-gray-400 text-xs mb-1">Inventory Value</div><div className="text-emerald-400 font-bold text-lg font-mono">{formatCurrency(stats.value)}</div></div>
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4"><div className="text-gray-400 text-xs mb-1">Low Stock</div><div className="text-amber-400 font-bold text-lg">{stats.low}</div></div>
        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4"><div className="text-gray-400 text-xs mb-1">Out of Stock</div><div className="text-red-400 font-bold text-lg">{stats.out}</div></div>
      </div>
      <div className="flex gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none" /></div>
      {(['all','low','out'] as const).map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-xl text-xs font-bold capitalize ${filter===f?'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30':'bg-white/5 text-gray-400 border border-white/10'}`}>{f==='out'?'Out of Stock':f==='low'?'Low Stock':'All'}</button>))}</div>
      <div className="space-y-2">{filtered.map(item => (<div key={item.id} className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl"><div className="flex items-center gap-3">{item.currentStock===0?<AlertTriangle size={18} className="text-red-400"/>:item.currentStock<=item.lowStockThreshold?<AlertTriangle size={18} className="text-amber-400"/>:<Package size={18} className="text-emerald-400"/>}<div><div className="text-white font-medium text-sm">{item.productName}{item.variant?` — ${item.variant}`:''}</div><div className="text-gray-500 text-xs">SKU: {item.sku} · Cost: {formatCurrency(item.costPerUnit)}</div></div></div><div className="flex items-center gap-3"><span className={`font-mono font-bold text-sm ${item.currentStock===0?'text-red-400':item.currentStock<=item.lowStockThreshold?'text-amber-400':'text-white'}`}>{item.currentStock}</span><button onClick={()=>onAdjustStock?.(item.id,-1,'sold')} className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-red-400"><Minus size={14}/></button><button onClick={()=>onAdjustStock?.(item.id,1,'restock')} className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-emerald-400"><Plus size={14}/></button></div></div>))}</div>
      {filtered.length===0&&<div className="text-center py-12"><Package size={48} className="mx-auto mb-4 text-gray-600"/><p className="text-gray-400">No inventory items</p></div>}
    </div>);
}
