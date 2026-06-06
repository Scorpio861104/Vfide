import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const loadLinkInBioPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../app/(marketing)/s/[slug]/page') as {
    default: (props: any) => Promise<React.ReactElement>;
  };
};

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

jest.mock('../../app/(marketing)/s/[slug]/LinkInBioClient', () => ({
  LinkInBioClient: () => <div data-testid="link-in-bio-client">LinkInBioClient</div>,
}));

describe('Marketing shortlink slug route', () => {
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
            city: 'Accra',
            country: 'Ghana',
            avg_rating: 4.8,
            proof_score: 710,
            theme_color: '#06b6d4',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [{ id: '1', name: 'Wax Print', slug: 'wax-print', price: '15', images: [] }] }),
      });
  });

  it('renders merchant profile header and client island', async () => {
    const { default: LinkInBioPage } = loadLinkInBioPage();

    const element = await LinkInBioPage({ params: Promise.resolve({ slug: 'kofi' }) });
    render(element);

    expect(screen.getByRole('heading', { name: /Kofi Fabrics/i })).toBeTruthy();
    expect(screen.getByText(/Premium textiles/i)).toBeTruthy();
    expect(screen.getByTestId('link-in-bio-client')).toBeTruthy();
  });
});
