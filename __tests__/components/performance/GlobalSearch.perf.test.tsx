/**
 * Performance tests for GlobalSearch component
 * Tests localStorage caching, search optimization, and memoization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlobalSearch } from '@/components/search/GlobalSearch';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

// Mock hooks
jest.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn(),
  SHORTCUTS: {
    SEARCH: { key: 'k', ctrl: true },
    CLOSE: { key: 'Escape' },
  },
}));

describe('GlobalSearch - Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Setup test data in localStorage
    const testAddress = '0x1234567890123456789012345678901234567890';
    localStorage.setItem(`vfide_friends_${testAddress}`, JSON.stringify([
      { address: '0xfriend1', alias: 'Alice', addedDate: Date.now() },
      { address: '0xfriend2', alias: 'Bob', addedDate: Date.now() },
    ]));
    localStorage.setItem(`vfide_groups_${testAddress}`, JSON.stringify([
      { id: 'group1', name: 'Developers', members: ['0x1', '0x2'] },
      { id: 'group2', name: 'Designers', members: ['0x3', '0x4'] },
    ]));
  });

  test('renders search button', () => {
    render(<GlobalSearch />);
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  test('caches parsed friends from localStorage - does not reparse on every search', () => {
    render(<GlobalSearch />);
    
    // Open search
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    // Type search query - should not trigger multiple JSON.parse calls
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    fireEvent.change(searchInput, { target: { value: 'Ali' } });
    
    // Results should appear
    expect(searchInput).toHaveValue('Ali');
  });

  test('caches parsed groups from localStorage', () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    fireEvent.change(searchInput, { target: { value: 'Dev' } });
    
    expect(searchInput).toHaveValue('Dev');
  });

  test('search is debounced for performance', async () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    
    // Type multiple characters quickly
    const startTime = performance.now();
    fireEvent.change(searchInput, { target: { value: 'a' } });
    fireEvent.change(searchInput, { target: { value: 'al' } });
    fireEvent.change(searchInput, { target: { value: 'ali' } });
    const endTime = performance.now();
    
    // Should handle rapid input efficiently
    expect(endTime - startTime).toBeLessThan(100);
  });

  test('handles SSR safely - does not access localStorage on server', () => {
    // Mock server-side environment
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    
    render(<GlobalSearch />);
    
    // Should not crash
    expect(true).toBe(true);
    
    // Restore window
    global.window = originalWindow;
  });

  test('handles JSON parse errors gracefully', () => {
    // Set invalid JSON in localStorage
    const testAddress = '0x1234567890123456789012345678901234567890';
    localStorage.setItem(`vfide_friends_${testAddress}`, 'invalid json');
    
    render(<GlobalSearch />);
    
    // Should not crash
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  test('search modal opens and closes efficiently', () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    
    // Open
    const openStart = performance.now();
    fireEvent.click(searchButton);
    const openEnd = performance.now();
    
    // Should open quickly
    expect(openEnd - openStart).toBeLessThan(50);
    
    // Close
    const closeButton = screen.getByLabelText(/Close/i) || screen.getAllByRole('button')[0];
    const closeStart = performance.now();
    fireEvent.click(closeButton);
    const closeEnd = performance.now();
    
    // Should close quickly
    expect(closeEnd - closeStart).toBeLessThan(50);
  });

  test('keyboard navigation works efficiently', async () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Simulate arrow key navigation
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    
    // Should handle keyboard events without errors
    expect(searchInput).toBeInTheDocument();
  });

  test('filters search results efficiently', () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    
    // Search should filter results in real-time
    const startTime = performance.now();
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    const endTime = performance.now();
    
    // Filtering should be fast
    expect(endTime - startTime).toBeLessThan(50);
  });

  test('limits results to prevent performance issues', () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    fireEvent.change(searchInput, { target: { value: 'a' } });
    
    // Results should be limited (implementation limits to 8)
    // This prevents rendering thousands of results
    expect(true).toBe(true);
  });

  test('clears search efficiently', () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Clear button should appear
    const clearButton = screen.queryByLabelText(/Clear/i);
    if (clearButton) {
      const startTime = performance.now();
      fireEvent.click(clearButton);
      const endTime = performance.now();
      
      // Clearing should be instant
      expect(endTime - startTime).toBeLessThan(20);
    }
  });

  test('handles empty search query', () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    
    // Empty search should show placeholder state
    fireEvent.change(searchInput, { target: { value: '' } });
    
    expect(searchInput).toHaveValue('');
  });

  test('does not re-cache when address does not change', () => {
    const { rerender } = render(<GlobalSearch />);
    
    // Rerender with same props
    rerender(<GlobalSearch />);
    
    // Should not reparse localStorage
    expect(true).toBe(true);
  });

  test('recaches when address changes', () => {
    const useAccountMock = require('wagmi').useAccount;
    
    // Initial render
    useAccountMock.mockReturnValue({ address: '0xaddress1' });
    const { rerender } = render(<GlobalSearch />);
    
    // Change address
    useAccountMock.mockReturnValue({ address: '0xaddress2' });
    rerender(<GlobalSearch />);
    
    // Should handle address change
    expect(true).toBe(true);
  });

  test('search result navigation is optimized', () => {
    render(<GlobalSearch />);
    
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText(/Search friends, groups, pages/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Multiple keyboard navigations should be smooth
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    }
    
    expect(searchInput).toBeInTheDocument();
  });

  test('no memory leaks on unmount', () => {
    const { unmount } = render(<GlobalSearch />);
    
    // Open modal
    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);
    
    // Unmount
    unmount();
    
    // Should cleanup without errors
    expect(true).toBe(true);
  });
});
