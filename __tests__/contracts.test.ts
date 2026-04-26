import { afterAll, describe, it, expect } from '@jest/globals'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'

const originalEnv = { ...process.env }

const completeContractEnv = {
  NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: '0x1111111111111111111111111111111111111111',
  NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS: '0x2222222222222222222222222222222222222222',
  NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS: '0x3333333333333333333333333333333333333333',
  NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS: '0x4444444444444444444444444444444444444444',
  NEXT_PUBLIC_VAULT_HUB_ADDRESS: '0x5555555555555555555555555555555555555555',
  NEXT_PUBLIC_SEER_ADDRESS: '0x6666666666666666666666666666666666666666',
  NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS: '0x7777777777777777777777777777777777777777',
  NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS: '0x8888888888888888888888888888888888888888',
  NEXT_PUBLIC_SEER_VIEW_ADDRESS: '0x9999999999999999999999999999999999999999',
  NEXT_PUBLIC_DAO_ADDRESS: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS: '0xcccccccccccccccccccccccccccccccccccccccc',
  NEXT_PUBLIC_BADGE_NFT_ADDRESS: '0xdddddddddddddddddddddddddddddddddddddddd',
  NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS: '0xffffffffffffffffffffffffffffffffffffffff',
  NEXT_PUBLIC_PANIC_GUARD_ADDRESS: '0x1212121212121212121212121212121212121212',
  NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS: '0x1313131313131313131313131313131313131313',
  NEXT_PUBLIC_BURN_ROUTER_ADDRESS: '0x1414141414141414141414141414141414141414',
  NEXT_PUBLIC_PROOF_LEDGER_ADDRESS: '0x1515151515151515151515151515151515151515',
  NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS: '0x1616161616161616161616161616161616161616',
  NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS: '0x1717171717171717171717171717171717171717',
  NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS: '0x1818181818181818181818181818181818181818',
  NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS: '0x1919191919191919191919191919191919191919',
  NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS: '0x2020202020202020202020202020202020202020',
  NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS: '0x2121212121212121212121212121212121212121',
  NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS: '0x2222222222222222222222222222222222222223',
  NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS: '0x2323232323232323232323232323232323232323',
  NEXT_PUBLIC_DEV_VAULT_ADDRESS: '0x2424242424242424242424242424242424242424',
  NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS: '0x2525252525252525252525252525252525252525',
  NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS: '0x2626262626262626262626262626262626262626',
  NEXT_PUBLIC_SEER_SOCIAL_ADDRESS: '0x2727272727272727272727272727272727272727',
  NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS: '0x2828282828282828282828282828282828282828',
  NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS: '0x2929292929292929292929292929292929292929',
  NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS: '0x3030303030303030303030303030303030303030',
  NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS: '0x3131313131313131313131313131313131313131',
  NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS: '0x3232323232323232323232323232323232323232',
  NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS: '0x3434343434343434343434343434343434343434',
  NEXT_PUBLIC_FAUCET_ADDRESS: '0x3535353535353535353535353535353535353535',
  NEXT_PUBLIC_TERM_LOAN_ADDRESS: '0x3636363636363636363636363636363636363636',
  NEXT_PUBLIC_FLASH_LOAN_ADDRESS: '0x3737373737373737373737373737373737373737',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vfide_test',
  JWT_SECRET: 'test-test-test-test-test-test-test-test',
} as const

async function importContractsWithEnv(overrides: NodeJS.ProcessEnv = {}) {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    ...completeContractEnv,
    ...overrides,
  }

  return import('@/lib/contracts')
}

describe('contracts', () => {
  describe('CONTRACT_ADDRESSES', () => {
    it('has all required contract address keys', () => {
      expect(CONTRACT_ADDRESSES).toHaveProperty('VFIDEToken')
      expect(CONTRACT_ADDRESSES).toHaveProperty('StablecoinRegistry')
      expect(CONTRACT_ADDRESSES).toHaveProperty('MerchantPortal')
      expect(CONTRACT_ADDRESSES).toHaveProperty('VaultHub')
      expect(CONTRACT_ADDRESSES).toHaveProperty('Seer')
      expect(CONTRACT_ADDRESSES).toHaveProperty('DAO')
      expect(CONTRACT_ADDRESSES).toHaveProperty('DAOTimelock')
      expect(CONTRACT_ADDRESSES).toHaveProperty('BadgeNFT')
      expect(CONTRACT_ADDRESSES).toHaveProperty('FraudRegistry')
      expect(CONTRACT_ADDRESSES).toHaveProperty('GuardianRegistry')
      expect(CONTRACT_ADDRESSES).toHaveProperty('GuardianLock')
      expect(CONTRACT_ADDRESSES).toHaveProperty('PanicGuard')
      expect(CONTRACT_ADDRESSES).toHaveProperty('EmergencyBreaker')
    })

    it('all addresses are strings starting with 0x', () => {
      Object.entries(CONTRACT_ADDRESSES).forEach(([name, address]) => {
        expect(typeof address).toBe('string')
        expect(address.startsWith('0x')).toBe(true)
      })
    })

    it('all addresses are 42 characters (valid Ethereum address length)', () => {
      Object.entries(CONTRACT_ADDRESSES).forEach(([name, address]) => {
        expect(address.length).toBe(42)
      })
    })
  })

  describe('ABI exports', () => {
    it('exports VFIDE_TOKEN_ABI', async () => {
      const { VFIDE_TOKEN_ABI } = await import('@/lib/contracts')
      expect(VFIDE_TOKEN_ABI).toBeDefined()
      expect(Array.isArray(VFIDE_TOKEN_ABI)).toBe(true)
    })

    it('exports SEER_ABI', async () => {
      const { SEER_ABI } = await import('@/lib/contracts')
      expect(SEER_ABI).toBeDefined()
      expect(Array.isArray(SEER_ABI)).toBe(true)
    })

    it('exports VAULT_HUB_ABI', async () => {
      const { VAULT_HUB_ABI } = await import('@/lib/contracts')
      expect(VAULT_HUB_ABI).toBeDefined()
      expect(Array.isArray(VAULT_HUB_ABI)).toBe(true)
    })

    it('exports MERCHANT_PORTAL_ABI', async () => {
      const { MERCHANT_PORTAL_ABI } = await import('@/lib/contracts')
      expect(MERCHANT_PORTAL_ABI).toBeDefined()
      expect(Array.isArray(MERCHANT_PORTAL_ABI)).toBe(true)
    })

    it('exports VFIDEBadgeNFTABI', async () => {
      const { VFIDEBadgeNFTABI } = await import('@/lib/contracts')
      expect(VFIDEBadgeNFTABI).toBeDefined()
      expect(Array.isArray(VFIDEBadgeNFTABI)).toBe(true)
    })
  })

  describe('production contract validation', () => {
    afterAll(() => {
      process.env = originalEnv
      jest.resetModules()
    })

    it('throws when a required contract address is missing in strict production', async () => {
      await expect(importContractsWithEnv({
        NODE_ENV: 'production',
        FRONTEND_SELF_CONTAINED: 'false',
        NEXT_PUBLIC_FRONTEND_ONLY: 'false',
        NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: undefined,
      })).rejects.toThrow('[VFIDE] Missing required contract address in production: VFIDEToken')
    })

    it('allows ZERO_ADDRESS fallback in explicit frontend-only mode', async () => {
      const { CONTRACT_ADDRESSES, ZERO_ADDRESS } = await importContractsWithEnv({
        NODE_ENV: 'production',
        FRONTEND_SELF_CONTAINED: 'true',
        NEXT_PUBLIC_FRONTEND_ONLY: 'true',
        NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: undefined,
        DATABASE_URL: undefined,
        JWT_SECRET: undefined,
      })

      expect(CONTRACT_ADDRESSES.VFIDEToken).toBe(ZERO_ADDRESS)
    })
  })
})
