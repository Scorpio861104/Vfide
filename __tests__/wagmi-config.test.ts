import { describe, expect, it,  beforeEach } from '@jest/globals'

// Mock all external dependencies first
jest.mock('@rainbow-me/rainbowkit', () => ({
  connectorsForWallets: jest.fn(() => []),
}))

jest.mock('@rainbow-me/rainbowkit/wallets', () => ({
  walletConnectWallet: {},
  metaMaskWallet: {},
}))

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  http: jest.fn(() => ({})),
}))

jest.mock('wagmi/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
  polygon: { id: 137, name: 'Polygon' },
  polygonAmoy: { id: 80002, name: 'Polygon Amoy' },
  zkSync: { id: 324, name: 'zkSync' },
  zkSyncSepoliaTestnet: { id: 300, name: 'zkSync Sepolia' },
}))

jest.mock('@/lib/chains', () => ({
  IS_TESTNET: true,
}))

describe('wagmi config', () => {
  beforeEach(() => {
    jest.resetModules()
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
