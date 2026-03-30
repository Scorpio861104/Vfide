import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

let mockContracts = {
  CouncilElection: '0x1111111111111111111111111111111111111111',
};

let mockReadResponses = {
  isCouncilMember: true,
  canServeNextTerm: [true, 2, BigInt(Math.floor(Date.now() / 1000) + 86400)] as [boolean, number, bigint],
};

const renderDaoHubPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/dao-hub/page');
  const DaoHubPage = pageModule.default as React.ComponentType;
  return render(<DaoHubPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
  useReadContract: ({ functionName }: { functionName: string }) => {
    if (functionName === 'isCouncil') {
      return { data: mockReadResponses.isCouncilMember };
    }
    if (functionName === 'canServeNextTerm') {
      return { data: mockReadResponses.canServeNextTerm };
    }
    return { data: undefined };
  },
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: mockContracts,
}));

jest.mock('@/lib/abis', () => ({
  CouncilElectionABI: [],
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useProofScore: () => ({ score: 7800 }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('DAO Hub page access pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    mockContracts = {
      CouncilElection: '0x1111111111111111111111111111111111111111',
    };
    mockReadResponses = {
      isCouncilMember: true,
      canServeNextTerm: [true, 2, BigInt(Math.floor(Date.now() / 1000) + 86400)],
    };
  });

  it('shows DAO access warning when wallet is disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    renderDaoHubPage();

    expect(screen.getByRole('heading', { name: /DAO Operations Hub/i })).toBeTruthy();
    expect(screen.getByText(/Connect a wallet linked to an active DAO term/i)).toBeTruthy();
  });

  it('shows locked-mode warning when user is not an active DAO member', () => {
    mockReadResponses = {
      ...mockReadResponses,
      isCouncilMember: false,
    };

    renderDaoHubPage();

    expect(screen.getByText(/term has ended or you are no longer an active member/i)).toBeTruthy();
    expect(screen.getByText(/Access Locked/i)).toBeTruthy();
  });

  it('renders member queues when active DAO member is verified', () => {
    renderDaoHubPage();

    expect(screen.getByText(/Access Active/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Active Disputes/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Proposal Pipeline/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /DAO Messages/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /DAO Payment Queue/i })).toBeTruthy();
  });
});