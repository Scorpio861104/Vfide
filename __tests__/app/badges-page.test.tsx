import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const renderBadgesPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/badges/page');
  const BadgesPage = pageModule.default as React.ComponentType;
  return render(<BadgesPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('../../app/badges/components/CollectionTab', () => ({
  CollectionTab: () => <div>Collection tab content</div>,
}));

jest.mock('../../app/badges/components/AvailableTab', () => ({
  AvailableTab: () => <div>Available tab content</div>,
}));

jest.mock('../../app/badges/components/HistoryTab', () => ({
  HistoryTab: () => <div>History tab content</div>,
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

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Badges page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders badges heading and default collection tab', () => {
    renderBadgesPage();

    expect(screen.getByRole('heading', { name: /^Badges$/i })).toBeTruthy();
    expect(screen.getByText(/Earn badges through real activity/i)).toBeTruthy();
    expect(screen.getByText(/Collection tab content/i)).toBeTruthy();
  });

  it('shows tab navigation labels', () => {
    renderBadgesPage();

    expect(screen.getByRole('button', { name: /^Collection$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Available$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^History$/i })).toBeTruthy();
  });

  it('switches to available tab content', () => {
    renderBadgesPage();

    fireEvent.click(screen.getByRole('button', { name: /^Available$/i }));
    expect(screen.getByText(/Available tab content/i)).toBeTruthy();
  });
});
