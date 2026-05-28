import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const mockIsCardBoundVaultMode = jest.fn(() => false);

const renderHomePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/page');
  const HomePage = pageModule.default as React.ComponentType;
  return render(<HomePage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
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

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const Icon = ({ className }: { className?: string }) => {
    const React = require('react');
    return React.createElement('span', { className }, 'icon');
  };
  const __orig: Record<string, any> = {};
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
})());

jest.mock('@/components/onboarding', () => ({
  useOnboarding: () => ({ state: { path: 'merchant' } }),
  OnboardingPathChooser: () => <div data-testid="onboarding-path-chooser" />,
}));

jest.mock('@/components/fees', () => ({
  FeeSavingsCalculator: () => <div data-testid="fee-savings-calculator" />,
}));

jest.mock('@/lib/contracts', () => {
  const actual = jest.requireActual('@/lib/contracts');
  return {
    ...actual,
    isCardBoundVaultMode: () => mockIsCardBoundVaultMode(),
  };
});

describe('Home page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCardBoundVaultMode.mockReturnValue(false);
  });

  it('renders hero content and primary actions', () => {
    renderHomePage();

    // Copy sweep: H1 leads with the permanent zero-fee fact.
    // The two-door CTA (Shop / Sell) is unchanged.
    expect(screen.getByRole('heading', { name: /The merchant fee is/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Sell on VFIDE/i }).getAttribute('href')).toBe('/merchant/setup');
    expect(screen.getByRole('link', { name: /Shop on VFIDE/i }).getAttribute('href')).toBe('/marketplace');
  });

  it('renders trust indicators and onboarding steps', () => {
    renderHomePage();

    // Clarity sweep: protocol-internal labels ("Burn Rate", "Sanctum
    // Fund", "Max ProofScore") were replaced with plain-English ones.
    // We assert on the new labels and on the plain-English jargon
    // translator card that anchors the rewrite.
    expect(screen.getAllByText(/Merchant fee/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Self-custody/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sanctum Fund/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VFIDE in plain English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Get started in/i).length).toBeGreaterThan(0);
  });

  it('renders account creation step copy', () => {
    renderHomePage();

    expect(screen.getByText(/Connect your wallet/i)).toBeTruthy();
  });

  it('uses CardBound-safe vault marketing copy when CardBound mode is active', () => {
    mockIsCardBoundVaultMode.mockReturnValue(true);

    renderHomePage();

    expect(screen.getByText(/Guardians help rotate wallet access, protect queued transfers, and support recovery flows/i)).toBeTruthy();
    expect(screen.queryByText(/Inheritance via Next of Kin/i)).toBeNull();
  });
});
