import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantCustomersPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/customers/page');
  const MerchantCustomersPage = pageModule.default as React.ComponentType;
  return render(<MerchantCustomersPage />);
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

jest.mock('@/components/customers/CustomerManager', () => ({
  CustomerManager: () => <div data-testid="customer-manager">CustomerManager</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return { Users: Icon, ArrowLeft: Icon };
});

describe('Merchant customers route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantCustomersPage();

    expect(screen.getByRole('heading', { name: /Know your repeat buyers/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to view customer insights/i)).toBeTruthy();
  });
});
