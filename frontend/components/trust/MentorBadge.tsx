/**
 * Mentor Badge Component - Shows mentor status with glow effect
 */

'use client'

import { motion } from 'framer-motion'
import { useIsMentor, useMentorInfo } from '@/lib/vfide-hooks'

interface MentorBadgeProps {
  address?: `0x${string}`
  size?: 'sm' | 'md' | 'lg'
  showMenteeCount?: boolean
}

export function MentorBadge({ address, size = 'md', showMenteeCount = true }: MentorBadgeProps) {
  const { isMentor, isLoading } = useIsMentor(address)
  const { menteeCount } = useMentorInfo(address)

  if (isLoading || !isMentor) return null

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="relative inline-block"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-lg"
        style={{ backgroundColor: '#00FF88' }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Badge */}
      <div
        className={`relative ${sizeClasses[size]} rounded-full font-bold bg-gradient-to-r from-[#00FF88] to-[#00F0FF] text-[#0A0A0A] flex items-center gap-2`}
        style={{
          boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
        }}
      >
        <span>🎓</span>
        <span>Mentor</span>
        {showMenteeCount && menteeCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-[#0A0A0A]/30 rounded-full px-2 py-0.5"
          >
            {menteeCount}/10
          </motion.span>
        )}
      </div>
    </motion.div>
  )
}
