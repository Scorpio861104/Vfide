/**
 * Tests for OnboardingManager component
 * Controls when the onboarding tour is shown
 */
import { describe, expect, it, vi, beforeEach, afterEach } from '@jest/globals'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// Mock OnboardingTour
jest.mock('@/components/onboarding/OnboardingTour', () => ({
  OnboardingTour: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="onboarding-tour">
      <button onClick={onComplete} data-testid="complete-tour">Complete Tour</button>
    </div>
  ),
}))

describe('OnboardingManager', () => {
  let windowWithTour: any

  beforeEach(() => {
    jest.clearAllMocks()
    windowWithTour = window as any
    delete windowWithTour.startVFIDETour
  })

  afterEach(() => {
    delete windowWithTour.startVFIDETour
  })

  it('should not show tour initially', async () => {
    const { OnboardingManager } = await import('@/components/onboarding/OnboardingManager')
    render(<OnboardingManager />)
    
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument()
  })

  it('should register global startVFIDETour function', async () => {
    const { OnboardingManager } = await import('@/components/onboarding/OnboardingManager')
    render(<OnboardingManager />)
    
    expect(typeof windowWithTour.startVFIDETour).toBe('function')
  })

  it('should show tour when startVFIDETour is called', async () => {
    const { OnboardingManager } = await import('@/components/onboarding/OnboardingManager')
    render(<OnboardingManager />)
    
    // Initially no tour
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument()
    
    // Trigger tour via global function
    await act(async () => {
      windowWithTour.startVFIDETour()
    })
    
    // Tour should now be visible
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()
  })

  it('should hide tour when onComplete is called', async () => {
    const { OnboardingManager } = await import('@/components/onboarding/OnboardingManager')
    render(<OnboardingManager />)
    
    // Show tour
    await act(async () => {
      windowWithTour.startVFIDETour()
    })
    
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()
    
    // Complete tour
    const completeButton = screen.getByTestId('complete-tour')
    await act(async () => {
      completeButton.click()
    })
    
    // Tour should be hidden
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument()
  })

  it('should clean up global function on unmount', async () => {
    const { OnboardingManager } = await import('@/components/onboarding/OnboardingManager')
    const { unmount } = render(<OnboardingManager />)
    
    expect(typeof windowWithTour.startVFIDETour).toBe('function')
    
    unmount()
    
    expect(windowWithTour.startVFIDETour).toBeUndefined()
  })

  it('should allow restarting tour after completion', async () => {
    const { OnboardingManager } = await import('@/components/onboarding/OnboardingManager')
    render(<OnboardingManager />)
    
    // Start tour
    await act(async () => {
      windowWithTour.startVFIDETour()
    })
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()
    
    // Complete tour
    const completeButton = screen.getByTestId('complete-tour')
    await act(async () => {
      completeButton.click()
    })
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument()
    
    // Start again
    await act(async () => {
      windowWithTour.startVFIDETour()
    })
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()
  })

  it('should return null when tour is not shown', async () => {
    const { OnboardingManager } = await import('@/components/onboarding/OnboardingManager')
    const { container } = render(<OnboardingManager />)
    
    // Component should render nothing
    expect(container.firstChild).toBeNull()
  })

  it('should render OnboardingTour when tour is active', async () => {
    const { OnboardingManager } = await import('@/components/onboarding/OnboardingManager')
    render(<OnboardingManager />)
    
    await act(async () => {
      windowWithTour.startVFIDETour()
    })
    
    // Should render the tour component
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()
    expect(screen.getByTestId('complete-tour')).toBeInTheDocument()
  })
})
