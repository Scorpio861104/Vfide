import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => k === 'tab' ? 'private' : null }),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/wallet',
  redirect: jest.fn(),
}));
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useBalance: () => ({ data: undefined }),
}));
jest.mock('@/components/crypto/VfideConnectButton', () => ({ VfideConnectButton: () => null }));
jest.mock('@/components/layout/Footer', () => ({ Footer: () => null }));
jest.mock('@/components/CrossChainTransfer', () => ({ __esModule: true, default: () => null }));

const renderPage = () => {
  const pageModule = require('../../app/wallet/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

describe('Stealth page (now /wallet?tab=private)', () => {
  it('renders the wallet hub with Private Pay tab present', () => {
    renderPage();
    // Wallet hub renders tab bar with at least one heading
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
    // Private Pay appears somewhere in the hub (tab bar or content)
    expect(screen.getAllByText(/Private Pay/i).length).toBeGreaterThan(0);
  });
});
