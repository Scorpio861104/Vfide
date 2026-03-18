import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockPush = jest.fn();

const renderExplorerPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/explorer/page');
  const ExplorerPage = pageModule.default as React.ComponentType;
  return render(<ExplorerPage />);
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Search: Icon,
    TrendingUp: Icon,
    Users: Icon,
    Activity: Icon,
    ArrowRight: Icon,
  };
});

describe('Explorer page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders stats and recent activity sections', () => {
    renderExplorerPage();

    expect(screen.getByRole('heading', { name: /VFIDE Explorer/i })).toBeTruthy();
    expect(screen.getByText(/Total Transactions/i)).toBeTruthy();
    expect(screen.getByText(/Active Addresses/i)).toBeTruthy();
    expect(screen.getAllByText(/Recent Activity/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Top Addresses/i })).toBeTruthy();
  });

  it('routes to address details when valid 42-char address is searched', async () => {
    renderExplorerPage();

    const validAddress = `0x${'a'.repeat(40)}`;
    const input = screen.getByPlaceholderText(/Search by address/i);
    fireEvent.change(input, { target: { value: validAddress } });

    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/explorer/${validAddress}`);
    });
  });

  it('does not route when search input is invalid', () => {
    renderExplorerPage();

    const input = screen.getByPlaceholderText(/Search by address/i);
    fireEvent.change(input, { target: { value: 'not-an-address' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(mockPush).not.toHaveBeenCalled();
  });
});