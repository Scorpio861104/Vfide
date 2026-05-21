import { describe, expect, it, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: any) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
  useSignMessage: () => ({
    signMessageAsync: jest.fn(),
    isPending: false,
  }),
  useWatchContractEvent: () => undefined,
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
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

jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: any) => <div data-testid="qr-code">{value}</div>,
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useIsMerchant: () => ({
    isMerchant: true,
    businessName: 'Test Coffee Shop',
    isLoading: false,
  }),
  useFeeCalculator: () => ({
    traditionalFee: '0.50',
    vfideFee: '0.10',
    savings: '0.40',
    vfideRate: 1,
  }),
}));

import { MerchantPOS } from '@/components/commerce/MerchantPOS';

describe('MerchantPOS', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      }),
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<MerchantPOS />);
    expect(container).toBeInTheDocument();
  });

  it('shows merchant heading and primary tabs', () => {
    render(<MerchantPOS />);

    expect(screen.getByText(/Test Coffee Shop/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Point of Sale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Products & Menu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sales & Reports/i })).toBeInTheDocument();
  });

  it('shows product and cart panels', () => {
    render(<MerchantPOS />);

    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Cart')).toBeInTheDocument();
  });

  it('supports tab clicks', () => {
    render(<MerchantPOS />);

    fireEvent.click(screen.getByRole('button', { name: /Products & Menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sales & Reports/i }));
    fireEvent.click(screen.getByRole('button', { name: /Point of Sale/i }));

    expect(screen.getByText('Cart')).toBeInTheDocument();
  });

  it('shows empty-cart baseline', () => {
    render(<MerchantPOS />);

    expect(screen.getByText(/Cart is empty/i)).toBeInTheDocument();
  });
});
