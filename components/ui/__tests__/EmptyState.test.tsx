import { render, screen } from '@testing-library/react'
import { EmptyState, NoResults, NoData } from '../EmptyState'
import { Settings } from 'lucide-react'

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title="No items found" />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('renders with description', () => {
    render(
      <EmptyState 
        title="No items found" 
        description="Try adjusting your filters"
      />
    )
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
  })

  it('renders with custom icon', () => {
    render(
      <EmptyState 
        title="No settings" 
        icon={<Settings data-testid="custom-icon" />}
      />
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renders default variant icon', () => {
    const { container } = render(<EmptyState title="Empty" variant="default" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders search variant icon', () => {
    const { container } = render(<EmptyState title="No results" variant="search" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders error variant icon', () => {
    const { container } = render(<EmptyState title="Error" variant="error" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with action button', () => {
    render(
      <EmptyState 
        title="No items" 
        action={<button>Add Item</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders without description', () => {
    render(<EmptyState title="Test" />)
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument()
  })

  it('renders without action', () => {
    render(<EmptyState title="Test" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
describe('NoResults', () => {
  it('renders with query', () => {
    render(<NoResults query="test search" />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.getByText('No results matching "test search"')).toBeInTheDocument()
  })

  it('renders without query', () => {
    render(<NoResults />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<NoResults className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('NoData', () => {
  it('renders with default props', () => {
    render(<NoData />)
    expect(screen.getByText('No data yet')).toBeInTheDocument()
    expect(screen.getByText('Data will appear here once available')).toBeInTheDocument()
  })

  it('renders with custom title', () => {
    render(<NoData title="No transactions" />)
    expect(screen.getByText('No transactions')).toBeInTheDocument()
  })

  it('renders with custom description', () => {
    render(<NoData description="Check back later" />)
    expect(screen.getByText('Check back later')).toBeInTheDocument()
  })

  it('renders with action', () => {
    render(<NoData action={<button>Refresh</button>} />)
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<NoData className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})