'use client';

import { CheckCircle2, AlertCircle, Clock, Flag, ShieldX } from 'lucide-react';
import {
  FraudStatusBucket,
  deriveFraudStatusBucket,
  fraudStatusLabel,
  type FraudStatus,
} from '@/hooks/useFraudRegistry';

function bucketStyle(b: FraudStatusBucket): {
  bg: string;
  text: string;
  border: string;
  Icon: typeof CheckCircle2;
} {
  switch (b) {
    case FraudStatusBucket.Clean:
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-300',
        border: 'border-emerald-500/30',
        Icon: CheckCircle2,
      };
    case FraudStatusBucket.HasComplaints:
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        Icon: AlertCircle,
      };
    case FraudStatusBucket.PendingReview:
      return {
        bg: 'bg-orange-500/10',
        text: 'text-orange-300',
        border: 'border-orange-500/30',
        Icon: Clock,
      };
    case FraudStatusBucket.Flagged:
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-300',
        border: 'border-red-500/30',
        Icon: Flag,
      };
    case FraudStatusBucket.PermanentlyBanned:
      return {
        bg: 'bg-red-600/20',
        text: 'text-red-200',
        border: 'border-red-600/40',
        Icon: ShieldX,
      };
  }
}

interface FraudStatusBadgeProps {
  status: FraudStatus;
  size?: 'sm' | 'md';
}

export function FraudStatusBadge({ status, size = 'md' }: FraudStatusBadgeProps) {
  const bucket = deriveFraudStatusBucket(status);
  const style = bucketStyle(bucket);
  const Icon = style.Icon;
  const iconSize = size === 'sm' ? 12 : 14;
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} ${textSize} font-semibold rounded-full border ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon size={iconSize} />
      {fraudStatusLabel(bucket)}
    </span>
  );
}
