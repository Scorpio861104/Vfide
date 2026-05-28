'use client';

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useFeeCalculator: jest.fn(() => ({
    vfideFee: 0.5,
    traditionalFee: 2.9,
    savings: 2.4,
    savingsPercent: 82.76,
  })),
  useProofScore: jest.fn(() => ({
    score: 5000,
    burnFee: 0.5,
    tier: 'Silver',
    color: '#C0C0C0',
  })),
  useSystemStats: jest.fn(() => ({
    vaults: 1234,
    merchants: 567,
    transactions24h: 89012,
    tvl: 12345678,
  })),

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
  useVaultBalance: jest.fn(() => ({ balance: 0n, isLoading: false, refetch: jest.fn() })),
  useVaultPayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSelfPanic: jest.fn(() => ({ selfPanic: jest.fn(), selfPanicAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCanSelfPanic: jest.fn(() => ({ canSelfPanic: false, isLoading: false, refetch: jest.fn() })),
  useGuardianCancelInheritance: jest.fn(() => ({ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false })),
  useInheritanceStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useQuarantineStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useScoreBreakdown: jest.fn(() => ({ breakdown: undefined, isLoading: false, refetch: jest.fn() })),
  useEndorse: jest.fn(() => ({ endorse: jest.fn(), endorseAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCustomerTrustScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useIsMerchant: jest.fn(() => ({ isMerchant: false, isLoading: false, refetch: jest.fn() })),
  useRegisterMerchant: jest.fn(() => ({ registerMerchant: jest.fn(), registerMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  useGetAutoConvert: jest.fn(() => ({ autoConvertEnabled: false, isLoading: false, refetch: jest.fn(), isAvailable: true })),
  useSetAutoConvert: jest.fn(() => ({ setAutoConvert: jest.fn(), setAutoConvertAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetPayoutAddress: jest.fn(() => ({ setPayoutAddress: jest.fn(), setPayoutAddressAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetMerchantPullPermit: jest.fn(() => ({ setPermit: jest.fn(), setPermitAsync: jest.fn(), isPending: false })),
  useProcessPayment: jest.fn(() => ({ processPayment: jest.fn(), processPaymentAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  usePayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useMerchantPaymentStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useBadgeNFTs: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}));

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
    m: motion,
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
});;

// Mock lucide-react icons
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  Lock: () => <span data-testid="lock-icon">🔒</span>,
  Building2: () => <span data-testid="building-icon">🏢</span>,
  Store: () => <span data-testid="store-icon">🏪</span>,
  Zap: () => <span data-testid="zap-icon">⚡</span>,
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
})());

import { FeeSavingsCalculator } from '@/components/commerce/FeeSavingsCalculator';
import { LiveSystemStats } from '@/components/stats/LiveSystemStats';
import * as hooks from '@/lib/vfide-hooks';

describe('FeeSavingsCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render calculator heading', () => {
    render(<FeeSavingsCalculator />);
    
    expect(screen.getByText('See Your Savings')).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<FeeSavingsCalculator />);
    
    expect(screen.getByText('VFIDE vs Traditional Processors')).toBeInTheDocument();
  });

  it('should render amount input', () => {
    render(<FeeSavingsCalculator />);
    
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('should render dollar sign', () => {
    render(<FeeSavingsCalculator />);
    
    // Multiple $ signs appear
    const dollarSigns = screen.getAllByText('$');
    expect(dollarSigns.length).toBeGreaterThan(0);
  });

  it('should render with default amount of 100', () => {
    render(<FeeSavingsCalculator />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(100);
  });

  it('should update amount on input change', () => {
    render(<FeeSavingsCalculator />);
    
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '500' } });
    
    expect(input).toHaveValue(500);
  });

  it('should call useFeeCalculator with amount', () => {
    render(<FeeSavingsCalculator />);
    
    expect(hooks.useFeeCalculator).toHaveBeenCalledWith('100');
  });

  it('should call useProofScore', () => {
    render(<FeeSavingsCalculator />);
    
    expect(hooks.useProofScore).toHaveBeenCalled();
  });

  it('should display savings amount', () => {
    render(<FeeSavingsCalculator />);
    
    // Savings is $2.4 - but formatted and in its own text node
    const { container } = render(<FeeSavingsCalculator />);
    expect(container.textContent).toContain('2.4');
  });

  it('should display savings section', () => {
    render(<FeeSavingsCalculator />);
    
    expect(screen.getByText('You Save')).toBeInTheDocument();
  });
});

describe('LiveSystemStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render network statistics heading', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Network Statistics')).toBeInTheDocument();
  });

  it('should render vault count', () => {
    render(<LiveSystemStats />);
    
    // The value is formatted, so check if it's rendered
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should render merchant count', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('567')).toBeInTheDocument();
  });

  it('should render Total Value Locked label', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Total Value Locked')).toBeInTheDocument();
  });

  it('should render stat icons', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });

  it('should call useSystemStats', () => {
    render(<LiveSystemStats />);
    
    expect(hooks.useSystemStats).toHaveBeenCalled();
  });

  it('should render Active Vaults label', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Active Vaults')).toBeInTheDocument();
  });

  it('should render Verified Merchants label', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Verified Merchants')).toBeInTheDocument();
  });

  it('should render Transactions label', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('should render transaction count', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('89,012')).toBeInTheDocument();
  });
});
