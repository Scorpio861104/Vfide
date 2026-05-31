import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const renderMarketplacePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/marketplace/page');
  const MarketplacePage = pageModule.default as React.ComponentType;
  return render(<MarketplacePage />);
};

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('../../app/marketplace/components/FilterContent', () => ({
  FilterContent: () => <div data-testid="filters">Filters</div>,
}));

jest.mock('../../app/marketplace/components/ProductGridCard', () => ({
  ProductGridCard: () => <div data-testid="grid-card">Grid Card</div>,
}));

jest.mock('../../app/marketplace/components/ProductListCard', () => ({
  ProductListCard: () => <div data-testid="list-card">List Card</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Marketplace route', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) });
  });

  it('renders marketplace shell and empty-results state', async () => {
    renderMarketplacePage();

    expect(screen.getByRole('heading', { name: /Marketplace/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/No products found/i)).toBeTruthy();
    });
  });
});
