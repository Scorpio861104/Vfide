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

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
}));

jest.mock('../../app/social/components/OverviewTab', () => ({
  OverviewTab: () => <div>Overview tab content</div>,
}));

jest.mock('../../app/social/components/EngagementTab', () => ({
  EngagementTab: () => <div>Engagement tab content</div>,
}));

jest.mock('../../app/social/components/GrowthTab', () => ({
  GrowthTab: () => <div>Growth tab content</div>,
}));

describe('Social analytics page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page shell with overview tab active', () => {
    renderSocialPage();

    expect(screen.getByText(/Social Analytics/i)).toBeTruthy();
    expect(screen.getByText(/Community engagement metrics/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Overview$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Engagement$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Growth$/i })).toBeTruthy();
    expect(screen.getByText(/Overview tab content/i)).toBeTruthy();
  });

  it('switches between engagement and growth tabs', () => {
    renderSocialPage();

    fireEvent.click(screen.getByRole('button', { name: /^Engagement$/i }));
    expect(screen.getByText(/Engagement tab content/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Growth$/i }));
    expect(screen.getByText(/Growth tab content/i)).toBeTruthy();
  });
});
