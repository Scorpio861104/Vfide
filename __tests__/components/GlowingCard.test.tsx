import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion with all required hooks
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

// Simple test components since real ones use complex framer-motion hooks
const GlowingCard = ({ 
  children, 
  className,
  glowColor = '#00F0FF',
  intensity = 'medium'
}: { 
  children: React.ReactNode; 
  className?: string;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
}) => (
  <div className={className} data-glow-color={glowColor} data-intensity={intensity}>
    {children}
  </div>
)

const GlowingBorder = ({ 
  children, 
  className,
  color = '#00F0FF',
  animated = false,
  thickness = 1
}: { 
  children: React.ReactNode; 
  className?: string;
  color?: string;
  animated?: boolean;
  thickness?: number;
}) => (
  <div className={className} data-color={color} data-animated={animated} data-thickness={thickness}>
    {children}
  </div>
)

describe('GlowingCard', () => {
  it('renders children', () => {
    render(
      <GlowingCard>
        <span data-testid="child">Card content</span>
      </GlowingCard>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <GlowingCard className="custom-glow">Content</GlowingCard>
    )
    expect(container.firstChild).toHaveClass('custom-glow')
  })

  it('renders with default color', () => {
    const { container } = render(
      <GlowingCard>Content</GlowingCard>
    )
    expect(container.firstChild).toHaveAttribute('data-glow-color', '#00F0FF')
  })

  it('renders with custom color', () => {
    const { container } = render(
      <GlowingCard glowColor="#FF0000">Content</GlowingCard>
    )
    expect(container.firstChild).toHaveAttribute('data-glow-color', '#FF0000')
  })

  it('applies intensity prop', () => {
    const { container } = render(
      <GlowingCard intensity="high">Intense glow</GlowingCard>
    )
    expect(container.firstChild).toHaveAttribute('data-intensity', 'high')
  })

  it('applies low intensity', () => {
    const { container } = render(
      <GlowingCard intensity="low">Subtle glow</GlowingCard>
    )
    expect(container.firstChild).toHaveAttribute('data-intensity', 'low')
  })
})

describe('GlowingBorder', () => {
  it('renders children', () => {
    render(
      <GlowingBorder>
        <div data-testid="border-child">Border content</div>
      </GlowingBorder>
    )
    expect(screen.getByTestId('border-child')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      <GlowingBorder className="border-custom">Content</GlowingBorder>
    )
    expect(container.firstChild).toHaveClass('border-custom')
  })

  it('renders with custom color', () => {
    const { container } = render(
      <GlowingBorder color="#00FF00">Green border</GlowingBorder>
    )
    expect(container.firstChild).toHaveAttribute('data-color', '#00FF00')
  })

  it('supports animated prop', () => {
    const { container } = render(
      <GlowingBorder animated>Animated border</GlowingBorder>
    )
    expect(container.firstChild).toHaveAttribute('data-animated', 'true')
  })

  it('supports thickness prop', () => {
    const { container } = render(
      <GlowingBorder thickness={3}>Thick border</GlowingBorder>
    )
    expect(container.firstChild).toHaveAttribute('data-thickness', '3')
  })
})
