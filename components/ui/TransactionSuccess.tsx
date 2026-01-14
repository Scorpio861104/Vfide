/**
 * TransactionSuccess - Celebration overlay for successful transactions
 * Shows confetti, score increase animation, and share options
 */

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Share2, X, Trophy, Sparkles } from 'lucide-react'

interface TransactionSuccessProps {
  isOpen: boolean
  onClose: () => void
  txHash?: string
  amount?: string
  recipient?: string
  scoreIncrease?: number
  badgeUnlocked?: string
  type?: 'payment' | 'vote' | 'stake' | 'badge' | 'escrow'
}

interface ConfettiParticle {
  id: number;
  color: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotateDir: number;
  borderRadius: string;
}

// Confetti particle component
function Confetti() {
  const [particles, setParticles] = useState<ConfettiParticle[]>([])

  useEffect(() => {
    const colors = ['#00F0FF', '#FFD700', '#50C878', '#FF6B6B', '#A78BFA', '#0080FF']
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)] || '#00F0FF',
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      rotateDir: Math.random() > 0.5 ? 1 : -1,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    }))
     
    setParticles(newParticles)
  }, [])

  if (particles.length === 0) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
            x: `${p.x}vw`, 
            y: -20, 
            rotate: 0,
            opacity: 1 
          }}
          animate={{ 
            y: '100vh', 
            rotate: 360 * p.rotateDir,
            opacity: 0 
          }}
          transition={{ 
            duration: p.duration, 
            delay: p.delay,
            ease: 'linear'
          }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.borderRadius,
          }}
        />
      ))}
    </div>
  )
}

export function TransactionSuccess({
  isOpen,
  onClose,
  txHash,
  amount,
  scoreIncrease = 5,
  badgeUnlocked,
  type = 'payment'
}: TransactionSuccessProps) {
  useEffect(() => {
    if (isOpen) {
      // Auto-close after 5 seconds
      const timeout = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [isOpen, onClose])

  const titles: Record<string, string> = {
    payment: 'Payment Complete! 🎉',
    vote: 'Vote Submitted! 🗳️',
    stake: 'Tokens Staked! 🔒',
    badge: 'Badge Earned! 🏆',
    escrow: 'Escrow Created! 🤝',
  }

  const handleShare = () => {
    const text = type === 'vote' 
      ? `Just voted on a VFIDE proposal! Building the future of trust-based payments 🗳️`
      : `Just completed a transaction on VFIDE! 0% payment processing fees 🚀`
    
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://vfide.app')}`,
      '_blank'
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          {/* Confetti */}
          <Confetti />

          {/* Success Card */}
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-linear-to-br from-[#2A2A2F] to-[#1A1A1D] border-2 border-[#50C878] rounded-2xl p-8 max-w-md w-full text-center"
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-[#A0A0A5] hover:text-[#F5F3E8]"
            >
              <X size={20} />
            </button>

            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-4 bg-[#50C878]/20 rounded-full flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-[#50C878]" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-[#F5F3E8] mb-2"
            >
              {titles[type]}
            </motion.h2>

            {/* Amount */}
            {amount && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-[#00F0FF] mb-4"
              >
                {amount} VFIDE
              </motion.div>
            )}

            {/* Score Increase Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700]/20 border border-[#FFD700] rounded-full mb-4"
            >
              <Sparkles className="w-4 h-4 text-[#FFD700]" />
              <span className="text-[#FFD700] font-bold">+{scoreIncrease} ProofScore</span>
            </motion.div>

            {/* Badge Unlocked */}
            {badgeUnlocked && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-2 p-3 bg-[#A78BFA]/20 border border-[#A78BFA] rounded-lg mb-4"
              >
                <Trophy className="w-5 h-5 text-[#A78BFA]" />
                <span className="text-[#A78BFA] font-bold">Badge Unlocked: {badgeUnlocked}</span>
              </motion.div>
            )}

            {/* Transaction Hash */}
            {txHash && (
              <motion.a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="block text-[#00F0FF] text-sm hover:underline mb-4"
              >
                View on Explorer →
              </motion.a>
            )}

            {/* Share Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black border border-[#3A3A3F] rounded-lg text-[#F5F3E8] hover:bg-[#1A1A1D] transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share on X
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
