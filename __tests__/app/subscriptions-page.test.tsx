import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const renderSubscriptionsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/subscriptions/page');
  const SubscriptionsPage = pageModule.default as React.ComponentType;
  return render(<SubscriptionsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
  useWriteContract: () => ({ writeContract: jest.fn(), data: undefined, isPending: false }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
  useReadContract: () => ({ data: [] }),
}));

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

describe('Subscriptions page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('renders subscription manager header and empty active state', () => {
    renderSubscriptionsPage();

    expect(screen.getByRole('heading', { name: /Subscription Manager/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Active Subscriptions/i, level: 2 })).toBeTruthy();
    expect(screen.getByText(/No Active Subscriptions/i)).toBeTruthy();
  });

  it('shows disconnected wallet prompt in empty subscriptions section', () => {
    mockAccount = {
      isConnected: false,
      address: undefined as unknown as `0x${string}`,
    };

    renderSubscriptionsPage();

    expect(screen.getByText(/Connect your wallet to view and manage your subscriptions/i)).toBeTruthy();
  });

  it('renders create form and recurring flow explanation blocks', () => {
    renderSubscriptionsPage();

    expect(screen.getByRole('heading', { name: /Create New Subscription/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create Subscription/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /How Subscriptions Work/i })).toBeTruthy();
    expect(screen.getByText(/Set & Forget/i)).toBeTruthy();
  });
});
