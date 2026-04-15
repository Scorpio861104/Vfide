'use client'

import { useReadContract, useAccount } from 'wagmi'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Clock } from 'lucide-react'
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts'
import { SeerSocialABI } from '@/lib/abis'
import { safeBigIntToNumber } from '@/lib/validation'

interface EndorsementStatsProps {
  address?: `0x${string}`
  size?: 'small' | 'medium'
}

export function EndorsementStats({ 
  address, 
  size = 'medium' 
}: EndorsementStatsProps) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.SeerSocial)

  const { data: statsData, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.SeerSocial,
    abi: SeerSocialABI,
    functionName: 'getEndorsementStats',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && isAvailable,
    }
  })

  const stats = statsData as readonly [bigint, bigint, bigint] | undefined
  const [activeEndorsers = 0, activeBonus = 0, youGave = 0] = stats ? 
    [safeBigIntToNumber(stats[0], 0), safeBigIntToNumber(stats[1], 0), safeBigIntToNumber(stats[2], 0)] : 
    [0, 0, 0]

  const sizeClasses = size === 'small' ? 'text-sm' : 'text-base'
  const iconSize = size === 'small' ? 'w-4 h-4' : 'w-5 h-5'

  if (isLoading) {
    return <div className="h-12 bg-gray-800/30 rounded-lg animate-pulse" />
  }

  return (
    <div className={`grid grid-cols-3 gap-2 ${sizeClasses}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-lg p-3 text-center"
      >
        <div className="flex items-center justify-center gap-1 mb-1">
          <Users className={`${iconSize} text-red-400`} />
        </div>
        <div className="font-bold text-white">{activeEndorsers}</div>
        <div className="text-xs text-gray-400">Endorsers</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 border border-amber-500/30 rounded-lg p-3 text-center"
      >
        <div className="flex items-center justify-center gap-1 mb-1">
          <TrendingUp className={`${iconSize} text-amber-400`} />
        </div>
        <div className="font-bold text-white">+{activeBonus}</div>
        <div className="text-xs text-gray-400">Score Bonus</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-lg p-3 text-center"
      >
        <div className="flex items-center justify-center gap-1 mb-1">
          <Clock className={`${iconSize} text-blue-400`} />
        </div>
        <div className="font-bold text-white">{youGave}</div>
        <div className="text-xs text-gray-400">You Gave</div>
      </motion.div>
    </div>
  )
}
