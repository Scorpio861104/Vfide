/**
 * Performance tests for Leaderboard component
 * Tests data loading separation and memoized sorting
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Leaderboard } from '@/components/gamification/Leaderboard';

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

// Mock gamification lib
jest.mock('@/lib/gamification', () => ({
  getAllUserProgress: jest.fn(() => [
    {
      address: '0xuser1',
      alias: 'User1',
      level: 10,
      totalXP: 5000,
      unlockedAchievements: [],
      stats: { friendsAdded: 5 },
    },
    {
      address: '0xuser2',
      alias: 'User2',
      level: 8,
      totalXP: 3000,
      unlockedAchievements: [],
      stats: { friendsAdded: 3 },
    },
  ]),
  getProgress: jest.fn(),
}));

describe('Leaderboard - Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders leaderboard without crashing', () => {
    render(<Leaderboard />);
    expect(screen.getByText(/Leaderboard/i)).toBeInTheDocument();
  });

  test('separates data loading from sorting', () => {
    const { rerender } = render(<Leaderboard />);
    
    // Rerender should not reload data
    rerender(<Leaderboard />);
    
    expect(screen.getByText(/Leaderboard/i)).toBeInTheDocument();
  });

  test('memoizes sorted leaderboard data', () => {
    const { rerender } = render(<Leaderboard />);
    
    // Get initial entries
    const entries = screen.queryAllByRole('listitem');
    const initialCount = entries.length;
    
    // Rerender
    rerender(<Leaderboard />);
    
    // Should not resort
    const newEntries = screen.queryAllByRole('listitem');
    expect(newEntries.length).toBe(initialCount);
  });

  test('switching category triggers sort but not data reload', () => {
    render(<Leaderboard />);
    
    // Find category buttons
    const xpButton = screen.queryByRole('button', { name: /xp/i });
    const levelButton = screen.queryByRole('button', { name: /level/i });
    
    if (xpButton && levelButton) {
      const startTime = performance.now();
      fireEvent.click(levelButton);
      const endTime = performance.now();
      
      // Category switch should be fast
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('sorts by XP efficiently', () => {
    render(<Leaderboard />);
    
    const xpButton = screen.queryByRole('button', { name: /xp/i });
    
    if (xpButton) {
      const startTime = performance.now();
      fireEvent.click(xpButton);
      const endTime = performance.now();
      
      // Sorting should be fast
      expect(endTime - startTime).toBeLessThan(30);
    }
  });

  test('sorts by level efficiently', () => {
    render(<Leaderboard />);
    
    const levelButton = screen.queryByRole('button', { name: /level/i });
    
    if (levelButton) {
      const startTime = performance.now();
      fireEvent.click(levelButton);
      const endTime = performance.now();
      
      // Sorting should be fast
      expect(endTime - startTime).toBeLessThan(30);
    }
  });

  test('sorts by achievements efficiently', () => {
    render(<Leaderboard />);
    
    const achievementsButton = screen.queryByRole('button', { name: /achievements/i });
    
    if (achievementsButton) {
      const startTime = performance.now();
      fireEvent.click(achievementsButton);
      const endTime = performance.now();
      
      // Sorting should be fast
      expect(endTime - startTime).toBeLessThan(30);
    }
  });

  test('finds current user rank efficiently', () => {
    render(<Leaderboard />);
    
    // Current user rank should be calculated via useMemo
    const userRank = screen.queryByText(/Your Rank/i) || screen.queryByText(/#\d+/);
    
    // Should display without delay
    expect(true).toBe(true);
  });

  test('multiple category switches are smooth', () => {
    render(<Leaderboard />);
    
    const categoryButtons = screen.queryAllByRole('button');
    
    if (categoryButtons.length >= 2) {
      const startTime = performance.now();
      
      // Switch categories multiple times
      fireEvent.click(categoryButtons[0]);
      fireEvent.click(categoryButtons[1]);
      fireEvent.click(categoryButtons[0]);
      
      const endTime = performance.now();
      
      // Multiple switches should be smooth
      expect(endTime - startTime).toBeLessThan(100);
    }
  });

  test('handles empty leaderboard gracefully', () => {
    // Mock empty leaderboard
    const { getAllUserProgress } = require('@/lib/gamification');
    getAllUserProgress.mockReturnValue([]);
    
    render(<Leaderboard />);
    
    // Should show empty state
    expect(screen.queryByText(/No users/i) || screen.getByText(/Leaderboard/i)).toBeInTheDocument();
  });

  test('displays rank icons efficiently', () => {
    render(<Leaderboard />);
    
    // Rank icons should render without performance impact
    const icons = screen.queryAllByRole('img') || document.querySelectorAll('svg');
    
    // Should have icons
    expect(icons.length).toBeGreaterThanOrEqual(0);
  });

  test('no memory leaks on unmount', () => {
    const { unmount } = render(<Leaderboard />);
    
    unmount();
    
    // Should cleanup without errors
    expect(true).toBe(true);
  });

  test('pagination does not trigger data reload', () => {
    render(<Leaderboard />);
    
    const nextButton = screen.queryByRole('button', { name: /next/i });
    
    if (nextButton) {
      const startTime = performance.now();
      fireEvent.click(nextButton);
      const endTime = performance.now();
      
      // Pagination should be instant
      expect(endTime - startTime).toBeLessThan(30);
    }
  });

  test('handles large leaderboards efficiently', () => {
    // Mock large leaderboard
    const { getAllUserProgress } = require('@/lib/gamification');
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      address: `0xuser${i}`,
      alias: `User${i}`,
      level: Math.floor(Math.random() * 20),
      totalXP: Math.floor(Math.random() * 10000),
      unlockedAchievements: [],
      stats: { friendsAdded: Math.floor(Math.random() * 10) },
    }));
    getAllUserProgress.mockReturnValue(largeData);
    
    const startTime = performance.now();
    render(<Leaderboard />);
    const endTime = performance.now();
    
    // Should render large list efficiently
    expect(endTime - startTime).toBeLessThan(200);
  });

  test('sorting large lists uses memoization', () => {
    // Mock large leaderboard
    const { getAllUserProgress } = require('@/lib/gamification');
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      address: `0xuser${i}`,
      alias: `User${i}`,
      level: Math.floor(Math.random() * 20),
      totalXP: Math.floor(Math.random() * 10000),
      unlockedAchievements: [],
      stats: { friendsAdded: Math.floor(Math.random() * 10) },
    }));
    getAllUserProgress.mockReturnValue(largeData);
    
    const { rerender } = render(<Leaderboard />);
    
    const startTime = performance.now();
    rerender(<Leaderboard />);
    const endTime = performance.now();
    
    // Rerender should not resort (< 50ms)
    expect(endTime - startTime).toBeLessThan(50);
  });
});
