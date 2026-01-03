import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'alert-icon' }),
  X: () => React.createElement('svg', { 'data-testid': 'close-icon' }),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) =>
      React.createElement('div', { className, onClick, ...props }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Mock LoadingButton
vi.mock('@/components/ui/LoadingButton', () => ({
  LoadingButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) =>
    React.createElement('button', { onClick, disabled, 'data-testid': 'confirm-button' }, children),
}))

import { ConfirmModal } from '@/components/ui/ConfirmModal'

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
  })

  it('calls onClose when cancel button clicked', () => {
    render(<ConfirmModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onConfirm when confirm button clicked', () => {
    render(<ConfirmModal {...defaultProps} />)
    fireEvent.click(screen.getByTestId('confirm-button'))
    expect(defaultProps.onConfirm).toHaveBeenCalled()
  })

  it('uses custom button text', () => {
    render(
      <ConfirmModal 
        {...defaultProps} 
        confirmText="Delete Forever"
        cancelText="Go Back"
      />
    )
    expect(screen.getByText('Delete Forever')).toBeInTheDocument()
    expect(screen.getByText('Go Back')).toBeInTheDocument()
  })

  it('renders ReactNode message', () => {
    render(
      <ConfirmModal 
        {...defaultProps} 
        message={<span data-testid="custom-message">Custom <strong>message</strong></span>}
      />
    )
    expect(screen.getByTestId('custom-message')).toBeInTheDocument()
  })

  it('shows alert icon', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
  })

  it('applies warning variant by default', () => {
    render(<ConfirmModal {...defaultProps} />)
    // Warning variant has yellow background styling
    expect(document.querySelector('.bg-yellow-600\\/20')).toBeInTheDocument()
  })

  it('applies danger variant styling', () => {
    render(<ConfirmModal {...defaultProps} variant="danger" />)
    // Danger variant has red background styling
    expect(document.querySelector('.bg-red-600\\/20')).toBeInTheDocument()
  })

  it('applies info variant styling', () => {
    render(<ConfirmModal {...defaultProps} variant="info" />)
    // Info variant has cyan background styling  
    expect(document.querySelector('.bg-\\[\\#00F0FF\\]\\/20')).toBeInTheDocument()
  })

  it('disables cancel button when loading', () => {
    render(<ConfirmModal {...defaultProps} isLoading={true} />)
    const cancelButton = screen.getByText('Cancel')
    expect(cancelButton).toBeDisabled()
  })
})
