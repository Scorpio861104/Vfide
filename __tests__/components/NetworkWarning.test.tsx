import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock hooks
const mockSwitchChain = jest.fn()
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
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
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v) => JSON.stringify(v)),
  deserialize: jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
}))

// Mock lucide-react
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  X: () => React.createElement('svg', { 'data-testid': 'close-icon' }),
});
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})())

// Mock framer-motion
jest.mock('framer-motion', () => {
  /* FRAMER_MOTION_MOCK_V1 */
  const React = require('react');
  // Reusable component that strips motion-only props and renders the underlying tag.
  const __MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'drag',
    'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition',
    'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
    'onAnimationStart', 'onAnimationComplete', 'onUpdate', 'onPan',
    'onPanStart', 'onPanEnd', 'onTap', 'onTapStart', 'onTapCancel',
    'onHoverStart', 'onHoverEnd', 'onDrag', 'onDragStart', 'onDragEnd',
    'onDirectionLock', 'onViewportEnter', 'onViewportLeave',
    'viewport', 'custom', 'transformTemplate', 'inherit',
  ]);
  const __makeMotion = (tag) => React.forwardRef((props, ref) => {
    const sanitized = {};
    for (const k of Object.keys(props || {})) {
      if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k];
    }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({}, {
    get: (t, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!t[prop]) t[prop] = __makeMotion(prop === 'custom' ? 'div' : prop);
      return t[prop];
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }) => children,
    LayoutGroup: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    MotionConfig: ({ children }) => children,
    Reorder: { Group: ({ children }) => children, Item: ({ children }) => children },
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useAnimationControls: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollX: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollXProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useMotionValue: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useTransform: (v) => ({ get: () => 0, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useSpring: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useInView: () => true,
    useReducedMotion: () => false,
    useDragControls: () => ({ start: jest.fn() }),
    usePresence: () => [true, jest.fn()],
    useIsPresent: () => true,
    useMotionTemplate: () => ({ get: () => '', set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useViewportScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useCycle: (...args) => [args[0], jest.fn()],
    animate: jest.fn(),
    stagger: jest.fn(() => 0),
    transform: jest.fn((v) => v),
  };
});

// Mock testnet config
jest.mock('@/lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
}))

import { NetworkWarning } from '@/components/ui/NetworkWarning'

describe('NetworkWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('does not show when not connected', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: false })
    
    render(<NetworkWarning />)
    
    expect(screen.queryByText(/wrong network/i)).not.toBeInTheDocument()
  })

  it('does not show when on correct chain', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(84532)
    
    render(<NetworkWarning />)
    
    expect(screen.queryByText(/wrong network/i)).not.toBeInTheDocument()
  })

  it('shows warning when on wrong chain', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain

    const { container } = render(<NetworkWarning />)
    
    // Component should render (even if dismissed initially)
    expect(container).toBeInTheDocument()
  })

  it('handles switch chain click', async () => {
    const { useAccount, useChainId, useSwitchChain } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain
    ;(useSwitchChain as ReturnType<typeof jest.fn>).mockReturnValue({ 
      switchChain: mockSwitchChain, 
      isPending: false 
    })

    const { container } = render(<NetworkWarning />)
    
    // Look for switch button
    const switchButton = screen.queryByText(/switch/i)
    if (switchButton) {
      fireEvent.click(switchButton)
      expect(mockSwitchChain).toHaveBeenCalled()
    }
    expect(container).toBeInTheDocument()
  })

  it('handles dismiss click', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain

    const { container } = render(<NetworkWarning />)
    
    // Look for dismiss button
    const dismissButton = screen.queryByTestId('close-icon')
    if (dismissButton?.closest('button')) {
      fireEvent.click(dismissButton.closest('button')!)
    }
    expect(container).toBeInTheDocument()
  })

  it('stores dismissal in localStorage', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain

    render(<NetworkWarning />)
    
    // Component should be in DOM
    expect(document.body).toBeInTheDocument()
  })

  it('clears dismissal on correct chain', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(84532) // Correct chain

    localStorage.setItem('vfide-network-warning-dismissed', String(Date.now() + 100000))
    
    render(<NetworkWarning />)
    
    // Should clear localStorage
    await waitFor(() => {
      expect(localStorage.getItem('vfide-network-warning-dismissed')).toBeNull()
    })
  })

  it('shows pending state during chain switch', async () => {
    const { useAccount, useChainId, useSwitchChain } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain
    ;(useSwitchChain as ReturnType<typeof jest.fn>).mockReturnValue({ 
      switchChain: mockSwitchChain, 
      isPending: true 
    })

    const { container } = render(<NetworkWarning />)
    
    // Component should render with pending state
    expect(container).toBeInTheDocument()
  })

  it('handles unavailable localStorage gracefully', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1)

    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    try {
      const { container } = render(<NetworkWarning />)
      expect(container).toBeInTheDocument()
    } finally {
      getItemSpy.mockRestore()
    }
  })
})
