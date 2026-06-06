import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantTipsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/tips/page');
  const MerchantTipsPage = pageModule.default as React.ComponentType;
  return render(<MerchantTipsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant tips route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantTipsPage();

    expect(screen.getByRole('heading', { name: /Accept tips at checkout/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to configure tips/i)).toBeTruthy();
  });
});
