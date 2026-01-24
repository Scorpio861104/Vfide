import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for jsdom
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder


// Polyfill Request, Response, and Headers for Next.js API route tests
// Create minimal but functional Web API polyfills
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this._headers.set(key, value));
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this._headers.set(key, value));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this._headers.set(key, value));
        }
      }
    }
    
    get(name) { return this._headers.get(name.toLowerCase()) || null; }
    set(name, value) { this._headers.set(name.toLowerCase(), String(value)); }
    has(name) { return this._headers.has(name.toLowerCase()); }
    delete(name) { this._headers.delete(name.toLowerCase()); }
    append(name, value) { 
      const existing = this.get(name);
      if (existing) {
        this.set(name, `${existing}, ${value}`);
      } else {
        this.set(name, value);
      }
    }
    forEach(callback, thisArg) { 
      this._headers.forEach((value, key) => callback.call(thisArg, value, key, this)); 
    }
    entries() { return this._headers.entries(); }
    keys() { return this._headers.keys(); }
    values() { return this._headers.values(); }
    [Symbol.iterator]() { return this._headers.entries(); }
  };
}

if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this._url = typeof input === 'string' ? input : input.url;
      this._method = init.method || 'GET';
      this._headers = new global.Headers(init.headers);
      this._body = init.body;
      this._cache = init.cache || 'default';
      this._credentials = init.credentials || 'same-origin';
      this._destination = '';
      this._integrity = init.integrity || '';
      this._mode = init.mode || 'cors';
      this._redirect = init.redirect || 'follow';
      this._referrer = init.referrer || 'about:client';
      this._referrerPolicy = init.referrerPolicy || '';
    }
    
    get url() { return this._url; }
    get method() { return this._method; }
    get headers() { return this._headers; }
    get body() { return this._body; }
    get cache() { return this._cache; }
    get credentials() { return this._credentials; }
    get destination() { return this._destination; }
    get integrity() { return this._integrity; }
    get mode() { return this._mode; }
    get redirect() { return this._redirect; }
    get referrer() { return this._referrer; }
    get referrerPolicy() { return this._referrerPolicy; }
    
    clone() {
      return new Request(this._url, {
        method: this._method,
        headers: this._headers,
        body: this._body,
        cache: this._cache,
        credentials: this._credentials,
        integrity: this._integrity,
        mode: this._mode,
        redirect: this._redirect,
        referrer: this._referrer,
        referrerPolicy: this._referrerPolicy,
      });
    }
    
    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body);
      }
      return this._body;
    }
    
    async text() {
      if (typeof this._body === 'string') {
        return this._body;
      }
      return JSON.stringify(this._body);
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || '';
      this.headers = new global.Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
      this.redirected = false;
      this.type = 'default';
      this.url = '';
    }
    
    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body);
      }
      return this._body;
    }
    
    async text() {
      if (typeof this._body === 'string') {
        return this._body;
      }
      return JSON.stringify(this._body);
    }
    
    async arrayBuffer() {
      const text = await this.text();
      return new TextEncoder().encode(text).buffer;
    }
    
    async blob() {
      return new Blob([await this.text()]);
    }
    
    clone() {
      return new Response(this._body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers,
      });
    }
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(init.headers || {}),
        },
      });
    }
  };
}
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
    img: (props) => <img alt="" {...props} />,
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
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock lucide-react icons - return simple span elements
jest.mock('lucide-react', () => {
  const createIcon = (name) => {
    const IconComponent = (props) => <span data-testid={`icon-${name}`} {...props} />;
    IconComponent.displayName = `Icon(${name})`;
    return IconComponent;
  };
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

// Mock useTransactionSounds hook
jest.mock('@/hooks/useTransactionSounds', () => ({
  useTransactionSounds: () => ({
    playSuccess: jest.fn(),
    playError: jest.fn(),
    playClick: jest.fn(),
    playNotification: jest.fn(),
  }),
}))

// Mock ResponsiveContainer
jest.mock('@/lib/mobile', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  useMediaQuery: jest.fn(() => false),
  useMobile: jest.fn(() => false),
}))

// Mock AvatarUpload
jest.mock('@/components/profile/AvatarUpload', () => ({
  AvatarUploadCompact: () => <div data-testid="avatar-upload">Avatar</div>,
}))


// Mock NextResponse to work with our polyfills
try {
  const { NextResponse: OriginalNextResponse } = require('next/server');
  
  // Override NextResponse.json to store body in a way our polyfill can read
  const originalJson = OriginalNextResponse.json;
  OriginalNextResponse.json = function(data, init) {
    const response = originalJson.call(this, data, init);
    // Store the data so our json() method can access it
    response._body = JSON.stringify(data);
    return response;
  };
} catch (e) {
  // Next.js not available yet, that's okay
}
