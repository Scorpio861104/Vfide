import { render } from '@testing-library/react'
import { Skeleton, SkeletonText, SkeletonCard, SkeletonStat, SkeletonTable } from '../Skeleton'

describe('Skeleton', () => {
  it('renders skeleton element', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('applies custom width as string', () => {
    const { container } = render(<Skeleton width="200px" />)
    expect(container.firstChild).toHaveStyle({ width: '200px' })
  })

  it('applies custom width as number', () => {
    const { container } = render(<Skeleton width={100} />)
    expect(container.firstChild).toHaveStyle({ width: '100px' })
  })

  it('applies custom height as string', () => {
    const { container } = render(<Skeleton height="50px" />)
    expect(container.firstChild).toHaveStyle({ height: '50px' })
  })

  it('applies custom height as number', () => {
    const { container } = render(<Skeleton height={50} />)
    expect(container.firstChild).toHaveStyle({ height: '50px' })
  })

  it('applies rounded none variant', () => {
    const { container } = render(<Skeleton rounded="none" />)
    expect(container.firstChild).toHaveClass('rounded-none')
  })

  it('applies rounded sm variant', () => {
    const { container } = render(<Skeleton rounded="sm" />)
    expect(container.firstChild).toHaveClass('rounded-sm')
  })

  it('applies rounded md variant by default', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('rounded-md')
  })

  it('applies rounded lg variant', () => {
    const { container } = render(<Skeleton rounded="lg" />)
    expect(container.firstChild).toHaveClass('rounded-lg')
  })

  it('applies rounded xl variant', () => {
    const { container } = render(<Skeleton rounded="xl" />)
    expect(container.firstChild).toHaveClass('rounded-xl')
  })

  it('applies rounded full variant', () => {
    const { container } = render(<Skeleton rounded="full" />)
    expect(container.firstChild).toHaveClass('rounded-full')
  })

  it('applies bg color class', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('bg-[#2A2A2F]')
  })
})

describe('SkeletonText', () => {
  it('renders default 3 lines', () => {
    const { container } = render(<SkeletonText />)
    const wrapper = container.firstChild
    expect(wrapper?.childNodes.length).toBe(3)
  })

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />)
    const wrapper = container.firstChild
    expect(wrapper?.childNodes.length).toBe(5)
  })

  it('renders 1 line', () => {
    const { container } = render(<SkeletonText lines={1} />)
    const wrapper = container.firstChild
    expect(wrapper?.childNodes.length).toBe(1)
  })

  it('applies custom className', () => {
    const { container } = render(<SkeletonText className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has space-y-2 spacing class', () => {
    const { container } = render(<SkeletonText />)
    expect(container.firstChild).toHaveClass('space-y-2')
  })
})

describe('SkeletonCard', () => {
  it('renders card skeleton', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<SkeletonCard className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has bg color', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild).toHaveClass('bg-[#1A1A1D]')
  })

  it('has border styling', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild).toHaveClass('border')
    expect(container.firstChild).toHaveClass('border-[#2A2A2F]')
    expect(container.firstChild).toHaveClass('rounded-xl')
  })
})

describe('SkeletonStat', () => {
  it('renders stat skeleton', () => {
    const { container } = render(<SkeletonStat />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<SkeletonStat className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has bg and rounded styling', () => {
    const { container } = render(<SkeletonStat />)
    expect(container.firstChild).toHaveClass('bg-[#2A2A2F]')
    expect(container.firstChild).toHaveClass('rounded-xl')
  })
})

describe('SkeletonTable', () => {
  it('renders table skeleton with default 5 rows', () => {
    const { container } = render(<SkeletonTable />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders custom number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<SkeletonTable className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
