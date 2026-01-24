import { describe, it, expect, } from '@jest/globals'
import {
  cn,
  validateAddress,
  formatAddress,
  formatNumber,
  formatTokenAmount,
  parseTokenAmount,
  formatUSD,
  getScoreTierColor,
  truncate,
  timeUntil,
} from '@/lib/utils'

describe('cn (class names utility)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })
})

describe('validateAddress', () => {
  it('returns null for undefined', () => {
    expect(validateAddress(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(validateAddress('')).toBeNull()
  })

  it('returns null for invalid address', () => {
    expect(validateAddress('not-an-address')).toBeNull()
    expect(validateAddress('0x123')).toBeNull()
  })

  it('returns checksummed address for valid address', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const result = validateAddress(address)
    expect(result).toBeTruthy()
    expect(result?.startsWith('0x')).toBe(true)
  })

  it('handles mixed case addresses', () => {
    const address = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'
    const result = validateAddress(address.toLowerCase())
    expect(result).toBeTruthy()
  })
})

describe('formatAddress', () => {
  it('returns empty string for falsy input', () => {
    expect(formatAddress('')).toBe('')
  })

  it('formats address with default chars', () => {
    const address = '0x1234567890123456789012345678901234567890'
    expect(formatAddress(address)).toBe('0x1234...7890')
  })

  it('formats address with custom chars', () => {
    const address = '0x1234567890123456789012345678901234567890'
    expect(formatAddress(address, 6)).toBe('0x123456...567890')
  })
})

describe('formatNumber', () => {
  it('formats small numbers', () => {
    expect(formatNumber(123)).toBe('123')
  })

  it('formats large numbers with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('handles bigint', () => {
    expect(formatNumber(BigInt(1000000))).toBe('1,000,000')
  })
})

describe('formatTokenAmount', () => {
  it('returns 0 for undefined', () => {
    expect(formatTokenAmount(undefined)).toBe('0')
  })

  it('formats wei to ether with default decimals', () => {
    const oneEther = BigInt('1000000000000000000')
    expect(formatTokenAmount(oneEther)).toBe('1.00')
  })

  it('formats with custom display decimals', () => {
    const oneEther = BigInt('1000000000000000000')
    expect(formatTokenAmount(oneEther, 18, 4)).toBe('1.0000')
  })

  it('formats fractional amounts', () => {
    const halfEther = BigInt('500000000000000000')
    expect(formatTokenAmount(halfEther)).toBe('0.50')
  })
})

describe('parseTokenAmount', () => {
  it('parses whole numbers', () => {
    expect(parseTokenAmount('1')).toBe(BigInt('1000000000000000000'))
  })

  it('parses decimal numbers', () => {
    expect(parseTokenAmount('1.5')).toBe(BigInt('1500000000000000000'))
  })

  it('parses small decimals', () => {
    expect(parseTokenAmount('0.001')).toBe(BigInt('1000000000000000'))
  })
})

describe('formatUSD', () => {
  it('formats with dollar sign and commas', () => {
    expect(formatUSD(1234.56)).toBe('$1,234.56')
  })

  it('handles zero', () => {
    expect(formatUSD(0)).toBe('$0.00')
  })

  it('handles large amounts', () => {
    expect(formatUSD(1000000)).toBe('$1,000,000.00')
  })
})

describe('getScoreTierColor', () => {
  // Note: Function uses 0-10000 scale (10x precision) matching the Seer contract
  it('returns green for VERIFIED (9000+)', () => {
    expect(getScoreTierColor(9000)).toBe('#50C878')
    expect(getScoreTierColor(10000)).toBe('#50C878')
  })

  it('returns cyan for TRUSTED (7000-8999)', () => {
    expect(getScoreTierColor(7000)).toBe('#00F0FF')
    expect(getScoreTierColor(8999)).toBe('#00F0FF')
  })

  it('returns orange for ESTABLISHED (4000-6999)', () => {
    expect(getScoreTierColor(4000)).toBe('#FFA500')
    expect(getScoreTierColor(6999)).toBe('#FFA500')
  })

  it('returns gold for PROBATIONARY (2000-3999)', () => {
    expect(getScoreTierColor(2000)).toBe('#FFD700')
    expect(getScoreTierColor(3999)).toBe('#FFD700')
  })

  it('returns grey for UNRANKED (0-1999)', () => {
    expect(getScoreTierColor(0)).toBe('#A0A0A5')
    expect(getScoreTierColor(1999)).toBe('#A0A0A5')
  })
})

describe('truncate', () => {
  it('returns original text if shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })
})

describe('timeUntil', () => {
  it('returns Expired for past dates', () => {
    const past = new Date(Date.now() - 1000)
    expect(timeUntil(past)).toBe('Expired')
  })

  it('returns days for future dates > 24h', () => {
    // Add extra milliseconds to ensure we're well over 2 days
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60000)
    expect(timeUntil(future)).toBe('2 days')
  })

  it('returns hours for future dates < 24h', () => {
    const future = new Date(Date.now() + 5 * 60 * 60 * 1000)
    expect(timeUntil(future)).toBe('5 hours')
  })

  it('returns minutes for future dates < 1h', () => {
    const future = new Date(Date.now() + 30 * 60 * 1000)
    const result = timeUntil(future)
    expect(result).toMatch(/^(29|30) mins$/) // Allow for timing differences
  })

  it('handles singular forms', () => {
    const oneDay = new Date(Date.now() + 24 * 60 * 60 * 1000)
    expect(timeUntil(oneDay)).toBe('1 day')
  })
})

describe('safeLocalStorage', () => {
  it('getItem returns value when available', async () => {
    const { safeLocalStorage } = await import('@/lib/utils')
    // Mock localStorage
    const mockValue = 'test-value'
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => mockValue,
        setItem: () => {},
        removeItem: () => {},
      },
      writable: true,
    })
    
    expect(safeLocalStorage.getItem('test-key')).toBe(mockValue)
  })

  it('getItem returns null when localStorage throws', async () => {
    const { safeLocalStorage } = await import('@/lib/utils')
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => { throw new Error('Access denied') },
      },
      writable: true,
    })
    
    expect(safeLocalStorage.getItem('test-key')).toBeNull()
  })

  it('setItem returns true on success', async () => {
    const { safeLocalStorage } = await import('@/lib/utils')
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: () => {},
      },
      writable: true,
    })
    
    expect(safeLocalStorage.setItem('key', 'value')).toBe(true)
  })

  it('setItem returns false when localStorage throws', async () => {
    const { safeLocalStorage } = await import('@/lib/utils')
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: () => { throw new Error('Quota exceeded') },
      },
      writable: true,
    })
    
    expect(safeLocalStorage.setItem('key', 'value')).toBe(false)
  })

  it('removeItem returns true on success', async () => {
    const { safeLocalStorage } = await import('@/lib/utils')
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: () => {},
      },
      writable: true,
    })
    
    expect(safeLocalStorage.removeItem('key')).toBe(true)
  })

  it('removeItem returns false when localStorage throws', async () => {
    const { safeLocalStorage } = await import('@/lib/utils')
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: () => { throw new Error('Access denied') },
      },
      writable: true,
    })
    
    expect(safeLocalStorage.removeItem('key')).toBe(false)
  })
})

describe('devLog', () => {
  it('logs error in development mode', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const { devLog } = await import('@/lib/utils')
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    devLog.error('test error', { data: 123 })
    
    expect(consoleSpy).toHaveBeenCalledWith('[DEV] test error', { data: 123 })
    consoleSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
  })

  it('logs warn in development mode', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const { devLog } = await import('@/lib/utils')
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    
    devLog.warn('test warning')
    
    expect(consoleSpy).toHaveBeenCalledWith('[DEV] test warning')
    consoleSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
  })

  it('logs message in development mode', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const { devLog } = await import('@/lib/utils')
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    
    devLog.log('test log')
    
    expect(consoleSpy).toHaveBeenCalledWith('[DEV] test log')
    consoleSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
  })

  it('does not log in production mode', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    // Need to re-import to get fresh module with production env
    jest.resetModules()
    const { devLog } = await import('@/lib/utils')
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    
    devLog.log('test log')
    
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
    jest.resetModules()
  })
})
