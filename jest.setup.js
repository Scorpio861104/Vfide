import '@testing-library/jest-dom'

// Set up environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-testing-12345';
process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET;
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID = '84532'; // Base Sepolia for testing
process.env.NEXT_PUBLIC_CHAIN_ID = '84532'; // Required by lib/auth/jwt.ts generateToken()
process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS = '0x1234567890123456789012345678901234567890'; // Required by crypto/price route
process.env.NEXT_PUBLIC_VFIDE_WETH_POOL_ADDRESS = '0x0000000000000000000000000000000000000000'; // Default no pool

// Polyfill TextEncoder/TextDecoder for jsdom
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock canvas getContext for jest-axe and other DOM tests
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  })
}

// Mock getComputedStyle for jest-axe color contrast checks
if (typeof window !== 'undefined') {
  window.getComputedStyle = (element) => {
    const style = element && element.style ? element.style : {};
    const display = style.display || 'block';
    const visibility = style.visibility || 'visible';
    const opacity = style.opacity || '1';
    const width = style.width || '';
    const height = style.height || '';
    const transform = style.transform || '';

    return {
      getPropertyValue: (property) => {
        if (property === 'width') return width;
        if (property === 'height') return height;
        if (property === 'transform') return transform;
        if (property === 'color') return 'rgb(0, 0, 0)';
        if (property === 'background-color') return 'rgb(255, 255, 255)';
        if (property === 'opacity') return opacity;
        if (property === 'display') return display;
        if (property === 'visibility') return visibility;
        return '';
      },
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgb(255, 255, 255)',
      opacity,
      display,
      visibility,
      width,
      height,
      transform,
    };
  };
}


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

if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(async () =>
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
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

// Mock wagmi hooks - comprehensive mock for all commonly used hooks
jest.mock('wagmi', () => ({
  // Account & Connection
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    isReconnecting: false,
    chain: { id: 1, name: 'Ethereum' },
    connector: { id: 'mock', name: 'Mock Connector' },
    status: 'connected',
  })),
  useConnect: jest.fn(() => ({
    connect: jest.fn(),
    connectAsync: jest.fn(),
    connectors: [
      { id: 'metamask', name: 'MetaMask', type: 'injected' },
      { id: 'walletconnect', name: 'WalletConnect', type: 'walletConnect' },
    ],
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
    reset: jest.fn(),
  })),
  useDisconnect: jest.fn(() => ({
    disconnect: jest.fn(),
    disconnectAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: jest.fn(),
  })),
  useReconnect: jest.fn(() => ({
    reconnect: jest.fn(),
    isPending: false,
  })),
  useWatchContractEvent: jest.fn(() => undefined),

  // Balance & Token
  useBalance: jest.fn(() => ({
    data: { 
      formatted: '1.5', 
      symbol: 'ETH',
      decimals: 18,
      value: BigInt('1500000000000000000'),
    },
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useToken: jest.fn(() => ({
    data: { name: 'Mock Token', symbol: 'MOCK', decimals: 18 },
    isLoading: false,
    isError: false,
    error: null,
  })),

  // Contract Interactions
  useReadContract: jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isFetching: false,
    isPending: false,
  })),
  useReadContracts: jest.fn(() => ({
    data: [],
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useContractRead: jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useContractWrite: jest.fn(() => ({
    write: jest.fn(),
    writeAsync: jest.fn(),
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
    reset: jest.fn(),
  })),
  useWriteContract: jest.fn(() => ({
    writeContract: jest.fn(),
    writeContractAsync: jest.fn().mockResolvedValue('0xhash'),
    data: undefined,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: jest.fn(),
  })),
  useSimulateContract: jest.fn(() => ({
    data: { request: {} },
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  usePrepareContractWrite: jest.fn(() => ({
    config: {},
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),

  // Transactions
  useSendTransaction: jest.fn(() => ({
    sendTransaction: jest.fn(),
    sendTransactionAsync: jest.fn().mockResolvedValue('0xhash'),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
    reset: jest.fn(),
  })),
  useWaitForTransaction: jest.fn(() => ({
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    data: { status: 'success', blockNumber: BigInt(1000000) },
  })),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    data: { status: 'success', blockNumber: BigInt(1000000) },
  })),
  useTransaction: jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),
  useTransactionReceipt: jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),

  // Chain & Network
  useNetwork: jest.fn(() => ({
    chain: { id: 1, name: 'Ethereum', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
    chains: [{ id: 1, name: 'Ethereum' }, { id: 8453, name: 'Base' }],
  })),
  useChainId: jest.fn(() => 1),
  useChain: jest.fn(() => ({
    id: 1,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorers: { default: { url: 'https://etherscan.io' } },
  })),
  useSwitchNetwork: jest.fn(() => ({
    switchNetwork: jest.fn(),
    switchNetworkAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useSwitchChain: jest.fn(() => ({
    switchChain: jest.fn(),
    switchChainAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    chains: [{ id: 1, name: 'Ethereum' }, { id: 8453, name: 'Base' }],
  })),

  // Signing
  useSignMessage: jest.fn(() => ({
    signMessage: jest.fn(),
    signMessageAsync: jest.fn().mockResolvedValue('0xsignature'),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
    reset: jest.fn(),
  })),
  useSignTypedData: jest.fn(() => ({
    signTypedData: jest.fn(),
    signTypedDataAsync: jest.fn().mockResolvedValue('0xsignature'),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
    reset: jest.fn(),
  })),
  useVerifyMessage: jest.fn(() => ({
    data: true,
    isLoading: false,
    isError: false,
    error: null,
  })),

  // Gas & Fee Data
  useGasPrice: jest.fn(() => ({
    data: BigInt('20000000000'), // 20 gwei
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useFeeData: jest.fn(() => ({
    data: {
      gasPrice: BigInt('20000000000'),
      maxFeePerGas: BigInt('25000000000'),
      maxPriorityFeePerGas: BigInt('2000000000'),
    },
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useEstimateGas: jest.fn(() => ({
    data: BigInt('21000'),
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),
  useEstimateFeesPerGas: jest.fn(() => ({
    data: {
      maxFeePerGas: BigInt('25000000000'),
      maxPriorityFeePerGas: BigInt('2000000000'),
    },
    isLoading: false,
    isError: false,
    error: null,
  })),

  // ENS
  useEnsName: jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),
  useEnsAvatar: jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),
  useEnsAddress: jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),
  useEnsResolver: jest.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
  })),

  // Block Data
  useBlockNumber: jest.fn(() => ({
    data: BigInt(1000000),
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),
  useBlock: jest.fn(() => ({
    data: { number: BigInt(1000000), timestamp: BigInt(Date.now() / 1000) },
    isLoading: false,
    isError: false,
    error: null,
  })),
  useWatchBlockNumber: jest.fn(() => undefined),
  useWatchBlocks: jest.fn(() => undefined),
  useWatchPendingTransactions: jest.fn(() => undefined),

  // Clients
  usePublicClient: jest.fn(() => ({
    getBlock: jest.fn(),
    getBalance: jest.fn(),
    getTransaction: jest.fn(),
    estimateGas: jest.fn(),
    readContract: jest.fn(),
    simulateContract: jest.fn(),
    waitForTransactionReceipt: jest.fn(),
  })),
  useWalletClient: jest.fn(() => ({
    data: {
      account: { address: '0x1234567890123456789012345678901234567890' },
      chain: { id: 1, name: 'Ethereum' },
      signMessage: jest.fn(),
      signTypedData: jest.fn(),
      sendTransaction: jest.fn(),
      writeContract: jest.fn(),
    },
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  })),
  useConfig: jest.fn(() => ({
    chains: [{ id: 1, name: 'Ethereum' }, { id: 8453, name: 'Base' }],
    connectors: [],
    state: { chainId: 1 },
  })),
  useConnectorClient: jest.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useConnections: jest.fn(() => []),
  useConnectors: jest.fn(() => [
    { id: 'metamask', name: 'MetaMask', type: 'injected' },
  ]),

  // Utilities
  createConfig: jest.fn(() => ({})),
  http: jest.fn(() => ({})),
  fallback: jest.fn((transports) => transports[0] || {}),
  WagmiProvider: ({ children }) => children,
  WagmiConfig: ({ children }) => children,
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
jest.mock('framer-motion', () => {
  const resolveMotionChildren = (children) => {
    const resolveChild = (child) => {
      if (child && typeof child === 'object' && typeof child.get === 'function') {
        return child.get();
      }
      return child;
    };

    if (Array.isArray(children)) {
      return children.map(resolveChild);
    }

    return resolveChild(children);
  };

  return {
    motion: {
      div: ({ children, ...props }) => <div {...props}>{resolveMotionChildren(children)}</div>,
      button: ({ children, ...props }) => <button {...props}>{resolveMotionChildren(children)}</button>,
      span: ({ children, ...props }) => <span {...props}>{resolveMotionChildren(children)}</span>,
      p: ({ children, ...props }) => <p {...props}>{resolveMotionChildren(children)}</p>,
      h1: ({ children, ...props }) => <h1 {...props}>{resolveMotionChildren(children)}</h1>,
      h2: ({ children, ...props }) => <h2 {...props}>{resolveMotionChildren(children)}</h2>,
      h3: ({ children, ...props }) => <h3 {...props}>{resolveMotionChildren(children)}</h3>,
      ul: ({ children, ...props }) => <ul {...props}>{resolveMotionChildren(children)}</ul>,
      li: ({ children, ...props }) => <li {...props}>{resolveMotionChildren(children)}</li>,
      a: ({ children, ...props }) => <a {...props}>{resolveMotionChildren(children)}</a>,
      img: (props) => <img alt="" {...props} />,
      svg: ({ children, ...props }) => <svg {...props}>{resolveMotionChildren(children)}</svg>,
      path: (props) => <path {...props} />,
      table: ({ children, ...props }) => <table {...props}>{resolveMotionChildren(children)}</table>,
      thead: ({ children, ...props }) => <thead {...props}>{resolveMotionChildren(children)}</thead>,
      tbody: ({ children, ...props }) => <tbody {...props}>{resolveMotionChildren(children)}</tbody>,
      tr: ({ children, ...props }) => <tr {...props}>{resolveMotionChildren(children)}</tr>,
      th: ({ children, ...props }) => <th {...props}>{resolveMotionChildren(children)}</th>,
      td: ({ children, ...props }) => <td {...props}>{resolveMotionChildren(children)}</td>,
      section: ({ children, ...props }) => <section {...props}>{resolveMotionChildren(children)}</section>,
      article: ({ children, ...props }) => <article {...props}>{resolveMotionChildren(children)}</article>,
      aside: ({ children, ...props }) => <aside {...props}>{resolveMotionChildren(children)}</aside>,
      nav: ({ children, ...props }) => <nav {...props}>{resolveMotionChildren(children)}</nav>,
      header: ({ children, ...props }) => <header {...props}>{resolveMotionChildren(children)}</header>,
      footer: ({ children, ...props }) => <footer {...props}>{resolveMotionChildren(children)}</footer>,
      form: ({ children, ...props }) => <form {...props}>{resolveMotionChildren(children)}</form>,
      input: (props) => <input {...props} />,
      textarea: (props) => <textarea {...props} />,
      label: ({ children, ...props }) => <label {...props}>{resolveMotionChildren(children)}</label>,
    },
  AnimatePresence: ({ children }) => children,
  useMotionValue: jest.fn(() => ({
    get: () => 0,
    set: jest.fn(),
    on: jest.fn(() => jest.fn()),
    onChange: jest.fn(),
  })),
  useTransform: jest.fn((value, input, output) => {
    const computed = typeof input === 'function'
      ? input(0)
      : typeof output === 'function'
        ? output(0)
        : 0;
    return {
      get: () => computed,
      on: jest.fn(() => jest.fn()),
      onChange: jest.fn(),
    };
  }),
  useSpring: jest.fn(() => ({
    get: () => 0,
    set: jest.fn(),
    on: jest.fn(() => jest.fn()),
  })),
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
  };
})

// Mock @/lib/testnet
jest.mock('@/lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
  CURRENT_CHAIN_NAME: 'Base Sepolia',
  TESTNET_CHAIN_ID: 84532,
  MAINNET_CHAIN_ID: 8453,
  isTestnetChain: true,
  NETWORK_INFO: {
    name: 'Base Sepolia',
    shortName: 'Base',
    symbol: 'ETH',
  },
  FAUCET_URLS: {
    coinbase: 'https://portal.cdp.coinbase.com/products/faucet',
    alchemy: 'https://www.alchemy.com/faucets/base-sepolia',
    quicknode: 'https://faucet.quicknode.com/base/sepolia',
  },
  EXPLORER_URL: 'https://sepolia.basescan.org',
  BRIDGE_URL: 'https://sepolia-bridge.base.org',
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

  // Mock window.ethereum for Web3 interactions
  Object.defineProperty(window, 'ethereum', {
    writable: true,
    value: {
      isMetaMask: true,
      isConnected: jest.fn(() => true),
      selectedAddress: '0x1234567890123456789012345678901234567890',
      chainId: '0x1',
      networkVersion: '1',
      request: jest.fn(async ({ method, params: _params }) => {
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return ['0x1234567890123456789012345678901234567890'];
          case 'eth_chainId':
            return '0x1';
          case 'net_version':
            return '1';
          case 'eth_gasPrice':
            return '0x4a817c800'; // 20 gwei in hex
          case 'eth_estimateGas':
            return '0x5208'; // 21000 in hex
          case 'eth_getBalance':
            return '0x16345785D8A0000'; // 0.1 ETH in hex
          case 'eth_blockNumber':
            return '0xF4240'; // block 1000000 in hex
          case 'eth_call':
            return '0x';
          case 'eth_sendTransaction':
            return '0x' + '0'.repeat(64);
          case 'personal_sign':
          case 'eth_signTypedData_v4':
            return '0x' + '0'.repeat(130);
          case 'wallet_switchEthereumChain':
          case 'wallet_addEthereumChain':
            return null;
          default:
            return null;
        }
      }),
      on: jest.fn((_event, _callback) => {}),
      removeListener: jest.fn((_event, _callback) => {}),
      removeAllListeners: jest.fn((_event) => {}),
      enable: jest.fn(async () => ['0x1234567890123456789012345678901234567890']),
      sendAsync: jest.fn((request, callback) => {
        callback(null, { result: null });
      }),
    },
  })
}

// Keep console output visible by default so warnings/errors are not silently hidden.
// Set SUPPRESS_TEST_CONSOLE=1 for local noise reduction when needed.
if (process.env.SUPPRESS_TEST_CONSOLE === '1') {
  global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
  }
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
    play: jest.fn(),
    playSuccess: jest.fn(),
    playError: jest.fn(),
    playClick: jest.fn(),
    playNotification: jest.fn(),
  }),
}))

// Mock ResponsiveContainer and all mobile utilities
jest.mock('@/lib/mobile', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  ResponsiveSection: ({ children }) => <section data-testid="responsive-section">{children}</section>,
  useMediaQuery: jest.fn(() => false),
  useMobile: jest.fn(() => false),
  useMedia: jest.fn(() => false),
  responsiveSpacing: {
    px: { mobile: 'px-4', sm: 'sm:px-6', lg: 'lg:px-8' },
    py: { mobile: 'py-4', sm: 'sm:py-6', lg: 'lg:py-8' },
    gap: { mobile: 'gap-3', sm: 'sm:gap-4', lg: 'lg:gap-6' },
  },
  touchTargets: {
    small: 'min-h-[44px] min-w-[44px]',
    medium: 'min-h-[48px] min-w-[48px]',
    large: 'min-h-[56px] min-w-[56px]',
  },
  responsiveTypography: {
    h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
    h2: 'text-xl sm:text-2xl lg:text-3xl font-bold',
    h3: 'text-lg sm:text-xl lg:text-2xl font-semibold',
    body: 'text-base sm:text-lg leading-relaxed',
    small: 'text-sm sm:text-base',
  },
  responsiveGrids: {
    balanced: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    twoCol: 'grid-cols-1 lg:grid-cols-2',
    singleToDouble: 'grid-cols-1 md:grid-cols-2',
    auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  },
  safeArea: {
    top: 'pt-safe',
    bottom: 'pb-safe',
    left: 'pl-safe',
    right: 'pr-safe',
  },
  breakpoints: {
    mobile: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
  visibility: {
    mobileOnly: 'block sm:hidden',
    tabletUp: 'hidden sm:block',
    desktopOnly: 'hidden lg:block',
    mobileTablet: 'block lg:hidden',
  },
  responsivePadding: {
    container: 'px-4 sm:px-6 md:px-8 lg:px-12',
    section: 'py-6 sm:py-8 md:py-12 lg:py-16',
    card: 'p-4 sm:p-6 md:p-8',
  },
  responsiveFlex: {
    stackToRow: 'flex flex-col md:flex-row',
    centerToSpaceBetween: 'flex flex-col sm:flex-row sm:justify-between sm:items-center',
    centered: 'flex items-center justify-center',
  },
  imageSizes: {
    full: '100vw',
    container: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 1024px',
    thumbnail: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
    icon: '44px',
  },
  scalingFontSizes: {
    heading1: 'text-4xl sm:text-5xl lg:text-6xl',
    heading2: 'text-3xl sm:text-4xl lg:text-5xl',
    heading3: 'text-2xl sm:text-3xl lg:text-4xl',
    body: 'text-base sm:text-lg leading-relaxed',
    caption: 'text-xs sm:text-sm',
  },
  zIndex: {
    hide: '-z-10',
    base: 'z-0',
    dropdown: 'z-10',
    sticky: 'z-20',
    fixed: 'z-30',
    modal: 'z-40',
    popover: 'z-50',
  },
  safeAreaInsets: {
    top: 'env(safe-area-inset-top)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
    right: 'env(safe-area-inset-right)',
  },
}))

// Mock AvatarUpload
jest.mock('@/components/profile/AvatarUpload', () => ({
  AvatarUploadCompact: () => <div data-testid="avatar-upload">Avatar</div>,
}))


// Mock NextResponse to work with our polyfills
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse: OriginalNextResponse } = require('next/server');
  
  // Override NextResponse.json to store body in a way our polyfill can read
  const originalJson = OriginalNextResponse.json;
  OriginalNextResponse.json = function(data, init) {
    const response = originalJson.call(this, data, init);
    // Store the data so our json() method can access it
    response._body = JSON.stringify(data);
    return response;
  };
} catch (_e) {
  // Next.js not available yet, that's okay
}
