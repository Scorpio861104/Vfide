/**
 * ParticleBackground Tests
 * Tests for ParticleBackground component (14% coverage)
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { render } from '@testing-library/react'
import { ParticleBackground } from '@/components/ui/ParticleBackground'

describe('ParticleBackground', () => {
  let mockContext: {
    clearRect: ReturnType<typeof jest.fn>
    beginPath: ReturnType<typeof jest.fn>
    arc: ReturnType<typeof jest.fn>
    fill: ReturnType<typeof jest.fn>
    moveTo: ReturnType<typeof jest.fn>
    lineTo: ReturnType<typeof jest.fn>
    stroke: ReturnType<typeof jest.fn>
    fillStyle: string
    strokeStyle: string
    lineWidth: number
  }

  beforeEach(() => {
    mockContext = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    }

    HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext as unknown as CanvasRenderingContext2D)
    
    // Mock requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return 1
    })
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders canvas element', () => {
    const { container } = render(<ParticleBackground />)
    
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('initializes canvas context', () => {
    render(<ParticleBackground />)
    
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d')
  })

  it('starts animation loop', () => {
    render(<ParticleBackground />)
    
    expect(window.requestAnimationFrame).toHaveBeenCalled()
  })

  it('clears canvas on draw', () => {
    render(<ParticleBackground />)
    
    // Context methods should have been called
    expect(mockContext.clearRect).toHaveBeenCalled()
  })

  it('cleans up animation on unmount', () => {
    const { unmount } = render(<ParticleBackground />)
    
    unmount()
    
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('handles window resize', () => {
    render(<ParticleBackground />)
    
    // Dispatch resize event
    window.dispatchEvent(new Event('resize'))
    
    // Canvas should be updated
    expect(mockContext.clearRect).toHaveBeenCalled()
  })

  it('draws particles', () => {
    render(<ParticleBackground />)
    
    // Should draw arc for particles
    expect(mockContext.beginPath).toHaveBeenCalled()
  })
})
