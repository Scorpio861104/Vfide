import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockRefreshMetrics = jest.fn();
const mockRefreshPageMetrics = jest.fn();
const mockTrackEvent = jest.fn();
const mockResolveError = jest.fn();
const mockClearErrors = jest.fn();

const renderPerformancePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/performance/page');
  const PerformancePage = pageModule.default as React.ComponentType;
  return render(<PerformancePage />);
};

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

jest.mock('@/hooks/usePerformanceMetrics', () => ({
  usePerformanceMetrics: () => ({
    metrics: { lcp: 1200, fid: 20, cls: 0.02 },
    systemMetrics: {},
    isLoading: false,
    refreshMetrics: mockRefreshMetrics,
  }),
}));

jest.mock('@/hooks/useErrorTracking', () => ({
  useErrorTracking: () => ({
    errors: [{ id: 'e1', message: 'Error 1' }],
    errorStats: { unresolvedCount: 2 },
    addError: jest.fn(),
    resolveError: mockResolveError,
    clearErrors: mockClearErrors,
    exportErrors: () => '{"errors":[]}',
  }),
}));

jest.mock('@/hooks/useUserAnalytics', () => ({
  useUserAnalytics: () => ({
    analytics: { activeUsers: 42 },
    trackEvent: mockTrackEvent,
  }),
}));

jest.mock('@/hooks/usePagePerformance', () => ({
  usePagePerformance: () => ({
    pageMetrics: [{ id: 'p1' }],
    apiMetrics: [{ avgResponseTime: 120 }, { avgResponseTime: 180 }],
    refreshMetrics: mockRefreshPageMetrics,
  }),
}));

jest.mock('@/components/performance/PerformanceMetricsGrid', () => ({
  PerformanceMetricsGrid: () => <div>Performance Metrics Grid</div>,
}));

jest.mock('@/components/performance/ErrorTracker', () => ({
  ErrorTracker: () => <div>Error Tracker</div>,
}));

jest.mock('@/components/performance/UserAnalyticsDashboard', () => ({
  UserAnalyticsDashboard: () => <div>User Analytics Dashboard</div>,
}));

jest.mock('@/components/performance/PageMetricsDisplay', () => ({
  PageMetricsDisplay: () => <div>Page Metrics Display</div>,
}));

jest.mock('@/config/performance-dashboard', () => ({
  TimeRange: {
    LAST_HOUR: 'last_hour',
    LAST_24_HOURS: 'last_24_hours',
    LAST_7_DAYS: 'last_7_days',
    LAST_30_DAYS: 'last_30_days',
    LAST_90_DAYS: 'last_90_days',
  },
  calculateHealthScore: () => 88,
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

describe('Performance page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders command header, health score, and overview cards', () => {
    renderPerformancePage();

    expect(screen.getAllByRole('heading', { name: /Performance Command/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/System Health Score/i)).toBeTruthy();
    expect(screen.getByText('88')).toBeTruthy();
    expect(screen.getByText(/Active Errors/i)).toBeTruthy();
    expect(screen.getByText(/Active Users/i)).toBeTruthy();
  });

  it('refreshes metrics and records tracking event', () => {
    renderPerformancePage();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

    expect(mockRefreshMetrics).toHaveBeenCalled();
    expect(mockRefreshPageMetrics).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('switches tabs to errors, analytics, and pages content', () => {
    renderPerformancePage();

    fireEvent.click(screen.getByRole('button', { name: /Errors/i }));
    expect(screen.getByText(/Error Tracker/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Analytics/i }));
    expect(screen.getByText(/User Analytics Dashboard/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Pages/i }));
    expect(screen.getByText(/Page Metrics Display/i)).toBeTruthy();
  });
});
