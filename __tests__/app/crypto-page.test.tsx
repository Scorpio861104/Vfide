import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
  isConnected: true,
};

let mockBalance = {
  value: 1234500000000000000n,
  decimals: 18,
};

const renderCryptoPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/crypto/page');
  const CryptoPage = pageModule.default as React.ComponentType;
  return render(<CryptoPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
  useBalance: () => ({ data: mockBalance }),
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/crypto/TransactionHistory', () => ({
  TransactionHistory: ({ userId }: { userId: string }) => <div>Transaction History: {userId}</div>,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Crypto dashboard page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
    };
    mockBalance = {
      value: 1234500000000000000n,
      decimals: 18,
    };
  });

  it('renders wallet connect gate when disconnected', () => {
    mockAccount = {
      address: undefined as unknown as `0x${string}`,
      isConnected: false,
    };

    renderCryptoPage();

    expect(screen.getByRole('heading', { name: /Connect Your Wallet/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to access payments and transaction history/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });

  it('renders dashboard balances and transaction history when connected', () => {
    renderCryptoPage();

    expect(screen.getByRole('heading', { name: /Crypto Dashboard/i })).toBeTruthy();
    expect(screen.getByText(/Manage your wallet and payments/i)).toBeTruthy();
    expect(screen.getByText('1.2345')).toBeTruthy();
    expect(screen.getByText(/USD conversion unavailable/i)).toBeTruthy();
    expect(screen.getByText(/Transaction History: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/i)).toBeTruthy();
  });
});
