import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock React component with error boundary capabilities
class ErrorBoundaryTestWrapper extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-fallback">Error occurred</div>
    }
    return this.props.children
  }
}

// Component that throws an error
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div data-testid="child">Working component</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundaryTestWrapper>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundaryTestWrapper>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('catches errors and renders fallback', () => {
    render(
      <ErrorBoundaryTestWrapper>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundaryTestWrapper>
    )
    expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundaryTestWrapper onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundaryTestWrapper>
    )
    expect(onError).toHaveBeenCalled()
  })

  it('handles nested errors', () => {
    render(
      <ErrorBoundaryTestWrapper>
        <div>
          <div>
            <ThrowingComponent shouldThrow={true} />
          </div>
        </div>
      </ErrorBoundaryTestWrapper>
    )
    expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
  })
})
