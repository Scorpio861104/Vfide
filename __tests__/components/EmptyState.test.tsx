import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Inbox: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'inbox-icon' }),
  Search: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'search-icon' }),
  FileQuestion: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'file-question-icon' }),
}))

import { EmptyState, NoResults, NoData } from '@/components/ui/EmptyState'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="No items" description="Check back later" />)
    expect(screen.getByText('Check back later')).toBeInTheDocument()
  })

  it('renders action when provided', () => {
    render(
      <EmptyState 
        title="No items" 
        action={<button>Add Item</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
  })

  it('uses default variant icon', () => {
    render(<EmptyState title="No items" />)
    expect(screen.getByTestId('inbox-icon')).toBeInTheDocument()
  })

  it('uses search variant icon', () => {
    render(<EmptyState title="No results" variant="search" />)
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
  })

  it('uses error variant icon', () => {
    render(<EmptyState title="Error" variant="error" />)
    expect(screen.getByTestId('file-question-icon')).toBeInTheDocument()
  })

  it('uses custom icon when provided', () => {
    render(
      <EmptyState 
        title="Custom" 
        icon={<span data-testid="custom-icon">🎉</span>}
      />
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="Test" className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('NoResults', () => {
  it('renders default no results message', () => {
    render(<NoResults />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument()
  })

  it('renders with search query', () => {
    render(<NoResults query="test search" />)
    expect(screen.getByText('No results matching "test search"')).toBeInTheDocument()
  })

  it('uses search icon', () => {
    render(<NoResults />)
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
  })
})

describe('NoData', () => {
  it('renders default message', () => {
    render(<NoData />)
    expect(screen.getByText('No data yet')).toBeInTheDocument()
    expect(screen.getByText('Data will appear here once available')).toBeInTheDocument()
  })

  it('renders custom title and description', () => {
    render(<NoData title="Nothing here" description="Custom description" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText('Custom description')).toBeInTheDocument()
  })

  it('renders action when provided', () => {
    render(<NoData action={<button>Refresh</button>} />)
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })
})
