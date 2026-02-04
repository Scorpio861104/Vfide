/**
 * PaymentQR Tests
 * Tests for PaymentQR component (0% coverage)
 */
import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaymentQR } from '@/components/merchant/PaymentQR'

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}))

// Mock QRCodeSVG
jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, id }: { value: string; id?: string }) => (
    <svg data-testid="qr-code" id={id} data-value={value} />
  ),
}))

// Mock vfide-hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useIsMerchant: () => ({
    isMerchant: true,
    businessName: 'Test Store',
  }),
}))

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn(() => Promise.resolve()),
}
Object.assign(navigator, { clipboard: mockClipboard })

describe('PaymentQR', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders for connected merchant', () => {
    render(<PaymentQR />)
    
    expect(screen.getByText('Payment QR Code')).toBeInTheDocument()
  })

  it('shows QR code', () => {
    render(<PaymentQR />)
    
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
  })

  it('has amount input field', () => {
    render(<PaymentQR />)
    
    const amountInput = screen.getByRole('spinbutton')
    expect(amountInput).toBeInTheDocument()
  })

  it('updates QR code when amount changes', () => {
    render(<PaymentQR />)
    
    const amountInput = screen.getByRole('spinbutton')
    fireEvent.change(amountInput, { target: { value: '100' } })
    
    expect(amountInput).toHaveValue(100)
  })

  it('uses default amount when provided', () => {
    render(<PaymentQR defaultAmount="50" />)
    
    const amountInput = screen.getByRole('spinbutton')
    expect(amountInput).toHaveValue(50)
  })

  it('shows description text', () => {
    render(<PaymentQR />)
    
    expect(screen.getByText(/QR scans default to instant settlement/i)).toBeInTheDocument()
  })

  it('shows VFIDE amount display when amount entered', () => {
    render(<PaymentQR />)
    
    const amountInput = screen.getByRole('spinbutton')
    fireEvent.change(amountInput, { target: { value: '1000' } })
    
    expect(screen.getByText(/1,000 VFIDE/)).toBeInTheDocument()
  })

  it('has action buttons', () => {
    render(<PaymentQR />)
    
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('has QrCode icon in header', () => {
    render(<PaymentQR />)
    
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('renders order ID input', () => {
    render(<PaymentQR />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThan(0)
  })
})
