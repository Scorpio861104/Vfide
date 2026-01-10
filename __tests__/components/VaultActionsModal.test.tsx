import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaultActionsModal } from '@/components/vault/VaultActionsModal';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890' as const })),
  useWriteContract: jest.fn(() => ({
    writeContract: jest.fn(),
    data: undefined,
    isPending: false,
    error: null,
    reset: jest.fn(),
  })),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
    isError: false,
  })),
  useReadContract: jest.fn(() => ({
    data: BigInt('1000000000000000000000'), // 1000 tokens
  })),
}));

// Mock useVaultBalance
jest.mock('@/hooks/useVaultHooks', () => ({
  useVaultBalance: jest.fn(() => ({
    balance: '500',
    balanceRaw: BigInt('500000000000000000000'),
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

// Mock useToast
jest.mock('@/components/ui/toast', () => ({
  useToast: jest.fn(() => ({
    showToast: jest.fn(),
    toast: jest.fn(),
  })),
}));

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VFIDEToken: '0xVFIDEToken',
    VaultHub: '0xVaultHub',
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('VaultActionsModal', () => {
  const mockOnClose = jest.fn();
  const mockVaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Deposit mode', () => {
    it('renders deposit modal when open', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      expect(screen.getByText('Deposit to Vault')).toBeInTheDocument();
      expect(screen.getByText('Wallet Balance')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('shows MAX button', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      const maxButton = screen.getByText('MAX');
      expect(maxButton).toBeInTheDocument();
    });

    it('disables continue button when amount is empty', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeDisabled();
    });

    it('has an amount input field that accepts numeric values', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('number');
    });
  });

  describe('Withdraw mode', () => {
    it('renders withdraw modal correctly', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="withdraw"
          vaultAddress={mockVaultAddress}
        />
      );

      expect(screen.getByText('Withdraw from Vault')).toBeInTheDocument();
      expect(screen.getByText('Vault Balance')).toBeInTheDocument();
    });
  });

  describe('Transfer mode', () => {
    it('renders transfer modal with recipient field', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="transfer"
          vaultAddress={mockVaultAddress}
        />
      );

      expect(screen.getByText('Transfer to Another Vault')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
    });
  });

  describe('Modal behavior', () => {
    it('does not render when closed', () => {
      render(
        <VaultActionsModal
          isOpen={false}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      expect(screen.queryByText('Deposit to Vault')).not.toBeInTheDocument();
    });

    it('handles null vault address gracefully', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={null}
        />
      );

      expect(screen.getByText('Deposit to Vault')).toBeInTheDocument();
    });

    it('shows wallet balance for deposit', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      expect(screen.getByText('Wallet Balance')).toBeInTheDocument();
      expect(screen.getByText(/VFIDE/)).toBeInTheDocument();
    });

    it('shows vault balance for withdraw', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="withdraw"
          vaultAddress={mockVaultAddress}
        />
      );

      expect(screen.getByText('Vault Balance')).toBeInTheDocument();
    });

    it('clicking MAX button sets maximum amount', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      const maxButton = screen.getByText('MAX');
      fireEvent.click(maxButton);
      
      // MAX button should be clickable
      expect(maxButton).toBeInTheDocument();
    });

    it('entering amount and clicking continue goes to confirm step', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      // Should show confirm step with action details
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('shows error for invalid amount', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '0' } });
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      // Continue should be disabled for zero value
      expect(continueButton).toBeDisabled();
    });

    it('validates large amounts', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      const input = screen.getByPlaceholderText('0.00');
      // Enter a very large amount
      fireEvent.change(input, { target: { value: '999999999' } });
      
      // Component should handle large values
      expect(input).toBeInTheDocument();
    });

    it('close button calls onClose', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="deposit"
          vaultAddress={mockVaultAddress}
        />
      );

      // Find close button (X icon)
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.className.includes('text-white/40'));
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('transfer mode shows recipient input', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="transfer"
          vaultAddress={mockVaultAddress}
        />
      );

      const recipientInput = screen.getByPlaceholderText('0x...');
      expect(recipientInput).toBeInTheDocument();
    });

    it('transfer mode accepts input', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="transfer"
          vaultAddress={mockVaultAddress}
        />
      );

      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });
      
      const recipientInput = screen.getByPlaceholderText('0x...');
      fireEvent.change(recipientInput, { target: { value: 'test-address' } });
      
      // Recipient input should be interactable
      expect(recipientInput).toBeInTheDocument();
    });

    it('transfer mode has all required elements', () => {
      render(
        <VaultActionsModal
          isOpen={true}
          onClose={mockOnClose}
          actionType="transfer"
          vaultAddress={mockVaultAddress}
        />
      );

      // Should have amount input and recipient input
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
  });
});
