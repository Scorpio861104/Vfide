'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export function PurchaseProofEvent({
  buyer,
  merchant,
  productName,
  amount,
  timestamp,
  className = '',
}: {
  buyer: { address: string; name?: string; proofScore: number };
  merchant: { name: string; slug: string; proofScore: number };
  productName: string;
  amount: string;
  timestamp: number;
  className?: string;
}) {
  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const timeAgo = formatTimeAgo(timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20 rounded-2xl p-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart size={14} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-300">
            <span className="text-white font-medium">{buyer.name || shortAddr(buyer.address)}</span>
            <span className="text-emerald-400 text-xs ml-1.5 inline-flex items-center gap-0.5">
              <Zap size={9} />{buyer.proofScore}
            </span>
            {' '}bought{' '}
            <span className="text-cyan-400">{productName}</span>
            {' '}from{' '}
            <Link href={`/store/${merchant.slug}`} className="text-white font-medium hover:text-cyan-400 transition-colors">
              {merchant.name}
            </Link>
            <span className="text-emerald-400 text-xs ml-1.5 inline-flex items-center gap-0.5">
              <Shield size={9} />{merchant.proofScore}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{timeAgo}</span>
            <span className="text-emerald-400 font-mono">${parseFloat(amount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


// ── Utility ─────────────────────────────────────────────────────────────────
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
