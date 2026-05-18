'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger';

// Default ETH price as fallback
const DEFAULT_ETH_PRICE = 2500

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

interface PriceCache {
  price: number
  timestamp: number
}

let priceCache: PriceCache | null = null

/**
 * Fetches current ETH price from CoinGecko API
 * Uses caching to avoid rate limits and improve performance
 */
async function fetchEthPrice(): Promise<number> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.price
  }

  try {
    // CoinGecko free API - no API key required
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_COINGECKO_API_URL || 'https://api.coingecko.com/api/v3/simple/price'}?ids=ethereum&vs_currencies=usd`,
      { 
        next: { revalidate: 300 }, // Cache for 5 minutes in Next.js
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    const price = data?.ethereum?.usd
    
    if (typeof price === 'number' && price > 0) {
      priceCache = { price, timestamp: Date.now() }
      return price
    }
    
    throw new Error('Invalid price data')
  } catch (error) {
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[useEthPrice] Failed to fetch ETH price, using default:', error)
    }
    
    // Return cached price if available, otherwise default
    return priceCache?.price ?? DEFAULT_ETH_PRICE
  }
}

/**
 * Hook to get current ETH price in USD
 * @returns { ethPrice, isLoading, error }
 */
export function useEthPrice() {
  const [ethPrice, setEthPrice] = useState<number>(priceCache?.price ?? DEFAULT_ETH_PRICE)
  const [isLoading, setIsLoading] = useState<boolean>(!priceCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const updatePrice = async () => {
      try {
        const price = await fetchEthPrice()
        if (mounted) {
          setEthPrice(price)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch price')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    updatePrice()

    // Refresh price every 5 minutes
    const interval = setInterval(updatePrice, CACHE_DURATION)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return {
    ethPrice,
    isLoading,
    error,
    // Helper to format gas cost in USD
    formatGasUsd: (gasCostEth: number) => {
      const usd = gasCostEth * ethPrice
      return usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`
    }
  }
}

// Export default price for static contexts
export const DEFAULT_ETH_PRICE_USD = DEFAULT_ETH_PRICE
