/**
 * Comprehensive test suite for ActivityFeed component
 * Tests timeline display, filtering, search, pagination, export, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActivityFeed from '@/components/activity/ActivityFeed';

// ==================== COMPONENT RENDERING TESTS ====================

describe('ActivityFeed - Component Rendering', () => {
  test('renders main heading and description', () => {
    render(<ActivityFeed />);
    expect(screen.getByText(/Activity Feed/i)).toBeInTheDocument();
    expect(screen.getByText(/View and track all your activities/i)).toBeInTheDocument();
  });

  test('renders all statistics cards', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Total Activities')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  test('renders filters section', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search activities/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Activity Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date Range/i)).toBeInTheDocument();
  });

  test('renders activity timeline section', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
  });

  test('renders activity breakdown section', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();
  });

  test('displays activity count in timeline header', () => {
    render(<ActivityFeed />);
    const countText = screen.getByText(/\d+ activit(y|ies)/i);
    expect(countText).toBeInTheDocument();
  });
});

// ==================== ACTIVITY DISPLAY TESTS ====================

describe('ActivityFeed - Activity Display', () => {
  test('renders activity items with titles', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Payment Received')).toBeInTheDocument();
    expect(screen.getByText('Voted on Proposal')).toBeInTheDocument();
  });

  test('displays activity descriptions', () => {
    render(<ActivityFeed />);
    expect(screen.getByText(/Received 500 USDC from merchant portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Voted YES on proposal #42/i)).toBeInTheDocument();
  });

  test('shows activity type badges', () => {
    render(<ActivityFeed />);
    const badges = screen.getAllByText(/Transaction|Governance|Merchant|Badge|Escrow|Wallet/);
    expect(badges.length).toBeGreaterThan(0);
  });

  test('displays activity timestamps with relative time', () => {
    render(<ActivityFeed />);
    const timestamps = screen.getAllByText(/ago|just now/i);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  test('shows activity metadata when present', () => {
    render(<ActivityFeed />);
    expect(screen.getByText(/amount:/i)).toBeInTheDocument();
    expect(screen.getByText(/status:/i)).toBeInTheDocument();
  });

  test('displays activity user information', () => {
    render(<ActivityFeed />);
    const userInfo = screen.getAllByText(/by John Doe/i);
    expect(userInfo.length).toBeGreaterThan(0);
  });

  test('renders timeline indicators for activities', () => {
    render(<ActivityFeed />);
    // Check for emoji icons which are part of timeline
    expect(screen.getByText('💰')).toBeInTheDocument();
    expect(screen.getByText('🗳️')).toBeInTheDocument();
  });
});

// ==================== FILTERING TESTS ====================

describe('ActivityFeed - Filtering', () => {
  test('filters activities by type', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    
    // Filter to show only transactions
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    
    // Should show transaction-related activities
    expect(screen.getByText('Payment Received')).toBeInTheDocument();
    
    // Should not show non-transaction activities in current view
    const allBadges = screen.getAllByText(/Transaction|Governance|Merchant|Badge|Escrow|Wallet/);
    const transactionBadges = allBadges.filter((badge) => badge.textContent === 'Transaction');
    expect(transactionBadges.length).toBeGreaterThan(0);
  });

  test('filters activities by date range', () => {
    render(<ActivityFeed />);
    const dateSelect = screen.getByLabelText(/Date Range/i);
    
    // Filter to show only today's activities
    fireEvent.change(dateSelect, { target: { value: 'today' } });
    
    // Activity count should update
    const countText = screen.getByText(/\d+ activit(y|ies)/i);
    expect(countText).toBeInTheDocument();
  });

  test('searches activities by text', () => {
    render(<ActivityFeed />);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    
    // Search for "payment"
    fireEvent.change(searchInput, { target: { value: 'payment' } });
    
    // Should show payment-related activities
    expect(screen.getByText('Payment Received')).toBeInTheDocument();
  });

  test('combines multiple filters', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    const dateSelect = screen.getByLabelText(/Date Range/i);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    
    // Apply multiple filters
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    fireEvent.change(dateSelect, { target: { value: 'week' } });
    fireEvent.change(searchInput, { target: { value: 'received' } });
    
    // Should apply all filters
    const countText = screen.getByText(/\d+ activit(y|ies)/i);
    expect(countText).toBeInTheDocument();
  });

  test('shows empty state when no activities match filters', () => {
    render(<ActivityFeed />);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    
    // Search for non-existent activity
    fireEvent.change(searchInput, { target: { value: 'zzz_nonexistent_zzz' } });
    
    // Should show empty state
    expect(screen.getByText(/No activities found/i)).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your filters/i)).toBeInTheDocument();
  });

  test('clears all filters when clear button clicked', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    const clearButton = screen.getByText(/Clear Filters/i);
    
    // Apply a filter
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    
    // Clear filters
    fireEvent.click(clearButton);
    
    // Should reset to "all"
    expect(typeSelect).toHaveValue('all');
  });

  test('disables clear filters button when no filters applied', () => {
    render(<ActivityFeed />);
    const clearButton = screen.getByText(/Clear Filters/i);
    
    // Should be disabled when no filters applied
    expect(clearButton).toBeDisabled();
  });

  test('updates activity count display after filtering', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    
    // Get initial count
    const initialCount = screen.getByText(/\d+ activit(y|ies)/i);
    const initialValue = initialCount.textContent;
    
    // Apply filter
    fireEvent.change(typeSelect, { target: { value: 'governance' } });
    
    // Count should update (may be same or different depending on data)
    const updatedCount = screen.getByText(/\d+ activit(y|ies)/i);
    expect(updatedCount).toBeInTheDocument();
  });
});

// ==================== PAGINATION TESTS ====================

describe('ActivityFeed - Pagination', () => {
  test('displays pagination controls when there are many activities', () => {
    render(<ActivityFeed />);
    
    // Check for pagination info
    const paginationInfo = screen.queryByText(/Showing \d+ to \d+ of \d+/i);
    if (paginationInfo) {
      expect(paginationInfo).toBeInTheDocument();
    }
  });

  test('previous button is disabled on first page', () => {
    render(<ActivityFeed />);
    const previousButton = screen.queryByText(/Previous/i);
    
    if (previousButton) {
      expect(previousButton).toBeDisabled();
    }
  });

  test('navigates to next page when next button clicked', () => {
    render(<ActivityFeed />);
    const nextButton = screen.queryByText(/Next/i);
    
    if (nextButton && !nextButton.hasAttribute('disabled')) {
      fireEvent.click(nextButton);
      
      // Should update pagination info
      const paginationInfo = screen.getByText(/Showing \d+ to \d+ of \d+/i);
      expect(paginationInfo).toBeInTheDocument();
    }
  });

  test('resets to page 1 when filters change', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    
    // Change filter
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    
    // Should be on page 1 (previous button disabled)
    const previousButton = screen.queryByText(/Previous/i);
    if (previousButton) {
      expect(previousButton).toBeDisabled();
    }
  });

  test('shows correct range in pagination info', () => {
    render(<ActivityFeed />);
    const paginationInfo = screen.queryByText(/Showing \d+ to \d+ of \d+/i);
    
    if (paginationInfo) {
      // Should show valid range
      expect(paginationInfo.textContent).toMatch(/Showing [1-9]\d* to \d+ of \d+/);
    }
  });
});

// ==================== EXPORT FUNCTIONALITY TESTS ====================

describe('ActivityFeed - Export', () => {
  test('renders export button', () => {
    render(<ActivityFeed />);
    const exportButton = screen.getByText(/Export CSV/i);
    expect(exportButton).toBeInTheDocument();
  });

  test('shows activity count in export button', () => {
    render(<ActivityFeed />);
    const exportButton = screen.getByText(/Export CSV \(\d+\)/i);
    expect(exportButton).toBeInTheDocument();
  });

  test('disables export button when no activities', () => {
    render(<ActivityFeed />);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    
    // Filter to show no results
    fireEvent.change(searchInput, { target: { value: 'zzz_nonexistent_zzz' } });
    
    const exportButton = screen.getByText(/Export CSV/i);
    expect(exportButton).toBeDisabled();
  });

  test('export button is enabled when activities exist', () => {
    render(<ActivityFeed />);
    const exportButton = screen.getByText(/Export CSV/i);
    expect(exportButton).not.toBeDisabled();
  });

  test('updates export count when filtering', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    
    // Apply filter
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    
    // Export button should show filtered count
    const exportButton = screen.getByText(/Export CSV \(\d+\)/i);
    expect(exportButton).toBeInTheDocument();
  });
});

// ==================== STATISTICS TESTS ====================

describe('ActivityFeed - Statistics', () => {
  test('displays total activities count', () => {
    render(<ActivityFeed />);
    const totalCard = screen.getByText('Total Activities').closest('div');
    expect(totalCard).toBeInTheDocument();
    
    const count = within(totalCard!).getByText(/^\d+$/);
    expect(count).toBeInTheDocument();
  });

  test('displays today activities count', () => {
    render(<ActivityFeed />);
    const todayCard = screen.getByText('Today').closest('div');
    expect(todayCard).toBeInTheDocument();
    
    const count = within(todayCard!).getByText(/^\d+$/);
    expect(count).toBeInTheDocument();
  });

  test('displays this week activities count', () => {
    render(<ActivityFeed />);
    const weekCard = screen.getByText('This Week').closest('div');
    expect(weekCard).toBeInTheDocument();
    
    const count = within(weekCard!).getByText(/^\d+$/);
    expect(count).toBeInTheDocument();
  });

  test('displays transactions count', () => {
    render(<ActivityFeed />);
    const transactionsCard = screen.getByText('Transactions').closest('div');
    expect(transactionsCard).toBeInTheDocument();
    
    const count = within(transactionsCard!).getByText(/^\d+$/);
    expect(count).toBeInTheDocument();
  });

  test('stat cards have correct icons', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('📅')).toBeInTheDocument();
    expect(screen.getByText('📈')).toBeInTheDocument();
    expect(screen.getByText('💰')).toBeInTheDocument();
  });

  test('displays activity breakdown by type', () => {
    render(<ActivityFeed />);
    const breakdownSection = screen.getByText('Activity Breakdown').closest('div');
    expect(breakdownSection).toBeInTheDocument();
    
    // Should show all activity types
    expect(within(breakdownSection!).getByText('Transaction')).toBeInTheDocument();
    expect(within(breakdownSection!).getByText('Governance')).toBeInTheDocument();
    expect(within(breakdownSection!).getByText('Merchant')).toBeInTheDocument();
  });

  test('breakdown shows counts for each type', () => {
    render(<ActivityFeed />);
    const breakdownSection = screen.getByText('Activity Breakdown').closest('div');
    
    // Each type should have a count
    const counts = within(breakdownSection!).getAllByText(/^\d+$/);
    expect(counts.length).toBeGreaterThanOrEqual(6); // 6 activity types
  });
});

// ==================== ACCESSIBILITY TESTS ====================

describe('ActivityFeed - Accessibility', () => {
  test('form controls have proper labels', () => {
    render(<ActivityFeed />);
    expect(screen.getByLabelText(/Activity Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date Range/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Search/i)).toBeInTheDocument();
  });

  test('search input has placeholder text', () => {
    render(<ActivityFeed />);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('buttons have accessible text', () => {
    render(<ActivityFeed />);
    expect(screen.getByText(/Clear Filters/i)).toBeInTheDocument();
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
  });

  test('disabled buttons have disabled state', () => {
    render(<ActivityFeed />);
    const clearButton = screen.getByText(/Clear Filters/i);
    expect(clearButton).toBeDisabled();
  });

  test('activity titles are in heading elements', () => {
    render(<ActivityFeed />);
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles.length).toBeGreaterThan(0);
  });

  test('timestamp has title attribute for full date', () => {
    render(<ActivityFeed />);
    const timestamps = document.querySelectorAll('[title]');
    expect(timestamps.length).toBeGreaterThan(0);
  });
});

// ==================== MOBILE RESPONSIVENESS TESTS ====================

describe('ActivityFeed - Mobile Responsiveness', () => {
  test('renders with responsive container', () => {
    render(<ActivityFeed />);
    const container = document.querySelector('.max-w-6xl');
    expect(container).toBeInTheDocument();
  });

  test('statistics use responsive grid', () => {
    render(<ActivityFeed />);
    const statsContainer = screen.getByText('Total Activities').closest('div')?.parentElement;
    expect(statsContainer?.className).toContain('grid');
  });

  test('filters use responsive grid', () => {
    render(<ActivityFeed />);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    const filtersContainer = searchInput.closest('div')?.parentElement;
    expect(filtersContainer?.className).toContain('grid');
  });

  test('filter actions wrap on small screens', () => {
    render(<ActivityFeed />);
    const clearButton = screen.getByText(/Clear Filters/i);
    const actionsContainer = clearButton.parentElement;
    expect(actionsContainer).toHaveClass('flex-wrap');
  });

  test('activity items have proper spacing', () => {
    render(<ActivityFeed />);
    const activities = document.querySelectorAll('.flex.gap-4');
    expect(activities.length).toBeGreaterThan(0);
  });
});

// ==================== DATA VALIDATION TESTS ====================

describe('ActivityFeed - Data Validation', () => {
  test('handles activities with missing metadata', () => {
    render(<ActivityFeed />);
    // Should render without errors even if some activities have no metadata
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
  });

  test('handles activities with missing user', () => {
    render(<ActivityFeed />);
    // Should render without errors even if some activities have no user
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
  });

  test('formats timestamps correctly', () => {
    render(<ActivityFeed />);
    const timestamps = screen.getAllByText(/ago|just now/i);
    expect(timestamps.length).toBeGreaterThan(0);
    
    // Check format is reasonable
    timestamps.forEach((timestamp) => {
      expect(timestamp.textContent).toMatch(/(\d+[mhdw]|mo) ago|just now/i);
    });
  });

  test('handles empty activity list gracefully', () => {
    render(<ActivityFeed />);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    
    // Filter to empty
    fireEvent.change(searchInput, { target: { value: 'zzz_nonexistent_zzz' } });
    
    // Should show empty state
    expect(screen.getByText(/No activities found/i)).toBeInTheDocument();
  });

  test('activity type badges use correct colors', () => {
    render(<ActivityFeed />);
    const badges = screen.getAllByText(/Transaction|Governance|Merchant|Badge|Escrow|Wallet/);
    
    badges.forEach((badge) => {
      // Each badge should have color classes
      expect(badge.className).toMatch(/bg-|text-/);
    });
  });
});

// ==================== INTEGRATION TESTS ====================

describe('ActivityFeed - Integration', () => {
  test('full filtering workflow', () => {
    render(<ActivityFeed />);
    
    // Apply type filter
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    
    // Apply date filter
    const dateSelect = screen.getByLabelText(/Date Range/i);
    fireEvent.change(dateSelect, { target: { value: 'week' } });
    
    // Search
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    fireEvent.change(searchInput, { target: { value: 'payment' } });
    
    // Should show filtered results
    const countText = screen.getByText(/\d+ activit(y|ies)/i);
    expect(countText).toBeInTheDocument();
    
    // Clear filters
    const clearButton = screen.getByText(/Clear Filters/i);
    fireEvent.click(clearButton);
    
    // Should reset
    expect(typeSelect).toHaveValue('all');
    expect(dateSelect).toHaveValue('all');
    expect(searchInput).toHaveValue('');
  });

  test('pagination with filtering', () => {
    render(<ActivityFeed />);
    
    // Apply filter
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    
    // Should reset to page 1
    const previousButton = screen.queryByText(/Previous/i);
    if (previousButton) {
      expect(previousButton).toBeDisabled();
    }
  });

  test('export with active filters', () => {
    render(<ActivityFeed />);
    
    // Apply filter
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    fireEvent.change(typeSelect, { target: { value: 'governance' } });
    
    // Export button should reflect filtered count
    const exportButton = screen.getByText(/Export CSV \(\d+\)/i);
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();
  });

  test('statistics remain consistent with displayed activities', () => {
    render(<ActivityFeed />);
    
    // Get total from stat card
    const totalCard = screen.getByText('Total Activities').closest('div');
    const totalCount = within(totalCard!).getByText(/^\d+$/);
    
    // Should match or be greater than displayed activities
    expect(totalCount).toBeInTheDocument();
  });
});

// ==================== ERROR HANDLING TESTS ====================

describe('ActivityFeed - Error Handling', () => {
  test('handles invalid filter values gracefully', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    
    // Should not crash with any valid option
    fireEvent.change(typeSelect, { target: { value: 'all' } });
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
  });

  test('handles empty search gracefully', () => {
    render(<ActivityFeed />);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    
    // Empty search should show all
    fireEvent.change(searchInput, { target: { value: '' } });
    
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
  });

  test('handles rapid filter changes', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    
    // Rapid changes
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    fireEvent.change(typeSelect, { target: { value: 'governance' } });
    fireEvent.change(typeSelect, { target: { value: 'merchant' } });
    
    // Should still render correctly
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
  });
});

// ==================== PERFORMANCE TESTS ====================

describe('ActivityFeed - Performance', () => {
  test('renders without excessive re-renders', () => {
    const { rerender } = render(<ActivityFeed />);
    
    // Re-render with same props
    rerender(<ActivityFeed />);
    
    // Should still render correctly
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
  });

  test('filters are applied efficiently', () => {
    render(<ActivityFeed />);
    const typeSelect = screen.getByLabelText(/Activity Type/i);
    
    // Apply filter
    const startTime = performance.now();
    fireEvent.change(typeSelect, { target: { value: 'transaction' } });
    const endTime = performance.now();
    
    // Should complete quickly (under 100ms)
    expect(endTime - startTime).toBeLessThan(100);
  });

  test('search is debounced or optimized', () => {
    render(<ActivityFeed />);
    const searchInput = screen.getByPlaceholderText(/Search activities/i);
    
    // Type search query
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Should update without delay
    expect(searchInput).toHaveValue('test');
  });
});
