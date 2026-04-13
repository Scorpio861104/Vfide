import { act } from '@testing-library/react'
import { jest } from '@jest/globals'
import {
  buttonVariant,
  cn,
  devLog,
  formatAddress,
  formatNumber,
  formatTokenAmount,
  formatUSD,
  getScoreTierColor,
  glassCard,
  gradientCard,
  iconContainer,
  isNonZeroAddress,
  isValidAddress,
  parseTokenAmount,
  safeBigInt,
  safeInt,
  safeLocalStorage,
  safeNumber,
  safePercentage,
  safePositive,
  statusBadge,
  stepIndicator,
  timeUntil,
  truncate,
  truncateAddress,
  validateAddress,
} from './utils'

const VALID_ADDRESS = '0x0000000000000000000000000000000000000001'
const CHECKSUM_ADDRESS = '0x0000000000000000000000000000000000000001'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

describe('class helpers', () => {
  test('cn merges class strings', () => {
    expect(cn('foo', ['bar'], { baz: true })).toContain('foo')
  })

  test('glassCard and gradient helpers append custom class', () => {
    const glass = glassCard('extra')
    expect(glass).toContain('bg-gradient-to-br')
    expect(glass).toContain('extra')

    const gradient = gradientCard('from-a', 'border-b', 'extra')
    expect(gradient).toContain('from-a')
    expect(gradient).toContain('border-b')
    expect(gradient).toContain('extra')
  })

  test('statusBadge and buttonVariant include variants and sizes', () => {
    const success = statusBadge('success', 'extra')
    expect(success).toContain('text-green-400')
    expect(success).toContain('extra')

    const primary = buttonVariant()
    expect(primary).toContain('bg-gradient-to-r')
    const dangerLg = buttonVariant('danger', 'lg')
    expect(dangerLg).toContain('bg-red-500')
    expect(dangerLg).toContain('text-lg')
  })

  test('iconContainer and stepIndicator cover branches', () => {
    expect(iconContainer()).toContain('w-10 h-10')
    expect(iconContainer('lg', 'from-a', 'border-b')).toContain('border-b')

    expect(stepIndicator(true)).toContain('border-green-500')
    expect(stepIndicator(false, true)).toContain('border-cyan-500')
    expect(stepIndicator(false, false)).toContain('border-gray-500')
  })
})

describe('address helpers', () => {
  test('validateAddress returns checksum or null', () => {
    expect(validateAddress(VALID_ADDRESS)).toBe(CHECKSUM_ADDRESS)
    expect(validateAddress('bad')).toBeNull()
    expect(validateAddress(undefined)).toBeNull()
  })

  test('validateAddress covers catch path when getAddress throws', () => {
    const validLength = '0x' + '1'.repeat(40)
    expect(validateAddress(validLength)).toBeTruthy()
  })

  test('isValidAddress and isNonZeroAddress enforce format', () => {
    expect(isValidAddress(VALID_ADDRESS)).toBe(true)
    expect(isValidAddress('0x123')).toBe(false)
    expect(isNonZeroAddress(ZERO_ADDRESS)).toBe(false)
  })

  test('truncateAddress only truncates valid addresses', () => {
    expect(truncateAddress(VALID_ADDRESS, 4, 4)).toBe('0x00...0001')
    expect(truncateAddress('invalid')).toBe('invalid')
  })
})

describe('storage helpers', () => {
  test('safeLocalStorage handles success and failure', () => {
    localStorage.setItem('key', 'value')
    expect(safeLocalStorage.getItem('key')).toBe('value')

    const original = window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('fail')
        },
        setItem: original.setItem,
        removeItem: original.removeItem,
      },
      configurable: true,
    })
    expect(safeLocalStorage.getItem('key')).toBeNull()
    Object.defineProperty(window, 'localStorage', { value: original })
  })
})

describe('formatting helpers', () => {
  test('formatAddress and formatNumber', () => {
    expect(formatAddress(VALID_ADDRESS)).toContain('...')
    expect(formatAddress('')).toBe('')
    expect(formatAddress('0x1234')).toBe('0x1234')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  test('formatTokenAmount and parseTokenAmount', () => {
    expect(formatTokenAmount(0n)).toBe('0')
    expect(formatTokenAmount(1234567890000000000n, 18, 4)).toBe('1.2346')
    expect(parseTokenAmount('')).toBe(0n)
    expect(parseTokenAmount('1.5', 2)).toBe(150n)
    expect(() => parseTokenAmount('abc')).toThrow('Invalid token amount')
  })

  test('formatUSD and getScoreTierColor', () => {
    expect(formatUSD(1234)).toContain('$')
    expect(getScoreTierColor(9500)).toBe('#50C878')
    expect(getScoreTierColor(7500)).toBe('#00F0FF')
    expect(getScoreTierColor(4500)).toBe('#FFA500')
    expect(getScoreTierColor(2500)).toBe('#FFD700')
    expect(getScoreTierColor(100)).toBe('#A0A0A5')
  })

  test('truncate text and timeUntil', () => {
    expect(truncate('short', 10)).toBe('short')
    expect(truncate('longer text', 4)).toBe('long...')

    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    const futureHours = new Date('2024-01-01T02:00:00Z')
    expect(timeUntil(futureHours)).toBe('2 hours')

    const futureDays = new Date('2024-01-03T00:00:00Z')
    expect(timeUntil(futureDays)).toBe('2 days')

    const futureMinutes = new Date('2024-01-01T00:20:00Z')
    expect(timeUntil(futureMinutes)).toBe('20 mins')

    const past = new Date('2023-12-31T23:59:00Z')
    expect(timeUntil(past)).toBe('Expired')
    jest.useRealTimers()
  })
})

describe('logging helpers respect NODE_ENV', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.restoreAllMocks()
  })

  test('logs in development', () => {
    process.env.NODE_ENV = 'development'
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})

    devLog.error('err')
    devLog.warn('warn')
    devLog.log('info')

    expect(errorSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalled()
  })

  test('still callable in production builds', () => {
    process.env.NODE_ENV = 'production'
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    devLog.error('err')
    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('safe numeric helpers', () => {
  test('safeNumber and safeInt with fallbacks', () => {
    expect(safeNumber('5', 1)).toBe(5)
    expect(safeNumber('bad', 1)).toBe(1)
    expect(safeInt(4.7, 0)).toBe(4)
  })

  test('safeBigInt covers inputs', () => {
    expect(safeBigInt(5n)).toBe(5n)
    expect(safeBigInt(5.9)).toBe(5n)
    expect(safeBigInt('10')).toBe(10n)
    expect(safeBigInt('abc', 2n)).toBe(2n)
  })

  test('safeBigInt covers invalid string with spacing', () => {
    expect(safeBigInt('  ')).toBe(0n)
    expect(safeBigInt('', 3n)).toBe(3n)
  })

  test('safeBigInt covers parsing exception', () => {
    expect(safeBigInt(null, 7n)).toBe(7n)
  })

  test('safePercentage and safePositive clamp values', () => {
    expect(safePercentage(50)).toBe(50)
    expect(safePercentage(150, 1)).toBe(1)
    expect(safePositive(-1, 2)).toBe(2)
  })
})
