import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockParams = { id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
let mockAccountAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const mockCopy = jest.fn();

const renderExplorerIdPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/explorer/[id]/page');
  const ExplorerIdPage = pageModule.default as React.ComponentType;
  return render(<ExplorerIdPage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn() })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAccountAddress,
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

jest.mock('@/lib/vfide-hooks', () => ({
  useProofScore: () => ({
    score: 8200,
    tier: 'GOLD',
    canVote: true,
    canMerchant: true,
    isLoading: false,
  }),
}));

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copied: false,
    copy: mockCopy,
  }),
}));

jest.mock('@/components/trust/ProofScoreVisualizer', () => ({
  ProofScoreVisualizer: ({ address }: { address: string }) => <div>ProofScore Visualizer {address}</div>,
}));

jest.mock('@/components/badge/BadgeGallery', () => ({
  BadgeGallery: ({ address }: { address: string }) => <div>Badge Gallery {address}</div>,
}));

jest.mock('@/components/trust/EndorsementStats', () => ({
  EndorsementStats: ({ address }: { address: string }) => <div>Endorsement Stats {address}</div>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    ArrowLeft: Icon,
    Copy: Icon,
    CheckCircle: Icon,
    AlertCircle: Icon,
  };
});

describe('Explorer address detail page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
    mockAccountAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  });

  it('renders invalid-address state when route id is malformed', () => {
    mockParams = { id: 'bad-address' };

    renderExplorerIdPage();

    expect(screen.getByRole('heading', { name: /Invalid Address/i })).toBeTruthy();
    expect(screen.getByText(/address format is not valid/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to Leaderboard/i }).getAttribute('href')).toBe('/leaderboard');
  });

  it('renders self-profile trust data and supports address copy', () => {
    renderExplorerIdPage();

    expect(screen.getByRole('heading', { name: /User Profile/i })).toBeTruthy();
    expect(screen.getByText(/This is your profile/i)).toBeTruthy();
    expect(screen.getByText(/Trust Tier:/i)).toBeTruthy();
    expect(screen.getByText(/GOLD/i)).toBeTruthy();

    fireEvent.click(screen.getByTitle('Copy address'));
    expect(mockCopy).toHaveBeenCalledWith('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('shows actions section when viewing another wallet profile', () => {
    mockParams = { id: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' };
    mockAccountAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    renderExplorerIdPage();

    expect(screen.getByRole('heading', { name: /Actions/i })).toBeTruthy();
    expect(screen.queryByText(/This is your profile/i)).toBeNull();
  });
});