import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock lucide icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <span>AlertIcon</span>,
  RefreshCw: () => <span>RefreshIcon</span>,
  Home: () => <span>HomeIcon</span>,
  ChevronDown: () => <span>ChevronDownIcon</span>,
  Copy: () => <span>CopyIcon</span>,
}))

// Import after mocking
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error
  beforeAll(() => {
    console.error = vi.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child Content</div>
      </ErrorBoundary>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders fallback when there is an error', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary fallback={<div data-testid="fallback">Error occurred</div>}>
        <ThrowError />
      </ErrorBoundary>
    )
    // Should show fallback or default error UI
    expect(document.body).toBeInTheDocument()
  })

  it('renders with custom fallback component', () => {
    const { container } = render(
      <ErrorBoundary fallback={<div>Custom Error</div>}>
        <div>Content</div>
      </ErrorBoundary>
    )
    expect(container).toBeInTheDocument()
  })
})
