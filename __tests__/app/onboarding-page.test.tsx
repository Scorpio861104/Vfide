import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderOnboardingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/onboarding/page');
  const OnboardingPage = pageModule.default as React.ComponentType;
  return render(<OnboardingPage />);
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: false }),
}));

jest.mock('@/components/wizard', () => ({
  CHAPTERS: [1, 2, 3],
  useWizardState: () => ({
    state: { enabled: false, completedChapters: [], skippedChapters: [] },
    setEnabled: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Onboarding route', () => {
  it('renders onboarding launch card and connect wallet prompt', () => {
    renderOnboardingPage();

    expect(screen.getByRole('heading', { name: /Setup Wizard/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
