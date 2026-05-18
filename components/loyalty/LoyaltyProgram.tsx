'use client';
import { useState } from 'react';
import { Heart, Star, Gift, Edit2 } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export interface LoyaltyTier { id: string; name: string; minPurchases: number; discountPercent: number; perks: string[]; color: string; }
export interface LoyaltyConfig { enabled: boolean; programName: string; tiers: LoyaltyTier[]; pointsPerDollar: number; redeemThreshold: number; redeemValue: number; }

const DEFAULT_TIERS: LoyaltyTier[] = [
  { id: '1', name: 'Bronze', minPurchases: 1, discountPercent: 0, perks: ['Welcome bonus'], color: 'amber' },
  { id: '2', name: 'Silver', minPurchases: 5, discountPercent: 5, perks: ['5% discount', 'Early access'], color: 'gray' },
  { id: '3', name: 'Gold', minPurchases: 15, discountPercent: 10, perks: ['10% discount', 'Free shipping'], color: 'yellow' },
  { id: '4', name: 'Platinum', minPurchases: 30, discountPercent: 15, perks: ['15% discount', 'VIP access', 'Birthday reward'], color: 'purple' },
];

export function LoyaltyProgram({ config, memberCount = 0, onUpdateConfig }: { config?: LoyaltyConfig; memberCount?: number; onUpdateConfig?: (c: LoyaltyConfig) => void; }) {
  const { formatCurrency } = useLocale();
  const cfg = config || { enabled: true, programName: 'Rewards', tiers: DEFAULT_TIERS, pointsPerDollar: 1, redeemThreshold: 100, redeemValue: 5 };
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Heart className="text-pink-400"/>{cfg.programName}</h2><p className="text-gray-400 text-sm">{memberCount} members</p></div><div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${cfg.enabled?'bg-emerald-500/20 text-emerald-400':'bg-gray-500/20 text-gray-400'}`}>{cfg.enabled?'Active':'Disabled'}</div></div>
    <div className="bg-white/3 border border-white/10 rounded-xl p-5"><div className="grid grid-cols-3 gap-6 text-center"><div><div className="text-gray-400 text-xs mb-1">Points per $1</div><div className="text-white font-bold text-lg">{cfg.pointsPerDollar}</div></div><div><div className="text-gray-400 text-xs mb-1">Redeem at</div><div className="text-white font-bold text-lg">{cfg.redeemThreshold} pts</div></div><div><div className="text-gray-400 text-xs mb-1">Reward</div><div className="text-cyan-400 font-bold text-lg">{formatCurrency(cfg.redeemValue)}</div></div></div></div>
    <div className="space-y-3">{cfg.tiers.map(tier=>(<div key={tier.id} className={`bg-${tier.color}-500/5 border border-${tier.color}-500/15 rounded-xl p-4`}><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Star size={16} className={`text-${tier.color}-400`}/><span className="text-white font-bold">{tier.name}</span></div><span className="text-gray-400 text-sm">{tier.minPurchases}+ purchases</span></div>{tier.discountPercent>0&&<div className="text-emerald-400 text-sm font-bold mb-1">{tier.discountPercent}% discount</div>}<div className="flex flex-wrap gap-1.5">{tier.perks.map(p=>(<span key={p} className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">{p}</span>))}</div></div>))}</div>
  </div>);
}
