import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderTokenLaunchPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/token-launch/page');
  const TokenLaunchPage = pageModule.default as React.ComponentType;
  return render(<TokenLaunchPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Token launch page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders launch hero copy and destination links', () => {
    renderTokenLaunchPage();

    expect(screen.getByRole('heading', { name: /VFIDE Token Launch/i })).toBeTruthy();
    expect(screen.getByText(/token is now available through the treasury/i)).toBeTruthy();
    expect(screen.getByText(/acquire VFIDE and start building your on-chain reputation/i)).toBeTruthy();

    const openVault = screen.getByRole('link', { name: /Open Vault/i });
    const backHome = screen.getByRole('link', { name: /Back to Home/i });
    expect(openVault.getAttribute('href')).toBe('/vault');
    expect(backHome.getAttribute('href')).toBe('/');
  });

  it('renders layout footer and launch icon', () => {
    renderTokenLaunchPage();

    expect(screen.getByText('⚡')).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
