import { render, screen } from '@testing-library/react'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from './dialog'

describe('Dialog components', () => {
  test('renders content with overlay and close button', () => {
    render(
      <Dialog open>
        <DialogContent className="custom-content">
          <div>Body</div>
        </DialogContent>
      </Dialog>
    )

    const overlay = document.querySelector('[data-state="open"][class*="bg-black/80"]') as HTMLElement
    expect(overlay).toBeTruthy()

    const close = screen.getByText('Close')
    expect(close).toBeInTheDocument()
    expect(close.closest('button')).toBeTruthy()
  })

  test('headers and descriptions forward className', () => {
    render(
      <Dialog open>
        <DialogOverlay className="custom-overlay" />
        <DialogContent>
          <DialogHeader className="hdr">
            <DialogTitle className="ttl">Title</DialogTitle>
            <DialogDescription className="desc">Desc</DialogDescription>
          </DialogHeader>
          <DialogFooter className="ftr" />
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Title').className).toContain('ttl')
    expect(screen.getByText('Desc').className).toContain('desc')
    const overlay = document.querySelector('[class*="custom-overlay"]') as HTMLElement
    expect(overlay).toBeTruthy()
  })
})
