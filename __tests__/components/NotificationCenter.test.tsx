import { describe, expect, it, vi, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  Bell: ({ className, onClick }: { className?: string; onClick?: () => void }) => 
    React.createElement('button', { className, onClick, 'data-testid': 'bell-icon' }),
  X: ({ className, onClick }: { className?: string; onClick?: () => void }) => 
    React.createElement('button', { className, onClick, 'data-testid': 'x-icon' }),
  Check: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'check-icon' }),
  AlertCircle: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'alert-icon' }),
  Info: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'info-icon' }),
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

// Simple notification system for testing
interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}

const NotificationItem = ({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) => (
  <div data-testid={`notification-${notification.id}`} className="notification">
    <span data-testid="notification-title">{notification.title}</span>
    {notification.message && <p data-testid="notification-message">{notification.message}</p>}
    <button onClick={() => onDismiss(notification.id)} data-testid={`dismiss-${notification.id}`}>Dismiss</button>
  </div>
)

const NotificationCenter = ({ notifications, onDismiss }: { notifications: Notification[]; onDismiss: (id: string) => void }) => (
  <div data-testid="notification-center">
    {notifications.length === 0 && <span data-testid="no-notifications">No notifications</span>}
    {notifications.map((n) => (
      <NotificationItem key={n.id} notification={n} onDismiss={onDismiss} />
    ))}
  </div>
)

describe('NotificationCenter', () => {
  it('renders empty state when no notifications', () => {
    render(<NotificationCenter notifications={[]} onDismiss={() => {}} />)
    expect(screen.getByTestId('no-notifications')).toBeInTheDocument()
  })

  it('renders notifications list', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'success', title: 'Success!' },
      { id: '2', type: 'error', title: 'Error!' },
    ]
    render(<NotificationCenter notifications={notifications} onDismiss={() => {}} />)
    expect(screen.getByTestId('notification-1')).toBeInTheDocument()
    expect(screen.getByTestId('notification-2')).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = jest.fn()
    const notifications: Notification[] = [
      { id: '1', type: 'info', title: 'Info message' },
    ]
    render(<NotificationCenter notifications={notifications} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByTestId('dismiss-1'))
    expect(onDismiss).toHaveBeenCalledWith('1')
  })

  it('renders notification with message', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'warning', title: 'Warning', message: 'Something is wrong' },
    ]
    render(<NotificationCenter notifications={notifications} onDismiss={() => {}} />)
    expect(screen.getByText('Something is wrong')).toBeInTheDocument()
  })
})

describe('NotificationItem', () => {
  it('renders title', () => {
    render(
      <NotificationItem 
        notification={{ id: '1', type: 'success', title: 'Test Title' }} 
        onDismiss={() => {}} 
      />
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders optional message', () => {
    render(
      <NotificationItem 
        notification={{ id: '1', type: 'error', title: 'Error', message: 'Details here' }} 
        onDismiss={() => {}} 
      />
    )
    expect(screen.getByText('Details here')).toBeInTheDocument()
  })

  it('calls onDismiss with correct id', () => {
    const onDismiss = jest.fn()
    render(
      <NotificationItem 
        notification={{ id: 'abc123', type: 'info', title: 'Info' }} 
        onDismiss={onDismiss} 
      />
    )
    fireEvent.click(screen.getByTestId('dismiss-abc123'))
    expect(onDismiss).toHaveBeenCalledWith('abc123')
  })
})
