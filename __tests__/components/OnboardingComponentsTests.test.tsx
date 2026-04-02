/**
 * Onboarding Components Tests
 * Tests for FeatureTooltip, GuardianWizard, OnboardingTour, BeginnerWizard
 * All have 0% coverage
 */
import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
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
  useReducedMotion: () => false,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: true,
  }),
  useChainId: () => 84532,
  useWriteContract: () => ({ writeContractAsync: jest.fn(), isPending: false }),
  useReadContract: () => ({ data: undefined, isLoading: false }),
}))

// Mock hooks
jest.mock('@/hooks/useSimpleVault', () => ({
  useSimpleVault: () => ({
    executeVaultAction: jest.fn(),
    userMessage: '',
    actionStatus: 'idle',
  }),
}))

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => ({
    vaultAddress: '0x1234567890123456789012345678901234567890' as const,
    hasVault: true,
  }),
}))

describe('GuardianWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with onClose prop', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    const mockOnClose = jest.fn()
    render(<GuardianWizard onClose={mockOnClose} />)
    
    expect(screen.getByText('What are Guardians?')).toBeInTheDocument()
  })

  it('shows step progress indicators', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={jest.fn()} />)
    
    // 4 steps in the wizard
    const progressBars = document.querySelectorAll('.h-2.flex-1.rounded-full')
    expect(progressBars.length).toBe(4)
  })

  it('has close button', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={jest.fn()} />)
    
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    const mockOnClose = jest.fn()
    render(<GuardianWizard onClose={mockOnClose} />)
    
    fireEvent.click(screen.getByText('×'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays first step description', async () => {
    const { GuardianWizard } = await import('@/components/onboarding/GuardianWizard')
    render(<GuardianWizard onClose={jest.fn()} />)
    
    expect(screen.getByText(/Guardians are like trusted friends/i)).toBeInTheDocument()
  })
})

describe('OnboardingTour', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when autoStart is true', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={true} />)
    
    expect(screen.getByText('Welcome to VFIDE')).toBeInTheDocument()
  })

  it('does not render when autoStart is false', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={false} />)
    
    expect(screen.queryByText('Welcome to VFIDE')).not.toBeInTheDocument()
  })

  it('shows first step description', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={true} />)
    
    expect(screen.getByText(/take a quick tour/i)).toBeInTheDocument()
  })

  it('has Next button', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={true} />)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeInTheDocument()
  })

  it('advances to next step when Next clicked', async () => {
    const { OnboardingTour } = await import('@/components/onboarding/OnboardingTour')
    render(<OnboardingTour onComplete={jest.fn()} autoStart={true} />)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)
    
    // Should show step 2
    expect(screen.getByText('No Processor Fees')).toBeInTheDocument()
  })
})

describe('BeginnerWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
    const mockOnComplete = jest.fn()
    render(<BeginnerWizard onComplete={mockOnComplete} />)
    
    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)
    
    // Wizard should be closed
    expect(screen.queryByText('What is a wallet?')).not.toBeInTheDocument()
  })
})

describe('FeatureTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock localStorage
    const mockStorage: Record<string, string> = {}
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => mockStorage[key] || null)
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
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
