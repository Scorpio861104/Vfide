/**
 * Vault Component Tests
 * Tests for vault-related components
 */

import { describe, it, expect, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'

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
    m: motion,
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

// Mock lucide-react
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  ArrowUpRight: () => <span data-testid="arrow-up-right" />,
  ArrowDownLeft: () => <span data-testid="arrow-down-left" />,
  Shield: () => <span data-testid="shield" />,
  Clock: () => <span data-testid="clock" />,
  ExternalLink: () => <span data-testid="external-link" />,
  Filter: () => <span data-testid="filter" />,
  Search: () => <span data-testid="search" />,
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronUp: () => <span data-testid="chevron-up" />,
  CheckCircle: () => <span data-testid="check-circle" />,
  AlertCircle: () => <span data-testid="alert-circle" />,
  X: () => <span data-testid="x" />,
  Copy: () => <span data-testid="copy" />,
  Loader2: () => <span data-testid="loader" />,
  Eye: () => <span data-testid="eye" />,
  EyeOff: () => <span data-testid="eye-off" />,
  Lock: () => <span data-testid="lock" />,
  Unlock: () => <span data-testid="unlock" />,
  Settings: () => <span data-testid="settings" />,
  User: () => <span data-testid="user" />,
  UserPlus: () => <span data-testid="user-plus" />,
  Wallet: () => <span data-testid="wallet" />,
  DollarSign: () => <span data-testid="dollar-sign" />,
  Heart: () => <span data-testid="heart" />,
  Activity: () => <span data-testid="activity" />,
  TrendingUp: () => <span data-testid="trending-up" />,
  AlertTriangle: () => <span data-testid="alert-triangle" />,
  Info: () => <span data-testid="info" />,
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

// Test transaction history component pattern
describe('TransactionHistory Pattern', () => {
  // Inline test component
  function TransactionHistoryTest({ transactions = [], loading = false }: { transactions?: { id: string; type: string; amount?: string; status: string }[]; loading?: boolean }) {
    if (loading) {
      return <div data-testid="loading">Loading...</div>
    }
    
    if (transactions.length === 0) {
      return <div data-testid="empty">No transactions</div>
    }
    
    return (
      <div data-testid="transaction-list">
        {transactions.map(tx => (
          <div key={tx.id} data-testid={`tx-${tx.id}`}>
            <span data-testid="tx-type">{tx.type}</span>
            {tx.amount && <span data-testid="tx-amount">{tx.amount}</span>}
            <span data-testid="tx-status">{tx.status}</span>
          </div>
        ))}
      </div>
    )
  }

  it('shows loading state', () => {
    render(<TransactionHistoryTest loading />)
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
  })

  it('shows empty state when no transactions', () => {
    render(<TransactionHistoryTest transactions={[]} />)
    expect(screen.getByTestId('empty')).toHaveTextContent('No transactions')
  })

  it('renders transactions', () => {
    const transactions = [
      { id: '1', type: 'receive', amount: '+500 VFIDE', status: 'completed' },
      { id: '2', type: 'send', amount: '-100 VFIDE', status: 'pending' },
    ]
    render(<TransactionHistoryTest transactions={transactions} />)
    
    expect(screen.getByTestId('tx-1')).toBeInTheDocument()
    expect(screen.getByTestId('tx-2')).toBeInTheDocument()
  })

  it('displays transaction amounts', () => {
    const transactions = [
      { id: '1', type: 'receive', amount: '+500 VFIDE', status: 'completed' },
    ]
    render(<TransactionHistoryTest transactions={transactions} />)
    
    expect(screen.getAllByTestId('tx-amount')[0]).toHaveTextContent('+500 VFIDE')
  })

  it('displays transaction status', () => {
    const transactions = [
      { id: '1', type: 'receive', amount: '+500 VFIDE', status: 'completed' },
    ]
    render(<TransactionHistoryTest transactions={transactions} />)
    
    expect(screen.getAllByTestId('tx-status')[0]).toHaveTextContent('completed')
  })
})

// Test vault settings panel pattern
describe('VaultSettingsPanel Pattern', () => {
  interface SettingProps {
    title: string
    description?: string
    enabled: boolean
    onToggle: () => void
  }

  function SettingToggle({ title, description, enabled, onToggle }: SettingProps) {
    return (
      <div data-testid="setting-item">
        <div>
          <span data-testid="setting-title">{title}</span>
          {description && <span data-testid="setting-description">{description}</span>}
        </div>
        <button 
          data-testid="setting-toggle"
          aria-pressed={enabled}
          onClick={onToggle}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>
    )
  }

  it('renders setting title', () => {
    render(<SettingToggle title="Email Notifications" enabled={false} onToggle={() => {}} />)
    expect(screen.getByTestId('setting-title')).toHaveTextContent('Email Notifications')
  })

  it('renders setting description', () => {
    render(
      <SettingToggle 
        title="Email Notifications" 
        description="Get notified of vault activity"
        enabled={false} 
        onToggle={() => {}} 
      />
    )
    expect(screen.getByTestId('setting-description')).toHaveTextContent('Get notified of vault activity')
  })

  it('shows enabled state', () => {
    render(<SettingToggle title="Email Notifications" enabled={true} onToggle={() => {}} />)
    expect(screen.getByTestId('setting-toggle')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('setting-toggle')).toHaveTextContent('On')
  })

  it('shows disabled state', () => {
    render(<SettingToggle title="Email Notifications" enabled={false} onToggle={() => {}} />)
    expect(screen.getByTestId('setting-toggle')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('setting-toggle')).toHaveTextContent('Off')
  })
})

// Test vault status indicator pattern
describe('VaultStatusIndicator Pattern', () => {
  type VaultStatus = 'healthy' | 'warning' | 'locked' | 'recovering'

  function VaultStatusIndicator({ status }: { status: VaultStatus }) {
    const statusColors = {
      healthy: 'bg-green-500',
      warning: 'bg-yellow-500',
      locked: 'bg-red-500',
      recovering: 'bg-blue-500',
    }

    const statusLabels = {
      healthy: 'Vault Healthy',
      warning: 'Attention Needed',
      locked: 'Vault Locked',
      recovering: 'Recovery in Progress',
    }

    return (
      <div data-testid="vault-status" className={statusColors[status]}>
        <span data-testid="status-indicator" />
        <span data-testid="status-label">{statusLabels[status]}</span>
      </div>
    )
  }

  it('renders healthy status', () => {
    render(<VaultStatusIndicator status="healthy" />)
    expect(screen.getByTestId('status-label')).toHaveTextContent('Vault Healthy')
  })

  it('renders warning status', () => {
    render(<VaultStatusIndicator status="warning" />)
    expect(screen.getByTestId('status-label')).toHaveTextContent('Attention Needed')
  })

  it('renders locked status', () => {
    render(<VaultStatusIndicator status="locked" />)
    expect(screen.getByTestId('status-label')).toHaveTextContent('Vault Locked')
  })

  it('renders recovering status', () => {
    render(<VaultStatusIndicator status="recovering" />)
    expect(screen.getByTestId('status-label')).toHaveTextContent('Recovery in Progress')
  })
})

// Test vault status modal pattern
describe('VaultStatusModal Pattern', () => {
  function VaultStatusModal({ 
    isOpen, 
    onClose, 
    title, 
    children 
  }: { 
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode 
  }) {
    if (!isOpen) return null

    return (
      <div data-testid="modal-backdrop" onClick={onClose}>
        <div data-testid="modal-content" onClick={e => e.stopPropagation()}>
          <div data-testid="modal-header">
            <h2 data-testid="modal-title">{title}</h2>
            <button data-testid="modal-close" onClick={onClose}>×</button>
          </div>
          <div data-testid="modal-body">{children}</div>
        </div>
      </div>
    )
  }

  it('does not render when closed', () => {
    render(
      <VaultStatusModal isOpen={false} onClose={() => {}} title="Test">
        Content
      </VaultStatusModal>
    )
    expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(
      <VaultStatusModal isOpen={true} onClose={() => {}} title="Test">
        Content
      </VaultStatusModal>
    )
    expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument()
  })

  it('displays title', () => {
    render(
      <VaultStatusModal isOpen={true} onClose={() => {}} title="Vault Status">
        Content
      </VaultStatusModal>
    )
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Vault Status')
  })

  it('displays content', () => {
    render(
      <VaultStatusModal isOpen={true} onClose={() => {}} title="Test">
        Modal Body Content
      </VaultStatusModal>
    )
    expect(screen.getByTestId('modal-body')).toHaveTextContent('Modal Body Content')
  })

  it('has close button', () => {
    const onClose = jest.fn()
    render(
      <VaultStatusModal isOpen={true} onClose={onClose} title="Test">
        Content
      </VaultStatusModal>
    )
    expect(screen.getByTestId('modal-close')).toBeInTheDocument()
  })
})
