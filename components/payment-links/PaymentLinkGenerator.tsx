'use client';
import { useState } from 'react';
import { Link2, Copy, Check, Send, MessageCircle, QrCode } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export function PaymentLinkGenerator({ merchantSlug, merchantName }: { merchantSlug: string; merchantName: string; }) {
  const { formatCurrency } = useLocale();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.io';
  const link = amount ? `${baseUrl}/pay/${merchantSlug}?amount=${amount}${description ? `&desc=${encodeURIComponent(description)}` : ''}` : '';
  const copy = () => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Pay ${merchantName} ${formatCurrency(parseFloat(amount))}: ${link}`)}`, '_blank');
  return (<div className="space-y-4">
    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Link2 className="text-cyan-400"/>Payment Links</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><label className="text-xs text-gray-500 mb-1 block">Amount</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" step="0.01" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-cyan-500/50 focus:outline-none"/></div>
      <div><label className="text-xs text-gray-500 mb-1 block">Description</label><input type="text" value={description} onChange={e=>setDescription(e.target.value)} placeholder="What's this for?" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"/></div>
    </div>
    {link&&<div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-gray-500 mb-1">Payment Link</div><div className="flex items-center gap-2"><code className="flex-1 text-cyan-400 text-sm truncate">{link}</code><button onClick={copy} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">{copied?<Check size={14} className="text-emerald-400"/>:<Copy size={14} className="text-gray-400"/>}</button></div></div>}
    {link&&<div className="flex gap-2"><button onClick={copy} className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl font-bold text-sm"><Copy size={16}/>Copy Link</button><button onClick={whatsapp} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold text-sm"><MessageCircle size={16}/>WhatsApp</button></div>}
  </div>);
}
