import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
};

const mockCopy = jest.fn();
const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();

const renderDashboardPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/dashboard/page');
  const DashboardPage = pageModule.default as React.ComponentType;
  return render(<DashboardPage />);
};

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => mockAccountState,
  useChainId: () => 8453,
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
}));

jest.mock('@/lib/chains', () => ({
  getExplorerUrlForChainId: () => 'https://basescan.org',
}));

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copied: false,
    copy: mockCopy,
  }),
}));

jest.mock('@/lib/validation', () => ({
  safeParseFloat: (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  },
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useVaultBalance: () => ({ balance: '123.45', isLoading: false }),
  useProofScore: () => ({ score: 7600, tier: 'SILVER', isLoading: false }),
  useVfidePrice: () => ({ priceUsd: 0.5, isLoading: false }),
  useUserBadges: () => ({ badgeIds: [], isLoading: false }),

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
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
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}));

jest.mock('@/hooks/useProofScore', () => ({
  useProofScore: () => ({ score: 7600, burnFee: 1.5, isLoading: false }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/wallet/QuickWalletConnect', () => ({
  QuickWalletConnect: () => <button>Quick Connect</button>,
}));

jest.mock('@/components/ui/Skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock('@/components/seo/SEOHead', () => ({
  SEOHead: () => <div data-testid="seo-head" />,
}));

jest.mock('@/components/proofscore', () => ({
  ProofScoreRing: ({ score }: { score: number }) => <div>ProofScoreRing {score}</div>,
  ProofScoreTierProgress: ({ score }: { score: number }) => <div>ProofScoreTierProgress {score}</div>,
}));

jest.mock('@/components/proofscore/ProofScoreSystem', () => ({
  ProofScoreRing: ({ score }: { score: number }) => <div>ProofScoreRing {score}</div>,
  ProofScoreTierProgress: ({ score }: { score: number }) => <div>ProofScoreTierProgress {score}</div>,
}));

jest.mock('@/components/ui/ProofScoreRing', () => ({
  ProofScoreRing: ({ score }: { score: number }) => <div>ProofScoreRing {score}</div>,
}));

jest.mock('@/components/fees', () => ({
  FeeSavingsCard: () => <div>Fee Savings Card</div>,
}));

jest.mock('@/components/compliance', () => ({
  NonCustodialNotice: () => <div>Non Custodial Notice</div>,
}));

jest.mock('@/components/onboarding', () => ({
  OnboardingProgressBar: () => <div>Onboarding Progress</div>,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/badge/BadgeGallery', () => ({
  BadgeGallery: () => <div>Badge Gallery</div>,
}));

jest.mock('@/components/badge/BadgeProgress', () => ({
  BadgeProgress: () => <div>Badge Progress</div>,
}));

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
});;

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
})());

describe('Dashboard page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0x1111111111111111111111111111111111111111',
    };

    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ activities: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });
  });

  it('renders dashboard shell when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0x1111111111111111111111111111111111111111',
    };

    renderDashboardPage();

    expect(screen.getByText(/Dashboard/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Overview/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Badges/i })).toBeTruthy();
  });

  it('renders connected dashboard and supports tab switching', async () => {
    renderDashboardPage();

    expect(screen.getByText(/Dashboard/i)).toBeTruthy();
    expect(screen.getAllByText(/ProofScoreRing 7600/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Fee Sim/i }));
    expect(await screen.findByRole('heading', { name: /Fee Simulator/i })).toBeTruthy();
    expect(screen.getByText(/Transfer Amount \(VFIDE\)/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Score Sim/i }));
    expect(await screen.findByRole('heading', { name: /Score Simulator/i })).toBeTruthy();
    expect(screen.getByText(/Projected Score/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Badges/i }));
    expect(await screen.findByText(/Badge Gallery/i)).toBeTruthy();
    expect(screen.getByText(/Badge Progress/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Activity/i }));
    expect(await screen.findByText(/No recent activity\. Start transacting to see your history!/i)).toBeTruthy();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/activities/0x1111111111111111111111111111111111111111');
    });
  });
});