import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockChainId = 84532;
let mockAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const mockPush = jest.fn();
const mockCopy = jest.fn();

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
  });

  it('renders faucet links and manual network details on testnet', () => {
    renderTestnetPage();

    expect(screen.getByRole('heading', { name: /Get Test ETH/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Coinbase Faucet/i }).getAttribute('href')).toBe('https://coinbase.example/faucet');
    expect(screen.getByRole('link', { name: /Alchemy Faucet/i }).getAttribute('href')).toBe('https://alchemy.example/faucet');
    expect(screen.getByRole('link', { name: /QuickNode Faucet/i }).getAttribute('href')).toBe('https://quicknode.example/faucet');
    expect(screen.getAllByText(/Base Sepolia/i).length).toBeGreaterThan(0);
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
});