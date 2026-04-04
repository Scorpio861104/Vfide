import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderFlashlightPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/flashlight/page');
  const FlashlightPage = pageModule.default as React.ComponentType;
  return render(<FlashlightPage />);
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

jest.mock('@/lib/flashloans/engine', () => {
  const transitions: Record<string, string> = {
    request: 'requested',
    approve: 'approved',
    'fund-escrow': 'escrow-funded',
    draw: 'drawn',
    repay: 'repaid',
    'raise-dispute': 'disputed',
    'resolve-lender': 'resolved-lender',
    'resolve-borrower': 'resolved-borrower',
    reset: 'draft',
  };

  return {
    sanitizeTerms: (terms: any) => terms,
    computeTotalDue: (terms: any) => terms.principal + (terms.principal * terms.interestBps) / 10000,
    getProtectionStatus: () => ({ borrowerProtected: true, lenderProtected: true }),
    canPerformAction: (action: string, _role: string, simulation: any) => {
      const stage = simulation.stage;
      if (action === 'advance-day' || action === 'reset') return true;
      if (action === 'request') return stage === 'draft';
      if (action === 'approve') return stage === 'requested';
      if (action === 'fund-escrow') return stage === 'approved';
      if (action === 'draw') return stage === 'escrow-funded';
      if (action === 'repay') return stage === 'drawn';
      if (action === 'raise-dispute') return stage === 'drawn';
      if (action === 'resolve-lender' || action === 'resolve-borrower') return stage === 'disputed';
      return false;
    },
    performAction: (action: string, _role: string, simulation: any) => {
      const nextStage = transitions[action] ?? simulation.stage;
      const nextDay = action === 'advance-day' ? simulation.simDay + 1 : simulation.simDay + 1;
      return {
        state: {
          ...simulation,
          stage: nextStage,
          simDay: nextDay,
          dueDay: nextStage === 'requested' ? nextDay + 14 : simulation.dueDay,
        },
        event: action,
      };
    },
  };
});

describe('Flashlight page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders hero, fairness rules, and simulator shell', () => {
    renderFlashlightPage();

    expect(screen.getByRole('heading', { name: /Flashloans P2P Borrowing, Built on Trust/i })).toBeTruthy();
    expect(screen.getByText(/Fairness & Compliance/i)).toBeTruthy();
    expect(screen.getByText(/Live P2P Flow Simulator/i)).toBeTruthy();
    expect(screen.getByText(/System: simulation initialized/i)).toBeTruthy();
  });

  it('progresses simulation through request and approve actions', () => {
    renderFlashlightPage();

    fireEvent.click(screen.getByRole('button', { name: /Request Lane/i }));
    expect(screen.getByText(/Requested/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Lender Approve Terms/i }));
    expect(screen.getByText(/Approved/i)).toBeTruthy();
    expect(screen.getAllByText(/approve/i).length).toBeGreaterThan(0);
  });

  it('enters dispute stage and shows arbitration actions', () => {
    renderFlashlightPage();

    fireEvent.click(screen.getByRole('button', { name: /Request Lane/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lender Approve Terms/i }));
    fireEvent.click(screen.getByRole('button', { name: /Fund Escrow/i }));
    fireEvent.click(screen.getByRole('button', { name: /Borrower Draw/i }));
    fireEvent.click(screen.getByRole('button', { name: /Raise Dispute/i }));

    expect(screen.getByText(/DAO Arbitration Required/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Resolve to Lender/i })).toBeTruthy();
  });

  it('switches between borrow, active, and history tabs while keeping lane progress visible', () => {
    renderFlashlightPage();

    expect(screen.getByRole('button', { name: /^Borrow$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Active Loans/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^History$/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Request Lane/i }));
    fireEvent.click(screen.getByRole('button', { name: /History/i }));

    expect(screen.getByText(/Activity history/i)).toBeTruthy();
    expect(screen.getAllByText(/request/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Active Loans/i }));
    expect(screen.getByText(/Lane Snapshot/i)).toBeTruthy();
    expect(screen.getByText(/Requested/i)).toBeTruthy();
  });
});
