import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderSeerServicePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/seer-service/page');
  const SeerServicePage = pageModule.default as React.ComponentType;
  return render(<SeerServicePage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('../../app/seer-service/components/DashboardTab', () => ({
  DashboardTab: () => <div>Dashboard Tab Content</div>,
}));

jest.mock('../../app/seer-service/components/InsightsTab', () => ({
  InsightsTab: () => <div>Insights Tab Content</div>,
}));

jest.mock('../../app/seer-service/components/SettingsTab', () => ({
  SettingsTab: () => <div>Settings Tab Content</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
}));

describe('Seer service page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page shell with heading, subtitle, and footer', () => {
    renderSeerServicePage();

    expect(screen.getByRole('heading', { name: /Seer Service/i })).toBeTruthy();
    expect(screen.getByText(/AI-powered insights/i)).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });

  it('defaults to Dashboard tab and switches to Insights and Settings', () => {
    renderSeerServicePage();

    expect(screen.getByText('Dashboard Tab Content')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Insights/i }));
    expect(screen.getByText('Insights Tab Content')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
    expect(screen.getByText('Settings Tab Content')).toBeTruthy();
  });
});
