import { describe, it, expect } from 'vitest'
import { 
  CHAINS, 
  type SupportedChain, 
  type ChainConfig,
  getChainNetwork,
  getChainContracts,
  getExplorerUrl,
  getChainId,
  getAllChainIds,
  getChainByChainId,
  isSupportedChainId,
  isChainReady,
  getReadyChains,
  getChainList,
  getWagmiChains,
} from '@/lib/chains'

describe('chains', () => {
  describe('CHAINS configuration', () => {
    it('has base chain configuration', () => {
      expect(CHAINS.base).toBeDefined()
      expect(CHAINS.base.id).toBe('base')
      expect(CHAINS.base.name).toBe('Base')
    })

    it('has polygon chain configuration', () => {
      expect(CHAINS.polygon).toBeDefined()
      expect(CHAINS.polygon.id).toBe('polygon')
      expect(CHAINS.polygon.name).toBe('Polygon')
    })

    it('has zksync chain configuration', () => {
      expect(CHAINS.zksync).toBeDefined()
      expect(CHAINS.zksync.id).toBe('zksync')
      expect(CHAINS.zksync.name).toBe('zkSync')
    })
  })

  describe('chain properties', () => {
    const chains: SupportedChain[] = ['base', 'polygon', 'zksync']

    chains.forEach((chainId) => {
      describe(`${chainId} chain`, () => {
        const chain = CHAINS[chainId]

        it('has required display properties', () => {
          expect(chain.name).toBeTruthy()
          expect(chain.icon).toBeTruthy()
          expect(chain.description).toBeTruthy()
          expect(chain.tagline).toBeTruthy()
          expect(chain.color).toBeTruthy()
        })

        it('has mainnet and testnet chain objects', () => {
          expect(chain.mainnet).toBeDefined()
          expect(chain.testnet).toBeDefined()
        })

        it('has contract addresses for mainnet and testnet', () => {
          expect(chain.contracts.mainnet).toBeDefined()
          expect(chain.contracts.testnet).toBeDefined()
        })

        it('has bridge URL', () => {
          expect(chain.bridgeUrl).toBeTruthy()
          expect(chain.bridgeUrl.startsWith('http')).toBe(true)
        })

        it('contract addresses have required keys', () => {
          const requiredKeys = ['vfideToken', 'vaultHub', 'presale', 'seer']
          
          requiredKeys.forEach((key) => {
            expect(chain.contracts.mainnet).toHaveProperty(key)
            expect(chain.contracts.testnet).toHaveProperty(key)
          })
        })
      })
    })
  })

  describe('Base chain specifics', () => {
    const base = CHAINS.base

    it('has Coinbase faucet URL', () => {
      expect(base.faucetUrl).toContain('coinbase.com')
    })

    it('has blue color', () => {
      expect(base.color).toBe('#0052FF')
    })

    it('mentions Coinbase in description', () => {
      expect(base.description.toLowerCase()).toContain('coinbase')
    })
  })

  describe('Polygon chain specifics', () => {
    const polygon = CHAINS.polygon

    it('has purple icon', () => {
      expect(polygon.icon).toBe('💜')
    })
  })

  describe('zkSync chain specifics', () => {
    const zksync = CHAINS.zksync

    it('mentions low fees', () => {
      expect(zksync.description.toLowerCase()).toContain('fees')
    })
  })

  describe('helper functions', () => {
    describe('getChainNetwork', () => {
      it('returns chain network for base', () => {
        const network = getChainNetwork('base')
        expect(network).toBeDefined()
        expect(network.id).toBeDefined()
      })

      it('returns chain network for polygon', () => {
        const network = getChainNetwork('polygon')
        expect(network).toBeDefined()
      })

      it('returns chain network for zksync', () => {
        const network = getChainNetwork('zksync')
        expect(network).toBeDefined()
      })
    })

    describe('getChainContracts', () => {
      it('returns contracts for base', () => {
        const contracts = getChainContracts('base')
        expect(contracts).toHaveProperty('vfideToken')
        expect(contracts).toHaveProperty('vaultHub')
        expect(contracts).toHaveProperty('presale')
        expect(contracts).toHaveProperty('seer')
      })

      it('returns contracts for polygon', () => {
        const contracts = getChainContracts('polygon')
        expect(contracts).toBeDefined()
      })
    })

    describe('getExplorerUrl', () => {
      it('returns explorer URL for base', () => {
        const url = getExplorerUrl('base')
        expect(typeof url).toBe('string')
      })

      it('returns explorer URL for polygon', () => {
        const url = getExplorerUrl('polygon')
        expect(typeof url).toBe('string')
      })
    })

    describe('getChainId', () => {
      it('returns numeric chain ID', () => {
        const chainId = getChainId('base')
        expect(typeof chainId).toBe('number')
      })
    })

    describe('getAllChainIds', () => {
      it('returns array of chain IDs', () => {
        const chainIds = getAllChainIds()
        expect(Array.isArray(chainIds)).toBe(true)
        expect(chainIds.length).toBe(3) // base, polygon, zksync
      })

      it('all IDs are numbers', () => {
        const chainIds = getAllChainIds()
        chainIds.forEach(id => {
          expect(typeof id).toBe('number')
        })
      })
    })

    describe('getChainByChainId', () => {
      it('returns chain config for valid ID', () => {
        const chainIds = getAllChainIds()
        const config = getChainByChainId(chainIds[0])
        expect(config).toBeDefined()
      })

      it('returns undefined for invalid ID', () => {
        const config = getChainByChainId(99999)
        expect(config).toBeUndefined()
      })
    })

    describe('isSupportedChainId', () => {
      it('returns true for supported chain ID', () => {
        const chainIds = getAllChainIds()
        expect(isSupportedChainId(chainIds[0])).toBe(true)
      })

      it('returns false for unsupported chain ID', () => {
        expect(isSupportedChainId(99999)).toBe(false)
      })
    })

    describe('isChainReady', () => {
      it('returns boolean for each chain', () => {
        expect(typeof isChainReady('base')).toBe('boolean')
        expect(typeof isChainReady('polygon')).toBe('boolean')
        expect(typeof isChainReady('zksync')).toBe('boolean')
      })
    })

    describe('getReadyChains', () => {
      it('returns array of chain IDs', () => {
        const readyChains = getReadyChains()
        expect(Array.isArray(readyChains)).toBe(true)
      })
    })

    describe('getChainList', () => {
      it('returns ordered list of chains', () => {
        const list = getChainList()
        expect(Array.isArray(list)).toBe(true)
        expect(list.length).toBe(3)
        expect(list[0].id).toBe('base') // Base first
      })
    })

    describe('getWagmiChains', () => {
      it('returns array of wagmi chain objects', () => {
        const chains = getWagmiChains()
        expect(Array.isArray(chains)).toBe(true)
        expect(chains.length).toBe(3)
      })
    })
  })
})
