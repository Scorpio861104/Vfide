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
  useT: () => ({ developer_heading: 'Developer Hub', support_heading: 'Help & Support Center', support_tab_faq: 'FAQ', support_tab_tickets: 'My Tickets', support_tab_new: 'New Ticket', common_loading: 'Loading…', common_back: 'Back', security_heading: 'Account Security', security_subtitle: 'Monitor sessions.', common_settings: 'Settings' }),
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
