/**
 * Real Onboarding Component Tests
 * Tests for actual onboarding components with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from '@jest/globals'
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

// Mock BeginnerWizard
jest.mock('@/components/onboarding/BeginnerWizard', () => ({
  BeginnerWizard: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="beginner-wizard">
      <button onClick={onComplete} data-testid="complete-beginner">Complete Beginner</button>
    </div>
  ),
}))

// Mock OnboardingFlow (Provider just renders children; Trigger renders nothing)
jest.mock('@/components/onboarding/OnboardingFlow', () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OnboardingTrigger: () => null,
}))

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: false }),
}))

// Mock safeLocalStorage so we control new-user vs returning-user scenarios
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  safeLocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}))

import { safeLocalStorage } from '@/lib/utils'
import { OnboardingManager } from '@/components/onboarding/OnboardingManager'

describe('OnboardingManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: returning user (tour already seen)
    ;(safeLocalStorage.getItem as jest.Mock).mockReturnValue('true')
  })

  describe('Initial State', () => {
    it('should not show tour by default for a returning user', () => {
      render(<OnboardingManager />)

      expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument()
    })

    it('should return null when tour is not active', () => {
      const { container } = render(<OnboardingManager />)

      expect(container.firstChild).toBeNull()
    })

    it('should auto-start tour for a new user', () => {
      // Simulate first-time visitor
      ;(safeLocalStorage.getItem as jest.Mock).mockReturnValue(null)
      render(<OnboardingManager />)

      expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument()
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
