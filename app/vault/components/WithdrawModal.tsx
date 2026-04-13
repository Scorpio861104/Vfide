'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpFromLine, X, Loader2 } from 'lucide-react';
import { safeParseFloat } from '@/lib/validation';

interface WithdrawModalProps {
  show: boolean;
  onClose: () => void;
  cardBoundMode: boolean;
  vaultBalance: string;
  address: string | undefined;
  withdrawAmount: string;
  setWithdrawAmount: (v: string) => void;
  withdrawRecipient: string;
  setWithdrawRecipient: (v: string) => void;
  isWithdrawing: boolean;
  onWithdraw: () => void;
}

export function WithdrawModal({
  show, onClose, cardBoundMode, vaultBalance, address,
  withdrawAmount, setWithdrawAmount,
  withdrawRecipient, setWithdrawRecipient,
  isWithdrawing, onWithdraw,
}: WithdrawModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => !isWithdrawing && onClose()}
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
                <ArrowUpFromLine className="text-amber-400" size={24} />
                {cardBoundMode ? 'Transfer VFIDE to Vault' : 'Withdraw VFIDE'}
              </h3>
              <button
                onClick={() => !isWithdrawing && onClose()}
                disabled={isWithdrawing}
                className="text-white/60 hover:text-white disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-white/60 text-sm mb-1">Vault Balance</div>
              <div className="text-white font-bold">
                {safeParseFloat(vaultBalance, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-white/60 text-sm mb-2">
                {cardBoundMode ? 'Destination Vault Address' : 'Recipient Address'}
              </label>
              <input
                type="text"
                value={withdrawRecipient}
                onChange={(e) =>  setWithdrawRecipient(e.target.value)}
               
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500/50"
              />
              {address && (
                <button
                  onClick={() => setWithdrawRecipient(address)}
                  disabled={cardBoundMode}
                  className="text-cyan-400 text-xs mt-1 hover:underline"
                >
                  Use my wallet address
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-white/60 text-sm mb-2">
                {cardBoundMode ? 'Amount to Transfer' : 'Amount to Withdraw'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) =>  setWithdrawAmount(e.target.value)}
                 
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 pr-20"
                />
                <button
                  onClick={() => setWithdrawAmount(String(safeParseFloat(vaultBalance, 0)))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-lg font-bold hover:bg-amber-500/30"
                >
                  MAX
                </button>
              </div>
            </div>

            {cardBoundMode ? (
              <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                <div className="text-cyan-300 text-sm font-bold mb-1">CardBound Signed Transfer</div>
                <div className="text-white/70 text-xs">
                  You will sign a TransferIntent and execute a vault-to-vault transfer. Destination must be a registered vault.
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="text-amber-400 text-sm font-bold mb-1">⚠️ 24-Hour Cooldown</div>
                <div className="text-white/60 text-xs">
                  Withdrawals have a 24-hour cooldown period between transactions for security.
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: isWithdrawing ? 1 : 1.02 }}
              whileTap={{ scale: isWithdrawing ? 1 : 0.98 }}
              onClick={onWithdraw}
              disabled={isWithdrawing || !withdrawAmount || !withdrawRecipient || parseFloat(withdrawAmount) <= 0}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {cardBoundMode ? 'Transferring...' : 'Withdrawing...'}
                </>
              ) : (
                <>
                  <ArrowUpFromLine size={20} />
                  {cardBoundMode ? 'Transfer to Vault' : 'Withdraw from Vault'}
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
