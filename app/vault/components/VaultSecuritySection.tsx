// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Lock, Clock, CheckCircle2, X } from 'lucide-react';
import { useSelfPanic, useQuarantineStatus, useCanSelfPanic } from '@/lib/vfide-hooks';

export function VaultSecuritySection({ vaultAddress }: { vaultAddress: `0x${string}` | null | undefined }) {
  const quarantineData = useQuarantineStatus(vaultAddress || undefined);
  const panicData = useCanSelfPanic();
  const { selfPanic, isPanicking, isAvailable: isPanicAvailable } = useSelfPanic();
  
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [panicDuration, setPanicDuration] = useState(24);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  
  useEffect(() => {
    // Update time every minute for countdown
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 60000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  const quarantineRemaining = Math.max(0, quarantineData.quarantineUntil - now);
  const isQuarantined = quarantineRemaining > 0;
  const remainingHours = Math.floor(quarantineRemaining / 3600);
  const remainingMinutes = Math.floor((quarantineRemaining % 3600) / 60);
  
  const cooldownRemaining = Math.max(0, (panicData.lastPanicTime + panicData.cooldownSeconds) - now);
  const canPanic = isPanicAvailable && cooldownRemaining === 0 && !isQuarantined;
  
  const handlePanic = () => {
    if (!canPanic || isPanicking) return;
    selfPanic(panicDuration);
    setShowPanicConfirm(false);
  };

  if (!vaultAddress) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <GlassCard 
          className={`p-6 ${isQuarantined ? 'border-red-500/50' : 'border-white/10'}`} 
          hover={false}
          gradient={isQuarantined ? "red" : undefined}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div 
                animate={isQuarantined ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`p-4 rounded-2xl ${isQuarantined ? 'bg-red-500/20' : 'bg-cyan-500/20'}`}
              >
                {isQuarantined ? (
                  <Lock className="w-8 h-8 text-red-400" />
                ) : (
                  <Shield className="w-8 h-8 text-cyan-400" />
                )}
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {isQuarantined ? 'Vault Quarantined' : 'Emergency Security'}
                </h3>
                <p className="text-white/60 text-sm">
                  {isQuarantined 
                    ? `Locked for ${remainingHours}h ${remainingMinutes}m`
                    : 'Suspect compromise? Lock immediately.'}
                </p>
                {!isQuarantined && (
                  <p className="text-white/40 text-xs mt-2">
                    Guardian recovery stays available while assets are locked.
                  </p>
                )}
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              {!showPanicConfirm ? (
                <motion.button
                  key="panic-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: canPanic ? 1.05 : 1 }}
                  whileTap={{ scale: canPanic ? 0.95 : 1 }}
                  onClick={() => setShowPanicConfirm(true)}
                  disabled={!canPanic || isQuarantined}
                  className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    isQuarantined 
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : canPanic 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  {isQuarantined ? <Lock size={18} /> : <AlertTriangle size={18} />}
                  {isQuarantined ? 'Already Locked' : 'Panic Button'}
                </motion.button>
              ) : (
                <motion.div
                  key="panic-confirm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col sm:flex-row items-center gap-3"
                >
                  <select
                    value={panicDuration}
                    onChange={(e) => setPanicDuration(Number(e.target.value))}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={72}>3 days</option>
                    <option value={168}>7 days</option>
                  </select>
                  <button
                    onClick={handlePanic}
                    disabled={isPanicking}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {isPanicking ? 'Locking...' : 'Confirm Lock'}
                  </button>
                  <button
                    onClick={() => setShowPanicConfirm(false)}
                    className="px-4 py-2 text-white/60 hover:text-white rounded-xl"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {isQuarantined && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="flex items-center gap-2 text-red-400">
                <Clock size={16} />
                <span className="text-sm">
                  Auto-unlock in <strong>{remainingHours}h {remainingMinutes}m</strong>
                </span>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </div>
    </section>
  );
}

