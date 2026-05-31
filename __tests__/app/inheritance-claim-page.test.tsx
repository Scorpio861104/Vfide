import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderInheritanceClaimPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/inheritance/claim/page');
  const InheritanceClaimPage = pageModule.default as React.ComponentType;
  return render(<InheritanceClaimPage />);
};

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
  useChainId: () => 8453,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/hooks/useInheritanceClaim', () => ({
  useInheritanceClaim: () => ({
    isLoading: false,
    isValidVault: true,
    amHeir: false,
    state: 0,
    windowEnd: 0n,
    haveRevealed: false,
    distributionFinalized: false,
    totalRevealedBasisPoints: 0n,
    myStatus: { readyToWithdraw: false },
  }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Inheritance claim route', () => {
  it('renders vault-address entry flow when no vault query is provided', () => {
    renderInheritanceClaimPage();

    expect(screen.getByRole('heading', { name: /Claim an inheritance/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/0x…/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled();
  });
});
