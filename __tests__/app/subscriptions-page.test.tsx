import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderSubscriptionsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/subscriptions/page');
  const SubscriptionsPage = pageModule.default as React.ComponentType;
  return render(<SubscriptionsPage />);
};

jest.mock('../../app/subscriptions/components/ActiveTab', () => ({
  ActiveTab: () => <div>Active subscriptions content</div>,
}));

jest.mock('../../app/subscriptions/components/CreateTab', () => ({
  CreateTab: () => <div>Create subscriptions content</div>,
}));

jest.mock('../../app/subscriptions/components/HistoryTab', () => ({
  HistoryTab: () => <div>History subscriptions content</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

describe('Subscriptions page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders subscriptions heading and default active tab', () => {
    renderSubscriptionsPage();

    expect(screen.getByText(/^Subscriptions$/i)).toBeTruthy();
    expect(screen.getByText(/Recurring payments/i)).toBeTruthy();
    expect(screen.getByText(/Active subscriptions content/i)).toBeTruthy();
  });

  it('renders tab navigation labels', () => {
    renderSubscriptionsPage();

    expect(screen.getByRole('button', { name: /^Active$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Create$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^History$/i })).toBeTruthy();
  });

  it('switches to create tab content', () => {
    renderSubscriptionsPage();

    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));
    expect(screen.getByText(/Create subscriptions content/i)).toBeTruthy();
  });
});
