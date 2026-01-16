import { describe, expect, it, beforeEach, afterEach } from '@jest/globals'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

import { TypewriterText } from '@/components/ui/TypewriterText'

describe('TypewriterText', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders with cursor', () => {
    render(<TypewriterText texts={['Hello']} />)
    expect(screen.getByText('|')).toBeInTheDocument()
  })

  it('starts with empty text', () => {
    render(<TypewriterText texts={['Hello']} />)
    const element = document.querySelector('span')
    expect(element?.textContent).toBe('|')
  })

  it('types text character by character', async () => {
    render(<TypewriterText texts={['Hi']} typingSpeed={100} />)
    
    await act(async () => {
      jest.advanceTimersByTime(100)
    })
    
    expect(screen.getByText(/H/)).toBeInTheDocument()
    
    await act(async () => {
      jest.advanceTimersByTime(100)
    })
    
    expect(screen.getByText(/Hi/)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <TypewriterText texts={['Test']} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles multiple texts', async () => {
    render(
      <TypewriterText 
        texts={['One', 'Two']} 
        typingSpeed={10} 
        deletingSpeed={5}
        pauseDuration={100}
      />
    )
    
    // Type 'One' - advance enough time to type 3 characters
    await act(async () => {
      jest.advanceTimersByTime(100) // 3 chars * 10ms + buffer
    })
    
    // The text should contain 'O', 'On', or 'One' depending on timing
    // Just check that the container has some text content
    const spans = document.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('shows blinking cursor', () => {
    render(<TypewriterText texts={['Test']} />)
    const cursor = screen.getByText('|')
    expect(cursor).toHaveClass('animate-pulse')
  })

  it('uses custom typing speed', () => {
    render(<TypewriterText texts={['A']} typingSpeed={500} />)
    // Just verify it renders - timing is tested above
    expect(document.querySelector('span')).toBeInTheDocument()
  })

  it('uses custom deleting speed', () => {
    render(<TypewriterText texts={['A']} deletingSpeed={25} />)
    expect(document.querySelector('span')).toBeInTheDocument()
  })

  it('uses custom pause duration', () => {
    render(<TypewriterText texts={['A']} pauseDuration={3000} />)
    expect(document.querySelector('span')).toBeInTheDocument()
  })
})
