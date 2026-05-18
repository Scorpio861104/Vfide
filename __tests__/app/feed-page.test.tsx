import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockIsConnected = true;

const renderFeedPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/feed/page');
  const FeedPage = pageModule.default as React.ComponentType;
  return render(<FeedPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: mockIsConnected }),
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/social/SocialFeed', () => ({
  SocialFeed: () => <div>Social Feed Component</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('lucide-react', () => ({
  ArrowRight: ({ className }: { className?: string }) => <span className={className}>icon</span>,
}));

describe('Feed page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConnected = true;
  });

  it('shows connect state when wallet is disconnected', () => {
    mockIsConnected = false;
    renderFeedPage();

    expect(screen.getByRole('heading', { name: /Activity Feed/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to view the feed/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });

  it('renders social feed and social hub link when connected', () => {
    renderFeedPage();

    expect(screen.getByRole('link', { name: /Go to full Social Hub/i }).getAttribute('href')).toBe('/social-hub');
    expect(screen.getByText('Social Feed Component')).toBeTruthy();
  });
});