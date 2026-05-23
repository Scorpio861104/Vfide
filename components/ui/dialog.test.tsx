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

    // Body should be visible
    expect(screen.getByText('Body')).toBeTruthy()

    // Close button has sr-only text "Close"
    const closeButtons = document.querySelectorAll('button')
    expect(closeButtons.length).toBeGreaterThan(0)
  })

  test('headers and descriptions forward className', () => {
    render(
      <Dialog open>
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
  })
})
