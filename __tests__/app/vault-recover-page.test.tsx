import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockReadContract = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<unknown>>;

const renderVaultRecoverPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/recover/page');
  const VaultRecoverPage = pageModule.default as React.ComponentType;
  return render(<VaultRecoverPage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VaultRegistry: '0x1111111111111111111111111111111111111111',
    VaultHub: '0x2222222222222222222222222222222222222222',
    Seer: '0x3333333333333333333333333333333333333333',
    BadgeNFT: '0x4444444444444444444444444444444444444444',
  },
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const,
  }),
  usePublicClient: () => ({
    readContract: mockReadContract,
  }),
}));

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  keccak256: (value: string) => `hash:${value}`,
  stringToHex: (value: string) => value,
  zeroAddress: '0x0000000000000000000000000000000000000000',
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

  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
    useTransform: () => 0,
    useSpring: () => 0,
  };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Search: Icon,
    Shield: Icon,
    Key: Icon,
    Mail: Icon,
    User: Icon,
    Users: Icon,
    AlertCircle: Icon,
    ChevronRight: Icon,
    Clock: Icon,
    CheckCircle2: Icon,
    XCircle: Icon,
    Sparkles: Icon,
    Fingerprint: Icon,
    ArrowRight: Icon,
    Lock: Icon,
    Unlock: Icon,
    HelpCircle: Icon,
    Radar: Icon,
    Scan: Icon,
    RefreshCw: Icon,
    Activity: Icon,
    Award: Icon,
    Timer: Icon,
    ShieldCheck: Icon,
    KeyRound: Icon,
    UserCheck: Icon,
    Zap: Icon,
  };
});

describe('Vault recover page logic pathways', () => {
  beforeEach(() => {
    mockReadContract.mockReset();
  });

  it('shows validation error when search is submitted with an empty query', async () => {
    renderVaultRecoverPage();

    fireEvent.click(screen.getByRole('button', { name: /Search Vault/i }));

    expect(await screen.findByText(/Please enter a search term/i)).toBeTruthy();
  });

  it('validates guardian search input as a wallet address', async () => {
    renderVaultRecoverPage();

    fireEvent.click(screen.getByRole('button', { name: /Guardian Through your guardian/i }));

    const input = screen.getByPlaceholderText(/Enter guardian wallet address/i);
    fireEvent.change(input, { target: { value: 'not-an-address' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Vault/i }));

    expect(await screen.findByText(/Please enter a valid guardian wallet address/i)).toBeTruthy();
    expect(mockReadContract).not.toHaveBeenCalled();
  });

  it('finds a recoverable vault and completes claim modal step progression', async () => {
    const foundVault = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const ownerAddress = '0xcccccccccccccccccccccccccccccccccccccccc';

    mockReadContract
      .mockResolvedValueOnce(foundVault)
      .mockResolvedValueOnce([ownerAddress, 1n, false, true])
      .mockResolvedValueOnce(1234n)
      .mockResolvedValueOnce(2n);

    renderVaultRecoverPage();

    const input = screen.getByPlaceholderText(/Enter your secret recovery phrase/i);
    fireEvent.change(input, { target: { value: 'my-secret-recovery' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Vault/i }));

    expect(await screen.findByText(/Recovery Available/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Claim Vault/i }));
    expect(await screen.findByText(/Claim Your Vault/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/Enter your secret recovery phrase/i).length).toBeGreaterThan(1);
    });

    const continueButton = screen.getByRole('button', { name: /Continue/i });
    expect(continueButton.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getAllByPlaceholderText(/Enter your secret recovery phrase/i)[1], {
      target: { value: 'recovery-id-value' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue/i }).hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    expect(await screen.findByText(/Claim Submitted!/i)).toBeTruthy();
  });
});
