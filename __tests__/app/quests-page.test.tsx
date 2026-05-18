import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderQuestsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/quests/page');
  const QuestsPage = pageModule.default as React.ComponentType;
  return render(<QuestsPage />);
};

jest.mock('@/components/gamification/DailyQuestsPanel', () => ({
  __esModule: true,
  default: () => <div>Daily Quests Panel Widget</div>,
}));

jest.mock('@/components/gamification/OnboardingChecklist', () => ({
  __esModule: true,
  default: () => <div>Onboarding Checklist Widget</div>,
}));

jest.mock('lucide-react', () => ({
  Target: ({ className }: { className?: string }) => <span className={className}>icon</span>,
}));

describe('Quests page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders quests header and mission subtitle copy', () => {
    renderQuestsPage();

    expect(screen.getByRole('heading', { name: /Daily Quests/i })).toBeTruthy();
    expect(screen.getByText(/Complete governance challenges and earn participation XP/i)).toBeTruthy();
  });

  it('mounts daily quests and onboarding modules', () => {
    renderQuestsPage();

    expect(screen.getByText(/Daily Quests Panel Widget/i)).toBeTruthy();
    expect(screen.getByText(/Onboarding Checklist Widget/i)).toBeTruthy();
  });
});
