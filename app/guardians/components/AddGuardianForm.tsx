'use client';

import { useMemo } from 'react';
import { isAddress } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddGuardianFormProps {
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  newGuardianAddress: string;
  setNewGuardianAddress: (v: string) => void;
  onAdd: () => void;
  isWritePending: boolean;
  hasVault: boolean;
}

export function AddGuardianForm({
  showForm, setShowForm, newGuardianAddress, setNewGuardianAddress,
  onAdd, isWritePending, hasVault,
}: AddGuardianFormProps) {
  const isValidAddress = useMemo(() => {
    if (!newGuardianAddress) return null;
    return isAddress(newGuardianAddress);
  }, [newGuardianAddress]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <UserPlus size={20} className="text-cyan-400" /> Add Guardian
        </h3>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25">
          {showForm ? 'Cancel' : '+ Add Guardian'}
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-4 border-t border-white/10">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <p className="text-yellow-400 text-sm">
                <strong>7-Day Maturity Period:</strong> New guardians cannot participate in recovery votes for 7 days after being added.
              </p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Guardian Wallet Address</label>
              <input type="text" value={newGuardianAddress}
                onChange={(e) => setNewGuardianAddress(e.target.value)}
                aria-label="Guardian wallet address" aria-invalid={isValidAddress === false}
                className={`w-full px-4 py-3 bg-black/30 border rounded-xl text-white focus:outline-none focus:ring-2 font-mono transition-all ${
                  isValidAddress === false ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' :
                  isValidAddress === true ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' :
                  'border-white/10 focus:border-cyan-500 focus:ring-cyan-500/20'
                }`} />
              {isValidAddress === false && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Please enter a valid Ethereum address (0x...)</p>
              )}
              {isValidAddress === true && (
                <p className="mt-1 text-sm text-green-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Valid address</p>
              )}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onAdd} disabled={!isValidAddress || isWritePending || !hasVault}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
              {isWritePending ? 'Processing...' : 'Add Guardian'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
