'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownToLine, X, Loader2 } from 'lucide-react';

interface DepositModalProps {
  show: boolean;
  onClose: () => void;
  walletBalanceFormatted: string;
  depositAmount: string;
  setDepositAmount: (v: string) => void;
  isDepositing: boolean;
  depositStep: 'approve' | 'deposit';
  onDeposit: () => void;
}

export function DepositModal({
  show, onClose, walletBalanceFormatted,
  depositAmount, setDepositAmount,
  isDepositing, depositStep, onDeposit,
}: DepositModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => !isDepositing && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-white/10 rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ArrowDownToLine className="text-cyan-400" size={24} />
                Deposit VFIDE
              </h3>
              <button
                onClick={() => !isDepositing && onClose()}
                disabled={isDepositing}
                className="text-white/60 hover:text-white disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-white/60 text-sm mb-1">Wallet Balance</div>
              <div className="text-white font-bold">
                {parseFloat(walletBalanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-white/60 text-sm mb-2">Amount to Deposit</label>
              <div className="relative">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) =>  setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 pr-20"
                />
                <button
                  onClick={() => setDepositAmount(walletBalanceFormatted)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-lg font-bold hover:bg-cyan-500/30"
                >
                  MAX
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: isDepositing ? 1 : 1.02 }}
              whileTap={{ scale: isDepositing ? 1 : 0.98 }}
              onClick={onDeposit}
              disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDepositing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {depositStep === 'approve' ? 'Approving...' : 'Depositing...'}
                </>
              ) : (
                <>
                  <ArrowDownToLine size={20} />
                  Deposit to Vault
                </>
              )}
            </motion.button>

            <p className="text-white/40 text-xs text-center mt-4">
              This will transfer tokens from your wallet to your vault.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
