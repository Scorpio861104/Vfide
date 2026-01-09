import { describe, expect, it, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'loader-icon' }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, className, disabled, onClick, type, ...props }: React.PropsWithChildren<{ 
      className?: string
      disabled?: boolean
      onClick?: () => void
      type?: string
    }>) =>
      React.createElement('button', { className, disabled, onClick, type, ...props }, children),
  },
}))

import { LoadingButton } from '@/components/ui/LoadingButton'

describe('LoadingButton', () => {
  it('renders children', () => {
    render(<LoadingButton>Click me</LoadingButton>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('shows loading state with isLoading', () => {
    render(<LoadingButton isLoading>Submit</LoadingButton>)
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  it('shows loading state with isPending (wagmi compatibility)', () => {
    render(<LoadingButton isPending>Submit</LoadingButton>)
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  it('shows custom loading text', () => {
    render(
      <LoadingButton isLoading loadingText="Processing...">
        Submit
      </LoadingButton>
    )
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('is disabled when loading', () => {
    render(<LoadingButton isLoading>Submit</LoadingButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<LoadingButton disabled>Submit</LoadingButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<LoadingButton onClick={handleClick}>Submit</LoadingButton>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn()
    render(<LoadingButton onClick={handleClick} disabled>Submit</LoadingButton>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies primary variant by default', () => {
    render(<LoadingButton>Submit</LoadingButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-linear-to-r')
  })

  it('applies secondary variant', () => {
    render(<LoadingButton variant="secondary">Submit</LoadingButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-[#2A2A2F]')
  })

  it('applies danger variant', () => {
    render(<LoadingButton variant="danger">Submit</LoadingButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-red-600')
  })

  it('applies success variant', () => {
    render(<LoadingButton variant="success">Submit</LoadingButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-green-600')
  })

  it('applies sm size', () => {
    render(<LoadingButton size="sm">Submit</LoadingButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-sm')
  })

  it('applies md size by default', () => {
    render(<LoadingButton>Submit</LoadingButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-base')
  })

  it('applies lg size', () => {
    render(<LoadingButton size="lg">Submit</LoadingButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-lg')
  })

  it('uses button type by default', () => {
    render(<LoadingButton>Submit</LoadingButton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('can be submit type', () => {
    render(<LoadingButton type="submit">Submit</LoadingButton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('applies custom className', () => {
    render(<LoadingButton className="custom-class">Submit</LoadingButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })
})
