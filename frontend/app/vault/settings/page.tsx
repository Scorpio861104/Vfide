/**
 * Vault Settings Page - Advanced vault management and configuration
 */

'use client'

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { VaultSettingsPanel } from '@/components/vault/VaultSettingsPanel'
import { GuardianManagementPanel } from '@/components/security/GuardianManagementPanel'
import { Vault, Shield, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

export default function VaultSettingsPage() {
  return (
    <>
      <GlobalNav />
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white pt-20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4">
              <Vault className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400">
              Vault Settings
            </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Advanced security configuration and transaction management
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-8 mb-12">
          {/* Vault Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold">Transaction Controls</h2>
            </div>
            <VaultSettingsPanel />
          </motion.div>

          {/* Guardian Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold">Guardian Protection</h2>
            </div>
            <GuardianManagementPanel />
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="bg-gradient-to-br from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Advanced Security Features</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-purple-600/20 border-2 border-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-3xl">📸</span>
              </div>
              <div className="font-bold text-purple-400 mb-2">Balance Snapshot</div>
              <div className="text-xs text-gray-400">
                Lock balance reference for percentage thresholds to prevent manipulation via draining
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-orange-600/20 border-2 border-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🚨</span>
              </div>
              <div className="font-bold text-orange-400 mb-2">Abnormal TX Detection</div>
              <div className="text-xs text-gray-400">
                Automatic flagging of large transactions requiring manual approval before execution
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-blue-600/20 border-2 border-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-3xl">⏰</span>
              </div>
              <div className="font-bold text-blue-400 mb-2">Pending TX Queue</div>
              <div className="text-xs text-gray-400">
                Review, approve, execute, or cleanup flagged transactions with 24-hour expiry
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-green-600/20 border-2 border-green-500 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🛡️</span>
              </div>
              <div className="font-bold text-green-400 mb-2">Guardian Maturity</div>
              <div className="text-xs text-gray-400">
                7-day maturity period for new guardians prevents flash endorsement attacks
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-red-600/20 border-2 border-red-500 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🚫</span>
              </div>
              <div className="font-bold text-red-400 mb-2">Recovery Protection</div>
              <div className="text-xs text-gray-400">
                Cannot remove guardians during active recovery to prevent vote manipulation
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-yellow-600/20 border-2 border-yellow-500 rounded-xl flex items-center justify-center">
                <span className="text-3xl">⚖️</span>
              </div>
              <div className="font-bold text-yellow-400 mb-2">Inheritance Guard</div>
              <div className="text-xs text-gray-400">
                Guardians can cancel fraudulent inheritance claims when owner is unreachable
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="mt-8 bg-blue-900/10 border border-blue-500/20 rounded-xl p-6">
          <h3 className="font-bold text-lg mb-3 text-blue-400">Security Best Practices</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <div><strong className="text-white">1. Enable Snapshot Mode:</strong> If using percentage-based thresholds, enable snapshot mode after deposits to prevent threshold lowering attacks</div>
            <div><strong className="text-white">2. Set Reasonable Thresholds:</strong> Balance security (high threshold) with usability (low threshold). Typical: 10-50% or 10k-100k VFIDE</div>
            <div><strong className="text-white">3. Monitor Pending Transactions:</strong> Check pending queue regularly and cleanup expired transactions to optimize gas costs</div>
            <div><strong className="text-white">4. Guardian Diversity:</strong> Choose guardians from different devices/locations to prevent single point of failure</div>
            <div><strong className="text-white">5. Wait for Maturity:</strong> Do not rely on new guardians for 7 days until maturity period passes</div>
          </div>
        </div>
        </div>
        <Footer />
      </div>
    </>
  )
}
