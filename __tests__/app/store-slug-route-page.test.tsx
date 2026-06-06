import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const loadStorePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../app/store/[slug]/page') as {
    default: (props: any) => Promise<React.ReactElement>;
  };
};

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

jest.mock('../../app/(commerce)/store/[slug]/components/StoreClient', () => ({
  StoreClient: () => <div data-testid="store-client">StoreClient</div>,
}));

describe('Store slug route', () => {
  beforeEach(() => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          merchant: {
            display_name: 'Kofi Fabrics',
            tagline: 'Premium textiles',
            logo_url: null,
            theme_color: '#06b6d4',
            city: 'Accra',
            country: 'Ghana',
            avg_rating: 4.8,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [{ id: '1', name: 'Wax Print' }, { id: '2', name: 'Linen' }] }),
      });
  });

  it('renders store header and client store shell', async () => {
    const { default: StorePage } = loadStorePage();

    const element = await StorePage({ params: Promise.resolve({ slug: 'kofi' }) });
    render(element);

    expect(screen.getByRole('heading', { name: /Kofi Fabrics/i })).toBeTruthy();
    expect(screen.getByText(/Premium textiles/i)).toBeTruthy();
    expect(screen.getByText(/2 products/i)).toBeTruthy();
    expect(screen.getByTestId('store-client')).toBeTruthy();
  });
});
