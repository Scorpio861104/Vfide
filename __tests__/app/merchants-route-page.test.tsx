import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const renderMerchantsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchants/page');
  const MerchantsPage = pageModule.default as React.ComponentType;
  return render(<MerchantsPage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('framer-motion', () => ({
  __esModule: true,
  m: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
  motion: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LazyMotion: ({ children }: any) => <>{children}</>,
  domAnimation: {},
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchants directory route', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ merchants: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }),
    });
  });

  it('renders merchant directory shell and empty state', async () => {
    renderMerchantsPage();

    expect(screen.getByRole('heading', { name: /Merchant Directory/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/No merchants found/i)).toBeTruthy();
    });
  });
});
