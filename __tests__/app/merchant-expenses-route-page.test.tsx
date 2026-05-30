import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantExpensesPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/expenses/page');
  const MerchantExpensesPage = pageModule.default as React.ComponentType;
  return render(<MerchantExpensesPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/components/bookkeeping/BusinessBooks', () => ({
  BusinessBooks: () => <div data-testid="business-books">BusinessBooks</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    ArrowLeft: Icon,
    ReceiptText: Icon,
    TrendingDown: Icon,
    TrendingUp: Icon,
    Wallet: Icon,
  };
});

describe('Merchant expenses route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantExpensesPage();

    expect(screen.getByRole('heading', { name: /Keep your books current from the merchant hub/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to manage expenses and profit tracking/i)).toBeTruthy();
  });
});
