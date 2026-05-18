import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MarketplacePage from '../../app/marketplace/page';
import React from 'react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
    aside: ({ children, ...props }: any) => React.createElement('aside', props, children),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('../../app/marketplace/components/ProductGridCard', () => ({
  ProductGridCard: ({ product }: any) => <div>{product.name}</div>,
}));

jest.mock('../../app/marketplace/components/ProductListCard', () => ({
  ProductListCard: ({ product }: any) => <div>{product.name}</div>,
}));

describe('MarketplacePage live catalog integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as typeof global & { fetch: jest.Mock }).fetch = jest.fn((_input: RequestInfo | URL) => {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          products: [
            { id: 'p1', name: 'Kente Cloth', price: '55.00' },
            { id: 'p2', name: 'Leather Sandals', price: '72.00' },
          ],
          pagination: { page: 1, limit: 24, total: 2, pages: 1 },
          facets: { min_price: '55.00', max_price: '72.00' },
        }),
      } as Response);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('loads marketplace products from the live merchant products API', async () => {
    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Kente Cloth')).toBeInTheDocument();
      expect(screen.getByText('Leather Sandals')).toBeInTheDocument();
    });

    expect(String((global.fetch as jest.Mock).mock.calls[0]?.[0])).toContain('/api/merchant/products?');
    expect(String((global.fetch as jest.Mock).mock.calls[0]?.[0])).toContain('status=active');
  });

  it('applies filters client-side without re-querying the API', async () => {
    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Kente Cloth')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '50' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'price-desc' } });

    await waitFor(() => {
      expect(screen.getByText('Kente Cloth')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
