import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

let mockParams: Record<string, string> = {};

const renderCheckoutPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/checkout/[id]/page');
  const CheckoutPage = pageModule.default as React.ComponentType;
  return render(<CheckoutPage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
  }),
}));

jest.mock('@/hooks/useMerchantHooks', () => ({
  usePayMerchant: () => ({
    payMerchant: jest.fn(),
    isPaying: false,
  }),
}));

jest.mock('@/lib/auth/client', () => ({
  getAuthHeaders: () => ({}),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Shield: Icon,
    Clock: Icon,
    CheckCircle: Icon,
    AlertTriangle: Icon,
    FileText: Icon,
    ExternalLink: Icon,
  };
});

describe('Checkout route param guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    (global as any).fetch = mockFetch;
  });

  it('renders not-found state when the checkout id route param is missing', async () => {
    renderCheckoutPage();

    expect(await screen.findByRole('heading', { name: /Invoice Not Found/i })).toBeTruthy();
    expect(screen.getByText(/payment link may have expired or been removed/i)).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});