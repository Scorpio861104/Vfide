import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const mockWriteContract = jest.fn();

const renderTokenLaunchPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/token-launch/page');
  const TokenLaunchPage = pageModule.default as React.ComponentType;
  return render(<TokenLaunchPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
  useWriteContract: () => ({
    writeContract: mockWriteContract,
    data: undefined,
    isPending: false,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
  useReadContract: () => ({ data: 0n }),
  useGasPrice: () => ({ data: 1n }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

jest.mock('@/lib/validation', () => ({
  safeParseFloat: (value: string, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  },
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

jest.mock('@/components/wallet/QuickWalletConnect', () => ({
  QuickWalletConnect: () => <button>Connect Wallet</button>,
}));

jest.mock('@/hooks/useEthPrice', () => ({
  useEthPrice: () => ({ ethPrice: 2500 }),
}));

describe('Token launch page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('renders launch hero and tier selection content', () => {
    renderTokenLaunchPage();

    expect(screen.getByRole('heading', { name: /Join VFIDE Governance/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Step 1: Select Your Commitment Tier/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Founding$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Oath$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Public$/i })).toBeTruthy();
  });

  it('allows selecting tier and amount to show purchase summary', () => {
    renderTokenLaunchPage();

    fireEvent.click(screen.getByText('Oath'));
    fireEvent.change(screen.getByLabelText(/VFIDE token amount/i), { target: { value: '1000' } });

    expect(screen.getByRole('heading', { name: /Step 2: Enter Purchase Amount/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Purchase Summary/i })).toBeTruthy();
    expect(screen.getByText(/\$50\.00/i)).toBeTruthy();
  });

  it('enables purchase action once all acknowledgments are checked', () => {
    renderTokenLaunchPage();

    fireEvent.click(screen.getByText('Oath'));
    fireEvent.change(screen.getByLabelText(/VFIDE token amount/i), { target: { value: '1000' } });

    fireEvent.click(screen.getByLabelText(/I have read the Terms of Service/i));
    fireEvent.click(screen.getByLabelText(/I understand these are utility tokens for governance and payments/i));
    fireEvent.click(screen.getByLabelText(/I am purchasing to participate, not for investment returns/i));
    fireEvent.click(screen.getByLabelText(/I plan to actively use tokens for governance or payments/i));
    fireEvent.click(screen.getByLabelText(/I understand token value may fluctuate and I could lose my purchase amount/i));
    fireEvent.click(screen.getByLabelText(/I acknowledge there are no guarantees of profit or value retention/i));
    fireEvent.click(screen.getByLabelText(/I understand tokens do not provide passive income or dividends/i));
    fireEvent.click(screen.getByLabelText(/I am responsible for any applicable taxes/i));
    fireEvent.click(screen.getByLabelText(/I am not relying on VFIDE for financial or tax advice/i));
    fireEvent.click(screen.getByLabelText(/I can afford this purchase amount/i));

    const purchaseButton = screen.getByRole('button', { name: /Complete Purchase - 1,000 VFIDE/i });
    expect(purchaseButton).toBeTruthy();

    fireEvent.click(purchaseButton);
    expect(mockWriteContract).toHaveBeenCalled();
  });

  it('shows wallet-connect gate when user is disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: undefined as unknown as `0x${string}`,
    };

    renderTokenLaunchPage();

    fireEvent.click(screen.getByText('Oath'));
    fireEvent.change(screen.getByLabelText(/VFIDE token amount/i), { target: { value: '1000' } });

    expect(screen.getByRole('heading', { name: /Connect Wallet/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to purchase VFIDE tokens/i)).toBeTruthy();
  });

  it('shows correct tier prices: founding $0.03, oath $0.05, public $0.07', () => {
    renderTokenLaunchPage();

    // Founding tier card
    fireEvent.click(screen.getByText('Founding'));
    fireEvent.change(screen.getByLabelText(/VFIDE token amount/i), { target: { value: '1000' } });
    // 1000 VFIDE × $0.03 = $30.00
    expect(screen.getByText(/\$30\.00/)).toBeTruthy();

    // Public tier card
    fireEvent.click(screen.getByText('Public'));
    // 1000 VFIDE × $0.07 = $70.00
    expect(screen.getByText(/\$70\.00/)).toBeTruthy();
  });

  it('sends ETH equivalent of USD cost, not VFIDE count', () => {
    // ethPrice mock = 2500; oath price = $0.05; 1000 VFIDE → $50 → 50/2500 = 0.02 ETH
    renderTokenLaunchPage();

    fireEvent.click(screen.getByText('Oath'));
    fireEvent.change(screen.getByLabelText(/VFIDE token amount/i), { target: { value: '1000' } });

    fireEvent.click(screen.getByLabelText(/I have read the Terms of Service/i));
    fireEvent.click(screen.getByLabelText(/I understand these are utility tokens for governance and payments/i));
    fireEvent.click(screen.getByLabelText(/I am purchasing to participate, not for investment returns/i));
    fireEvent.click(screen.getByLabelText(/I plan to actively use tokens for governance or payments/i));
    fireEvent.click(screen.getByLabelText(/I understand token value may fluctuate and I could lose my purchase amount/i));
    fireEvent.click(screen.getByLabelText(/I acknowledge there are no guarantees of profit or value retention/i));
    fireEvent.click(screen.getByLabelText(/I understand tokens do not provide passive income or dividends/i));
    fireEvent.click(screen.getByLabelText(/I am responsible for any applicable taxes/i));
    fireEvent.click(screen.getByLabelText(/I am not relying on VFIDE for financial or tax advice/i));
    fireEvent.click(screen.getByLabelText(/I can afford this purchase amount/i));

    fireEvent.click(screen.getByRole('button', { name: /Complete Purchase - 1,000 VFIDE/i }));

    expect(mockWriteContract).toHaveBeenCalledTimes(1);
    const call = mockWriteContract.mock.calls[0][0] as { value: bigint };
    // 0.02 ETH = 20000000000000000 wei
    const expectedWei = BigInt('20000000000000000');
    // Allow ±1 wei for floating-point rounding
    const diff = call.value > expectedWei ? call.value - expectedWei : expectedWei - call.value;
    expect(diff).toBeLessThanOrEqual(1n);
  });
});
