import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantStaffPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/staff/page');
  const MerchantStaffPage = pageModule.default as React.ComponentType;
  return render(<MerchantStaffPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qrcode">QR</div>,
}));

jest.mock('@/components/staff', () => ({
  StaffManager: () => <div data-testid="staff-manager">StaffManager</div>,
}));

jest.mock('@/lib/merchantStaff', () => ({
  buildStaffPermissionsForRole: () => ({
    canViewSales: true,
    canInitiateRefunds: false,
    canManageInventory: false,
    maxSaleAmount: 0,
    dailySaleLimit: 0,
  }),
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

describe('Merchant staff route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantStaffPage();

    expect(screen.getByRole('heading', { name: /Delegate POS access safely/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to manage staff sessions/i)).toBeTruthy();
  });
});
