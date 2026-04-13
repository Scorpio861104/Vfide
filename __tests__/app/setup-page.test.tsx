import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();

const renderSetupPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/setup/page');
  const SetupPage = pageModule.default as React.ComponentType;
  return render(<SetupPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
}));

describe('Setup page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    mockFetch.mockReset();
    mockFetch.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/users/')) {
        return new Response(
          JSON.stringify({
            user: {
              username: 'tester',
              display_name: 'Test User',
              bio: 'bio',
              avatar_url: '',
              is_verified: true,
              stats: {
                badge_count: 1,
                friend_count: 2,
                proposal_count: 3,
                endorsement_count: 4,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/user/state')) {
        return new Response(
          JSON.stringify({
            address: mockAccountState.address,
            proofScore: 780,
            isMerchant: true,
            badges: ['OG'],
            activeLoanCount: 1,
            unresolvedDefaults: 0,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/stats/protocol')) {
        return new Response(
          JSON.stringify({
            totalUsers: 1000,
            totalVolume: '100000',
            averageProofScore: 620,
            activeLenders: 50,
            activeLoans: 10,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/security/logs')) {
        return new Response(
          JSON.stringify({
            logs: [
              {
                id: '1',
                ts: new Date().toISOString(),
                type: 'login',
                severity: 'info',
                message: 'Wallet login',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });
  });

  it('shows wallet connect step when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: undefined as unknown as `0x${string}`,
    };

    renderSetupPage();

    expect(screen.getByRole('heading', { name: /Setup/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to manage your account/i)).toBeTruthy();
  });

  it('renders account tab profile editor when connected', async () => {
    renderSetupPage();

    expect(await screen.findByText(/Edit Profile/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeTruthy();
  });

  it('switches tabs and shows vault plus security sections', async () => {
    renderSetupPage();

    fireEvent.click(screen.getByRole('button', { name: /Vault/i }));
    expect(await screen.findByText(/Merchant Status/i)).toBeTruthy();
    expect(screen.getByText(/Network Overview/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Security/i }));

    await waitFor(() => {
      expect(screen.getByText(/Security Event Log/i)).toBeTruthy();
      expect(screen.getByText(/Wallet login/i)).toBeTruthy();
    });
  });
});