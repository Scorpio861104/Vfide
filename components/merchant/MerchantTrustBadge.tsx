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

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Shield, Zap, TrendingUp, Clock, CheckCircle2, Award } from 'lucide-react';
import { CONTRACT_ADDRESSES, MerchantPortalABI } from '@/lib/contracts';
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
  if (score >= 8000) return { label: 'ELITE', color: 'text-amber-400', bgColor: 'bg-amber-500/15 border-amber-500/30' };
  if (score >= 6000) return { label: 'TRUSTED', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/30' };
  if (score >= 4000) return { label: 'VERIFIED', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15 border-cyan-500/30' };
  if (score >= 2000) return { label: 'ACTIVE', color: 'text-blue-400', bgColor: 'bg-blue-500/15 border-blue-500/30' };
  return { label: 'NEW', color: 'text-gray-400', bgColor: 'bg-white/5 border-white/10' };
}

function getFeeRate(score: number): string {
  if (score <= 4000) return '5.00';
  if (score >= 8000) return '0.25';
  return (5.00 - ((score - 4000) * 4.75 / 4000)).toFixed(2);
}

export function MerchantTrustBadge({ merchantAddress, variant = 'full', className = '' }: MerchantTrustBadgeProps) {
  // Read ProofScore from Seer contract
  const { data: scoreData } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'getScore',
    args: [merchantAddress],
    query: { enabled: CONTRACT_ADDRESSES.Seer !== '0x0000000000000000000000000000000000000000' },
  });

  // Read merchant info from MerchantPortal
  const { data: merchantInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MerchantPortalABI,
    functionName: 'getMerchantInfo',
    args: [merchantAddress],
    query: { enabled: CONTRACT_ADDRESSES.MerchantPortal !== '0x0000000000000000000000000000000000000000' },
  });

  const info = useMemo(() => {
    const rawScore = scoreData ? safeBigIntToNumber(scoreData as bigint, 0) : 0;
    const score = Math.min(rawScore, 10000);
    const tier = getScoreTier(score);
    const feeRate = getFeeRate(score);

    // merchantInfo: (registered, suspended, businessName, category, registeredAt, totalVolume, txCount)
    const mInfo = merchantInfo as [boolean, boolean, string, string, bigint, bigint, bigint] | undefined;
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
    <motion.div
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
          <Zap size={16} className="text-cyan-400" />
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
    </motion.div>
  );
}
