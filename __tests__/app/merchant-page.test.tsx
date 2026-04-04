import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMerchantPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/merchant/page');
  const MerchantPage = pageModule.default as React.ComponentType;
  return render(<MerchantPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/merchant/MerchantDashboard', () => ({
  MerchantDashboard: () => <div>Merchant Dashboard Component</div>,
}));

jest.mock('@/components/merchant/PaymentInterface', () => ({
  PaymentInterface: () => <div>Payment Interface Component</div>,
}));

jest.mock('@/components/merchant/PaymentQR', () => ({
  PaymentQR: () => <div>Payment QR Component</div>,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/error/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Merchant page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders portal hero and integrated merchant modules', () => {
    renderMerchantPage();

    expect(screen.getByRole('heading', { name: /Merchant Portal/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Merchant Dashboard/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Make Payment/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Generate Payment QR Code/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /gift cards/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /returns/i })).toBeTruthy();
    expect(screen.getByText('Merchant Dashboard Component')).toBeTruthy();
    expect(screen.getByText('Payment Interface Component')).toBeTruthy();
    expect(screen.getByText('Payment QR Component')).toBeTruthy();
  });

  it('renders comparison and onboarding sections for merchant flow', () => {
    renderMerchantPage();

    expect(screen.getByRole('heading', { name: /vs Traditional Processors/i })).toBeTruthy();
    expect(screen.getAllByText(/Processing Fee/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0%\*/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Getting Started/i })).toBeTruthy();
    expect(screen.getAllByText(/Register Your Business/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Configure Settings/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Start Accepting Payments/i).length).toBeGreaterThan(0);
  });
});