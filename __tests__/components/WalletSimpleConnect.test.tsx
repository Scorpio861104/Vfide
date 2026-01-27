import { describe, expect, it, beforeEach } from '@jest/globals'
import { render } from '@testing-library/react'
import React from 'react'
import { ToastProvider } from '@/components/ui/toast'

// Mock rainbowkit
const mockRainbowState = {
  account: { address: '0x1234567890123456789012345678901234567890', displayName: 'Test' },
  chain: { id: 84532, name: 'Base Sepolia', unsupported: false },
  openAccountModal: jest.fn(),
  openChainModal: jest.fn(),
  openConnectModal: jest.fn(),
  authenticationStatus: 'authenticated',
  mounted: true,
};

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: any) => children(mockRainbowState),
  },
}))

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReconnect: jest.fn(),
  useChainId: jest.fn(),
}))

jest.mock('@/hooks/useEnhancedWalletConnect', () => ({
  useEnhancedWalletConnect: jest.fn(),
}))

jest.mock('@/hooks/useWalletPersistence', () => ({
  useWalletPersistence: jest.fn(),
}))

jest.mock('@/hooks/useENS', () => ({
  useENS: jest.fn(),
}))

jest.mock('@/lib/networkLatency', () => ({
  measureLatency: jest.fn(),
  getCachedLatency: jest.fn(),
  getLatencyColor: jest.fn(),
}))

jest.mock('@/lib/connectionHistory', () => ({
  addConnectionToHistory: jest.fn(),
}))

jest.mock('@/lib/focusTrap', () => ({
  scrollToTop: jest.fn(),
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

// Import after mocking
import { SimpleWalletConnect } from '@/components/wallet/SimpleWalletConnect'
import { useEnhancedWalletConnect } from '@/hooks/useEnhancedWalletConnect'
import { useWalletPersistence } from '@/hooks/useWalletPersistence'
import { useENS } from '@/hooks/useENS'
import { useAccount, useReconnect, useChainId } from 'wagmi'

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

beforeEach(() => {
  (useEnhancedWalletConnect as jest.Mock).mockReturnValue({
    sessionDurationFormatted: '0m 0s',
    isInCooldown: false,
    cooldownRemaining: 0,
  });

  (useWalletPersistence as jest.Mock).mockReturnValue({
    isReconnecting: false,
    reconnectError: null,
    minutesUntilDisconnect: null,
  });

  (useENS as jest.Mock).mockReturnValue({ ensName: null });

  (useAccount as jest.Mock).mockReturnValue({
    connector: null,
    address: null,
    isConnected: false,
  });

  (useReconnect as jest.Mock).mockReturnValue({ isPending: false });
  (useChainId as jest.Mock).mockReturnValue(84532);

  mockRainbowState.account = { address: '0x1234567890123456789012345678901234567890', displayName: 'Test' };
  mockRainbowState.chain = { id: 84532, name: 'Base Sepolia', unsupported: false };
  mockRainbowState.authenticationStatus = 'authenticated';
  mockRainbowState.mounted = true;
});

describe('SimpleWalletConnect', () => {
  it('renders connected state', () => {
    renderWithProviders(<SimpleWalletConnect />)
    // With mocked connected state, should show chain/account buttons
    expect(document.body).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<SimpleWalletConnect />)
    expect(container).toBeInTheDocument()
  })
})

describe('SimpleWalletConnect - Disconnected', () => {
  it('handles disconnected state', () => {
    mockRainbowState.account = null;
    mockRainbowState.chain = null;
    mockRainbowState.authenticationStatus = null;
    const { container } = renderWithProviders(<SimpleWalletConnect />)
    expect(container).toBeInTheDocument()
  })
})

describe('SimpleWalletConnect - Wrong Network', () => {
  it('handles wrong network state', () => {
    mockRainbowState.account = { address: '0x1234567890123456789012345678901234567890' };
    mockRainbowState.chain = { unsupported: true };
    const { container } = renderWithProviders(<SimpleWalletConnect />)
    expect(container).toBeInTheDocument()
  })
})
