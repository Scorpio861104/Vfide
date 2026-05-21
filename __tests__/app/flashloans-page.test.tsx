import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FlashLoansPage from '../../app/flashloans/page';
import React from 'react';

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

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

describe('FlashLoansPage route integrations', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as typeof global & { fetch: jest.Mock }).fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/flashloans/lanes') && (!init?.method || init.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            lanes: [
              {
                id: 7,
                borrower_address: '0x1111111111111111111111111111111111111111',
                lender_address: '0x2222222222222222222222222222222222222222',
                arbiter_address: '0x3333333333333333333333333333333333333333',
                principal: '1500',
                duration_days: 14,
                interest_bps: 600,
                collateral_pct: 125,
                drawn_amount: '1200',
                stage: 'drawn',
                sim_day: 3,
                due_day: 14,
                created_at: '2026-03-10T12:00:00.000Z',
                evidence_note: '',
              },
              {
                id: 8,
                borrower_address: '0x1111111111111111111111111111111111111111',
                lender_address: '0x2222222222222222222222222222222222222222',
                arbiter_address: '0x3333333333333333333333333333333333333333',
                principal: '800',
                duration_days: 7,
                interest_bps: 400,
                collateral_pct: 120,
                drawn_amount: '800',
                stage: 'resolved-lender',
                sim_day: 9,
                due_day: 7,
                created_at: '2026-03-01T12:00:00.000Z',
                evidence_note: 'Borrower missed the repayment window and lender supplied evidence.',
              },
            ],
          }),
        } as Response);
      }

      if (url.endsWith('/api/flashloans/lanes') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            lane: {
              id: 21,
              borrower_address: '0x1111111111111111111111111111111111111111',
              lender_address: '0x2222222222222222222222222222222222222222',
              arbiter_address: '0x3333333333333333333333333333333333333333',
              principal: '2400',
              duration_days: 10,
              interest_bps: 500,
              collateral_pct: 130,
              drawn_amount: '1800',
              stage: 'draft',
              sim_day: 0,
              due_day: null,
              created_at: '2026-03-14T12:00:00.000Z',
              evidence_note: '',
            },
          }),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({ error: 'Unexpected request' }),
      } as Response);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('creates a server-backed flash lane from the borrow tab', async () => {
    render(<FlashLoansPage />);

    fireEvent.change(screen.getByLabelText(/Lender address/i), {
      target: { value: '0x2222222222222222222222222222222222222222' },
    });
    fireEvent.change(screen.getByLabelText(/Principal/i), { target: { value: '2400' } });
    fireEvent.click(screen.getByRole('button', { name: /Request Flash Loan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Loan request submitted!/i)).toBeInTheDocument();
    });
  });

  it('loads active lanes and historical outcomes from the flashloan API', async () => {
    render(<FlashLoansPage />);

    fireEvent.click(screen.getByRole('button', { name: /Active Loans/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lane #7/i)).toBeInTheDocument();
      expect(screen.getByText(/drawn/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /History/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lane #8/i)).toBeInTheDocument();
      expect(screen.getByText(/resolved-lender/i)).toBeInTheDocument();
    });
  });
});
