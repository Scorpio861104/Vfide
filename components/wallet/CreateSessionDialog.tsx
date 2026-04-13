'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { type Address } from 'viem';
import { AlertTriangle } from 'lucide-react';
import { shortAddress as formatAddress } from '@/lib/format';
import { createContractPermission } from '@/lib/sessionKeys/sessionKeyService';
import { type CreateSessionDialogProps } from './session-key-types';

const DURATION_OPTIONS = [
  { label: '1h', value: 3600 },
  { label: '6h', value: 21600 },
  { label: '24h', value: 86400 },
  { label: '7d', value: 604800 },
];

export function CreateSessionDialog({ isOpen, onClose, onSubmit, targetContracts = [] }: CreateSessionDialogProps) {
  const [duration, setDuration] = useState(3600);
  const [selectedContract, setSelectedContract] = useState<Address | ''>('');
  const [maxCalls, setMaxCalls] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        permissions: [createContractPermission(selectedContract, BigInt(0.1 * 1e18), BigInt(1 * 1e18), maxCalls)],
        duration,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Create Session Key</h2>
        <p className="text-sm text-gray-500 mb-6">
          Pre-approve transactions for a specific contract. This allows faster interactions without signing each time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target Contract</label>
            {targetContracts.length > 0 ? (
              <select value={selectedContract} onChange={(e) =>  setSelectedContract(e.target.value as Address)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" required>
                <option value="">Select a contract</option>
                {targetContracts.map((contract) => (
                  <option key={contract.address} value={contract.address}>
                    {contract.name} ({formatAddress(contract.address)})
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" value={selectedContract} onChange={(e) =>  setSelectedContract(e.target.value as Address)}
               
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 font-mono" required />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Session Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map(({ label, value }) => (
                <button key={value} type="button" onClick={() => setDuration(value)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    duration === value ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Transactions</label>
            <input type="number" value={maxCalls} onChange={(e) =>  setMaxCalls(parseInt(e.target.value) || 1)}
              min={1} max={1000}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">Session keys allow transactions without your explicit approval. Only create sessions for trusted contracts.</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!selectedContract || isSubmitting}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors">
              {isSubmitting ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
