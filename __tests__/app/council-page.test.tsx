import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
  isConnected: true,
};

const mockWriteContract = jest.fn();

const renderCouncilPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/council/page');
  const CouncilPage = pageModule.default as React.ComponentType;
  return render(<CouncilPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
  useWriteContract: () => ({ writeContract: mockWriteContract, data: undefined, isPending: false }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
  useReadContract: () => ({ data: undefined }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Council page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
    };
  });

  it('renders council overview and responsibilities', async () => {
    renderCouncilPage();

    expect(screen.getByRole('heading', { name: /Council Management/i })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: /VFIDE Governance Council/i })).toBeTruthy();
    expect(await screen.findByText(/Council Responsibilities/i)).toBeTruthy();
  });

  it('switches to council members tab and shows roster entries', async () => {
    renderCouncilPage();

    fireEvent.click(screen.getByRole('button', { name: /Council Members/i }));

    expect(await screen.findByText(/Current Council Members/i)).toBeTruthy();
    expect(await screen.findByText(/Vacant Seat/i)).toBeTruthy();
  });

  it('shows voting connection prompt when disconnected', async () => {
    mockAccount = {
      address: undefined as unknown as `0x${string}`,
      isConnected: false,
    };

    renderCouncilPage();

    fireEvent.click(screen.getByRole('button', { name: /Member Voting/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Member Removal Voting/i })).toBeTruthy();
      expect(screen.getByText(/Connect wallet to vote/i)).toBeTruthy();
    });
  });
});
