import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111', isConnected: true }),
  useReadContract: () => ({ data: undefined, isLoading: false }),
  useWriteContract: () => ({ writeContract: jest.fn(), data: undefined, isPending: false }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

jest.mock('@/components/merchant/disputes/PeerMediation', () => ({
  __esModule: true,
  default: () => <div>Peer Mediation Component</div>,
}));

jest.mock('@/lib/lazy', () => ({
  LazyPeerMediation: () => <div>Peer Mediation Component</div>,
}));

beforeEach(() => {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/flashloans/lanes')) {
      return {
        ok: true,
        json: async () => ({
          lanes: [
            { id: 'lane-1', state: { stage: 'active' }, terms: { principal: 1200 } },
            { id: 'lane-2', state: { stage: 'settled' }, terms: { principal: 800 } },
          ],
        }),
      } as Response;
    }

    if (url.includes('/api/proposals')) {
      return {
        ok: true,
        json: async () => ({
          proposals: [{ id: 1, title: 'Upgrade council tooling', status: 'active' }],
          total: 1,
        }),
      } as Response;
    }

    if (url.includes('/api/merchant/returns')) {
      return {
        ok: true,
        json: async () => ({
          returns: [
            { id: 'ret-1', status: 'requested', type: 'refund' },
            { id: 'ret-2', status: 'approved', type: 'exchange' },
          ],
        }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => ({}),
    } as Response;
  }) as typeof fetch;
});

describe('Uploaded handoff pages', () => {
  it('renders the lending workspace with preview links and interactive tabs', async () => {
    const pageModule = require('../../app/lending/page');
    const LendingPage = pageModule.default as React.ComponentType;
    render(<LendingPage />);

    expect(screen.getByRole('heading', { name: /p2p lending/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /open flashloans workspace/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /view flash loans/i })).toBeTruthy();
    expect(await screen.findByText(/2 live lanes/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /borrow/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /lend/i })).toBeTruthy();
    expect(screen.getByText(/how borrowing works/i)).toBeTruthy();
  });

  it('renders the elections workspace with governance links and candidate tabs', async () => {
    const pageModule = require('../../app/elections/page');
    const ElectionsPage = pageModule.default as React.ComponentType;
    render(<ElectionsPage />);

    expect(screen.getByRole('heading', { name: /council elections/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /open governance hub/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /view council overview/i })).toBeTruthy();
    expect(await screen.findByText(/1 active proposal/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /candidates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /current council/i })).toBeTruthy();
    expect(screen.getByText(/election active/i)).toBeTruthy();
  });

  it('renders the disputes handoff page and resolution links', async () => {
    const pageModule = require('../../app/disputes/page');
    const DisputesPage = pageModule.default as React.ComponentType;
    render(<DisputesPage />);

    expect(screen.getByRole('heading', { name: /disputes & mediation/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /open appeals center/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /merchant returns/i })).toBeTruthy();
    expect(screen.getByText(/Peer Mediation Component/i)).toBeTruthy();
    expect(await screen.findByText(/2 merchant cases/i)).toBeTruthy();
  });
});
