import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderRemittancePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/remittance/page');
  const RemittancePage = pageModule.default as React.ComponentType;
  return render(<RemittancePage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: false }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/components/remittance/BeneficiaryManager', () => ({
  BeneficiaryManager: () => <div data-testid="beneficiary-manager">Beneficiaries</div>,
}));

jest.mock('@/components/feedback/FutureReleaseBanner', () => ({
  FutureReleaseBanner: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Remittance route', () => {
  it('renders disconnected remittance shell', () => {
    renderRemittancePage();

    expect(screen.getByRole('heading', { name: /Send money home with transparent fees/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to finalize remittance sends/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
    expect(screen.getByTestId('beneficiary-manager')).toBeTruthy();
  });
});
