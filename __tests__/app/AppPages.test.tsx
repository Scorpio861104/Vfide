/**
 * Tests for app-level error, loading, and not-found components
 * Core Next.js page components
 */
import { describe, expect, it, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    button: ({ children, className, onClick, ...props }: any) => <button className={className} onClick={onClick} {...props}>{children}</button>,
    h1: ({ children, className, ...props }: any) => <h1 className={className} {...props}>{children}</h1>,
    p: ({ children, className, ...props }: any) => <p className={className} {...props}>{children}</p>,
    span: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshCw</span>,
  Home: () => <span data-testid="icon-home">Home</span>,
  ArrowLeft: () => <span data-testid="icon-arrow-left">ArrowLeft</span>,
}))

// Mock next/link
jest.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('Error Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render error page', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument()
  })

  it('should display error icon', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument()
  })

  it('should display error message', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByText(/We encountered an unexpected error/i)).toBeInTheDocument()
  })

  it('should display error digest if available', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = Object.assign(new Error('Test error'), { digest: 'abc123' })
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByText(/Error ID: abc123/i)).toBeInTheDocument()
  })

  it('should call reset when Try Again is clicked', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    const tryAgainButton = screen.getByText(/Try Again/i)
    fireEvent.click(tryAgainButton)

    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('should have home link', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    const homeLink = screen.getByText(/Go Home/i)
    expect(homeLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('should display refresh icon', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByTestId('icon-refresh')).toBeInTheDocument()
  })

  it('should log error to console', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(consoleSpy).toHaveBeenCalledWith('Application error:', mockError)
    consoleSpy.mockRestore()
  })
})

describe('Not Found Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock window.history.back
    Object.defineProperty(window, 'history', {
      value: { back: jest.fn() },
      writable: true,
    })
  })

  it('should render 404 page', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('should display page not found message', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument()
  })

  it('should display helpful description', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText(/doesn't exist or has been moved/i)).toBeInTheDocument()
  })

  it('should have home link', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    const homeLink = screen.getByText(/Go Home/i)
    expect(homeLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('should have go back button', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText(/Go Back/i)).toBeInTheDocument()
  })

  it('should call history.back when Go Back is clicked', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    const goBackButton = screen.getByText(/Go Back/i)
    fireEvent.click(goBackButton)

    expect(window.history.back).toHaveBeenCalledTimes(1)
  })

  it('should display popular pages section', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText(/Popular Pages/i)).toBeInTheDocument()
  })

  it('should have link to dashboard', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    const dashboardLink = screen.getByText(/Trust Explorer/i)
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard')
  })

  it('should have link to vault', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    const vaultLink = screen.getByText(/Vault Manager/i)
    expect(vaultLink.closest('a')).toHaveAttribute('href', '/vault')
  })

  it('should display home icon', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByTestId('icon-home')).toBeInTheDocument()
  })

  it('should display arrow left icon', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByTestId('icon-arrow-left')).toBeInTheDocument()
  })
})

describe('Loading Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading page', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    render(<LoadingPage />)

    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('should display V logo', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    render(<LoadingPage />)

    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('should have animated dots', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    // Check for animated bounce elements
    const dots = container.querySelectorAll('.animate-bounce')
    expect(dots.length).toBe(3)
  })

  it('should have spinning ring', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const spinningElement = container.querySelector('.animate-spin')
    expect(spinningElement).toBeInTheDocument()
  })

  it('should have pulsing inner glow', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const pulsingElement = container.querySelector('.animate-pulse')
    expect(pulsingElement).toBeInTheDocument()
  })

  it('should have correct background color', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const mainDiv = container.firstChild
    expect(mainDiv).toHaveClass('bg-[#1A1A1D]')
  })

  it('should center content', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const mainDiv = container.firstChild
    expect(mainDiv).toHaveClass('flex')
    expect(mainDiv).toHaveClass('items-center')
    expect(mainDiv).toHaveClass('justify-center')
  })

  it('should have min height of screen', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const mainDiv = container.firstChild
    expect(mainDiv).toHaveClass('min-h-screen')
  })
})
