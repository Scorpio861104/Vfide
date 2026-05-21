import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockIsConnected = true;
let mockAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();

const renderSocialHubPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/social-hub/page');
  const SocialHubPage = pageModule.default as React.ComponentType;
  return render(<SocialHubPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: mockIsConnected,
    address: mockAddress,
  }),
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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
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

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'button') {
          return ({ children, ...props }: any) => <button {...props}>{children}</button>;
        }
        if (prop === 'article') {
          return ({ children, ...props }: any) => <article {...props}>{children}</article>;
        }
        if (prop === 'main') {
          return ({ children, ...props }: any) => <main {...props}>{children}</main>;
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
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Social hub page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConnected = true;
    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    mockFetch.mockReset();
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/community/posts') {
        return new Response(
          JSON.stringify({
            posts: [
              {
                id: 'p-1',
                author: {
                  address: '0xPost...User',
                  name: 'Poster',
                  avatar: '🧪',
                  verified: true,
                  proofScore: 90,
                },
                content: 'Community update post',
                timestamp: Date.now() - 60000,
                likes: 3,
                comments: 1,
                shares: 0,
                views: 10,
                liked: false,
                bookmarked: false,
                isFollowing: true,
                tags: ['Update'],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ stories: [], topics: [], users: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });
  });

  it('shows connect-wallet gate when disconnected', () => {
    mockIsConnected = false;
    mockAddress = undefined;

    renderSocialHubPage();

    expect(screen.getByRole('heading', { name: /Connect to Join the Conversation/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });

  it('renders connected hub with stories, post composer, and fetched post', async () => {
    renderSocialHubPage();

    expect(screen.getByRole('heading', { name: /Social Hub/i })).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByRole('button', { name: /all/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /following/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /trending/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Community update post/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /following/i }));
    fireEvent.click(screen.getByRole('button', { name: /trending/i }));
    fireEvent.click(screen.getByRole('button', { name: /all/i }));

    expect(screen.getByRole('button', { name: /Load More Posts/i })).toBeTruthy();
  });
});