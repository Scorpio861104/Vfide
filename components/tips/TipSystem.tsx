'use client';
import { useState } from 'react';
import { Heart, DollarSign } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export function TipSelector({ baseAmount, onTipSelected }: { baseAmount: number; onTipSelected: (tip: number) => void; }) {
  const { formatCurrency } = useLocale();
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState<number|null>(null);
  const presets = [10, 15, 20, 25];
  const handleSelect = (pct: number) => { setSelected(pct); setCustom(''); onTipSelected(baseAmount * pct / 100); };
  const handleCustom = (val: string) => { setCustom(val); setSelected(null); const n = parseFloat(val); if (!isNaN(n)) onTipSelected(n); };
  return (<div className="space-y-3"><div className="text-sm text-gray-400 mb-1">Add a tip</div><div className="grid grid-cols-4 gap-2">{presets.map(p=>(<button key={p} onClick={()=>handleSelect(p)} className={`py-2.5 rounded-xl text-sm font-bold ${selected===p?'bg-pink-500/20 text-pink-400 border border-pink-500/30':'bg-white/5 text-gray-400 border border-white/10'}`}>{p}%<div className="text-xs opacity-70">{formatCurrency(baseAmount*p/100)}</div></button>))}</div><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/><input type="number" value={custom} onChange={e => handleCustom(e.target.value)} placeholder="Custom amount" className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-pink-500/50 focus:outline-none"/></div>{(selected||custom)&&<div className="text-center text-pink-400 font-bold">Tip: {formatCurrency(selected?baseAmount*selected/100:parseFloat(custom)||0)}</div>}</div>);
}
