import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderSanctumCharityPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/sanctum/charities/[id]/page');
  const SanctumCharityPage = pageModule.default as React.ComponentType;
  return render(<SanctumCharityPage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'invalid-charity-id' }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/hooks/useSanctumVault', () => ({
  useSanctumVault: () => ({
    configured: true,
    approvalsRequired: 2,
    useCharityByAddress: () => ({ data: null, isLoading: false, isError: false }),
    disbursements: [],
    disbursementsLoading: false,
  }),
  deriveDisbursementStatus: () => 'pending',
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('viem', () => ({
  formatEther: () => '0',
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Sanctum charity id route', () => {
  it('renders invalid-address guard state', () => {
    renderSanctumCharityPage();

    expect(screen.getByText(/Invalid charity address/i)).toBeTruthy();
    expect(screen.getByText(/is not a valid Ethereum address/i)).toBeTruthy();
  });
});
