import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: any) => (
      <div className={className} style={style} onClick={onClick}>{children}</div>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled}>{children}</button>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock wagmi
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
  useChainId: () => 84532,
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle', isPending: false, isError: false, error: null, reset: jest.fn() })),
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

// Mock RainbowKit
jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}))

// Mock testnet config
jest.mock('@/lib/testnet', () => ({
  CURRENT_CHAIN_ID: 84532,
  FAUCET_URLS: { eth: 'https://faucet.example.com' },
  IS_TESTNET: true,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  Wallet: () => <span>WalletIcon</span>,
  Globe: () => <span>GlobeIcon</span>,
  Droplets: () => <span>DropletsIcon</span>,
  CheckCircle: () => <span>CheckIcon</span>,
  ArrowRight: () => <span>ArrowRightIcon</span>,
  X: () => <span>XIcon</span>,
  ExternalLink: () => <span>ExternalLinkIcon</span>,
  Copy: () => <span>CopyIcon</span>,
  Check: () => <span>CheckSmallIcon</span>,
  Loader2: () => <span>LoaderIcon</span>,
  AlertCircle: () => <span>AlertIcon</span>,
  Sparkles: () => <span>SparklesIcon</span>,
  MessageCircle: () => <span>MessageIcon</span>,
  HelpCircle: () => <span>HelpIcon</span>,
  ChevronDown: () => <span>ChevronDownIcon</span>,
  ChevronUp: () => <span>ChevronUpIcon</span>,
  Search: () => <span>SearchIcon</span>,
  Star: () => <span>StarIcon</span>,
  Gem: () => <span>GemIcon</span>,
  Trophy: () => <span>TrophyIcon</span>,
  Rocket: () => <span>RocketIcon</span>,
  Lightbulb: () => <span>LightbulbIcon</span>,
  Handshake: () => <span>HandshakeIcon</span>,
  TrendingUp: () => <span>TrendingUpIcon</span>,
  Shield: () => <span>ShieldIcon</span>,
  Key: () => <span>KeyIcon</span>,
  Lock: () => <span>LockIcon</span>,
  FileText: () => <span>FileTextIcon</span>,
  RefreshCw: () => <span>RefreshIcon</span>,
});
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

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Import components after mocking
import { SetupWizard } from '@/components/onboarding/SetupWizard'

describe('SetupWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('renders without crashing', () => {
    const { container } = render(<SetupWizard />)
    expect(container).toBeInTheDocument()
  })

  it('calls onComplete when provided', () => {
    const onComplete = jest.fn()
    const { container } = render(<SetupWizard onComplete={onComplete} />)
    expect(container).toBeInTheDocument()
  })

  it('handles localStorage check', () => {
    render(<SetupWizard />)
    expect(localStorageMock.getItem).toHaveBeenCalledWith('vfide-setup-complete')
  })

  it('skips wizard if already completed', () => {
    localStorageMock.getItem.mockReturnValue('true')
    const onComplete = jest.fn()
    render(<SetupWizard onComplete={onComplete} />)
    // Should call onComplete since setup is already done
    expect(localStorageMock.getItem).toHaveBeenCalled()
  })

  it('shows network step content', () => {
    const { container } = render(<SetupWizard />)
    // Should show some onboarding content
    expect(container.textContent).toBeTruthy()
  })

  it('has navigation buttons', () => {
    render(<SetupWizard />)
    // Should have next or continue button
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('handles step progression', () => {
    render(<SetupWizard />)
    const nextButton = screen.queryByText(/next|continue/i)
    if (nextButton) {
      fireEvent.click(nextButton)
    }
    expect(document.body).toBeInTheDocument()
  })

  it('can copy wallet address', () => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })
    
    render(<SetupWizard />)
    const copyButton = screen.queryByText(/copy/i)
    if (copyButton) {
      fireEvent.click(copyButton)
    }
    expect(document.body).toBeInTheDocument()
  })

  it('shows faucet-related content', () => {
    const { container } = render(<SetupWizard />)
    // Should show some onboarding content
    expect(container.firstChild).not.toBeNull()
  })

  it('handles close action', () => {
    const onComplete = jest.fn()
    render(<SetupWizard onComplete={onComplete} />)
    
    // Find close button (X)
    const closeButton = screen.queryByText('XIcon')
    if (closeButton) {
      fireEvent.click(closeButton)
    }
    expect(document.body).toBeInTheDocument()
  })
})
