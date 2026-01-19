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
  createPublicClient: jest.fn(() => ({})),
  createWalletClient: jest.fn(() => ({})),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => []),
}))

// Mock viem/chains
jest.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum', network: 'mainnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://etherscan.io' } } },
  base: { id: 8453, name: 'Base', network: 'base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://basescan.org' } } },
  baseSepolia: { id: 84532, name: 'Base Sepolia', network: 'base-sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://sepolia.basescan.org' } } },
  sepolia: { id: 11155111, name: 'Sepolia', network: 'sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://sepolia.etherscan.io' } } },
  optimism: { id: 10, name: 'Optimism', network: 'optimism', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://optimistic.etherscan.io' } } },
  arbitrum: { id: 42161, name: 'Arbitrum One', network: 'arbitrum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://arbiscan.io' } } },
  polygon: { id: 137, name: 'Polygon', network: 'polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, blockExplorers: { default: { url: 'https://polygonscan.com' } } },
  polygonAmoy: { id: 80002, name: 'Polygon Amoy', network: 'polygon-amoy', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, blockExplorers: { default: { url: 'https://amoy.polygonscan.com' } } },
  zkSync: { id: 324, name: 'zkSync Era', network: 'zksync-era', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://explorer.zksync.io' } } },
  zkSyncSepoliaTestnet: { id: 300, name: 'zkSync Sepolia', network: 'zksync-sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://sepolia.explorer.zksync.io' } } },
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
  useEnsName: jest.fn(() => ({ data: null, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: null, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: BigInt(1000000), isLoading: false })),
  useTransaction: jest.fn(() => ({ data: null, isLoading: false })),
  useTransactionReceipt: jest.fn(() => ({ data: null, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), isPending: false })),
  useSimulateContract: jest.fn(() => ({ data: null, isLoading: false })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), isPending: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), isPending: false })),
  useConfig: jest.fn(() => ({})),
  useConnectorClient: jest.fn(() => ({ data: null })),
  createConfig: jest.fn(() => ({})),
  http: jest.fn(() => ({})),
}))

// Mock wagmi/chains
jest.mock('wagmi/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum', network: 'mainnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://etherscan.io' } } },
  base: { id: 8453, name: 'Base', network: 'base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://basescan.org' } } },
  baseSepolia: { id: 84532, name: 'Base Sepolia', network: 'base-sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://sepolia.basescan.org' } } },
  sepolia: { id: 11155111, name: 'Sepolia', network: 'sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://sepolia.etherscan.io' } } },
  optimism: { id: 10, name: 'Optimism', network: 'optimism', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://optimistic.etherscan.io' } } },
  arbitrum: { id: 42161, name: 'Arbitrum One', network: 'arbitrum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://arbiscan.io' } } },
  polygon: { id: 137, name: 'Polygon', network: 'polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, blockExplorers: { default: { url: 'https://polygonscan.com' } } },
  polygonAmoy: { id: 80002, name: 'Polygon Amoy', network: 'polygon-amoy', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, blockExplorers: { default: { url: 'https://amoy.polygonscan.com' } } },
  zkSync: { id: 324, name: 'zkSync Era', network: 'zksync-era', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://explorer.zksync.io' } } },
  zkSyncSepoliaTestnet: { id: 300, name: 'zkSync Sepolia', network: 'zksync-sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorers: { default: { url: 'https://sepolia.explorer.zksync.io' } } },
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
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
    ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
    a: ({ children, ...props }) => <a {...props}>{children}</a>,
    img: (props) => <img {...props} />,
    svg: ({ children, ...props }) => <svg {...props}>{children}</svg>,
    path: (props) => <path {...props} />,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    article: ({ children, ...props }) => <article {...props}>{children}</article>,
    nav: ({ children, ...props }) => <nav {...props}>{children}</nav>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
    footer: ({ children, ...props }) => <footer {...props}>{children}</footer>,
    form: ({ children, ...props }) => <form {...props}>{children}</form>,
    input: (props) => <input {...props} />,
    textarea: (props) => <textarea {...props} />,
    label: ({ children, ...props }) => <label {...props}>{children}</label>,
  },
  AnimatePresence: ({ children }) => children,
  useMotionValue: jest.fn(() => ({ get: () => 0, set: jest.fn(), onChange: jest.fn() })),
  useTransform: jest.fn(() => ({ get: () => 0 })),
  useSpring: jest.fn(() => ({ get: () => 0, set: jest.fn() })),
  useAnimation: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  useInView: jest.fn(() => true),
  useScroll: jest.fn(() => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } })),
  useCycle: jest.fn(() => [0, jest.fn()]),
  useReducedMotion: jest.fn(() => false),
  useViewportScroll: jest.fn(() => ({ scrollY: { get: () => 0 } })),
  usePresence: jest.fn(() => [true, jest.fn()]),
  MotionConfig: ({ children }) => children,
  LazyMotion: ({ children }) => children,
  domAnimation: {},
  animate: jest.fn(() => ({ stop: jest.fn() })),
  m: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
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

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  })),
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock lucide-react icons - return simple span elements
jest.mock('lucide-react', () => {
  const createIcon = (name) => (props) => <span data-testid={`icon-${name}`} {...props} />
  return new Proxy({}, {
    get: (_, prop) => createIcon(prop)
  })
})

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}))

// Mock @tanstack/react-query
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn(() => ({})),
  QueryClientProvider: ({ children }) => children,
  useQuery: jest.fn(() => ({ data: null, isLoading: false, error: null })),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), isLoading: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}))

