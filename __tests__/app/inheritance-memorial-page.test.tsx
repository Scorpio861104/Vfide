import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderInheritanceMemorialPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/inheritance/memorial/page');
  const MemorialPage = pageModule.default as React.ComponentType;
  return render(<MemorialPage />);
};

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('wagmi', () => ({
  useReadContract: () => ({ data: undefined, isLoading: false }),
  useReadContracts: () => ({ data: undefined, isLoading: false }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Inheritance memorial route', () => {
  it('renders vault-entry memorial view when no vault query is provided', () => {
    renderInheritanceMemorialPage();

    expect(screen.getByRole('heading', { name: /Memorial/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/0x…/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /View memorial/i })).toBeDisabled();
  });
});
