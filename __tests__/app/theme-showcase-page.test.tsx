import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/theme-showcase/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/components/ui', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children || 'ui-stub'}</div>;
  return {
    FloatingHexagon: () => <div>FloatingHexagon</div>,
    VFIDEMark: () => <div>VFIDEMark</div>,
    TrustRing: () => <div>TrustRing</div>,
    TrustRings: () => <div>TrustRings</div>,
    TrustBadge: () => <div>TrustBadge</div>,
    TrustCard: Stub,
    TrustProgressBar: () => <div>TrustProgressBar</div>,
    ShieldLoader: () => <div>ShieldLoader</div>,
    HexagonSpinner: () => <div>HexagonSpinner</div>,
    PulseDotsLoader: () => <div>PulseDotsLoader</div>,
    TrustRingLoader: () => <div>TrustRingLoader</div>,
    BlockchainLoader: () => <div>BlockchainLoader</div>,
    SuccessCheckmark: () => <div>SuccessCheckmark</div>,
    SparkleOnHover: Stub,
    fireVFIDEConfetti: jest.fn(),
    fireStarShower: jest.fn(),
  };
});

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => <div><h1>{title}</h1><p>{subtitle}</p></div>,
  Section: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

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
});;

describe('Theme showcase page', () => {
  it('renders showcase header and key sections', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { name: /VFIDE Theme Showcase/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Digital Jade/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Trust Ring Animations/i)).toBeTruthy();
    expect(screen.getByText(/Delightful Loading States/i)).toBeTruthy();
  });
});
