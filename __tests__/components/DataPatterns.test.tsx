import { describe, expect, it } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React, { useState } from 'react'

// Data display pattern tests

interface DataTableProps<T> {
  data: T[]
  columns: Array<{ key: keyof T; header: string }>
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading,
  emptyMessage = 'No data',
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return <div data-testid="table-loading">Loading...</div>
  }

  if (data.length === 0) {
    return <div data-testid="table-empty">{emptyMessage}</div>
  }

  return (
    <table data-testid="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)} data-testid={`header-${String(col.key)}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr
            key={idx}
            data-testid={`row-${idx}`}
            onClick={() => onRowClick?.(row)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            {columns.map((col) => (
              <td key={String(col.key)} data-testid={`cell-${idx}-${String(col.key)}`}>
                {String(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => (
  <div data-testid="pagination">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage <= 1}
      data-testid="prev-button"
    >
      Previous
    </button>
    <span data-testid="page-info">
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage >= totalPages}
      data-testid="next-button"
    >
      Next
    </button>
  </div>
)

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
}

const SearchBar = ({ value, onChange, onSearch, placeholder = 'Search...' }: SearchBarProps) => (
  <div data-testid="search-bar">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid="search-input"
    />
    <button onClick={onSearch} data-testid="search-button">
      Search
    </button>
  </div>
)

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

const FilterChip = ({ label, active, onClick }: FilterChipProps) => (
  <button
    onClick={onClick}
    data-testid={`filter-${label.toLowerCase()}`}
    className={active ? 'active' : ''}
    aria-pressed={active}
  >
    {label}
  </button>
)

describe('DataTable', () => {
  const columns = [
    { key: 'name' as const, header: 'Name' },
    { key: 'value' as const, header: 'Value' },
  ]

  const sampleData = [
    { name: 'Item 1', value: 100 },
    { name: 'Item 2', value: 200 },
  ]

  it('renders table with data', () => {
    render(<DataTable data={sampleData} columns={columns} />)
    expect(screen.getByTestId('data-table')).toBeInTheDocument()
    expect(screen.getByTestId('row-0')).toBeInTheDocument()
    expect(screen.getByTestId('row-1')).toBeInTheDocument()
  })

  it('renders headers', () => {
    render(<DataTable data={sampleData} columns={columns} />)
    expect(screen.getByTestId('header-name')).toHaveTextContent('Name')
    expect(screen.getByTestId('header-value')).toHaveTextContent('Value')
  })

  it('renders cell data', () => {
    render(<DataTable data={sampleData} columns={columns} />)
    expect(screen.getByTestId('cell-0-name')).toHaveTextContent('Item 1')
    expect(screen.getByTestId('cell-0-value')).toHaveTextContent('100')
  })

  it('shows loading state', () => {
    render(<DataTable data={[]} columns={columns} loading />)
    expect(screen.getByTestId('table-loading')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(<DataTable data={[]} columns={columns} emptyMessage="No items found" />)
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No items found')
  })

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = jest.fn()
    render(<DataTable data={sampleData} columns={columns} onRowClick={onRowClick} />)
    fireEvent.click(screen.getByTestId('row-0'))
    expect(onRowClick).toHaveBeenCalledWith(sampleData[0])
  })
})

describe('Pagination', () => {
  it('renders page info', () => {
    render(<Pagination currentPage={2} totalPages={10} onPageChange={() => {}} />)
    expect(screen.getByTestId('page-info')).toHaveTextContent('Page 2 of 10')
  })

  it('calls onPageChange when clicking next', () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={2} totalPages={10} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByTestId('next-button'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange when clicking previous', () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={5} totalPages={10} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByTestId('prev-button'))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('disables previous button on first page', () => {
    render(<Pagination currentPage={1} totalPages={10} onPageChange={() => {}} />)
    expect(screen.getByTestId('prev-button')).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(<Pagination currentPage={10} totalPages={10} onPageChange={() => {}} />)
    expect(screen.getByTestId('next-button')).toBeDisabled()
  })
})

describe('SearchBar', () => {
  it('renders with placeholder', () => {
    render(
      <SearchBar
        value=""
        onChange={() => {}}
        onSearch={() => {}}
        placeholder="Search items..."
      />
    )
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })

  it('calls onChange when typing', () => {
    const onChange = jest.fn()
    render(<SearchBar value="" onChange={onChange} onSearch={() => {}} />)
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalledWith('test')
  })

  it('calls onSearch when button clicked', () => {
    const onSearch = jest.fn()
    render(<SearchBar value="query" onChange={() => {}} onSearch={onSearch} />)
    fireEvent.click(screen.getByTestId('search-button'))
    expect(onSearch).toHaveBeenCalled()
  })
})

describe('FilterChip', () => {
  it('renders with label', () => {
    render(<FilterChip label="Active" active={false} onClick={() => {}} />)
    expect(screen.getByTestId('filter-active')).toHaveTextContent('Active')
  })

  it('shows active state', () => {
    render(<FilterChip label="Active" active={true} onClick={() => {}} />)
    expect(screen.getByTestId('filter-active')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows inactive state', () => {
    render(<FilterChip label="Inactive" active={false} onClick={() => {}} />)
    expect(screen.getByTestId('filter-inactive')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<FilterChip label="Toggle" active={false} onClick={onClick} />)
    fireEvent.click(screen.getByTestId('filter-toggle'))
    expect(onClick).toHaveBeenCalled()
  })
})
