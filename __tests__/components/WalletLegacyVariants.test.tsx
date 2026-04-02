import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import {
  PremiumWalletConnect,
  PremiumWalletConnectCompact,
} from '@/components/wallet/PremiumWalletConnect';
import {
  UltimateWalletConnect,
  UltimateWalletConnectCompact,
} from '@/components/wallet/UltimateWalletConnect';

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (props: any) => React.ReactNode }) =>
      children({
        account: null,
        chain: null,
        openAccountModal: jest.fn(),
        openChainModal: jest.fn(),
        openConnectModal: jest.fn(),
        authenticationStatus: 'unauthenticated',
        mounted: true,
      }),
  },
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMotionValue: () => ({ set: jest.fn() }),
  useTransform: () => '0%',
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
  }),
  useConnect: () => ({
    connect: jest.fn(),
    connectors: [{ id: 'injected', name: 'Injected' }],
    isPending: false,
  }),
  useDisconnect: () => ({ disconnect: jest.fn() }),
  useBalance: () => ({ data: undefined }),
  useChainId: () => 84532,
  useSwitchChain: () => ({ switchChain: jest.fn() }),
}));

jest.mock('@/components/wallet/WalletQRCode', () => ({
  WalletQRCode: () => null,
}));

jest.mock('@/components/wallet/PendingTransactions', () => ({
  PendingTransactionsList: () => <div>Pending transactions</div>,
  usePendingTransactions: () => ({ pendingCount: 0 }),
}));

jest.mock('@/components/wallet/GasPriceAlert', () => ({
  GasIndicator: () => <div>Gas</div>,
}));

jest.mock('@/hooks/useTransactionSounds', () => ({
  useTransactionSounds: () => ({
    playConnect: jest.fn(),
    playClick: jest.fn(),
    playSuccess: jest.fn(),
    playNotification: jest.fn(),
    play: jest.fn(),
  }),
}));

jest.mock('@/hooks/useWalletPersistence', () => ({
  useWalletPersistence: () => ({
    isReconnecting: false,
    reconnectError: null,
    minutesUntilDisconnect: null,
  }),
}));

jest.mock('@/lib/mobileDetection', () => ({
  isMobileDevice: () => false,
}));

describe('Legacy wallet variants', () => {
  it('renders the premium variant with the shared one-click connect CTA', () => {
    render(<PremiumWalletConnect />);

    expect(screen.getByText(/shared one-click connection experience/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders the ultimate variant with the shared one-click connect CTA', () => {
    render(<UltimateWalletConnect />);

    expect(screen.getByText(/shared quick-connect experience/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('keeps compact legacy aliases available', () => {
    render(
      <>
        <PremiumWalletConnectCompact />
        <UltimateWalletConnectCompact />
      </>
    );

    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });
});
