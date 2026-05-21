import { describe, expect, it, vi } from '@jest/globals'
import { render } from '@testing-library/react'
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

import { ProofScoreRing, ProofScoreCard } from '@/components/ui/ProofScoreRing'

describe('ProofScoreRing', () => {
  it('renders with score', () => {
    const { container } = render(<ProofScoreRing score={5000} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies sm size', () => {
    const { container } = render(<ProofScoreRing score={5000} size="sm" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '80')
  })

  it('applies md size by default', () => {
    const { container } = render(<ProofScoreRing score={5000} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '120')
  })

  it('applies lg size', () => {
    const { container } = render(<ProofScoreRing score={5000} size="lg" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '180')
  })

  it('shows label by default', () => {
    const { container } = render(<ProofScoreRing score={5000} />)
    expect(container.textContent).toContain('TRUSTED')
  })

  it('hides label when showLabel is false', () => {
    const { container } = render(<ProofScoreRing score={5000} showLabel={false} />)
    expect(container.textContent).not.toContain('TRUSTED')
  })

  it('applies custom className', () => {
    const { container } = render(<ProofScoreRing score={5000} className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  describe('tier colors', () => {
    it('shows ELITE for score >= 8000', () => {
      const { container } = render(<ProofScoreRing score={8000} />)
      expect(container.textContent).toContain('ELITE')
    })

    it('shows VERIFIED for score >= 7000', () => {
      const { container } = render(<ProofScoreRing score={7000} />)
      expect(container.textContent).toContain('VERIFIED')
    })

    it('shows TRUSTED for score >= 5000', () => {
      const { container } = render(<ProofScoreRing score={5000} />)
      expect(container.textContent).toContain('TRUSTED')
    })

    it('shows NEUTRAL for score < 5000', () => {
      const { container } = render(<ProofScoreRing score={4000} />)
      expect(container.textContent).toContain('NEUTRAL')
    })
  })
})

describe('ProofScoreCard', () => {
  it('renders with score and fee rate', () => {
    const { container } = render(<ProofScoreCard score={6000} feeRate={2.5} />)
    expect(container.textContent).toContain('Your ProofScore')
    expect(container.textContent).toContain('2.50% Fee')
  })

  it('shows score breakdown', () => {
    const { container } = render(<ProofScoreCard score={7000} feeRate={1.0} />)
    expect(container.textContent).toContain('Base Score')
    expect(container.textContent).toContain('Vault Created')
    expect(container.textContent).toContain('Transactions')
    expect(container.textContent).toContain('Governance')
    expect(container.textContent).toContain('Badges')
  })

  it('includes ProofScoreRing', () => {
    const { container } = render(<ProofScoreCard score={6000} feeRate={2.0} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ProofScoreCard score={5000} feeRate={3.0} className="custom-card" />
    )
    expect(container.firstChild).toHaveClass('custom-card')
  })
})
