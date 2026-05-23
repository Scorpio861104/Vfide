import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  Check: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'check-icon' }),
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

import { ProgressSteps } from '@/components/ui/ProgressSteps'

describe('ProgressSteps', () => {
  const mockSteps = [
    { id: 1, title: 'Step 1', description: 'First step' },
    { id: 2, title: 'Step 2', description: 'Second step' },
    { id: 3, title: 'Step 3', description: 'Third step' },
  ]

  it('renders all steps', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
    expect(screen.getByText('Step 3')).toBeInTheDocument()
  })

  it('shows step numbers', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows check icon for completed steps', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={2} />)
    // Steps 0 and 1 are completed (currentStep is 2)
    const checkIcons = screen.getAllByTestId('check-icon')
    expect(checkIcons.length).toBe(2)
  })

  it('applies custom className', () => {
    const { container } = render(
      <ProgressSteps steps={mockSteps} currentStep={0} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('highlights current step', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={1} />)
    // Current step (Step 2) should have zinc-100 color
    const step2 = screen.getByText('Step 2')
    expect(step2.className).toContain('text-zinc-100')
  })

  it('renders step descriptions when provided', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('First step')).toBeInTheDocument()
  })

  it('handles steps without descriptions', () => {
    const stepsNoDesc = [
      { id: 1, title: 'Step 1' },
      { id: 2, title: 'Step 2' },
    ]
    render(<ProgressSteps steps={stepsNoDesc} currentStep={0} />)
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('handles string step IDs', () => {
    const stepsStringId = [
      { id: 'first', title: 'First' },
      { id: 'second', title: 'Second' },
    ]
    render(<ProgressSteps steps={stepsStringId} currentStep={0} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })
})
