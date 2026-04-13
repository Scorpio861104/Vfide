import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockSearchParams = new URLSearchParams()
const mockFetch = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
const mockCreateEscrow = jest.fn(async (_merchant: `0x${string}`, _amount: string, _orderId: string) => {})
const mockPayMerchant = jest.fn(async (_merchant: `0x${string}`, _token: `0x${string}`, _amount: string, _orderId: string) => {})
const mockShowToast = jest.fn()
const mockCopyWithId = jest.fn()

let mockAccountState = {
  isConnected: true,
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
}
let mockOwnerAddress = '0x1111111111111111111111111111111111111111'
let mockChainId = 84532
let mockBalance = { value: 100000000000000000n, decimals: 18 } as { value: bigint; decimals: number } | undefined

let mockVaultHubState: {
  vaultAddress?: `0x${string}`
  hasVault: boolean
  isLoadingVault: boolean
  createVault: () => Promise<void>
  isCreatingVault: boolean
}

let mockVaultRecoveryState: {
  recoveryStatus: {
    isActive: boolean
    proposedOwner: string | null
    approvals: number
    threshold: number
    expiryTime: number | null
    daysRemaining: number | null
  }
  guardianCount: number
  isUserGuardian: boolean
  isUserGuardianMature: boolean
  isWritePending: boolean
  requestRecovery: (_candidate: `0x${string}`) => Promise<void>
  approveRecovery: () => Promise<void>
  finalizeRecovery: () => Promise<void>
  cancelRecovery: () => Promise<void>
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), pathname: '/' }),
  usePathname: () => '/',
  useSearchParams: () => ({ get: (key: string) => mockSearchParams.get(key) }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => React.createElement('a', { href, ...props }, children),
}))

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => React.createElement('div', { 'data-testid': 'footer' }),
}))

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => React.createElement('button', null, 'Connect Wallet'),
}))

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
  useChainId: () => mockChainId,
  useBalance: () => ({ data: mockBalance }),
  useReadContract: ({ functionName }: { functionName?: string }) => {
    if (functionName === 'owner') return { data: mockOwnerAddress }
    if (functionName === 'totalSupply') return { data: 0n }
    return { data: false }
  },
  useWriteContract: () => ({ writeContract: jest.fn(), data: undefined, isPending: false }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: false }),
  useSignMessage: () => ({ signMessageAsync: jest.fn() }),
  usePublicClient: () => ({ readContract: jest.fn(), waitForTransactionReceipt: jest.fn() }),
}))

jest.mock('wagmi/chains', () => ({
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: { symbol: 'ETH' },
    rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
    blockExplorers: { default: { url: 'https://sepolia.basescan.org' } },
  },
}))

jest.mock('@/lib/testnet', () => ({
  CURRENT_CHAIN_ID: 84532,
  FAUCET_URLS: {
    coinbase: 'https://coinbase.example/faucet',
    alchemy: 'https://alchemy.example/faucet',
    quicknode: 'https://quicknode.example/faucet',
  },
}))

jest.mock('@/lib/chains', () => ({
  getChainByChainId: (chainId: number) => ({
    mainnet: { id: 8453, name: 'Base' },
    testnet: {
      id: chainId,
      name: 'Base Sepolia',
      nativeCurrency: { symbol: 'ETH' },
      rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
      blockExplorers: { default: { url: 'https://sepolia.basescan.org' } },
    },
  }),
}))

jest.mock('@/lib/validation', () => ({
  safeParseFloat: (value: string, fallback: number) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  },
  safeBigIntToNumber: () => 0,
  safeParseInt: (value: string, fallback: number) => {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  },
}))

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyWithId: () => ({ copiedId: null, copyWithId: mockCopyWithId }),
}))

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

jest.mock('@/lib/vfide-hooks', () => ({
  useVfidePrice: () => ({ priceUsd: 0.07, isLoading: false }),
  useEscrow: () => ({ createEscrow: mockCreateEscrow, loading: false, isSuccess: false, error: null }),
  usePayMerchant: () => ({ payMerchant: mockPayMerchant, isPaying: false, isSuccess: false, error: null }),
}))

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => mockVaultHubState,
}))

jest.mock('@/hooks/useVaultRecovery', () => ({
  useVaultRecovery: () => mockVaultRecoveryState,
}))

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: { VFIDEToken: '0x2222222222222222222222222222222222222222' },
  USER_VAULT_ABI: [],
  isCardBoundVaultMode: () => true,
}))

jest.mock('@/lib/recovery/guardianAttestation', () => ({
  buildGuardianAttestationMessage: () => 'guardian-attestation-message',
}))

jest.mock('viem', () => ({
  formatEther: () => '0',
  formatUnits: (value: bigint, decimals: number) => (Number(value) / 10 ** decimals).toString(),
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  verifyMessage: jest.fn(async () => true),
}))

jest.mock('framer-motion', () => {
  const passthrough = (tag: string) => ({ children, ...props }: any) => React.createElement(tag, props, children)
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => passthrough(prop),
      }
    ),
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  }
})

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => React.createElement('span', { className }, 'icon')
  return new Proxy({}, { get: () => Icon })
})

const renderAdminPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../app/admin/AdminDashboardClient')
  return render(React.createElement(pageModule.default))
}

const renderSetupPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../app/setup/page')
  return render(React.createElement(pageModule.default))
}

const renderPayPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../app/pay/page')
  return render(React.createElement(pageModule.default))
}

const renderGuardiansPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../app/guardians/page')
  return render(React.createElement(pageModule.default))
}

describe('App page behavior coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key)
    })

    mockAccountState = {
      isConnected: true,
      address: '0x1111111111111111111111111111111111111111',
    }
    mockOwnerAddress = '0x1111111111111111111111111111111111111111'
    mockChainId = 84532
    mockBalance = { value: 100000000000000000n, decimals: 18 }

    mockVaultHubState = {
      vaultAddress: '0x2222222222222222222222222222222222222222',
      hasVault: true,
      isLoadingVault: false,
      createVault: jest.fn(async () => {}),
      isCreatingVault: false,
    }

    mockVaultRecoveryState = {
      recoveryStatus: {
        isActive: false,
        proposedOwner: null,
        approvals: 0,
        threshold: 0,
        expiryTime: null,
        daysRemaining: null,
      },
      guardianCount: 2,
      isUserGuardian: false,
      isUserGuardianMature: false,
      isWritePending: false,
      requestRecovery: jest.fn(async () => {}),
      approveRecovery: jest.fn(async () => {}),
      finalizeRecovery: jest.fn(async () => {}),
      cancelRecovery: jest.fn(async () => {}),
    }

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    })

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ summary: {}, events: [], attestations: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('renders the admin wallet gate when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0x1111111111111111111111111111111111111111',
    }

    renderAdminPage()

    expect(screen.getByRole('heading', { name: /Admin Panel/i })).toBeTruthy()
    expect(screen.getByText(/Please connect your wallet to access admin functions/i)).toBeTruthy()
  })

  it('renders the setup completion state on the correct chain with balance', () => {
    renderSetupPage()

    expect(screen.getByRole('heading', { name: /^Setup$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Account/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Vault/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Security/i })).toBeTruthy()
  })

  it('blocks pay page checkout when QR signature is missing', async () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111')
    mockSearchParams.set('amount', '10')
    mockSearchParams.set('source', 'qr')
    mockSearchParams.set('settlement', 'instant')
    mockSearchParams.set('exp', String(Math.floor(Date.now() / 1000) + 600))

    renderPayPage()

    expect(screen.getByText('Amount (VFIDE)')).toBeTruthy()

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /QR signature required/i })
      expect(button.hasAttribute('disabled')).toBe(true)
    })
  })

  it('shows the Chain of Return vault gate when no vault exists', async () => {
    mockVaultHubState = {
      vaultAddress: undefined,
      hasVault: false,
      isLoadingVault: false,
      createVault: jest.fn(async () => {}),
      isCreatingVault: false,
    }

    renderGuardiansPage()
    fireEvent.click(screen.getByRole('tab', { name: /Chain of Return/i }))

    expect(await screen.findByText(/Create Vault First/i)).toBeTruthy()
    expect(screen.getByText(/Chain of Return requires an active vault/i)).toBeTruthy()
  })
})
