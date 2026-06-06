'use client';

import { render, screen } from '@testing-library/react';
import DeveloperPage from '@/app/developer/page';

describe('Developer Portal Page', () => {
  it('renders the developer portal with honest stub', () => {
    render(<DeveloperPage />);

    // The developer page is now an honest stub explaining post-testnet timeline
    expect(screen.getByRole('heading', { name: /Developer Portal/i })).toBeTruthy();
    expect(screen.getByText(/in development/i)).toBeTruthy();
    expect(screen.getByText(/APIs, SDKs, and tools for building on VFIDE/i)).toBeTruthy();
  });

  it('shows post-testnet availability message', () => {
    render(<DeveloperPage />);
    expect(screen.getByText(/Post-testnet/i)).toBeTruthy();
  });

  it('provides link to docs', () => {
    render(<DeveloperPage />);
    const docsLink = screen.getByRole('link', { name: /Read the docs/i });
    expect(docsLink).toBeTruthy();
    expect(docsLink.getAttribute('href')).toBe('/docs');
  });
});
