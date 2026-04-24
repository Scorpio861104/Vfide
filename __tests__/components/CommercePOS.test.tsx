import { describe, expect, it, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: any) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
  useSignMessage: () => ({
    signMessageAsync: jest.fn(),
    isPending: false,
  }),
  useWatchContractEvent: () => undefined,
}));

jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: any) => <div data-testid="qr-code">{value}</div>,
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useIsMerchant: () => ({
    isMerchant: true,
    businessName: 'Test Coffee Shop',
    isLoading: false,
  }),
  useFeeCalculator: () => ({
    traditionalFee: '0.50',
    vfideFee: '0.10',
    savings: '0.40',
    vfideRate: 1,
  }),
}));

import { MerchantPOS } from '@/components/commerce/MerchantPOS';

describe('MerchantPOS', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      }),
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<MerchantPOS />);
    expect(container).toBeInTheDocument();
  });

  it('shows merchant heading and primary tabs', () => {
    render(<MerchantPOS />);

    expect(screen.getByText(/Test Coffee Shop/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Point of Sale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Products & Menu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sales & Reports/i })).toBeInTheDocument();
  });

  it('shows product and cart panels', () => {
    render(<MerchantPOS />);

    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Cart')).toBeInTheDocument();
  });

  it('supports tab clicks', () => {
    render(<MerchantPOS />);

    fireEvent.click(screen.getByRole('button', { name: /Products & Menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sales & Reports/i }));
    fireEvent.click(screen.getByRole('button', { name: /Point of Sale/i }));

    expect(screen.getByText('Cart')).toBeInTheDocument();
  });

  it('shows empty-cart baseline', () => {
    render(<MerchantPOS />);

    expect(screen.getByText(/Cart is empty/i)).toBeInTheDocument();
  });
});
