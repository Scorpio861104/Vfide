import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockCopy = jest.fn();
const mockWindowOpen = jest.fn();

let mockAddress: `0x${string}` | undefined;

const renderInvitePage = () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const pageModule = require('../../app/invite/page');
	const InvitePage = pageModule.default as React.ComponentType;
	return render(<InvitePage />);
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

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
	useCopyToClipboard: () => ({ copied: false, copy: mockCopy }),
}));

jest.mock('framer-motion', () => {
	const motion = new Proxy(
		{},
		{
			get: (_target, prop: string) => {
				if (prop === 'button') {
					return ({ children, ...props }: any) => <button {...props}>{children}</button>;
				}
				return ({ children, ...props }: any) => <div {...props}>{children}</div>;
			},
		}
	);

	return { motion };
});

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = {
	const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
	return {
		Copy: Icon,
		Check: Icon,
		Mail: Icon,
		MessageCircle: Icon,
		X: Icon,
		Share2: Icon,
		Users: Icon,
		Trophy: Icon,
		Zap: Icon,
		QrCode: Icon,
	};
};
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})());

describe('Invite page logic pathways', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		Object.defineProperty(window, 'open', {
			writable: true,
			value: mockWindowOpen,
		});
	});

	it('renders a wallet-derived invite link and supports copy action', () => {
		renderInvitePage();

		expect(screen.getByText(/https:\/\/vfide.io\/invite\/0xaaaaaa/i)).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: /copy/i }));
		expect(mockCopy).toHaveBeenCalledWith('https://vfide.io/invite/0xaaaaaa');
	});

	it('opens social share URLs for configured channels', () => {
		renderInvitePage();

		fireEvent.click(screen.getByRole('button', { name: /email/i }));
		fireEvent.click(screen.getByRole('button', { name: /twitter/i }));
		fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));

		expect(mockWindowOpen).toHaveBeenCalledTimes(3);
		expect(mockWindowOpen.mock.calls[0][0]).toContain('mailto:?subject=Join%20me%20on%20VFIDE!');
		expect(mockWindowOpen.mock.calls[1][0]).toContain('twitter.com/intent/tweet');
		expect(mockWindowOpen.mock.calls[2][0]).toContain('wa.me/?text=');
	});
});
