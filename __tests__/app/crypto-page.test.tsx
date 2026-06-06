import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => k === 'tab' ? 'overview' : null }),
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

describe('Crypto page (now /wallet hub)', () => {
  it('renders wallet hub overview with non-custodial disclaimer', () => {
    renderPage();
    expect(screen.getByText(/Non-custodial by design/i)).toBeTruthy();
    expect(screen.getByText(/Activity/i)).toBeTruthy();
  });
});
