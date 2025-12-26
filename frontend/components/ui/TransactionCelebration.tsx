/**
 * TransactionCelebration - Animated celebration for successful transactions
 * Shows confetti, score increase animation, and share options
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Share2, ExternalLink, X, Sparkles, TrendingUp } from 'lucide-react'

interface TransactionCelebrationProps {
  isOpen: boolean
  onClose: () => void
  txHash?: string
  type: 'payment' | 'transfer' | 'stake' | 'vote' | 'badge'
  amount?: string
  scoreIncrease?: number
}

// Pre-generated confetti data to avoid Math.random during render
interface ConfettiData {
  id: number
  color: string
  startX: number
  endXOffset: number
  delay: number
  duration: number
  rotateDirection: number
}

// Generate confetti data once (deterministic based on index for consistency)
function generateConfettiData(): ConfettiData[] {
  const colors = ['#00F0FF', '#FFD700', '#50C878', '#FF6B6B', '#A78BFA']
  // Use deterministic pseudo-random based on index for consistent animation
  return Array.from({ length: 50 }, (_, i) => {
    // Simple seeded pseudo-random based on index
    const seed1 = ((i * 1234567) % 100)
    const seed2 = ((i * 7654321) % 100)
    const seed3 = ((i * 9876543) % 100)
    return {
      id: i,
      color: colors[i % colors.length],
      startX: seed1,
      endXOffset: (seed2 / 100 - 0.5) * 30,
      delay: (i % 10) * 0.05,
      duration: 2 + (seed3 / 100) * 2,
      rotateDirection: i % 2 === 0 ? 1 : -1,
    }
  })
}

// Pre-compute confetti outside component (runs once at module load)
const CONFETTI_DATA = generateConfettiData()

// Confetti particle component with pre-computed values
const Confetti = ({ data }: { data: ConfettiData }) => {
  return (
    <motion.div
      initial={{ y: -20, x: `${data.startX}vw`, opacity: 1, rotate: 0 }}
      animate={{ 
        y: '110vh', 
        x: `${data.startX + data.endXOffset}vw`,
        opacity: [1, 1, 0],
        rotate: 360 * data.rotateDirection
      }}
      transition={{ duration: data.duration, delay: data.delay, ease: 'linear' }}
      className="fixed top-0 w-3 h-3 rounded-sm z-50 pointer-events-none"
      style={{ backgroundColor: data.color }}
    />
  )
}

export function TransactionCelebration({
  isOpen,
  onClose,
  txHash,
  type,
  amount,
  scoreIncrease = 2,
}: TransactionCelebrationProps) {
  // Show confetti when modal is open - simple derivation, no effect needed
  const showConfetti = isOpen

  const getTitle = () => {
    switch (type) {
      case 'payment': return 'Payment Sent! 💸'
      case 'transfer': return 'Transfer Complete! ✅'
      case 'stake': return 'Staked Successfully! 🔒'
      case 'vote': return 'Vote Cast! 🗳️'
      case 'badge': return 'Badge Earned! 🏆'
      default: return 'Transaction Complete! 🎉'
    }
  }

  const getDescription = () => {
    if (amount) {
      return `${amount} VFIDE ${type === 'payment' ? 'sent' : 'transferred'} successfully`
    }
    return 'Your transaction has been confirmed on-chain'
  }

  const shareText = `Just completed a ${type} on @VFIDEapp! 🚀 Building my ProofScore one transaction at a time. #VFIDE #Web3`
  const shareUrl = txHash ? `https://basescan.org/tx/${txHash}` : 'https://vfide.app'

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'VFIDE Transaction',
          text: shareText,
          url: shareUrl,
        })
      } catch {
        // User cancelled
      }
    }
  }

  return (
    <>
      {/* Confetti layer */}
      {showConfetti && CONFETTI_DATA.map((data) => (
        <Confetti key={data.id} data={data} />
      ))}

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-[#2A2A2F] to-[#1A1A1D] border-2 border-[#00F0FF] rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-[#A0A0A5] hover:text-[#F5F3E8]"
              >
                <X size={24} />
              </button>

              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#50C878] flex items-center justify-center"
              >
                <CheckCircle2 className="w-14 h-14 text-[#1A1A1D]" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-[#F5F3E8] mb-2"
              >
                {getTitle()}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[#A0A0A5] mb-6"
              >
                {getDescription()}
              </motion.p>

              {/* Score increase animation */}
              {scoreIncrease > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#50C878]/20 border border-[#50C878] rounded-full mb-6"
                >
                  <TrendingUp className="w-5 h-5 text-[#50C878]" />
                  <span className="text-[#50C878] font-bold">+{scoreIncrease} ProofScore</span>
                  <Sparkles className="w-4 h-4 text-[#FFD700]" />
                </motion.div>
              )}

              {/* Transaction hash */}
              {txHash && (
                <motion.a
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-[#00F0FF] text-sm mb-6 hover:underline"
                >
                  <span>View on Explorer</span>
                  <ExternalLink size={14} />
                </motion.a>
              )}

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex gap-3"
              >
                <button
                  onClick={handleShare}
                  className="flex-1 px-4 py-3 bg-[#3A3A3F] text-[#F5F3E8] rounded-lg font-bold hover:bg-[#4A4A4F] transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  Share
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-3 bg-[#1DA1F2] text-white rounded-lg font-bold hover:bg-[#1a8cd8] transition-colors flex items-center justify-center gap-2"
                >
                  Post on 𝕏
                </a>
              </motion.div>

              {/* Done button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onClose}
                className="w-full mt-4 py-3 border-2 border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 transition-colors"
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
