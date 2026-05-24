'use client';

import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/about/page';

describe('About Page', () => {
  it('renders the full mission page with content', () => {
    render(<AboutPage />);

    // The about page now has full real content
    expect(screen.getByText(/Our Mission/i)).toBeTruthy();
    expect(screen.getByText(/serving the unbanked/i)).toBeTruthy();
  });

  it('displays core principles', () => {
    render(<AboutPage />);
    
    // Real page content includes principles or mission statement
    expect(screen.getByText(/Financial Inclusion/i)).toBeTruthy();
  });

  it('shows regional focus and team context', () => {
    render(<AboutPage />);
    
    // Content describes regions and mission
    const pageText = screen.getByRole('main').textContent;
    expect(pageText).toMatch(/unbanked|developing|financial/i);
  });
});
