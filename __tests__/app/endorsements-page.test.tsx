import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

let mockEndorsementData:
  | readonly [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly bigint[]]
  | undefined;
let mockEndorsementStats: readonly [bigint, bigint, bigint] | undefined;

const renderEndorsementsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/endorsements/page');
  const EndorsementsPage = pageModule.default as React.ComponentType;
  return render(<EndorsementsPage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
  useReadContract: ({ functionName }: { functionName: string }) => {
    if (functionName === 'getActiveEndorsements') {
      return { data: mockEndorsementData };
    }
    if (functionName === 'getEndorsementStats') {
      return { data: mockEndorsementStats };
    }
    return { data: undefined };
  },
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
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

jest.mock('date-fns', () => ({
  formatDistanceToNow: () => 'recently',
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/primitives', () => ({
  SurfaceCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  SectionHeading: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  ),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      if (key === 'a') {
        return ({ children, ...props }: any) => <a {...props}>{children}</a>;
      }
      return ({ children, ...props }: any) => <div {...props}>{children}</div>;
    },
  }),
}));

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  Calendar: ({ className }: { className?: string }) => <span className={className}>icon</span>,
});
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

describe('Endorsements page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    mockEndorsementData = [
      ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      [25n],
      [2000000000n],
      [1700000000n],
    ];
    mockEndorsementStats = [7n, 3n, 0n];
  });

  it('renders endorsements header, wallet banner, and stats', () => {
    renderEndorsementsPage();

    expect(screen.getByRole('heading', { name: /^Endorsements$/i, level: 2 })).toBeTruthy();
    expect(screen.getByText(/Network of trust and reputation/i)).toBeTruthy();
    expect(screen.getByText(/You are logged in as/i)).toBeTruthy();
    expect(screen.getByText(/Total Endorsements/i)).toBeTruthy();
    expect(screen.getByText(/Active Endorsements/i)).toBeTruthy();
  });

  it('renders recent endorsement card details when data exists', () => {
    renderEndorsementsPage();

    expect(screen.getByRole('heading', { name: /Recent Endorsements/i })).toBeTruthy();
    expect(screen.getByText(/Weight \+25/i)).toBeTruthy();
    expect(screen.getByText(/Issued recently/i)).toBeTruthy();
    expect(screen.getByText(/Expires recently/i)).toBeTruthy();
  });

  it('shows empty-state hint when disconnected with no active endorsements', () => {
    mockAccount = {
      address: undefined as unknown as `0x${string}`,
    };
    mockEndorsementData = undefined;
    mockEndorsementStats = undefined;

    renderEndorsementsPage();

    expect(screen.getByText(/No active endorsements yet/i)).toBeTruthy();
    expect(screen.queryByText(/You are logged in as/i)).toBeNull();
  });
});
