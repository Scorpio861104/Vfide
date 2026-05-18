import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderPOSPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/pos/page');
  const POSPage = pageModule.default as React.ComponentType;
  return render(<POSPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/commerce/MerchantPOS', () => ({
  MerchantPOS: () => <div>Merchant POS Component</div>,
}));

describe('POS page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders point-of-sale page shell and mounted POS component', () => {
    renderPOSPage();

    expect(screen.getByText(/Point of Sale/i)).toBeTruthy();
    expect(screen.getByText(/Merchant POS Component/i)).toBeTruthy();
  });
});
