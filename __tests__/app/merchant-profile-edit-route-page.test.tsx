import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantProfileEditPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/profile/edit/page');
  const MerchantProfileEditPage = pageModule.default as React.ComponentType;
  return render(<MerchantProfileEditPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/hooks/useVaultIdentity', () => ({
  useVaultIdentity: () => ({ identity: null }),
}));

jest.mock('@/hooks/useMerchantProfile', () => ({
  useMerchantProfile: () => ({ currentMetaHash: null, registrationStatus: 'none' }),
}));

jest.mock('@/components/merchant/MerchantProfileWizard', () => ({
  MerchantProfileWizard: () => <div data-testid="merchant-profile-wizard">Wizard</div>,
}));

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: any) => <div>{children}</div>,
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

describe('Merchant profile edit route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantProfileEditPage();

    expect(screen.getByText(/Connect your wallet to edit your merchant profile/i)).toBeTruthy();
  });
});
