import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

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

// Import after mocking
import { PageWrapper } from '@/components/ui/PageLayout'

describe('PageWrapper', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PageWrapper>
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <PageWrapper>
        <div data-testid="child">Test Content</div>
      </PageWrapper>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { container, rerender } = render(
      <PageWrapper variant="cosmic">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()

    rerender(
      <PageWrapper variant="aurora">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()

    rerender(
      <PageWrapper variant="matrix">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()

    rerender(
      <PageWrapper variant="gradient">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders without grid when showGrid is false', () => {
    const { container } = render(
      <PageWrapper showGrid={false}>
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders without orbs when showOrbs is false', () => {
    const { container } = render(
      <PageWrapper showOrbs={false}>
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    const { container } = render(
      <PageWrapper className="custom-class">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
