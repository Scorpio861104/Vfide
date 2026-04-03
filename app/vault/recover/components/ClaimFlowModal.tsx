// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useSignMessage } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Key,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Loader2,
  UserCheck,
  Fingerprint,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  Users,
  Unlock,
} from 'lucide-react';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';

export function ClaimFlowModal({ 
  vault, 
  onClose 
}: { 
  vault: { address: string; originalOwner: string } | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [recoveryId, setRecoveryId] = useState("");
  const [reason, setReason] = useState("");
  const { address: newWalletAddress } = useAccount();
  
  if (!vault) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring" as const, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-white/20 shadow-2xl"
      >
        {/* Header with animated gradient */}
        <div className="relative p-8 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/10 border-b border-white/10 overflow-hidden">
          {/* Animated background orbs */}
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"
          />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30"
              >
                <Key className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-white">Claim Your Vault</h2>
                <p className="text-sm text-gray-400">Step {step} of 3 • Secure Recovery</p>
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </motion.button>
          </div>
          
          {/* Animated progress bar */}
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: s <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.5, delay: s * 0.1 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-4"
              >
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    Vault to Recover
                  </p>
                  <p className="font-mono text-cyan-400 text-lg">{vault.address}</p>
                </div>
                
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    Your New Wallet
                  </p>
                  <p className="font-mono text-emerald-400 text-lg">
                    {newWalletAddress || "Connect wallet to continue"}
                  </p>
                </div>
                
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-amber-400 font-semibold mb-1">Security Notice</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        This initiates a <strong className="text-white">7-day challenge period</strong>. 
                        Your guardians must approve, and the original wallet can cancel if not truly lost.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-5"
              >
                <div>
                  <label className="text-sm text-gray-300 mb-3 font-medium flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-purple-400" />
                    Recovery ID
                  </label>
                  <input
                    type="text"
                    value={recoveryId}
                    onChange={(e) => setRecoveryId(e.target.value)}
                    placeholder="Enter your secret recovery phrase..."
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    The secret phrase you set when creating your vault
                  </p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-3 font-medium flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-400" />
                    Recovery Reason
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you need to recover (lost device, seed phrase destroyed, etc.)"
                    rows={3}
                    maxLength={500}
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                  />
                </div>
              </motion.div>
            )}
            
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" as const, stiffness: 200, delay: 0.2 }}
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30"
                >
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </motion.div>
                
                <motion.h3 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold text-white mb-2"
                >
                  Claim Submitted!
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-gray-400 mb-8"
                >
                  Your recovery process has begun
                </motion.p>
                
                <div className="space-y-3">
                  {[
                    { icon: Users, title: "Guardian Approval", desc: "Waiting for guardian votes", color: "cyan" },
                    { icon: Clock, title: "7-Day Challenge", desc: "Original wallet can contest", color: "amber" },
                    { icon: Unlock, title: "Ownership Transfer", desc: "Vault transfers to new wallet", color: "emerald" }
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        item.color === 'cyan' ? 'bg-cyan-500/20' : 
                        item.color === 'amber' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                      }`}>
                        <item.icon className={`h-5 w-5 ${
                          item.color === 'cyan' ? 'text-cyan-400' : 
                          item.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <motion.div 
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-gray-500"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between bg-black/20">
          {step > 1 && step < 3 ? (
            <motion.button
              whileHover={{ scale: 1.02, x: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back
            </motion.button>
          ) : (
            <div />
          )}
          
          {step < 3 ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !recoveryId}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-cyan-500/30 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Continue
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle2 className="h-4 w-4" />
              Done
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

