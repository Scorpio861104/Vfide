import { describe, it, expect } from '@jest/globals'
import {
  IS_TESTNET,
  TESTNET_CHAIN_ID,
  MAINNET_CHAIN_ID,
  CURRENT_CHAIN_ID,
  isTestnetChain,
  NETWORK_INFO,
  FAUCET_URLS,
  EXPLORER_URL,
  BRIDGE_URL,
} from '@/lib/testnet'

describe('testnet config', () => {
  describe('chain IDs', () => {
    it('has correct testnet chain ID (Base Sepolia)', () => {
      expect(TESTNET_CHAIN_ID).toBe(84532)
    })

    it('has correct mainnet chain ID (Base)', () => {
      expect(MAINNET_CHAIN_ID).toBe(8453)
    })

    it('has current chain ID set', () => {
      expect(typeof CURRENT_CHAIN_ID).toBe('number')
    })

    it('isTestnetChain matches chain ID', () => {
      expect(isTestnetChain).toBe(CURRENT_CHAIN_ID === TESTNET_CHAIN_ID)
    })
  })

  describe('network info', () => {
    it('has network name based on environment', () => {
      expect(NETWORK_INFO.name).toBeTruthy()
      expect(typeof NETWORK_INFO.name).toBe('string')
    })

    it('has Base as short name', () => {
      expect(NETWORK_INFO.shortName).toBe('Base')
    })

    it('uses ETH as symbol', () => {
      expect(NETWORK_INFO.symbol).toBe('ETH')
    })
  })

  describe('faucet URLs', () => {
    it('has Coinbase faucet URL', () => {
      expect(FAUCET_URLS.coinbase).toContain('coinbase.com')
    })

    it('has Alchemy faucet URL', () => {
      expect(FAUCET_URLS.alchemy).toContain('alchemy.com')
    })

    it('has QuickNode faucet URL', () => {
      expect(FAUCET_URLS.quicknode).toContain('quicknode.com')
    })
  })

  describe('explorer and bridge URLs', () => {
    it('has explorer URL', () => {
      expect(EXPLORER_URL).toBeTruthy()
      expect(EXPLORER_URL).toContain('basescan.org')
    })

    it('has bridge URL', () => {
      expect(BRIDGE_URL).toBeTruthy()
      expect(BRIDGE_URL).toContain('base.org')
    })
  })

  describe('IS_TESTNET flag', () => {
    it('is a boolean', () => {
      expect(typeof IS_TESTNET).toBe('boolean')
    })
  })
})
