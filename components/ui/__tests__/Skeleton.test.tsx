import { render } from '@testing-library/react'
import {
    AchievementListSkeleton,
    FriendListSkeleton,
    GroupListSkeleton,
    MessageListSkeleton,
    NotificationListSkeleton,
    NotificationSkeleton,
    Skeleton,
    SkeletonCard,
    SkeletonStat,
    SkeletonTable,
    SkeletonText
} from '../Skeleton'

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

describe('NotificationSkeleton', () => {
  it('renders notification skeleton', () => {
    const { container } = render(<NotificationSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('includes avatar skeleton', () => {
    const { container } = render(<NotificationSkeleton />)
    expect(container.querySelector('.rounded-full')).toBeInTheDocument()
  })

  it('includes text content skeletons', () => {
    const { container } = render(<NotificationSkeleton />)
    expect(container.querySelector('.flex-1')).toBeInTheDocument()
  })

  it('has correct background styling', () => {
    const { container } = render(<NotificationSkeleton />)
    expect(container.firstChild).toHaveClass('bg-[#2A2A2F]')
    expect(container.firstChild).toHaveClass('rounded-lg')
  })
})

describe('NotificationListSkeleton', () => {
  it('renders notification list with default count', () => {
    const { container } = render(<NotificationListSkeleton />)
    expect(container.querySelector('.space-y-3')).toBeInTheDocument()
  })

  it('renders custom count of notifications', () => {
    const { container } = render(<NotificationListSkeleton count={3} />)
    const notifications = container.querySelectorAll('.flex.items-start.gap-3.p-4')
    expect(notifications).toHaveLength(3)
  })

  it('renders 5 notifications by default', () => {
    const { container } = render(<NotificationListSkeleton />)
    const notifications = container.querySelectorAll('.flex.items-start.gap-3.p-4')
    expect(notifications).toHaveLength(5)
  })
})
describe('MessageListSkeleton', () => {
  it('renders message list skeleton with default count', () => {
    const { container } = render(<MessageListSkeleton />)
    expect(container.querySelector('.space-y-4')).toBeInTheDocument()
  })

  it('renders custom count of messages', () => {
    const { container } = render(<MessageListSkeleton count={3} />)
    const messages = container.querySelectorAll('.max-w-\\[70\\%\\]')
    expect(messages).toHaveLength(3)
  })

  it('alternates message alignment', () => {
    const { container } = render(<MessageListSkeleton count={2} />)
    const firstMessage = container.querySelector('.justify-end')
    expect(firstMessage).toBeInTheDocument()
  })
})

describe('FriendListSkeleton', () => {
  it('renders friend list skeleton with default count', () => {
    const { container } = render(<FriendListSkeleton />)
    expect(container.querySelector('.space-y-2')).toBeInTheDocument()
  })

  it('renders custom count of friends', () => {
    const { container } = render(<FriendListSkeleton count={4} />)
    const friends = container.querySelectorAll('.flex.items-center')
    expect(friends).toHaveLength(4)
  })

  it('includes avatar and text skeletons', () => {
    const { container } = render(<FriendListSkeleton count={1} />)
    expect(container.querySelector('.rounded-full')).toBeInTheDocument()
  })
})

describe('GroupListSkeleton', () => {
  it('renders group list skeleton with default count', () => {
    const { container } = render(<GroupListSkeleton />)
    expect(container.querySelector('.space-y-3')).toBeInTheDocument()
  })

  it('renders custom count of groups', () => {
    const { container } = render(<GroupListSkeleton count={3} />)
    const groups = container.querySelectorAll('.p-4.bg-\\[\\#0F0F14\\]')
    expect(groups).toHaveLength(3)
  })

  it('includes group info skeletons', () => {
    const { container } = render(<GroupListSkeleton count={1} />)
    expect(container.querySelector('.rounded-full')).toBeInTheDocument()
    expect(container.querySelectorAll('.space-y-2')).toHaveLength(1)
  })
})

describe('AchievementListSkeleton', () => {
  it('renders achievement list skeleton with default count', () => {
    const { container } = render(<AchievementListSkeleton />)
    expect(container.querySelector('.grid')).toBeInTheDocument()
  })

  it('renders custom count of achievements', () => {
    const { container } = render(<AchievementListSkeleton count={4} />)
    const achievements = container.querySelectorAll('.p-4.bg-\\[\\#0F0F14\\]')
    expect(achievements).toHaveLength(4)
  })

  it('includes responsive grid layout', () => {
    const { container } = render(<AchievementListSkeleton />)
    expect(container.firstChild).toHaveClass('grid')
    expect(container.firstChild).toHaveClass('grid-cols-1')
    expect(container.firstChild).toHaveClass('md:grid-cols-2')
  })

  it('includes achievement info skeletons', () => {
    const { container } = render(<AchievementListSkeleton count={1} />)
    expect(container.querySelector('.rounded-full')).toBeInTheDocument()
  })
})