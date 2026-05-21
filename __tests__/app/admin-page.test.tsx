import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockFetch = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();
const mockCreateObjectURL = jest.fn(() => 'blob:admin-export');
const mockRevokeObjectURL = jest.fn();
const mockAnchorClick = jest.fn();
let mockAccountState = {
  isConnected: true,
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
};
let mockOwnerAddress = '0x1111111111111111111111111111111111111111';

const renderAdminPage = () => {
  // Render AdminDashboardClient directly — page.tsx is an async Server Component
  // which cannot be rendered in Jest. The actual UI and auth logic live in the client component.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdminDashboardClient = require('../../app/admin/AdminDashboardClient').default as React.ComponentType;
  return render(<AdminDashboardClient />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('viem', () => ({
  formatEther: () => '0',
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
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

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: () => mockAccountState,
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
  http: jest.fn(() => ({})),
}));

describe('Admin page QR telemetry export', () => {
  const qrResponse = {
    summary: {
      sinceMinutes: 60,
      total: 1,
      byEventType: { missing: 1, invalid: 0, expired: 0 },
      topMerchants: [{ merchant: '0xmerchant', count: 1 }],
    },
    events: [
      {
        ts: '2026-03-14T10:00:00.000Z',
        eventType: 'missing',
        source: 'qr',
        settlement: 'instant',
        merchant: '0xmerchant',
        orderId: 'INV-100',
        exp: 1710410400,
        sigPrefix: '0xabc123',
        reason: 'signature_missing',
        userAgent: 'jest',
      },
    ],
  };

  const recoveryResponse = {
    summary: {
      sinceMinutes: 60,
      total: 1,
      bySource: {
        'guardian-inbox': 1,
        'guardians-page': 0,
        unknown: 0,
      },
    },
    events: [
      {
        ts: '2026-03-14T10:05:00.000Z',
        source: 'guardian-inbox',
        vault: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Family Vault',
        proposedOwner: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        approvals: 1,
        threshold: 2,
        active: true,
        watcher: '0xcccccccccccccccccccccccccccccccccccccccc',
        userAgent: 'jest',
      },
    ],
  };

  const nextOfKinResponse = {
    summary: {
      sinceMinutes: 60,
      total: 1,
      bySource: {
        'next-of-kin-inbox': 1,
        'next-of-kin-tab': 0,
        unknown: 0,
      },
    },
    events: [
      {
        ts: '2026-03-14T10:06:00.000Z',
        source: 'next-of-kin-inbox',
        vault: '0xdddddddddddddddddddddddddddddddddddddddd',
        label: 'Legacy Vault',
        nextOfKin: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        approvals: 1,
        threshold: 2,
        active: true,
        denied: false,
        watcher: '0xffffffffffffffffffffffffffffffffffffffff',
        userAgent: 'jest',
      },
    ],
  };

  const attestationResponse = {
    summary: {
      sinceMinutes: 60,
      total: 1,
      active: 1,
      expiringSoon: 0,
      topOwners: [{ owner: '0x1111111111111111111111111111111111111111', count: 1 }],
      topGuardians: [{ guardian: '0x2222222222222222222222222222222222222222', count: 1 }],
    },
    events: [
      {
        ts: '2026-03-14T10:10:00.000Z',
        owner: '0x1111111111111111111111111111111111111111',
        guardian: '0x2222222222222222222222222222222222222222',
        vault: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        issuedAt: 1710411000,
        expiresAt: 1710497400,
        signaturePrefix: '0xfeedbead',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0x1111111111111111111111111111111111111111',
    };
    mockOwnerAddress = '0x1111111111111111111111111111111111111111';
    mockFetch.mockReset();
    mockCreateObjectURL.mockReset();
    mockCreateObjectURL.mockReturnValue('blob:admin-export');
    mockRevokeObjectURL.mockReset();
    mockAnchorClick.mockReset();

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/security/qr-signature-events')) {
        return new Response(JSON.stringify(qrResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/security/recovery-fraud-events')) {
        return new Response(JSON.stringify(recoveryResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/security/next-of-kin-fraud-events')) {
        return new Response(JSON.stringify(nextOfKinResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/security/guardian-attestations')) {
        return new Response(JSON.stringify(attestationResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ summary: {}, events: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: mockCreateObjectURL,
    });

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: mockRevokeObjectURL,
    });

    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(mockAnchorClick);
  });

  it('shows connect-wallet gate when wallet is disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: undefined as unknown as `0x${string}`,
    };

    renderAdminPage();

    expect(screen.getByRole('heading', { name: /Admin Panel/i })).toBeTruthy();
    expect(screen.getByText(/Please connect your wallet to access admin functions/i)).toBeTruthy();
  });

  it('shows owner-only access denied state when connected wallet is not owner', () => {
    mockAccountState = {
      isConnected: true,
      address: '0x2222222222222222222222222222222222222222',
    };
    mockOwnerAddress = '0x1111111111111111111111111111111111111111';

    renderAdminPage();

    expect(screen.getByRole('heading', { name: /Access Denied/i })).toBeTruthy();
    expect(screen.getByText(/You are not the contract owner/i)).toBeTruthy();
  });

  it('disables Export CSV when there are no QR events', async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/security/qr-signature-events')) {
        return new Response(
          JSON.stringify({
            summary: {
              sinceMinutes: 60,
              total: 0,
              byEventType: { missing: 0, invalid: 0, expired: 0 },
              topMerchants: [],
            },
            events: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/security/guardian-attestations')) {
        return new Response(JSON.stringify(attestationResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes('/api/security/next-of-kin-fraud-events')) {
        return new Response(
          JSON.stringify({
            summary: {
              sinceMinutes: 60,
              total: 0,
              bySource: {
                'next-of-kin-inbox': 0,
                'next-of-kin-tab': 0,
                unknown: 0,
              },
            },
            events: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify(recoveryResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    renderAdminPage();

    const exportButton = await screen.findByRole('button', { name: /Export QR CSV/i });
    await waitFor(() => {
      expect(exportButton.hasAttribute('disabled')).toBe(true);
    });
  });

  it('enables Export CSV and triggers blob download when QR events exist', async () => {
    renderAdminPage();

    const exportButton = await screen.findByRole('button', { name: /Export QR CSV/i });
    await waitFor(() => {
      expect(exportButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockAnchorClick).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:admin-export');
    });
  });

  it('enables attestation export and triggers blob download when attestation events exist', async () => {
    renderAdminPage();

    const exportButton = await screen.findByRole('button', { name: /Export Attestation CSV/i });
    await waitFor(() => {
      expect(exportButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockAnchorClick).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:admin-export');
    });
  });

  it('enables Next of Kin export and triggers blob download when events exist', async () => {
    renderAdminPage();

    const exportButton = await screen.findByRole('button', { name: /Export Next of Kin CSV/i });
    await waitFor(() => {
      expect(exportButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockAnchorClick).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:admin-export');
    });
  });
});