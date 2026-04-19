import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockChainId = 84532;
let mockAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const mockPush = jest.fn();
const mockCopy = jest.fn();
let mockFetchResponse: { ok: boolean; status: number; json: () => Promise<unknown> } = {
  ok: true,
  status: 200,
  json: async () => ({ success: true, txHash: '0xdeadbeef' }),
};

const renderTestnetPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/testnet/page');
  const TestnetPage = pageModule.default as React.ComponentType;
  return render(<TestnetPage />);
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: mockAddress }),
  useChainId: () => mockChainId,
}));

jest.mock('@/lib/chains', () => ({
  isTestnetChainId: (id: number) => id === 84532,
}));

jest.mock('@/lib/testnet', () => ({
  FAUCET_URLS: {
    coinbase: 'https://coinbase.example/faucet',
    alchemy: 'https://alchemy.example/faucet',
    quicknode: 'https://quicknode.example/faucet',
  },
}));

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copied: false,
    copy: mockCopy,
  }),
}));

describe('Testnet page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChainId = 84532;
    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    mockFetchResponse = {
      ok: true,
      status: 200,
      json: async () => ({ success: true, txHash: '0xdeadbeef' }),
    };
    global.fetch = jest.fn(async () => mockFetchResponse) as unknown as typeof fetch;
  });

  it('renders faucet links and manual network details on testnet', () => {
    renderTestnetPage();

    expect(screen.getByRole('heading', { name: /Testnet Setup/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Coinbase Faucet/i }).getAttribute('href')).toBe('https://coinbase.example/faucet');
    expect(screen.getByRole('link', { name: /Alchemy Faucet/i }).getAttribute('href')).toBe('https://alchemy.example/faucet');
    expect(screen.getByRole('link', { name: /QuickNode Faucet/i }).getAttribute('href')).toBe('https://quicknode.example/faucet');
    expect(screen.getAllByText(/Base Sepolia/i).length).toBeGreaterThan(0);
  });

  it('back link points to home', () => {
    renderTestnetPage();
    const backLink = screen.getByRole('link', { name: /Back to app/i });
    expect(backLink.getAttribute('href')).toBe('/');
  });

  it('copies connected address when clicked', () => {
    renderTestnetPage();

    fireEvent.click(screen.getByRole('button', { name: /0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/i }));
    expect(mockCopy).toHaveBeenCalledWith('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('redirects away when not on a testnet chain', async () => {
    mockChainId = 1;
    renderTestnetPage();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows claim button when wallet is connected', () => {
    renderTestnetPage();
    expect(screen.getByRole('button', { name: /Claim 10,000 VFIDE/i })).toBeTruthy();
  });

  it('shows disabled state when wallet is not connected', () => {
    mockAddress = undefined;
    renderTestnetPage();
    const claimBtn = screen.getByRole('button', { name: /Connect wallet to claim/i });
    expect(claimBtn).toBeTruthy();
    expect((claimBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls faucet API and shows success on claim', async () => {
    renderTestnetPage();
    fireEvent.click(screen.getByRole('button', { name: /Claim 10,000 VFIDE/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/faucet/claim', expect.objectContaining({ method: 'POST' }));
      expect(screen.getByText(/10,000 VFIDE \+ gas ETH sent/i)).toBeTruthy();
    });
  });

  it('shows tx hash link after successful claim', async () => {
    renderTestnetPage();
    fireEvent.click(screen.getByRole('button', { name: /Claim 10,000 VFIDE/i }));

    await waitFor(() => {
      const txLink = screen.getByRole('link', { name: /View transaction/i });
      expect(txLink.getAttribute('href')).toContain('0xdeadbeef');
    });
  });

  it('handles already-claimed (409) gracefully', async () => {
    mockFetchResponse = { ok: false, status: 409, json: async () => ({ error: 'Already claimed' }) };
    renderTestnetPage();
    fireEvent.click(screen.getByRole('button', { name: /Claim 10,000 VFIDE/i }));

    await waitFor(() => {
      expect(screen.getByText(/Already claimed/i)).toBeTruthy();
    });
  });

  it('shows error message when claim fails', async () => {
    mockFetchResponse = { ok: false, status: 503, json: async () => ({ error: 'Faucet not configured' }) };
    renderTestnetPage();
    fireEvent.click(screen.getByRole('button', { name: /Claim 10,000 VFIDE/i }));

    await waitFor(() => {
      expect(screen.getByText(/Faucet not configured/i)).toBeTruthy();
    });
  });
});