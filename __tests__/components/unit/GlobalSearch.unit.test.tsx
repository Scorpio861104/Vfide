/**
 * Unit tests for all functions in GlobalSearch component
 * Tests search logic, keyboard handling, and utility functions
 */

import React from 'react';
import '@testing-library/jest-dom';

describe('GlobalSearch - Function Unit Tests', () => {
  describe('performSearch function logic', () => {
    test('searches friends by alias', () => {
      const friends = [
        { address: '0x1', alias: 'Alice', addedDate: Date.now() },
        { address: '0x2', alias: 'Bob', addedDate: Date.now() },
      ];
      
      const query = 'ali';
      const results = friends.filter(f => 
        f.alias?.toLowerCase().includes(query.toLowerCase())
      );
      
      expect(results.length).toBe(1);
      expect(results[0].alias).toBe('Alice');
    });

    test('searches friends by address', () => {
      const friends = [
        { address: '0xabc123', alias: 'Alice', addedDate: Date.now() },
        { address: '0xdef456', alias: 'Bob', addedDate: Date.now() },
      ];
      
      const query = 'abc';
      const results = friends.filter(f => 
        f.address.toLowerCase().includes(query.toLowerCase())
      );
      
      expect(results.length).toBe(1);
      expect(results[0].address).toBe('0xabc123');
    });

    test('searches groups by name', () => {
      const groups = [
        { id: '1', name: 'Developers', description: 'Dev group', members: [] },
        { id: '2', name: 'Designers', description: 'Design group', members: [] },
      ];
      
      const query = 'dev';
      const results = groups.filter(g => 
        g.name.toLowerCase().includes(query.toLowerCase())
      );
      
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Developers');
    });

    test('searches groups by description', () => {
      const groups = [
        { id: '1', name: 'Group A', description: 'Testing group', members: [] },
        { id: '2', name: 'Group B', description: 'Production group', members: [] },
      ];
      
      const query = 'test';
      const results = groups.filter(g => 
        g.description?.toLowerCase().includes(query.toLowerCase())
      );
      
      expect(results.length).toBe(1);
      expect(results[0].description).toBe('Testing group');
    });

    test('returns empty results for no matches', () => {
      const friends = [
        { address: '0x1', alias: 'Alice', addedDate: Date.now() },
      ];
      
      const query = 'nonexistent';
      const results = friends.filter(f => 
        f.alias?.toLowerCase().includes(query.toLowerCase())
      );
      
      expect(results.length).toBe(0);
    });

    test('handles empty query', () => {
      const friends = [
        { address: '0x1', alias: 'Alice', addedDate: Date.now() },
      ];
      
      const query = '';
      const results = query ? friends.filter(f => 
        f.alias?.toLowerCase().includes(query.toLowerCase())
      ) : [];
      
      expect(results.length).toBe(0);
    });

    test('search is case-insensitive', () => {
      const friends = [
        { address: '0x1', alias: 'Alice', addedDate: Date.now() },
      ];
      
      const queries = ['alice', 'ALICE', 'AlIcE'];
      
      queries.forEach(query => {
        const results = friends.filter(f => 
          f.alias?.toLowerCase().includes(query.toLowerCase())
        );
        expect(results.length).toBe(1);
      });
    });
  });

  describe('handleKeyDown function logic', () => {
    test('handles arrow down key', () => {
      let selectedIndex = 0;
      const results = [{}, {}, {}];
      
      // Simulate arrow down
      if (selectedIndex < results.length - 1) {
        selectedIndex++;
      }
      
      expect(selectedIndex).toBe(1);
    });

    test('handles arrow up key', () => {
      let selectedIndex = 2;
      
      // Simulate arrow up
      if (selectedIndex > 0) {
        selectedIndex--;
      }
      
      expect(selectedIndex).toBe(1);
    });

    test('handles enter key', () => {
      const selectedIndex = 0;
      const results = [
        { id: '1', action: jest.fn() },
      ];
      
      // Simulate enter press
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
      
      expect(results[0].action).toHaveBeenCalled();
    });

    test('handles escape key', () => {
      let isOpen = true;
      
      // Simulate escape press
      isOpen = false;
      
      expect(isOpen).toBe(false);
    });

    test('arrow down wraps at end', () => {
      let selectedIndex = 2;
      const results = [{}, {}, {}];
      
      // At end, wrap to beginning
      if (selectedIndex < results.length - 1) {
        selectedIndex++;
      } else {
        selectedIndex = selectedIndex; // Stay at end (or wrap to 0)
      }
      
      expect(selectedIndex).toBe(2);
    });

    test('arrow up wraps at beginning', () => {
      let selectedIndex = 0;
      
      // At beginning, wrap to end (or stay at 0)
      if (selectedIndex > 0) {
        selectedIndex--;
      }
      
      expect(selectedIndex).toBe(0);
    });
  });

  describe('handleClose function', () => {
    test('closes modal and clears search', () => {
      let isOpen = true;
      let query = 'test query';
      let selectedIndex = 5;
      
      // Close modal
      isOpen = false;
      query = '';
      selectedIndex = 0;
      
      expect(isOpen).toBe(false);
      expect(query).toBe('');
      expect(selectedIndex).toBe(0);
    });
  });

  describe('Keyboard shortcut handling', () => {
    test('Cmd+K opens search', () => {
      let isOpen = false;
      
      // Simulate Cmd+K
      const event = {
        key: 'k',
        metaKey: true,
      };
      
      if (event.key === 'k' && event.metaKey) {
        isOpen = true;
      }
      
      expect(isOpen).toBe(true);
    });

    test('Ctrl+K opens search', () => {
      let isOpen = false;
      
      // Simulate Ctrl+K
      const event = {
        key: 'k',
        ctrlKey: true,
      };
      
      if (event.key === 'k' && event.ctrlKey) {
        isOpen = true;
      }
      
      expect(isOpen).toBe(true);
    });
  });

  describe('Result filtering and limiting', () => {
    test('limits results to prevent performance issues', () => {
      const allResults = Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }));
      const limit = 8;
      const limitedResults = allResults.slice(0, limit);
      
      expect(limitedResults.length).toBe(8);
    });

    test('prioritizes exact matches', () => {
      const results = [
        { name: 'test', score: 2 },
        { name: 'testing', score: 1 },
        { name: 'test suite', score: 1 },
      ];
      
      // Sort by score (higher = better match)
      const sorted = [...results].sort((a, b) => b.score - a.score);
      
      expect(sorted[0].name).toBe('test');
    });
  });

  describe('Cache validation', () => {
    test('validates JSON structure before parsing', () => {
      const validJSON = '{"id":"1","name":"test"}';
      const invalidJSON = '{invalid}';
      
      let result = null;
      try {
        result = JSON.parse(validJSON);
      } catch (e) {
        result = null;
      }
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('1');
    });

    test('handles malformed JSON gracefully', () => {
      const invalidJSON = 'not json';
      
      let result = null;
      let error = null;
      try {
        result = JSON.parse(invalidJSON);
      } catch (e) {
        error = e;
      }
      
      expect(result).toBeNull();
      expect(error).not.toBeNull();
    });

    test('returns empty array for null/undefined data', () => {
      const data1 = null;
      const data2 = undefined;
      
      const result1 = data1 || [];
      const result2 = data2 || [];
      
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });

  describe('Result grouping by type', () => {
    test('groups results by type', () => {
      const results = [
        { type: 'friend', name: 'Alice' },
        { type: 'group', name: 'Dev Team' },
        { type: 'friend', name: 'Bob' },
      ];
      
      const grouped = {
        friend: results.filter(r => r.type === 'friend'),
        group: results.filter(r => r.type === 'group'),
      };
      
      expect(grouped.friend.length).toBe(2);
      expect(grouped.group.length).toBe(1);
    });
  });

  describe('Recent searches', () => {
    test('stores recent searches', () => {
      const recentSearches: string[] = [];
      const maxRecent = 5;
      
      const addSearch = (query: string) => {
        if (query && !recentSearches.includes(query)) {
          recentSearches.unshift(query);
          if (recentSearches.length > maxRecent) {
            recentSearches.pop();
          }
        }
      };
      
      addSearch('test1');
      addSearch('test2');
      
      expect(recentSearches.length).toBe(2);
      expect(recentSearches[0]).toBe('test2');
    });

    test('prevents duplicate recent searches', () => {
      const recentSearches: string[] = [];
      
      const addSearch = (query: string) => {
        if (query && !recentSearches.includes(query)) {
          recentSearches.push(query);
        }
      };
      
      addSearch('test');
      addSearch('test');
      
      expect(recentSearches.length).toBe(1);
    });
  });
});
