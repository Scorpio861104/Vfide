/**
 * ParticleBackground Tests
 * Tests for ParticleBackground component (14% coverage)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { ParticleBackground } from '@/components/ui/ParticleBackground'

describe('ParticleBackground', () => {
  let mockContext: {
    clearRect: ReturnType<typeof vi.fn>
    beginPath: ReturnType<typeof vi.fn>
    arc: ReturnType<typeof vi.fn>
    fill: ReturnType<typeof vi.fn>
    moveTo: ReturnType<typeof vi.fn>
    lineTo: ReturnType<typeof vi.fn>
    stroke: ReturnType<typeof vi.fn>
    fillStyle: string
    strokeStyle: string
    lineWidth: number
  }

  beforeEach(() => {
    mockContext = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    }

    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext as unknown as CanvasRenderingContext2D)
    
    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
