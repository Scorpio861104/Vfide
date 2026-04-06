import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderSocialPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/social/page');
  const SocialPage = pageModule.default as React.ComponentType;
  return render(<SocialPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    circle: ({ ...props }: any) => <circle {...props} />,
  },
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Users: Icon,
    Heart: Icon,
    MessageCircle: Icon,
    Share2: Icon,
    ArrowUp: Icon,
    ArrowDown: Icon,
    ArrowRight: Icon,
  };
});

describe('Social analytics page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders analytics dashboard with metric and influence sections', () => {
    renderSocialPage();

    expect(screen.getByRole('heading', { name: /Social Analytics/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Key Metrics/i })).toBeTruthy();
    expect(screen.getByText(/privacy-safe snapshot of social analytics/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Influence Score/i })).toBeTruthy();
    expect(screen.getByText(/verified engagement, trust activity, and payments/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Go to Social Hub/i }).getAttribute('href')).toBe('/social-hub');
  });

  it('switches time ranges and keeps engagement sections visible', () => {
    renderSocialPage();

    fireEvent.click(screen.getByRole('button', { name: /^Month$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Year/i }));

    expect(screen.getByRole('heading', { name: /Engagement Trends/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Community Health/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Insights & Recommendations/i })).toBeTruthy();
  });
});