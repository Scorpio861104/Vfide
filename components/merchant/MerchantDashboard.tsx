/**
 * MerchantDashboard - Complete merchant management interface
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  useIsMerchant,
  useRegisterMerchant,
  useSetAutoConvert,
  useSetPayoutAddress,
  useProofScore,
} from '@/lib/vfide-hooks'
import { useAccount } from 'wagmi'
import { Store, DollarSign, Settings, Zap, Shield, CheckCircle2, Sparkles } from 'lucide-react'
import { isAddress } from 'viem'
import { useTransactionSounds } from '@/hooks/useTransactionSounds'
import { useEffect } from 'react'

// Animated counter component
function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: 'easeOut' });
    return controls.stop;
  }, [value, count]);
  
  return <motion.span className={className}>{rounded}</motion.span>;
}

export function MerchantDashboard() {
  const { address } = useAccount()
  const merchantInfo = useIsMerchant(address)
  const { registerMerchant, isRegistering, isSuccess: registrationSuccess } = useRegisterMerchant()
  const { setAutoConvert, isSetting: isSettingConvert, isSuccess: convertSuccess } = useSetAutoConvert()
  const { setPayoutAddress, isSetting: isSettingPayout, isSuccess: payoutSuccess } = useSetPayoutAddress()
  const { score, canMerchant } = useProofScore(address)
  
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('retail')
  const [autoConvertEnabled, setAutoConvertEnabled] = useState(false)
  const [customPayout, setCustomPayout] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const { playSuccess, playNotification, playError: _playError } = useTransactionSounds()

  const categories = [
    'retail', 'services', 'digital_goods', 'food_beverage', 
    'professional_services', 'education', 'entertainment', 'other'
  ]

  if (!address) {
    return (
      <motion.div 
        className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Store className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        </motion.div>
        <p className="text-gray-400">Connect wallet to access merchant dashboard</p>
      </motion.div>
    )
  }

  // Registration Flow
  if (!merchantInfo.isMerchant) {
    return (
      <div className="space-y-6">
        {/* Celebration Overlay */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <motion.div
                  className="text-8xl mb-4"
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  🎉
                </motion.div>
                <p className="text-3xl font-bold text-white">Welcome, Merchant!</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div 
          className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-2 border-purple-500/30 rounded-xl p-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.div 
              className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Store className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <h2 className="text-3xl font-bold">Become a Merchant</h2>
              <p className="text-gray-400">Accept VFIDE payments with 0% protocol fees</p>
            </div>
          </div>
        </motion.div>

        {/* Requirements Check */}
        <motion.div 
          className="bg-gray-900/50 border border-gray-700 rounded-xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-bold text-lg mb-4">Requirements</h3>
          <div className="space-y-3">
            <motion.div 
              className={`flex items-center gap-3 ${score >= 5600 ? 'text-green-400' : 'text-red-400'}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {score >= 5600 ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </motion.div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
              <span>ProofScore ≥ 5,600 (Current: <AnimatedCounter value={score} />)</span>
            </motion.div>
            {!canMerchant && (
              <motion.div 
                className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-400"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                Increase your ProofScore by: Receiving endorsements, participating in governance, or becoming a mentor
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Registration Form */}
        <AnimatePresence>
          {canMerchant && (
            <motion.div 
              className="bg-gray-900/50 border border-gray-700 rounded-xl p-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="font-bold text-lg mb-4">Register Your Business</h3>
              
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="text-sm text-gray-400 mb-2 block">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) =>  setBusinessName(e.target.value)}
                    placeholder="e.g., Acme Coffee Shop"
                    className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="text-sm text-gray-400 mb-2 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) =>  setCategory(e.target.value)}
                    className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.button
                  onClick={() => {
                    registerMerchant(businessName, category)
                    playNotification()
                  }}
                  disabled={isRegistering || !businessName.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {isRegistering ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Registering...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Register as Merchant
                    </span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {registrationSuccess && (
                    <motion.div 
                      className="bg-green-900/20 border border-green-500 rounded-lg p-3 text-center text-green-400 text-sm"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      onAnimationComplete={() => {
                        setShowCelebration(true)
                        playSuccess()
                        setTimeout(() => setShowCelebration(false), 3000)
                      }}
                    >
                      ✅ Registration successful! Refreshing...
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: DollarSign, color: 'blue', title: 'No Processor Fees', desc: 'No payment processing fees. Burn fees (0.25-5%) + Base gas apply.' },
            { icon: Zap, color: 'green', title: 'Fast Settlement', desc: 'QR and trusted payments settle instantly. Escrow stays available for buyer protection.' },
            { icon: Shield, color: 'purple', title: 'STABLE-PAY (Optional)', desc: 'Auto-convert to stablecoins via DEX. ~0.3% DEX swap fee + gas apply.' }
          ].map((benefit, index) => (
            <motion.div 
              key={benefit.title}
              className={`bg-${benefit.color}-900/10 border border-${benefit.color}-500/20 rounded-lg p-4`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.02, borderColor: `rgba(var(--${benefit.color}-500), 0.5)` }}
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.3 }}
              >
                <benefit.icon className={`w-8 h-8 text-${benefit.color}-400 mb-2`} />
              </motion.div>
              <div className={`font-bold text-${benefit.color}-400 mb-1`}>{benefit.title}</div>
              <div className="text-xs text-gray-400">{benefit.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // Merchant Dashboard
  return (
    <div className="space-y-6">
      {/* Status Header */}
      <motion.div 
        className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-2 border-green-500/30 rounded-xl p-6 relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Animated background shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Store className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <div className="text-sm text-gray-400">Registered Merchant</div>
              <div className="text-2xl font-bold">{merchantInfo.businessName}</div>
            </div>
          </div>
          {merchantInfo.isSuspended && (
            <motion.div 
              className="bg-red-600 px-4 py-2 rounded-lg font-bold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              SUSPENDED
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-3xl font-bold text-green-400">
              <AnimatedCounter value={parseFloat(merchantInfo.totalVolume) || 0} />
            </div>
            <div className="text-xs text-gray-400">Total Volume (VFIDE)</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-3xl font-bold text-blue-400">
              <AnimatedCounter value={merchantInfo.txCount || 0} />
            </div>
            <div className="text-xs text-gray-400">Transactions</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-3xl font-bold text-purple-400">
              {merchantInfo.category.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </div>
            <div className="text-xs text-gray-400">Category</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STABLE-PAY Settings */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-yellow-400" />
            <div className="font-bold text-lg">STABLE-PAY</div>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Auto-convert VFIDE payments to stablecoins via DEX swap to protect against volatility.
            DEX swap fees (~0.3%) + gas costs apply. 5% max slippage protection included.
          </p>

          <div className="flex items-center justify-between mb-4">
            <span className="text-white">Auto-Convert Enabled</span>
            <motion.button
              onClick={() => {
                setAutoConvert(!autoConvertEnabled)
                setAutoConvertEnabled(!autoConvertEnabled)
                playNotification()
              }}
              disabled={isSettingConvert}
              className={`w-14 h-8 rounded-full transition-colors ${
                autoConvertEnabled ? 'bg-green-600' : 'bg-gray-600'
              } relative`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full absolute top-1"
                animate={{ x: autoConvertEnabled ? 28 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>

          {convertSuccess && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-2 text-center text-green-400 text-xs">
              ✅ Settings updated
            </div>
          )}
        </div>

        {/* Payout Settings */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-6 h-6 text-blue-400" />
            <div className="font-bold text-lg">Payout Address</div>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Set a custom address to receive payments (e.g., Treasury or RevenueSplitter).
            Leave empty to use your vault.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              value={customPayout}
              onChange={(e) =>  setCustomPayout(e.target.value)}
              placeholder="0x... (optional)"
              className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
            />

            <button
              onClick={() => setPayoutAddress(customPayout as `0x${string}`)}
              disabled={isSettingPayout || !isAddress(customPayout)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 rounded-lg transition-colors text-sm"
            >
              {isSettingPayout ? 'Updating...' : 'Update Payout Address'}
            </button>

            {payoutSuccess && (
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-2 text-center text-green-400 text-xs">
                ✅ Payout address updated
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Guide */}
      <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-3 text-blue-400">Integration Guide</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <div><strong className="text-white">1. QR Code:</strong> Generate payment QR codes with your merchant address</div>
          <div><strong className="text-white">2. API:</strong> Use MerchantPortal.processPayment() in your backend</div>
          <div><strong className="text-white">3. Widget:</strong> Embed VFIDE payment widget on your website</div>
          <div><strong className="text-white">4. PoS:</strong> Connect hardware terminals via our SDK</div>
        </div>
      </div>
    </div>
  )
}
