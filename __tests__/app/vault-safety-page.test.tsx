import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderVaultSafetyPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/safety/page');
  const VaultSafetyPage = pageModule.default as React.ComponentType;
  return render(<VaultSafetyPage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div data-testid="glass-card">{children}</div>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
}));

describe('Vault safety route', () => {
  it('renders key safety content and vault back-link', () => {
    renderVaultSafetyPage();

    expect(screen.getByRole('heading', { name: /How your vault is protected/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to your vault/i }).getAttribute('href')).toBe('/vault');
    expect(screen.getByText(/Recovery guardians/i)).toBeTruthy();
    expect(screen.getByText(/The veto window/i)).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
