'use client';

/**
 * WithdrawModal — sign and submit a vault-to-vault transfer.
 *
 * Pre-cleanup this modal had a parallel legacy "Withdraw to wallet" mode
 * with a 24-hour cooldown notice and a "Use my wallet address" shortcut.
 * `handleWithdraw` in useVaultOperations.ts only implements the CardBound
 * vault-to-vault flow (signed TransferIntent → executeVaultToVaultTransfer),
 * so the legacy UI was unreachable. Removed all `cardBoundMode` branches.
 *
 * Note: the modal name is kept as "WithdrawModal" for filename stability
 * but the user-facing copy is "Transfer to Vault" throughout.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpFromLine, X, Loader2 } from 'lucide-react';
import { safeParseFloat } from '@/lib/validation';

interface WithdrawModalProps {
  show: boolean;
  onClose: () => void;
  vaultBalance: string;
  withdrawAmount: string;
  setWithdrawAmount: (v: string) => void;
  withdrawRecipient: string;
  setWithdrawRecipient: (v: string) => void;
  isWithdrawing: boolean;
  onWithdraw: () => void;
}

export function WithdrawModal({
  show, onClose, vaultBalance,
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
              <h3 className="text-xl font-bold text-white flex items-center gap-2 min-w-0">
                <ArrowUpFromLine className="text-amber-400 flex-shrink-0" size={24} />
                <span className="truncate">Transfer VFIDE to Vault</span>
              </h3>
              <button
                onClick={() => !isWithdrawing && onClose()}
                disabled={isWithdrawing}
                className="text-white/60 hover:text-white disabled:opacity-50 flex-shrink-0"
                aria-label="Close"
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
                Destination Vault Address
              </label>
              <input
                type="text"
                value={withdrawRecipient}
                onChange={(e) => setWithdrawRecipient(e.target.value)}
                placeholder="0x... destination vault address"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500/50"
              />
              <div className="text-white/50 text-xs mt-2">
                Enter the recipient&apos;s vault address (not their wallet address). The destination
                must be a registered vault.
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-white/60 text-sm mb-2">
                Amount to Transfer
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
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

            <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <div className="text-cyan-300 text-sm font-bold mb-1">CardBound Signed Transfer</div>
              <div className="text-white/70 text-xs">
                You&apos;ll sign a TransferIntent and execute a vault-to-vault transfer. Funds move
                directly between the two vaults — no wallet round-trip required.
              </div>
            </div>

            <motion.button
              data-trail-source="vault-transfer"
              whileHover={{ scale: isWithdrawing ? 1 : 1.02 }}
              whileTap={{ scale: isWithdrawing ? 1 : 0.98 }}
              onClick={onWithdraw}
              disabled={isWithdrawing || !withdrawAmount || !withdrawRecipient || parseFloat(withdrawAmount) <= 0}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowUpFromLine size={20} />
                  Transfer to Vault
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
