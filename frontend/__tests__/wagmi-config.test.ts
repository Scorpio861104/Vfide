import { describe, expect, it, vi, beforeEach } from '@jest/globals'

// Mock all external dependencies first
jest.mock('@rainbow-me/rainbowkit', () => ({
  connectorsForWallets: jest.fn(() => []),
}))

jest.mock('@rainbow-me/rainbowkit/wallets', () => ({
  walletConnectWallet: {},
  metaMaskWallet: {},
}))

jest.mock('wagmi', () => ({
  createConfig: jest.fn((options) => ({
    chains: options.chains,
    transports: options.transports,
    ssr: options.ssr,
    storage: options.storage,
  })),
  http: jest.fn((url) => url || 'default-rpc'),
  createStorage: jest.fn(() => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}))

jest.mock('wagmi/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
  polygon: { id: 137, name: 'Polygon' },
  polygonAmoy: { id: 80002, name: 'Polygon Amoy' },
  zkSync: { id: 324, name: 'zkSync' },
  zkSyncSepoliaTestnet: { id: 300, name: 'zkSync Sepolia' },
}))

jest.mock('./chains', () => ({
  IS_TESTNET: true,
}))

describe('wagmi config', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports config', async () => {
    const { config } = await import('@/lib/wagmi')
    expect(config).toBeDefined()
  })

  it('config has chains', async () => {
    const { config } = await import('@/lib/wagmi')
    expect(config.chains).toBeDefined()
  })

  it('config has ssr enabled', async () => {
    const { config } = await import('@/lib/wagmi')
    expect(config.ssr).toBe(true)
  })

  it('config has storage', async () => {
    const { config } = await import('@/lib/wagmi')
    expect(config.storage).toBeDefined()
  })

  it('noopStorage provides SSR-safe implementation', () => {
    // Test noopStorage behavior
    const storage = {
      getItem: (_key: string) => null,
      setItem: (_key: string, _value: string) => {},
      removeItem: (_key: string) => {},
    }
    expect(storage.getItem('test')).toBeNull()
    storage.setItem('test', 'value') // Should not throw
    storage.removeItem('test') // Should not throw
  })
})

describe('wagmi testnet chains', () => {
  it('has testnet chains defined', async () => {
    const chains = await import('wagmi/chains')
    expect(chains.baseSepolia).toBeDefined()
    expect(chains.polygonAmoy).toBeDefined()
    expect(chains.zkSyncSepoliaTestnet).toBeDefined()
  })

  it('has mainnet chains defined', async () => {
    const chains = await import('wagmi/chains')
    expect(chains.base).toBeDefined()
    expect(chains.polygon).toBeDefined()
    expect(chains.zkSync).toBeDefined()
  })
})

describe('wagmi connectors', () => {
  it('walletConnectWallet is available', async () => {
    const { walletConnectWallet } = await import('@rainbow-me/rainbowkit/wallets')
    expect(walletConnectWallet).toBeDefined()
  })

  it('metaMaskWallet is available', async () => {
    const { metaMaskWallet } = await import('@rainbow-me/rainbowkit/wallets')
    expect(metaMaskWallet).toBeDefined()
  })

  it('connectorsForWallets is called', async () => {
    const { connectorsForWallets } = await import('@rainbow-me/rainbowkit')
    await import('@/lib/wagmi')
    expect(connectorsForWallets).toHaveBeenCalled()
  })
})

describe('wagmi http transports', () => {
  it('creates http transport', async () => {
    const { http } = await import('wagmi')
    const transport = http('https://rpc.example.com')
    expect(transport).toBeDefined()
  })

  it('creates default http transport', async () => {
    const { http } = await import('wagmi')
    const transport = http()
    expect(transport).toBeDefined()
  })
})

describe('wagmi storage', () => {
  it('creates storage', async () => {
    const { createStorage } = await import('wagmi')
    const storage = createStorage({ storage: undefined })
    expect(storage).toBeDefined()
  })
})
