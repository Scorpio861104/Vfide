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

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => ({ address: mockAddress }),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v) => JSON.stringify(v)),
  deserialize: jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
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

    fireEvent.click(screen.getByRole('button', { name: /Create Budget/i }));
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
