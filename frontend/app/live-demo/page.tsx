/**
 * VFIDE Live Demo Page
 * Shows ALL real-time features in one mind-blowing showcase
 */

'use client'

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer'
import { LiveActivityFeed } from '@/components/trust/LiveActivityFeed'
import { FeeSavingsCalculator } from '@/components/commerce/FeeSavingsCalculator'
import { LiveSystemStats } from '@/components/stats/LiveSystemStats'
import { TransactionNotification, useTransactionNotifications } from '@/components/wallet/TransactionNotification'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'

export default function LiveDemoPage() {
  const { address, isConnected } = useAccount()
  const { notification, showNotification, closeNotification } = useTransactionNotifications()
  
  // Demo transaction handler
  const handleDemoTransaction = (type: 'transfer' | 'endorse' | 'vote') => {
    showNotification(
      'pending',
      'Transaction Pending',
      `Your ${type} transaction is being processed on zkSync...`,
      '0x1234567890abcdef'
    )
    
    setTimeout(() => {
      showNotification(
        'success',
        'Success!',
        `Your ${type} was successful! 🎉`,
        '0x1234567890abcdef'
      )
    }, 3000)
  }
  
  return (
    <>
      <GlobalNav />
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#1A1A2E] py-16 sm:py-20 px-3 sm:px-4 pt-20 sm:pt-24 overflow-x-hidden">
      <TransactionNotification 
        notification={notification}
        onClose={closeNotification}
      />
      
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 md:space-y-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 sm:space-y-4"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#F5F3E8]">
            Experience{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0080FF]">
              VFIDE Live
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[#F5F3E8]/60 max-w-2xl mx-auto px-2">
            Real-time blockchain data that makes people{' '}
            <span className="text-[#00FF88] font-bold">excited</span> and want to be{' '}
            <span className="text-[#FFD700] font-bold">all in</span> on VFIDE
          </p>
        </motion.div>
        
        {/* Network Stats - Full Width */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <LiveSystemStats />
        </motion.div>
        
        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* ProofScore Visualizer */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-4 sm:p-6 md:p-8"
            >
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#F5F3E8] mb-3 sm:mb-4 md:mb-6 text-center">
                Your ProofScore Reputation
              </h2>
              <div className="flex justify-center">
                <div className="hidden sm:block">
                  <ProofScoreVisualizer address={address} size="large" showDetails />
                </div>
                <div className="sm:hidden">
                  <ProofScoreVisualizer address={address} size="medium" showDetails />
                </div>
              </div>
              
              {isConnected && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 sm:mt-6 md:mt-8 space-y-2 sm:space-y-3"
                >
                  <button
                    onClick={() => handleDemoTransaction('endorse')}
                    className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0A] font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:scale-105 transition-transform text-sm sm:text-base"
                  >
                    Endorse Another User
                  </button>
                  <button
                    onClick={() => handleDemoTransaction('vote')}
                    className="w-full bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:scale-105 transition-transform text-sm sm:text-base"
                  >
                    Vote on DAO Proposal
                  </button>
                </motion.div>
              )}
            </motion.div>
            
            {/* Fee Calculator */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#0F0F0F]/50 backdrop-blur-xl rounded-2xl p-4 sm:p-6 md:p-8 border border-[#00F0FF]/20"
            >
              <FeeSavingsCalculator />
            </motion.div>
          </div>
          
          {/* Right Column - Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0F0F0F]/50 backdrop-blur-xl rounded-2xl p-4 sm:p-6 md:p-8 border border-[#00F0FF]/20"
          >
            <LiveActivityFeed />
            
            {/* Quick Actions */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-4 sm:mt-6 md:mt-8 grid grid-cols-2 gap-2 sm:gap-3"
              >
                <button
                  onClick={() => handleDemoTransaction('transfer')}
                  className="bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-white font-bold py-2 sm:py-3 px-2 sm:px-4 rounded-lg hover:scale-105 transition-transform text-xs sm:text-sm"
                >
                  Send VFIDE
                </button>
                <button
                  className="bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-[#0A0A0A] font-bold py-2 sm:py-3 px-2 sm:px-4 rounded-lg hover:scale-105 transition-transform text-xs sm:text-sm"
                >
                  Pay Merchant
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF] via-[#00FF88] to-[#FFD700] rounded-2xl blur-2xl opacity-20" />
          <div className="relative bg-[#0F0F0F]/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 md:p-8 lg:p-12 border-2 border-[#00F0FF]/30 text-center space-y-3 sm:space-y-4 md:space-y-6">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-[#F5F3E8]">
              Ready for No Processor Fees?
            </h2>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-[#F5F3E8]/70 max-w-2xl mx-auto">
              Join thousands building trust-based commerce with non-custodial vaults and DAO governance.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center items-center">
              <button className="w-full sm:w-auto bg-gradient-to-r from-[#00FF88] to-[#00F0FF] text-[#0A0A0A] font-bold py-2 sm:py-3 md:py-4 px-4 sm:px-6 md:px-8 rounded-xl hover:scale-105 transition-transform text-sm sm:text-base md:text-lg">
                Create Your Vault
              </button>
              <button className="w-full sm:w-auto bg-[#0F0F0F] border-2 border-[#00F0FF] text-[#00F0FF] font-bold py-2 sm:py-3 md:py-4 px-4 sm:px-6 md:px-8 rounded-xl hover:scale-105 transition-transform text-sm sm:text-base md:text-lg">
                Read Docs
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    <Footer />
  </>
  )
}
