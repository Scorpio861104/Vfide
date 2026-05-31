import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantLoyaltyPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/loyalty/page');
  const MerchantLoyaltyPage = pageModule.default as React.ComponentType;
  return render(<MerchantLoyaltyPage />);
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

jest.mock('@/components/loyalty/LoyaltyProgram', () => ({
  LoyaltyProgram: () => <div data-testid="loyalty-program">LoyaltyProgram</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return { ArrowLeft: Icon, Heart: Icon };
});

describe('Merchant loyalty route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantLoyaltyPage();

    expect(screen.getByRole('heading', { name: /Bring buyers back with simple rewards/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to configure loyalty rewards/i)).toBeTruthy();
  });
});
