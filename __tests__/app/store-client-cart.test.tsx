import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

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

jest.mock('@/components/merchant/MerchantTrustBadge', () => ({
  MerchantTrustBadge: () => <div data-testid="merchant-trust-badge" />,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('../../app/(commerce)/store/[slug]/components/ShareStoreSheet', () => ({
  ShareStoreSheet: () => null,
}));

jest.mock('@/components/checkout/CheckoutPanel', () => ({
  CheckoutPanel: ({ items }: { items: Array<{ name: string }> }) => (
    <div data-testid="checkout-panel">Checkout for {items.map((item) => item.name).join(', ')}</div>
  ),
}));

const renderStoreClient = () => {
  const { CartProvider } = require('../../providers/CartProvider');
  const { StoreClient } = require('../../app/(commerce)/store/[slug]/components/StoreClient');

  return render(
    <CartProvider>
      <StoreClient
        merchant={{
          merchant_address: '0x1111111111111111111111111111111111111111',
          display_name: 'Kofi Market',
          theme_color: '#06b6d4',
        }}
        slug="kofi-market"
        initialProducts={[
          {
            id: 'prod-1',
            name: 'Kente Cloth',
            slug: 'kente-cloth',
            price: '12.00',
            compare_at_price: null,
            images: [],
            product_type: 'physical',
            description: 'Handwoven cloth',
          },
        ]}
      />
    </CartProvider>
  );
};

describe('Store cart flow', () => {
  it('adds storefront items to the shared cart and opens checkout', () => {
    renderStoreClient();

    expect(screen.queryByText(/items in cart/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /add kente cloth to cart/i }));

    expect(screen.getByText(/1 item in cart/i)).toBeTruthy();
    expect(screen.getByText(/\$12\.00 each/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /checkout/i }));

    expect(screen.getByTestId('checkout-panel').textContent).toContain('Checkout for Kente Cloth');
  });
});
