import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockCreateVault = jest.fn(async () => {});
const mockWriteContractAsync = jest.fn(async (_config?: Record<string, unknown>) => '0xhash');
const mockWaitForTransactionReceipt = jest.fn(async () => ({}));
const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();

let mockVaultHubState: {
  vaultAddress?: `0x${string}`;
  hasVault: boolean;
  isLoadingVault: boolean;
  createVault: () => Promise<void>;
  isCreatingVault: boolean;
};

let mockVaultRecoveryState: {
  vaultOwner?: `0x${string}`;
  nextOfKin?: `0x${string}`;
  inheritanceStatus: {
    isActive: boolean;
    approvals: number;
    threshold: number;
    denied: boolean;
    expiryTime: number | null;
    daysRemaining: number | null;
  };
  isUserGuardian: boolean;
  isUserGuardianMature: boolean;
  isWritePending: boolean;
  setNextOfKinAddress: (_next: `0x${string}`) => Promise<void>;
  requestInheritance: () => Promise<void>;
  approveInheritance: () => Promise<void>;
  denyInheritance: () => Promise<void>;
  finalizeInheritance: () => Promise<void>;
  cancelInheritance: () => Promise<void>;
  guardianCancelInheritance: () => Promise<void>;
};

let mockInboxVaultState: {
  owner: `0x${string}`;
  nextOfKin: `0x${string}`;
  isGuardian: boolean;
  isGuardianMature: boolean;
  inheritance: [boolean, bigint, bigint, bigint, boolean];
};

const renderGuardiansPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/guardians/page');
  const GuardiansPage = pageModule.default as React.ComponentType;
  return render(<GuardiansPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}));

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => mockVaultHubState,
}));

jest.mock('@/hooks/useVaultRecovery', () => ({
  useVaultRecovery: () => mockVaultRecoveryState,
}));

jest.mock('@/lib/contracts', () => ({
  USER_VAULT_ABI: [],
  isCardBoundVaultMode: () => false,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: true,
    address: '0x1111111111111111111111111111111111111111' as const,
  }),
  useReadContract: ({ functionName }: { functionName: string }) => {
    if (functionName === 'owner') {
      return { data: mockInboxVaultState.owner };
    }
    if (functionName === 'nextOfKin') {
      return { data: mockInboxVaultState.nextOfKin };
    }
    if (functionName === 'isGuardian') {
      return { data: mockInboxVaultState.isGuardian };
    }
    if (functionName === 'isGuardianMature') {
      return { data: mockInboxVaultState.isGuardianMature };
    }
    if (functionName === 'getInheritanceStatus') {
      return { data: mockInboxVaultState.inheritance, refetch: jest.fn() };
    }
    return { data: undefined, refetch: jest.fn() };
  },
  useWriteContract: () => ({
    writeContractAsync: mockWriteContractAsync,
    isPending: false,
  }),
  usePublicClient: () => ({
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
  }),
  useSignMessage: () => ({
    signMessageAsync: jest.fn(),
  }),
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
  };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Shield: Icon,
    Users: Icon,
    Clock: Icon,
    CheckCircle2: Icon,
    AlertCircle: Icon,
    Key: Icon,
    Heart: Icon,
    UserPlus: Icon,
    UserMinus: Icon,
    RefreshCw: Icon,
    ArrowRightCircle: Icon,
    Timer: Icon,
    Lock: Icon,
    FileText: Icon,
  };
});

describe('Guardians page Next of Kin inbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockVaultHubState = {
      vaultAddress: '0x2222222222222222222222222222222222222222',
      hasVault: true,
      isLoadingVault: false,
      createVault: mockCreateVault,
      isCreatingVault: false,
    };

    mockVaultRecoveryState = {
      vaultOwner: '0x1111111111111111111111111111111111111111',
      nextOfKin: '0x1111111111111111111111111111111111111111',
      inheritanceStatus: {
        isActive: true,
        approvals: 1,
        threshold: 2,
        denied: false,
        expiryTime: Date.now() + 24 * 60 * 60 * 1000,
        daysRemaining: 1,
      },
      isUserGuardian: false,
      isUserGuardianMature: false,
      isWritePending: false,
      setNextOfKinAddress: jest.fn(async () => {}),
      requestInheritance: jest.fn(async () => {}),
      approveInheritance: jest.fn(async () => {}),
      denyInheritance: jest.fn(async () => {}),
      finalizeInheritance: jest.fn(async () => {}),
      cancelInheritance: jest.fn(async () => {}),
      guardianCancelInheritance: jest.fn(async () => {}),
    };

    mockInboxVaultState = {
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nextOfKin: '0x1111111111111111111111111111111111111111',
      isGuardian: false,
      isGuardianMature: false,
      inheritance: [true, 1n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('submits Next of Kin fraud report from inbox card', async () => {
    renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Next of Kin/i }));

    const inboxInputs = await screen.findAllByRole('textbox');
    fireEvent.change(inboxInputs[0], {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Vault to Kin Inbox/i }));

    const reportButton = await screen.findByRole('button', { name: /Report Fraud/i });
    fireEvent.click(reportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/security/next-of-kin-fraud-events',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const firstCall = mockFetch.mock.calls[0] as [RequestInfo | URL, RequestInit | undefined] | undefined;
    const init = firstCall?.[1];
    const parsed = JSON.parse(String(init?.body));
    expect(parsed.source).toBe('next-of-kin-inbox');
    expect(parsed.vault).toBe('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(parsed.nextOfKin).toBe('0x1111111111111111111111111111111111111111');
  });

  it('keeps role-gated inbox actions disabled for unrelated wallet', async () => {
    mockInboxVaultState = {
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nextOfKin: '0x9999999999999999999999999999999999999999',
      isGuardian: false,
      isGuardianMature: false,
      inheritance: [true, 1n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Next of Kin/i }));

    const inboxInputs = await screen.findAllByRole('textbox');
    fireEvent.change(inboxInputs[0], {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Vault to Kin Inbox/i }));

    const requestBtn = await screen.findByRole('button', { name: /Request \(Next of Kin\)/i });
    const finalizeButtons = screen.getAllByRole('button', { name: /Finalize \(Next of Kin\)/i });
    const finalizeBtn = finalizeButtons[finalizeButtons.length - 1]!;
    const approveButtons = screen.getAllByRole('button', { name: /Approve \(Guardian\)/i });
    const approveBtn = approveButtons[approveButtons.length - 1]!;
    const cancelVoteButtons = screen.getAllByRole('button', { name: /Cancel Vote \(Guardian\)/i });
    const cancelVoteBtn = cancelVoteButtons[cancelVoteButtons.length - 1]!;
    const denyButtons = screen.getAllByRole('button', { name: /Deny \(Owner\)/i });
    const denyBtn = denyButtons.find((btn) => btn.className.includes('px-3 py-2')) ?? denyButtons[denyButtons.length - 1]!;
    const cancelButtons = screen.getAllByRole('button', { name: /Cancel \(Owner\)/i });
    const cancelBtn =
      cancelButtons.find((btn) => btn.className.includes('px-3 py-2')) ??
      cancelButtons[cancelButtons.length - 1]!;

    expect(requestBtn.hasAttribute('disabled')).toBe(true);
    expect(finalizeBtn.hasAttribute('disabled')).toBe(true);
    expect(approveBtn.hasAttribute('disabled')).toBe(true);
    expect(cancelVoteBtn.hasAttribute('disabled')).toBe(true);
    expect(denyBtn.hasAttribute('disabled')).toBe(true);
    // Current UI keeps owner cancel available even when other role-gated actions are disabled.
    expect(cancelBtn.hasAttribute('disabled')).toBe(false);
  });

  it('enables Next of Kin inbox actions for configured heir across claim states', async () => {
    mockInboxVaultState = {
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nextOfKin: '0x1111111111111111111111111111111111111111',
      isGuardian: false,
      isGuardianMature: false,
      inheritance: [false, 0n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    const firstRender = renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Next of Kin/i }));
    const inboxInputs = await screen.findAllByRole('textbox');
    fireEvent.change(inboxInputs[0], {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Vault to Kin Inbox/i }));

    const requestBtn = await screen.findByRole('button', { name: /Request \(Next of Kin\)/i });
    const finalizeButtons = screen.getAllByRole('button', { name: /Finalize \(Next of Kin\)/i });
    const finalizeBtn = finalizeButtons[finalizeButtons.length - 1]!;

    expect(requestBtn.hasAttribute('disabled')).toBe(false);
    expect(finalizeBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.click(requestBtn);

    await waitFor(() => {
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'requestInheritance',
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        })
      );
    });

    firstRender.unmount();
    mockWriteContractAsync.mockClear();

    mockInboxVaultState = {
      ...mockInboxVaultState,
      inheritance: [true, 1n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    const secondRender = renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Next of Kin/i }));
    const inboxInputs2 = await screen.findAllByRole('textbox');
    fireEvent.change(inboxInputs2[0], {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Vault to Kin Inbox/i }));

    const requestBtnActive = await screen.findByRole('button', { name: /Request \(Next of Kin\)/i });
    const finalizeButtonsActive = screen.getAllByRole('button', { name: /Finalize \(Next of Kin\)/i });
    const finalizeBtnActive = finalizeButtonsActive[finalizeButtonsActive.length - 1]!;

    expect(requestBtnActive.hasAttribute('disabled')).toBe(true);
    expect(finalizeBtnActive.hasAttribute('disabled')).toBe(false);

    fireEvent.click(finalizeBtnActive);

    await waitFor(() => {
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'finalizeInheritance',
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        })
      );
    });

    secondRender.unmount();
  });
});
