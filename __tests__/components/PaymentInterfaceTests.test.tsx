/**
 * PaymentInterface Tests
 * Tests for PaymentInterface component (0% coverage)
 */
import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaymentInterface } from '@/components/merchant/PaymentInterface'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
  },
}))

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}))

// Mock vfide-hooks
jest.mock('@/lib/vfide-hooks', () => ({
  usePayMerchant: () => ({
    payMerchant: jest.fn(),
    isPaying: false,
    isSuccess: false,
    error: null,
  }),
  useIsMerchant: () => ({
    isMerchant: true,
    businessName: 'Test Store',
    category: 'Retail',
    isSuspended: false,
  }),
  useCustomerTrustScore: () => ({
    highTrust: true,
    lowTrust: false,
  }),
  useProofScore: () => ({
    score: 750,
  }),
  useVaultBalance: () => ({
    balance: '1000',
  }),
  useEscrow: () => ({
    createEscrow: jest.fn(),
    loading: false,
    error: null,
    isSuccess: false,
  }),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VFIDEToken: '0xTokenAddress',
  },
}))

describe('PaymentInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders payment header', () => {
    render(<PaymentInterface />)
    
    expect(screen.getByText('Pay Merchant')).toBeInTheDocument()
  })

  it('renders header section', () => {
    render(<PaymentInterface />)
    
    // Check for the icon or some UI element
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
    expect(screen.getByText(/Escrow for online orders/i)).toBeInTheDocument()
  })

  it('displays trust score when connected', () => {
    render(<PaymentInterface />)
    
    expect(screen.getByText('Your Trust Score')).toBeInTheDocument()
    expect(screen.getByText('750')).toBeInTheDocument()
  })

  it('shows High Trust badge for high trust score', () => {
    render(<PaymentInterface />)
    
    expect(screen.getByText('High Trust')).toBeInTheDocument()
  })

  it('has merchant address input', () => {
    render(<PaymentInterface />)
    
    expect(screen.getByLabelText(/Merchant Address/i)).toBeInTheDocument()
  })

  it('has amount input', () => {
    render(<PaymentInterface />)
    
    expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument()
  })

  it('has order ID input', () => {
    render(<PaymentInterface />)
    
    expect(screen.getByLabelText(/Order ID/i)).toBeInTheDocument()
  })

  it('has MAX button for amount', () => {
    render(<PaymentInterface />)
    
    expect(screen.getByText('MAX')).toBeInTheDocument()
  })

  it('sets max balance when MAX clicked', () => {
    render(<PaymentInterface />)
    
    const maxButton = screen.getByText('MAX')
    fireEvent.click(maxButton)
    
    const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement
    expect(amountInput.value).toBe('1000')
  })

  it('validates merchant address as valid', () => {
    render(<PaymentInterface />)
    
    const merchantInput = screen.getByLabelText(/Merchant Address/i)
    fireEvent.change(merchantInput, { target: { value: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' } })
    
    // Should show merchant info
    expect(screen.getByText(/Test Store/i)).toBeInTheDocument()
  })

  it('shows invalid address error', () => {
    render(<PaymentInterface />)
    
    const merchantInput = screen.getByLabelText(/Merchant Address/i)
    fireEvent.change(merchantInput, { target: { value: 'not-valid' } })
    
    expect(screen.getByText(/Invalid address/i)).toBeInTheDocument()
  })

  it('updates amount on input change', () => {
    render(<PaymentInterface />)
    
    const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '500' } })
    
    expect(amountInput.value).toBe('500')
  })

  it('updates orderId on input change', () => {
    render(<PaymentInterface />)
    
    const orderInput = screen.getByLabelText(/Order ID/i) as HTMLInputElement
    fireEvent.change(orderInput, { target: { value: 'INV-999' } })
    
    expect(orderInput.value).toBe('INV-999')
  })

  it('has payment form role', () => {
    render(<PaymentInterface />)
    
    expect(screen.getByRole('form', { name: /Payment form/i })).toBeInTheDocument()
  })

  it('shows CreditCard icon', () => {
    render(<PaymentInterface />)
    
    // Icon is an SVG
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })
})
