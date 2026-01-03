import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock providers
vi.mock('@rainbow-me/rainbowkit', () => ({
  RainbowKitProvider: ({ children }: any) => <div data-testid="rainbowkit">{children}</div>,
  darkTheme: () => ({}),
}))

vi.mock('@rainbow-me/rainbowkit/styles.css', () => ({}))

vi.mock('wagmi', () => ({
  WagmiProvider: ({ children }: any) => <div data-testid="wagmi">{children}</div>,
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class MockQueryClient { defaultOptions = {} },
  QueryClientProvider: ({ children }: any) => <div data-testid="query">{children}</div>,
}))

vi.mock('@/lib/wagmi', () => ({
  config: {},
}))

vi.mock('@/lib/chains', () => ({
  IS_TESTNET: true,
}))

vi.mock('wagmi/chains', () => ({
  base: { id: 8453 },
  baseSepolia: { id: 84532 },
}))

// Import after mocking
import { Web3Provider } from '@/components/wallet/Web3Provider'

describe('Web3Provider', () => {
  it('renders children', () => {
    render(
      <Web3Provider>
        <div data-testid="child">Content</div>
      </Web3Provider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('wraps with wagmi provider', () => {
    render(
      <Web3Provider>
        <span>Test</span>
      </Web3Provider>
    )
    expect(screen.getByTestId('wagmi')).toBeInTheDocument()
  })

  it('wraps with query provider', () => {
    render(
      <Web3Provider>
        <span>Test</span>
      </Web3Provider>
    )
    expect(screen.getByTestId('query')).toBeInTheDocument()
  })

  it('wraps with rainbowkit provider', () => {
    render(
      <Web3Provider>
        <span>Test</span>
      </Web3Provider>
    )
    expect(screen.getByTestId('rainbowkit')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <Web3Provider>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
      </Web3Provider>
    )
    expect(screen.getByTestId('child1')).toBeInTheDocument()
    expect(screen.getByTestId('child2')).toBeInTheDocument()
  })
})
