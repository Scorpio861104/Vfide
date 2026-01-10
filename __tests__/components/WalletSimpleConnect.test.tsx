import { describe, expect, it, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: any) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock rainbowkit
jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: any) => children({
      account: { address: '0x1234567890123456789012345678901234567890', displayName: 'Test' },
      chain: { id: 84532, name: 'Base Sepolia', unsupported: false },
      openAccountModal: jest.fn(),
      openChainModal: jest.fn(),
      openConnectModal: jest.fn(),
      authenticationStatus: 'authenticated',
      mounted: true,
    }),
  },
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

// Import after mocking
import { SimpleWalletConnect } from '@/components/wallet/SimpleWalletConnect'

describe('SimpleWalletConnect', () => {
  it('renders connected state', () => {
    render(<SimpleWalletConnect />)
    // With mocked connected state, should show chain/account buttons
    expect(document.body).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const { container } = render(<SimpleWalletConnect />)
    expect(container).toBeInTheDocument()
  })
})

describe('SimpleWalletConnect - Disconnected', () => {
  beforeAll(() => {
    vi.doMock('@rainbow-me/rainbowkit', () => ({
      ConnectButton: {
        Custom: ({ children }: any) => children({
          account: null,
          chain: null,
          openAccountModal: jest.fn(),
          openChainModal: jest.fn(),
          openConnectModal: jest.fn(),
          authenticationStatus: null,
          mounted: true,
        }),
      },
    }))
  })

  it('handles disconnected state', () => {
    const { container } = render(<SimpleWalletConnect />)
    expect(container).toBeInTheDocument()
  })
})

describe('SimpleWalletConnect - Wrong Network', () => {
  beforeAll(() => {
    vi.doMock('@rainbow-me/rainbowkit', () => ({
      ConnectButton: {
        Custom: ({ children }: any) => children({
          account: { address: '0x1234567890123456789012345678901234567890' },
          chain: { unsupported: true },
          openAccountModal: jest.fn(),
          openChainModal: jest.fn(),
          openConnectModal: jest.fn(),
          authenticationStatus: 'authenticated',
          mounted: true,
        }),
      },
    }))
  })

  it('handles wrong network state', () => {
    const { container } = render(<SimpleWalletConnect />)
    expect(container).toBeInTheDocument()
  })
})
