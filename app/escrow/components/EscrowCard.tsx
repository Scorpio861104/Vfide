'use client';

/**
 * EscrowCard — state-aware card for a single CommerceEscrow record.
 *
 * Renders the contract's actual state machine (NONE/OPEN/FUNDED/RELEASED/REFUNDED/DISPUTED/RESOLVED)
 * with role-correct action buttons. Access control mirrors the contract:
 *
 *   Viewer role  | State     | Available actions
 *   -------------|-----------|----------------------------------------------------
 *   buyer        | OPEN      | (waiting on funding — usually self-funded via the
 *                |           |  atomic openAndFundWithIntent path; OPEN-only
 *                |           |  escrows can be cancelled by anyone after 7 days)
 *   buyer        | FUNDED    | Release (to merchant) · Dispute
 *   buyer        | DISPUTED  | (waiting on DAO resolve)
 *   merchant     | FUNDED    | Refund (to buyer) · Dispute
 *   merchant     | DISPUTED  | Refund · (waiting on DAO resolve)
 *   either       | terminal  | (read-only; RELEASED/REFUNDED/RESOLVED display only)
 *
 * The cancelStaleOpen and settleByInheritance actions are deferred to the detail
 * page — they apply to edge-case states and benefit from richer UI than a card.
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Scale,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { type CommerceEscrowRecord, EscrowState, escrowStateLabel } from '@/hooks/useCommerceEscrow';
import { type Address, formatUnits } from 'viem';

export type EscrowCardRole = 'buyer' | 'merchant';

interface EscrowCardProps {
  escrow: CommerceEscrowRecord;
  viewerRole: EscrowCardRole;
  /** Token decimals — VFIDE is 18 by default. */
  decimals?: number;
  /** Token symbol — defaults to VFIDE. */
  symbol?: string;
  isWritePending?: boolean;
  /** Optional action handlers. If undefined for an applicable state, the button is hidden. */
  onRelease?: (id: bigint) => void;
  onRefund?: (id: bigint) => void;
  onDispute?: (id: bigint) => void;
}

function stateBadgeStyle(state: EscrowState): { bg: string; text: string; border: string; Icon: typeof Clock } {
  switch (state) {
    case EscrowState.Open:
      return { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', Icon: Clock };
    case EscrowState.Funded:
      return { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/30', Icon: Lock };
    case EscrowState.Released:
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', Icon: CheckCircle2 };
    case EscrowState.Refunded:
      return { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30', Icon: ArrowRight };
    case EscrowState.Disputed:
      return { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30', Icon: AlertTriangle };
    case EscrowState.Resolved:
      return { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30', Icon: Scale };
    case EscrowState.None:
    default:
      return { bg: 'bg-gray-500/10', text: 'text-gray-300', border: 'border-gray-500/30', Icon: XCircle };
  }
}

function shortAddress(a: Address): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function EscrowCard({
  escrow,
  viewerRole,
  decimals = 18,
  symbol = 'VFIDE',
  isWritePending = false,
  onRelease,
  onRefund,
  onDispute,
}: EscrowCardProps) {
  const { bg, text, border, Icon } = stateBadgeStyle(escrow.state);
  const counterparty = viewerRole === 'buyer' ? escrow.merchantOwner : escrow.buyerOwner;
  const counterpartyLabel = viewerRole === 'buyer' ? 'Merchant' : 'Buyer';
  const amountFormatted = formatUnits(escrow.amount, decimals);
  const openedDate = escrow.openedAt > 0 ? new Date(escrow.openedAt * 1000) : null;

  // Determine which action buttons are valid for (viewerRole, state). Mirrors the
  // contract's access control to avoid surfacing buttons that would revert.
  const canBuyerRelease = viewerRole === 'buyer' && escrow.state === EscrowState.Funded && onRelease;
  const canBuyerDispute = viewerRole === 'buyer' && escrow.state === EscrowState.Funded && onDispute;
  const canMerchantRefund =
    viewerRole === 'merchant' &&
    (escrow.state === EscrowState.Funded || escrow.state === EscrowState.Disputed) &&
    onRefund;
  const canMerchantDispute = viewerRole === 'merchant' && escrow.state === EscrowState.Funded && onDispute;

  const showActions = canBuyerRelease || canBuyerDispute || canMerchantRefund || canMerchantDispute;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/3 border border-white/10 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-xs text-gray-500">Escrow #{escrow.id.toString()}</p>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${bg} ${text} ${border}`}
            >
              <Icon size={10} />
              {escrowStateLabel(escrow.state)}
            </span>
            <Link
              href={`/escrow/${escrow.id.toString()}`}
              className="ml-auto text-xs text-accent hover:text-accent inline-flex items-center gap-1"
            >
              Details
              <ExternalLink size={10} />
            </Link>
          </div>
          <p className="text-base text-white font-semibold tabular-nums">
            {amountFormatted} {symbol}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {counterpartyLabel}: <span className="font-mono">{shortAddress(counterparty)}</span>
          </p>
        </div>
        {openedDate && (
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500">Opened</p>
            <p className="text-xs text-gray-400">{openedDate.toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex flex-wrap gap-2 pt-1">
          {canBuyerRelease && (
            <button
              onClick={() => onRelease!(escrow.id)}
              disabled={isWritePending}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {isWritePending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Release to merchant
            </button>
          )}
          {canMerchantRefund && (
            <button
              onClick={() => onRefund!(escrow.id)}
              disabled={isWritePending}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {isWritePending ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
              Refund to buyer
            </button>
          )}
          {(canBuyerDispute || canMerchantDispute) && (
            <button
              onClick={() => onDispute!(escrow.id)}
              disabled={isWritePending}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-md text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {isWritePending ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
              Open dispute
            </button>
          )}
        </div>
      )}

      {escrow.state === EscrowState.Disputed && !showActions && (
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2">
          <Scale size={12} />
          <span>Awaiting DAO resolution. Funds remain held in escrow.</span>
        </div>
      )}
    </motion.div>
  );
}
