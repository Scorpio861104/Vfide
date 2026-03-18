import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
  isConnected: true,
};

const mockProgress = {
  level: 3,
  xp: 120,
  xpToNextLevel: 80,
  achievements: ['social_1', 'vault_1'],
  stats: {
    messagesSent: 12,
    friendsAdded: 4,
    groupsCreated: 2,
    paymentsSent: 5,
    daysActive: 7,
    longestStreak: 3,
  },
};

const renderAchievementsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/achievements/page');
  const AchievementsPage = pageModule.default as React.ComponentType;
  return render(<AchievementsPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
}));

jest.mock('@/lib/gamification', () => ({
  useGamification: () => ({ progress: mockAccount.isConnected ? mockProgress : null }),
  ACHIEVEMENTS: {
    social_1: { id: 'social_1', category: 'social' },
    vault_1: { id: 'vault_1', category: 'vault' },
    engagement_1: { id: 'engagement_1', category: 'engagement' },
    milestone_1: { id: 'milestone_1', category: 'milestone' },
  },
  LEVEL_PERKS: [
    { level: 2, title: 'Reduced Fees', description: 'Lower protocol fees', category: 'fee', icon: '⚡' },
    { level: 5, title: 'Governance Boost', description: 'More voting weight', category: 'governance', icon: '🗳️' },
  ],
}));

jest.mock('@/components/gamification/GamificationWidgets', () => ({
  UserStatsWidget: () => <div>User Stats Widget</div>,
  AchievementsList: () => <div>Achievements List</div>,
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Achievements page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
    };
  });

  it('renders wallet-connect state when disconnected', () => {
    mockAccount = {
      address: undefined as unknown as `0x${string}`,
      isConnected: false,
    };

    renderAchievementsPage();

    expect(screen.getByRole('heading', { name: /View Your Achievements/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });

  it('renders achievements dashboard and switches to level perks', () => {
    renderAchievementsPage();

    expect(screen.getByRole('heading', { name: /Achievements/i })).toBeTruthy();
    expect(screen.getByText(/Track your progress and unlock rewards/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Level Perks/i }));
    expect(screen.getAllByText(/Level Perks/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reduced Fees/i)).toBeTruthy();
  });

  it('shows progress analytics when switching to stats tab', () => {
    renderAchievementsPage();

    fireEvent.click(screen.getByRole('button', { name: /Stats/i }));

    expect(screen.getByRole('heading', { name: /Your Progress/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Category Breakdown/i })).toBeTruthy();
    expect(screen.getByText(/Level 3/i)).toBeTruthy();
  });
});
