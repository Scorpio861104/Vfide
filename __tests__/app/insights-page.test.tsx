import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderInsightsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/insights/page');
  const InsightsPage = pageModule.default as React.ComponentType;
  return render(<InsightsPage />);
};

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  ),
}));

jest.mock('@/components/FinancialDashboard', () => ({
  __esModule: true,
  default: () => <div>Financial Dashboard Widget</div>,
}));

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  BarChart3: ({ className }: { className?: string }) => <span className={className}>icon</span>,
});
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})());

describe('Insights page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders insight command shell and financial dashboard widget', () => {
    renderInsightsPage();

    expect(screen.getAllByRole('heading', { name: /Insight Command/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Track treasury, revenue, and token momentum in real time/i)).toBeTruthy();
    expect(screen.getByText(/Financial Dashboard Widget/i)).toBeTruthy();
  });
});
