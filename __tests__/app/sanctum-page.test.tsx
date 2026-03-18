import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const mockWriteContract = jest.fn();

const renderSanctumPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/sanctum/page');
  const SanctumPage = pageModule.default as React.ComponentType;
  return render(<SanctumPage />);
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

jest.mock('@/lib/validation', () => ({
  safeParseFloat: (value: string, fallback: number) => {
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

describe('Sanctum page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('renders sanctum header and overview sections', () => {
    renderSanctumPage();

    expect(screen.getByRole('heading', { name: /^The Sanctum$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /How The Sanctum Works/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Governance & Security/i })).toBeTruthy();
  });

  it('switches to charities tab and shows approved charity cards', () => {
    renderSanctumPage();

    fireEvent.click(screen.getByRole('button', { name: /Charities/i }));

    expect(screen.getByRole('heading', { name: /Approved Charities/i })).toBeTruthy();
    expect(screen.getByText(/Save the Children/i)).toBeTruthy();
    expect(screen.getByText(/DAO-verified organizations/i)).toBeTruthy();
  });

  it('gates disbursement proposal action when disconnected', () => {
    mockAccount = {
      isConnected: false,
      address: undefined as unknown as `0x${string}`,
    };

    renderSanctumPage();
    fireEvent.click(screen.getByRole('button', { name: /Disbursements/i }));

    expect(screen.getByRole('heading', { name: /Disbursement Proposals/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /\+ New Proposal/i })).toBeNull();
  });
});
