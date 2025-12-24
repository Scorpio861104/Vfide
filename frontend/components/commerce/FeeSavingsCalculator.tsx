/**
 * Interactive Fee Savings Calculator
 * Shows MASSIVE savings vs traditional processors in real-time
 */

'use client'

import { useFeeCalculator, useProofScore } from '@/lib/vfide-hooks'
import { motion } from 'framer-motion'
import { useState } from 'react'

export function FeeSavingsCalculator() {
  const [amount, setAmount] = useState('100')
  const { score, burnFee, tier, color } = useProofScore()
  const calculator = useFeeCalculator(amount)
  
  const amountNum = parseFloat(amount) || 0
  
  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
      {/* Header */}
      <div className="text-center space-y-1 sm:space-y-2">
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#F5F3E8]">
          See Your Savings
        </h3>
        <p className="text-xs sm:text-sm md:text-base text-[#F5F3E8]/60">
          VFIDE vs Traditional Processors
        </p>
      </div>
      
      {/* Amount Input */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] rounded-xl blur-xl opacity-20" />
        <div className="relative bg-[#0F0F0F]/80 backdrop-blur-xl rounded-xl p-3 sm:p-4 md:p-6 border border-[#00F0FF]/30">
          <label className="block text-[10px] sm:text-xs md:text-sm text-[#F5F3E8]/70 mb-1 sm:mb-2">
            Payment Amount (USD)
          </label>
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <span className="text-xl sm:text-2xl md:text-3xl text-[#00F0FF]">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#F5F3E8] outline-none min-w-0 w-full"
              placeholder="100"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>
      
      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        {/* Stripe/Traditional */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-[#FF4444] rounded-xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="relative bg-[#0F0F0F]/80 backdrop-blur-xl rounded-xl p-2 sm:p-3 md:p-4 lg:p-6 border border-[#FF4444]/30 space-y-2 sm:space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm sm:text-base md:text-lg font-bold text-[#F5F3E8]">Stripe</h4>
              <span className="text-[8px] sm:text-[10px] md:text-xs text-[#F5F3E8]/50 hidden sm:block">2.9%+$0.30</span>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs md:text-sm text-[#F5F3E8]/60">Fee</span>
                <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#FF4444]">
                  ${calculator.stripeFee}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs md:text-sm text-[#F5F3E8]/60">Net</span>
                <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#F5F3E8]">
                  ${calculator.stripeNet}
                </span>
              </div>
            </div>
            
            {/* Animated bars showing fee proportion */}
            <div className="space-y-1 hidden sm:block">
              <div className="h-1.5 sm:h-2 bg-[#FF4444]/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#FF4444]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(parseFloat(calculator.stripeFee) / amountNum) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[8px] sm:text-[10px] md:text-xs text-[#F5F3E8]/40 text-center">
                {((parseFloat(calculator.stripeFee) / amountNum) * 100).toFixed(1)}% fee
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* VFIDE */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative group"
        >
          <div 
            className="absolute inset-0 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"
            style={{ backgroundColor: color }}
          />
          <div 
            className="relative bg-[#0F0F0F]/80 backdrop-blur-xl rounded-xl p-2 sm:p-3 md:p-4 lg:p-6 border space-y-2 sm:space-y-3 md:space-y-4"
            style={{ borderColor: `${color}50` }}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm sm:text-base md:text-lg font-bold text-[#F5F3E8]">VFIDE</h4>
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[10px] md:text-xs" style={{ color }}>
                  {burnFee}%
                </span>
                <div
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs md:text-sm text-[#F5F3E8]/60">Fee</span>
                <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold" style={{ color }}>
                  ${calculator.vfideFee}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs md:text-sm text-[#F5F3E8]/60">Net</span>
                <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#00FF88]">
                  ${calculator.vfideNet}
                </span>
              </div>
            </div>
            
            {/* Animated bars showing fee proportion */}
            <div className="space-y-1 hidden sm:block">
              <div className="h-1.5 sm:h-2 bg-[#00F0FF]/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(parseFloat(calculator.vfideFee) / amountNum) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[8px] sm:text-[10px] md:text-xs text-[#F5F3E8]/40 text-center">
                {((parseFloat(calculator.vfideFee) / amountNum) * 100).toFixed(1)}% burn
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* MASSIVE Savings Highlight */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#00FF88] to-[#00F0FF] rounded-xl blur-xl opacity-30" />
        <div className="relative bg-[#0F0F0F]/90 backdrop-blur-xl rounded-xl p-3 sm:p-4 md:p-6 lg:p-8 border-2 border-[#00FF88]/50 text-center space-y-1 sm:space-y-2">
          <div>
            <p className="text-[10px] sm:text-xs md:text-sm text-[#F5F3E8]/60 uppercase tracking-wider">
              You Save
            </p>
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#00FF88]">
              ${calculator.savings}
            </p>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-[#00F0FF]">
              ({calculator.savingsPercent}% cheaper!)
            </p>
          </div>
          
          {/* Annual Savings Calculator */}
          {amountNum > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-2 sm:pt-3 md:pt-4 mt-2 sm:mt-3 md:mt-4 border-t border-[#00F0FF]/20"
            >
              <p className="text-[10px] sm:text-xs text-[#F5F3E8]/50">
                If you process ${amount} monthly:
              </p>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-[#00FF88] mt-1 sm:mt-2">
                ${(parseFloat(calculator.savings) * 12).toFixed(2)}/year saved!
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
      
      {/* ProofScore Improvement Callout */}
      {score < 8000 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl p-2 sm:p-3 md:p-4 text-center"
        >
          <p className="text-xs sm:text-sm text-[#F5F3E8]/80">
            <strong style={{ color }}>Earn higher ProofScore</strong> to save more!
          </p>
          <p className="text-[10px] sm:text-xs text-[#F5F3E8]/50 mt-0.5 sm:mt-1">
            {tier === 'Neutral' ? 'Reach 8000 for 0.25% fees' : tier === 'High Trust' ? 'Almost there! Reach 8000 for lowest fees' : 'Build trust for 0.25% fees'}
          </p>
        </motion.div>
      )}
    </div>
  )
}
