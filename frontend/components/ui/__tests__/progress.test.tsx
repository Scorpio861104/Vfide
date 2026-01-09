import { render } from '@testing-library/react'
import { Progress } from '../progress'

describe('Progress', () => {
  it('renders progress bar', () => {
    const { container } = render(<Progress value={50} />)
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })

  it('displays correct progress value', () => {
    const { container } = render(<Progress value={75} />)
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('handles zero progress', () => {
    const { container } = render(<Progress value={0} />)
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('handles full progress', () => {
    const { container } = render(<Progress value={100} />)
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Progress value={50} className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles undefined value', () => {
    const { container } = render(<Progress />)
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('sets correct indicator transform for 60%', () => {
    const { container } = render(<Progress value={60} />)
    const indicator = container.querySelector('.bg-primary')
    expect(indicator).toHaveStyle({ transform: 'translateX(-40%)' })
  })

  it('sets correct indicator transform for 0%', () => {
    const { container } = render(<Progress value={0} />)
    const indicator = container.querySelector('.bg-primary')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('sets correct indicator transform for 100%', () => {
    const { container } = render(<Progress value={100} />)
    const indicator = container.querySelector('.bg-primary')
    expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' })
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<Progress ref={ref} value={50} />)
    expect(ref).toHaveBeenCalled()
  })

  it('handles null value gracefully', () => {
    // @ts-ignore - testing edge case
    const { container } = render(<Progress value={null} />)
    const indicator = container.querySelector('.bg-primary')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('handles negative value', () => {
    const { container } = render(<Progress value={-10} />)
    const indicator = container.querySelector('.bg-primary')
    expect(indicator).toHaveStyle({ transform: 'translateX(-110%)' })
  })

  it('handles value over 100', () => {
    const { container } = render(<Progress value={150} />)
    const indicator = container.querySelector('.bg-primary')
    expect(indicator).toHaveStyle({ transform: 'translateX(--50%)' })
  })

  it('handles decimal values', () => {
    const { container } = render(<Progress value={33.33} />)
    const indicator = container.querySelector('.bg-primary')
    expect(indicator).toHaveStyle({ transform: 'translateX(-66.67%)' })
  })

  it('passes through additional props', () => {
    const { container } = render(
      <Progress value={50} data-testid="custom-progress" aria-label="Loading progress" />
    )
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toHaveAttribute('data-testid', 'custom-progress')
    expect(progressBar).toHaveAttribute('aria-label', 'Loading progress')
  })

  it('merges custom className with default classes', () => {
    const { container } = render(<Progress value={50} className="my-custom-class another-class" />)
    const progressBar = container.firstChild as HTMLElement
    expect(progressBar).toHaveClass('my-custom-class')
    expect(progressBar).toHaveClass('another-class')
    expect(progressBar).toHaveClass('relative')
    expect(progressBar).toHaveClass('h-4')
  })
})
