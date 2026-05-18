import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderAchievementsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/achievements/page');
  const AchievementsPage = pageModule.default as React.ComponentType;
  return render(<AchievementsPage />);
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

jest.mock('../../app/achievements/components/AchievementsTab', () => ({
  AchievementsTab: () => <div>Achievements tab content</div>,
}));

jest.mock('../../app/achievements/components/PerksTab', () => ({
  PerksTab: () => <div>Perks tab content</div>,
}));

describe('Achievements page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading and default achievements tab', () => {
    renderAchievementsPage();

    expect(screen.getAllByText(/^Achievements$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Track progress and unlock rewards/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Achievements$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Perks$/i })).toBeTruthy();
    expect(screen.getByText(/Achievements tab content/i)).toBeTruthy();
  });

  it('switches to perks tab', () => {
    renderAchievementsPage();

    fireEvent.click(screen.getByRole('button', { name: /^Perks$/i }));
    expect(screen.getByText(/Perks tab content/i)).toBeTruthy();
  });
});
