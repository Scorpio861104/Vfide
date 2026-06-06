import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderSplitterPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/splitter/page');
  const SplitterPage = pageModule.default as React.ComponentType;
  return render(<SplitterPage />);
};

jest.mock('wagmi', () => ({
  useWriteContract: () => ({ writeContractAsync: jest.fn(), isPending: false, data: undefined }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
  useReadContracts: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
}));

jest.mock('@/hooks/useContractAddresses', () => ({
  useContractAddresses: () => ({ LiquidityIncentives: '0x1111111111111111111111111111111111111111' }),
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: { VFIDEToken: '0x2222222222222222222222222222222222222222' },
  isConfiguredContractAddress: () => true,
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Splitter route', () => {
  it('renders revenue splitter shell', () => {
    renderSplitterPage();

    expect(screen.getByRole('heading', { name: /Revenue Splitter/i })).toBeTruthy();
    expect(screen.getByText(/Trigger payouts from a deployed splitter contract/i)).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
