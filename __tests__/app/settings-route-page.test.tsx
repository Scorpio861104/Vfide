import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderSettingsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/settings/page');
  const SettingsPage = pageModule.default as React.ComponentType;
  return render(<SettingsPage />);
};

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/app/setup/components/AccountTab', () => ({
  AccountTab: () => <div data-testid="account-tab">Account Tab</div>,
}));

jest.mock('@/app/setup/components/VaultTab', () => ({
  VaultTab: () => <div data-testid="vault-tab">Vault Tab</div>,
}));

jest.mock('@/app/setup/components/SecurityTab', () => ({
  SecurityTab: () => <div data-testid="security-tab">Security Tab</div>,
}));

jest.mock('../../app/settings/components/NotificationsTabInline', () => ({
  NotificationsTabInline: () => <div data-testid="notifications-tab">Notifications Tab</div>,
}));

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

describe('Settings route page', () => {
  it('renders settings shell and default account tab panel', () => {
    renderSettingsPage();

    expect(screen.getByRole('heading', { name: /Settings/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Account/i })).toBeTruthy();
    expect(screen.getByTestId('account-tab')).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
