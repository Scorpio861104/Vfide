import { describe, it, expect, beforeEach } from '@jest/globals'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'

describe('contracts', () => {
  describe('CONTRACT_ADDRESSES', () => {
    it('has all required contract address keys', () => {
      expect(CONTRACT_ADDRESSES).toHaveProperty('VFIDEToken')
      expect(CONTRACT_ADDRESSES).toHaveProperty('VFIDEPresale')
      expect(CONTRACT_ADDRESSES).toHaveProperty('StablecoinRegistry')
      expect(CONTRACT_ADDRESSES).toHaveProperty('MerchantPortal')
      expect(CONTRACT_ADDRESSES).toHaveProperty('VaultHub')
      expect(CONTRACT_ADDRESSES).toHaveProperty('Seer')
      expect(CONTRACT_ADDRESSES).toHaveProperty('DAO')
      expect(CONTRACT_ADDRESSES).toHaveProperty('DAOTimelock')
      expect(CONTRACT_ADDRESSES).toHaveProperty('BadgeNFT')
      expect(CONTRACT_ADDRESSES).toHaveProperty('SecurityHub')
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

    it('exports BADGE_NFT_ABI', async () => {
      const { BADGE_NFT_ABI } = await import('@/lib/contracts')
      expect(BADGE_NFT_ABI).toBeDefined()
      expect(Array.isArray(BADGE_NFT_ABI)).toBe(true)
    })

    it('exports PRESALE_ABI', async () => {
      const { PRESALE_ABI } = await import('@/lib/contracts')
      expect(PRESALE_ABI).toBeDefined()
      expect(Array.isArray(PRESALE_ABI)).toBe(true)
    })
  })
})
