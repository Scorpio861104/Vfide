import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const mockSetBudget = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

let mockBudgets: Array<{ id: string; category: string; limit: number; spent: number; period: 'daily' | 'weekly' | 'monthly'; alerts: boolean }> = [];
let mockSpending = Array<{ name: string; amount: number; percentage: number }>();

const renderBudgetsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/budgets/page');
  const BudgetsPage = pageModule.default as React.ComponentType;
  return render(<BudgetsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: mockAddress }),
}));

jest.mock('@/lib/financialIntelligence', () => ({
  useFinancialIntelligence: () => ({
    budgets: mockBudgets,
    spendingByCategory: mockSpending,
    setBudget: mockSetBudget,
    loading: false,
  }),
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

describe('Budgets page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    mockBudgets = [];
    mockSpending = [];
  });

  it('renders empty-state budgets view and create call-to-action', () => {
    renderBudgetsPage();

    expect(screen.getByRole('heading', { name: /Budgets/i, level: 1 })).toBeTruthy();
    expect(screen.getByText(/No budgets yet/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create First Budget/i })).toBeTruthy();
  });

  it('opens create modal and validates required fields', () => {
    renderBudgetsPage();

    fireEvent.click(screen.getByRole('button', { name: /\+ Create Budget/i }));
    expect(screen.getByRole('heading', { name: /Create Budget/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));
    expect(mockToastError).toHaveBeenCalledWith('Please fill all fields');
  });

  it('renders populated budgets and spending overview rows', () => {
    mockBudgets = [
      { id: 'b1', category: 'DeFi', limit: 1000, spent: 0, period: 'monthly', alerts: true },
    ];
    mockSpending = [
      { name: 'DeFi', amount: 250, percentage: 62 },
      { name: 'Gas', amount: 80, percentage: 20 },
    ];

    renderBudgetsPage();

    expect(screen.getAllByText(/DeFi/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\$250\.00 spent/i)).toBeTruthy();
    expect(screen.getByText(/Spending by Category/i)).toBeTruthy();
    expect(screen.getByText(/\$80\.00/i)).toBeTruthy();
  });
});
