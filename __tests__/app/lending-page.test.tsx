'use client';

import { render, screen } from '@testing-library/react';
import LendingPage from '@/app/lending/page';

describe('Lending Page', () => {
  it('renders the DeFi lending honest stub', () => {
    render(<LendingPage />);
    expect(screen.getByRole('heading', { name: /DeFi Lending/i })).toBeTruthy();
    expect(screen.getByText(/in development/i)).toBeTruthy();
  });

  it('shows post-launch timeline', () => {
    render(<LendingPage />);
    expect(screen.getByText(/V2|planned for/i)).toBeTruthy();
  });

  it('provides link to build ProofScore', () => {
    render(<LendingPage />);
    const link = screen.getByRole('link', { name: /Build your ProofScore/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/proofscore');
  });
});
