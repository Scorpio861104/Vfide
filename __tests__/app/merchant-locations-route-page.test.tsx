import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantLocationsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/locations/page');
  const MerchantLocationsPage = pageModule.default as React.ComponentType;
  return render(<MerchantLocationsPage />);
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

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant locations route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantLocationsPage();

    expect(screen.getByRole('heading', { name: /Store locations/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to manage locations/i)).toBeTruthy();
  });
});
