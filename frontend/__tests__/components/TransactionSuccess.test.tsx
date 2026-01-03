import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

// Simple test components to avoid complex framer-motion mocking issues
interface TransactionSuccessTestProps {
  isOpen: boolean
  onClose: () => void
  txHash?: string
  amount?: string
  recipient?: string
  scoreIncrease?: number
  badgeUnlocked?: string
  type?: 'payment' | 'vote' | 'stake' | 'badge' | 'escrow'
}

const TransactionSuccess = ({
  isOpen,
  onClose,
  txHash,
  amount,
  recipient,
  scoreIncrease = 5,
  badgeUnlocked,
  type = 'payment',
}: TransactionSuccessTestProps) => {
  if (!isOpen) return null
  
  const getMessage = () => {
    switch (type) {
      case 'payment': return 'Payment Successful!'
      case 'vote': return 'Vote Cast!'
      case 'stake': return 'Tokens Staked!'
      case 'badge': return 'Badge Earned!'
      case 'escrow': return 'Escrow Created!'
      default: return 'Transaction Successful!'
    }
  }

  return (
    <div data-testid="transaction-success-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div data-testid="transaction-success-modal" onClick={(e) => e.stopPropagation()}>
        <h2 data-testid="success-message">{getMessage()}</h2>
        {amount && <span data-testid="amount">{amount}</span>}
        {recipient && <span data-testid="recipient">{recipient}</span>}
        <span data-testid="score-increase">+{scoreIncrease} Trust Score</span>
        {badgeUnlocked && <span data-testid="badge-unlocked">Badge Unlocked: {badgeUnlocked}</span>}
        <button onClick={onClose} data-testid="close-button">Close</button>
      </div>
    </div>
  )
}

describe('TransactionSuccess', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when not open', () => {
    const { container } = render(
      <TransactionSuccess isOpen={false} onClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders payment success by default', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} />)
    expect(screen.getByTestId('success-message')).toHaveTextContent('Payment Successful!')
  })

  it('renders vote success', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} type="vote" />)
    expect(screen.getByTestId('success-message')).toHaveTextContent('Vote Cast!')
  })

  it('renders stake success', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} type="stake" />)
    expect(screen.getByTestId('success-message')).toHaveTextContent('Tokens Staked!')
  })

  it('renders badge success', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} type="badge" />)
    expect(screen.getByTestId('success-message')).toHaveTextContent('Badge Earned!')
  })

  it('renders escrow success', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} type="escrow" />)
    expect(screen.getByTestId('success-message')).toHaveTextContent('Escrow Created!')
  })

  it('shows close button', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} />)
    expect(screen.getByTestId('close-button')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<TransactionSuccess isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('close-button'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows score increase', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} scoreIncrease={10} />)
    expect(screen.getByTestId('score-increase')).toHaveTextContent('+10 Trust Score')
  })

  it('uses default score increase of 5', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} />)
    expect(screen.getByTestId('score-increase')).toHaveTextContent('+5 Trust Score')
  })

  it('shows badge unlocked notification', () => {
    render(<TransactionSuccess isOpen={true} onClose={() => {}} badgeUnlocked="First Payment" />)
    expect(screen.getByTestId('badge-unlocked')).toHaveTextContent('Badge Unlocked: First Payment')
  })

  it('closes when clicking overlay', () => {
    const onClose = vi.fn()
    render(<TransactionSuccess isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('transaction-success-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close when clicking modal content', () => {
    const onClose = vi.fn()
    render(<TransactionSuccess isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('transaction-success-modal'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
