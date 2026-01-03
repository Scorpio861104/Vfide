import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for jsdom
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock viem to avoid TextEncoder issues
jest.mock('viem', () => ({
  isAddress: jest.fn((addr) => addr && addr.startsWith('0x') && addr.length === 42),
  getAddress: jest.fn((addr) => addr),
  formatUnits: jest.fn((value, decimals) => (Number(value) / Math.pow(10, decimals)).toString()),
  parseUnits: jest.fn((value, decimals) => BigInt(Math.floor(parseFloat(value) * Math.pow(10, decimals)))),
  formatEther: jest.fn((value) => (Number(value) / 1e18).toString()),
  parseEther: jest.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e18))),
  keccak256: jest.fn((bytes) => {
    // Simple mock hash - in reality uses actual keccak256
    const str = typeof bytes === 'string' ? bytes : Array.from(bytes).join('')
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`
  }),
  toBytes: jest.fn((str) => new TextEncoder().encode(str)),
}))

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: false,
    chain: { id: 1 },
  })),
  useBalance: jest.fn(() => ({
    data: { formatted: '0', symbol: 'ETH' },
    isLoading: false,
  })),
  useReadContract: jest.fn(() => ({
    data: null,
    isLoading: false,
    refetch: jest.fn(),
  })),
  useReadContracts: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useContractRead: jest.fn(() => ({
    data: null,
    isLoading: false,
    refetch: jest.fn(),
  })),
  useContractWrite: jest.fn(() => ({
    write: jest.fn(),
    isLoading: false,
    isSuccess: false,
  })),
  useWriteContract: jest.fn(() => ({
    writeContract: jest.fn(),
    writeContractAsync: jest.fn(),
    data: undefined,
    isPending: false,
  })),
  useWaitForTransaction: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
  })),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
  })),
  useNetwork: jest.fn(() => ({
    chain: { id: 1, name: 'Ethereum' },
  })),
  useSwitchNetwork: jest.fn(() => ({
    switchNetwork: jest.fn(),
  })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({
    switchChain: jest.fn(),
    isPending: false,
  })),
  useConnect: jest.fn(() => ({
    connect: jest.fn(),
    connectors: [],
  })),
  useDisconnect: jest.fn(() => ({
    disconnect: jest.fn(),
  })),
  usePublicClient: jest.fn(() => ({})),
  useWalletClient: jest.fn(() => ({ data: null })),
}))

// Mock RainbowKit
jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => null,
  RainbowKitProvider: ({ children }) => children,
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => children,
}))

// Mock @/lib/testnet
jest.mock('@/lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
  CURRENT_CHAIN_NAME: 'Base Sepolia',
}))

// Mock window.matchMedia - only if window exists
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}
