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
})
