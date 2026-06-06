'use client';

import { render, screen } from '@testing-library/react';
import LendingPage from '@/app/lending/page';

describe('Lending Page', () => {
  it('renders the lending coming-soon content', () => {
    render(<LendingPage />);
    expect(screen.getByRole('heading', { name: /Peer-to-Peer Lending/i })).toBeTruthy();
    expect(screen.getByText(/Not available in this release/i)).toBeTruthy();
  });

  it('shows current lending capability summary', () => {
    render(<LendingPage />);
    expect(screen.getByText(/Loans collateralized by ProofScore/i)).toBeTruthy();
  });

  it('provides alternative link to direct pay', () => {
    render(<LendingPage />);
    const link = screen.getByRole('link', { name: /Direct Pay/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/pay');
  });
});
