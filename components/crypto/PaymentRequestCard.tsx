/**
 * Payment Request Component
 * 
 * Request payments from users in chat.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Check, Clock } from 'lucide-react';
import { createPaymentRequest, payPaymentRequest, PaymentRequest } from '@/lib/crypto';
import { useAnnounce } from '@/lib/accessibility';

interface PaymentRequestButtonProps {
  recipientAddress: string;
  conversationId: string;
}

export function PaymentRequestButton({
  recipientAddress,
  conversationId,
}: PaymentRequestButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ETH' | 'VFIDE'>('VFIDE');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const { announce } = useAnnounce();

  const handleCreate = async () => {
    if (!amount || !reason) {
      return;
    }

    setCreating(true);
    try {
      await createPaymentRequest(recipientAddress, amount, currency, reason, conversationId);
      announce('Payment request sent', 'polite');
      setShowModal(false);
      setAmount('');
      setReason('');
    } catch {
      announce('Failed to create payment request', 'assertive');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg transition-all text-sm"
        title="Request Payment"
      >
        <FileText className="w-4 h-4" />
        <span>Request</span>
      </button>

      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !creating && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full"
            >
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Request Payment</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={creating}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Currency
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrency('VFIDE')}
                      className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                        currency === 'VFIDE'
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-gray-400'
                      }`}
                    >
                      VFIDE
                    </button>
                    <button
                      onClick={() => setCurrency('ETH')}
                      className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                        currency === 'ETH'
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-gray-400'
                      }`}
                    >
                      ETH
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="What's this for?"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleCreate}
                  disabled={creating || !amount || !reason}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Send Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// Payment Request Card (for displaying in messages)
// ============================================================================

interface PaymentRequestCardProps {
  request: PaymentRequest;
  isRecipient: boolean;
}

export function PaymentRequestCard({ request, isRecipient }: PaymentRequestCardProps) {
  const [paying, setPaying] = useState(false);
  const { announce } = useAnnounce();

  const handlePay = async () => {
    setPaying(true);
    try {
      await payPaymentRequest(request.id);
      announce('Payment sent', 'polite');
    } catch {
      announce('Payment failed', 'assertive');
    } finally {
      setPaying(false);
    }
  };

  const isExpired = typeof request.expiresAt === 'number' ? Date.now() > request.expiresAt : false;
  const canPay = isRecipient && request.status === 'pending' && !isExpired;

  return (
    <div className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 max-w-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-lg mb-1">
            Payment Request
          </div>
          <div className="text-gray-400 text-sm">{request.reason}</div>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg p-3 mb-3">
        <div className="text-gray-400 text-xs mb-1">Amount Requested</div>
        <div className="text-white text-2xl font-bold">
          {request.amount} {request.currency}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        {request.status === 'paid' && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Check className="w-4 h-4" />
            <span>Paid</span>
          </div>
        )}
        {request.status === 'pending' && !isExpired && (
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>Pending</span>
          </div>
        )}
        {isExpired && (
          <div className="text-gray-500 text-sm">Expired</div>
        )}
      </div>

      {/* Actions */}
      {canPay && (
        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
        >
          {paying ? 'Processing...' : `Pay ${request.amount} ${request.currency}`}
        </button>
      )}

      {!isRecipient && request.status === 'pending' && !isExpired && (
        <div className="text-gray-400 text-sm text-center">
          Waiting for payment...
        </div>
      )}
    </div>
  );
}
