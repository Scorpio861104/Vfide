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
    expect(screen.getAllByText(/corridor|fee|Calculate/i).length).toBeGreaterThan(0);
  });

  it('displays corridors and rates', () => {
    render(<RemittancePage />);
    const pageText = document.body.textContent ?? '';
    expect(pageText).toMatch(/fee|rate|corridor/i);
  });
});
