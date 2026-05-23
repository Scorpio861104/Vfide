'use client';

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useProofScore: jest.fn(() => ({
    score: 5000,
    canEndorse: false,
  })),
  useIsMentor: jest.fn(() => ({
    isMentor: false,
  })),
  useBecomeMentor: jest.fn(() => ({
    becomeMentor: jest.fn(),
    isLoading: false,
    isSuccess: false,
  })),
  useMentorInfo: jest.fn(() => ({
    canBecomeMentor: false,
    mentorEligibleAt: null,
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
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}));

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

import { BecomeMentorCard } from '@/components/trust/BecomeMentorCard';
import * as hooks from '@/lib/vfide-hooks';
import * as wagmi from 'wagmi';

describe('BecomeMentorCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(wagmi.useAccount).mockReturnValue({ isConnected: true, address: '0x123' } as any);
  });

  describe('When Not Connected', () => {
    it('should return null when wallet not connected', () => {
      jest.mocked(wagmi.useAccount).mockReturnValue({ isConnected: false, address: undefined } as any);
      
      const { container } = render(<BecomeMentorCard />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('When Already Mentor', () => {
    it('should return null when user is already a mentor', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: true } as any);
      
      const { container } = render(<BecomeMentorCard />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('When Eligible User', () => {
    beforeEach(() => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 5000,
        canEndorse: false,
      } as any);
    });

    it('should render Become a Mentor title', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Become a Mentor/)).toBeInTheDocument();
    });

    it('should render help description', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Help new users succeed/)).toBeInTheDocument();
    });

    it('should show score requirement', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/ProofScore ≥ 8,000/)).toBeInTheDocument();
    });

    it('should show current score', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Current:/)).toBeInTheDocument();
      // Score formatting may vary
      const container = screen.getByText(/Current:/).parentElement;
      expect(container?.textContent).toContain('5');
    });

    it('should show time requirement', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Maintain 8,000\+ for 30 Days/)).toBeInTheDocument();
    });

    it('should show details toggle button', () => {
      render(<BecomeMentorCard />);
      
      const toggleButton = screen.getByText('▶');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle details on click', () => {
      render(<BecomeMentorCard />);
      
      const toggleButton = screen.getByText('▶');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    it('should show mentor benefits when expanded', () => {
      render(<BecomeMentorCard />);
      
      const toggleButton = screen.getByText('▶');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Mentor Benefits:')).toBeInTheDocument();
      expect(screen.getByText(/Sponsor up to 10 mentees/)).toBeInTheDocument();
    });
  });

  describe('When Requirements Met', () => {
    beforeEach(() => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 9000,
        canEndorse: true,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: true,
        mentorEligibleAt: Math.floor(Date.now() / 1000) - 1000,
      } as any);
    });

    it('should show checkmarks for met requirements', () => {
      render(<BecomeMentorCard />);
      
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThanOrEqual(2);
    });

    it('should enable register button when all requirements met', () => {
      const mockBecome = jest.fn();
      jest.mocked(hooks.useBecomeMentor).mockReturnValue({
        becomeMentor: mockBecome,
        isLoading: false,
        isSuccess: false,
      } as any);
      
      render(<BecomeMentorCard />);
      
      const button = screen.getByRole('button', { name: /Register as Mentor/i });
      expect(button).not.toBeDisabled();
    });

    it('should call becomeMentor on button click', () => {
      const mockBecome = jest.fn();
      jest.mocked(hooks.useBecomeMentor).mockReturnValue({
        becomeMentor: mockBecome,
        isLoading: false,
        isSuccess: false,
      } as any);
      
      render(<BecomeMentorCard />);
      
      const button = screen.getByRole('button', { name: /Register as Mentor/i });
      fireEvent.click(button);
      
      expect(mockBecome).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when registering', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 9000,
        canEndorse: true,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: true,
        mentorEligibleAt: null,
      } as any);
      jest.mocked(hooks.useBecomeMentor).mockReturnValue({
        becomeMentor: jest.fn(),
        isLoading: true,
        isSuccess: false,
      } as any);
      
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Registering/)).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should show success message after registration', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 9000,
        canEndorse: true,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: true,
        mentorEligibleAt: null,
      } as any);
      jest.mocked(hooks.useBecomeMentor).mockReturnValue({
        becomeMentor: jest.fn(),
        isLoading: false,
        isSuccess: true,
      } as any);
      
      render(<BecomeMentorCard />);
      
      // Text is "✅ Registered as Mentor!"
      expect(screen.getByText(/Registered as Mentor/)).toBeInTheDocument();
    });
  });

  describe('Countdown Display', () => {
    it('should show days remaining when time requirement not met', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 9000,
        canEndorse: true,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: false,
        mentorEligibleAt: Math.floor(Date.now() / 1000) + (10 * 24 * 60 * 60),
      } as any);
      
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/complete cooldown/i)).toBeInTheDocument();
    });
  });

  describe('Not Eligible Message', () => {
    it('should show message to increase ProofScore when not meeting score requirement', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 5000,
        canEndorse: false,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: false,
        mentorEligibleAt: null,
      } as any);
      
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Increase your ProofScore to qualify/)).toBeInTheDocument();
    });
  });
});
