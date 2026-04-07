import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockIsConnected = true;
let mockAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const renderFeedPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/feed/page');
  const FeedPage = pageModule.default as React.ComponentType;
  return render(<FeedPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: mockIsConnected,
    address: mockAddress,
  }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'button') {
          return ({ children, ...props }: any) => <button {...props}>{children}</button>;
        }
        return ({ children, ...props }: any) => <div {...props}>{children}</div>;
      },
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span aria-hidden="true" className={className} />;
  return new Proxy({}, { get: () => Icon });
});

jest.mock('@/components/social/TrustEventCard', () => ({
  TrustEventCard: ({ event }: { event: { id: string } }) => <div>Trust Event {event.id}</div>,
}));

jest.mock('@/components/social/MarketStory', () => ({
  MarketStory: ({ story }: { story: { id: string } }) => <div>Story {story.id}</div>,
  MarketStoriesRow: () => <div>Market Stories Row</div>,
}));

jest.mock('@/components/social/MerchantReview', () => ({
  CommunityBoard: () => <div>Community Board Content</div>,
}));

jest.mock('@/components/social/Reactions', () => ({
  ReactionsBar: () => <div>Reactions Bar</div>,
}));

jest.mock('@/lib/data/seed', () => ({
  generateSeedTrustEvents: () => [{
    id: 'evt-1',
    type: 'milestone',
    actor: { address: '0x1', name: 'Tester', proofScore: 8200 },
    data: { score: 8200 },
    timestamp: Date.now(),
  }],
  generateSeedStories: () => [{ id: 'story-1' }],
  SEED_TRENDING_MERCHANTS: [{
    address: '0xmerchant',
    name: 'Merchant One',
    proofScore: 8100,
    sales7d: 12,
    salesGrowth: 18,
    endorsements7d: 4,
  }],
  SEED_TRENDING_PRODUCTS: [{
    id: 'prod-1',
    name: 'Fresh Produce',
    merchant: 'Merchant One',
    merchantAddress: '0xmerchant',
    price: 12,
    currency: '$',
    purchases7d: 7,
  }],
  useSeedData: <T,>(_fetcher: () => Promise<T>, seed: T) => ({ data: seed, loading: false }),
}));

describe('Feed page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConnected = true;
    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  });

  it('shows the community gate when wallet is disconnected', () => {
    mockIsConnected = false;
    mockAddress = undefined;
    renderFeedPage();

    expect(screen.getByText(/Connect wallet to see the community/i)).toBeTruthy();
    expect(screen.queryByTestId('footer')).toBeNull();
  });

  it('renders the updated community feed when connected', () => {
    renderFeedPage();

    expect(screen.getByRole('button', { name: /^All$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Trust$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Market$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Social$/i })).toBeTruthy();
    expect(screen.getByText(/Market Stories Row/i)).toBeTruthy();
    expect(screen.getByText(/Trust Event evt-1/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Toggle community board/i }));
    expect(screen.getByText(/Community Board Content/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Compose post/i }));
    expect(screen.getByPlaceholderText(/What's happening at the market today\?/i)).toBeTruthy();
  });
});