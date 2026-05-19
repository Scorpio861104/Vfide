'use client';

export const dynamic = 'force-dynamic';

/**
 * /merchant/refunds — merchant-side on-chain refund management.
 *
 * Distinct from /merchant/returns:
 *   - /merchant/returns is the off-chain workflow page (database-backed, tracks
 *     "customer wants to return this item, approve/reject inventory decision").
 *   - /merchant/refunds (THIS PAGE) is the on-chain payment-refund page. The
 *     actual money movement.
 *
 *   These should eventually link — approving a return request should
 *   surface "now initiate the on-chain refund" — but that integration is
 *   logged in backlog as a separate task.
 *
 * What this page does:
 *   - Lists the merchant's refund history (initiated, completed, expired)
 *     by querying RefundInitiated + RefundCompleted events.
 *   - "Start a refund" form: enter customer address, token, amount, orderId.
 *     Calls initiateRefund. Captures the refundId from the transaction
 *     receipt and persists it in localStorage so the merchant can complete
 *     the refund later.
 *   - For each "initiated" refund, a Complete button calls completeRefund.
 *
 * Known limitation (logged in backlog):
 *   The MerchantPortal contract does NOT emit refundId in the RefundInitiated
 *   event. We capture it from the transaction return value at submission
 *   time and store it in localStorage. If a merchant clears browser data or
 *   switches devices, they lose access to refundIds for previously-initiated
 *   refunds — they can see the refund happened but can't complete it.
 *
 *   The contract should be fixed to either (a) emit refundId in the event,
 *   or (b) expose merchantRefunds[address] as a public view. Both options
 *   are documented in backlog.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { parseEther, formatEther, isAddress, type Address } from 'viem';
import {
  ArrowLeft,
  RotateCcw,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  XCircle,
  X,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/GlassCard';
import { useMerchantPayments } from '@/hooks/useMerchantPayments';
import {
  useRefundHistory,
  rememberRefundId,
  type RefundEntry,
} from '@/hooks/useRefundHistory';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds) return '—';
  return new Date(unixSeconds * 1000).toLocaleString();
}

function formatStatusBadge(status: RefundEntry['status']) {
  switch (status) {
    case 'initiated':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-xs font-semibold">
          <Clock size={10} />
          Initiated
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 size={10} />
          Completed
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-xs font-semibold">
          <AlertTriangle size={10} />
          Expired
        </span>
      );
  }
}

export default function MerchantRefundsPage() {
  const { address } = useAccount();
  const { entries, isLoading, error, refetch } = useRefundHistory('merchant');
  const { initiateRefund, completeRefund, isWritePending } = useMerchantPayments();

  const [showStartForm, setShowStartForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Start-refund form state
  const [customer, setCustomer] = useState('');
  const [tokenAddress, setTokenAddress] = useState((CONTRACT_ADDRESSES.VFIDEToken as string) || '');
  const [amount, setAmount] = useState('');
  const [orderId, setOrderId] = useState('');

  const handleStartRefund = async () => {
    setFormError(null);
    setActionMessage(null);
    if (!address) {
      setFormError('Connect your wallet first.');
      return;
    }
    if (!isAddress(customer)) {
      setFormError('Customer must be a valid address.');
      return;
    }
    if (!isAddress(tokenAddress)) {
      setFormError('Token must be a valid address.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    if (!orderId.trim()) {
      setFormError('Order ID is required.');
      return;
    }
    try {
      const amountWei = parseEther(amount);
      const { hash, refundId } = await initiateRefund({
        customer: customer as Address,
        token: tokenAddress as Address,
        amountWei,
        orderId: orderId.trim(),
      });

      // Persist the captured refundId so we can call completeRefund later.
      // The simulation in useMerchantPayments.initiateRefund returned the
      // deterministic refundId the contract just stored. Without this
      // persistence, the merchant would have no way to complete the refund
      // through this UI — the contract doesn't emit refundId in events.
      if (refundId && address) {
        rememberRefundId(address, 'merchant', {
          refundId,
          orderId: orderId.trim(),
          txHash: hash,
          blockNumber: '0', // We don't have block number here; useRefundHistory
                            // reconciles via orderId match, so this is fine.
        });
        setActionMessage(`Refund initiated. You can complete it once you're ready.`);
      } else {
        // Simulation failed but the tx may still have succeeded. Surface the
        // txHash so the merchant can find the refundId on a block explorer.
        setActionMessage(
          `Refund initiated (tx: ${hash}). The refundId could not be captured locally — find it on a block explorer to complete this refund later.`
        );
      }

      // Reset form
      setCustomer('');
      setAmount('');
      setOrderId('');
      setShowStartForm(false);
      void refetch();
    } catch (e: any) {
      setFormError(e?.shortMessage || e?.message || 'Refund initiation failed.');
    }
  };

  const handleComplete = async (entry: RefundEntry) => {
    setActionMessage(null);
    if (!entry.refundId) {
      setActionMessage(
        'No refundId stored locally for this refund. The MerchantPortal contract does not emit refundId in events — see backlog. You can find the refundId on a block explorer for the original initiateRefund transaction.'
      );
      return;
    }
    try {
      await completeRefund(entry.refundId);
      setActionMessage(`Refund ${entry.orderId} completed.`);
      void refetch();
    } catch (e: any) {
      setActionMessage(e?.shortMessage || e?.message || 'Refund completion failed.');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link
            href="/merchant"
            className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
          >
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="badge-live mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Refund Management
            </div>
            <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3 tracking-tight">
                <RotateCcw className="text-cyan-400" size={28} />
                Refunds
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                On-chain refunds you&apos;ve initiated to customers. Initiated refunds must be
                completed within 30 days, after which they expire and can no longer be
                completed. The customer sees both stages in their transaction history.
              </p>
            </div>
            {!showStartForm && (
              <button
                onClick={() => setShowStartForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-md shadow-cyan-500/20"
              >
                <Plus size={16} />
                Start a refund
              </button>
            )}
          </div>

          {/* Start-refund form */}
          {showStartForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <GlassCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-sm font-bold text-white">Start a new refund</h3>
                  <button
                    onClick={() => {
                      setShowStartForm(false);
                      setFormError(null);
                    }}
                    className="text-gray-400 hover:text-white"
                    aria-label="Close form"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Customer address</label>
                    <input
                      type="text"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Token address</label>
                      <input
                        type="text"
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Amount</label>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="1.0"
                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Order ID</label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="The order this refund is for"
                      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 text-sm"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                      {formError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => void handleStartRefund()}
                      disabled={isWritePending || !customer || !amount || !orderId}
                      className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isWritePending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Initiate refund
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowStartForm(false)}
                      disabled={isWritePending}
                      className="px-5 py-2 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {actionMessage && (
            <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 break-all">
              {actionMessage}
            </div>
          )}

          {/* Refund list */}
          {!address && (
            <GlassCard hover={false} className="p-6 text-center">
              <p className="text-gray-400 text-sm">Connect your wallet to view your refund history.</p>
            </GlassCard>
          )}

          {address && isLoading && (
            <GlassCard hover={false} className="p-6 text-center">
              <Loader2 className="w-6 h-6 mx-auto mb-3 text-gray-500 animate-spin" />
              <p className="text-gray-400 text-sm">Loading refund history from chain logs…</p>
            </GlassCard>
          )}

          {address && error && !isLoading && (
            <GlassCard hover={false} className="p-6">
              <div className="flex items-start gap-3">
                <XCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">Failed to load history</p>
                  <p className="text-xs text-red-200">{error}</p>
                </div>
              </div>
            </GlassCard>
          )}

          {address && !isLoading && !error && entries.length === 0 && (
            <GlassCard hover={false} className="p-8 text-center">
              <RotateCcw className="w-10 h-10 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-bold text-white mb-2">No refunds yet</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Refunds you initiate will appear here. You&apos;ll see when they&apos;ve been completed
                or when they&apos;re approaching the 30-day expiry window.
              </p>
            </GlassCard>
          )}

          {address && !isLoading && entries.length > 0 && (
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <motion.div
                  key={`${entry.orderId}-${entry.initiatedBlock}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <GlassCard hover={false} className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-white truncate">
                            Order: {entry.orderId}
                          </p>
                          {formatStatusBadge(entry.status)}
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-1">
                          To: {shortAddress(entry.customer)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Initiated: {formatTimestamp(entry.initiatedAt)}
                          {entry.completedAt && (
                            <span> · Completed: {formatTimestamp(entry.completedAt)}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-white">{formatEther(entry.amount)}</p>
                        <p className="text-xs text-gray-500">tokens</p>
                      </div>
                    </div>

                    {entry.status === 'initiated' && (
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">
                          {entry.refundId
                            ? 'Complete the refund to transfer the tokens.'
                            : 'No refundId in local storage. See note below.'}
                        </p>
                        <button
                          onClick={() => void handleComplete(entry)}
                          disabled={!entry.refundId || isWritePending}
                          className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-md text-xs font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Complete refund
                        </button>
                      </div>
                    )}

                    {entry.status === 'expired' && (
                      <div className="pt-3 border-t border-white/10 text-xs text-red-300 flex items-center gap-2">
                        <AlertTriangle size={12} />
                        Past the 30-day completion window. This refund can no longer be
                        completed on-chain.
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}

          {/* Limitation disclosure */}
          {address && entries.some((e) => e.status === 'initiated' && !e.refundId) && (
            <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-amber-200">
                  <p className="font-semibold mb-1">Some refunds need their refundId to complete</p>
                  <p className="leading-relaxed">
                    The MerchantPortal contract doesn&apos;t emit refundIds in events, so refunds
                    initiated from a different browser or before this device was set up don&apos;t
                    have their IDs locally. To complete them, find the original initiateRefund
                    transaction on a block explorer — the refundId is the return value. Then
                    call <code className="font-mono">completeRefund(refundId)</code> directly.
                    This is a known limitation logged for the contract review.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
