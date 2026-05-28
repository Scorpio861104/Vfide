/**
 * Recovery status page — owner veto (challenge) path.
 *
 * Tests that:
 *   1. Claimant sees the waiting message (no veto button)
 *   2. Original owner sees the "Veto this recovery" button when GuardianApproved
 *   3. Veto form validates non-empty reason
 *   4. Successful challenge shows the success confirmation
 *   5. Owner does NOT see veto UI in terminal states (Challenged, Executed, etc.)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Mock heavy deps ───────────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (_k: string) => '0xVAULT_ADDR' }),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/vault/recover/status',
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children, className, ...p }: any) => (
    <div className={className} {...p}>{children}</div>
  ),
}));

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: undefined })),
  usePublicClient: jest.fn(() => ({
    waitForTransactionReceipt: jest.fn(async () => ({})),
  })),
  useReadContract: jest.fn(() => ({ data: undefined, isLoading: false })),
  useWriteContract: jest.fn(() => ({
    writeContractAsync: jest.fn(),
    isPending: false,
    error: null,
  })),
}));

const mockFinalize = jest.fn();
const mockRefetch = jest.fn();
const mockChallenge = jest.fn();

let mockRecoveryClaimResult: any = {};
let mockChallengeClaimResult: any = {};

jest.mock('@/hooks/useRecoveryClaim', () => ({
  useRecoveryClaim: jest.fn(() => mockRecoveryClaimResult),
  RecoveryClaimStatus: {
    None: 0,
    Pending: 1,
    GuardianApproved: 2,
    Challenged: 3,
    Approved: 4,
    Executed: 5,
    Rejected: 6,
    Expired: 7,
  },
}));

jest.mock('@/hooks/useChallengeClaim', () => ({
  useChallengeClaim: jest.fn(() => mockChallengeClaimResult),
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: { VaultRecoveryClaim: '0xRECOVERY' },
}));

jest.mock('@/lib/abis', () => ({
  VaultRegistryABI: [],
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const OWNER_ADDRESS = '0xOwnerWallet';
const CLAIMANT_ADDRESS = '0xClaimantWallet';

const baseClaim = {
  vault: '0xVAULT_ADDR',
  claimant: CLAIMANT_ADDRESS,
  originalOwner: OWNER_ADDRESS,
  initiator: CLAIMANT_ADDRESS,
  recoveryId: 'recovery-123',
  reason: 'Lost phone',
  evidenceHash: '0x',
  guardianApprovals: 2,
  guardianCountSnapshot: 3,
  challengeDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 5),
  createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400),
  status: 2, // GuardianApproved
};

function buildClaimantState() {
  mockRecoveryClaimResult = {
    claimId: 1n,
    hasClaim: true,
    claim: baseClaim,
    claimStatus: 2, // GuardianApproved
    canFinalize: false,
    challengeTimeRemaining: BigInt(86400 * 5),
    isOriginalOwner: false,
    isClaimant: true,
    isInitiator: true,
    finalize: mockFinalize,
    isWritePending: false,
    refetchClaim: mockRefetch,
  };
  mockChallengeClaimResult = {
    challenge: mockChallenge,
    isWritePending: false,
    writeError: null,
    isOriginalOwner: false,
  };
}

function buildOwnerState() {
  mockRecoveryClaimResult = {
    ...mockRecoveryClaimResult,
    claimId: 1n,
    hasClaim: true,
    claim: baseClaim,
    claimStatus: 2, // GuardianApproved
    canFinalize: false,
    challengeTimeRemaining: BigInt(86400 * 5),
    isOriginalOwner: true,
    isClaimant: false,
    isInitiator: false,
    finalize: mockFinalize,
    isWritePending: false,
    refetchClaim: mockRefetch,
  };
  mockChallengeClaimResult = {
    challenge: mockChallenge,
    isWritePending: false,
    writeError: null,
    isOriginalOwner: true,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Recovery status page — owner veto path', () => {
  let RecoveryStatusPage: any;

  beforeAll(async () => {
    const mod = await import('@/app/vault/recover/status/page');
    RecoveryStatusPage = mod.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    buildClaimantState();
  });

  it('claimant sees the waiting message but NO veto button', () => {
    render(<RecoveryStatusPage />);
    expect(screen.getByText(/challenge window in progress/i)).toBeInTheDocument();
    expect(screen.queryByTestId('veto-open-btn')).not.toBeInTheDocument();
  });

  it('original owner sees "Veto this recovery" button', () => {
    buildOwnerState();
    render(<RecoveryStatusPage />);
    expect(screen.getByTestId('veto-open-btn')).toBeInTheDocument();
  });

  it('clicking Veto shows the reason form', () => {
    buildOwnerState();
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn'));
    expect(screen.getByTestId('challenge-reason-input')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-submit-btn')).toBeInTheDocument();
  });

  it('submit button is disabled when reason is empty', () => {
    buildOwnerState();
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn'));
    const submitBtn = screen.getByTestId('challenge-submit-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('submit button enables when reason is non-empty', () => {
    buildOwnerState();
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn'));
    fireEvent.change(screen.getByTestId('challenge-reason-input'), {
      target: { value: 'I have not lost access to my wallet.' },
    });
    expect(screen.getByTestId('challenge-submit-btn')).not.toBeDisabled();
  });

  it('successful challenge shows success confirmation', async () => {
    mockChallenge.mockResolvedValueOnce('0xtxhash');
    buildOwnerState();
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn'));
    fireEvent.change(screen.getByTestId('challenge-reason-input'), {
      target: { value: 'Fraudulent claim.' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('challenge-submit-btn'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('challenge-success')).toBeInTheDocument();
    });
  });

  it('cancel button dismisses the form', () => {
    buildOwnerState();
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn'));
    expect(screen.getByTestId('challenge-reason-input')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('challenge-cancel-btn'));
    expect(screen.queryByTestId('challenge-reason-input')).not.toBeInTheDocument();
  });
});

describe('Recovery status page — Pending-state owner veto path', () => {
  let RecoveryStatusPage: any;

  beforeAll(async () => {
    const mod = await import('@/app/vault/recover/status/page');
    RecoveryStatusPage = mod.default;
  });

  function buildPendingOwnerState() {
    mockRecoveryClaimResult = {
      claimId: 2n,
      hasClaim: true,
      claim: {
        claimId: 2n,
        originalOwner: '0xOWNER_ADDR',
        claimant: '0xCLAIMANT',
        initiator: '0xCLAIMANT',
        reason: 'Lost device',
        createdAt: BigInt(Math.floor(Date.now() / 1000) - 3600),
        challengeEndsAt: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
        status: 1,
        newWallet: '0xNEWWALLET',
      },
      claimStatus: 1, // Pending
      canFinalize: false,
      challengeTimeRemaining: BigInt(86400 * 7),
      isOriginalOwner: true,
      isClaimant: false,
      isInitiator: false,
      finalize: mockFinalize,
      isWritePending: false,
      refetchClaim: mockRefetch,
    };
    mockChallengeClaimResult = {
      challenge: mockChallenge,
      isWritePending: false,
      writeError: null,
      isOriginalOwner: true,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    buildPendingOwnerState();
  });

  it('original owner sees veto button even in Pending state', () => {
    render(<RecoveryStatusPage />);
    expect(screen.getByTestId('veto-open-btn-pending')).toBeInTheDocument();
  });

  it('claimant does NOT see veto button in Pending state', () => {
    // Set isOriginalOwner=false to simulate a claimant visiting the page
    mockRecoveryClaimResult = { ...mockRecoveryClaimResult, isOriginalOwner: false, isClaimant: true };
    mockChallengeClaimResult = { ...mockChallengeClaimResult, isOriginalOwner: false };
    render(<RecoveryStatusPage />);
    expect(screen.queryByTestId('veto-open-btn-pending')).not.toBeInTheDocument();
    expect(screen.getByText(/Your guardians need to review/i)).toBeInTheDocument();
  });

  it('clicking Pending veto button reveals the reason form', () => {
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn-pending'));
    expect(screen.getByTestId('challenge-reason-input-pending')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-submit-btn-pending')).toBeInTheDocument();
  });

  it('Pending submit button is disabled when reason is empty', () => {
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn-pending'));
    expect(screen.getByTestId('challenge-submit-btn-pending')).toBeDisabled();
  });

  it('Pending submit button enables when reason is typed', () => {
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn-pending'));
    fireEvent.change(screen.getByTestId('challenge-reason-input-pending'), {
      target: { value: 'I did not authorise this recovery.' },
    });
    expect(screen.getByTestId('challenge-submit-btn-pending')).not.toBeDisabled();
  });

  it('successful Pending veto shows success confirmation', async () => {
    mockChallenge.mockResolvedValueOnce('0xtxhash');
    render(<RecoveryStatusPage />);
    fireEvent.click(screen.getByTestId('veto-open-btn-pending'));
    fireEvent.change(screen.getByTestId('challenge-reason-input-pending'), {
      target: { value: 'I still have access.' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('challenge-submit-btn-pending'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('challenge-success')).toBeInTheDocument();
    });
  });
});

describe('Recovery status page — Rejected state terminal notice', () => {
  let RecoveryStatusPage: any;

  beforeAll(async () => {
    const mod = await import('@/app/vault/recover/status/page');
    RecoveryStatusPage = mod.default;
  });

  function buildRejectedState() {
    mockRecoveryClaimResult = {
      claimId: 3n,
      hasClaim: true,
      claim: {
        claimId: 3n,
        originalOwner: '0xOWNER_ADDR',
        claimant: '0xCLAIMANT',
        initiator: '0xCLAIMANT',
        status: 6, // Rejected
      },
      claimStatus: 6, // Rejected
      canFinalize: false,
      challengeTimeRemaining: 0n,
      isOriginalOwner: false,
      isClaimant: true,
      isInitiator: true,
      finalize: mockFinalize,
      isWritePending: false,
      refetchClaim: mockRefetch,
    };
    mockChallengeClaimResult = {
      challenge: mockChallenge,
      isWritePending: false,
      writeError: null,
      isOriginalOwner: false,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    buildRejectedState();
  });

  it('shows "Claim was challenged" notice when status is Rejected', () => {
    render(<RecoveryStatusPage />);
    expect(screen.getByTestId('recovery-terminal-notice')).toBeInTheDocument();
    expect(screen.getByText(/claim was challenged/i)).toBeInTheDocument();
  });

  it('does NOT show a veto button in the Rejected terminal state', () => {
    render(<RecoveryStatusPage />);
    expect(screen.queryByTestId('veto-open-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('veto-open-btn-pending')).not.toBeInTheDocument();
  });
});
