import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantCouponsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/coupons/page');
  const MerchantCouponsPage = pageModule.default as React.ComponentType;
  return render(<MerchantCouponsPage />);
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

jest.mock('@/components/discounts', () => ({
  DiscountManager: () => <div data-testid="discount-manager">DiscountManager</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return { Tag: Icon, ArrowLeft: Icon };
});

describe('Merchant coupons route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantCouponsPage();

    expect(screen.getByRole('heading', { name: /Create merchant promo codes/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to manage coupon campaigns/i)).toBeTruthy();
  });
});
