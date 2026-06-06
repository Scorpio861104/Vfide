'use client';

import { render, screen } from '@testing-library/react';
import SubscriptionsPage from '@/app/subscriptions/page';

describe('Subscriptions Page', () => {
  it('renders the subscriptions honest stub', () => {
    render(<SubscriptionsPage />);

    // The subscriptions page is now an honest stub explaining post-testnet timeline
    expect(screen.getByRole('heading', { name: /Recurring Subscriptions/i })).toBeTruthy();
    expect(screen.getByText(/in development/i)).toBeTruthy();
    expect(screen.getByText(/Set up and manage subscription billing/i)).toBeTruthy();
  });

  it('shows feature roadmap', () => {
    render(<SubscriptionsPage />);
    expect(screen.getByText(/Weekly, monthly, quarterly, and annual billing/i)).toBeTruthy();
  });

  it('provides link to merchant portal', () => {
    render(<SubscriptionsPage />);
    const ctaLink = screen.getByRole('link', { name: /Configure subscriptions/i });
    expect(ctaLink).toBeTruthy();
    expect(ctaLink.getAttribute('href')).toBe('/merchant/subscriptions');
  });
});
