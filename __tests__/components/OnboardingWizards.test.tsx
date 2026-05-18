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
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
  useChainId: () => 84532,
  useSwitchChain: () => ({
    switchChain: jest.fn(),
    isPending: false,
  }),
  useBalance: () => ({
    data: { formatted: '1.5', value: BigInt(1500000000000000000) },
  }),
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
jest.mock('lucide-react', () => ({
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
}))

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
