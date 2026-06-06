import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderStakingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/staking/page');
  const StakingPage = pageModule.default as React.ComponentType;
  return render(<StakingPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useReadContract: () => ({ data: 0n, refetch: jest.fn() }),
}));

jest.mock('@/hooks/useContractAddresses', () => ({
  useContractAddresses: () => ({ LiquidityIncentives: '0x1111111111111111111111111111111111111111' }),
}));

jest.mock('@/lib/contracts', () => ({
  isConfiguredContractAddress: () => true,
}));

jest.mock('@/hooks/useStaking', () => ({
  useAllPoolInfo: () => ({ pools: [], isLoading: false }),
  useUserStake: () => ({ data: { amount: 0n, stakedAt: 0n }, refetch: jest.fn() }),
  useUnstakeCooldown: () => 0n,
  useLpAllowance: () => ({ allowance: 0n, refetch: jest.fn() }),
  useApproveLpToken: () => ({ approve: jest.fn(), isPending: false, isConfirmed: false }),
  useStake: () => ({ stake: jest.fn(), isPending: false, isConfirmed: false }),
  useUnstake: () => ({ unstake: jest.fn(), isPending: false, isConfirmed: false }),
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Staking route', () => {
  it('renders disconnected staking state with connect CTA', () => {
    renderStakingPage();

    expect(screen.getByRole('heading', { name: /Staking/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to stake LP tokens/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
