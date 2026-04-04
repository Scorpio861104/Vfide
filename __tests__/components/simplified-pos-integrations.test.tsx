import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockToggle = jest.fn();
const mockAnnounceCartAdd = jest.fn();
const mockAnnounceCartRemove = jest.fn();
const mockAnnounceQRReady = jest.fn();
const mockAnnounceTotal = jest.fn();
const mockStartScanner = jest.fn();
const mockStopScanner = jest.fn();
const mockPrintReceipt = jest.fn();
const mockWritePaymentNFC = jest.fn();

jest.mock('@/hooks/useVoicePOS', () => ({
  useVoicePOS: () => ({
    enabled: false,
    toggle: mockToggle,
    announceCartAdd: mockAnnounceCartAdd,
    announceCartRemove: mockAnnounceCartRemove,
    announceQRReady: mockAnnounceQRReady,
    announceTotal: mockAnnounceTotal,
  }),
}));

jest.mock('@/lib/locale/useTranslation', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('@/lib/barcode', () => ({
  startScanner: (...args: any[]) => mockStartScanner(...args),
  stopScanner: (...args: any[]) => mockStopScanner(...args),
  isScannerSupported: () => true,
}));

jest.mock('@/lib/printer', () => ({
  printReceipt: (...args: any[]) => mockPrintReceipt(...args),
  isPrinterSupported: () => true,
}));

jest.mock('@/lib/nfc', () => ({
  writePaymentNFC: (...args: any[]) => mockWritePaymentNFC(...args),
  isNFCSupported: () => true,
}));

const renderSimplifiedPOS = () => {
  const pageModule = require('@/components/commerce/simplified/SimplifiedPOS');
  const SimplifiedPOS = pageModule.default as React.ComponentType;
  return render(<SimplifiedPOS />);
};

describe('SimplifiedPOS device integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartScanner.mockResolvedValue(undefined);
    mockStopScanner.mockResolvedValue(undefined);
    mockPrintReceipt.mockResolvedValue({ success: true });
    mockWritePaymentNFC.mockResolvedValue({ success: true });
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
      configurable: true,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      value: jest.fn().mockResolvedValue(undefined),
      configurable: true,
    });
  });

  it('renders scanner, tap-to-pay, and print actions for the live POS flow', () => {
    renderSimplifiedPOS();

    expect(screen.getByRole('button', { name: /scan barcode/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /write tap-to-pay/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /print receipt/i })).toBeTruthy();
  });

  it('invokes barcode, NFC, and receipt helpers from the POS workflow', async () => {
    renderSimplifiedPOS();

    fireEvent.click(screen.getByRole('button', { name: /bread/i }));
    fireEvent.click(screen.getByRole('button', { name: /scan barcode/i }));
    fireEvent.click(screen.getByRole('button', { name: /write tap-to-pay/i }));
    fireEvent.click(screen.getByRole('button', { name: /print receipt/i }));

    await waitFor(() => {
      expect(mockStartScanner).toHaveBeenCalled();
      expect(mockWritePaymentNFC).toHaveBeenCalledWith(expect.any(String), 2.5, 'USD');
      expect(mockPrintReceipt).toHaveBeenCalledWith(expect.objectContaining({
        merchantName: 'VFIDE POS',
        total: 2.5,
        items: [expect.objectContaining({ name: 'Bread', qty: 1, price: 2.5 })],
      }));
    });
  });
});
