'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownToLine, ArrowUpFromLine, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { VFIDETokenABI, VaultInfrastructureABI, UserVaultABI } from '@/lib/abis';
import { useVaultBalance } from '@/hooks/useVaultHooks';
import { useToast } from '@/components/ui/toast';

type ActionType = 'deposit' | 'withdraw' | 'transfer';

interface VaultActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ActionType;
  vaultAddress: `0x${string}` | null;
}

export function VaultActionsModal({ isOpen, onClose, actionType, vaultAddress }: VaultActionsModalProps) {
  const { address } = useAccount();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'pending' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState('');

  // Get wallet balance
  const { data: walletBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get vault balance
  const { balance: vaultBalanceFormatted, balanceRaw: vaultBalance } = useVaultBalance();

  // Write contract for transfers
  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: txSuccess, isError: txError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setRecipientAddress('');
      setStep('input');
      setErrorMessage('');
      reset();
    }
  }, [isOpen, reset]);

  // Handle transaction status changes
  useEffect(() => {
    if (isPending || isConfirming) {
      setStep('pending');
    }
    if (txSuccess) {
      setStep('success');
      showToast(`${getActionTitle()} successful!`, 'success');
    }
    if (txError || writeError) {
      setStep('error');
      setErrorMessage(writeError?.message || 'Transaction failed');
    }
   
  }, [isPending, isConfirming, txSuccess, txError, writeError, showToast, actionType]);

  const getActionTitle = () => {
    switch (actionType) {
      case 'deposit': return 'Deposit to Vault';
      case 'withdraw': return 'Withdraw from Vault';
      case 'transfer': return 'Transfer to Another Vault';
    }
  };

  const getActionIcon = () => {
    switch (actionType) {
      case 'deposit': return <ArrowDownToLine size={24} />;
      case 'withdraw': return <ArrowUpFromLine size={24} />;
      case 'transfer': return <RefreshCw size={24} />;
    }
  };

  const getMaxAmount = () => {
    if (actionType === 'deposit') {
      return walletBalance ? formatEther(walletBalance as bigint) : '0';
    }
    return vaultBalanceFormatted;
  };

  const handleMaxClick = () => {
    setAmount(getMaxAmount());
  };

  const validateInput = (): boolean => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return false;
    }

    const amountBigInt = parseEther(amount);
    
    if (actionType === 'deposit') {
      if (!walletBalance || amountBigInt > (walletBalance as bigint)) {
        setErrorMessage('Insufficient wallet balance');
        return false;
      }
    } else {
      if (amountBigInt > vaultBalance) {
        setErrorMessage('Insufficient vault balance');
        return false;
      }
    }

    if (actionType === 'transfer' && !isAddress(recipientAddress)) {
      setErrorMessage('Please enter a valid vault address');
      return false;
    }

    return true;
  };

  const handleConfirm = () => {
    if (!validateInput()) {
      return;
    }
    setStep('confirm');
  };

  const executeAction = () => {
    if (!vaultAddress) return;

    const amountBigInt = parseEther(amount);

    try {
      if (actionType === 'deposit') {
        // Transfer VFIDE from wallet to vault (standard ERC20 transfer)
        writeContract({
          address: CONTRACT_ADDRESSES.VFIDEToken,
          abi: VFIDETokenABI,
          functionName: 'transfer',
          args: [vaultAddress, amountBigInt],
        });
      } else if (actionType === 'withdraw') {
        // Transfer VFIDE from vault back to wallet using vault's transferVFIDE
        writeContract({
          address: vaultAddress,
          abi: UserVaultABI,
          functionName: 'transferVFIDE',
          args: [address as `0x${string}`, amountBigInt],
        });
      } else if (actionType === 'transfer') {
        // Transfer to another vault using vault's transferVFIDE
        writeContract({
          address: vaultAddress,
          abi: UserVaultABI,
          functionName: 'transferVFIDE',
          args: [recipientAddress as `0x${string}`, amountBigInt],
        });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Transaction failed');
      setStep('error');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 border border-cyan-500/30 rounded-2xl p-6 w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                actionType === 'deposit' ? 'bg-cyan-500/20 text-cyan-400' :
                actionType === 'withdraw' ? 'bg-amber-500/20 text-amber-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {getActionIcon()}
              </div>
              <h2 className="text-xl font-bold text-white">{getActionTitle()}</h2>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Input Step */}
          {step === 'input' && (
            <div className="space-y-4">
              {/* Balance Display */}
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">
                    {actionType === 'deposit' ? 'Wallet Balance' : 'Vault Balance'}
                  </span>
                  <span className="text-white font-mono">
                    {parseFloat(getMaxAmount()).toLocaleString()} VFIDE
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-4 pr-20 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    onClick={handleMaxClick}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-lg hover:bg-cyan-500/30"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Recipient Address (for transfers) */}
              {actionType === 'transfer' && (
                <div>
                  <label className="block text-sm text-white/60 mb-2">Recipient Vault Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} />
                  {errorMessage}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleConfirm}
                disabled={!amount || parseFloat(amount) <= 0}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                  actionType === 'deposit' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700' :
                  actionType === 'withdraw' ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700' :
                  'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Continue
              </button>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Action</span>
                  <span className="text-white font-bold">{getActionTitle()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Amount</span>
                  <span className="text-white font-mono">{parseFloat(amount).toLocaleString()} VFIDE</span>
                </div>
                {actionType === 'transfer' && (
                  <div className="flex justify-between">
                    <span className="text-white/60">To</span>
                    <span className="text-white font-mono text-sm">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
                <AlertCircle size={16} />
                Please confirm this transaction in your wallet
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-white/60 hover:text-white hover:border-white/40"
                >
                  Back
                </button>
                <button
                  onClick={executeAction}
                  className={`flex-1 py-3 rounded-xl font-bold text-white ${
                    actionType === 'deposit' ? 'bg-cyan-500 hover:bg-cyan-600' :
                    actionType === 'withdraw' ? 'bg-amber-500 hover:bg-amber-600' :
                    'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* Pending Step */}
          {step === 'pending' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Processing Transaction</h3>
              <p className="text-white/60 text-sm">Please wait while your transaction is being confirmed...</p>
              {txHash && (
                <p className="text-white/40 text-xs mt-4 font-mono">
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Transaction Complete!</h3>
              <p className="text-white/60 text-sm mb-6">
                Successfully {actionType === 'deposit' ? 'deposited' : actionType === 'withdraw' ? 'withdrew' : 'transferred'} {parseFloat(amount).toLocaleString()} VFIDE
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold"
              >
                Done
              </button>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Transaction Failed</h3>
              <p className="text-red-400 text-sm mb-6">{errorMessage}</p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border border-white/20 rounded-xl text-white/60 hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setStep('input');
                    setErrorMessage('');
                    reset();
                  }}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
