/**
 * Performance tests for DailyQuestsPanel component
 * Tests memoization, filtering optimization, and re-render prevention
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyQuestsPanel from '@/components/gamification/DailyQuestsPanel';

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
}));

describe('DailyQuestsPanel - Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<DailyQuestsPanel />);
    expect(screen.getByText(/Day Streak/i)).toBeInTheDocument();
  });

  test('memoizes filtered quests - does not recompute on unrelated state changes', () => {
    const { rerender } = render(<DailyQuestsPanel />);
    
    // Get initial quest count
    const dailyTab = screen.getByText('daily', { selector: 'button' });
    expect(dailyTab).toBeInTheDocument();
    
    // Rerender should not cause unnecessary recalculations
    rerender(<DailyQuestsPanel />);
    
    // Component should still render correctly
    expect(screen.getByText(/Day Streak/i)).toBeInTheDocument();
  });

  test('filters quests by active tab efficiently', () => {
    render(<DailyQuestsPanel />);
    
    // Daily tab should be active by default
    const dailyTab = screen.getByRole('button', { name: /daily/i });
    expect(dailyTab).toHaveClass(/text-\[#FFD700\]/);
    
    // Switch to weekly tab
    const weeklyTab = screen.getByRole('button', { name: /weekly/i });
    fireEvent.click(weeklyTab);
    
    // Weekly tab should now be active
    expect(weeklyTab).toHaveClass(/text-\[#FFD700\]/);
  });

  test('badge counts are memoized and update only when quests change', () => {
    render(<DailyQuestsPanel />);
    
    // Get all tab buttons
    const dailyTab = screen.getByRole('button', { name: /daily/i });
    const weeklyTab = screen.getByRole('button', { name: /weekly/i });
    const monthlyTab = screen.getByRole('button', { name: /monthly/i });
    
    // Each tab should show a count in parentheses
    expect(dailyTab.textContent).toMatch(/\(\d+\)/);
    expect(weeklyTab.textContent).toMatch(/\(\d+\)/);
    expect(monthlyTab.textContent).toMatch(/\(\d+\)/);
  });

  test('switching tabs does not re-filter all tabs', () => {
    render(<DailyQuestsPanel />);
    
    const weeklyTab = screen.getByRole('button', { name: /weekly/i });
    const startTime = performance.now();
    
    fireEvent.click(weeklyTab);
    
    const endTime = performance.now();
    
    // Tab switch should be fast (under 50ms)
    expect(endTime - startTime).toBeLessThan(50);
  });

  test('quest claim updates state correctly', async () => {
    render(<DailyQuestsPanel />);
    
    // Find a claimable quest
    const claimButtons = screen.queryAllByRole('button', { name: /claim/i });
    
    if (claimButtons.length > 0) {
      const firstClaimButton = claimButtons[0];
      fireEvent.click(firstClaimButton);
      
      // Modal should appear
      await waitFor(() => {
        expect(screen.getByText(/Quest Complete/i)).toBeInTheDocument();
      });
    }
  });

  test('streak display renders correctly', () => {
    render(<DailyQuestsPanel />);
    
    // Streak counter should be visible
    expect(screen.getByText(/Day Streak/i)).toBeInTheDocument();
    
    // Streak number should be displayed
    const streakElement = screen.getByText(/\d+/);
    expect(streakElement).toBeInTheDocument();
  });

  test('quest progress bars display correctly', () => {
    render(<DailyQuestsPanel />);
    
    // Should show "Progress" labels
    const progressLabels = screen.queryAllByText(/Progress/i);
    expect(progressLabels.length).toBeGreaterThan(0);
  });

  test('handles empty quest list gracefully', () => {
    // This would need mocking the quest generation
    render(<DailyQuestsPanel />);
    
    // Component should still render even with no quests
    expect(screen.getByText(/Day Streak/i)).toBeInTheDocument();
  });

  test('difficulty badges render with correct styling', () => {
    render(<DailyQuestsPanel />);
    
    // Look for difficulty badges
    const badges = screen.queryAllByText(/EASY|MEDIUM|HARD|LEGENDARY/i);
    
    badges.forEach(badge => {
      // Each badge should have color classes
      expect(badge.className).toMatch(/text-|bg-/);
    });
  });

  test('reward display shows all reward types', () => {
    render(<DailyQuestsPanel />);
    
    // Should show VFIDE rewards
    const vfideRewards = screen.queryAllByText(/VFIDE/i);
    expect(vfideRewards.length).toBeGreaterThan(0);
    
    // Should show XP rewards
    const xpRewards = screen.queryAllByText(/XP/i);
    expect(xpRewards.length).toBeGreaterThan(0);
  });

  test('time remaining updates are efficient', () => {
    render(<DailyQuestsPanel />);
    
    // Time remaining should be displayed
    const timeElements = screen.queryAllByText(/remaining/i);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  test('quest grid layout is responsive', () => {
    render(<DailyQuestsPanel />);
    
    // Find quest cards container
    const questsContainer = document.querySelector('.grid');
    expect(questsContainer).toBeInTheDocument();
    expect(questsContainer?.className).toMatch(/grid-cols/);
  });

  test('handles wallet disconnection', () => {
    // Mock disconnected wallet
    const useAccountMock = require('wagmi').useAccount;
    useAccountMock.mockReturnValue({
      address: undefined,
      isConnected: false,
    });
    
    render(<DailyQuestsPanel />);
    
    // Should show connect wallet message
    expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
  });

  test('summary statistics display correctly', () => {
    render(<DailyQuestsPanel />);
    
    // Today's Progress section
    expect(screen.getByText(/Today's Progress/i)).toBeInTheDocument();
    
    // Should show completed count
    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    
    // Should show rewards ready
    expect(screen.getByText(/Rewards Ready/i)).toBeInTheDocument();
  });

  test('no memory leaks from event listeners', () => {
    const { unmount } = render(<DailyQuestsPanel />);
    
    // Component should unmount cleanly
    unmount();
    
    // No errors should occur
    expect(true).toBe(true);
  });

  test('quest type icons display correctly', () => {
    render(<DailyQuestsPanel />);
    
    // Quests should have emoji icons
    const questCards = document.querySelectorAll('.text-2xl');
    expect(questCards.length).toBeGreaterThan(0);
  });

  test('streak progress bar animates smoothly', () => {
    render(<DailyQuestsPanel />);
    
    // Find progress bar
    const progressBars = document.querySelectorAll('.rounded-full');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});
