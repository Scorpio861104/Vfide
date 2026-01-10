import { render, screen } from '@testing-library/react'
import { ProgressSteps } from '../ProgressSteps'

const mockSteps = [
  { id: 1, title: 'Step 1', description: 'First step' },
  { id: 2, title: 'Step 2', description: 'Second step' },
  { id: 3, title: 'Step 3', description: 'Third step' },
]

describe('ProgressSteps', () => {
  it('renders all steps', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
    expect(screen.getByText('Step 3')).toBeInTheDocument()
  })

  it('shows step descriptions', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('First step')).toBeInTheDocument()
    expect(screen.getByText('Second step')).toBeInTheDocument()
    expect(screen.getByText('Third step')).toBeInTheDocument()
  })

  it('shows current step number', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={1} />)
    // Step 2 is current (index 1)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows check icon for completed steps', () => {
    const { container } = render(<ProgressSteps steps={mockSteps} currentStep={2} />)
    // First two steps should be completed and show check icons
    const checkIcons = container.querySelectorAll('.lucide-check')
    expect(checkIcons.length).toBe(2)
  })

  it('shows step numbers for non-completed steps', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ProgressSteps steps={mockSteps} currentStep={0} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders steps without descriptions', () => {
    const stepsWithoutDesc = [
      { id: 1, title: 'Step 1' },
      { id: 2, title: 'Step 2' },
    ]
    render(<ProgressSteps steps={stepsWithoutDesc} currentStep={0} />)
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('renders steps with string ids', () => {
    const stepsWithStringIds = [
      { id: 'first', title: 'First' },
      { id: 'second', title: 'Second' },
    ]
    render(<ProgressSteps steps={stepsWithStringIds} currentStep={0} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('renders connector lines between steps', () => {
    const { container } = render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    // Should have 2 connector lines for 3 steps
    const connectors = container.querySelectorAll('.h-0\\.5')
    expect(connectors.length).toBe(2)
  })

  it('completed step connector has correct color', () => {
    const { container } = render(<ProgressSteps steps={mockSteps} currentStep={2} />)
    const connectors = container.querySelectorAll('.bg-\\[\\#00F0FF\\]')
    // Completed connectors should have the cyan color
    expect(connectors.length).toBeGreaterThan(0)
  })

  it('renders single step', () => {
    const singleStep = [{ id: 1, title: 'Only Step' }]
    render(<ProgressSteps steps={singleStep} currentStep={0} />)
    expect(screen.getByText('Only Step')).toBeInTheDocument()
  })

  it('handles all steps completed', () => {
    const { container } = render(<ProgressSteps steps={mockSteps} currentStep={3} />)
    const checkIcons = container.querySelectorAll('.lucide-check')
    expect(checkIcons.length).toBe(3)
  })
})
