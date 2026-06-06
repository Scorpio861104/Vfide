import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderFraudPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/fraud/page');
  const FraudPage = pageModule.default as React.ComponentType;
  return render(<FraudPage />);
};

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('../../app/fraud/components/LookupTab', () => ({ LookupTab: () => <div data-testid="lookup-tab">Lookup Tab</div> }));
jest.mock('../../app/fraud/components/ReportTab', () => ({ ReportTab: () => <div data-testid="report-tab">Report Tab</div> }));
jest.mock('../../app/fraud/components/MyEscrowsTab', () => ({ MyEscrowsTab: () => <div data-testid="escrows-tab">Escrows Tab</div> }));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Fraud route', () => {
  it('renders fraud reporting shell with default lookup tab', () => {
    renderFraudPage();

    expect(screen.getByRole('heading', { name: /Fraud Reporting/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Lookup/i })).toBeTruthy();
    expect(screen.getByTestId('lookup-tab')).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
