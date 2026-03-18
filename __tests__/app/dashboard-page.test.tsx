import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
};

const mockCopy = jest.fn();
const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();

const renderDashboardPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/dashboard/page');
  const DashboardPage = pageModule.default as React.ComponentType;
  return render(<DashboardPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
  useChainId: () => 8453,
}));

jest.mock('@/lib/chains', () => ({
  getExplorerUrlForChainId: () => 'https://basescan.org',
}));

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copied: false,
    copy: mockCopy,
  }),
}));

jest.mock('@/lib/validation', () => ({
  safeParseFloat: (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  },
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useVaultBalance: () => ({ balance: '123.45', isLoading: false }),
  useProofScore: () => ({ score: 7600, tier: 'SILVER', isLoading: false }),
  useVfidePrice: () => ({ priceUsd: 0.5, isLoading: false }),
  useUserBadges: () => ({ badgeIds: [], isLoading: false }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/wallet/QuickWalletConnect', () => ({
  QuickWalletConnect: () => <button>Quick Connect</button>,
}));

jest.mock('@/components/ui/Skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock('@/components/seo/SEOHead', () => ({
  SEOHead: () => <div data-testid="seo-head" />,
}));

jest.mock('@/components/ui/ProofScoreRing', () => ({
  ProofScoreRing: ({ score }: { score: number }) => <div>ProofScoreRing {score}</div>,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/badge/BadgeGallery', () => ({
  BadgeGallery: () => <div>Badge Gallery</div>,
}));

jest.mock('@/components/badge/BadgeProgress', () => ({
  BadgeProgress: () => <div>Badge Progress</div>,
}));

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'button') {
          return ({ children, ...props }: any) => <button {...props}>{children}</button>;
        }
        if (prop === 'tr') {
          return ({ children, ...props }: any) => <tr {...props}>{children}</tr>;
        }
        if (prop === 'tbody') {
          return ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>;
        }
        return ({ children, ...props }: any) => <div {...props}>{children}</div>;
      },
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Dashboard page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0x1111111111111111111111111111111111111111',
    };

    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ activities: [] }), {
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

  it('renders connect-wallet state when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0x1111111111111111111111111111111111111111',
    };

    renderDashboardPage();

    expect(screen.getByRole('heading', { name: /Connect Your Wallet/i })).toBeTruthy();
    expect(screen.getByText(/access your dashboard/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Quick Connect/i })).toBeTruthy();
  });

  it('renders connected dashboard and supports tab switching', async () => {
    renderDashboardPage();

    expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeTruthy();
    expect(screen.getByText(/ProofScore 7600/i)).toBeTruthy();
    expect(await screen.findByText(/No recent activity\./i)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Fee Simulator/i }));
    expect(await screen.findByRole('heading', { name: /Fee Simulator/i })).toBeTruthy();
    expect(screen.getByText(/Transfer Amount \(VFIDE\)/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Score Simulator/i }));
    expect(await screen.findByRole('heading', { name: /Score Simulator/i })).toBeTruthy();
    expect(screen.getByText(/Projected Score/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Badges/i }));
    expect(await screen.findByText(/Badge Gallery/i)).toBeTruthy();
    expect(screen.getByText(/Badge Progress/i)).toBeTruthy();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/activities/0x1111111111111111111111111111111111111111');
    });
  });
});