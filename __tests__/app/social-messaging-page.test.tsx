import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

let mockVaultState = {
  hasVault: true,
  vaultAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
  isLoading: false,
};

const mockUnlockAchievement = jest.fn();
const mockRecordActivity = jest.fn();
const mockTrack = jest.fn();

const renderSocialMessagingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/social-messaging/page');
  const SocialMessagingPage = pageModule.default as React.ComponentType;
  return render(<SocialMessagingPage />);
};

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => mockAccountState,
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

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/hooks/useHasVault', () => ({
  useHasVault: () => mockVaultState,
}));

jest.mock('@/lib/socialAnalytics', () => ({
  analytics: {
    track: (...args: any[]) => mockTrack(...args),
  },
}));

jest.mock('@/lib/gamification', () => ({
  gamification: {
    incrementStat: jest.fn(),
    awardXP: jest.fn(),
  },
  useGamification: () => ({
    recordActivity: mockRecordActivity,
    unlockAchievement: mockUnlockAchievement,
  }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/FirstTimeUserBanner', () => ({
  FirstTimeUserBanner: ({ message }: { message: string }) => <div>First Time Banner: {message}</div>,
}));

jest.mock('@/components/gamification/GamificationWidgets', () => ({
  UserStatsWidget: () => <div>User Stats Widget</div>,
}));

jest.mock('@/components/social/FriendsList', () => ({
  FriendsList: () => <div>Friends List Component</div>,
}));

jest.mock('@/components/social/MessagingCenter', () => ({
  MessagingCenter: () => <div>Messaging Center Component</div>,
}));

jest.mock('@/components/social/GroupMessaging', () => ({
  GroupMessaging: () => <div>Group Messaging Component</div>,
}));

jest.mock('@/components/social/FriendRequestsPanel', () => ({
  FriendRequestsPanel: () => <div>Friend Requests Component</div>,
}));

jest.mock('@/components/social/PrivacySettings', () => ({
  PrivacySettings: () => <div>Privacy Settings Component</div>,
}));

jest.mock('@/components/social/FriendCirclesManager', () => ({
  FriendCirclesManager: () => <div>Friend Circles Component</div>,
}));

jest.mock('@/components/settings/AccountSettings', () => ({
  AccountSettings: () => <div>Account Settings Component</div>,
}));

jest.mock('@/components/social/SocialNotifications', () => ({
  SocialNotifications: () => <div>Social Notifications Component</div>,
}));

jest.mock('@/components/social/GlobalUserSearch', () => ({
  GlobalUserSearch: () => <div>Global User Search Component</div>,
}));

jest.mock('@/components/social/ActivityFeed', () => ({
  ActivityFeed: () => <div>Activity Feed Component</div>,
}));

jest.mock('@/components/social/EndorsementsBadges', () => ({
  EndorsementsBadges: () => <div>Endorsements & Badges Component</div>,
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
  const __orig = {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
};
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

describe('Social messaging page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    mockVaultState = {
      hasVault: true,
      vaultAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      isLoading: false,
    };
  });

  it('shows connect-wallet guard when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    renderSocialMessagingPage();

    expect(screen.getByRole('heading', { name: /Connect Your Wallet/i })).toBeTruthy();
    expect(screen.getByText(/Access encrypted messaging/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });

  it('renders connected messaging shell and default messages tab', async () => {
    renderSocialMessagingPage();

    expect(screen.getByRole('heading', { name: /Social Hub/i })).toBeTruthy();
    expect(screen.getByText(/Vault Active/i)).toBeTruthy();
    expect(screen.getByText(/First Time Banner:/i)).toBeTruthy();
    expect(await screen.findByText('Friends List Component')).toBeTruthy();
    expect(screen.getByText(/Select a Friend to Start Messaging/i)).toBeTruthy();
  });

  it('switches tabs for requests, groups, discover, and account modules', async () => {
    renderSocialMessagingPage();

    fireEvent.click(screen.getAllByRole('button', { name: /Requests/i })[0]);
    expect(await screen.findByText('Friend Requests Component')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Groups/i })[0]);
    expect(await screen.findByText('Group Messaging Component')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Discover/i })[0]);
    expect(await screen.findByText('Global User Search Component')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Account/i })[0]);
    expect(await screen.findByText('Account Settings Component')).toBeTruthy();
    expect(await screen.findByText('Endorsements & Badges Component')).toBeTruthy();
  });

  it('renders the social shell when storage access throws', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    try {
      renderSocialMessagingPage();
      expect(screen.getByRole('heading', { name: /Social Hub/i })).toBeTruthy();
    } finally {
      getItemSpy.mockRestore();
    }
  });
});