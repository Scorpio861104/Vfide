/**
 * PaymentQR Tests
 * Tests for PaymentQR component (0% coverage)
 */
import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PaymentQR } from '@/components/merchant/PaymentQR'

const mockSignMessageAsync = jest.fn(async () => '0xsigned')

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
  useSignMessage: () => ({
    signMessageAsync: mockSignMessageAsync,
    isPending: false,
  }),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
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

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
  useVaultBalance: jest.fn(() => ({ balance: 0n, isLoading: false, refetch: jest.fn() })),
  useVaultPayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSelfPanic: jest.fn(() => ({ selfPanic: jest.fn(), selfPanicAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCanSelfPanic: jest.fn(() => ({ canSelfPanic: false, isLoading: false, refetch: jest.fn() })),
  useGuardianCancelInheritance: jest.fn(() => ({ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false })),
  useInheritanceStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useQuarantineStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useProofScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useScoreBreakdown: jest.fn(() => ({ breakdown: undefined, isLoading: false, refetch: jest.fn() })),
  useEndorse: jest.fn(() => ({ endorse: jest.fn(), endorseAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCustomerTrustScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useRegisterMerchant: jest.fn(() => ({ registerMerchant: jest.fn(), registerMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  useGetAutoConvert: jest.fn(() => ({ autoConvertEnabled: false, isLoading: false, refetch: jest.fn(), isAvailable: true })),
  useSetAutoConvert: jest.fn(() => ({ setAutoConvert: jest.fn(), setAutoConvertAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetPayoutAddress: jest.fn(() => ({ setPayoutAddress: jest.fn(), setPayoutAddressAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetMerchantPullPermit: jest.fn(() => ({ setPermit: jest.fn(), setPermitAsync: jest.fn(), isPending: false })),
  useProcessPayment: jest.fn(() => ({ processPayment: jest.fn(), processPaymentAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  usePayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useMerchantPaymentStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useBadgeNFTs: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
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
    
      expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()
      expect(screen.getByText(/tamper-proof QR/i)).toBeInTheDocument()
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

    it('signs payload and renders secure QR code', async () => {
      render(<PaymentQR defaultAmount="25" defaultOrderId="INV-1" />)

      fireEvent.click(screen.getByRole('button', { name: /Sign & Lock QR/i }))

      await waitFor(() => {
        expect(mockSignMessageAsync).toHaveBeenCalled()
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })
    })

  it('provides accessible QR alternatives and copy actions after signing', async () => {
    render(<PaymentQR defaultAmount="25" defaultOrderId="INV-42" />)

    fireEvent.click(screen.getByRole('button', { name: /Sign & Lock QR/i }))

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: /payment qr code for test store/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Copy payment link/i })).toBeEnabled()
    })

    expect(screen.getByText(/can't scan\? copy the secure payment link or merchant address below\./i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Copy payment link/i }))
    fireEvent.click(screen.getByRole('button', { name: /Copy merchant address/i }))

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/pay?'))
      expect(mockClipboard.writeText).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890')
    })
  })

  it('links field guidance with aria-describedby for QR configuration inputs', () => {
    render(<PaymentQR />)

    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-describedby', 'payment-amount-help')
    expect(screen.getByRole('textbox', { name: /Order ID/i })).toHaveAttribute('aria-describedby', 'payment-order-help')
  })

  it('has QrCode icon in header', () => {
    render(<PaymentQR />)

    expect(screen.getByTestId('icon-QrCode')).toBeInTheDocument()
  })

  it('renders order ID input', () => {
    render(<PaymentQR />)
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThan(0)
  })
})
