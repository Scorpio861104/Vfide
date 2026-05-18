import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockRefetch = jest.fn();

let mockLeaderboardState: {
  entries: Array<{
    rank: number;
    address: `0x${string}`;
    score: number;
    tier: string;
    badges: number;
    change: number;
  }>;
  isLoading: boolean;
  error: Error | null;
  totalParticipants: number;
};

const renderLeaderboardPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/leaderboard/page');
  const LeaderboardPage = pageModule.default as React.ComponentType;
  return render(<LeaderboardPage />);
};

jest.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    ...mockLeaderboardState,
    refetch: mockRefetch,
  }),
  useUserRank: () => ({ rank: 7 }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/FormElements', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/Animations', () => ({
  Counter: ({ value }: { value: number }) => <span>{value}</span>,
}));

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'button') {
          return ({ children, ...props }: any) => <button {...props}>{children}</button>;
        }
        return ({ children, ...props }: any) => <div {...props}>{children}</div>;
      },
    }
  );

  return { motion };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Leaderboard page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboardState = {
      entries: [
        { rank: 1, address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', score: 9800, tier: 'CHAMPION', badges: 12, change: 1 },
        { rank: 2, address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 9200, tier: 'GUARDIAN', badges: 10, change: 0 },
        { rank: 3, address: '0xcccccccccccccccccccccccccccccccccccccccc', score: 8900, tier: 'DELEGATE', badges: 8, change: -1 },
      ],
      isLoading: false,
      error: null,
      totalParticipants: 777,
    };
  });

  it('renders leaderboard stats and podium from live entries', () => {
    renderLeaderboardPage();

    expect(screen.getByRole('heading', { name: /ProofScore Leaderboard/i })).toBeTruthy();
    expect(screen.getByText(/Total Participants/i)).toBeTruthy();
    expect(screen.getByText(/Average Score/i)).toBeTruthy();
    expect(screen.getByText(/Top Score/i)).toBeTruthy();
    expect(screen.getByText(/Your Rank:/i)).toBeTruthy();
    expect(screen.getAllByText(/1st|2nd|3rd/i).length).toBeGreaterThan(0);
  });

  it('switches timeframe and triggers refresh action', () => {
    renderLeaderboardPage();

    fireEvent.click(screen.getByRole('button', { name: /This Week/i }));
    fireEvent.click(screen.getByRole('button', { name: /This Month/i }));
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});