'use client';

import { render, screen } from '@testing-library/react';
import RemittancePage from '@/app/remittance/page';

describe('Remittance Page', () => {
  it('renders the remittance calculator', () => {
    render(<RemittancePage />);
    expect(screen.getByRole('heading', { name: /Remittance|Send Money/i })).toBeTruthy();
  });

  it('shows fee calculator interface', () => {
    render(<RemittancePage />);
    expect(screen.getByText(/corridor|fee|Calculate/i)).toBeTruthy();
  });

  it('displays corridors and rates', () => {
    render(<RemittancePage />);
    const pageText = screen.getByRole('main').textContent;
    expect(pageText).toMatch(/fee|rate|corridor/i);
  });
});
