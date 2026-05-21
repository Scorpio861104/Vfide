import { beforeEach, describe, expect, it, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockIsCardBoundVaultMode = jest.fn(() => false)

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
  const __orig = ({
  HelpCircle: () => <span data-testid="help-icon">Help</span>,
  X: () => <span>X</span>,
  Book: () => <span>Book</span>,
  Wallet: () => <span>Wallet</span>,
  Shield: () => <span>Shield</span>,
  Store: () => <span>Store</span>,
  Star: () => <span>Star</span>,
  Vote: () => <span>Vote</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  Globe: () => <span>Globe</span>,
  Droplets: () => <span>Droplets</span>,
  Sparkles: () => <span>Sparkles</span>,
  Users: () => <span>Users</span>,
  ArrowRight: () => <span>ArrowRight</span>,
  ChevronLeft: () => <span>ChevronLeft</span>,
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

jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: (_address?: string | null) => true,
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  isCardBoundVaultMode: () => mockIsCardBoundVaultMode(),
  getContractConfigurationError: (_name: string) => null,
}))

// OnboardingManager was removed during refactoring; HelpCenter no longer depends on it.

// Import after mocking
import { HelpCenter } from '@/components/onboarding/HelpCenter'

describe('HelpCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsCardBoundVaultMode.mockReturnValue(false)
  })

  it('renders help button', () => {
    render(<HelpCenter />)
    expect(screen.getByTestId('help-icon')).toBeInTheDocument()
  })

  it('opens help panel on click', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Help Center')).toBeInTheDocument()
  })

  it('shows help topics', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
  })

  it('shows network setup topic', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Network Setup')).toBeInTheDocument()
  })

  it('shows get test ETH topic', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Get Test ETH')).toBeInTheDocument()
  })

  it('shows wallet setup topic', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Wallet Setup')).toBeInTheDocument()
  })

  it('shows vault security topic', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Vault Security')).toBeInTheDocument()
  })

  it('can expand topic content', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    
    // Click on a topic to expand
    const gettingStarted = screen.getByText('Getting Started')
    fireEvent.click(gettingStarted)
    
    // Content should be visible
    expect(screen.getByText(/Connect your Web3 wallet/)).toBeInTheDocument()
  })

  it('can close help panel', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    
    // Find close button
    const closeButton = screen.getByText('X').closest('button') || screen.getByText('X')
    fireEvent.click(closeButton)
    
    // Panel should be closed
    expect(screen.queryByText('Help Center')).not.toBeInTheDocument()
  })

  it('shows CardBound-safe vault security guidance when CardBound mode is active', () => {
    mockIsCardBoundVaultMode.mockReturnValue(true)

    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    fireEvent.click(screen.getByText('Vault Security'))

    expect(screen.getByText(/Wallet Rotation: Guardians can approve signer rotation and protect queued transfers\. Configure heirs and inheritance in the vault's Inheritance section\./i)).toBeInTheDocument()
    expect(screen.queryByText(/Next of Kin: Designate an heir to inherit your vault if something happens/i)).not.toBeInTheDocument()
  })
})
