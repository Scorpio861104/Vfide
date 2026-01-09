'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  DollarSign,
  X,
  Coins,
  ArrowRight,
} from 'lucide-react';
import { Friend } from '@/types/messaging';
import { PaymentRequest } from '@/types/socialIntegration';
import { formatAddress } from '@/lib/messageEncryption';

interface PaymentModalProps {
  friend: Friend;
  type: 'send' | 'request';
  onClose: () => void;
  onSubmit: (amount: string, message: string, token: string) => void;
}

export function PaymentModal({ friend, type, onClose, onSubmit }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('VFIDE');

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    onSubmit(amount, message, token);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6 max-w-md w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center">
              {type === 'send' ? <Send className="w-6 h-6 text-[#0A0A0F]" /> : <DollarSign className="w-6 h-6 text-[#0A0A0F]" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#F5F3E8]">
                {type === 'send' ? 'Send Payment' : 'Request Payment'}
              </h3>
              <p className="text-sm text-[#A0A0A5]">
                {type === 'send' ? 'to' : 'from'} {friend.alias || formatAddress(friend.address)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A3F] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#6B6B78]" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-[#F5F3E8] mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 pr-24 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-lg font-bold focus:border-[#00F0FF] focus:outline-none"
              />
              <select
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#2A2A3F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm font-semibold focus:outline-none"
              >
                <option value="VFIDE">VFIDE</option>
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-[#F5F3E8] mb-2">
              Message (Optional)
            </label>
            <textarea
              placeholder={type === 'send' ? 'What is this payment for?' : 'Why are you requesting this?'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none resize-none"
            />
          </div>

          {/* Preview */}
          <div className="p-4 bg-[#0A0A0F] border border-[#2A2A2F] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6B6B78]">
                {type === 'send' ? 'You will send' : 'You will request'}
              </span>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#FFD700]" />
                <span className="text-lg font-bold text-[#F5F3E8]">
                  {amount || '0'} {token}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B6B78]">
                {type === 'send' ? 'To' : 'From'}
              </span>
              <span className="text-[#A0A0A5]">
                {friend.alias || formatAddress(friend.address)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-[#00F0FF] text-[#0A0A0F] rounded-lg font-bold hover:bg-[#00D5E0] transition-colors flex items-center justify-center gap-2"
            >
              {type === 'send' ? <Send className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
              {type === 'send' ? 'Send Payment' : 'Request Payment'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#2A2A3F] text-[#F5F3E8] rounded-lg font-semibold hover:bg-[#3A3A4F] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface TransactionButtonsProps {
  friend: Friend;
  onPaymentRequest: (amount: string, message: string, token: string) => void;
  onPaymentSend: (amount: string, message: string, token: string) => void;
}

export function TransactionButtons({ friend, onPaymentRequest, onPaymentSend }: TransactionButtonsProps) {
  const [showModal, setShowModal] = useState<'send' | 'request' | null>(null);

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowModal('send')}
          className="flex-1 px-4 py-2 bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 rounded-lg font-semibold hover:bg-[#00F0FF]/30 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send Payment</span>
        </button>
        <button
          onClick={() => setShowModal('request')}
          className="flex-1 px-4 py-2 bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 rounded-lg font-semibold hover:bg-[#FFD700]/30 transition-colors flex items-center justify-center gap-2"
        >
          <DollarSign className="w-4 h-4" />
          <span className="hidden sm:inline">Request</span>
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <PaymentModal
            friend={friend}
            type={showModal}
            onClose={() => setShowModal(null)}
            onSubmit={showModal === 'send' ? onPaymentSend : onPaymentRequest}
          />
        )}
      </AnimatePresence>
    </>
  );
}
