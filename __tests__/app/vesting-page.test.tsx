import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const mockWriteContract = jest.fn();

const renderVestingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vesting/page');
  const VestingPage = pageModule.default as React.ComponentType;
  return render(<VestingPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
  useReadContract: ({ functionName }: { functionName: string }) => {
    if (functionName === 'BENEFICIARY') {
      return { data: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
    }
    if (functionName === 'claimsPaused') {
      return { data: false };
    }
    if (functionName === 'getVestingStatus') {
      return { data: [5000000000000000000n, 1000000000000000000n, 500000000000000000n, 500000000000000000n, 6, 1893456000n, false] };
    }
    if (functionName === 'getVestingSchedule') {
      return { data: [
        { month: 1, percentage: 2, unlockTime: 1719878400n, unlocked: true },
        { month: 2, percentage: 2, unlockTime: 1725148800n, unlocked: false },
      ] };
    }
    return { data: undefined };
  },
  useWriteContract: () => ({ writeContract: mockWriteContract, data: undefined, isPending: false }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/lib/validation', () => ({
  safeBigIntToNumber: (value: bigint, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  },
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      if (key === 'button') {
        return ({ children, ...props }: any) => <button {...props}>{children}</button>;
      }
      return ({ children, ...props }: any) => <div {...props}>{children}</div>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Vesting page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('renders vesting header and overview progress state', () => {
    renderVestingPage();

    expect(screen.getByRole('heading', { name: /Token Vesting/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Vesting Progress/i })).toBeTruthy();
    expect(screen.getByText(/Current Milestone/i)).toBeTruthy();
  });

  it('switches to schedule tab and shows vesting table rows', () => {
    renderVestingPage();

    fireEvent.click(screen.getByRole('button', { name: /Vesting Schedule/i }));

    expect(screen.getByRole('heading', { name: /Vesting Schedule/i })).toBeTruthy();
    expect(screen.getByText(/Month 1/i)).toBeTruthy();
    expect(screen.getByText(/UNLOCKED/i)).toBeTruthy();
  });

  it('shows claim tab action for beneficiary wallet', () => {
    renderVestingPage();

    fireEvent.click(screen.getByRole('button', { name: /Claim Tokens/i }));

    expect(screen.getByText(/Available to Claim/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Claim Tokens/i })).toBeTruthy();
  });
});
