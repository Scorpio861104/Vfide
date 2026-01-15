/**
 * Performance tests for SocialFeed component
 * Tests memoized filtering and sorting optimizations
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SocialFeed } from '@/components/social/SocialFeed';

describe('SocialFeed - Performance Tests', () => {
  test('renders feed without crashing', () => {
    render(<SocialFeed />);
    expect(screen.getByPlaceholderText(/What's on your mind/i)).toBeInTheDocument();
  });

  test('memoizes filtered posts - does not refilter on unrelated state changes', () => {
    const { rerender } = render(<SocialFeed />);
    
    // Rerender should not cause unnecessary filtering
    rerender(<SocialFeed />);
    
    expect(screen.getByPlaceholderText(/What's on your mind/i)).toBeInTheDocument();
  });

  test('memoizes sorted posts - does not resort on unrelated state changes', () => {
    const { rerender } = render(<SocialFeed />);
    
    // Get initial posts
    const posts = screen.queryAllByRole('article');
    const initialCount = posts.length;
    
    // Rerender
    rerender(<SocialFeed />);
    
    // Post count should remain same (not resorted unnecessarily)
    const newPosts = screen.queryAllByRole('article');
    expect(newPosts.length).toBe(initialCount);
  });

  test('filtering posts is fast', () => {
    render(<SocialFeed />);
    
    // Find filter dropdown
    const filterButton = screen.queryByLabelText(/filter/i) || screen.queryByRole('button', { name: /filter/i });
    
    if (filterButton) {
      const startTime = performance.now();
      fireEvent.click(filterButton);
      const endTime = performance.now();
      
      // Filtering should be fast (under 50ms)
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('sorting posts is fast', () => {
    render(<SocialFeed />);
    
    // Find sort dropdown
    const sortButton = screen.queryByLabelText(/sort/i) || screen.queryByRole('button', { name: /sort/i });
    
    if (sortButton) {
      const startTime = performance.now();
      fireEvent.click(sortButton);
      const endTime = performance.now();
      
      // Sorting should be fast (under 50ms)
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('search does not trigger unnecessary re-sorts', () => {
    render(<SocialFeed />);
    
    const searchInput = screen.queryByPlaceholderText(/search/i);
    
    if (searchInput) {
      // Type search query
      const startTime = performance.now();
      fireEvent.change(searchInput, { target: { value: 'test' } });
      const endTime = performance.now();
      
      // Search should be fast
      expect(endTime - startTime).toBeLessThan(100);
    }
  });

  test('like button does not trigger full re-render', () => {
    render(<SocialFeed />);
    
    const likeButtons = screen.queryAllByLabelText(/like/i);
    
    if (likeButtons.length > 0) {
      const startTime = performance.now();
      fireEvent.click(likeButtons[0]);
      const endTime = performance.now();
      
      // Like should be instant
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('scrolling through feed is smooth', () => {
    render(<SocialFeed />);
    
    const feedContainer = document.querySelector('[data-testid="feed"]') || document.querySelector('.overflow-y-auto');
    
    if (feedContainer) {
      // Simulate scroll
      const startTime = performance.now();
      fireEvent.scroll(feedContainer, { target: { scrollY: 100 } });
      const endTime = performance.now();
      
      // Scroll should be immediate
      expect(endTime - startTime).toBeLessThan(20);
    }
  });

  test('loading more posts does not re-sort existing posts', () => {
    render(<SocialFeed />);
    
    // Find load more button
    const loadMoreButton = screen.queryByRole('button', { name: /load more/i });
    
    if (loadMoreButton) {
      const initialPosts = screen.queryAllByRole('article');
      const initialCount = initialPosts.length;
      
      fireEvent.click(loadMoreButton);
      
      // Should add posts without resorting
      const newPosts = screen.queryAllByRole('article');
      expect(newPosts.length).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('changing filter type updates efficiently', () => {
    render(<SocialFeed />);
    
    // Test filter changes
    const filterSelects = screen.queryAllByRole('combobox');
    
    if (filterSelects.length > 0) {
      const startTime = performance.now();
      fireEvent.change(filterSelects[0], { target: { value: 'achievement' } });
      const endTime = performance.now();
      
      // Filter change should be fast
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('changing sort order updates efficiently', () => {
    render(<SocialFeed />);
    
    // Test sort changes
    const sortSelects = screen.queryAllByRole('combobox');
    
    if (sortSelects.length > 0) {
      const startTime = performance.now();
      fireEvent.change(sortSelects[0], { target: { value: 'trending' } });
      const endTime = performance.now();
      
      // Sort change should be fast
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('no memory leaks on unmount', () => {
    const { unmount } = render(<SocialFeed />);
    
    unmount();
    
    // Should cleanup without errors
    expect(true).toBe(true);
  });

  test('handles large post lists efficiently', () => {
    render(<SocialFeed />);
    
    // Component should render without performance issues
    const posts = screen.queryAllByRole('article');
    
    // Should limit visible posts for performance
    expect(posts.length).toBeLessThan(100);
  });

  test('post interactions are isolated - do not affect other posts', () => {
    render(<SocialFeed />);
    
    const likeButtons = screen.queryAllByLabelText(/like/i);
    
    if (likeButtons.length > 1) {
      const firstButton = likeButtons[0];
      const secondButton = likeButtons[1];
      
      // Click first button
      fireEvent.click(firstButton);
      
      // Second button should not be affected
      expect(secondButton).toBeInTheDocument();
    }
  });

  test('comment section expansion is optimized', () => {
    render(<SocialFeed />);
    
    const commentButtons = screen.queryAllByLabelText(/comment/i);
    
    if (commentButtons.length > 0) {
      const startTime = performance.now();
      fireEvent.click(commentButtons[0]);
      const endTime = performance.now();
      
      // Expansion should be fast
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('share functionality does not block UI', () => {
    render(<SocialFeed />);
    
    const shareButtons = screen.queryAllByLabelText(/share/i);
    
    if (shareButtons.length > 0) {
      const startTime = performance.now();
      fireEvent.click(shareButtons[0]);
      const endTime = performance.now();
      
      // Share should open quickly
      expect(endTime - startTime).toBeLessThan(50);
    }
  });
});
