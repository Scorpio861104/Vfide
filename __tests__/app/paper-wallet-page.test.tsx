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
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
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
  const MotionTag = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return { motion: new Proxy({}, { get: () => MotionTag }), AnimatePresence: ({ children }: any) => <>{children}</> };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Paper wallet page', () => {
  it('renders page header and security warning', () => {
    renderPage();
    expect(screen.getByText(/^Paper Wallet$/i)).toBeTruthy();
    expect(screen.getByText(/Security Warning/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Generate$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Verify/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Guide/i })).toBeTruthy();
  });
});
