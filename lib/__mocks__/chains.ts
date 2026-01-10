// Mock chains for Jest tests
export type SupportedChain = 'base' | 'polygon' | 'zksync'

export interface ChainConfig {
  id: SupportedChain
  name: string
  icon: string
  description: string
  tagline: string
  mainnet: { id: number; name: string }
  testnet: { id: number; name: string }
  contracts: {
    mainnet: ChainContracts
    testnet: ChainContracts
  }
  faucetUrl?: string
  bridgeUrl: string
  color: string
}

export interface ChainContracts {
  vfideToken: string
  vaultHub: string
  presale: string
  seer: string
}

export const CHAINS: Record<SupportedChain, ChainConfig> = {
  base: {
    id: 'base',
    name: 'Base',
    icon: '🔵',
    description: "Coinbase's L2",
    tagline: 'Easiest for Coinbase users',
    mainnet: { id: 8453, name: 'Base' },
    testnet: { id: 84532, name: 'Base Sepolia' },
    contracts: {
      mainnet: {
        vfideToken: '0x1111111111111111111111111111111111111111',
        vaultHub: '0x2222222222222222222222222222222222222222',
        presale: '0x3333333333333333333333333333333333333333',
        seer: '0x4444444444444444444444444444444444444444',
      },
      testnet: {
        vfideToken: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        vaultHub: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        presale: '0xcccccccccccccccccccccccccccccccccccccccc',
        seer: '0xdddddddddddddddddddddddddddddddddddddddd',
      },
    },
    faucetUrl: 'https://faucet.base.org',
    bridgeUrl: 'https://bridge.base.org',
    color: '#0052FF',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    icon: '🟣',
    description: 'Largest L2',
    tagline: 'Most popular L2',
    mainnet: { id: 137, name: 'Polygon' },
    testnet: { id: 80002, name: 'Polygon Amoy' },
    contracts: {
      mainnet: {
        vfideToken: '0x5555555555555555555555555555555555555555',
        vaultHub: '0x6666666666666666666666666666666666666666',
        presale: '0x7777777777777777777777777777777777777777',
        seer: '0x8888888888888888888888888888888888888888',
      },
      testnet: {
        vfideToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        vaultHub: '0xffffffffffffffffffffffffffffffffffffffff',
        presale: '0x0000000000000000000000000000000000000001',
        seer: '0x0000000000000000000000000000000000000002',
      },
    },
    bridgeUrl: 'https://wallet.polygon.technology/bridge',
    color: '#8247E5',
  },
  zksync: {
    id: 'zksync',
    name: 'zkSync',
    icon: '⚡',
    description: 'Lowest fees',
    tagline: 'Best for power users',
    mainnet: { id: 324, name: 'zkSync Era' },
    testnet: { id: 300, name: 'zkSync Sepolia' },
    contracts: {
      mainnet: {
        vfideToken: '0x9999999999999999999999999999999999999999',
        vaultHub: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        presale: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        seer: '0xcccccccccccccccccccccccccccccccccccccccc',
      },
      testnet: {
        vfideToken: '0x0000000000000000000000000000000000000003',
        vaultHub: '0x0000000000000000000000000000000000000004',
        presale: '0x0000000000000000000000000000000000000005',
        seer: '0x0000000000000000000000000000000000000006',
      },
    },
    faucetUrl: 'https://portal.zksync.io/faucet',
    bridgeUrl: 'https://portal.zksync.io/bridge',
    color: '#1E69FF',
  },
}

export const ALL_CHAINS = Object.values(CHAINS)
export const DEFAULT_CHAIN = CHAINS.base

export function getChainList() {
  return [
    CHAINS.base,
    CHAINS.polygon,
    CHAINS.zksync,
  ]
}

export function getWagmiChains() {
  return [
    { id: 84532, name: 'Base Sepolia' },
    { id: 80002, name: 'Polygon Amoy' },
    { id: 300, name: 'zkSync Sepolia' },
  ]
}

export const IS_TESTNET = true

export function getChainContracts(chain: SupportedChain) {
  return CHAINS[chain].contracts.testnet
}

export function isChainReady(chain: SupportedChain): boolean {
  const contracts = getChainContracts(chain)
  return Boolean(contracts.vfideToken && contracts.vaultHub)
}

export function getReadyChains(): SupportedChain[] {
  return (Object.keys(CHAINS) as SupportedChain[]).filter(isChainReady)
}
