import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
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
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    main: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <main {...props}>{children}</main>,
    section: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <section {...props}>{children}</section>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
  },
}))

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    CouncilElection: '0x1111111111111111111111111111111111111111',
  },
}))

import DaoHubPage from '../page'

describe('DaoHubPage', () => {
  it('renders the DAO hub header', () => {
    render(<DaoHubPage />)
    expect(screen.getByText('DAO Operations Hub')).toBeInTheDocument()
    expect(screen.getByText('DAO Members Only')).toBeInTheDocument()
  })

  it('shows active dispute and messaging sections for members', () => {
    render(<DaoHubPage />)
    expect(screen.getByText('Active Disputes')).toBeInTheDocument()
    expect(screen.getByText('DAO Messages')).toBeInTheDocument()
  })
})
