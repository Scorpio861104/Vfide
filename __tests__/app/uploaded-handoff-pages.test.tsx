'use client';

import { render, screen } from '@testing-library/react';
import LendingPage from '@/app/lending/page';
import ReportingPage from '@/app/reporting/page';
import AgentPage from '@/app/agent/page';

describe('Uploaded Handoff Pages (Real Stubs)', () => {
  it('renders Lending page with honest stub content', () => {
    render(<LendingPage />);
    expect(screen.getByRole('heading', { name: /DeFi Lending/i })).toBeTruthy();
    expect(screen.getByText(/in development/i)).toBeTruthy();
    expect(screen.getByText(/Collateral-backed loans/i)).toBeTruthy();
  });

  it('renders Reporting page with honest stub content', () => {
    render(<ReportingPage />);
    expect(screen.getByRole('heading', { name: /Reporting & Analytics/i })).toBeTruthy();
    expect(screen.getByText(/in development/i)).toBeTruthy();
  });

  it('renders Agent page with honest stub content', () => {
    render(<AgentPage />);
    expect(screen.getByRole('heading', { name: /VFIDE Agent/i })).toBeTruthy();
    expect(screen.getByText(/in development/i)).toBeTruthy();
    expect(screen.getByText(/AI-powered payment automation/i)).toBeTruthy();
  });
});
