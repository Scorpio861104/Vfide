/**
 * TransactionSuccess - Celebration overlay for successful transactions
 * Shows confetti, score increase animation, and share options
 */

'use client'

import { useEffect, useMemo } from 'react'
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
  const particles = useMemo<ConfettiParticle[]>(() => {
    const colors = ['#00F0FF', '#FFD700', '#50C878', '#FF6B6B', '#A78BFA', '#0080FF']
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length] || '#00F0FF',
      x: (i * 37 + 13) % 100,
      delay: (i % 10) * 0.05,
      duration: 2 + (i % 4) * 0.5,
      size: 6 + (i % 4) * 2,
      rotateDir: i % 2 === 0 ? 1 : -1,
      borderRadius: i % 2 === 0 ? '50%' : '2px',
    }))
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
      '_blank',
      'noopener,noreferrer'
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
            className="relative bg-linear-to-br from-zinc-800 to-zinc-900 border-2 border-emerald-500 rounded-2xl p-8 max-w-md w-full text-center"
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
            >
              <X size={20} />
            </button>

            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-zinc-100 mb-2"
            >
              {titles[type]}
            </motion.h2>

            {/* Amount */}
            {amount && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-cyan-400 mb-4"
              >
                {amount} VFIDE
              </motion.div>
            )}

            {/* Score Increase Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/20 border border-amber-400 rounded-full mb-4"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-bold">+{scoreIncrease} ProofScore</span>
            </motion.div>

            {/* Badge Unlocked */}
            {badgeUnlocked && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-2 p-3 bg-violet-400/20 border border-violet-400 rounded-lg mb-4"
              >
                <Trophy className="w-5 h-5 text-violet-400" />
                <span className="text-violet-400 font-bold">Badge Unlocked: {badgeUnlocked}</span>
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
                className="block text-cyan-400 text-sm hover:underline mb-4"
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
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-100 hover:bg-zinc-900 transition-colors"
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
