/**
 * Vault Settings Page - Advanced vault management and configuration
 */

'use client'

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { VaultSettingsPanel } from '@/components/vault/VaultSettingsPanel'
import { GuardianManagementPanel } from '@/components/security/GuardianManagementPanel'
import { Vault, Shield, Settings, Key, Mail, User, Fingerprint, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'

// Recovery Setup Panel Component
function RecoverySetupPanel() {
  const [recoveryId, setRecoveryId] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedMethods, setSavedMethods] = useState({
    recoveryId: false,
    email: false,
    username: false
  })
  
  const handleSaveRecoveryId = async () => {
    if (!recoveryId.trim()) return
    setIsSubmitting(true)
    // Simulate contract call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSavedMethods(prev => ({ ...prev, recoveryId: true }))
    setIsSubmitting(false)
  }
  
  const handleSaveEmail = async () => {
    if (!email.trim()) return
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSavedMethods(prev => ({ ...prev, email: true }))
    setIsSubmitting(false)
  }
  
  const handleSaveUsername = async () => {
    if (!username.trim()) return
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSavedMethods(prev => ({ ...prev, username: true }))
    setIsSubmitting(false)
  }
  
  return (
    <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Key className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Wallet Recovery Setup</h3>
            <p className="text-sm text-gray-400">Never lose access to your vault</p>
          </div>
        </div>
        <Link href="/vault/recover">
          <span className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            Test Recovery <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
      
      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-cyan-400 mt-0.5" />
          <div>
            <p className="text-sm text-cyan-400 font-medium">Industry First: Wallet Recovery</p>
            <p className="text-xs text-gray-400 mt-1">
              If you lose your wallet, you can search for and recover your vault using these identifiers. 
              All data is stored as secure hashes - we never see your actual information.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Recovery ID */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-purple-400" />
              <span className="font-medium text-white">Recovery ID</span>
              <span className="text-xs text-purple-400 px-2 py-0.5 bg-purple-500/20 rounded-full">Recommended</span>
            </div>
            {savedMethods.recoveryId && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            A secret phrase only you know. Example: &quot;mygrandma&apos;s birthday plus my lucky number 7&quot;
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={recoveryId}
              onChange={(e) => setRecoveryId(e.target.value)}
              placeholder="Enter a memorable secret phrase..."
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-sm"
            />
            <motion.button
              onClick={handleSaveRecoveryId}
              disabled={isSubmitting || !recoveryId.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 text-sm font-medium hover:bg-purple-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </motion.button>
          </div>
        </div>
        
        {/* Email Recovery */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-white">Email Recovery</span>
            </div>
            {savedMethods.email && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Your email is hashed before storing - we never see your actual email address
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-sm"
            />
            <motion.button
              onClick={handleSaveEmail}
              disabled={isSubmitting || !email.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </motion.button>
          </div>
        </div>
        
        {/* Username */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-400" />
              <span className="font-medium text-white">VFide Username</span>
            </div>
            {savedMethods.username && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            A unique username for your vault (like a domain name for your identity)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a unique username..."
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-sm"
            />
            <motion.button
              onClick={handleSaveUsername}
              disabled={isSubmitting || !username.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-400 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Recovery Status */}
      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Recovery Protection Status</span>
          <span className={`text-sm font-medium ${
            Object.values(savedMethods).filter(Boolean).length >= 2 
              ? 'text-emerald-400' 
              : Object.values(savedMethods).filter(Boolean).length === 1
              ? 'text-amber-400'
              : 'text-red-400'
          }`}>
            {Object.values(savedMethods).filter(Boolean).length}/3 Methods Configured
          </span>
        </div>
        <div className="flex gap-2 mt-2">
          {['recoveryId', 'email', 'username'].map((method) => (
            <div 
              key={method}
              className={`flex-1 h-2 rounded-full ${
                savedMethods[method as keyof typeof savedMethods] ? 'bg-emerald-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

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
            Security, recovery, and transaction management
          </p>
        </div>
        
        {/* Recovery Setup - NEW PROMINENT SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-bold">Wallet Recovery</h2>
            <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">Important</span>
          </div>
          <RecoverySetupPanel />
        </motion.div>

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
