/**
 * Onboarding Component Tests
 * Tests for onboarding wizard and help components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronRight: () => <span data-testid="chevron-right" />,
  ChevronLeft: () => <span data-testid="chevron-left" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
  HelpCircle: () => <span data-testid="help-circle" />,
  BookOpen: () => <span data-testid="book-open" />,
  Play: () => <span data-testid="play-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
  Wallet: () => <span data-testid="wallet-icon" />,
  Users: () => <span data-testid="users-icon" />,
  Award: () => <span data-testid="award-icon" />,
  Info: () => <span data-testid="info-icon" />,
}))

// Test Setup Wizard pattern
describe('SetupWizard Pattern', () => {
  interface WizardStep {
    id: string
    title: string
    description: string
    completed: boolean
  }

  function SetupWizard({ 
    steps, 
    currentStep, 
    onStepChange,
    onComplete 
  }: { 
    steps: WizardStep[]
    currentStep: number
    onStepChange: (step: number) => void
    onComplete: () => void
  }) {
    const step = steps[currentStep]
    const isLastStep = currentStep === steps.length - 1

    return (
      <div data-testid="setup-wizard">
        <div data-testid="step-indicator">
          {steps.map((s, idx) => (
            <div 
              key={s.id}
              data-testid={`step-${idx}`}
              className={idx === currentStep ? 'active' : idx < currentStep ? 'completed' : ''}
            >
              {s.completed ? <span data-testid="check-icon" /> : idx + 1}
            </div>
          ))}
        </div>
        <div data-testid="step-content">
          <h2 data-testid="step-title">{step.title}</h2>
          <p data-testid="step-description">{step.description}</p>
        </div>
        <div data-testid="step-actions">
          {currentStep > 0 && (
            <button data-testid="prev-button" onClick={() => onStepChange(currentStep - 1)}>
              Previous
            </button>
          )}
          {isLastStep ? (
            <button data-testid="complete-button" onClick={onComplete}>
              Complete Setup
            </button>
          ) : (
            <button data-testid="next-button" onClick={() => onStepChange(currentStep + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    )
  }

  const mockSteps: WizardStep[] = [
    { id: '1', title: 'Connect Wallet', description: 'Connect your wallet to get started', completed: true },
    { id: '2', title: 'Create Vault', description: 'Set up your secure vault', completed: false },
    { id: '3', title: 'Add Guardian', description: 'Add a trusted guardian', completed: false },
  ]

  it('renders step indicator', () => {
    render(<SetupWizard steps={mockSteps} currentStep={0} onStepChange={() => {}} onComplete={() => {}} />)
    expect(screen.getByTestId('step-0')).toBeInTheDocument()
    expect(screen.getByTestId('step-1')).toBeInTheDocument()
    expect(screen.getByTestId('step-2')).toBeInTheDocument()
  })

  it('displays current step title', () => {
    render(<SetupWizard steps={mockSteps} currentStep={1} onStepChange={() => {}} onComplete={() => {}} />)
    expect(screen.getByTestId('step-title')).toHaveTextContent('Create Vault')
  })

  it('displays current step description', () => {
    render(<SetupWizard steps={mockSteps} currentStep={1} onStepChange={() => {}} onComplete={() => {}} />)
    expect(screen.getByTestId('step-description')).toHaveTextContent('Set up your secure vault')
  })

  it('hides previous button on first step', () => {
    render(<SetupWizard steps={mockSteps} currentStep={0} onStepChange={() => {}} onComplete={() => {}} />)
    expect(screen.queryByTestId('prev-button')).not.toBeInTheDocument()
  })

  it('shows previous button after first step', () => {
    render(<SetupWizard steps={mockSteps} currentStep={1} onStepChange={() => {}} onComplete={() => {}} />)
    expect(screen.getByTestId('prev-button')).toBeInTheDocument()
  })

  it('shows complete button on last step', () => {
    render(<SetupWizard steps={mockSteps} currentStep={2} onStepChange={() => {}} onComplete={() => {}} />)
    expect(screen.getByTestId('complete-button')).toBeInTheDocument()
  })

  it('shows next button before last step', () => {
    render(<SetupWizard steps={mockSteps} currentStep={0} onStepChange={() => {}} onComplete={() => {}} />)
    expect(screen.getByTestId('next-button')).toBeInTheDocument()
  })

  it('calls onStepChange when next clicked', () => {
    const onStepChange = vi.fn()
    render(<SetupWizard steps={mockSteps} currentStep={0} onStepChange={onStepChange} onComplete={() => {}} />)
    fireEvent.click(screen.getByTestId('next-button'))
    expect(onStepChange).toHaveBeenCalledWith(1)
  })

  it('calls onComplete when complete clicked', () => {
    const onComplete = vi.fn()
    render(<SetupWizard steps={mockSteps} currentStep={2} onStepChange={() => {}} onComplete={onComplete} />)
    fireEvent.click(screen.getByTestId('complete-button'))
    expect(onComplete).toHaveBeenCalled()
  })
})

// Test Help Center pattern
describe('HelpCenter Pattern', () => {
  interface HelpTopic {
    id: string
    title: string
    content: string
    category: string
  }

  function HelpCenter({ topics, onTopicSelect }: { topics: HelpTopic[]; onTopicSelect: (id: string) => void }) {
    const categories = [...new Set(topics.map(t => t.category))]

    return (
      <div data-testid="help-center">
        <h2 data-testid="help-title">Help Center</h2>
        <input data-testid="help-search" placeholder="Search help topics..." />
        <div data-testid="help-categories">
          {categories.map(cat => (
            <div key={cat} data-testid={`category-${cat}`}>
              <h3 data-testid="category-title">{cat}</h3>
              {topics.filter(t => t.category === cat).map(topic => (
                <button 
                  key={topic.id} 
                  data-testid={`topic-${topic.id}`}
                  onClick={() => onTopicSelect(topic.id)}
                >
                  {topic.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const mockTopics: HelpTopic[] = [
    { id: '1', title: 'Getting Started', content: 'Welcome to VFIDE...', category: 'Basics' },
    { id: '2', title: 'Creating a Vault', content: 'To create a vault...', category: 'Vaults' },
    { id: '3', title: 'Adding Guardians', content: 'Guardians can...', category: 'Security' },
  ]

  it('renders help center title', () => {
    render(<HelpCenter topics={mockTopics} onTopicSelect={() => {}} />)
    expect(screen.getByTestId('help-title')).toHaveTextContent('Help Center')
  })

  it('has search input', () => {
    render(<HelpCenter topics={mockTopics} onTopicSelect={() => {}} />)
    expect(screen.getByTestId('help-search')).toBeInTheDocument()
  })

  it('renders categories', () => {
    render(<HelpCenter topics={mockTopics} onTopicSelect={() => {}} />)
    expect(screen.getByTestId('category-Basics')).toBeInTheDocument()
    expect(screen.getByTestId('category-Vaults')).toBeInTheDocument()
    expect(screen.getByTestId('category-Security')).toBeInTheDocument()
  })

  it('renders topics', () => {
    render(<HelpCenter topics={mockTopics} onTopicSelect={() => {}} />)
    expect(screen.getByTestId('topic-1')).toHaveTextContent('Getting Started')
    expect(screen.getByTestId('topic-2')).toHaveTextContent('Creating a Vault')
  })

  it('calls onTopicSelect when topic clicked', () => {
    const onTopicSelect = vi.fn()
    render(<HelpCenter topics={mockTopics} onTopicSelect={onTopicSelect} />)
    fireEvent.click(screen.getByTestId('topic-1'))
    expect(onTopicSelect).toHaveBeenCalledWith('1')
  })
})

// Test Feature Tooltip pattern
describe('FeatureTooltip Pattern', () => {
  function FeatureTooltip({ 
    title, 
    description, 
    isVisible,
    onDismiss,
    position = 'bottom' 
  }: { 
    title: string
    description: string
    isVisible: boolean
    onDismiss: () => void
    position?: 'top' | 'bottom' | 'left' | 'right'
  }) {
    if (!isVisible) return null

    return (
      <div data-testid="feature-tooltip" data-position={position}>
        <div data-testid="tooltip-arrow" />
        <h4 data-testid="tooltip-title">{title}</h4>
        <p data-testid="tooltip-description">{description}</p>
        <button data-testid="tooltip-dismiss" onClick={onDismiss}>
          Got it
        </button>
      </div>
    )
  }

  it('does not render when not visible', () => {
    render(
      <FeatureTooltip 
        title="New Feature" 
        description="Check out this new feature"
        isVisible={false}
        onDismiss={() => {}}
      />
    )
    expect(screen.queryByTestId('feature-tooltip')).not.toBeInTheDocument()
  })

  it('renders when visible', () => {
    render(
      <FeatureTooltip 
        title="New Feature" 
        description="Check out this new feature"
        isVisible={true}
        onDismiss={() => {}}
      />
    )
    expect(screen.getByTestId('feature-tooltip')).toBeInTheDocument()
  })

  it('displays title', () => {
    render(
      <FeatureTooltip 
        title="New Feature" 
        description="Check out this new feature"
        isVisible={true}
        onDismiss={() => {}}
      />
    )
    expect(screen.getByTestId('tooltip-title')).toHaveTextContent('New Feature')
  })

  it('displays description', () => {
    render(
      <FeatureTooltip 
        title="New Feature" 
        description="Check out this new feature"
        isVisible={true}
        onDismiss={() => {}}
      />
    )
    expect(screen.getByTestId('tooltip-description')).toHaveTextContent('Check out this new feature')
  })

  it('calls onDismiss when dismiss clicked', () => {
    const onDismiss = vi.fn()
    render(
      <FeatureTooltip 
        title="New Feature" 
        description="Check out this new feature"
        isVisible={true}
        onDismiss={onDismiss}
      />
    )
    fireEvent.click(screen.getByTestId('tooltip-dismiss'))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('supports position prop', () => {
    render(
      <FeatureTooltip 
        title="New Feature" 
        description="Check out this new feature"
        isVisible={true}
        onDismiss={() => {}}
        position="top"
      />
    )
    expect(screen.getByTestId('feature-tooltip')).toHaveAttribute('data-position', 'top')
  })
})

// Test Onboarding Tour pattern
describe('OnboardingTour Pattern', () => {
  interface TourStop {
    id: string
    target: string
    title: string
    content: string
  }

  function OnboardingTour({ 
    stops, 
    currentStop, 
    isActive,
    onNext,
    onSkip,
    onComplete 
  }: { 
    stops: TourStop[]
    currentStop: number
    isActive: boolean
    onNext: () => void
    onSkip: () => void
    onComplete: () => void
  }) {
    if (!isActive) return null

    const stop = stops[currentStop]
    const isLastStop = currentStop === stops.length - 1

    return (
      <div data-testid="onboarding-tour">
        <div data-testid="tour-overlay" />
        <div data-testid="tour-popup">
          <div data-testid="tour-progress">
            Step {currentStop + 1} of {stops.length}
          </div>
          <h3 data-testid="tour-title">{stop.title}</h3>
          <p data-testid="tour-content">{stop.content}</p>
          <div data-testid="tour-actions">
            <button data-testid="skip-button" onClick={onSkip}>Skip Tour</button>
            {isLastStop ? (
              <button data-testid="finish-button" onClick={onComplete}>Finish</button>
            ) : (
              <button data-testid="next-button" onClick={onNext}>Next</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const mockStops: TourStop[] = [
    { id: '1', target: '#dashboard', title: 'Dashboard', content: 'This is your main dashboard' },
    { id: '2', target: '#vault', title: 'Your Vault', content: 'Manage your vault here' },
    { id: '3', target: '#profile', title: 'Profile', content: 'View your ProofScore' },
  ]

  it('does not render when not active', () => {
    render(
      <OnboardingTour 
        stops={mockStops} 
        currentStop={0} 
        isActive={false}
        onNext={() => {}}
        onSkip={() => {}}
        onComplete={() => {}}
      />
    )
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument()
  })

  it('renders when active', () => {
    render(
      <OnboardingTour 
        stops={mockStops} 
        currentStop={0} 
        isActive={true}
        onNext={() => {}}
        onSkip={() => {}}
        onComplete={() => {}}
      />
    )
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()
  })

  it('shows progress', () => {
    render(
      <OnboardingTour 
        stops={mockStops} 
        currentStop={1} 
        isActive={true}
        onNext={() => {}}
        onSkip={() => {}}
        onComplete={() => {}}
      />
    )
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('Step 2 of 3')
  })

  it('shows current stop title', () => {
    render(
      <OnboardingTour 
        stops={mockStops} 
        currentStop={1} 
        isActive={true}
        onNext={() => {}}
        onSkip={() => {}}
        onComplete={() => {}}
      />
    )
    expect(screen.getByTestId('tour-title')).toHaveTextContent('Your Vault')
  })

  it('shows finish button on last stop', () => {
    render(
      <OnboardingTour 
        stops={mockStops} 
        currentStop={2} 
        isActive={true}
        onNext={() => {}}
        onSkip={() => {}}
        onComplete={() => {}}
      />
    )
    expect(screen.getByTestId('finish-button')).toBeInTheDocument()
  })

  it('calls onSkip when skip clicked', () => {
    const onSkip = vi.fn()
    render(
      <OnboardingTour 
        stops={mockStops} 
        currentStop={0} 
        isActive={true}
        onNext={() => {}}
        onSkip={onSkip}
        onComplete={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('skip-button'))
    expect(onSkip).toHaveBeenCalled()
  })
})
