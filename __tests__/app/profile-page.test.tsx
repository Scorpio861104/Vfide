import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/me',
  redirect: jest.fn(),
}));
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useChainId: () => 1,
  useBalance: () => ({ data: undefined }),
  useReadContract: () => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }),
  useWriteContract: () => ({ writeContract: jest.fn(), isPending: false }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
  usePublicClient: () => null,
  useWalletClient: () => ({ data: null }),
}));
jest.mock('@/components/layout/Footer', () => ({ Footer: () => null }));
jest.mock('@/components/crypto/VfideConnectButton', () => ({ VfideConnectButton: () => null }));
jest.mock('@/hooks/useProofScore', () => ({
  useProofScore: () => ({ score: null, isLoading: false, tier: null }),
}));

const renderPage = () => {
  const pageModule = require('../../app/me/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

describe('Profile page (now /me hub)', () => {
  it('renders the Me hub with Your VFIDE heading', () => {
    renderPage();
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Your VFIDE/i).length).toBeGreaterThan(0);
  });
});
