import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderRewardsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/rewards/page');
  const RewardsPage = pageModule.default as React.ComponentType;
  return render(<RewardsPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

describe('Rewards page compliance pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders no-rewards policy and governance utility messaging', () => {
    renderRewardsPage();

    expect(screen.getByRole('heading', { name: /No Token Rewards/i })).toBeTruthy();
    expect(screen.getByText(/VFIDE is a governance utility token\./i)).toBeTruthy();
    expect(screen.getByText(/there are no referral bonuses/i)).toBeTruthy();
    expect(screen.getByText(/Governance voting rights/i)).toBeTruthy();
    expect(screen.getByText(/Protocol access/i)).toBeTruthy();
    expect(screen.getByText(/Governance duty points/i)).toBeTruthy();
    expect(screen.getByText(/Why no rewards\?/i)).toBeTruthy();
  });
});