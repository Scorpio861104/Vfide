import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockRefetch = jest.fn();

let mockLeaderboardState: {
  entries: Array<{
    rank: number;
    address: `0x${string}`;
    score: number;
    tier: string;
    badges: number;
    change: number;
  }>;
  isLoading: boolean;
  error: Error | null;
  totalParticipants: number;
};

const renderLeaderboardPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/leaderboard/page');
  const LeaderboardPage = pageModule.default as React.ComponentType;
  return render(<LeaderboardPage />);
};

jest.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    ...mockLeaderboardState,
    refetch: mockRefetch,
  }),
  useUserRank: () => ({ rank: 7 }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/FormElements', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/Animations', () => ({
  Counter: ({ value }: { value: number }) => <span>{value}</span>,
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

describe('Leaderboard page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboardState = {
      entries: [
        { rank: 1, address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', score: 9800, tier: 'CHAMPION', badges: 12, change: 1 },
        { rank: 2, address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 9200, tier: 'GUARDIAN', badges: 10, change: 0 },
        { rank: 3, address: '0xcccccccccccccccccccccccccccccccccccccccc', score: 8900, tier: 'DELEGATE', badges: 8, change: -1 },
      ],
      isLoading: false,
      error: null,
      totalParticipants: 777,
    };
  });

  it('renders leaderboard stats and podium from live entries', () => {
    renderLeaderboardPage();

    expect(screen.getByRole('heading', { name: /ProofScore Leaderboard/i })).toBeTruthy();
    expect(screen.getByText(/Total Participants/i)).toBeTruthy();
    expect(screen.getByText(/Average Score/i)).toBeTruthy();
    expect(screen.getByText(/Top Score/i)).toBeTruthy();
    expect(screen.getByText(/Your Rank/i)).toBeTruthy();
    expect(screen.getAllByText(/1st|2nd|3rd/i).length).toBeGreaterThan(0);
  });

  it('switches timeframe and triggers refresh action', () => {
    renderLeaderboardPage();

    fireEvent.click(screen.getByRole('button', { name: /This Week/i }));
    fireEvent.click(screen.getByRole('button', { name: /This Month/i }));
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});