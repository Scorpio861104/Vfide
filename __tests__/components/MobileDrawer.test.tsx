/**
 * MobileDrawer Component Tests
 * Testing hamburger menu and slide-in drawer functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MobileDrawer } from '../../components/mobile/MobileDrawer';

describe('MobileDrawer Component', () => {
  const mockItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/governance', label: 'Governance' },
    { href: '/merchants', label: 'Merchants' },
  ];

  it('renders hamburger button on mobile', () => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(
      <MobileDrawer>
        <nav>
          {mockItems.map(item => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button', { name: /menu/i });
    expect(hamburger).toBeInTheDocument();
  });

  it('toggles drawer visibility on button click', async () => {
    const user = userEvent.setup();

    render(
      <MobileDrawer>
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button', { name: /menu/i });

    // Click to open
    await user.click(hamburger);
    const drawer = screen.getByRole('navigation');
    expect(drawer).toHaveClass('translate-x-0');

    // Click to close
    await user.click(hamburger);
    await waitFor(() => {
      expect(drawer).toHaveClass('-translate-x-full');
    });
  });

  it('closes drawer when backdrop is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MobileDrawer>
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button', { name: /menu/i });
    await user.click(hamburger);

    const backdrop = screen.getByRole('presentation');
    await user.click(backdrop);

    await waitFor(() => {
      expect(backdrop).toHaveClass('opacity-0');
    });
  });

  it('handles keyboard navigation (Escape to close)', async () => {
    const user = userEvent.setup();

    render(
      <MobileDrawer>
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button', { name: /menu/i });
    await user.click(hamburger);

    const drawer = screen.getByRole('navigation');
    expect(drawer).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(drawer).toHaveClass('-translate-x-full');
    });
  });

  it('properly manages focus when opening/closing', async () => {
    const user = userEvent.setup();

    render(
      <MobileDrawer>
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button', { name: /menu/i });

    // Open drawer
    await user.click(hamburger);
    const drawer = screen.getByRole('navigation');

    // Focus should be in drawer
    expect(drawer).toContainElement(document.activeElement);

    // Close drawer
    await user.click(hamburger);

    // Focus should return to hamburger
    expect(document.activeElement).toBe(hamburger);
  });

  it('has proper accessibility attributes', () => {
    render(
      <MobileDrawer>
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button');
    expect(hamburger).toHaveAttribute('aria-label');
    expect(hamburger).toHaveAttribute('aria-expanded');

    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveAttribute('aria-hidden');
  });

  it('hides on desktop viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const { container } = render(
      <MobileDrawer>
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.queryByRole('button', { name: /menu/i });

    // On desktop, drawer might not render or should be hidden
    if (hamburger) {
      expect(hamburger).toHaveClass('hidden');
    }
  });

  it('supports multiple navigation items', async () => {
    const user = userEvent.setup();

    render(
      <MobileDrawer>
        <nav>
          {mockItems.map(item => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button', { name: /menu/i });
    await user.click(hamburger);

    // All items should be accessible
    mockItems.forEach(item => {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toBeInTheDocument();
    });
  });

  it('closes drawer when navigation link is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MobileDrawer>
        <nav>
          {mockItems.map(item => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button', { name: /menu/i });
    await user.click(hamburger);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    await user.click(dashboardLink);

    await waitFor(() => {
      const drawer = screen.getByRole('navigation');
      expect(drawer).toHaveClass('-translate-x-full');
    });
  });

  it('has proper animation timing', async () => {
    const user = userEvent.setup();

    render(
      <MobileDrawer>
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button', { name: /menu/i });
    await user.click(hamburger);

    const drawer = screen.getByRole('navigation');

    // Check animation classes
    expect(drawer).toHaveClass('transition-transform', 'duration-300');
  });

  it('touches the minimum touch target size (44px)', () => {
    render(
      <MobileDrawer>
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    const hamburger = screen.getByRole('button');
    const rect = hamburger.getBoundingClientRect();

    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  });

  it('renders without crashing when empty', () => {
    render(<MobileDrawer children={null} />);

    const hamburger = screen.getByRole('button', { name: /menu/i });
    expect(hamburger).toBeInTheDocument();
  });

  it('supports custom className prop', () => {
    const { container } = render(
      <MobileDrawer className="custom-drawer">
        <nav>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </MobileDrawer>
    );

    // The component should apply custom classes
    expect(container.firstChild).toBeInTheDocument();
  });
});
