/**
 * Real Merchant Component Tests
 * Tests for actual merchant components with mocked hooks
 */

import { describe, it, expect, beforeEach, Mock } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock all hooks and dependencies before importing components
jest.mock('@/lib/vfide-hooks', () => ({
  useIsMerchant: jest.fn(),
  useRegisterMerchant: jest.fn(),
  useSetAutoConvert: jest.fn(),
  useSetPayoutAddress: jest.fn(),
  useProofScore: jest.fn(),
  useMerchantPaymentStatus: jest.fn(),
  useProcessPayment: jest.fn(),
}))

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(() => 1),
}))

jest.mock('viem', () => ({
  isAddress: jest.fn((addr: string) => addr.startsWith('0x') && addr.length === 42),
  formatEther: jest.fn((val: bigint) => (Number(val) / 1e18).toString()),
  parseEther: jest.fn((val: string) => BigInt(Number(val) * 1e18)),
}))

jest.mock('lucide-react', () => ({
  Store: ({ className }: { className?: string }) => <span data-testid="store-icon" className={className} />,
  DollarSign: ({ className }: { className?: string }) => <span data-testid="dollar-icon" className={className} />,
  Settings: ({ className }: { className?: string }) => <span data-testid="settings-icon" className={className} />,
  Zap: ({ className }: { className?: string }) => <span data-testid="zap-icon" className={className} />,
  Shield: ({ className }: { className?: string }) => <span data-testid="shield-icon" className={className} />,
  Copy: ({ className }: { className?: string }) => <span data-testid="copy-icon" className={className} />,
  Check: ({ className }: { className?: string }) => <span data-testid="check-icon" className={className} />,
  QrCode: ({ className }: { className?: string }) => <span data-testid="qr-icon" className={className} />,
  CreditCard: ({ className }: { className?: string }) => <span data-testid="credit-card-icon" className={className} />,
  Loader2: ({ className }: { className?: string }) => <span data-testid="loader-icon" className={className} />,
  CheckCircle2: ({ className }: { className?: string }) => <span data-testid="check-circle-icon" className={className} />,
  AlertCircle: ({ className }: { className?: string }) => <span data-testid="alert-icon" className={className} />,
}))

// Import hooks after mocking
import { useAccount } from 'wagmi'
import { 
  useIsMerchant, 
  useRegisterMerchant, 
  useSetAutoConvert, 
  useSetPayoutAddress, 
  useProofScore 
} from '@/lib/vfide-hooks'
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard'

describe('MerchantDashboard', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mocks
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    
    ;(useIsMerchant as Mock).mockReturnValue({
      isMerchant: false,
      isLoading: false,
      merchantInfo: null,
    })
    
    ;(useRegisterMerchant as Mock).mockReturnValue({
      registerMerchant: jest.fn(),
      isRegistering: false,
      isSuccess: false,
      error: null,
    })
    
    ;(useSetAutoConvert as Mock).mockReturnValue({
      setAutoConvert: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })
    
    ;(useSetPayoutAddress as Mock).mockReturnValue({
      setPayoutAddress: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })
    
    ;(useProofScore as Mock).mockReturnValue({
      score: 5000,
      canMerchant: false,
      tier: 'NEUTRAL',
    })
  })

  describe('Not Connected', () => {
    it('should show connect wallet message when not connected', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      })

      render(<MerchantDashboard />)

      expect(screen.getByText(/connect wallet/i)).toBeInTheDocument()
    })

    it('should display store icon when not connected', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      })

      render(<MerchantDashboard />)

      expect(screen.getByTestId('store-icon')).toBeInTheDocument()
    })
  })

  describe('Not a Merchant - Registration Flow', () => {
    beforeEach(() => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useIsMerchant as Mock).mockReturnValue({
        isMerchant: false,
        isLoading: false,
        merchantInfo: null,
      })
    })

    it('should display "Become a Merchant" heading', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('Become a Merchant')).toBeInTheDocument()
    })

    it('should show 0% protocol fees message', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText(/0% protocol fees/i)).toBeInTheDocument()
    })

    it('should display requirements section', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('Requirements')).toBeInTheDocument()
    })

    it('should show current ProofScore requirement', () => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 4500,
        canMerchant: false,
        tier: 'NEUTRAL',
      })

      render(<MerchantDashboard />)

      expect(screen.getByText(/5,600/)).toBeInTheDocument()
      expect(screen.getByText(/4,500/)).toBeInTheDocument()
    })

    it('should show tips to increase score when below threshold', () => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 4000,
        canMerchant: false,
        tier: 'NEUTRAL',
      })

      render(<MerchantDashboard />)

      expect(screen.getByText(/Increase your ProofScore by/i)).toBeInTheDocument()
    })

    it('should show registration form when canMerchant is true', () => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 6000,
        canMerchant: true,
        tier: 'TRUSTED',
      })

      render(<MerchantDashboard />)

      expect(screen.getByText('Register Your Business')).toBeInTheDocument()
    })

    it('should have business name input when canMerchant is true', () => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 6000,
        canMerchant: true,
        tier: 'TRUSTED',
      })

      render(<MerchantDashboard />)

      expect(screen.getByPlaceholderText(/Acme Coffee Shop/i)).toBeInTheDocument()
    })
  })

  describe('Already a Merchant', () => {
    beforeEach(() => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      // useIsMerchant returns flat properties, not nested merchantInfo
      ;(useIsMerchant as Mock).mockReturnValue({
        isMerchant: true,
        isSuspended: false,
        businessName: 'Test Shop',
        category: 'retail',
        registeredAt: 1700000000,
        totalVolume: '1000',
        txCount: 50,
        isLoading: false,
        refetch: jest.fn(),
      })
      
      ;(useProofScore as Mock).mockReturnValue({
        score: 7000,
        canMerchant: true,
        tier: 'TRUSTED',
      })
      
      ;(useSetAutoConvert as Mock).mockReturnValue({
        setAutoConvert: jest.fn(),
        isSetting: false,
        isSuccess: false,
      })
      
      ;(useSetPayoutAddress as Mock).mockReturnValue({
        setPayoutAddress: jest.fn(),
        isSetting: false,
        isSuccess: false,
      })
    })

    it('should display merchant dashboard for registered merchants', () => {
      render(<MerchantDashboard />)

      // Should not show registration flow
      expect(screen.queryByText('Become a Merchant')).not.toBeInTheDocument()
    })
    
    it('should show business name for merchants', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('Test Shop')).toBeInTheDocument()
    })
    
    it('should show total volume for merchants', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('1000')).toBeInTheDocument()
    })
    
    it('should show transaction count for merchants', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('50')).toBeInTheDocument()
    })
    
    it('should show formatted category name', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('Retail')).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    beforeEach(() => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 7000,
        canMerchant: true,
        tier: 'TRUSTED',
      })
    })

    it('should update business name on input', () => {
      render(<MerchantDashboard />)

      const input = screen.getByPlaceholderText(/Acme Coffee Shop/i)
      fireEvent.change(input, { target: { value: 'My Store' } })

      expect(input).toHaveValue('My Store')
    })
  })
})

describe('MerchantDashboard - Loading States', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    
    ;(useProofScore as Mock).mockReturnValue({
      score: 7000,
      canMerchant: true,
      tier: 'TRUSTED',
    })
  })

  it('should show loading state during registration', () => {
    ;(useIsMerchant as Mock).mockReturnValue({
      isMerchant: false,
      isLoading: false,
      merchantInfo: null,
    })
    
    ;(useRegisterMerchant as Mock).mockReturnValue({
      registerMerchant: jest.fn(),
      isRegistering: true,
      isSuccess: false,
      error: null,
    })
    
    ;(useSetAutoConvert as Mock).mockReturnValue({
      setAutoConvert: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })
    
    ;(useSetPayoutAddress as Mock).mockReturnValue({
      setPayoutAddress: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })

    render(<MerchantDashboard />)

    // Component should render without errors during registration
    expect(screen.getByText('Register Your Business')).toBeInTheDocument()
  })

  it('should handle successful registration', () => {
    ;(useIsMerchant as Mock).mockReturnValue({
      isMerchant: false,
      isLoading: false,
      merchantInfo: null,
    })
    
    ;(useRegisterMerchant as Mock).mockReturnValue({
      registerMerchant: jest.fn(),
      isRegistering: false,
      isSuccess: true,
      error: null,
    })
    
    ;(useSetAutoConvert as Mock).mockReturnValue({
      setAutoConvert: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })
    
    ;(useSetPayoutAddress as Mock).mockReturnValue({
      setPayoutAddress: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })

    render(<MerchantDashboard />)

    // Component should render with success state
    expect(screen.getByText('Register Your Business')).toBeInTheDocument()
  })
})
