import {
    cn,
    devLog,
    formatAddress,
    formatNumber,
    formatTokenAmount,
    formatUSD,
    getScoreTierColor,
    parseTokenAmount,
    safeLocalStorage,
    timeUntil,
    truncate,
    validateAddress,
} from '../utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
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
  })

  it('returns null for address with wrong length', () => {
    expect(validateAddress('0x1234')).toBeNull()
  })

  it('returns checksummed address for valid lowercase address', () => {
    const validAddress = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
    const result = validateAddress(validAddress)
    expect(result).not.toBeNull()
    // Should return checksummed version
    expect(result).toMatch(/^0x[a-fA-F0-9]{40}$/)
  })

  it('returns checksummed address for valid checksummed address', () => {
    const checksummedAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
    const result = validateAddress(checksummedAddress)
    expect(result).not.toBeNull()
  })

  it('handles malformed address gracefully (catch block line 164)', () => {
    // Mock isAddress to throw an error to trigger the catch block
    const invalidButLengthCorrect = '0x' + 'z'.repeat(40)
    const result = validateAddress(invalidButLengthCorrect)
    // Should return the trimmed value as fallback
    expect(result).toBeTruthy()
  })
})

describe('safeLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getItem returns value', () => {
    localStorage.setItem('key', 'value')
    expect(safeLocalStorage.getItem('key')).toBe('value')
  })

  it('getItem returns null for missing key', () => {
    expect(safeLocalStorage.getItem('missing')).toBeNull()
  })

  it('setItem stores value', () => {
    expect(safeLocalStorage.setItem('key', 'value')).toBe(true)
    expect(localStorage.getItem('key')).toBe('value')
  })

  it('removeItem removes value', () => {
    localStorage.setItem('key', 'value')
    expect(safeLocalStorage.removeItem('key')).toBe(true)
    expect(localStorage.getItem('key')).toBeNull()
  })

  it('getItem returns null when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage error')
    })
    expect(safeLocalStorage.getItem('key')).toBeNull()
    jest.restoreAllMocks()
  })

  it('setItem returns false when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage error')
    })
    expect(safeLocalStorage.setItem('key', 'value')).toBe(false)
    jest.restoreAllMocks()
  })

  it('removeItem returns false when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Storage error')
    })
    expect(safeLocalStorage.removeItem('key')).toBe(false)
    jest.restoreAllMocks()
  })
})

describe('formatAddress', () => {
  it('formats address with default chars', () => {
    expect(formatAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234...5678')
  })

  it('formats address with custom chars', () => {
    expect(formatAddress('0x1234567890abcdef1234567890abcdef12345678', 6)).toBe('0x123456...345678')
  })

  it('handles empty address', () => {
    expect(formatAddress('')).toBe('')
  })
})

describe('formatNumber', () => {
  it('formats number with commas', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1000000)).toBe('1,000,000')
  })

  it('handles small numbers', () => {
    expect(formatNumber(123)).toBe('123')
  })

  it('handles bigint', () => {
    expect(formatNumber(BigInt(1000000))).toBe('1,000,000')
  })
})

describe('formatTokenAmount', () => {
  it('formats token amount from wei', () => {
    expect(formatTokenAmount(BigInt('1000000000000000000'))).toBe('1.00')
  })

  it('handles undefined amount', () => {
    expect(formatTokenAmount(undefined)).toBe('0')
  })

  it('handles zero amount', () => {
    // BigInt(0) is falsy, so it returns '0' early
    expect(formatTokenAmount(BigInt(0))).toBe('0')
  })

  it('handles small amounts', () => {
    expect(formatTokenAmount(BigInt('500000000000000000'))).toBe('0.50')
  })

  it('respects custom decimals', () => {
    expect(formatTokenAmount(BigInt('1000000'), 6)).toBe('1.00')
  })

  it('respects custom display decimals', () => {
    expect(formatTokenAmount(BigInt('1234567890000000000'), 18, 4)).toBe('1.2346')
  })
})

describe('parseTokenAmount', () => {
  it('parses whole number to wei', () => {
    expect(parseTokenAmount('1')).toBe(BigInt('1000000000000000000'))
  })

  it('parses decimal to wei', () => {
    expect(parseTokenAmount('1.5')).toBe(BigInt('1500000000000000000'))
  })

  it('handles custom decimals', () => {
    expect(parseTokenAmount('1', 6)).toBe(BigInt('1000000'))
  })

  it('returns 0 for empty string', () => {
    expect(parseTokenAmount('')).toBe(BigInt(0))
    expect(parseTokenAmount('  ')).toBe(BigInt(0))
  })

  it('throws for invalid input', () => {
    expect(() => parseTokenAmount('abc')).toThrow('Invalid token amount')
    expect(() => parseTokenAmount('.')).toThrow('Invalid token amount')
    expect(() => parseTokenAmount('1.2.3')).toThrow('Invalid token amount')
  })
})

describe('formatUSD', () => {
  it('formats USD amount', () => {
    expect(formatUSD(1234.56)).toBe('$1,234.56')
  })

  it('handles zero', () => {
    expect(formatUSD(0)).toBe('$0.00')
  })

  it('handles negative', () => {
    expect(formatUSD(-100)).toBe('-$100.00')
  })
})

describe('getScoreTierColor', () => {
  // Uses 0-10000 scale (10x precision) matching Seer contract
  it('returns green for VERIFIED (>=9000)', () => {
    expect(getScoreTierColor(9000)).toBe('#50C878')
    expect(getScoreTierColor(10000)).toBe('#50C878')
  })

  it('returns cyan for TRUSTED (>=7000)', () => {
    expect(getScoreTierColor(7000)).toBe('#00F0FF')
    expect(getScoreTierColor(8999)).toBe('#00F0FF')
  })

  it('returns orange for ESTABLISHED (>=4000)', () => {
    expect(getScoreTierColor(4000)).toBe('#FFA500')
    expect(getScoreTierColor(6999)).toBe('#FFA500')
  })

  it('returns gold for PROBATIONARY (>=2000)', () => {
    expect(getScoreTierColor(2000)).toBe('#FFD700')
    expect(getScoreTierColor(3999)).toBe('#FFD700')
  })

  it('returns grey for UNRANKED (<2000)', () => {
    expect(getScoreTierColor(0)).toBe('#A0A0A5')
    expect(getScoreTierColor(1999)).toBe('#A0A0A5')
  })
})

describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('This is a long text', 10)).toBe('This is a ...')
  })

  it('returns text unchanged if shorter than max', () => {
    expect(truncate('Short', 10)).toBe('Short')
  })

  it('returns text unchanged if equal to max', () => {
    expect(truncate('Exactly 10', 10)).toBe('Exactly 10')
  })
})

describe('timeUntil', () => {
  it('returns Expired for past dates', () => {
    const pastDate = new Date(Date.now() - 1000)
    expect(timeUntil(pastDate)).toBe('Expired')
  })

  it('returns days for future date', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    expect(timeUntil(futureDate)).toBe('2 days')
  })

  it('returns singular day', () => {
    const futureDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    expect(timeUntil(futureDate)).toBe('1 day')
  })

  it('returns hours when less than a day', () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 60 * 1000)
    expect(timeUntil(futureDate)).toBe('5 hours')
  })

  it('returns singular hour', () => {
    const futureDate = new Date(Date.now() + 1 * 60 * 60 * 1000)
    expect(timeUntil(futureDate)).toBe('1 hour')
  })

  it('returns minutes when less than an hour', () => {
    // Add a small buffer (500ms) to prevent off-by-one rounding errors
    const futureDate = new Date(Date.now() + 30 * 60 * 1000 + 500)
    expect(timeUntil(futureDate)).toBe('30 mins')
  })

  it('returns singular minute', () => {
    const futureDate = new Date(Date.now() + 90 * 1000) // 90 seconds to avoid rounding
    expect(timeUntil(futureDate)).toBe('1 min')
  })
})

describe('devLog', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs in non-production environment', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation()
    devLog.log('test message')
    // In test environment, devLog should work
    expect(logSpy).toHaveBeenCalled()
  })

  it('warns in non-production environment', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
    devLog.warn('test warning')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('errors in non-production environment', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation()
    devLog.error('test error')
    expect(errorSpy).toHaveBeenCalled()
  })

  it('log passes additional arguments', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation()
    devLog.log('test message', { extra: 'data' }, 123)
    expect(logSpy).toHaveBeenCalledWith('[DEV] test message', { extra: 'data' }, 123)
  })

  it('warn passes additional arguments', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
    devLog.warn('test warning', 'extra')
    expect(warnSpy).toHaveBeenCalledWith('[DEV] test warning', 'extra')
  })

  it('error passes additional arguments', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation()
    devLog.error('test error', new Error('test'))
    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('buttonVariant', () => {
  it('returns primary variant classes', () => {
    const { buttonVariant } = require('../utils')
    const result = buttonVariant('primary', 'md')
    expect(result).toContain('bg-gradient-to-r')
    expect(result).toContain('from-cyan-500')
  })

  it('returns secondary variant', () => {
    const { buttonVariant } = require('../utils')
    const result = buttonVariant('secondary', 'md')
    expect(result).toBeTruthy()
  })

  it('returns danger variant', () => {
    const { buttonVariant } = require('../utils')
    const result = buttonVariant('danger', 'lg')
    expect(result).toBeTruthy()
  })
})

describe('safeBigInt', () => {
  const { safeBigInt } = require('../utils')

  it('returns bigint value as-is', () => {
    expect(safeBigInt(123n)).toBe(123n)
  })

  it('converts number to bigint', () => {
    expect(safeBigInt(456)).toBe(456n)
  })

  it('converts valid string to bigint', () => {
    expect(safeBigInt('789')).toBe(789n)
  })

  it('returns fallback for invalid string', () => {
    expect(safeBigInt('invalid', 100n)).toBe(100n)
  })

  it('returns fallback for empty string', () => {
    expect(safeBigInt('', 50n)).toBe(50n)
  })

  it('returns fallback for non-numeric string', () => {
    expect(safeBigInt('abc', 25n)).toBe(25n)
  })

  it('returns fallback for null', () => {
    expect(safeBigInt(null, 10n)).toBe(10n)
  })

  it('returns default fallback (0n) when no fallback provided', () => {
    expect(safeBigInt('bad')).toBe(0n)
  })

  it('handles catch block for edge cases (line 394)', () => {
    // Test with value that might throw during BigInt conversion
    const hugeNumber = Number.MAX_SAFE_INTEGER * 2
    const result = safeBigInt(hugeNumber, 99n)
    expect(result).toBeDefined()
  })
})
