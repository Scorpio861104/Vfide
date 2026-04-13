'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { Heart, Key, UserPlus, Users } from 'lucide-react';

interface VaultRecoveryPanelProps {
  address: string | undefined;
  vaultOwner: unknown;
  hasNextOfKin: boolean | undefined;
  nextOfKin: unknown;
  inheritanceStatus: { isActive: boolean; daysRemaining: number | null };
  guardianCount: number;
  isUserGuardian: boolean | undefined;
  isWritePending: boolean;
  newNextOfKinAddress: string;
  setNewNextOfKinAddress: (v: string) => void;
  handleSetNextOfKin: () => void;
  newGuardianAddress: string;
  setNewGuardianAddress: (v: string) => void;
  handleAddGuardian: () => void;
}

export function VaultRecoveryPanel({
  address, vaultOwner, hasNextOfKin, nextOfKin, inheritanceStatus,
  guardianCount, isUserGuardian, isWritePending,
  newNextOfKinAddress, setNewNextOfKinAddress, handleSetNextOfKin,
  newGuardianAddress, setNewGuardianAddress, handleAddGuardian,
}: VaultRecoveryPanelProps) {
  const ownerAddress = typeof vaultOwner === 'string' ? vaultOwner : undefined;
  const nextOfKinAddress = typeof nextOfKin === 'string' ? nextOfKin : undefined;
  const isOwner = !!address && !!ownerAddress && address === ownerAddress;

  return (
    <>
      {/* Next of Kin Section */}
      <section className="py-8 relative z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <GlassCard className="p-6 border-amber-500/30" gradient="gold" hover={false}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Heart className="text-amber-400" />
                  Next of Kin (Inheritance)
                </h2>
                <p className="text-white/60 text-sm max-w-2xl">
                  Estate planning for crypto. Your designated heir can claim vault ownership if you pass away.
                </p>
              </div>
              <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-center">
                <div className="text-amber-400 text-xs font-bold">INHERITANCE</div>
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-4">
              {hasNextOfKin && nextOfKinAddress ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-emerald-400 font-bold text-sm mb-1">✓ Next of Kin Configured</div>
                    <div className="font-mono text-white/80 text-sm">
                      {nextOfKinAddress.slice(0, 6)}...{nextOfKinAddress.slice(-4)}
                    </div>
                  </div>
                  {inheritanceStatus.isActive && (
                    <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                      <div className="text-amber-400 text-xs font-bold">
                        Claim Active ({inheritanceStatus.daysRemaining} days left)
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-amber-400 text-sm text-center py-2">
                  ⚠️ No Next of Kin set. Set one to enable inheritance.
                </div>
              )}
            </div>

            {isOwner && (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                 
                  value={newNextOfKinAddress}
                  onChange={(e) =>  setNewNextOfKinAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSetNextOfKin}
                  disabled={isWritePending || !newNextOfKinAddress}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Heart size={18} />
                  {isWritePending ? 'Processing...' : hasNextOfKin ? 'Update Next of Kin' : 'Set Next of Kin'}
                </motion.button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-amber-400 font-bold text-sm mb-1">🔓 Instant Inheritance</div>
                <div className="text-white/60 text-xs">No guardians = immediate access after death.</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-cyan-400 font-bold text-sm mb-1">🛡️ Protected Inheritance</div>
                <div className="text-white/60 text-xs">With guardians = 2/3 approval required.</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Guardian Management */}
      <section className="py-8 relative z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Key className="text-cyan-400" />
                  Chain of Return (Recovery)
                </h2>
                <p className="text-white/60 text-sm">
                  Lost wallet? Guardians help you regain access. Requires 2/3 approval + 7-day maturity.
                </p>
              </div>
              <div className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-center">
                <div className="text-cyan-400 text-xs font-bold">30-DAY EXPIRY</div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl mb-4">
              {guardianCount > 0 ? (
                <div className="text-center py-2">
                  <span className="text-white">{guardianCount} guardian{guardianCount !== 1 ? 's' : ''} configured</span>
                  {isUserGuardian && (
                    <div className="text-cyan-400 mt-2 text-sm">✓ You are a guardian</div>
                  )}
                </div>
              ) : (
                <div className="text-amber-400 text-sm text-center py-2">
                  ⚠️ No guardians. Next of Kin will have instant access.
                </div>
              )}
            </div>

            {isOwner && (
              <div className="space-y-3">
                <input
                  type="text"
                 
                  value={newGuardianAddress}
                  onChange={(e) =>  setNewGuardianAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddGuardian}
                  disabled={isWritePending || !newGuardianAddress}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  {isWritePending ? 'Processing...' : 'Add Guardian'}
                </motion.button>
              </div>
            )}
          </GlassCard>
        </div>
      </section>
    </>
  );
}
