'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  Copy,
  Check,
  Mail,
  MessageCircle,
  Twitter,
  Share2,
  Users,
  Gift,
  Trophy,
  Zap,
  QrCode,
} from 'lucide-react'
import Link from 'next/link'
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard'

export default function InviteFriendsPage() {
  const { address } = useAccount()
  const { copied, copy } = useCopyToClipboard()
  const [_selectedMethod, setSelectedMethod] = useState<string | null>(null)

  // Generate referral link
  const referralCode = address ? `${address.slice(0, 8)}` : 'connect-wallet'
  const referralLink = `https://vfide.io/invite/${referralCode}`

  const handleCopy = () => {
    copy(referralLink)
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join me on VFIDE!')
    const body = encodeURIComponent(
      `I'm using VFIDE for trust-based payments. Join me using my invite link: ${referralLink}`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer')
  }

  const shareViaTwitter = () => {
    const text = encodeURIComponent(
      `Join me on VFIDE - the future of trust-based payments! ${referralLink}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on VFIDE - the future of trust-based payments! ${referralLink}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const rewards = [
    {
      icon: Gift,
      title: 'Earn Rewards',
      description: 'Get 100 VFIDE tokens for each friend who joins',
      color: 'text-emerald-400',
    },
    {
      icon: Trophy,
      title: 'Unlock Badges',
      description: 'Earn exclusive badges as you invite more friends',
      color: 'text-amber-400',
    },
    {
      icon: Zap,
      title: 'Boost ProofScore',
      description: 'Increase your ProofScore with every successful invite',
      color: 'text-cyan-400',
    },
  ]

  const shareMethod = [
    {
      id: 'email',
      icon: Mail,
      label: 'Email',
      action: shareViaEmail,
      color: 'bg-blue-500',
    },
    {
      id: 'twitter',
      icon: Twitter,
      label: 'Twitter',
      action: shareViaTwitter,
      color: 'bg-sky-500',
    },
    {
      id: 'whatsapp',
      icon: MessageCircle,
      label: 'WhatsApp',
      action: shareViaWhatsApp,
      color: 'bg-green-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full mb-4">
            <Users className="w-8 h-8 text-pink-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent mb-4">
            Invite Friends
          </h1>
          <p className="text-gray-400 text-lg">
            Share VFIDE with friends and earn rewards together
          </p>
        </motion.div>

        {/* Rewards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {rewards.map((reward, index) => (
            <motion.div
              key={reward.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 text-center hover:border-zinc-600 transition-colors"
            >
              <div className="inline-flex items-center justify-center p-3 bg-zinc-800 rounded-full mb-4">
                <reward.icon className={`w-6 h-6 ${reward.color}`} />
              </div>
              <h3 className="text-lg font-bold mb-2">{reward.title}</h3>
              <p className="text-sm text-gray-400">{reward.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Referral Link Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 border border-zinc-700 rounded-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-pink-400" />
            Your Invite Link
          </h2>
          <p className="text-gray-400 mb-6">
            Share this link with your friends to invite them to VFIDE
          </p>

          {/* Link Display */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg p-4 font-mono text-sm break-all">
              {referralLink}
            </div>
            <button
              onClick={handleCopy}
              className="px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 min-w-[120px]"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* QR Code Info */}
          <div className="bg-zinc-950/50 border border-zinc-700 rounded-lg p-4 flex items-center gap-3">
            <QrCode className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-400">
              Visit{' '}
              <Link href="/profile" className="text-cyan-400 hover:underline">
                your profile
              </Link>{' '}
              to generate a QR code for this invite link
            </p>
          </div>
        </motion.div>

        {/* Share Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Share Via</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shareMethod.map((method) => (
              <motion.button
                key={method.id}
                onClick={() => {
                  setSelectedMethod(method.id)
                  method.action()
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`${method.color} hover:opacity-90 rounded-xl p-6 transition-all flex flex-col items-center gap-3`}
              >
                <method.icon className="w-8 h-8 text-white" />
                <span className="font-semibold text-white">{method.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-zinc-900/50 border border-zinc-700 rounded-xl p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Your Invite Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-pink-400">0</p>
              <p className="text-sm text-gray-400 mt-1">Invited</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400">0</p>
              <p className="text-sm text-gray-400 mt-1">Rewards</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">0</p>
              <p className="text-sm text-gray-400 mt-1">Badges</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-400">0</p>
              <p className="text-sm text-gray-400 mt-1">Points</p>
            </div>
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          <p>
            Connect your wallet to get a personalized invite link and start earning
            rewards
          </p>
        </motion.div>
      </div>
    </div>
  )
}
