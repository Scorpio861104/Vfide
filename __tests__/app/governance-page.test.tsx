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

  it('renders governance tab shell with proposals as default', async () => {
    renderGovernancePage();

    expect(screen.getByText(/Governance/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Proposals$/i })).toBeTruthy();
    expect(screen.getAllByText(/Active Proposals/i).length).toBeGreaterThan(0);
  });

  it('switches to create tab and shows wallet gate when disconnected', async () => {
    mockAccountState = { address: undefined, isConnected: false };
    renderGovernancePage();

    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));

    expect(screen.getByText(/Connect your wallet/i)).toBeTruthy();
    expect(screen.getByText(/submit a governance proposal/i)).toBeTruthy();
  });
});