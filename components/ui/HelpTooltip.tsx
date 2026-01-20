/**
 * HelpTooltip - Contextual help icon with tooltip explanation
 * Use next to complex terms or features
 */

'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface HelpTooltipProps {
  term: string
  children?: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

// Predefined explanations for common terms
const glossary: Record<string, string> = {
  'ProofScore': 'A dynamic reputation score (0-10,000) based on your on-chain behavior. Higher scores = lower transfer fees (0.25% vs 5%).',
  'Vault': 'Your personal smart contract wallet with built-in security features like guardians, inheritance, and panic buttons.',
  'Guardian': 'Trusted addresses you designate to help recover your vault if you lose access. They cannot access your funds directly.',
  'Next of Kin': 'Your designated heir who can claim vault ownership if you pass away, after a 30-day waiting period.',
  'Escrow': 'Funds held by a smart contract until both buyer and seller agree the transaction is complete. Protects both parties.',
  'Burn': 'Tokens permanently destroyed (sent to 0x0 address). Reduces total supply, making remaining tokens more scarce.',
  'Sanctum': 'VFIDE\'s charity vault. 10% of all transfer fees go here to fund social good initiatives voted by the community.',
  'Quarantine': 'A self-imposed lock on your vault. Use it if you suspect your account is compromised. Blocks all outgoing transactions.',
  'Council': 'A 12-member elected body that provides oversight and can approve emergency actions. Requires 70%+ ProofScore.',
  'Tier': 'Your trust level based on ProofScore: Elite (8000+), Verified (7000+), Trusted (5000+), Neutral (below 5000).',
  'Transfer Fee': 'Fee applied when sending VFIDE tokens. Ranges from 0.25% (Elite) to 5% (Low Trust). Split between burn, Sanctum, and ecosystem.',
  'Commitment Period': 'Time during which presale tokens are locked. Founding tier = 180 days, Oath tier = 90 days.',
  'Badge': 'On-chain achievement that boosts your ProofScore. Can be minted as soulbound NFTs.',
  'Soulbound': 'NFTs that cannot be transferred. They stay with the original wallet forever, proving authentic achievements.',
  'Gas': 'Network fees paid to blockchain validators. On Base, typically $0.01-0.10 per transaction.',
}

export function HelpTooltip({ 
  term, 
  children, 
  position = 'top',
  className = '' 
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const explanation = children || glossary[term] || `Learn more about ${term}`
  
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[#2A2A2F] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[#2A2A2F] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[#2A2A2F] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[#2A2A2F] border-y-transparent border-l-transparent',
  }

  return (
    <span 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onTouchStart={() => setIsOpen(!isOpen)}
    >
      <HelpCircle 
        className="w-4 h-4 text-zinc-400 hover:text-cyan-400 cursor-help transition-colors" 
      />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl max-w-xs">
              <div className="font-bold text-cyan-400 text-sm mb-1">{term}</div>
              <div className="text-zinc-100 text-xs leading-relaxed">{explanation}</div>
            </div>
            {/* Arrow */}
            <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

// Inline help text with tooltip
export function HelpTerm({ 
  term, 
  children 
}: { 
  term: string
  children?: React.ReactNode 
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="border-b border-dotted border-zinc-400">{term}</span>
      <HelpTooltip term={term}>{children}</HelpTooltip>
    </span>
  )
}
