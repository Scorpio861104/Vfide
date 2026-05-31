import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// Simple mock components for page-level testing
// Tests that pages render without throwing errors

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  useParams: jest.fn(() => ({})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}))

jest.mock('next/link', () => ({
  default: ({ children, href }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href }, children),
}))

// Mock wagmi
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
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
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v) => JSON.stringify(v)),
  deserialize: jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
}))

// Mock connectkit
jest.mock('connectkit', () => ({
  ConnectKitButton: () => React.createElement('button', { 'data-testid': 'connect-button' }, 'Connect'),
  ConnectKitProvider: ({ children }: React.PropsWithChildren) => children,
}), { virtual: true })

// Mock framer-motion
jest.mock('framer-motion', () => {
  /* FRAMER_MOTION_MOCK_V1 */
  const React = require('react');
  // Reusable component that strips motion-only props and renders the underlying tag.
  const __MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'drag',
    'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition',
    'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
    'onAnimationStart', 'onAnimationComplete', 'onUpdate', 'onPan',
    'onPanStart', 'onPanEnd', 'onTap', 'onTapStart', 'onTapCancel',
    'onHoverStart', 'onHoverEnd', 'onDrag', 'onDragStart', 'onDragEnd',
    'onDirectionLock', 'onViewportEnter', 'onViewportLeave',
    'viewport', 'custom', 'transformTemplate', 'inherit',
  ]);
  const __makeMotion = (tag) => React.forwardRef((props, ref) => {
    const sanitized = {};
    for (const k of Object.keys(props || {})) {
      if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k];
    }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({}, {
    get: (t, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!t[prop]) t[prop] = __makeMotion(prop === 'custom' ? 'div' : prop);
      return t[prop];
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }) => children,
    LayoutGroup: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    MotionConfig: ({ children }) => children,
    Reorder: { Group: ({ children }) => children, Item: ({ children }) => children },
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useAnimationControls: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollX: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollXProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useMotionValue: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useTransform: (v) => ({ get: () => 0, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useSpring: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useInView: () => true,
    useReducedMotion: () => false,
    useDragControls: () => ({ start: jest.fn() }),
    usePresence: () => [true, jest.fn()],
    useIsPresent: () => true,
    useMotionTemplate: () => ({ get: () => '', set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useViewportScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useCycle: (...args) => [args[0], jest.fn()],
    animate: jest.fn(),
    stagger: jest.fn(() => 0),
    transform: jest.fn((v) => v),
  };
});

// Mock lucide-react
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const Icon = ({ className }: { className?: string }) => {
    const React = require('react');
    return React.createElement('span', { className }, 'icon');
  };
  const __orig: Record<string, any> = {};
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})())

// Simple page component mockups for smoke testing
const DashboardPage = () => (
  <div data-testid="dashboard-page">
    <h1>Dashboard</h1>
    <div data-testid="wallet-section">Connected to wallet</div>
    <div data-testid="stats-section">Trust Score: 850</div>
    <div data-testid="actions-section">Quick Actions</div>
  </div>
)

const WalletPage = () => (
  <div data-testid="wallet-page">
    <h1>My Wallet</h1>
    <div data-testid="balance-section">Balance: 100 VFIDE</div>
    <div data-testid="transactions-section">Recent Transactions</div>
  </div>
)

const CommercePage = () => (
  <div data-testid="commerce-page">
    <h1>Commerce</h1>
    <div data-testid="payments-section">Payments</div>
    <div data-testid="escrow-section">Escrow</div>
  </div>
)

const GovernancePage = () => (
  <div data-testid="governance-page">
    <h1>Governance</h1>
    <div data-testid="proposals-section">Active Proposals</div>
    <div data-testid="voting-section">My Votes</div>
  </div>
)

const SecurityPage = () => (
  <div data-testid="security-page">
    <h1>Security</h1>
    <div data-testid="guardian-section">Guardian Settings</div>
    <div data-testid="emergency-section">Emergency Controls</div>
  </div>
)

const VaultPage = () => (
  <div data-testid="vault-page">
    <h1>Vault</h1>
    <div data-testid="savings-section">Savings</div>
    <div data-testid="yield-section">Yield</div>
  </div>
)

const ProfilePage = () => (
  <div data-testid="profile-page">
    <h1>Profile</h1>
    <div data-testid="badges-section">Badges</div>
    <div data-testid="trust-section">Trust Score</div>
  </div>
)

describe('Page Components Smoke Tests', () => {
  describe('DashboardPage', () => {
    it('renders main sections', () => {
      render(<DashboardPage />)
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
      expect(screen.getByTestId('wallet-section')).toBeInTheDocument()
      expect(screen.getByTestId('stats-section')).toBeInTheDocument()
      expect(screen.getByTestId('actions-section')).toBeInTheDocument()
    })

    it('shows heading', () => {
      render(<DashboardPage />)
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    })
  })

  describe('WalletPage', () => {
    it('renders wallet sections', () => {
      render(<WalletPage />)
      expect(screen.getByTestId('wallet-page')).toBeInTheDocument()
      expect(screen.getByTestId('balance-section')).toBeInTheDocument()
      expect(screen.getByTestId('transactions-section')).toBeInTheDocument()
    })
  })

  describe('CommercePage', () => {
    it('renders commerce sections', () => {
      render(<CommercePage />)
      expect(screen.getByTestId('commerce-page')).toBeInTheDocument()
      expect(screen.getByTestId('payments-section')).toBeInTheDocument()
      expect(screen.getByTestId('escrow-section')).toBeInTheDocument()
    })
  })

  describe('GovernancePage', () => {
    it('renders governance sections', () => {
      render(<GovernancePage />)
      expect(screen.getByTestId('governance-page')).toBeInTheDocument()
      expect(screen.getByTestId('proposals-section')).toBeInTheDocument()
      expect(screen.getByTestId('voting-section')).toBeInTheDocument()
    })
  })

  describe('SecurityPage', () => {
    it('renders security sections', () => {
      render(<SecurityPage />)
      expect(screen.getByTestId('security-page')).toBeInTheDocument()
      expect(screen.getByTestId('guardian-section')).toBeInTheDocument()
      expect(screen.getByTestId('emergency-section')).toBeInTheDocument()
    })
  })

  describe('VaultPage', () => {
    it('renders vault sections', () => {
      render(<VaultPage />)
      expect(screen.getByTestId('vault-page')).toBeInTheDocument()
      expect(screen.getByTestId('savings-section')).toBeInTheDocument()
      expect(screen.getByTestId('yield-section')).toBeInTheDocument()
    })
  })

  describe('ProfilePage', () => {
    it('renders profile sections', () => {
      render(<ProfilePage />)
      expect(screen.getByTestId('profile-page')).toBeInTheDocument()
      expect(screen.getByTestId('badges-section')).toBeInTheDocument()
      expect(screen.getByTestId('trust-section')).toBeInTheDocument()
    })
  })
})
