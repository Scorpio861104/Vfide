/**
 * MerchantReview — ProofScore-weighted merchant reviews
 *
 * Reviews from trusted users (high ProofScore) carry more visual weight.
 * A score 8000 user's review has a prominent trust badge.
 * A score 4000 user's review is shown smaller with less emphasis.
 * Reviews are public, on-chain referenced, and tied to real transactions.
 *
 * CommunityBoard — Trending merchants and products
 *
 * Shows what's hot in the community: most-endorsed merchants,
 * fastest-growing ProofScores, most-purchased products.
 * Updated from on-chain data.
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Shield, Check, TrendingUp, ShoppingCart, Users, Award, Flame, ArrowRight, MessageCircle, ThumbsUp } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
//  MERCHANT REVIEW
// ═══════════════════════════════════════════════════════════════════════════

export interface ReviewData {
  id: string;
  reviewer: {
    address: string;
    name?: string;
    proofScore: number;
  };
  merchant: {
    address: string;
    name: string;
  };
  rating: number; // 1-5
  content: string;
  orderId?: string;
  verifiedPurchase: boolean;
  timestamp: number;
  helpful: number;
}

interface MerchantReviewProps {
  review: ReviewData;
  onHelpful?: (reviewId: string) => void;
}

function scoreWeight(score: number): 'high' | 'medium' | 'low' {
  if (score >= 7500) return 'high';
  if (score >= 5500) return 'medium';
  return 'low';
}

const WEIGHT_STYLES = {
  high: { border: 'border-emerald-500/15', bg: 'bg-emerald-500/3', badge: 'text-emerald-400', size: 'text-sm' },
  medium: { border: 'border-white/10', bg: 'bg-white/2', badge: 'text-cyan-400', size: 'text-sm' },
  low: { border: 'border-white/5', bg: 'bg-white/1', badge: 'text-gray-500', size: 'text-xs' },
};

export function MerchantReview({ review, onHelpful }: MerchantReviewProps) {
  const weight = scoreWeight(review.reviewer.proofScore);
  const styles = WEIGHT_STYLES[weight];
  const reviewerName = review.reviewer.name || `${review.reviewer.address.slice(0, 6)}...${review.reviewer.address.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 ${styles.bg} border ${styles.border} rounded-xl`}
    >
      <div className="flex items-start gap-2.5">
        <div className="shrink-0">
          {/* Stars */}
          <div className="flex gap-0.5 mb-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={12} fill={i < review.rating ? '#F59E0B' : 'none'} stroke={i < review.rating ? '#F59E0B' : 'rgba(255,255,255,0.15)'} />
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Reviewer info */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`font-medium ${styles.size} text-white`}>{reviewerName}</span>
            <span className={`flex items-center gap-0.5 text-[10px] ${styles.badge}`}>
              <Shield size={9} />{review.reviewer.proofScore.toLocaleString()}
            </span>
            {review.verifiedPurchase && (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                <Check size={9} />Verified
              </span>
            )}
          </div>

          {/* Review text */}
          <p className={`text-gray-400 ${styles.size} leading-relaxed`}>{review.content}</p>

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
            <span>{new Date(review.timestamp).toLocaleDateString()}</span>
            {onHelpful && (
              <button onClick={() => onHelpful(review.id)} className="flex items-center gap-0.5 hover:text-cyan-400 transition-colors">
                <ThumbsUp size={10} />{review.helpful > 0 ? review.helpful : ''} Helpful
              </button>
            )}
          </div>
        </div>
      </div>

      {/* High trust badge for weight=high reviews */}
      {weight === 'high' && (
        <div className="mt-2 pt-2 border-t border-emerald-500/10 flex items-center gap-1.5 text-[9px] text-emerald-400">
          <Award size={10} />Highly trusted reviewer — ProofScore in top tier
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  REVIEW SUMMARY — Aggregate score with ProofScore weighting
// ═══════════════════════════════════════════════════════════════════════════

interface ReviewSummaryProps {
  reviews: ReviewData[];
  merchantName: string;
}

export function ReviewSummary({ reviews, merchantName }: ReviewSummaryProps) {
  if (reviews.length === 0) return null;

  // ProofScore-weighted average: each review's weight = reviewer.proofScore / 10000
  let weightedSum = 0;
  let totalWeight = 0;
  for (const r of reviews) {
    const w = r.reviewer.proofScore / 10000;
    weightedSum += r.rating * w;
    totalWeight += w;
  }
  const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const verifiedCount = reviews.filter(r => r.verifiedPurchase).length;

  return (
    <div className="p-4 bg-white/3 border border-white/10 rounded-2xl">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{weightedAvg.toFixed(1)}</div>
          <div className="flex gap-0.5 justify-center my-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={14} fill={i < Math.round(weightedAvg) ? '#F59E0B' : 'none'} stroke={i < Math.round(weightedAvg) ? '#F59E0B' : 'rgba(255,255,255,0.15)'} />
            ))}
          </div>
          <div className="text-gray-500 text-xs">{reviews.length} reviews</div>
        </div>
        <div className="flex-1 text-xs text-gray-400">
          <p className="mb-1">Trust-weighted rating for <span className="text-white font-medium">{merchantName}</span></p>
          <p className="text-gray-600">{verifiedCount} verified purchases · Reviews from higher ProofScore users carry more weight</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMMUNITY BOARD — Trending merchants, products, and trust events
// ═══════════════════════════════════════════════════════════════════════════

interface TrendingMerchant {
  address: string;
  name: string;
  proofScore: number;
  sales7d: number;
  salesGrowth: number; // percentage
  topProduct?: string;
  endorsements7d: number;
}

interface TrendingProduct {
  id: string;
  name: string;
  merchant: string;
  merchantAddress: string;
  price: number;
  currency: string;
  purchases7d: number;
}

interface CommunityBoardProps {
  merchants: TrendingMerchant[];
  products: TrendingProduct[];
  onMerchant?: (address: string) => void;
  onProduct?: (id: string) => void;
}

export function CommunityBoard({ merchants, products, onMerchant, onProduct }: CommunityBoardProps) {
  const [tab, setTab] = useState<'merchants' | 'products'>('merchants');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Flame size={14} className="text-amber-400" />Trending this week
        </h3>
        <div className="flex gap-1">
          <button onClick={() => setTab('merchants')} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${tab === 'merchants' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}>Merchants</button>
          <button onClick={() => setTab('products')} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${tab === 'products' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}>Products</button>
        </div>
      </div>

      {tab === 'merchants' && merchants.length > 0 && (
        <div className="space-y-2">
          {merchants.slice(0, 5).map((m, rank) => {
            const scoreColor = m.proofScore >= 8000 ? '#10B981' : m.proofScore >= 6500 ? '#06B6D4' : '#F59E0B';
            return (
              <motion.button key={m.address}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rank * 0.05 }}
                onClick={() => onMerchant?.(m.address)}
                className="w-full flex items-center gap-3 p-2.5 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <span className="text-gray-600 text-xs font-bold w-4">#{rank + 1}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: `${scoreColor}20`, color: scoreColor }}>
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{m.name}</div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-0.5" style={{ color: scoreColor }}><Shield size={8} />{m.proofScore}</span>
                    <span className="text-gray-500">{m.sales7d} sales</span>
                    {m.endorsements7d > 0 && <span className="text-purple-400">{m.endorsements7d} endorsements</span>}
                  </div>
                </div>
                {m.salesGrowth > 0 && (
                  <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-bold">
                    <TrendingUp size={12} />+{m.salesGrowth}%
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {tab === 'products' && products.length > 0 && (
        <div className="space-y-2">
          {products.slice(0, 5).map((p, rank) => (
            <motion.button key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rank * 0.05 }}
              onClick={() => onProduct?.(p.id)}
              className="w-full flex items-center justify-between p-2.5 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-all text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-gray-600 text-xs font-bold w-4">#{rank + 1}</span>
                <div>
                  <div className="text-white text-sm font-medium">{p.name}</div>
                  <div className="text-gray-500 text-[10px]">by {p.merchant} · {p.purchases7d} bought this week</div>
                </div>
              </div>
              <span className="text-cyan-400 font-mono font-bold text-sm">{p.currency}{p.price}</span>
            </motion.button>
          ))}
        </div>
      )}

      {merchants.length === 0 && products.length === 0 && (
        <div className="text-center py-8 text-gray-600 text-xs">
          Trending data will appear as the community grows
        </div>
      )}
    </div>
  );
}
