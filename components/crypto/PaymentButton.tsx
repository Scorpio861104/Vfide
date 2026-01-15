/**
 * Payment Button Component
 * 
 * Send payments and tips directly in messages.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Send, Loader2, Check, X } from 'lucide-react';
import { sendPayment, tipMessage } from '@/lib/crypto';
import { useAnnounce } from '@/lib/accessibility';
import { safeParseFloat } from '@/lib/validation';

interface PaymentButtonProps {
  recipientAddress: string;
  recipientName: string;
  messageId?: string;
  conversationId?: string;
  variant?: 'send' | 'tip';
  compact?: boolean;
}

export function PaymentButton({
  recipientAddress,
  recipientName,
  messageId,
  conversationId,
  variant = 'send',
  compact = false,
}: PaymentButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ETH' | 'VFIDE'>('VFIDE');
  const [memo, setMemo] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { announce } = useAnnounce();

  const handleSend = async () => {
    if (!amount || safeParseFloat(amount, 0) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSending(true);
    setError(null);

    try {
      if (variant === 'tip' && messageId) {
        await tipMessage(messageId, recipientAddress, amount, currency);
        announce(`Sent ${amount} ${currency} tip`, 'polite');
      } else {
        await sendPayment(recipientAddress, amount, currency, {
          conversationId,
          memo: memo || undefined,
        });
        announce(`Sent ${amount} ${currency}`, 'polite');
      }

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setAmount('');
        setMemo('');
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 ${
          compact
            ? 'px-2 py-1 text-xs'
            : 'px-3 py-1.5 text-sm'
        } bg-linear-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 border border-green-500/30 text-green-400 rounded-lg transition-all`}
        title={variant === 'tip' ? 'Send Tip' : 'Send Payment'}
      >
        <DollarSign className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        {!compact && <span>{variant === 'tip' ? 'Tip' : 'Pay'}</span>}
      </button>

      {/* Payment Modal */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !sending && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl max-w-md w-full"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#2A2A2F]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {variant === 'tip' ? 'Send Tip' : 'Send Payment'}
                    </h3>
                    <p className="text-gray-400 text-sm">To: {recipientName}</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={sending}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2A2A2F] rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Success State */}
                {success && (
                  <div className="bg-green-900/20 border border-green-900/30 rounded-lg p-4 flex items-center gap-3">
                    <Check className="w-6 h-6 text-green-400 shrink-0" />
                    <div>
                      <div className="text-green-400 font-medium">Payment Sent!</div>
                      <div className="text-green-400/70 text-sm">
                        {amount} {currency} sent successfully
                      </div>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-3 flex items-start gap-2">
                    <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {!success && (
                  <>
                    {/* Currency Selection */}
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
                              : 'border-[#2A2A2F] bg-[#0F0F14] text-gray-400'
                          }`}
                        >
                          <div className="font-bold">VFIDE</div>
                          <div className="text-xs opacity-70">Community Token</div>
                        </button>
                        <button
                          onClick={() => setCurrency('ETH')}
                          className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                            currency === 'ETH'
                              ? 'border-blue-500 bg-blue-500/10 text-white'
                              : 'border-[#2A2A2F] bg-[#0F0F14] text-gray-400'
                          }`}
                        >
                          <div className="font-bold">ETH</div>
                          <div className="text-xs opacity-70">Ethereum</div>
                        </button>
                      </div>
                    </div>

                    {/* Amount Input */}
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
                        min="0"
                        className="w-full px-4 py-3 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white text-lg focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Memo (optional) */}
                    {variant !== 'tip' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Memo (optional)
                        </label>
                        <input
                          type="text"
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          placeholder="What's this for?"
                          maxLength={100}
                          className="w-full px-4 py-2 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    )}

                    {/* Send Button */}
                    <button
                      onClick={handleSend}
                      disabled={sending || !amount}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Send {amount || '0'} {currency}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
