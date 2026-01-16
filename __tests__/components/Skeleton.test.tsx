import { describe, expect, it, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: React.PropsWithChildren<{ className?: string; style?: object }>) =>
      React.createElement('div', { className, style, ...props }, children),
  },
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
  useSpring: (val: unknown) => val,
  useTransform: () => 0,
}))

import { Skeleton, SkeletonText, SkeletonCard, SkeletonStat } from '@/components/ui/Skeleton'

describe('Skeleton components', () => {
  describe('Skeleton', () => {
    it('renders with default props', () => {
      render(<Skeleton />)
      const skeleton = document.querySelector('.bg-\\[\\#2A2A2F\\]')
      expect(skeleton).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Skeleton className="custom-class" />)
      const skeleton = document.querySelector('.custom-class')
      expect(skeleton).toBeInTheDocument()
    })

    it('applies width and height styles', () => {
      render(<Skeleton width={100} height={50} />)
      const skeleton = document.querySelector('.bg-\\[\\#2A2A2F\\]')
      expect(skeleton).toHaveStyle({ width: '100px', height: '50px' })
    })

    it('applies different rounded classes', () => {
      const { rerender } = render(<Skeleton rounded="none" />)
      expect(document.querySelector('.rounded-none')).toBeInTheDocument()

      rerender(<Skeleton rounded="full" />)
      expect(document.querySelector('.rounded-full')).toBeInTheDocument()

      rerender(<Skeleton rounded="lg" />)
      expect(document.querySelector('.rounded-lg')).toBeInTheDocument()
    })
  })

  describe('SkeletonText', () => {
    it('renders default 3 lines', () => {
      render(<SkeletonText />)
      const lines = document.querySelectorAll('.bg-\\[\\#2A2A2F\\]')
      expect(lines.length).toBe(3)
    })

    it('renders custom number of lines', () => {
      render(<SkeletonText lines={5} />)
      const lines = document.querySelectorAll('.bg-\\[\\#2A2A2F\\]')
      expect(lines.length).toBe(5)
    })

    it('applies custom className', () => {
      render(<SkeletonText className="text-skeleton" />)
      const container = document.querySelector('.text-skeleton')
      expect(container).toBeInTheDocument()
    })
  })

  describe('SkeletonCard', () => {
    it('renders with card structure', () => {
      render(<SkeletonCard />)
      const card = document.querySelector('.bg-\\[\\#1A1A1D\\]')
      expect(card).toBeInTheDocument()
    })

    it('contains skeleton elements', () => {
      render(<SkeletonCard />)
      const skeletons = document.querySelectorAll('.bg-\\[\\#2A2A2F\\]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('applies custom className', () => {
      render(<SkeletonCard className="custom-card" />)
      const card = document.querySelector('.custom-card')
      expect(card).toBeInTheDocument()
    })
  })

  describe('SkeletonStat', () => {
    it('renders with stat box structure', () => {
      render(<SkeletonStat />)
      const stat = document.querySelector('.rounded-xl')
      expect(stat).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<SkeletonStat className="custom-stat" />)
      const stat = document.querySelector('.custom-stat')
      expect(stat).toBeInTheDocument()
    })
  })
})
