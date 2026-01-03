'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useEndorse } from '@/hooks/useProofScoreHooks'

interface EndorsementCardProps {
  targetAddress: `0x${string}`
  endorserScore?: number
  onSuccess?: () => void
}

export function EndorsementCard({ 
  targetAddress, 
  endorserScore = 0,
  onSuccess 
}: EndorsementCardProps) {
  const { endorse, isEndorsing, isSuccess, error, isValid } = useEndorse(targetAddress)
  const [reason, setReason] = useState('')
  const [showInput, setShowInput] = useState(false)

  const canEndorse = endorserScore >= 7000 && isValid

  const handleEndorse = async () => {
    if (!canEndorse) return
    const result = await endorse(reason || 'strong endorsement')
    if (result.success) {
      setReason('')
      setShowInput(false)
      onSuccess?.()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-xl p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-100 flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-400" />
            Endorsement
          </h3>
          
          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              disabled={!canEndorse || isEndorsing}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                canEndorse
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {!isValid ? 'Invalid address' : endorserScore < 7000 ? `Need score ≥7000 (${endorserScore})` : 'Endorse'}
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                maxLength={160}
                placeholder="Why you endorse them..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs bg-gray-900/50 border border-amber-500/30 rounded px-2 py-1.5 text-white placeholder-gray-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEndorse}
                  disabled={isEndorsing}
                  className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded transition disabled:opacity-50"
                >
                  {isEndorsing ? 'Endorsing...' : 'Confirm'}
                </button>
                <button
                  onClick={() => { setShowInput(false); setReason('') }}
                  className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isSuccess && (
            <p className="text-xs text-green-400 mt-2">✓ Endorsement sent!</p>
          )}
          {error && (
            <p className="text-xs text-red-400 mt-2">✗ {error}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
