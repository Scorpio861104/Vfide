import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderLockVaultPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/lock/page');
  const LockVaultPage = pageModule.default as React.ComponentType;
  return render(<LockVaultPage />);
};

jest.mock('framer-motion', () => ({
  __esModule: true,
  m: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LazyMotion: ({ children }: any) => <>{children}</>,
  domAnimation: {},
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => <span className={className}>icon</span>,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/vault/LockVaultPanel', () => ({
  LockVaultPanel: () => <div data-testid="lock-vault-panel">Lock panel</div>,
}));

jest.mock('@/components/error/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

describe('Vault lock route', () => {
  it('renders emergency lock heading and lock panel', () => {
    renderLockVaultPage();

    expect(screen.getByRole('heading', { name: /Lock My Vault/i })).toBeTruthy();
    expect(screen.getByText(/Emergency dashboard/i)).toBeTruthy();
    expect(screen.getByTestId('lock-vault-panel')).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
