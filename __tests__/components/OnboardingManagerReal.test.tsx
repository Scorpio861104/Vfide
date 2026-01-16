/**
 * Real Onboarding Component Tests
 * Tests for actual onboarding components with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

// Mock the OnboardingTour component to avoid complex nested dependencies
jest.mock('@/components/onboarding/OnboardingTour', () => ({
  OnboardingTour: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="onboarding-tour">
      <button onClick={onComplete} data-testid="complete-tour">Complete Tour</button>
    </div>
  ),
}))

import { OnboardingManager } from '@/components/onboarding/OnboardingManager'

describe('OnboardingManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should not show tour by default', () => {
      render(<OnboardingManager />)

      expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument()
    })

    it('should return null when tour is not active', () => {
      const { container } = render(<OnboardingManager />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Global Function', () => {
    afterEach(() => {
      // Clean up the global function
      delete (window as unknown as { startVFIDETour?: () => void }).startVFIDETour
    })

    it('should expose startVFIDETour global function', () => {
      render(<OnboardingManager />)

      expect(typeof (window as unknown as { startVFIDETour?: () => void }).startVFIDETour).toBe('function')
    })

    it('should show tour when startVFIDETour is called', () => {
      render(<OnboardingManager />)

      act(() => {
        ;(window as unknown as { startVFIDETour?: () => void }).startVFIDETour?.()
      })

      expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()
    })

    it('should remove global function on unmount', () => {
      const { unmount } = render(<OnboardingManager />)

      // Function should exist while mounted
      expect(typeof (window as unknown as { startVFIDETour?: () => void }).startVFIDETour).toBe('function')

      unmount()

      // Function should be removed after unmount
      expect((window as unknown as { startVFIDETour?: () => void }).startVFIDETour).toBeUndefined()
    })
  })

  describe('Tour Completion', () => {
    it('should hide tour when complete callback is triggered', () => {
      render(<OnboardingManager />)

      // Start the tour
      act(() => {
        ;(window as unknown as { startVFIDETour?: () => void }).startVFIDETour?.()
      })

      expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()

      // Complete the tour
      act(() => {
        screen.getByTestId('complete-tour').click()
      })

      expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument()
    })
  })
})
