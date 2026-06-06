import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantProfileSetupPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/profile/setup/page');
  const MerchantProfileSetupPage = pageModule.default as React.ComponentType;
  return render(<MerchantProfileSetupPage />);
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/components/merchant/MerchantProfileWizard', () => ({
  MerchantProfileWizard: () => <div data-testid="merchant-profile-wizard">Wizard</div>,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span>icon</span>,
}));

describe('Merchant profile setup route', () => {
  it('renders setup wizard shell', () => {
    renderMerchantProfileSetupPage();

    expect(screen.getByText(/Back to Merchant Hub/i)).toBeTruthy();
    expect(screen.getByTestId('merchant-profile-wizard')).toBeTruthy();
  });
});
