/**
 * Social Tip Button
 * 
 * Integrated tipping button for posts and comments.
 * Seamlessly blends crypto payments with social interactions.
 */

'use client';

import { useWallet } from '@/lib/crypto';
import { useTipping } from '@/lib/socialPayments';
import { AnimatePresence, motion } from 'framer-motion';
import { DollarSign, Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

interface SocialTipButtonProps {
  postId?: string;
  commentId?: string;
  recipientAddress: string;
  recipientName: string;
  compact?: boolean;
  showTotal?: boolean;
  className?: string;
}

export function SocialTipButton({
  postId,
  commentId,
  recipientAddress,
  recipientName,
  compact = false,
  showTotal = true,
  className = '',
}: SocialTipButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ETH' | 'VFIDE'>('VFIDE');
  const [message, setMessage] = useState('');

  const { tips, total, isLoading, sendTip } = useTipping(postId, commentId);
  const { wallet, isConnected } = useWallet();

  const handleTip = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await sendTip(recipientAddress, amount, currency, message);
      alert(`Tipped ${amount} ${currency} to ${recipientName}! 💸`);
      setIsOpen(false);
      setAmount('');
      setMessage('');
    } catch {
      alert('Failed to send tip. Please try again.');
    }
  };

  const formatTotal = () => {
    const parts = [];
    if (parseFloat(total.eth) > 0) {
      parts.push(`${parseFloat(total.eth).toFixed(4)} ETH`);
    }
    if (parseFloat(total.vfide) > 0) {
      parts.push(`${parseFloat(total.vfide).toFixed(2)} VFIDE`);
    }
    return parts.join(' + ') || '0';
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 transition-all group ${
          compact
            ? 'p-2 hover:bg-[#2A2A3E] rounded-lg'
            : 'px-4 py-2 bg-linear-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border border-purple-500/20 rounded-lg'
        } ${className}`}
      >
        <DollarSign className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
        {!compact && (
          <>
            <span className="text-sm font-medium text-[#F5F3E8]">Tip</span>
            {showTotal && tips.length > 0 && (
              <span className="text-xs text-purple-400">
                ({formatTotal()})
              </span>
            )}
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            >
              <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-2xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#F5F3E8]">Send Tip</h3>
                      <p className="text-sm text-[#6B6B78]">to {recipientName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-[#2A2A3E] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#A0A0A5]" />
                  </button>
                </div>

                {/* Currency Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
                    Currency
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setCurrency('VFIDE')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        currency === 'VFIDE'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-[#2A2A2F] hover:border-[#3A3A4F]'
                      }`}
                    >
                      <div className="font-bold text-[#F5F3E8]">VFIDE</div>
                      <div className="text-xs text-[#6B6B78]">Community Token</div>
                      {wallet && (
                        <div className="text-xs text-purple-400 mt-1">
                          Balance: {wallet.tokenBalance}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => setCurrency('ETH')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        currency === 'ETH'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-[#2A2A2F] hover:border-[#3A3A4F]'
                      }`}
                    >
                      <div className="font-bold text-[#F5F3E8]">ETH</div>
                      <div className="text-xs text-[#6B6B78]">Ethereum</div>
                      {wallet && (
                        <div className="text-xs text-blue-400 mt-1">
                          Balance: {wallet.balance}
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#2A2A2F] rounded-xl text-[#F5F3E8] text-lg font-bold focus:border-purple-500 focus:outline-none"
                      step="0.01"
                      min="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#6B6B78]">
                      {currency}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {['1', '5', '10', '25'].map((value) => (
                      <button
                        key={value}
                        onClick={() => setAmount(value)}
                        className="flex-1 px-3 py-1.5 bg-[#2A2A3E] hover:bg-[#3A3A4F] rounded-lg text-xs font-medium text-[#F5F3E8] transition-colors"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Great content! 🎉"
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#2A2A2F] rounded-xl text-[#F5F3E8] focus:border-purple-500 focus:outline-none resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="text-xs text-[#6B6B78] mt-1 text-right">
                    {message.length}/200
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleTip}
                  disabled={!amount || isLoading || !isConnected}
                  className="w-full py-3 bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Tip</span>
                    </>
                  )}
                </button>

                {!isConnected && (
                  <p className="text-xs text-yellow-400 mt-3 text-center">
                    Please connect your wallet to send tips
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
