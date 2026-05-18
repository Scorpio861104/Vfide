'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Banknote,
  ChevronRight,
  Gift,
  Lock,
  Shield,
  Sparkles,
  Vote,
} from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';

export type DashboardTabType = 'overview' | 'fee-simulator' | 'score-simulator' | 'badges';

export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
} as const;

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100 },
  },
} as const;

export const ecosystemLoadout = [
  {
    icon: Shield,
    label: 'Vault Security',
    description: 'Self-custody vault controls',
    href: '/vault',
  },
  {
    icon: Lock,
    label: 'Escrow',
    description: 'Dispute-safe settlements',
    href: '/escrow',
  },
  {
    icon: Vote,
    label: 'DAO Hub',
    description: 'Proposals + dispute flow',
    href: '/dao-hub',
  },
  {
    icon: Sparkles,
    label: 'Flashloans P2P',
    description: 'Peer-powered credit pools',
    href: '/flashloans',
  },
  {
    icon: Banknote,
    label: 'Social Pay',
    description: 'Merchant & QR commerce',
    href: '/merchant',
  },
  {
    icon: Gift,
    label: 'Rewards',
    description: 'ProofScore boosters',
    href: '/rewards',
  },
] as const;

export function GlassCard({
  children,
  className = '',
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      transition={{ type: 'spring', stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 ${hover ? 'ring-effect' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'cyan',
  href,
  loading = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'cyan' | 'green' | 'gold' | 'purple';
  href?: string;
  loading?: boolean;
}) {
  const colorMap = {
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    green: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    gold: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
  } as const;

  const styles = colorMap[color];

  const content = (
    <GlassCard className={`p-5 ${href ? 'cursor-pointer hover:border-white/20' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white/60">{label}</span>
        <div className={`rounded-xl p-2 shadow-lg ${styles.bg} ${styles.glow}`}>
          <Icon className={styles.text} size={18} />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton height={32} className="mb-1 w-24 bg-white/10" />
          <Skeleton height={14} className="w-16 bg-white/5" />
        </>
      ) : (
        <>
          <div className="mb-1 text-2xl font-bold text-white">{value}</div>
          {subValue && (
            <div className={`flex items-center gap-1 text-sm ${styles.text}`}>
              {href && <ChevronRight size={14} />}
              {subValue}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function QuickAction({
  icon: Icon,
  label,
  href,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  variant?: 'primary' | 'default';
}) {
  const isPrimary = variant === 'primary';

  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`ring-effect flex flex-col items-center gap-3 rounded-2xl p-4 text-center font-semibold transition-all ${
          isPrimary
            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
            : 'border border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className={`rounded-xl p-3 ${isPrimary ? 'bg-white/20' : 'bg-gradient-to-br from-white/10 to-white/5'}`}>
          <Icon size={24} />
        </div>
        <span className="text-sm">{label}</span>
      </motion.div>
    </Link>
  );
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
