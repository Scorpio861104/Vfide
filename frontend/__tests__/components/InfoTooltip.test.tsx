import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

describe('InfoTooltip', () => {
  it('renders the trigger button', () => {
    render(<InfoTooltip content="Test content" />)
    const button = screen.getByRole('button', { name: /more information/i })
    expect(button).toBeInTheDocument()
  })

  it('shows default "?" icon', () => {
    render(<InfoTooltip content="Test content" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders custom children in button', () => {
    render(<InfoTooltip content="Test content">i</InfoTooltip>)
    expect(screen.getByText('i')).toBeInTheDocument()
  })

  it('shows tooltip on hover', () => {
    render(<InfoTooltip content="Tooltip text" />)
    const button = screen.getByRole('button')
    
    fireEvent.mouseEnter(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Tooltip text')).toBeInTheDocument()
  })

  it('hides tooltip on mouse leave', () => {
    render(<InfoTooltip content="Tooltip text" />)
    const button = screen.getByRole('button')
    
    fireEvent.mouseEnter(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    
    fireEvent.mouseLeave(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toggles tooltip on click', () => {
    render(<InfoTooltip content="Tooltip text" />)
    const button = screen.getByRole('button')
    
    fireEvent.click(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    
    fireEvent.click(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('applies top position by default', () => {
    render(<InfoTooltip content="Tooltip text" />)
    const button = screen.getByRole('button')
    fireEvent.mouseEnter(button)
    
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('bottom-full')
  })

  it('applies bottom position when specified', () => {
    render(<InfoTooltip content="Tooltip text" position="bottom" />)
    const button = screen.getByRole('button')
    fireEvent.mouseEnter(button)
    
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('top-full')
  })

  it('applies left position when specified', () => {
    render(<InfoTooltip content="Tooltip text" position="left" />)
    const button = screen.getByRole('button')
    fireEvent.mouseEnter(button)
    
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('right-full')
  })

  it('applies right position when specified', () => {
    render(<InfoTooltip content="Tooltip text" position="right" />)
    const button = screen.getByRole('button')
    fireEvent.mouseEnter(button)
    
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('left-full')
  })
})
