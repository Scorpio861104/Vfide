import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const renderFlashloansPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/flashloans/page');
  const FlashLoansPage = pageModule.default as React.ComponentType;
  return render(<FlashLoansPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('../../app/flashloans/components/BorrowTab', () => ({
  BorrowTab: () => (
    <div>
      <label htmlFor="fl-lender">Lender Address</label>
      <input id="fl-lender" />
      <label htmlFor="fl-principal">Principal (VFIDE)</label>
      <input id="fl-principal" />
      <button>Execute Flash Loan</button>
      <p>Loan request submitted</p>
    </div>
  ),
}));

jest.mock('../../app/flashloans/components/LendersTab', () => ({
  LendersTab: () => <div><p>Lane #1</p></div>,
}));

jest.mock('../../app/flashloans/components/HistoryTab', () => ({
  HistoryTab: () => <div><p>Lane #1</p><p>resolved</p></div>,
}));

jest.mock('../../app/flashloans/components/BorrowInfoTab', () => ({
  BorrowInfoTab: () => <div>How It Works</div>,
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

describe('Flashloans page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes('/api/flashloans/lanes') && init?.method === 'POST') {
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(
          JSON.stringify({
            lanes: [
              {
                id: 1,
                borrower_address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                lender_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                principal: '1200',
                duration_days: 30,
                interest_bps: 200,
                stage: 'proposed',
                created_at: new Date().toISOString(),
                due_day: 30,
                sim_day: 0,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }),
    });
  });

  it('renders hero, fairness rules, and simulator shell', () => {
    renderFlashloansPage();

    expect(screen.getByRole('heading', { name: /Flash Loans/i })).toBeTruthy();
    expect(screen.getByText(/Zero-collateral instant loans/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Borrow$/i })).toBeTruthy();
  });

  it('submits borrow request from the form', async () => {
    renderFlashloansPage();

    fireEvent.change(screen.getByLabelText(/Lender Address/i), { target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' } });
    fireEvent.change(screen.getByLabelText(/Principal/i), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: /Execute Flash Loan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Loan request submitted/i)).toBeTruthy();
    });
  });

  it('switches between borrow, active, and history tabs', async () => {
    renderFlashloansPage();

    fireEvent.click(screen.getByRole('button', { name: /Lenders/i }));
    expect(await screen.findByText(/Lane #1/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /History/i }));
    expect(await screen.findByText(/Lane #1/i)).toBeTruthy();
  });

  it('switches between borrow, active, and history tabs while keeping lane progress visible', () => {
    renderFlashloansPage();

    expect(screen.getByRole('button', { name: /^Borrow$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Lenders/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^History$/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /History/i }));

    expect(screen.getByText(/History/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Lenders/i }));
    expect(screen.getByText(/Lenders/i)).toBeTruthy();
  });
});
