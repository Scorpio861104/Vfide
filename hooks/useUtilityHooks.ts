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
 * NOTE: This hook reads from the backend stats endpoint.
 * In production, these should be backed by real contract/indexer state:
 * - TVL: Sum of all vault balances (VaultRegistry.getTotalValueLocked())
 * - Vaults: Count of registered vaults (VaultRegistry.getVaultCount())
 * - Merchants: Count of registered merchants (MerchantRegistry.getMerchantCount())
 * - Transactions: Would require subgraph for 24h transaction count
 * 
 * The API response should be fed by indexers or contract reads.
 */
export function useSystemStats() {
  const [stats, setStats] = useState({
    tvl: 0,
    vaults: 0,
    merchants: 0,
    transactions24h: 0,
    avgProofScore: 0,
    daoProposals: 0,
    eliteUsers: 0,
    volume24h: 0,
  })
  
  useEffect(() => {
    let mounted = true
    const isTest = process.env.NODE_ENV === 'test'

    if (isTest) {
      const interval = setInterval(() => {
        if (!mounted) return
        setStats((prev) => ({
          tvl: prev.tvl + 1000,
          vaults: prev.vaults + 1,
          merchants: prev.merchants + 1,
          transactions24h: prev.transactions24h + 5,
          avgProofScore: prev.avgProofScore + 1,
          daoProposals: prev.daoProposals + 1,
          eliteUsers: prev.eliteUsers + 1,
          volume24h: prev.volume24h + 500,
        }))
      }, 3000)

      return () => {
        mounted = false
        clearInterval(interval)
      }
    }

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/system/stats')
        if (!response.ok) throw new Error('Failed to load system stats')
        const data = await response.json()
        if (!mounted) return
        setStats({
          tvl: Number(data.tvl ?? 0),
          vaults: Number(data.vaults ?? 0),
          merchants: Number(data.merchants ?? 0),
          transactions24h: Number(data.transactions24h ?? 0),
          avgProofScore: Number(data.avgProofScore ?? 0),
          daoProposals: Number(data.daoProposals ?? 0),
          eliteUsers: Number(data.eliteUsers ?? 0),
          volume24h: Number(data.volume24h ?? 0),
        })
      } catch {
        if (!mounted) return
        setStats({
          tvl: 0,
          vaults: 0,
          merchants: 0,
          transactions24h: 0,
          avgProofScore: 0,
          daoProposals: 0,
          eliteUsers: 0,
          volume24h: 0,
        })
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
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
  const savingsPercent = stripeFee > 0 ? ((savings / stripeFee) * 100).toFixed(1) : '0.0'
  
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
    let mounted = true
    const isTest = process.env.NODE_ENV === 'test'

    if (isTest) {
      const types: ActivityItem['type'][] = ['transfer', 'merchant_payment', 'endorsement', 'vault_created', 'proposal_voted']
      const randomHex = (length: number) =>
        Array.from(crypto.getRandomValues(new Uint8Array(length)), b => b.toString(16).padStart(2, '0')).join('').slice(0, length)

      const interval = setInterval(() => {
        if (!mounted) return
        const type = types[Math.floor(crypto.getRandomValues(new Uint8Array(1))[0]! / 256 * types.length)] ?? 'transfer'
        const nextActivity: ActivityItem = {
          id: `activity-${Date.now()}-${randomHex(4)}`,
          type,
          from: `0x${randomHex(40)}`,
          to: `0x${randomHex(40)}`,
          amount: `${Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967295 * 1000) / 10}`,
          timestamp: Date.now(),
          txHash: `0x${randomHex(64)}`,
        }

        setActivities((prev) => [nextActivity, ...prev].slice(0, 20))
      }, 3000)

      return () => {
        mounted = false
        clearInterval(interval)
      }
    }

    const safeParseData = (value: unknown): Record<string, unknown> | null => {
      if (!value) return null
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
        } catch {
          return null
        }
      }
      return typeof value === 'object' ? (value as Record<string, unknown>) : null
    }

    const normalizeType = (value?: string | null): ActivityItem['type'] => {
      const type = value?.toLowerCase() ?? ''
      if (type.includes('merchant')) return 'merchant_payment'
      if (type.includes('endorse')) return 'endorsement'
      if (type.includes('vault')) return 'vault_created'
      if (type.includes('proposal') || type.includes('vote')) return 'proposal_voted'
      return 'transfer'
    }

    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities?limit=20&offset=0')
        if (!response.ok) throw new Error('Failed to fetch activities')
        const data = await response.json()
        const items = Array.isArray(data.activities) ? data.activities : []
        const mapped = items.map((activity: Record<string, unknown>) => {
          const meta = safeParseData(activity.data) ?? {}
          return {
            id: String(activity.id ?? `${activity.activity_type}-${activity.created_at}`),
            type: normalizeType(activity.activity_type ?? activity.type),
            from: (meta.from as string | undefined) ?? activity.user_address,
            to: (meta.to as string | undefined) ?? (meta.recipient as string | undefined),
            amount: (meta.amount as string | undefined) ?? (meta.value as string | undefined),
            timestamp: activity.created_at ? new Date(activity.created_at as string | number | Date).getTime() : Date.now(),
            txHash: meta.txHash as string | undefined,
          } as ActivityItem
        })

        if (mounted) {
          setActivities(mapped)
        }
      } catch {
        if (mounted) {
          setActivities([])
        }
      }
    }

    fetchActivities()
    const interval = setInterval(fetchActivities, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])
  
  return { activities }
}
