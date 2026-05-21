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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
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
