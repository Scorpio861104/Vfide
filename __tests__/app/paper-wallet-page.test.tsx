import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/paper-wallet/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/components/layout/Footer', () => ({ Footer: () => <div data-testid="footer" /> }));
jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,abc') }));
jest.mock('viem', () => ({ bytesToHex: () => '0xabc',
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  isAddress: jest.fn((a: any) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a)),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
})),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  isAddress: jest.fn((a: any) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a)),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}));
jest.mock('viem/accounts', () => ({
  english: {},
  generateMnemonic: () => 'one two three four five six seven eight nine ten eleven twelve',
  mnemonicToAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    getHdKey: () => ({ privateKey: new Uint8Array([1, 2, 3]) }),
  }),
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

describe('Paper wallet page', () => {
  it('renders page header and security warning', () => {
    renderPage();
    expect(screen.getByText(/^Paper Wallet$/i)).toBeTruthy();
    expect(screen.getByText(/Security Warning/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Generate$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Guide/i })).toBeTruthy();
  });
});
