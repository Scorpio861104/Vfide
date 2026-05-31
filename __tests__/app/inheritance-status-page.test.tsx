import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const ZERO = '0x0000000000000000000000000000000000000000';

const renderInheritanceStatusPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/inheritance/status/page');
  const InheritanceStatusPage = pageModule.default as React.ComponentType;
  return render(<InheritanceStatusPage />);
};

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/hooks/useInheritance', () => ({
  INHERITANCE_STATE_LABEL: {
    0: 'Normal',
    1: 'Veto period',
    2: 'Claim window',
    3: 'Memorial',
    4: 'Closed',
  },
  useInheritance: () => ({
    isLoading: false,
    state: 0,
    windowEnd: 0n,
    pendingConfig: null,
    heirs: [],
    configVersion: 0n,
    isWritePending: false,
    proofOfLifeWallet: ZERO,
    claim: null,
    heirCount: 0,
    confirmConfig: jest.fn(),
    cancelConfigChange: jest.fn(),
    clearAllHeirs: jest.fn(),
    setProofOfLife: jest.fn(),
    ownerOverride: jest.fn(),
    cleanupMemorial: jest.fn(),
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Inheritance status route', () => {
  it('renders status heading and setup CTA when no heirs are configured', () => {
    renderInheritanceStatusPage();

    expect(screen.getByRole('heading', { name: /Inheritance/i })).toBeTruthy();
    expect(screen.getByText(/No heirs configured/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Set up inheritance/i }).getAttribute('href')).toBe('/inheritance/setup');
  });
});
