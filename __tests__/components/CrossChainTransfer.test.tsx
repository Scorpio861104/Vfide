import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CrossChainTransfer from '../../components/CrossChainTransfer';

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111' }),
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/crossChain', () => ({
  useCrossChain: () => ({
    balances: [
      { token: 'ETH', totalBalance: 'not-a-number' },
      { token: 'USDC', totalBalance: '12.3456' },
    ],
    routes: [],
    currentTransfer: null,
    loading: false,
    error: null,
    supportedChains: [
      { id: 8453, name: 'Base', isTestnet: false },
      { id: 42161, name: 'Arbitrum', isTestnet: false },
    ],
    findOptimalRoutes: jest.fn(),
    getChain: jest.fn(),
    refreshBalances: jest.fn(),
  }),
}));

describe('CrossChainTransfer', () => {
  it('renders invalid balances safely without showing NaN', () => {
    render(<CrossChainTransfer />);

    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
    expect(screen.getByText('0.0000')).toBeInTheDocument();
    expect(screen.getByText('12.3456')).toBeInTheDocument();
  });
});
