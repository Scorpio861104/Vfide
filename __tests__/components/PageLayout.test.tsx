import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/link
jest.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}))

// Mock lucide-react
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  ArrowLeft: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'arrow-left' }),
  Menu: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'menu-icon' }),
  X: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'close-icon' }),
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

// Simple Page Layout components for testing
const PageHeader = ({ 
  title, 
  subtitle, 
  backLink,
  actions 
}: { 
  title: string; 
  subtitle?: string; 
  backLink?: string;
  actions?: React.ReactNode;
}) => (
  <header data-testid="page-header">
    {backLink && (
      <a href={backLink} data-testid="back-link">
        <span data-testid="arrow-left">←</span>
      </a>
    )}
    <h1 data-testid="page-title">{title}</h1>
    {subtitle && <p data-testid="page-subtitle">{subtitle}</p>}
    {actions && <div data-testid="header-actions">{actions}</div>}
  </header>
)

const PageContainer = ({ 
  children, 
  className,
  maxWidth = 'max-w-7xl'
}: { 
  children: React.ReactNode; 
  className?: string;
  maxWidth?: string;
}) => (
  <div data-testid="page-container" className={`${maxWidth} ${className || ''}`}>
    {children}
  </div>
)

const PageSection = ({ 
  title, 
  children,
  className 
}: { 
  title?: string; 
  children: React.ReactNode;
  className?: string;
}) => (
  <section data-testid="page-section" className={className}>
    {title && <h2 data-testid="section-title">{title}</h2>}
    {children}
  </section>
)

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByTestId('page-title')).toHaveTextContent('Dashboard')
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Settings" subtitle="Manage your account" />)
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Manage your account')
  })

  it('renders back link when provided', () => {
    render(<PageHeader title="Details" backLink="/home" />)
    expect(screen.getByTestId('back-link')).toHaveAttribute('href', '/home')
  })

  it('does not render back link when not provided', () => {
    render(<PageHeader title="Home" />)
    expect(screen.queryByTestId('back-link')).not.toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(
      <PageHeader 
        title="Users" 
        actions={<button data-testid="action-btn">Add User</button>} 
      />
    )
    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
  })
})

describe('PageContainer', () => {
  it('renders children', () => {
    render(
      <PageContainer>
        <div data-testid="child">Content</div>
      </PageContainer>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies default maxWidth', () => {
    render(<PageContainer>Content</PageContainer>)
    expect(screen.getByTestId('page-container')).toHaveClass('max-w-7xl')
  })

  it('applies custom maxWidth', () => {
    render(<PageContainer maxWidth="max-w-4xl">Content</PageContainer>)
    expect(screen.getByTestId('page-container')).toHaveClass('max-w-4xl')
  })

  it('applies custom className', () => {
    render(<PageContainer className="custom-container">Content</PageContainer>)
    expect(screen.getByTestId('page-container')).toHaveClass('custom-container')
  })
})

describe('PageSection', () => {
  it('renders children', () => {
    render(
      <PageSection>
        <p data-testid="section-content">Section content</p>
      </PageSection>
    )
    expect(screen.getByTestId('section-content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<PageSection title="Statistics">Content</PageSection>)
    expect(screen.getByTestId('section-title')).toHaveTextContent('Statistics')
  })

  it('does not render title when not provided', () => {
    render(<PageSection>Content</PageSection>)
    expect(screen.queryByTestId('section-title')).not.toBeInTheDocument()
  })

  it('applies className', () => {
    render(<PageSection className="custom-section">Content</PageSection>)
    expect(screen.getByTestId('page-section')).toHaveClass('custom-section')
  })
})
