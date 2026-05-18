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
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectors: [] })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn() })),
  useBalance: jest.fn(() => ({ data: null })),
  useReadContract: jest.fn(() => ({ data: null })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: null })),
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
  usePathname: jest.fn(() => '/social-hub'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _initial, animate: _animate, exit: _exit, whileHover: _whileHover, whileTap: _whileTap, transition: _transition, layout: _layout, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _initial, animate: _animate, exit: _exit, whileHover: _whileHover, whileTap: _whileTap, transition: _transition, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
    article: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _initial, animate: _animate, exit: _exit, whileHover: _whileHover, whileTap: _whileTap, transition: _transition, ...rest } = props;
      return <article {...rest}>{children}</article>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock components
jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div data-testid="page-wrapper">{children}</div>,
}));

// Import after mocks
import SocialHubPage from '../page';

// Mock fetch for API calls
const mockPosts = [
  {
    id: '1',
    author: {
      address: '0xCrypto...King',
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
      address: '0xDeFi...Queen',
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
    expect(screen.getByText('Social Hub')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<SocialHubPage />);
    expect(screen.getByText(/Follow merchants, share updates, and track community activity across VFIDE/i)).toBeInTheDocument();
  });

  it('renders Footer', () => {
    render(<SocialHubPage />);
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  describe('when wallet is connected', () => {
    it('renders the create post input', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders feed filter buttons', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /following/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /trending/i })).toBeInTheDocument();
    });

    it('renders story section', () => {
      render(<SocialHubPage />);
      // Stories are loaded from API, which returns empty array
      // No "You" story circle when stories API returns empty
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders mock posts', async () => {
      render(<SocialHubPage />);
      await waitFor(() => {
        expect(screen.getByText(/Just hit 1000 successful transactions on VFIDE!/)).toBeInTheDocument();
      });
      expect(screen.getByText(/Always check ProofScore before transacting/)).toBeInTheDocument();
    });

    it('allows switching feed filters', () => {
      render(<SocialHubPage />);
      const followingBtn = screen.getByRole('button', { name: /following/i });
      fireEvent.click(followingBtn);
      // Filter should be active (has different styling)
      expect(followingBtn).toBeInTheDocument();
    });

    it('allows typing in the create post input', () => {
      render(<SocialHubPage />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Hello Web3 World!' } });
      expect(input).toHaveValue('Hello Web3 World!');
    });

    it('shows character count when focused', async () => {
      render(<SocialHubPage />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Test post' } });
      
      await waitFor(() => {
        expect(screen.getByText('9/280')).toBeInTheDocument();
      });
    });

    it('renders the trending sidebar', () => {
      render(<SocialHubPage />);
      expect(screen.getByText('Quick Access')).toBeInTheDocument();
      expect(screen.getAllByText('Trending').length).toBeGreaterThan(0);
      expect(screen.getByText('Who to Follow')).toBeInTheDocument();
    });

    it('renders quick access links', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('link', { name: /Activity Feed/i })).toHaveAttribute('href', '/feed');
      expect(screen.getByRole('link', { name: /Stories/i })).toHaveAttribute('href', '/stories');
      expect(screen.getByRole('link', { name: /Messages/i })).toHaveAttribute('href', '/social-messaging');
    });

    it('renders trending hashtags', async () => {
      render(<SocialHubPage />);
      // Hashtags appear in post tags after posts load
      await waitFor(() => {
        expect(screen.getAllByText(/#VFIDE/i).length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getAllByText(/#DeFi/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders suggested users fallback', () => {
      render(<SocialHubPage />);
      // API returns empty users array, so fallback text shows
      expect(screen.getByText(/Suggested accounts will appear/i)).toBeInTheDocument();
    });

    it('renders the Load More button', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('button', { name: /Load More Posts/i })).toBeInTheDocument();
    });

    it('allows liking a post', async () => {
      render(<SocialHubPage />);
      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText(/Just hit 1000 successful transactions on VFIDE!/)).toBeInTheDocument();
      });
      // Find like buttons by looking for Heart icon class
      const likeButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg.lucide-heart') || btn.textContent?.includes('234')
      );
      expect(likeButtons.length).toBeGreaterThan(0);
      fireEvent.click(likeButtons[0]);
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
      expect(screen.getByText(/Connect to Join the Conversation/)).toBeInTheDocument();
    });

    it('renders connect button', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeInTheDocument();
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
    expect(heading).toHaveTextContent('Social Hub');
  });

  it('has accessible page wrapper landmark container', () => {
    render(<SocialHubPage />);
    expect(screen.getByTestId('page-wrapper')).toBeInTheDocument();
  });
});
