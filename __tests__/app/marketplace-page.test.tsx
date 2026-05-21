import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MarketplacePage from '../../app/marketplace/page';
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

jest.mock('../../app/marketplace/components/ProductGridCard', () => ({
  ProductGridCard: ({ product }: any) => <div>{product.name}</div>,
}));

jest.mock('../../app/marketplace/components/ProductListCard', () => ({
  ProductListCard: ({ product }: any) => <div>{product.name}</div>,
}));

describe('MarketplacePage live catalog integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as typeof global & { fetch: jest.Mock }).fetch = jest.fn((_input: RequestInfo | URL) => {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          products: [
            { id: 'p1', name: 'Kente Cloth', price: '55.00' },
            { id: 'p2', name: 'Leather Sandals', price: '72.00' },
          ],
          pagination: { page: 1, limit: 24, total: 2, pages: 1 },
          facets: { min_price: '55.00', max_price: '72.00' },
        }),
      } as Response);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('loads marketplace products from the live merchant products API', async () => {
    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Kente Cloth')).toBeInTheDocument();
      expect(screen.getByText('Leather Sandals')).toBeInTheDocument();
    });

    expect(String((global.fetch as jest.Mock).mock.calls[0]?.[0])).toContain('/api/merchant/products?');
    expect(String((global.fetch as jest.Mock).mock.calls[0]?.[0])).toContain('status=active');
  });

  it('applies filters client-side without re-querying the API', async () => {
    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Kente Cloth')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '50' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'price-desc' } });

    await waitFor(() => {
      expect(screen.getByText('Kente Cloth')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
