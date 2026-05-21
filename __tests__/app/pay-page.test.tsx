import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockSearchParams = new URLSearchParams();
const mockCreateEscrow = jest.fn(async (_merchant: `0x${string}`, _amount: string, _orderId: string) => {});
const mockPayMerchant = jest.fn(async (_merchant: `0x${string}`, _token: `0x${string}`, _amount: string, _orderId: string) => {});
const mockShowToast = jest.fn();
const mockVerifyMessage = jest.fn(async () => true);
const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();
const renderPayPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/pay/page');
  const PayPage = pageModule.default as React.ComponentType;
  return render(<PayPage />);
};

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key),
  }),
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
})),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
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

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V2
  CONTRACT_ADDRESSES: {},
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({})),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
}));

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  verifyMessage: mockVerifyMessage,
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
})),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}));

jest.mock('@/hooks/usePriceHooks', () => ({
  useVfidePrice: () => ({
    priceUsd: 0.07,
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useMerchantHooks', () => ({
  usePayMerchant: () => ({
    payMerchant: mockPayMerchant,
    isPaying: false,
    isSuccess: false,
    error: null,
  }),
}));

jest.mock('@/lib/escrow/useEscrow', () => ({
  useEscrow: () => ({
    createEscrow: mockCreateEscrow,
    loading: false,
    isSuccess: false,
    error: null,
  }),
}));

describe('Pay page QR checkout', () => {
  beforeEach(() => {
    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key);
    });
    mockCreateEscrow.mockClear();
    mockPayMerchant.mockClear();
    mockShowToast.mockClear();
    mockVerifyMessage.mockClear();
    mockVerifyMessage.mockResolvedValue(true);
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });
  });

  const attachSignedQrParams = () => {
    mockSearchParams.set('source', 'qr');
    mockSearchParams.set('settlement', 'instant');
    mockSearchParams.set('exp', String(Math.floor(Date.now() / 1000) + 600));
    mockSearchParams.set('sig', '0xabcdef');
  };

  it('treats QR amount as VFIDE and shows VFIDE amount display', async () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111');
    mockSearchParams.set('amount', '100');
    attachSignedQrParams();

    renderPayPage();

    expect(screen.getByText('Amount (VFIDE)')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pay Instantly \(100 VFIDE\)/i })).toBeTruthy();
    });
  });

  it('routes escrow settlement to createEscrow with QR order id', async () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111');
    mockSearchParams.set('amount', '55.5');
    mockSearchParams.set('settlement', 'escrow');
    mockSearchParams.set('orderId', 'INV-123');
    mockSearchParams.set('source', 'qr');
    mockSearchParams.set('exp', String(Math.floor(Date.now() / 1000) + 600));
    mockSearchParams.set('sig', '0xabcdef');

    renderPayPage();

    const escrowButton = await screen.findByRole('button', { name: /Create Escrow/i });
    fireEvent.click(escrowButton);

    await waitFor(() => {
      expect(mockCreateEscrow).toHaveBeenCalledWith(
        '0x1111111111111111111111111111111111111111',
        '55.5',
        'INV-123'
      );
    });
    expect(mockPayMerchant).not.toHaveBeenCalled();
  });

  it('disables payment when amount is missing or invalid', () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111');
    mockSearchParams.set('amount', 'not-a-number');
    attachSignedQrParams();

    renderPayPage();

    const payButton = screen.getByRole('button', { name: /Amount required/i });
    expect(payButton.hasAttribute('disabled')).toBe(true);
  });

  it('blocks QR checkout when signature is missing', () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111');
    mockSearchParams.set('amount', '10');
    mockSearchParams.set('source', 'qr');
    mockSearchParams.set('settlement', 'instant');
    mockSearchParams.set('exp', String(Math.floor(Date.now() / 1000) + 600));

    renderPayPage();

    expect(screen.getByRole('button', { name: /QR signature required/i }).hasAttribute('disabled')).toBe(true);
  });

  it('blocks QR checkout when signature verification fails', async () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111');
    mockSearchParams.set('amount', '10');
    attachSignedQrParams();
    mockVerifyMessage.mockResolvedValue(false);

    renderPayPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /QR signature required/i }).hasAttribute('disabled')).toBe(true);
    });
  });

  it('sends QR telemetry when signature is missing', async () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111');
    mockSearchParams.set('amount', '10');
    mockSearchParams.set('source', 'qr');
    mockSearchParams.set('settlement', 'instant');
    mockSearchParams.set('exp', String(Math.floor(Date.now() / 1000) + 600));

    renderPayPage();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/security/qr-signature-events',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const firstCall = mockFetch.mock.calls[0] as [RequestInfo | URL, RequestInit | undefined] | undefined;
    const body = JSON.parse(String(firstCall?.[1]?.body));
    expect(body.eventType).toBe('missing');
    expect(body.reason).toBe('qr_signature_missing');
  });

  it('shows cancellation toast when instant payment is rejected', async () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111');
    mockSearchParams.set('amount', '10');
    mockSearchParams.set('settlement', 'instant');
    mockPayMerchant.mockRejectedValueOnce(new Error('User rejected transaction'));

    renderPayPage();

    fireEvent.click(await screen.findByRole('button', { name: /Pay Instantly/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Transaction cancelled by user', 'info');
    });
  });

  it('shows invalid merchant toast when merchant address is malformed', async () => {
    mockSearchParams.set('merchant', '0x1111...bad');
    mockSearchParams.set('amount', '10');
    mockSearchParams.set('settlement', 'instant');

    renderPayPage();

    fireEvent.click(await screen.findByRole('button', { name: /Pay Instantly/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Invalid merchant address', 'error');
    });
    expect(mockPayMerchant).not.toHaveBeenCalled();
    expect(mockCreateEscrow).not.toHaveBeenCalled();
  });
});
