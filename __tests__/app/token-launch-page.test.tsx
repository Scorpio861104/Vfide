import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => k === 'tab' ? 'token-launch' : null }),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/developer',
  redirect: jest.fn(),
}));
jest.mock('@/components/layout/Footer', () => ({ Footer: () => null }));
jest.mock('@/hooks/useLocale', () => ({ useLocale: () => ['en', jest.fn()] }));
jest.mock('@/lib/i18n', () => ({
  STUB_TRANSLATIONS: {},
  pickLocaleCopy: () => ({}),
}));

const renderPage = () => {
  const pageModule = require('../../app/developer/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

describe('Token launch page (now /developer?tab=token-launch)', () => {
  it('renders Developer Hub heading and Token Launch tab', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Developer Hub/i })).toBeTruthy();
    // Token Launch appears in the tab bar and possibly heading — use getAllByText
    expect(screen.getAllByText(/Token Launch/i).length).toBeGreaterThan(0);
  });
});
