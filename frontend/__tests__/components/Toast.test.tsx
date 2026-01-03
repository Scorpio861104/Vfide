import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
vi.mock('lucide-react', () => ({
  CheckCircle2: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'check-icon' }),
  XCircle: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'error-icon' }),
  AlertCircle: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'info-icon' }),
  X: () => React.createElement('svg', { 'data-testid': 'close-icon' }),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) =>
      React.createElement('div', { className, ...props }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

import { ToastProvider, useToast } from '@/components/ui/toast'

// Test component that uses toast
function TestComponent() {
  const { showToast, toast } = useToast()
  
  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Info message', 'info')}>Show Info</button>
      <button onClick={() => showToast('Default message')}>Show Default</button>
      <button onClick={() => toast({ title: 'Title', description: 'Description' })}>Shadcn Toast</button>
      <button onClick={() => toast({ description: 'Error', variant: 'destructive' })}>Destructive Toast</button>
    </div>
  )
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Child content</div>
      </ToastProvider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('shows success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Show Success'))
    })
    
    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
  })

  it('shows error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Show Error'))
    })
    
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })

  it('shows info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Show Info'))
    })
    
    expect(screen.getByText('Info message')).toBeInTheDocument()
    expect(screen.getByTestId('info-icon')).toBeInTheDocument()
  })

  it('defaults to info type', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Show Default'))
    })
    
    expect(screen.getByText('Default message')).toBeInTheDocument()
    expect(screen.getByTestId('info-icon')).toBeInTheDocument()
  })

  it('removes toast on close click', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Show Success'))
    })
    
    expect(screen.getByText('Success message')).toBeInTheDocument()
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('close-icon'))
    })
    
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('auto-removes toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Show Success'))
    })
    
    expect(screen.getByText('Success message')).toBeInTheDocument()
    
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('supports shadcn-style toast function', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Shadcn Toast'))
    })
    
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('supports destructive variant', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Destructive Toast'))
    })
    
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })
})

describe('useToast', () => {
  it('throws when used outside provider', () => {
    const TestError = () => {
      useToast()
      return null
    }

    expect(() => render(<TestError />)).toThrow('useToast must be used within ToastProvider')
  })
})
