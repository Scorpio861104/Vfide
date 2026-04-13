import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderFlashloanPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/flashloans/page');
  const FlashloanPage = pageModule.default as React.ComponentType;
  return render(<FlashloanPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
}));

jest.mock('../../app/flashloans/components/BorrowTab', () => ({
  BorrowTab: () => <div>Borrow tab content</div>,
}));

jest.mock('../../app/flashloans/components/ActiveTab', () => ({
  ActiveTab: () => <div>Active tab content</div>,
}));

jest.mock('../../app/flashloans/components/HistoryTab', () => ({
  HistoryTab: () => <div>History tab content</div>,
}));

describe('Flashloan page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders flashloans hero and default borrow tab', () => {
    renderFlashloanPage();

    expect(screen.getByRole('heading', { name: /Flash Loans/i })).toBeTruthy();
    expect(screen.getByText(/Zero-collateral instant loans/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Borrow$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Active Loans$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^History$/i })).toBeTruthy();
    expect(screen.getByText(/Borrow tab content/i)).toBeTruthy();
  });

  it('switches to active loans tab', () => {
    renderFlashloanPage();

    fireEvent.click(screen.getByRole('button', { name: /^Active Loans$/i }));
    expect(screen.getByText(/Active tab content/i)).toBeTruthy();
  });

  it('switches to history tab', () => {
    renderFlashloanPage();

    fireEvent.click(screen.getByRole('button', { name: /^History$/i }));
    expect(screen.getByText(/History tab content/i)).toBeTruthy();
  });
});
