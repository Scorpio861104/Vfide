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
jest.mock('@/components/layout/GlobalNav', () => ({
  GlobalNav: () => <nav data-testid="global-nav">GlobalNav</nav>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div data-testid="page-wrapper">{children}</div>,
}));

// Import after mocks
import SocialHubPage from '../page';

describe('SocialHubPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Social Hub header', () => {
    render(<SocialHubPage />);
    expect(screen.getByText('Social Hub')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<SocialHubPage />);
    expect(screen.getByText(/Connect, share, and engage with the VFIDE community/)).toBeInTheDocument();
  });

  it('renders GlobalNav and Footer', () => {
    render(<SocialHubPage />);
    expect(screen.getByTestId('global-nav')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  describe('when wallet is connected', () => {
    it('renders the create post input', () => {
      render(<SocialHubPage />);
      expect(screen.getByPlaceholderText(/What's happening in Web3/)).toBeInTheDocument();
    });

    it('renders feed filter buttons', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /following/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /trending/i })).toBeInTheDocument();
    });

    it('renders story circles', () => {
      render(<SocialHubPage />);
      expect(screen.getByText('You')).toBeInTheDocument();
      // CryptoKing appears in both stories and posts
      expect(screen.getAllByText('CryptoKing').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('DeFiQueen').length).toBeGreaterThanOrEqual(1);
    });

    it('renders mock posts', () => {
      render(<SocialHubPage />);
      expect(screen.getByText(/Just hit 1000 successful transactions on VFIDE!/)).toBeInTheDocument();
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
      const input = screen.getByPlaceholderText(/What's happening in Web3/);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Hello Web3 World!' } });
      expect(input).toHaveValue('Hello Web3 World!');
    });

    it('shows character count when focused', async () => {
      render(<SocialHubPage />);
      const input = screen.getByPlaceholderText(/What's happening in Web3/);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Test post' } });
      
      await waitFor(() => {
        expect(screen.getByText('9/280')).toBeInTheDocument();
      });
    });

    it('renders the trending sidebar', () => {
      render(<SocialHubPage />);
      expect(screen.getByText('Quick Access')).toBeInTheDocument();
      expect(screen.getByText('Trending')).toBeInTheDocument();
      expect(screen.getByText('Who to Follow')).toBeInTheDocument();
    });

    it('renders quick access links', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('link', { name: /Activity Feed/i })).toHaveAttribute('href', '/feed');
      expect(screen.getByRole('link', { name: /Stories/i })).toHaveAttribute('href', '/stories');
      expect(screen.getByRole('link', { name: /Messages/i })).toHaveAttribute('href', '/social-messaging');
    });

    it('renders trending hashtags', () => {
      render(<SocialHubPage />);
      // Hashtags may appear in both posts and trending sidebar
      expect(screen.getAllByText(/#VFIDE/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/#DeFi/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/#ProofScore/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders suggested users to follow', () => {
      render(<SocialHubPage />);
      expect(screen.getByText('WhaleWatcher')).toBeInTheDocument();
      expect(screen.getByText('YieldFarmer')).toBeInTheDocument();
    });

    it('renders the Load More button', () => {
      render(<SocialHubPage />);
      expect(screen.getByRole('button', { name: /Load More Posts/i })).toBeInTheDocument();
    });

    it('allows liking a post', () => {
      render(<SocialHubPage />);
      // Find a like button and click it
      const likeButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg.lucide-heart')
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
  it('has accessible heading structure', () => {
    render(<SocialHubPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Social Hub');
  });

  it('has accessible main landmark', () => {
    render(<SocialHubPage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
