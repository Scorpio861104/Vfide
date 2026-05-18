/**
 * Live VFIDE Price Hooks
 * Fetches real-time prices from APIs with caching
 * Uses React Query for stale-while-revalidate pattern
 */

'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient as _useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger';
import { getCachePolicy } from '@/lib/cache/cacheInvalidationPolicy';

interface PriceData {
  vfide: {
    usd: number
    eth: number
  }
  eth: {
    usd: number
  }
  market: {
    marketCap: number
    circulatingMarketCap: number
    totalSupply: number
    circulatingSupply: number
  }
  timestamp: number
  source: string
}

interface FeeData {
  network: {
    eth: string
    usd: number
    vfide: string
    gasLimit: string
    gasPrice: string
  }
  burn: {
    vfide: string
    usd: number
    bps: number
    breakdown: {
      burn: { vfide: string; bps: number; usd: number }
      sanctum: { vfide: string; bps: number; usd: number }
      ecosystem: { vfide: string; bps: number; usd: number }
    }
  }
  total: {
    vfide: string
    usd: number
  }
}

// ============================================
// LIVE VFIDE PRICE - React Query with stale-while-revalidate
// ============================================

async function fetchVfidePrice(): Promise<PriceData> {
  const response = await fetch('/api/crypto/price')
  if (!response.ok) {
    throw new Error('Failed to fetch price')
  }
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch price')
  }
  return result
}

export function useVfidePrice() {
  const vfidePriceCachePolicy = getCachePolicy('reactQuery:vfide-price');

  const { data, isLoading, error, isStale } = useQuery({
    queryKey: vfidePriceCachePolicy.queryKey ?? ['vfide-price'],
    queryFn: fetchVfidePrice,
    staleTime: vfidePriceCachePolicy.ttlMs,
    gcTime: vfidePriceCachePolicy.gcMs,
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    retry: 2,
    retryDelay: 1000,
  })

  return {
    priceUsd: data?.vfide?.usd ?? 0.10, // Fallback to $0.10
    priceEth: data?.vfide?.eth ?? 0.00005,
    ethPriceUsd: data?.eth?.usd ?? 2000,
    marketCap: data?.market?.marketCap ?? 20000000,
    circulatingSupply: data?.market?.circulatingSupply ?? 50000000,
    totalSupply: data?.market?.totalSupply ?? 200000000,
    source: data?.source ?? 'fallback',
    timestamp: data?.timestamp ?? Date.now(),
    isLoading,
    isStale, // New: indicates if showing stale data while revalidating
    error: error instanceof Error ? error.message : null,
  }
}

// ============================================
// LIVE FEES - Fetches from /api/crypto/fees
// ============================================

export function useTransactionFees(amount: string, fromAddress?: string) {
  const [data, setData] = useState<FeeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchFees = async () => {
      if (!amount || parseFloat(amount) <= 0 || !fromAddress) {
        setData(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const response = await fetch(
          `/api/crypto/fees?amount=${encodeURIComponent(amount)}&from=${encodeURIComponent(fromAddress)}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch fees')
        }
        
        const result = await response.json()
        
        if (isMounted && result.success) {
          setData(result.fees)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          logger.error('[useTransactionFees] Error:', err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchFees()

    // Debounce: refresh when amount changes (after 500ms)
    const timeout = setTimeout(fetchFees, 500)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [amount, fromAddress])

  return {
    networkFee: {
      vfide: data?.network?.vfide ?? '0',
      usd: data?.network?.usd ?? 0,
      eth: data?.network?.eth ?? '0',
      gasLimit: data?.network?.gasLimit ?? '200000',
      gasPrice: data?.network?.gasPrice ?? '0',
    },
    burnFee: {
      vfide: data?.burn?.vfide ?? '0',
      usd: data?.burn?.usd ?? 0,
      bps: data?.burn?.bps ?? 320,
      breakdown: data?.burn?.breakdown ?? {
        burn: { vfide: '0', bps: 200, usd: 0 },
        sanctum: { vfide: '0', bps: 100, usd: 0 },
        ecosystem: { vfide: '0', bps: 20, usd: 0 },
      },
    },
    total: {
      vfide: data?.total?.vfide ?? '0',
      usd: data?.total?.usd ?? 0,
    },
    isLoading,
    error,
  }
}

// ============================================
// USD CONVERSION - Convert any VFIDE amount to USD
// ============================================

export function useVfideToUsd(vfideAmount: number | string) {
  const { priceUsd, isLoading } = useVfidePrice()
  
  const amount = typeof vfideAmount === 'string' 
    ? parseFloat(vfideAmount) || 0 
    : vfideAmount

  return {
    usdValue: amount * priceUsd,
    priceUsd,
    isLoading,
  }
}

// ============================================
// BATCH CONVERSION - Convert multiple amounts
// ============================================

export function useBatchConversion(amounts: { amount: number; label: string }[]) {
  const { priceUsd, priceEth, ethPriceUsd, isLoading } = useVfidePrice()

  const conversions = amounts.map(({ amount, label }) => ({
    label,
    vfide: amount,
    usd: amount * priceUsd,
    eth: amount * priceEth,
  }))

  return {
    conversions,
    priceUsd,
    priceEth,
    ethPriceUsd,
    isLoading,
  }
}
