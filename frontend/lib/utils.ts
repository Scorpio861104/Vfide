import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { isAddress, getAddress } from "viem"

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validate and checksum an Ethereum address
 * Returns checksummed address or null if invalid
 * H-4 Fix: Adds proper checksum validation for addresses
 */
export function validateAddress(address: string | undefined): `0x${string}` | null {
  if (!address) return null
  try {
    if (!isAddress(address)) return null
    return getAddress(address)
  } catch {
    return null
  }
}

/**
 * Safe localStorage wrapper that handles errors
 * M-1 Fix: Prevents crashes in private browsing mode
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      return false
    }
  },
  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },
}

/**
 * Format a blockchain address for display
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format a large number with commas
 */
export function formatNumber(num: number | bigint): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format token amount from wei to display value
 */
export function formatTokenAmount(
  amount: bigint | undefined,
  decimals = 18,
  displayDecimals = 2
): string {
  if (!amount) return '0'
  const value = Number(amount) / Math.pow(10, decimals)
  return value.toFixed(displayDecimals)
}

/**
 * Parse display value to wei
 */
export function parseTokenAmount(amount: string, decimals = 18): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole + paddedFraction)
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Get ProofScore tier color
 */
export function getScoreTierColor(score: number): string {
  if (score >= 900) return '#50C878' // VERIFIED - Green
  if (score >= 700) return '#00F0FF' // TRUSTED - Cyan
  if (score >= 400) return '#FFA500' // ESTABLISHED - Orange
  if (score >= 200) return '#FFD700' // PROBATIONARY - Gold
  return '#A0A0A5' // UNRANKED - Grey
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Calculate time until a future date
 */
export function timeUntil(futureDate: Date): string {
  const now = new Date()
  const diff = futureDate.getTime() - now.getTime()
  
  if (diff < 0) return 'Expired'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${minutes} min${minutes > 1 ? 's' : ''}`
}

/**
 * Development-only logger that's silent in production
 * Use instead of console.log/error for non-critical logging
 */
export const devLog = {
  error: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[DEV] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DEV] ${message}`, ...args);
    }
  },
  log: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] ${message}`, ...args);
    }
  },
};
