/**
 * HelpTooltip - Contextual help icon with tooltip
 * Shows a "?" icon that reveals help text on hover/click
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X } from 'lucide-react'

interface HelpTooltipProps {
  content: string
  title?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  learnMoreLink?: string
  size?: 'sm' | 'md' | 'lg'
}

export function HelpTooltip({ 
  content, 
  title,
  position = 'top',
  learnMoreLink,
  size = 'md'
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#3A3A3F]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#3A3A3F]',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#3A3A3F]',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#3A3A3F]',
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-[#A0A0A5] hover:text-[#00F0FF] transition-colors focus:outline-none"
        aria-label="Help"
      >
        <HelpCircle className={sizeClasses[size]} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg p-3 shadow-xl max-w-xs">
              {title && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#00F0FF] font-bold text-sm">{title}</span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-[#A0A0A5] hover:text-[#F5F3E8] md:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-[#F5F3E8] text-sm leading-relaxed">{content}</p>
              {learnMoreLink && (
                <a
                  href={learnMoreLink}
                  className="text-[#00F0FF] text-xs hover:underline mt-2 inline-block"
                >
                  Learn more →
                </a>
              )}
            </div>
            {/* Arrow */}
            <div className={`absolute border-4 ${arrowClasses[position]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Common help definitions for reuse
export const helpContent = {
  proofScore: {
    title: 'ProofScore',
    content: 'Your on-chain reputation score (0-10,000) that affects transaction fees and governance rights. Higher score = lower fees.',
    link: '/docs#proofscore',
  },
  vault: {
    title: 'Personal Vault',
    content: 'A smart contract wallet with guardian recovery, inheritance, and security features. All VFIDE transfers flow through vaults.',
    link: '/docs#vault',
  },
  guardian: {
    title: 'Guardian',
    content: 'Trusted contacts who can help recover your vault if you lose access. They cannot access your funds without majority approval.',
    link: '/docs#guardians',
  },
  burnFee: {
    title: 'Burn Fee',
    content: 'A portion of each transfer is permanently destroyed, reducing total supply. Lower ProofScore = higher burn rate.',
    link: '/docs#fees',
  },
  escrow: {
    title: 'Escrow',
    content: 'Funds held by a smart contract until both parties fulfill their obligations. Protects buyers and sellers.',
    link: '/docs#escrow',
  },
  sanctum: {
    title: 'Sanctum Vault',
    content: 'Community treasury for charitable causes. 10% of all fees go to vetted charities voted on by the DAO.',
    link: '/docs#sanctum',
  },
  nextOfKin: {
    title: 'Next of Kin',
    content: 'Your designated heir who can claim vault ownership if you become incapacitated. Includes a waiting period for safety.',
    link: '/docs#inheritance',
  },
}
