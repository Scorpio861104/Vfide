import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderVerifierPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/verifier/page');
  const VerifierPage = pageModule.default as React.ComponentType;
  return render(<VerifierPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useReadContract: () => ({ data: undefined, isLoading: false, refetch: jest.fn() }),
}));

jest.mock('@/hooks/useVerifierVote', () => ({
  useVerifierVote: () => ({
    isTrustedVerifier: false,
    hasVoted: false,
    vote: jest.fn(),
    isWritePending: false,
    isConfirming: false,
    isConfirmed: false,
    writeError: null,
    refetchVoted: jest.fn(),
  }),
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: { VaultRecoveryClaim: '0x1111111111111111111111111111111111111111' },
  isConfiguredContractAddress: () => true,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => <button>Connect Wallet</button>,
}));

describe('Verifier route page', () => {
  it('renders verifier console and disconnected wallet prompt', () => {
    renderVerifierPage();

    expect(screen.getByRole('heading', { name: /Verifier Console/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to access the verifier console/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });
});
