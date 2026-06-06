'use client';

/**
 * MerchantTrustBadge — On-chain trust signals for merchant storefronts
 * 
 * Displays:
 * - ProofScore from Seer contract
 * - Transaction count from MerchantPortal
 * - Time since registration
 * - Verification status
 * - Fee tier (lower = more trusted)
 * 
 * Use on /store/[slug] pages and merchant directory cards
 */

'use client';

import { getTier } from '@/lib/proofScore/tiers';
import { getFeeRate } from '@/lib/format';
import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatDistanceToNow } from 'date-fns';
import { m } from 'framer-motion';
import { Shield, Zap, TrendingUp, Clock, CheckCircle2, Award } from 'lucide-react';
import { CONTRACT_ADDRESSES, MerchantPortalABI, isConfiguredContractAddress } from '@/lib/contracts';
import { SeerABI } from '@/lib/abis';
import { safeBigIntToNumber } from '@/lib/validation';
import { formatEther } from 'viem';

interface MerchantTrustBadgeProps {
  merchantAddress: `0x${string}`;
  /** Compact mode for directory cards, full mode for storefront headers */
  variant?: 'compact' | 'full';
  className?: string;
}

function getScoreTier(score: number): { label: string; color: string; bgColor: string } {
  const t = getTier(score);
  const styles: Record<string, { color: string; bgColor: string }> = { 'Risky': { color: 'text-red-400', bgColor: 'bg-red-500/15 border-red-500/30' }, 'Low Trust': { color: 'text-yellow-400', bgColor: 'bg-yellow-500/15 border-yellow-500/30' }, 'Neutral': { color: 'text-blue-400', bgColor: 'bg-blue-500/15 border-blue-500/30' }, 'Governance': { color: 'text-accent', bgColor: 'bg-accent/15 border-accent/30' }, 'Trusted': { color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/30' }, 'Council': { color: 'text-purple-400', bgColor: 'bg-purple-500/15 border-purple-500/30' }, 'Elite': { color: 'text-amber-400', bgColor: 'bg-amber-500/15 border-amber-500/30' } };
  const s = styles[t.name] ?? { color: 'text-zinc-400', bgColor: 'bg-zinc-500/15 border-zinc-500/30' };
  return { label: t.name.toUpperCase(), color: s.color, bgColor: s.bgColor };
}



export function MerchantTrustBadge({ merchantAddress, variant = 'full', className = '' }: MerchantTrustBadgeProps) {
  const isSeerAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)
  const isMerchantPortalAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)

  // Read ProofScore from Seer contract
  const { data: scoreData } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScore',
    args: [merchantAddress],
    query: { enabled: isSeerAvailable },
  });

  // Read merchant info from MerchantPortal
  const { data: merchantInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'merchants',
    args: [merchantAddress],
    query: { enabled: isMerchantPortalAvailable },
  });

  const info = useMemo(() => {
    const rawScore = scoreData ? safeBigIntToNumber(scoreData as bigint, 0) : 0;
    const score = Math.min(rawScore, 10000);
    const tier = getScoreTier(score);
    const feeRate = getFeeRate(score);

    // merchants() returns: (registered, suspended, businessName, category, registeredAt, totalVolume, txCount, payoutAddress)
    const mInfo = merchantInfo as [boolean, boolean, string, string, bigint, bigint, bigint, `0x${string}`] | undefined;
    const isRegistered = mInfo?.[0] || false;
    const registeredAt = mInfo?.[4] ? safeBigIntToNumber(mInfo[4], 0) : 0;
    const totalVolume = mInfo?.[5] ? formatEther(mInfo[5]) : '0';
    const txCount = mInfo?.[6] ? safeBigIntToNumber(mInfo[6], 0) : 0;
    const registeredDate = registeredAt > 0 ? new Date(registeredAt * 1000) : null;
    const memberSince = registeredDate ? formatDistanceToNow(registeredDate, { addSuffix: false }) : null;

    return { score, tier, feeRate, isRegistered, totalVolume, txCount, memberSince };
  }, [scoreData, merchantInfo]);

  if (!info.isRegistered && !scoreData) return null;

  // ── Compact variant (for directory cards) ───────────────────────────────
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded border ${info.tier.bgColor} ${info.tier.color}`}>
          <Shield size={10} />
          {info.score > 0 ? info.score : '—'}
        </span>
        {info.txCount > 0 && (
          <span className="text-xs text-gray-400">{info.txCount} tx</span>
        )}
        <span className="text-xs text-emerald-400">{info.feeRate}% fee</span>
      </div>
    );
  }

  // ── Full variant (for storefront headers) ───────────────────────────────
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/3 backdrop-blur-xl border border-white/10 rounded-2xl p-4 ${className}`}
    >
      {/* Trust tier badge */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`px-3 py-1.5 rounded-xl border ${info.tier.bgColor} ${info.tier.color} font-bold text-sm flex items-center gap-1.5`}>
          <Shield size={14} />
          {info.tier.label}
        </div>
        <div className="text-white font-mono text-lg font-bold flex items-center gap-1">
          <Zap size={16} className="text-accent" />
          {info.score > 0 ? info.score.toLocaleString() : '—'}
          <span className="text-xs text-gray-500 font-normal ml-1">ProofScore</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/3 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingUp size={10} /> Transactions</div>
          <div className="text-white font-bold">{info.txCount > 0 ? info.txCount.toLocaleString() : '0'}</div>
        </div>
        <div className="bg-white/3 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Award size={10} /> Volume</div>
          <div className="text-white font-bold">{parseFloat(info.totalVolume) > 0 ? `${parseFloat(info.totalVolume).toFixed(0)} VFIDE` : '—'}</div>
        </div>
        <div className="bg-white/3 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Zap size={10} /> Buyer fee</div>
          <div className="text-emerald-400 font-bold">{info.feeRate}%</div>
        </div>
        <div className="bg-white/3 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={10} /> Member</div>
          <div className="text-white font-bold text-sm">{info.memberSince || '—'}</div>
        </div>
      </div>

      {/* What the fee means */}
      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
        <CheckCircle2 size={10} className="text-emerald-400" />
        Merchant pays $0 — buyers pay {info.feeRate}% burn fee + gas
      </div>
    </m.div>
  );
}
