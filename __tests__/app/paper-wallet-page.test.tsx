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
jest.mock('viem', () => ({ bytesToHex: () => '0xabc' }));
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
    expect(screen.getByRole('heading', { name: /Paper Wallet Generator/i })).toBeTruthy();
    expect(screen.getByText(/Important Security Information/i)).toBeTruthy();
    expect(screen.getByText(/Select Wallet Type/i)).toBeTruthy();
  });
});
