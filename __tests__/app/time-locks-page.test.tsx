import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const renderTimeLocksPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/time-locks/page');
  const TimeLocksPage = pageModule.default as React.ComponentType;
  return render(<TimeLocksPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
}));

describe('Time locks page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('shows wallet connect guard when disconnected', () => {
    mockAccount = {
      isConnected: false,
      address: undefined as unknown as `0x${string}`,
    };

    renderTimeLocksPage();

    expect(screen.getByRole('heading', { name: /Time Locks/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to manage time-locked transfers/i)).toBeTruthy();
  });

  it('renders connected security tiers and pending transfer section', () => {
    renderTimeLocksPage();

    expect(screen.getByRole('heading', { name: /Time-Locked Transfers/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Security Tiers/i })).toBeTruthy();
    expect(screen.getByText(/Pending Transfers/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Whitelisted Addresses/i })).toBeTruthy();
  });

  it('shows empty pending transfers state', async () => {
    renderTimeLocksPage();

    // No time-locked transfers are populated (timeLocks state is empty)
    expect(screen.getByText(/No pending time-locked transfers/i)).toBeTruthy();
  });
});
