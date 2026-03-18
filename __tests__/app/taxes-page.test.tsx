import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockLoading = false;
let mockAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const mockTaxEvents = [
  {
    id: 'tx-1',
    type: 'capital-gain',
    token: 'ETH',
    timestamp: Date.now(),
    amount: 1200,
    gain: 150,
  },
  {
    id: 'tx-2',
    type: 'capital-loss',
    token: 'USDC',
    timestamp: Date.now() - 1000,
    amount: 800,
    gain: -60,
  },
];

const mockTaxSummary = {
  shortTermGains: 500,
  longTermGains: 200,
  totalLosses: 100,
  netGain: 600,
};

const renderTaxesPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/taxes/page');
  const TaxesPage = pageModule.default as React.ComponentType;
  return render(<TaxesPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: mockAddress }),
}));

jest.mock('@/lib/financialIntelligence', () => ({
  useFinancialIntelligence: () => ({
    taxEvents: mockTaxEvents,
    taxSummary: mockTaxSummary,
    loading: mockLoading,
  }),
}));

describe('Taxes page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoading = false;
    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  });

  it('renders loading skeleton while financial intelligence loads', () => {
    mockLoading = true;
    const { container } = renderTaxesPage();

    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders tax summary cards and tax events list', () => {
    renderTaxesPage();

    expect(screen.getByRole('heading', { name: /Tax Report/i })).toBeTruthy();
    expect(screen.getByText(/Short-Term Gains/i)).toBeTruthy();
    expect(screen.getByText(/Long-Term Gains/i)).toBeTruthy();
    expect(screen.getByText(/Tax Events \(2\)/i)).toBeTruthy();
    expect(screen.getByText(/capital-gain/i)).toBeTruthy();
  });

  it('switches tax year and keeps export controls visible', () => {
    renderTaxesPage();

    fireEvent.change(screen.getByDisplayValue(String(new Date().getFullYear())), {
      target: { value: '2025' },
    });

    expect(screen.getByDisplayValue('2025')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Export PDF/i })).toBeTruthy();
  });
});
