/**
 * Store slug page tests — updated to match the server-component version of the page
 * that delegates rendering to StoreClient.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  useParams: jest.fn().mockReturnValue({ slug: 'demo-store' }),
}));

jest.mock('@/app/(commerce)/store/[slug]/components/StoreClient', () => ({
  StoreClient: ({ merchant, products }: any) => (
    <div data-testid="store-client">
      <h1>{merchant?.display_name ?? 'Store'}</h1>
      <div data-testid="product-count">{products?.length ?? 0} products</div>
    </div>
  ),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

// Silence fetch during unit tests
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ merchant: { display_name: 'Demo Store', tagline: 'Test store' }, products: [] }),
}) as jest.Mock;

async function renderStorePage(slug = 'demo-store') {
  const pageModule = await import('../../app/store/[slug]/page');
  const StorefrontPage = pageModule.default;
  // Server component — invoke as async function
  const element = await (StorefrontPage as any)({ params: Promise.resolve({ slug }) });
  return render(element);
}

describe('Store route page rendering', () => {
  it('renders StoreClient with the fetched merchant and products', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ merchant: { display_name: 'Demo Store', tagline: 'Best shop' }, products: [{ id: 1 }] }),
    });
    await renderStorePage();
    expect(screen.getByTestId('store-client')).toBeTruthy();
    const headings = screen.getAllByRole('heading', { name: 'Demo Store' });
    expect(headings.length).toBeGreaterThan(0);
  });

  it('calls notFound when merchant fetch fails', async () => {
    const { notFound } = await import('next/navigation');
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    try {
      await renderStorePage('no-such-store');
    } catch {
      // notFound() throws internally in Next.js
    }
    expect(notFound).toHaveBeenCalled();
  });
});
