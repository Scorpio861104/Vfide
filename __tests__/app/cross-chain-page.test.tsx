import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => k === 'tab' ? 'cross-chain' : null }),
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
jest.mock('@/components/CrossChainTransfer', () => ({ __esModule: true, default: () => <div>Cross Chain Transfer Widget</div> }));

const renderPage = () => {
  const pageModule = require('../../app/wallet/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

describe('Cross-chain page (now /wallet?tab=cross-chain)', () => {
  it('renders the wallet hub with Cross-Chain tab present', () => {
    renderPage();
    expect(screen.getAllByText(/Cross-Chain/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
  });
});
