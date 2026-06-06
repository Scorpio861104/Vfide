import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderInheritanceOverridePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/inheritance/override/page');
  const OverridePage = pageModule.default as React.ComponentType;
  return render(<OverridePage />);
};

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  usePublicClient: () => null,
  useReadContract: () => ({ data: undefined, isLoading: false }),
  useWriteContract: () => ({ writeContractAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Inheritance override route', () => {
  it('renders proof-of-life override vault entry step', () => {
    renderInheritanceOverridePage();

    expect(screen.getByRole('heading', { name: /Proof of life/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/0x…/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled();
  });
});
