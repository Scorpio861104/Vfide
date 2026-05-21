import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockPush = jest.fn();
const mockAnnounce = jest.fn();
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

let mockParams: Record<string, string> = {};

const renderInviteCodePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/invite/[code]/page');
  const InviteCodePage = pageModule.default as React.ComponentType;
  return render(<InviteCodePage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
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

jest.mock('@/lib/accessibility', () => ({
  useAnnounce: () => ({ announce: mockAnnounce }),
}));

jest.mock('@/lib/inviteLinks', () => ({
  formatExpirationTime: () => 'Never',
  formatUsageLimit: () => '0 / 10',
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    AlertCircle: Icon,
    Check: Icon,
    Clock: Icon,
    Loader2: Icon,
    Shield: Icon,
    Users: Icon,
    X: Icon,
  };
});

describe('Invite code route param guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    (global as any).fetch = mockFetch;
  });

  it('fails closed when the invite code route param is missing', async () => {
    renderInviteCodePage();

    expect(await screen.findByRole('heading', { name: /Invalid Invite/i })).toBeTruthy();
    expect(screen.getByText(/This invite link is expired or invalid/i)).toBeTruthy();

    await waitFor(() => {
      expect(mockAnnounce).not.toHaveBeenCalled();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});