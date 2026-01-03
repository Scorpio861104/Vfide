/**
 * Onboarding Components Tests
 * Tests for FeatureTooltip, GuardianWizard, OnboardingTour, BeginnerWizard
 * All have 0% coverage
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, ...props }: React.ComponentProps<'div'>) => (
      <div onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
    span: ({ children, ...props }: React.ComponentProps<'span'>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: true,
  }),
}))

// Mock hooks
vi.mock('@/hooks/useSimpleVault', () => ({
  useSimpleVault: () => ({
    executeVaultAction: vi.fn(),
    userMessage: '',
    actionStatus: 'idle',
  }),
}))

describe('GuardianWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with onClose prop', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    const mockOnClose = vi.fn()
    render(<GuardianWizard onClose={mockOnClose} />)
    
    expect(screen.getByText('What are Guardians?')).toBeInTheDocument()
  })

  it('shows step progress indicators', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={vi.fn()} />)
    
    // 4 steps in the wizard
    const progressBars = document.querySelectorAll('.h-2.flex-1.rounded-full')
    expect(progressBars.length).toBe(4)
  })

  it('has close button', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={vi.fn()} />)
    
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    const mockOnClose = vi.fn()
    render(<GuardianWizard onClose={mockOnClose} />)
    
    fireEvent.click(screen.getByText('×'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays first step description', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={vi.fn()} />)
    
    expect(screen.getByText(/Guardians are like trusted friends/i)).toBeInTheDocument()
  })
})

describe('OnboardingTour', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when autoStart is true', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={vi.fn()} autoStart={true} />)
    
    expect(screen.getByText('Welcome to VFIDE')).toBeInTheDocument()
  })

  it('does not render when autoStart is false', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={vi.fn()} autoStart={false} />)
    
    expect(screen.queryByText('Welcome to VFIDE')).not.toBeInTheDocument()
  })

  it('shows first step description', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={vi.fn()} autoStart={true} />)
    
    expect(screen.getByText(/take a quick tour/i)).toBeInTheDocument()
  })

  it('has Next button', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={vi.fn()} autoStart={true} />)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeInTheDocument()
  })

  it('advances to next step when Next clicked', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={vi.fn()} autoStart={true} />)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)
    
    // Should show step 2
    expect(screen.getByText('No Processor Fees')).toBeInTheDocument()
  })
})

describe('BeginnerWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders by default', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    render(<BeginnerWizard />)
    
    expect(screen.getByText('What is a wallet?')).toBeInTheDocument()
  })

  it('shows first step description', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    render(<BeginnerWizard />)
    
    expect(screen.getByText(/wallet is like your digital piggy bank/i)).toBeInTheDocument()
  })

  it('has close button', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    render(<BeginnerWizard />)
    
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('has step progress indicators', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    render(<BeginnerWizard />)
    
    // 5 steps in beginner wizard
    const progressBars = document.querySelectorAll('.h-2.flex-1.rounded-full')
    expect(progressBars.length).toBe(5)
  })

  it('closes wizard when X clicked', async () => {
    const { BeginnerWizard } = await import('@/components/onboarding/BeginnerWizard')
    const mockOnComplete = vi.fn()
    render(<BeginnerWizard onComplete={mockOnComplete} />)
    
    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)
    
    // Wizard should be closed
    expect(screen.queryByText('What is a wallet?')).not.toBeInTheDocument()
  })
})

describe('FeatureTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage
    const mockStorage: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockStorage[key] || null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockStorage[key] = value
    })
  })

  it('does not show when autoShow is false', async () => {
    const { FeatureTooltip } = await import('@/components/onboarding/FeatureTooltip')
    render(
      <FeatureTooltip
        id="test-tooltip"
        title="Hidden"
        description="Should not show"
        autoShow={false}
      />
    )
    
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('exports the component', async () => {
    const module = await import('@/components/onboarding/FeatureTooltip')
    
    expect(module.FeatureTooltip).toBeDefined()
  })
})
