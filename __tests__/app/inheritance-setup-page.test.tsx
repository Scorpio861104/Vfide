import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderInheritanceSetupPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/inheritance/setup/page');
  const InheritanceSetupPage = pageModule.default as React.ComponentType;
  return render(<InheritanceSetupPage />);
};

jest.mock('wagmi', () => ({
  useChainId: () => 8453,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/hooks/useVaultHooks', () => ({
  useUserVault: () => ({
    vaultAddress: '0x1111111111111111111111111111111111111111',
  }),
}));

jest.mock('@/hooks/useGuardians', () => ({
  useGuardians: () => ({
    isLoading: false,
    guardians: [{ address: '0x2222222222222222222222222222222222222222' }],
  }),
}));

jest.mock('@/hooks/useInheritance', () => ({
  useInheritance: () => ({
    heirCount: 0,
    pendingConfig: null,
    configVersion: 0n,
    isWritePending: false,
    generateHeirSecret: () => `0x${'a'.repeat(64)}`,
    computeHeirCommitment: () => `0x${'b'.repeat(64)}`,
    proposeConfig: jest.fn(),
    cancelConfigChange: jest.fn(),
  }),
}));

jest.mock('framer-motion', () => ({
  __esModule: true,
  m: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
  motion: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
  LazyMotion: ({ children }: any) => <>{children}</>,
  AnimatePresence: ({ children }: any) => <>{children}</>,
  domAnimation: {},
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Inheritance setup route', () => {
  it('renders setup wizard heading and first-step controls', () => {
    renderInheritanceSetupPage();

    expect(screen.getByRole('heading', { name: /Inheritance setup/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Who are your heirs\?/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add another heir/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
  });
});
