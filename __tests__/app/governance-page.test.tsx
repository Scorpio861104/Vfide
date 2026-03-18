import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockWriteContract = jest.fn();
const mockPublicReadContract = jest.fn();

let mockAccountState: {
  address?: `0x${string}`;
  isConnected: boolean;
};

let mockProofScore = 250;

const renderGovernancePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/governance/page');
  const GovernancePage = pageModule.default as React.ComponentType;
  return render(<GovernancePage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useProofScore: () => ({ score: mockProofScore }),
  useDAOProposals: () => ({ proposalCount: 3 }),
}));

jest.mock('@/lib/abis', () => ({
  DAOABI: [],
  CouncilElectionABI: [],
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    DAO: '0x2222222222222222222222222222222222222222',
    CouncilElection: '0x1111111111111111111111111111111111111111',
  },
}));

jest.mock('@/lib/validation', () => ({
  sanitizeString: (value: string) => value,
}));

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyWithId: () => ({ copy: jest.fn(), copiedId: null }),
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
  useWriteContract: () => ({
    writeContract: mockWriteContract,
    writeContractAsync: jest.fn(),
    data: undefined,
  }),
  useWaitForTransactionReceipt: () => ({ isSuccess: false }),
  useReadContract: () => ({ data: [140n], isLoading: false, refetch: jest.fn() }),
  usePublicClient: () => ({
    readContract: mockPublicReadContract,
  }),
}));

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'button') {
          return ({ children, ...props }: any) => <button {...props}>{children}</button>;
        }
        if (prop === 'section') {
          return ({ children, ...props }: any) => <section {...props}>{children}</section>;
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
  return {
    X: Icon,
    Bell: Icon,
    Search: Icon,
    Vote: Icon,
    Users: Icon,
    Clock: Icon,
    ChevronRight: Icon,
    Sparkles: Icon,
    Crown: Icon,
    Lightbulb: Icon,
    MessageSquare: Icon,
    History: Icon,
    BarChart3: Icon,
    FileText: Icon,
    Plus: Icon,
  };
});

describe('Governance page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPublicReadContract.mockResolvedValue([
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // proposer
      0, // PARAMETER
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', // target
      0n, // value
      'Reduce Merchant Fee to 0.20%', // description
      0n, // startTime
      BigInt(Math.floor(Date.now() / 1000) + 86400), // endTime
      12450n, // forVotes
      5820n, // againstVotes
      false, // executed
      false, // queued
    ]);
    mockAccountState = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
    };
    mockProofScore = 250;
  });

  it('toggles notifications and clears the search input', async () => {
    renderGovernancePage();

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    expect(screen.getByText(/Urgent Notifications/i)).toBeTruthy();

    const searchInput = screen.getByPlaceholderText(/Search proposals/i);
    fireEvent.change(searchInput, { target: { value: 'security' } });

    const clearButton = screen.getAllByRole('button').find((button) => {
      const classes = button.getAttribute('class') || '';
      return classes.includes('absolute right-3 top-1/2');
    });
    expect(clearButton).toBeTruthy();

    fireEvent.click(clearButton as HTMLElement);
    await waitFor(() => {
      expect((screen.getByPlaceholderText(/Search proposals/i) as HTMLInputElement).value).toBe('');
    });
  });

  it('routes proposal vote actions to DAO vote contract call', async () => {
    renderGovernancePage();

    fireEvent.click(screen.getByRole('tab', { name: /Proposals/i }));
    const voteButtons = await screen.findAllByRole('button', { name: /Vote FOR/i });
    fireEvent.click(voteButtons[0]);

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'vote',
        args: [140n, true],
      })
    );
  });

  it('shows create-proposal wallet gate when user is disconnected', () => {
    mockAccountState = { address: undefined, isConnected: false };

    renderGovernancePage();

    fireEvent.click(screen.getByRole('tab', { name: /Create Proposal/i }));

    expect(screen.getByText(/Connect Wallet/i)).toBeTruthy();
    expect(screen.getByText(/You need to connect your wallet to create proposals/i)).toBeTruthy();
  });
});