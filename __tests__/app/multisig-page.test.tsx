import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
};

const renderMultisigPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/multisig/page');
  const MultisigPage = pageModule.default as React.ComponentType;
  return render(<MultisigPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
}));

describe('Multisig page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0x1111111111111111111111111111111111111111',
    };
  });

  it('shows connect-state guard when wallet is disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0x1111111111111111111111111111111111111111',
    };

    renderMultisigPage();

    expect(screen.getByRole('heading', { name: /Multi-Signature Vault/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to manage multi-sig/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /New Transaction/i })).toBeNull();
  });

  it('renders signer and transaction summaries when connected', () => {
    renderMultisigPage();

    expect(screen.getByRole('button', { name: /New Transaction/i })).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2 of 3')).toBeTruthy();
    expect(screen.getByText(/Team expenses Q1/i)).toBeTruthy();
    expect(screen.getByText(/Contractor payment/i)).toBeTruthy();
    expect(screen.getByText(/\(1\/2\)/i)).toBeTruthy();
    expect(screen.getByText(/\(2\/2\)/i)).toBeTruthy();
  });

  it('shows action controls for pending transaction cards', () => {
    renderMultisigPage();

    fireEvent.click(screen.getByRole('button', { name: /New Transaction/i }));
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeTruthy();
  });
});