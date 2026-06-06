import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantInstallmentsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/installments/page');
  const MerchantInstallmentsPage = pageModule.default as React.ComponentType;
  return render(<MerchantInstallmentsPage />);
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

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant installments route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantInstallmentsPage();

    expect(screen.getByRole('heading', { name: /Installments & payment plans/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to review installment plans/i)).toBeTruthy();
  });
});
