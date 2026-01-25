import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Check: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'check-icon' }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: React.PropsWithChildren<{ className?: string; style?: object }>) =>
      React.createElement('div', { className, style, ...props }, children),
  },
}))

import { ProgressSteps } from '@/components/ui/ProgressSteps'

describe('ProgressSteps', () => {
  const mockSteps = [
    { id: 1, title: 'Step 1', description: 'First step' },
    { id: 2, title: 'Step 2', description: 'Second step' },
    { id: 3, title: 'Step 3', description: 'Third step' },
  ]

  it('renders all steps', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
    expect(screen.getByText('Step 3')).toBeInTheDocument()
  })

  it('shows step numbers', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows check icon for completed steps', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={2} />)
    // Steps 0 and 1 are completed (currentStep is 2)
    const checkIcons = screen.getAllByTestId('check-icon')
    expect(checkIcons.length).toBe(2)
  })

  it('applies custom className', () => {
    const { container } = render(
      <ProgressSteps steps={mockSteps} currentStep={0} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('highlights current step', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={1} />)
    // Current step (Step 2) should have zinc-100 color
    const step2 = screen.getByText('Step 2')
    expect(step2.className).toContain('text-zinc-100')
  })

  it('renders step descriptions when provided', () => {
    render(<ProgressSteps steps={mockSteps} currentStep={0} />)
    expect(screen.getByText('First step')).toBeInTheDocument()
  })

  it('handles steps without descriptions', () => {
    const stepsNoDesc = [
      { id: 1, title: 'Step 1' },
      { id: 2, title: 'Step 2' },
    ]
    render(<ProgressSteps steps={stepsNoDesc} currentStep={0} />)
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('handles string step IDs', () => {
    const stepsStringId = [
      { id: 'first', title: 'First' },
      { id: 'second', title: 'Second' },
    ]
    render(<ProgressSteps steps={stepsStringId} currentStep={0} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })
})
