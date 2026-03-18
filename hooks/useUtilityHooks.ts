'use client'

import { useState, useEffect } from 'react'
import { useProofScore } from './useProofScoreHooks'

// Re-export price hooks
export * from './usePriceHooks'

// ============================================
// SYSTEM STATS - Live network statistics
// ============================================

/**
 * System stats hook for dashboard display
 * 
 * In production, these would read from actual contract state:
 * - TVL: Sum of all vault balances (VaultRegistry.getTotalValueLocked())
 * - Vaults: Count of registered vaults (VaultRegistry.getVaultCount())
 * - Merchants: Count of registered merchants (MerchantRegistry.getMerchantCount())
 * - Transactions: Would require subgraph for 24h transaction count
 * 
 * Until data pipelines are connected, returns stable default values.
 */
export function useSystemStats() {
  const [stats, setStats] = useState({
    tvl: 0,
    vaults: 0,
    merchants: 0,
    transactions24h: 0,
  })

  useEffect(() => {
    // Keep stable defaults until live statistics are wired.
    setStats({ tvl: 0, vaults: 0, merchants: 0, transactions24h: 0 })
  }, [])
  
  return stats
}

// ============================================
// FEE CALCULATOR - Real-time savings display
// ============================================

export function useFeeCalculator(amount: string) {
  const { burnFee } = useProofScore()
  
  const amountNum = parseFloat(amount) || 0
  
  // VFIDE fees
  const vfideFee = (amountNum * burnFee) / 100
  const vfideNet = amountNum - vfideFee
  
  // Traditional payment processor fees (2.9% + $0.30)
  const stripeFee = (amountNum * 0.029) + 0.30
  const stripeNet = amountNum - stripeFee
  
  // Savings
  const savings = stripeFee - vfideFee
  const savingsPercent = ((savings / stripeFee) * 100).toFixed(1)
  
  return {
    vfideFee: vfideFee.toFixed(2),
    vfideNet: vfideNet.toFixed(2),
    stripeFee: stripeFee.toFixed(2),
    stripeNet: stripeNet.toFixed(2),
    savings: savings.toFixed(2),
    savingsPercent,
    burnFee,
  }
}

// ============================================
// REAL-TIME ACTIVITY FEED
// ============================================

export interface ActivityItem {
  id: string
  type: 'transfer' | 'merchant_payment' | 'endorsement' | 'vault_created' | 'proposal_voted'
  from?: string
  to?: string
  amount?: string
  timestamp: number
  txHash?: string
}

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    // Keep empty until event subscriptions are connected.
    setActivities([])
  }, [])
  
  return { activities }
}
