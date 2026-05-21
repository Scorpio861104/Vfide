/**
 * Onboarding Components Tests
 * Tests for FeatureTooltip, GuardianWizard, OnboardingTour, BeginnerWizard
 * All have 0% coverage
 */
import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'

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

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({,
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}))

// Mock wagmi
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
  useChainId: () => 84532,
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: () => ({ data: undefined, isLoading: false }),
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

// Mock hooks
jest.mock('@/hooks/useSimpleVault', () => ({
  useSimpleVault: () => ({
    executeVaultAction: jest.fn(),
    userMessage: '',
    actionStatus: 'idle',
  }),
}))

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => ({
    vaultAddress: '0x1234567890123456789012345678901234567890' as const,
    hasVault: true,
  }),
}))

describe('GuardianWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with onClose prop', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    const mockOnClose = jest.fn()
    render(<GuardianWizard onClose={mockOnClose} />)
    
    expect(screen.getByText('What are Guardians?')).toBeInTheDocument()
  })

  it('shows step progress indicators', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={jest.fn()} />)
    
    // 4 steps in the wizard
    const progressBars = document.querySelectorAll('.h-2.flex-1.rounded-full')
    expect(progressBars.length).toBe(4)
  })

  it('has close button', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={jest.fn()} />)
    
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    const mockOnClose = jest.fn()
    render(<GuardianWizard onClose={mockOnClose} />)
    
    fireEvent.click(screen.getByText('×'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays first step description', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={jest.fn()} />)
    
    expect(screen.getByText(/Guardians are like trusted friends/i)).toBeInTheDocument()
  })
})

describe('OnboardingTour', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when autoStart is true', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={true} />)
    
    expect(screen.getByText('Welcome to VFIDE')).toBeInTheDocument()
  })

  it('does not render when autoStart is false', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={false} />)
    
    expect(screen.queryByText('Welcome to VFIDE')).not.toBeInTheDocument()
  })

  it('shows first step description', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={true} />)
    
    expect(screen.getByText(/take a quick tour/i)).toBeInTheDocument()
  })

  it('has Next button', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={true} />)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeInTheDocument()
  })

  it('advances to next step when Next clicked', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={true} />)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)
    
    // Should show step 2
    expect(screen.getByText('No Processor Fees')).toBeInTheDocument()
  })
})

describe('BeginnerWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders by default', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    render(<BeginnerWizard />)
    
    expect(screen.getByText('What is a wallet?')).toBeInTheDocument()
  })

  it('shows first step description', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    render(<BeginnerWizard />)
    
    expect(screen.getByText(/wallet is like your digital piggy bank/i)).toBeInTheDocument()
  })

  it('has close button', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    render(<BeginnerWizard />)
    
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('has step progress indicators', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    render(<BeginnerWizard />)
    
    // 5 steps in beginner wizard
    const progressBars = document.querySelectorAll('.h-2.flex-1.rounded-full')
    expect(progressBars.length).toBe(5)
  })

  it('closes wizard when X clicked', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    const mockOnComplete = jest.fn()
    render(<BeginnerWizard onComplete={mockOnComplete} />)
    
    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)
    
    // Wizard should be closed
    expect(screen.queryByText('What is a wallet?')).not.toBeInTheDocument()
  })
})

describe('FeatureTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock localStorage
    const mockStorage: Record<string, string> = {}
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockStorage[key] || null)
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockStorage[key] = value
    })
  })

  it('does not show when autoShow is false', async () => {
    const { FeatureTooltip } = await import('@/components/onboarding/FeatureTooltip')
    render(
      <FeatureTooltip
        id="test-tooltip"
        title="Hidden"
        description="Should not show"
        autoShow={false}
      />
    )
    
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('exports the component', async () => {
    const module = await import('@/components/onboarding/FeatureTooltip')
    
    expect(module.FeatureTooltip).toBeDefined()
  })
})
