import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
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
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
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
})),
  useReadContract: jest.fn(({ functionName }: { functionName: string }) => {
    if (functionName === 'isCouncilMember') {
      return { data: true }
    }
    if (functionName === 'canServeNextTerm') {
      return { data: [true, 2, BigInt(0)] }
    }
    return { data: null }
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
})),
  usePathname: jest.fn(() => '/dao-hub'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    }
  ),
}))

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    CouncilElection: '0x1111111111111111111111111111111111111111',
  },

  getContractAddresses: () => ({}),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr: any) => addr),
}))

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}))

import DaoHubPage from '../page'

describe('DaoHubPage', () => {
  it('renders the DAO hub header', () => {
    render(<DaoHubPage />)
    expect(screen.getByText('DAO Hub')).toBeInTheDocument()
    expect(screen.getByText('Decentralized governance center')).toBeInTheDocument()
  })

  it('shows default tabs and overview content shell', () => {
    render(<DaoHubPage />)
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Proposals' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Treasury' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Members' })).toBeInTheDocument()
  })
})
