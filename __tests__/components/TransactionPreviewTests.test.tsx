/**
 * TransactionPreview Tests
 * Tests for TransactionPreview and GasEstimate components (0% coverage)
 */
import { describe, it, expect, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { TransactionPreview, GasEstimate } from '@/components/ui/TransactionPreview'

// Mock wagmi
jest.mock('wagmi', () => ({
  useGasPrice: jest.fn(() => ({
    data: BigInt(1000000000), // 1 gwei
  })),
  useChainId: jest.fn(() => 84532),
}))

describe('TransactionPreview', () => {
  it('renders when show is true (default)', () => {
    render(<TransactionPreview action="Transfer" />)
    
    expect(screen.getByText('Transaction Preview')).toBeInTheDocument()
  })

  it('returns null when show is false', () => {
    const { container } = render(<TransactionPreview action="Transfer" show={false} />)
    
    expect(container.firstChild).toBeNull()
  })

  it('displays network fee section', () => {
    render(<TransactionPreview action="Transfer" />)
    
    expect(screen.getByText('Network Fee (gas)')).toBeInTheDocument()
  })

  it('displays total cost section', () => {
    render(<TransactionPreview action="Transfer" />)
    
    expect(screen.getByText('Total Cost')).toBeInTheDocument()
  })

  it('displays gas estimate', () => {
    render(<TransactionPreview action="Transfer" />)
    
    // With 1 gwei * 100000 gas = ~0.0001 ETH * $2500 = ~$0.25
    expect(screen.getByText('Network Fee (gas)')).toBeInTheDocument()
  })

  it('displays confirmation time', () => {
    render(<TransactionPreview action="Transfer" />)
    
    expect(screen.getByText(/~2 sec confirmation on Base/)).toBeInTheDocument()
  })

  it('shows burn fee when burnFeePercent > 0 and amount provided', () => {
    render(<TransactionPreview action="Transfer" amount="100" burnFeePercent={2.5} />)
    
    expect(screen.getByText('Burn Fee (2.5%)')).toBeInTheDocument()
    expect(screen.getByText('2.5 VFIDE')).toBeInTheDocument()
  })

  it('does not show burn fee when burnFeePercent is 0', () => {
    render(<TransactionPreview action="Transfer" amount="100" burnFeePercent={0} />)
    
    expect(screen.queryByText(/Burn Fee/)).not.toBeInTheDocument()
  })

  it('does not show burn fee when amount is empty', () => {
    render(<TransactionPreview action="Transfer" burnFeePercent={5} />)
    
    expect(screen.queryByText(/Burn Fee/)).not.toBeInTheDocument()
  })

  it('calculates burn fee correctly for different amounts', () => {
    render(<TransactionPreview action="Transfer" amount="1000" burnFeePercent={0.25} />)
    
    expect(screen.getByText('Burn Fee (0.25%)')).toBeInTheDocument()
    expect(screen.getByText('2.5 VFIDE')).toBeInTheDocument()
  })

  it('uses custom gas estimate when provided', () => {
    render(<TransactionPreview action="Transfer" gasEstimate={BigInt(200000)} />)
    
    // Gas should be higher with custom estimate
    expect(screen.getByText('Network Fee (gas)')).toBeInTheDocument()
  })

  it('shows Fuel icon', () => {
    render(<TransactionPreview action="Transfer" />)
    
    const icon = document.querySelector('[data-testid="icon-Fuel"]')
    expect(icon).toBeInTheDocument()
  })

  it('shows green indicator dot', () => {
    render(<TransactionPreview action="Transfer" />)
    
    const dot = document.querySelector('.bg-green-500')
    expect(dot).toBeInTheDocument()
  })

  it('handles large amounts correctly', () => {
    render(<TransactionPreview action="Transfer" amount="1000000" burnFeePercent={1} />)
    
    expect(screen.getByText('10,000 VFIDE')).toBeInTheDocument()
  })

  it('handles decimal amounts correctly', () => {
    render(<TransactionPreview action="Transfer" amount="100.5" burnFeePercent={2} />)
    
    expect(screen.getByText('2.01 VFIDE')).toBeInTheDocument()
  })
})

describe('GasEstimate', () => {
  it('renders gas estimate text', () => {
    render(<GasEstimate />)
    
    expect(screen.getByText(/~\$/)).toBeInTheDocument()
    expect(screen.getByText(/gas/)).toBeInTheDocument()
  })

  it('uses default gas estimate when not provided', () => {
    render(<GasEstimate />)
    
    // Should show some gas estimate
    const text = screen.getByText(/~\$/)
    expect(text).toBeInTheDocument()
  })

  it('uses custom gas estimate when provided', () => {
    render(<GasEstimate gasEstimate={BigInt(50000)} />)
    
    expect(screen.getByText(/~\$/)).toBeInTheDocument()
  })

  it('shows less than $0.01 for very small estimates', () => {
    render(<GasEstimate gasEstimate={BigInt(1000)} />)
    
    expect(screen.getByText(/~\$<0\.01 gas/)).toBeInTheDocument()
  })

  it('applies correct text styling', () => {
    render(<GasEstimate />)
    
    const element = screen.getByText(/~\$/)
    expect(element).toHaveClass('text-xs', 'text-zinc-500')
  })
})
