/**
 * TransactionNotification Tests
 * Tests for wallet transaction notification toasts (0% coverage)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { TransactionNotification, useTransactionNotifications } from '@/components/wallet/TransactionNotification'

describe('TransactionNotification', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('rendering', () => {
    it('renders nothing when notification is null', () => {
      const { container } = render(
        <TransactionNotification notification={null} onClose={() => {}} />
      )
      
      expect(container.firstChild).toBeNull()
    })

    it('renders pending notification', () => {
      const notification = {
        id: '1',
        type: 'pending' as const,
        title: 'Transaction Pending',
        message: 'Waiting for confirmation...',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={() => {}} />
      )
      
      expect(screen.getByText('Transaction Pending')).toBeInTheDocument()
      expect(screen.getByText('Waiting for confirmation...')).toBeInTheDocument()
      expect(screen.getByText('⏳')).toBeInTheDocument()
    })

    it('renders success notification', () => {
      const notification = {
        id: '2',
        type: 'success' as const,
        title: 'Success!',
        message: 'Transaction completed successfully',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={() => {}} />
      )
      
      expect(screen.getByText('Success!')).toBeInTheDocument()
      expect(screen.getByText('Transaction completed successfully')).toBeInTheDocument()
      expect(screen.getByText('✅')).toBeInTheDocument()
    })

    it('renders error notification', () => {
      const notification = {
        id: '3',
        type: 'error' as const,
        title: 'Transaction Failed',
        message: 'Not enough gas',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={() => {}} />
      )
      
      expect(screen.getByText('Transaction Failed')).toBeInTheDocument()
      expect(screen.getByText('Not enough gas')).toBeInTheDocument()
      expect(screen.getByText('❌')).toBeInTheDocument()
    })
  })

  describe('transaction hash link', () => {
    it('renders explorer link when txHash is provided', () => {
      const notification = {
        id: '4',
        type: 'success' as const,
        title: 'Success!',
        message: 'Transaction completed',
        txHash: '0x1234567890abcdef',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={() => {}} />
      )
      
      const link = screen.getByText('View on Explorer →')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://sepolia.basescan.org/tx/0x1234567890abcdef')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('does not render explorer link when txHash is not provided', () => {
      const notification = {
        id: '5',
        type: 'success' as const,
        title: 'Success!',
        message: 'Transaction completed',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={() => {}} />
      )
      
      expect(screen.queryByText('View on Explorer →')).not.toBeInTheDocument()
    })
  })

  describe('close functionality', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn()
      const notification = {
        id: '6',
        type: 'success' as const,
        title: 'Success!',
        message: 'Transaction completed',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={onClose} />
      )
      
      fireEvent.click(screen.getByText('✕'))
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('auto-closes success notification after 8 seconds', async () => {
      const onClose = jest.fn()
      const notification = {
        id: '7',
        type: 'success' as const,
        title: 'Success!',
        message: 'Transaction completed',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={onClose} />
      )
      
      act(() => {
        jest.advanceTimersByTime(8000)
      })
      
      expect(onClose).toHaveBeenCalled()
    })

    it('auto-closes pending notification after 30 seconds', async () => {
      const onClose = jest.fn()
      const notification = {
        id: '8',
        type: 'pending' as const,
        title: 'Pending',
        message: 'Waiting...',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={onClose} />
      )
      
      act(() => {
        jest.advanceTimersByTime(30000)
      })
      
      expect(onClose).toHaveBeenCalled()
    })

    it('auto-closes error notification after 8 seconds', async () => {
      const onClose = jest.fn()
      const notification = {
        id: '9',
        type: 'error' as const,
        title: 'Error',
        message: 'Failed',
      }
      
      render(
        <TransactionNotification notification={notification} onClose={onClose} />
      )
      
      act(() => {
        jest.advanceTimersByTime(8000)
      })
      
      expect(onClose).toHaveBeenCalled()
    })
  })
})

describe('useTransactionNotifications', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('initializes with null notification', () => {
    let hookResult: ReturnType<typeof useTransactionNotifications>
    
    function TestComponent() {
      hookResult = useTransactionNotifications()
      return null
    }
    
    render(<TestComponent />)
    
    expect(hookResult!.notification).toBeNull()
  })

  it('shows notification when showNotification is called', async () => {
    let hookResult: ReturnType<typeof useTransactionNotifications>
    
    function TestComponent() {
      hookResult = useTransactionNotifications()
      return (
        <div>
          {hookResult.notification ? (
            <span data-testid="notification">{hookResult.notification.title}</span>
          ) : null}
        </div>
      )
    }
    
    render(<TestComponent />)
    
    act(() => {
      hookResult!.showNotification('success', 'Test Title', 'Test Message')
    })
    
    expect(screen.getByTestId('notification')).toHaveTextContent('Test Title')
  })

  it('shows notification with txHash', async () => {
    let hookResult: ReturnType<typeof useTransactionNotifications>
    
    function TestComponent() {
      hookResult = useTransactionNotifications()
      return (
        <div>
          {hookResult.notification ? (
            <span data-testid="txhash">{hookResult.notification.txHash}</span>
          ) : null}
        </div>
      )
    }
    
    render(<TestComponent />)
    
    act(() => {
      hookResult!.showNotification('success', 'Title', 'Message', '0xabc123')
    })
    
    expect(screen.getByTestId('txhash')).toHaveTextContent('0xabc123')
  })

  it('clears notification when closeNotification is called', async () => {
    let hookResult: ReturnType<typeof useTransactionNotifications>
    
    function TestComponent() {
      hookResult = useTransactionNotifications()
      return (
        <div>
          {hookResult.notification ? (
            <span data-testid="notification">{hookResult.notification.title}</span>
          ) : (
            <span data-testid="empty">No notification</span>
          )}
        </div>
      )
    }
    
    render(<TestComponent />)
    
    act(() => {
      hookResult!.showNotification('success', 'Test', 'Message')
    })
    
    expect(screen.getByTestId('notification')).toBeInTheDocument()
    
    act(() => {
      hookResult!.closeNotification()
    })
    
    expect(screen.getByTestId('empty')).toBeInTheDocument()
  })

  it('assigns unique ID to each notification', async () => {
    let hookResult: ReturnType<typeof useTransactionNotifications>
    let firstId: string
    
    function TestComponent() {
      hookResult = useTransactionNotifications()
      return null
    }
    
    render(<TestComponent />)
    
    act(() => {
      hookResult!.showNotification('success', 'First', 'Message')
    })
    
    firstId = hookResult!.notification!.id
    
    // Advance time so Date.now() returns different value
    jest.advanceTimersByTime(1)
    
    act(() => {
      hookResult!.showNotification('error', 'Second', 'Message')
    })
    
    expect(hookResult!.notification!.id).not.toBe(firstId)
  })
})
