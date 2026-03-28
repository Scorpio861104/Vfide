import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();

const renderStoriesPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/stories/page');
  const StoriesPage = pageModule.default as React.ComponentType;
  return render(<StoriesPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
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

jest.mock('@/components/social/StoryViewer', () => ({
  StoryViewer: () => <div>Story Viewer Component</div>,
}));

jest.mock('@/components/social/StoryCreator', () => ({
  StoryCreator: ({ onCreate }: { onCreate: (story: any) => void }) => (
    <div>
      Story Creator Component
      <button
        onClick={() =>
          onCreate({
            id: 'mine-1',
            userId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            userName: 'You',
            userAvatar: '✨',
            type: 'text',
            content: 'My first story',
            backgroundColor: 'linear-gradient(#000,#111)',
            textColor: '#fff',
            createdAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            viewedBy: [],
            reactions: [],
          })
        }
      >
        Create Mock Story
      </button>
    </div>
  ),
}));

jest.mock('@/components/social/StoryRing', () => ({
  StoryRing: ({ userName }: { userName: string }) => <div>Story Ring {userName}</div>,
}));

jest.mock('@/lib/storiesSystem', () => ({
  isStoryExpired: () => false,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/error/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => ({
  Plus: ({ className }: { className?: string }) => <span className={className}>icon</span>,
  Camera: ({ className }: { className?: string }) => <span className={className}>icon</span>,
}));

describe('Stories page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ stories: [] }), {
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

  it('shows wallet connect state when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    renderStoriesPage();

    expect(screen.getByRole('heading', { name: /Connect Your Wallet/i })).toBeTruthy();
    expect(screen.getByText(/view and share stories/i)).toBeTruthy();
  });

  it('renders connected stories hub and empty-state CTA', async () => {
    renderStoriesPage();

    expect(screen.getByRole('heading', { name: /^Stories$/i })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(/No Stories Yet/i)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /Create Your First Story/i })).toBeTruthy();
  });

  it('opens story creator and appends a newly created personal story ring', async () => {
    renderStoriesPage();

    fireEvent.click(screen.getByText(/Add Story/i));
    expect(await screen.findByText(/Story Creator Component/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Create Mock Story/i }));

    await waitFor(() => {
      expect(screen.getByText(/Story Ring Your Story/i)).toBeTruthy();
    });
  });
});