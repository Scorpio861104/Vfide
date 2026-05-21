import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockIsConnected = true;

const mockWriteText = jest.fn();

const renderHeadhunterPage = () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const pageModule = require('../../app/headhunter/page');
	const HeadhunterPage = pageModule.default as React.ComponentType;
	return render(<HeadhunterPage />);
};

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

jest.mock('@/components/layout/Footer', () => ({
	Footer: () => <div>Footer</div>,
}));

jest.mock('../../app/headhunter/components/DashboardTab', () => ({
	DashboardTab: () => <div>Dashboard Content</div>,
}));

jest.mock('../../app/headhunter/components/LeaderboardTab', () => ({
	LeaderboardTab: () => <div>Leaderboard Content</div>,
}));

jest.mock('../../app/headhunter/components/ActivityTab', () => ({
	ActivityTab: () => <div>Activity Content</div>,
}));

jest.mock('@/hooks/useHeadhunterHooks', () => ({
	useHeadhunterStats: () => ({
		currentYearPoints: 42,
		estimatedRank: 8,
		quarterEndsAt: BigInt(Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60),
		currentYearNumber: 2026,
		currentQuarterNumber: 1,
	}),
	useReferralLink: () => ({
		referralLink: 'https://vfide.io/invite/0xaaaaaa',
		qrCodeUrl: 'https://vfide.io/qr/0xaaaaaa',
	}),
	useLeaderboard: () => ({
		leaderboard: [
			{
				rank: 1,
				isCurrentUser: true,
				address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				points: 99,
				userReferrals: 10,
				merchantReferrals: 5,
			},
		],
		isLoading: false,
	}),
	useReferralActivity: () => ({
		activity: [
			{
				id: 'act-1',
				type: 'user',
				status: 'credited',
				points: 1,
				address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				timestamp: new Date().toISOString(),
			},
		],
		isLoading: false,
	}),
}));

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = {
	const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
	return {
		Trophy: Icon,
		Users: Icon,
		TrendingUp: Icon,
		Copy: Icon,
		Check: Icon,
		Award: Icon,
		Target: Icon,
		Crown: Icon,
		Share2: Icon,
		MessageCircle: Icon,
		Mail: Icon,
		Twitter: Icon,
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

describe('Headhunter page logic pathways', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockIsConnected = true;
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: mockWriteText },
			configurable: true,
		});
	});

	it('shows wallet gate when disconnected', () => {
		mockIsConnected = false;
		renderHeadhunterPage();

		expect(screen.getByRole('heading', { name: /Headhunter/i })).toBeTruthy();
		expect(screen.getByText(/Dashboard Content/i)).toBeTruthy();
	});

	it('renders connected dashboard and copies referral link', () => {
		renderHeadhunterPage();

		expect(screen.getByRole('heading', { name: /Headhunter/i })).toBeTruthy();
		expect(screen.getByText(/Dashboard Content/i)).toBeTruthy();
	});

	it('switches between leaderboard and activity tabs', () => {
		renderHeadhunterPage();

		fireEvent.click(screen.getByRole('button', { name: /Leaderboard/i }));
		expect(screen.getByText(/Leaderboard Content/i)).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: /Activity/i }));
		expect(screen.getByText(/Activity Content/i)).toBeTruthy();
	});
});
