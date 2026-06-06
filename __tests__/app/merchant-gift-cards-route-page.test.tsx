import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantGiftCardsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/gift-cards/page');
  const MerchantGiftCardsPage = pageModule.default as React.ComponentType;
  return render(<MerchantGiftCardsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({
    locale: 'en',
    formatCurrency: (value: number, currency = 'USD') => `${currency} ${value}`,
    formatDate: () => 'Date',
  }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('framer-motion', () => ({
  __esModule: true,
  m: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
  motion: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
  LazyMotion: ({ children }: any) => <>{children}</>,
  AnimatePresence: ({ children }: any) => <>{children}</>,
  domAnimation: {},
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/lib/security/urlValidation', () => ({
  safeWindowOpen: jest.fn(),
}));

jest.mock('@/lib/clipboardSafe', () => ({
  copyToClipboardSafe: jest.fn().mockResolvedValue(true),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant gift cards route', () => {
  it('renders disconnected wallet prompt', () => {
    renderMerchantGiftCardsPage();

    expect(screen.getByRole('heading', { name: /Launch merchant gift cards/i })).toBeTruthy();
    expect(screen.getByText(/Connect the merchant wallet to create and manage gift cards/i)).toBeTruthy();
  });
});
