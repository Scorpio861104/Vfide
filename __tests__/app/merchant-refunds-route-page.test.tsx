import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantRefundsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/refunds/page');
  const MerchantRefundsPage = pageModule.default as React.ComponentType;
  return render(<MerchantRefundsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/hooks/useRefundHistory', () => ({
  useRefundHistory: () => ({ entries: [], isLoading: false, error: null, refetch: jest.fn() }),
  rememberRefundId: jest.fn(),
}));

jest.mock('@/hooks/useMerchantPayments', () => ({
  useMerchantPayments: () => ({ initiateRefund: jest.fn(), completeRefund: jest.fn(), isWritePending: false }),
}));

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: { VFIDEToken: '0x0000000000000000000000000000000000000000' },
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('viem', () => ({
  parseEther: () => 0n,
  formatEther: () => '0',
  isAddress: () => true,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant refunds route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantRefundsPage();

    expect(screen.getByRole('heading', { name: /Refunds/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to view your refund history/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });
});
