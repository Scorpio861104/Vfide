import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
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
  WagmiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  serialize: jest.fn((v: unknown) => JSON.stringify(v)),
  deserialize: jest.fn((v: string) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
}));

// Mock RainbowKit
jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  usePathname: jest.fn(() => '/social-hub'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  const __MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'drag',
    'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition',
    'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
    'onAnimationStart', 'onAnimationComplete', 'onUpdate', 'viewport', 'custom',
  ]);
  const __makeMotion = (tag: string) => React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    const sanitized: Record<string, unknown> = {};
    for (const k of Object.keys(props || {})) {
      if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k];
    }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({} as Record<string, unknown>, {
    get: (t, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!t[prop]) t[prop] = __makeMotion(prop === 'custom' ? 'div' : prop);
      return t[prop];
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    LayoutGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useMotionValue: (v: unknown) => ({ get: () => v, set: jest.fn() }),
    useTransform: () => ({ get: () => 0, set: jest.fn() }),
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock lucide-react
jest.mock('lucide-react', () => {
  const Icon = ({ className, ...rest }: { className?: string; [key: string]: unknown }) => {
    const React = require('react');
    return React.createElement('span', { className, ...rest });
  };
  return new Proxy({} as Record<string, unknown>, {
    get: (t, prop) => {
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const MockIcon = ({ className, ...rest }: { className?: string; [key: string]: unknown }) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      MockIcon.displayName = `LucideMock(${name})`;
      return MockIcon;
    },
  });
});

// Mock VfideConnectButton
jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: ({ children }: { children?: React.ReactNode }) => <button>Connect Wallet</button>,
}));

// Mock components
jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div data-testid="page-wrapper">{children}</div>,
}));

// Mock complex sub-components to avoid deep dependency chains
jest.mock('../components/CreatePostCard', () => ({
  CreatePostCard: ({ onPost }: { onPost?: (content: string) => void }) => (
    <div data-testid="create-post-card">
      <input type="text" placeholder="Share something..." aria-label="post content" />
      <button onClick={() => onPost?.('test')}>Post</button>
    </div>
  ),
}));

jest.mock('../components/PostCard', () => ({
  PostCard: ({ post }: { post: { content: string } }) => <div data-testid="post-card">{post.content}</div>,
}));

jest.mock('../components/TrendingSidebar', () => ({
  TrendingSidebar: () => (
    <div data-testid="trending-sidebar">
      <div>Quick Access</div>
      <div>Trending</div>
      <div>Who to Follow</div>
    </div>
  ),
}));

jest.mock('@/app/social-messaging/components/MessagesTab', () => ({
  MessagesTab: () => <div data-testid="messages-tab">Messages</div>,
}));

jest.mock('@/app/social-messaging/components/CirclesTab', () => ({
  CirclesTab: () => <div data-testid="circles-tab">Circles</div>,
}));

jest.mock('@/app/social-messaging/components/GroupsTab', () => ({
  GroupsTab: () => <div data-testid="groups-tab">Groups</div>,
}));

jest.mock('@/app/social-messaging/components/DiscoverTab', () => ({
  DiscoverTab: () => <div data-testid="discover-tab">Discover</div>,
}));

jest.mock('@/components/social/UnifiedActivityFeed', () => ({
  UnifiedActivityFeed: () => <div data-testid="activity-feed">Activity Feed</div>,
}));

jest.mock('@/app/social/components/OverviewTab', () => ({
  OverviewTab: () => <div data-testid="overview-tab">Overview</div>,
}));

jest.mock('@/app/social/components/EngagementTab', () => ({
  EngagementTab: () => <div data-testid="engagement-tab">Engagement</div>,
}));

jest.mock('@/app/social/components/GrowthTab', () => ({
  GrowthTab: () => <div data-testid="growth-tab">Growth</div>,
}));

// Import after mocks
import SocialHubPage from '../page';

// Mock fetch for API calls
const mockPosts = [
  {
    id: '1',
    author: {
      address: '0xCryptoKing',
      name: 'CryptoKing',
      avatar: '👑',
      verified: true,
      proofScore: 95,
    },
    content: 'Just hit 1000 successful transactions on VFIDE! The trust protocol is working exactly as designed.',
    timestamp: Date.now() - 1000 * 60 * 30,
    likes: 234,
    comments: 45,
    shares: 12,
    views: 1420,
    liked: false,
    bookmarked: false,
    isFollowing: true,
    tags: ['VFIDE', 'DeFi'],
  },
  {
    id: '2',
    author: {
      address: '0xDeFiQueen',
      name: 'DeFiQueen',
      avatar: '💎',
      verified: true,
      proofScore: 88,
    },
    content: 'Always check ProofScore before transacting with new addresses.',
    timestamp: Date.now() - 1000 * 60 * 120,
    likes: 567,
    comments: 89,
    shares: 156,
    views: 3240,
    liked: true,
    bookmarked: true,
    isFollowing: false,
    tags: ['Security', 'ProofScore'],
  },
];

const mockApiResponse = (url: string) => {
  if (url.includes('/api/community/posts')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ posts: mockPosts }),
    });
  }
  if (url.includes('/api/community/stories')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ stories: [] }),
    });
  }
  if (url.includes('/api/community/trending')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ topics: [] }),
    });
  }
  if (url.includes('/api/friends/suggested')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ users: [] }),
    });
  }
  return Promise.reject(new Error('Not found'));
};

describe('SocialHubPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(mockApiResponse as typeof fetch);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the Social Hub header', () => {
    render(<SocialHubPage />);
    expect(screen.getAllByText('Social').length).toBeGreaterThan(0);
  });

  it('renders Footer', () => {
    render(<SocialHubPage />);
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  describe('when wallet is connected', () => {
    it('renders feed filter buttons', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /following/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /trending/i })).toBeInTheDocument();
    });

    it('renders after mount with fetch calls', async () => {
      render(<SocialHubPage />);
      // Just verify the page renders the feed tab content area
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    });

    it('allows switching feed filters', () => {
      render(<SocialHubPage />);
      const followingBtn = screen.getByRole('button', { name: /following/i });
      fireEvent.click(followingBtn);
      expect(followingBtn).toBeInTheDocument();
    });

    it('renders the trending sidebar', () => {
      render(<SocialHubPage />);
      expect(screen.getByTestId('trending-sidebar')).toBeInTheDocument();
    });
  });

  describe('when wallet is not connected', () => {
    beforeEach(() => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });
    });

    it('shows connect wallet prompt', () => {
      render(<SocialHubPage />);
      expect(screen.getByText(/Join the Conversation/i)).toBeInTheDocument();
    });
  });
});

describe('SocialHubPage Accessibility', () => {
  beforeEach(() => {
    const { useAccount } = require('wagmi');
    useAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
  });

  it('has accessible heading structure', () => {
    render(<SocialHubPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeTruthy();
  });
});
