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
 * NOTE: This hook returns animated demo data for UI preview purposes.
 * In production, these would read from actual contract state:
 * - TVL: Sum of all vault balances (VaultRegistry.getTotalValueLocked())
 * - Vaults: Count of registered vaults (VaultRegistry.getVaultCount())
 * - Merchants: Count of registered merchants (MerchantRegistry.getMerchantCount())
 * - Transactions: Would require subgraph for 24h transaction count
 * 
 * The animated mock data provides a realistic "live" UI experience for demos.
 */
export function useSystemStats() {
  const [stats, setStats] = useState({
    tvl: 0,
    vaults: 0,
    merchants: 0,
    transactions24h: 0,
  })
  
  useEffect(() => {
    // Simulate live updates every 5 seconds
    const interval = setInterval(() => {
      setStats(prev => ({
        tvl: prev.tvl + Math.random() * 10000,
        vaults: prev.vaults + Math.floor(Math.random() * 3),
        merchants: prev.merchants + (Math.random() > 0.7 ? 1 : 0),
        transactions24h: prev.transactions24h + Math.floor(Math.random() * 5),
      }))
    }, 5000)
    
    return () => clearInterval(interval)
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
    // H-6 Fix: Track mounted state to prevent memory leak
    let mounted = true
    
    // In production, this would subscribe to contract events
    // For now, simulate real-time activity
    const interval = setInterval(() => {
      if (!mounted) return  // Don't update state if unmounted
      
      const types: ActivityItem['type'][] = ['transfer', 'merchant_payment', 'endorsement', 'vault_created', 'proposal_voted']
      const randomType = types[Math.floor(Math.random() * types.length)]
      
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: randomType as ActivityItem['type'],
        from: `0x${Math.random().toString(16).substr(2, 40)}`,
        to: randomType === 'endorsement' || randomType === 'vault_created' ? undefined : `0x${Math.random().toString(16).substr(2, 40)}`,
        amount: randomType === 'transfer' || randomType === 'merchant_payment' ? (Math.random() * 1000).toFixed(2) : undefined,
        timestamp: Date.now(),
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      }
      
      setActivities(prev => [newActivity, ...prev].slice(0, 20)) // Keep last 20
    }, 3000) // New activity every 3 seconds
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])
  
  return { activities }
}
