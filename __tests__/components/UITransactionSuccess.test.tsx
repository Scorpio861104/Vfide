import { describe, expect, it, vi, beforeEach, afterEach } from '@jest/globals'
import { render } from '@testing-library/react'
import React from 'react'

// Mock framer-motion comprehensively
jest.mock('framer-motion', () => {
  const createMotionComponent = (tag: string) => {
    return React.forwardRef(({ children, ...props }: any, ref: any) => {
      const Tag = tag as any
      return <Tag ref={ref} {...props}>{children}</Tag>
    })
  }
  
  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      h2: createMotionComponent('h2'),
      button: createMotionComponent('button'),
      p: createMotionComponent('p'),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  }
})

// Mock lucide icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <span>CheckIcon</span>,
  CheckCircle2: () => <span data-testid="check-icon">CheckIcon</span>,
  Loader2: () => <span>LoaderIcon</span>,
  XCircle: () => <span>XCircleIcon</span>,
  ExternalLink: () => <span>ExternalLinkIcon</span>,
  Copy: () => <span>CopyIcon</span>,
  PartyPopper: () => <span>PartyIcon</span>,
  X: () => <span data-testid="x-icon">XIcon</span>,
  Share2: () => <span data-testid="share-icon">ShareIcon</span>,
  Trophy: () => <span>TrophyIcon</span>,
  Sparkles: () => <span>SparklesIcon</span>,
}))

// Import after mocking
import { TransactionSuccess } from '@/components/ui/TransactionSuccess'

describe('TransactionSuccess', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    vi.stubGlobal('open', jest.fn())
  })

  afterEach(() => {
    jest.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <TransactionSuccess isOpen={false} onClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders when open', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with payment type', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} type="payment" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with vote type', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} type="vote" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with stake type', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} type="stake" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with badge type', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} type="badge" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with escrow type', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} type="escrow" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with amount', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} amount="100 VFIDE" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with scoreIncrease', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} scoreIncrease={10} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with badgeUnlocked', () => {
    const { container } = render(<TransactionSuccess isOpen={true} onClose={() => {}} badgeUnlocked="Pioneer" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('calls onClose after timeout', () => {
    const onClose = jest.fn()
    render(<TransactionSuccess isOpen={true} onClose={onClose} />)
    jest.advanceTimersByTime(5000)
    expect(onClose).toHaveBeenCalled()
  })
})
