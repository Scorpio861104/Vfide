import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111', isConnected: true }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Uploaded handoff pages', () => {
  it('renders the lending handoff page and its main CTA links', () => {
    const pageModule = require('../../app/lending/page');
    const LendingPage = pageModule.default as React.ComponentType;
    render(<LendingPage />);

    expect(screen.getByRole('heading', { name: /p2p lending/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /open flashlight simulator/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /view flash loans/i })).toBeTruthy();
  });

  it('renders the elections handoff page and governance links', () => {
    const pageModule = require('../../app/elections/page');
    const ElectionsPage = pageModule.default as React.ComponentType;
    render(<ElectionsPage />);

    expect(screen.getByRole('heading', { name: /council elections/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /open governance hub/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /view council overview/i })).toBeTruthy();
  });

  it('renders the disputes handoff page and resolution links', () => {
    const pageModule = require('../../app/disputes/page');
    const DisputesPage = pageModule.default as React.ComponentType;
    render(<DisputesPage />);

    expect(screen.getByRole('heading', { name: /disputes & mediation/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /open appeals center/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /merchant returns/i })).toBeTruthy();
  });
});
