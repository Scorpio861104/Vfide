import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockCreateVault = jest.fn(async () => {});
const mockRequestRecovery = jest.fn(async (_candidate: `0x${string}`) => {});
const mockApproveRecovery = jest.fn(async () => {});
const mockFinalizeRecovery = jest.fn(async () => {});
const mockCancelRecovery = jest.fn(async () => {});

let mockVaultHubState: {
  vaultAddress?: `0x${string}`;
  hasVault: boolean;
  isLoadingVault: boolean;
  createVault: () => Promise<void>;
  isCreatingVault: boolean;
};

let mockVaultRecoveryState: {
  recoveryStatus: {
    isActive: boolean;
    proposedOwner: string | null;
    approvals: number;
    threshold: number;
    expiryTime: number | null;
    daysRemaining: number | null;
  };
  guardianCount: number;
  isUserGuardian: boolean;
  isUserGuardianMature: boolean;
  isWritePending: boolean;
  requestRecovery: (_candidate: `0x${string}`) => Promise<void>;
  approveRecovery: () => Promise<void>;
  finalizeRecovery: () => Promise<void>;
  cancelRecovery: () => Promise<void>;
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

jest.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: true,
    address: '0x1111111111111111111111111111111111111111' as const,
  }),
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

describe('Guardians page Chain of Return', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockVaultHubState = {
      vaultAddress: '0x2222222222222222222222222222222222222222',
      hasVault: true,
      isLoadingVault: false,
      createVault: mockCreateVault,
      isCreatingVault: false,
    };

    mockVaultRecoveryState = {
      recoveryStatus: {
        isActive: false,
        proposedOwner: null,
        approvals: 0,
        threshold: 0,
        expiryTime: null,
        daysRemaining: null,
      },
      guardianCount: 2,
      isUserGuardian: false,
      isUserGuardianMature: false,
      isWritePending: false,
      requestRecovery: mockRequestRecovery,
      approveRecovery: mockApproveRecovery,
      finalizeRecovery: mockFinalizeRecovery,
      cancelRecovery: mockCancelRecovery,
    };
  });

  it('renders active recovery data from hook state and updated timelock copy', async () => {
    mockVaultRecoveryState = {
      ...mockVaultRecoveryState,
      recoveryStatus: {
        isActive: true,
        proposedOwner: '0x3333333333333333333333333333333333333333',
        approvals: 1,
        threshold: 2,
        expiryTime: Date.now() + 25 * 24 * 60 * 60 * 1000,
        daysRemaining: 25,
      },
      guardianCount: 2,
      isUserGuardian: true,
      isUserGuardianMature: true,
    };

    renderGuardiansPage();
    fireEvent.click(screen.getByRole('tab', { name: /Chain of Return/i }));

    expect(await screen.findByText(/Active Recovery Request/i)).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.getByText('25 days')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Approve Recovery \(Guardian\)/i })).toBeTruthy();
    expect(screen.getByText(/minimum 7-day timelock/i)).toBeTruthy();
    expect(screen.queryByText(/recover instantly/i)).toBeNull();
  });

  it('shows Create Vault action when user has no vault', async () => {
    mockVaultHubState = {
      vaultAddress: undefined,
      hasVault: false,
      isLoadingVault: false,
      createVault: mockCreateVault,
      isCreatingVault: false,
    };

    renderGuardiansPage();
    fireEvent.click(screen.getByRole('tab', { name: /Chain of Return/i }));

    expect(await screen.findByText(/Create Vault First/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Create Vault/i }));

    await waitFor(() => {
      expect(mockCreateVault).toHaveBeenCalledTimes(1);
    });
  });
});
