import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantReturnsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/returns/page');
  const MerchantReturnsPage = pageModule.default as React.ComponentType;
  return render(<MerchantReturnsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({
    locale: 'en',
    formatCurrency: (value: number | string) => `$${value}`,
    formatDate: () => 'Date',
  }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/components/identity/VaultIdentityChip', () => ({
  VaultIdentityChip: ({ address }: { address: string }) => <span>{address}</span>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant returns route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantReturnsPage();

    expect(screen.getByRole('heading', { name: /Returns & exchanges/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to review return requests/i)).toBeTruthy();
  });
});
