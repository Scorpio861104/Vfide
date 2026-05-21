'use client';

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useProofScore: jest.fn(() => ({
    score: 5000,
    canEndorse: false,
  })),
  useIsMentor: jest.fn(() => ({
    isMentor: false,
  })),
  useBecomeMentor: jest.fn(() => ({
    becomeMentor: jest.fn(),
    isLoading: false,
    isSuccess: false,
  })),
  useMentorInfo: jest.fn(() => ({
    canBecomeMentor: false,
    mentorEligibleAt: null,
  })),

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
  useVaultBalance: jest.fn(() => ({ balance: 0n, isLoading: false, refetch: jest.fn() })),
  useVaultPayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSelfPanic: jest.fn(() => ({ selfPanic: jest.fn(), selfPanicAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCanSelfPanic: jest.fn(() => ({ canSelfPanic: false, isLoading: false, refetch: jest.fn() })),
  useGuardianCancelInheritance: jest.fn(() => ({ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false })),
  useInheritanceStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useQuarantineStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useScoreBreakdown: jest.fn(() => ({ breakdown: undefined, isLoading: false, refetch: jest.fn() })),
  useEndorse: jest.fn(() => ({ endorse: jest.fn(), endorseAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCustomerTrustScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useIsMerchant: jest.fn(() => ({ isMerchant: false, isLoading: false, refetch: jest.fn() })),
  useRegisterMerchant: jest.fn(() => ({ registerMerchant: jest.fn(), registerMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  useGetAutoConvert: jest.fn(() => ({ autoConvertEnabled: false, isLoading: false, refetch: jest.fn(), isAvailable: true })),
  useSetAutoConvert: jest.fn(() => ({ setAutoConvert: jest.fn(), setAutoConvertAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetPayoutAddress: jest.fn(() => ({ setPayoutAddress: jest.fn(), setPayoutAddressAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetMerchantPullPermit: jest.fn(() => ({ setPermit: jest.fn(), setPermitAsync: jest.fn(), isPending: false })),
  useProcessPayment: jest.fn(() => ({ processPayment: jest.fn(), processPaymentAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  usePayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useMerchantPaymentStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useBadgeNFTs: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}));

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ isConnected: true, address: '0x123',
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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
})),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { BecomeMentorCard } from '@/components/trust/BecomeMentorCard';
import * as hooks from '@/lib/vfide-hooks';
import * as wagmi from 'wagmi';

describe('BecomeMentorCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(wagmi.useAccount).mockReturnValue({ isConnected: true, address: '0x123' } as any);
  });

  describe('When Not Connected', () => {
    it('should return null when wallet not connected', () => {
      jest.mocked(wagmi.useAccount).mockReturnValue({ isConnected: false, address: undefined } as any);
      
      const { container } = render(<BecomeMentorCard />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('When Already Mentor', () => {
    it('should return null when user is already a mentor', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: true } as any);
      
      const { container } = render(<BecomeMentorCard />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('When Eligible User', () => {
    beforeEach(() => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 5000,
        canEndorse: false,
      } as any);
    });

    it('should render Become a Mentor title', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Become a Mentor/)).toBeInTheDocument();
    });

    it('should render help description', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Help new users succeed/)).toBeInTheDocument();
    });

    it('should show score requirement', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/ProofScore ≥ 8,000/)).toBeInTheDocument();
    });

    it('should show current score', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Current:/)).toBeInTheDocument();
      // Score formatting may vary
      const container = screen.getByText(/Current:/).parentElement;
      expect(container?.textContent).toContain('5');
    });

    it('should show time requirement', () => {
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Maintain 8,000\+ for 30 Days/)).toBeInTheDocument();
    });

    it('should show details toggle button', () => {
      render(<BecomeMentorCard />);
      
      const toggleButton = screen.getByText('▶');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle details on click', () => {
      render(<BecomeMentorCard />);
      
      const toggleButton = screen.getByText('▶');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    it('should show mentor benefits when expanded', () => {
      render(<BecomeMentorCard />);
      
      const toggleButton = screen.getByText('▶');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Mentor Benefits:')).toBeInTheDocument();
      expect(screen.getByText(/Sponsor up to 10 mentees/)).toBeInTheDocument();
    });
  });

  describe('When Requirements Met', () => {
    beforeEach(() => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 9000,
        canEndorse: true,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: true,
        mentorEligibleAt: Math.floor(Date.now() / 1000) - 1000,
      } as any);
    });

    it('should show checkmarks for met requirements', () => {
      render(<BecomeMentorCard />);
      
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThanOrEqual(2);
    });

    it('should enable register button when all requirements met', () => {
      const mockBecome = jest.fn();
      jest.mocked(hooks.useBecomeMentor).mockReturnValue({
        becomeMentor: mockBecome,
        isLoading: false,
        isSuccess: false,
      } as any);
      
      render(<BecomeMentorCard />);
      
      const button = screen.getByRole('button', { name: /Register as Mentor/i });
      expect(button).not.toBeDisabled();
    });

    it('should call becomeMentor on button click', () => {
      const mockBecome = jest.fn();
      jest.mocked(hooks.useBecomeMentor).mockReturnValue({
        becomeMentor: mockBecome,
        isLoading: false,
        isSuccess: false,
      } as any);
      
      render(<BecomeMentorCard />);
      
      const button = screen.getByRole('button', { name: /Register as Mentor/i });
      fireEvent.click(button);
      
      expect(mockBecome).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when registering', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 9000,
        canEndorse: true,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: true,
        mentorEligibleAt: null,
      } as any);
      jest.mocked(hooks.useBecomeMentor).mockReturnValue({
        becomeMentor: jest.fn(),
        isLoading: true,
        isSuccess: false,
      } as any);
      
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Registering/)).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should show success message after registration', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 9000,
        canEndorse: true,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: true,
        mentorEligibleAt: null,
      } as any);
      jest.mocked(hooks.useBecomeMentor).mockReturnValue({
        becomeMentor: jest.fn(),
        isLoading: false,
        isSuccess: true,
      } as any);
      
      render(<BecomeMentorCard />);
      
      // Text is "✅ Registered as Mentor!"
      expect(screen.getByText(/Registered as Mentor/)).toBeInTheDocument();
    });
  });

  describe('Countdown Display', () => {
    it('should show days remaining when time requirement not met', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 9000,
        canEndorse: true,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: false,
        mentorEligibleAt: Math.floor(Date.now() / 1000) + (10 * 24 * 60 * 60),
      } as any);
      
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/complete cooldown/i)).toBeInTheDocument();
    });
  });

  describe('Not Eligible Message', () => {
    it('should show message to increase ProofScore when not meeting score requirement', () => {
      jest.mocked(hooks.useIsMentor).mockReturnValue({ isMentor: false } as any);
      jest.mocked(hooks.useProofScore).mockReturnValue({
        score: 5000,
        canEndorse: false,
      } as any);
      jest.mocked(hooks.useMentorInfo).mockReturnValue({
        canBecomeMentor: false,
        mentorEligibleAt: null,
      } as any);
      
      render(<BecomeMentorCard />);
      
      expect(screen.getByText(/Increase your ProofScore to qualify/)).toBeInTheDocument();
    });
  });
});
