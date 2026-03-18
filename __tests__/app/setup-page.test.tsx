import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

let mockChainId = 84532;
let mockBalance = { formatted: '0.1000' } as { formatted: string } | undefined;

const mockCopyWithId = jest.fn();

const renderSetupPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/setup/page');
  const SetupPage = pageModule.default as React.ComponentType;
  return render(<SetupPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
  useChainId: () => mockChainId,
  useBalance: () => ({ data: mockBalance }),
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/lib/testnet', () => ({
  CURRENT_CHAIN_ID: 84532,
  FAUCET_URLS: {
    coinbase: 'https://coinbase.example/faucet',
    alchemy: 'https://alchemy.example/faucet',
    quicknode: 'https://quicknode.example/faucet',
  },
}));

jest.mock('@/lib/validation', () => ({
  safeParseFloat: (value: string, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  },
}));

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyWithId: () => ({
    copiedId: null,
    copyWithId: mockCopyWithId,
  }),
}));

describe('Setup page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    mockChainId = 84532;
    mockBalance = { formatted: '0.1000' };

    const win = window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<unknown> } };
    if (!win.ethereum) {
      win.ethereum = {
        request: jest.fn(async ({ method }: { method: string }) => {
          if (method === 'wallet_switchEthereumChain') {
            throw { code: 4902 };
          }
          return true;
        }),
      };
    } else {
      win.ethereum.request = jest.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_switchEthereumChain') {
          throw { code: 4902 };
        }
        return true;
      });
    }
  });

  it('shows wallet connect step when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    renderSetupPage();

    expect(screen.getByRole('heading', { name: /Testnet Setup Guide/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });

  it('renders completion state when connected on base sepolia with balance', () => {
    renderSetupPage();

    expect(screen.getByText(/You're All Set!/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Start Using VFIDE/i }).getAttribute('href')).toBe('/token-launch');
  });

  it('attempts add-network flow and supports copy actions in manual setup', async () => {
    mockChainId = 1;
    mockBalance = { formatted: '0.0000' };
    renderSetupPage();

    fireEvent.click(screen.getByRole('button', { name: /Add Base Sepolia to MetaMask/i }));

    await waitFor(() => {
      expect(screen.getByText(/Network added!/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/i }));
    expect(mockCopyWithId).toHaveBeenCalled();
  });
});