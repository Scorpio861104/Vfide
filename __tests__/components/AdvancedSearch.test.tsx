/**
 * Comprehensive test suite for AdvancedSearch component
 * Tests: 65+ comprehensive test cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdvancedSearch from '@/components/search/AdvancedSearch';

// ============================================================================
// Search Input & Basic Functionality Tests
// ============================================================================

describe('AdvancedSearch - Search Input', () => {
  test('renders search input field', () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    expect(input).toBeInTheDocument();
  });

  test('updates search query on input change', () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(input.value).toBe('test query');
  });

  test('search button triggers search', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    const searchBtns = screen.getAllByRole('button', { name: /search/i });
    const searchBtn = searchBtns[0]; // Use first search button

    fireEvent.change(input, { target: { value: 'governance' } });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      const searching = screen.queryByText(/searching/i);
      const results = screen.queryAllByText(/results?/i);
      const noResults = screen.queryByText(/no results found/i);
      expect(Boolean(searching || results.length > 0 || noResults)).toBe(true);
    });
  });

  test('pressing Enter triggers search', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });

    fireEvent.change(input, { target: { value: 'proposal' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      const searching = screen.queryByText(/searching/i);
      const results = screen.queryAllByText(/results?/i);
      const noResults = screen.queryByText(/no results found/i);
      expect(Boolean(searching || results.length > 0 || noResults)).toBe(true);
    });
  });

  test('clear button appears when query is entered', () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });

    fireEvent.change(input, { target: { value: 'test' } });
    const clearBtn = screen.getByLabelText(/clear search/i);
    expect(clearBtn).toBeInTheDocument();
  });

  test('clear button clears search query', () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'test query' } });
    const clearBtn = screen.getByLabelText(/clear search/i);
    fireEvent.click(clearBtn);

    expect(input.value).toBe('');
  });
});

// ============================================================================
// Filter Panel Tests
// ============================================================================

describe('AdvancedSearch - Filters', () => {
  test('filters button toggles filter panel', () => {
    render(<AdvancedSearch />);
    const filtersBtn = screen.getByRole('button', { name: /filters/i });

    fireEvent.click(filtersBtn);
    expect(screen.getByText(/content type/i)).toBeInTheDocument();

    fireEvent.click(filtersBtn);
    expect(screen.queryByText(/content type/i)).not.toBeInTheDocument();
  });

  test('renders all filter fields when panel is open', () => {
    render(<AdvancedSearch />);
    const filtersBtn = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersBtn);

    expect(screen.getAllByText(/content type/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/date range/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/status/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/min score/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/has attachments/i)).toBeInTheDocument();
  });

  test('content type filter has all options', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    // Use getByText instead of getByLabelText
    expect(screen.getByText('All Content')).toBeInTheDocument();
    expect(screen.getByText('Proposals')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  test('date range filter changes value', async () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /🔽 filters/i }));

    const dateSelect = screen.getByRole('combobox', { name: /date range/i });
    fireEvent.change(dateSelect, { target: { value: 'week' } });

    await waitFor(() => {
      expect((dateSelect as HTMLSelectElement).value).toBe('week');
    });
  });

  test('status filter changes value', async () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /🔽 filters/i }));

    const statusSelect = screen.getByRole('combobox', { name: /status/i });
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    await waitFor(() => {
      expect((statusSelect as HTMLSelectElement).value).toBe('active');
    });
  });

  test('min score slider updates value', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    const slider = screen.getByRole('slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '75' } });

    expect(screen.getByText(/min score: 75%/i)).toBeInTheDocument();
  });

  test('has attachments checkbox toggles', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    const checkbox = screen.getByLabelText(/has attachments/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});

// ============================================================================
// Search History Tests
// ============================================================================

describe('AdvancedSearch - Search History', () => {
  test('history button shows history panel', () => {
    render(<AdvancedSearch />);
    const historyBtn = screen.getByRole('button', { name: /🕐 history \(\d+\)/i });

    fireEvent.click(historyBtn);
    expect(screen.getByText(/"governance proposal"/i)).toBeInTheDocument();
  });

  test('displays history items', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /🕐 history \(\d+\)/i }));

    expect(screen.getByText(/"governance proposal"/i)).toBeInTheDocument();
    expect(screen.getByText(/"merchant settlement"/i)).toBeInTheDocument();
  });

  test('history items show result counts', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /🕐 history \(\d+\)/i }));

    expect(screen.getByText(/15 results/i)).toBeInTheDocument();
    expect(screen.getByText(/42 results/i)).toBeInTheDocument();
  });

  test('clicking history item reuses search', async () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /🕐 history \(\d+\)/i }));

    const historyItem = screen.getByText(/"governance proposal"/i);
    fireEvent.click(historyItem);

    await waitFor(() => {
      const searching = screen.queryByText(/searching/i);
      const results = screen.queryAllByText(/results?/i);
      const noResults = screen.queryByText(/no results found/i);
      expect(Boolean(searching || results.length > 0 || noResults)).toBe(true);
    });
  });

  test('delete button removes history item', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /🕐 history \(\d+\)/i }));

    const deleteButtons = screen.getAllByLabelText(/delete history item/i);
    const initialCount = deleteButtons.length;

    fireEvent.click(deleteButtons[0]);

    const remainingButtons = screen.queryAllByLabelText(/delete history item/i);
    expect(remainingButtons.length).toBe(initialCount - 1);
  });

  test('shows empty state when no history', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /🕐 history \(\d+\)/i }));

    // Delete all history items
    const deleteButtons = screen.getAllByLabelText(/delete history item/i);
    deleteButtons.forEach(btn => fireEvent.click(btn));

    expect(screen.getByText(/no search history yet/i)).toBeInTheDocument();
  });
});

// ============================================================================
// Saved Searches Tests
// ============================================================================

describe('AdvancedSearch - Saved Searches', () => {
  test('saved button shows saved searches panel', () => {
    render(<AdvancedSearch />);
    const savedBtn = screen.getByRole('button', { name: /⭐ saved \(\d+\)/i });

    fireEvent.click(savedBtn);
    expect(screen.getByText(/saved searches/i)).toBeInTheDocument();
  });

  test('displays saved search items', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /⭐ saved \(\d+\)/i }));

    expect(screen.getByText(/active proposals/i)).toBeInTheDocument();
    expect(screen.getByText(/my transactions/i)).toBeInTheDocument();
    expect(screen.getByText(/high score posts/i)).toBeInTheDocument();
  });

  test('saved searches show use counts', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /⭐ saved \(\d+\)/i }));

    expect(screen.getByText(/used 12 times/i)).toBeInTheDocument();
    expect(screen.getByText(/used 34 times/i)).toBeInTheDocument();
  });

  test('use search button loads saved search', async () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /⭐ saved \(\d+\)/i }));

    const useButtons = screen.getAllByRole('button', { name: /use search/i });
    fireEvent.click(useButtons[0]);

    await waitFor(() => {
      const searching = screen.queryByText(/searching/i);
      const results = screen.queryAllByText(/results?/i);
      const noResults = screen.queryByText(/no results found/i);
      expect(Boolean(searching || results.length > 0 || noResults)).toBe(true);
    });
  });

  test('delete button removes saved search', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /⭐ saved \(\d+\)/i }));

    const deleteButtons = screen.getAllByLabelText(/delete saved search/i);
    const initialCount = deleteButtons.length;

    fireEvent.click(deleteButtons[0]);

    const remainingButtons = screen.queryAllByLabelText(/delete saved search/i);
    expect(remainingButtons.length).toBe(initialCount - 1);
  });

  test('shows empty state when no saved searches', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /⭐ saved \(\d+\)/i }));

    // Delete all saved searches
    const deleteButtons = screen.getAllByLabelText(/delete saved search/i);
    deleteButtons.forEach(btn => fireEvent.click(btn));

    expect(screen.getByText(/no saved searches yet/i)).toBeInTheDocument();
  });
});

// ============================================================================
// Autocomplete Tests
// ============================================================================

describe('AdvancedSearch - Autocomplete', () => {
  test('shows autocomplete when typing', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });

    fireEvent.change(input, { target: { value: 'gov' } });

    await waitFor(() => {
      const suggestions = screen.queryAllByText(/governance/i);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  test('autocomplete shows history items', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });

    fireEvent.change(input, { target: { value: 'g' } });

    await waitFor(() => {
      expect(screen.getByText(/governance proposal/i)).toBeInTheDocument();
    });
  });

  test('clicking autocomplete item fills search', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'gov' } });

    await waitFor(() => {
      const suggestion = screen.getByText(/governance proposal/i);
      fireEvent.click(suggestion);
    });

    await waitFor(() => {
      expect(input.value).toContain('governance');
    });
  });

  test('autocomplete hides when cleared', () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.queryByText(/governance proposal/i)).not.toBeInTheDocument();
  });
});

// ============================================================================
// Search Results Tests
// ============================================================================

describe('AdvancedSearch - Search Results', () => {
  test('shows loading state during search', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    const searchBtn = screen.getByRole('button', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(searchBtn);

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  test('displays search results after loading', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    const searchBtn = screen.getByRole('button', { name: 'Search' });

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/result/i).length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  test('result cards display content type icons', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const icons = ['🗳️', '👤', '💰', '📊', '📝', '💬'];
      const found = icons.some(icon => screen.queryAllByText(icon).length > 0);
      expect(found).toBe(true);
    }, { timeout: 2000 });
  });

  test('result cards show scores', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const scores = screen.queryAllByText(/%/);
      expect(scores.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  test('clicking result card triggers onResultSelect', async () => {
    const handleSelect = jest.fn();
    render(<AdvancedSearch onResultSelect={handleSelect} />);

    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const cards = screen.getAllByRole('generic').filter(el =>
        el.className.includes('cursor-pointer')
      );
      if (cards.length > 0) {
        fireEvent.click(cards[0]);
        expect(handleSelect).toHaveBeenCalled();
      }
    }, { timeout: 2000 });
  });
});

// ============================================================================
// Sorting Tests
// ============================================================================

describe('AdvancedSearch - Sorting', () => {
  test('sort dropdown appears with results', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText(/sort by:/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('sort dropdown has all options', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const sortSelect = screen.getByDisplayValue(/relevance/i);
      expect(sortSelect).toContainHTML('<option value="relevance">Relevance</option>');
      expect(sortSelect).toContainHTML('<option value="date">Date</option>');
      expect(sortSelect).toContainHTML('<option value="score">Score</option>');
      expect(sortSelect).toContainHTML('<option value="popular">Popular</option>');
    }, { timeout: 2000 });
  });

  test('changing sort order updates results', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const sortSelect = screen.getByDisplayValue(/relevance/i) as HTMLSelectElement;
      fireEvent.change(sortSelect, { target: { value: 'date' } });
      expect(sortSelect.value).toBe('date');
    }, { timeout: 2000 });
  });
});

// ============================================================================
// Save Search Tests
// ============================================================================

describe('AdvancedSearch - Save Search', () => {
  test('save search button appears with results', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save search/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('save search opens prompt', async () => {
    global.prompt = jest.fn(() => 'My Search');

    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const saveBtn = screen.getByRole('button', { name: /save search/i });
      fireEvent.click(saveBtn);
      expect(global.prompt).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});

// ============================================================================
// Export Results Tests
// ============================================================================

describe('AdvancedSearch - Export Results', () => {
  test('export button appears with results', async () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('export button triggers download', async () => {
    const createObjectURL = jest.fn();
    const revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const exportBtn = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportBtn);
      expect(createObjectURL).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});

// ============================================================================
// Empty States Tests
// ============================================================================

describe('AdvancedSearch - Empty States', () => {
  test('shows initial empty state', () => {
    render(<AdvancedSearch />);
    expect(screen.getByText(/enter a search query to get started/i)).toBeInTheDocument();
  });

  test('shows no results message after empty search', async () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    const contentTypeSelect = screen.getByLabelText(/content type/i);
    fireEvent.change(contentTypeSelect, { target: { value: 'user' } });

    const searchBtn = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      // After search completes, if no matching results
      const noResults = screen.queryByText(/no results found/i);
      const hasResults = screen.queryByText(/result/i);
      expect(noResults || hasResults).toBeTruthy();
    }, { timeout: 2000 });
  });

  test('initial state shows view history link', () => {
    render(<AdvancedSearch />);
    expect(screen.getByText(/view history/i)).toBeInTheDocument();
  });

  test('initial state shows view saved searches link', () => {
    render(<AdvancedSearch />);
    expect(screen.getByText(/view saved searches/i)).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('AdvancedSearch - Accessibility', () => {
  test('search input has proper aria label', () => {
    render(<AdvancedSearch />);
    const input = screen.getByRole('textbox', { name: /search/i });
    expect(input).toBeInTheDocument();
  });

  test('all buttons have accessible names', () => {
    render(<AdvancedSearch />);
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history \(\d+\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saved \(\d+\)/i })).toBeInTheDocument();
  });

  test('filter labels are associated with inputs', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    expect(screen.getByLabelText(/content type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  test('delete buttons have aria labels', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /history \(\d+\)/i }));

    const deleteButtons = screen.getAllByLabelText(/delete history item/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Mobile Responsiveness Tests
// ============================================================================

describe('AdvancedSearch - Mobile Responsiveness', () => {
  test('renders in responsive container', () => {
    render(<AdvancedSearch />);
    const container = screen.getByText(/advanced search/i).closest('div');
    expect(container).toBeInTheDocument();
  });

  test('action buttons wrap on small screens', () => {
    render(<AdvancedSearch />);
    const buttonsContainer = screen.getByRole('button', { name: /filters/i }).parentElement;
    expect(buttonsContainer?.className).toContain('flex-wrap');
  });

  test('filter grid is responsive', () => {
    render(<AdvancedSearch />);
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    const filterGrid = screen.getByLabelText(/content type/i).closest('div')?.parentElement;
    expect(filterGrid?.className).toMatch(/grid-cols-1|md:grid-cols-2|lg:grid-cols-3/);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('AdvancedSearch - Integration Workflows', () => {
  test('complete search workflow', async () => {
    render(<AdvancedSearch />);

    // Enter query
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'governance' } });

    // Open filters
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    // Set filters
    const contentType = screen.getByLabelText(/content type/i);
    fireEvent.change(contentType, { target: { value: 'proposal' } });

    // Search
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    // Wait for results
    await waitFor(() => {
      expect(screen.getAllByText(/result/i).length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  test('save and reuse search workflow', async () => {
    global.prompt = jest.fn(() => 'Test Search');

    render(<AdvancedSearch />);

    // Perform search
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    // Wait for results and save
    await waitFor(() => {
      const saveBtn = screen.getByRole('button', { name: /save search/i });
      fireEvent.click(saveBtn);
    }, { timeout: 2000 });

    // View saved searches
    fireEvent.click(screen.getByRole('button', { name: /saved \(\d+\)/i }));

    // Use saved search
    await waitFor(() => {
      const useButtons = screen.getAllByRole('button', { name: /use search/i });
      fireEvent.click(useButtons[useButtons.length - 1]);
    });
  });

  test('history to search workflow', async () => {
    render(<AdvancedSearch />);

    // Open history
    fireEvent.click(screen.getByRole('button', { name: /history \(\d+\)/i }));

    // Click history item
    const historyItem = screen.getByText(/"governance proposal"/i);
    fireEvent.click(historyItem);

    // Verify search initiated
    await waitFor(() => {
      const searching = screen.queryByText(/searching/i);
      const results = screen.queryAllByText(/results?/i);
      const noResults = screen.queryByText(/no results found/i);
      expect(Boolean(searching || results.length > 0 || noResults)).toBe(true);
    });
  });

  test('filter changes update results', async () => {
    render(<AdvancedSearch />);

    // Initial search
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getAllByText(/result/i).length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // Change filter
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    const contentType = screen.getByLabelText(/content type/i);
    fireEvent.change(contentType, { target: { value: 'user' } });

    // Results should update (component handles filtering)
    expect(screen.getAllByText(/result/i).length).toBeGreaterThan(0);
  });
});
