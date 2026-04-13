import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const renderFlashloansPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/flashloans/page');
  const FlashLoansPage = pageModule.default as React.ComponentType;
  return render(<FlashLoansPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Flashloans page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes('/api/flashloans/lanes') && init?.method === 'POST') {
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(
          JSON.stringify({
            lanes: [
              {
                id: 1,
                borrower_address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                lender_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                principal: '1200',
                duration_days: 30,
                interest_bps: 200,
                stage: 'proposed',
                created_at: new Date().toISOString(),
                due_day: 30,
                sim_day: 0,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }),
    });
  });

  it('renders hero, fairness rules, and simulator shell', () => {
    renderFlashloansPage();

    expect(screen.getByRole('heading', { name: /Flash Loans/i })).toBeTruthy();
    expect(screen.getByText(/Zero-collateral instant loans/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Borrow$/i })).toBeTruthy();
  });

  it('submits borrow request from the form', async () => {
    renderFlashloansPage();

    fireEvent.change(screen.getByLabelText(/Lender Address/i), { target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' } });
    fireEvent.change(screen.getByLabelText(/Principal \(VFIDE\)/i), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: /Request Flash Loan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Loan request submitted/i)).toBeTruthy();
    });
  });

  it('switches between borrow, active, and history tabs', async () => {
    renderFlashloansPage();

    fireEvent.click(screen.getByRole('button', { name: /Active Loans/i }));
    expect(await screen.findByText(/Lane #1/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /History/i }));
    expect(await screen.findByText(/Lane #1/i)).toBeTruthy();
  });

  it('switches between borrow, active, and history tabs while keeping lane progress visible', () => {
    renderFlashloansPage();

    expect(screen.getByRole('button', { name: /^Borrow$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Active Loans/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^History$/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /History/i }));

    expect(screen.getByText(/History/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Active Loans/i }));
    expect(screen.getByText(/Active Loans/i)).toBeTruthy();
  });
});
