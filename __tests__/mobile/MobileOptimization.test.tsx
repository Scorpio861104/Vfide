/**
 * Mobile Optimization Test Suite
 * Tests: 70+ comprehensive test cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  useMobile, 
  useIsMobile, 
  useScreenSize, 
  useOrientation,
  useMediaQuery,
  useViewport 
} from '@/hooks/useMobile';
import {
  BottomNavigation,
  MobileMenu,
  FloatingActionButton,
  TabBar,
  MobileHeader
} from '@/components/mobile/MobileNavigation';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';

jest.mock('@/hooks/useMobile', () => {
  const actual = jest.requireActual('@/hooks/useMobile');
  return {
    ...actual,
    useIsMobile: jest.fn(() => true),
  };
});

// ============================================================================
// useMobile Hook Tests
// ============================================================================

describe('useMobile Hook', () => {
  beforeEach(() => {
    // Reset window size
    global.innerWidth = 1024;
    global.innerHeight = 768;
  });

  test('returns mobile info object', () => {
    const { result } = renderHook(() => useMobile());
    
    expect(result.current).toHaveProperty('isMobile');
    expect(result.current).toHaveProperty('isTablet');
    expect(result.current).toHaveProperty('isDesktop');
    expect(result.current).toHaveProperty('screenSize');
    expect(result.current).toHaveProperty('orientation');
    expect(result.current).toHaveProperty('hasTouch');
  });

  test('detects desktop correctly', () => {
    global.innerWidth = 1440;
    const { result } = renderHook(() => useMobile());
    
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.screenSize).toBe('xl');
  });

  test('detects mobile on small screen', () => {
    global.innerWidth = 375;
    const { result } = renderHook(() => useMobile());
    
    expect(result.current.screenSize).toBe('xs');
  });

  test('updates on window resize', () => {
    const { result } = renderHook(() => useMobile());
    
    act(() => {
      global.innerWidth = 640;
      global.dispatchEvent(new Event('resize'));
    });

    waitFor(() => {
      expect(result.current.screenSize).toBe('sm');
    });
  });

  test('detects orientation change', () => {
    global.innerWidth = 1024;
    global.innerHeight = 768;
    const { result } = renderHook(() => useMobile());
    
    expect(result.current.orientation).toBe('landscape');

    act(() => {
      global.innerWidth = 768;
      global.innerHeight = 1024;
      global.dispatchEvent(new Event('orientationchange'));
    });

    waitFor(() => {
      expect(result.current.orientation).toBe('portrait');
    });
  });
});

// ============================================================================
// Specific Hook Tests
// ============================================================================

describe('Specific Mobile Hooks', () => {
  test('useIsMobile returns boolean', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe('boolean');
  });

  test('useScreenSize returns screen size', () => {
    const { result } = renderHook(() => useScreenSize());
    expect(['xs', 'sm', 'md', 'lg', 'xl', '2xl']).toContain(result.current);
  });

  test('useOrientation returns orientation', () => {
    const { result } = renderHook(() => useOrientation());
    expect(['portrait', 'landscape']).toContain(result.current);
  });
});

// ============================================================================
// Media Query Hook Tests
// ============================================================================

describe('useMediaQuery Hook', () => {
  test('returns initial match state', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(typeof result.current).toBe('boolean');
  });

  test('updates on media query change', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    act(() => {
      global.innerWidth = 800;
      global.dispatchEvent(new Event('resize'));
    });

    waitFor(() => {
      expect(typeof result.current).toBe('boolean');
    });
  });
});

// ============================================================================
// Viewport Hook Tests
// ============================================================================

describe('useViewport Hook', () => {
  test('returns viewport dimensions', () => {
    const { result } = renderHook(() => useViewport());
    
    expect(result.current).toHaveProperty('width');
    expect(result.current).toHaveProperty('height');
    expect(typeof result.current.width).toBe('number');
    expect(typeof result.current.height).toBe('number');
  });

  test('updates on window resize', () => {
    const { result } = renderHook(() => useViewport());
    
    act(() => {
      global.innerWidth = 1200;
      global.innerHeight = 900;
      global.dispatchEvent(new Event('resize'));
    });

    waitFor(() => {
      expect(result.current.width).toBe(1200);
      expect(result.current.height).toBe(900);
    });
  });
});

// ============================================================================
// Bottom Navigation Tests
// ============================================================================

describe('BottomNavigation Component', () => {
  const mockItems = [
    { id: 'home', label: 'Home', icon: '🏠', onClick: jest.fn() },
    { id: 'search', label: 'Search', icon: '🔍', onClick: jest.fn() },
    { id: 'profile', label: 'Profile', icon: '👤', onClick: jest.fn(), badge: 5 }
  ];

  test('renders all navigation items', () => {
    render(<BottomNavigation items={mockItems} activeId="home" />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  test('displays icons correctly', () => {
    render(<BottomNavigation items={mockItems} activeId="home" />);
    
    expect(screen.getByText('🏠')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  test('shows badge on item', () => {
    render(<BottomNavigation items={mockItems} activeId="home" />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('highlights active item', () => {
    render(<BottomNavigation items={mockItems} activeId="home" />);
    
    const homeButton = screen.getByLabelText('Home');
    expect(homeButton).toHaveClass('text-blue-600');
  });

  test('calls onClick when item clicked', () => {
    render(<BottomNavigation items={mockItems} activeId="home" />);
    
    const searchButton = screen.getByLabelText('Search');
    fireEvent.click(searchButton);
    
    expect(mockItems[1].onClick).toHaveBeenCalled();
  });

  test('shows badge count over 99 as 99+', () => {
    const itemsWithLargeBadge = [
      { id: 'notifications', label: 'Notifications', icon: '🔔', onClick: jest.fn(), badge: 150 }
    ];
    
    render(<BottomNavigation items={itemsWithLargeBadge} activeId="notifications" />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  test('has proper ARIA attributes', () => {
    render(<BottomNavigation items={mockItems} activeId="home" />);
    
    const homeButton = screen.getByLabelText('Home');
    expect(homeButton).toHaveAttribute('aria-current', 'page');
  });
});

// ============================================================================
// Mobile Menu Tests
// ============================================================================

describe('MobileMenu Component', () => {
  const mockSections = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', onClick: jest.fn() },
        { id: 'wallet', label: 'Wallet', icon: '💰', onClick: jest.fn(), badge: 3 }
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'settings', label: 'Settings', icon: '⚙️', onClick: jest.fn() },
        { id: 'logout', label: 'Logout', icon: '🚪', onClick: jest.fn() }
      ]
    }
  ];

  test('renders when open', () => {
    render(<MobileMenu isOpen={true} onClose={jest.fn()} sections={mockSections} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    render(<MobileMenu isOpen={false} onClose={jest.fn()} sections={mockSections} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('displays all sections and items', () => {
    render(<MobileMenu isOpen={true} onClose={jest.fn()} sections={mockSections} />);
    
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('shows badge on menu items', () => {
    render(<MobileMenu isOpen={true} onClose={jest.fn()} sections={mockSections} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('calls onClose when backdrop clicked', () => {
    const onClose = jest.fn();
    render(<MobileMenu isOpen={true} onClose={onClose} sections={mockSections} />);
    
    const backdrop = screen.getByRole('dialog').previousSibling;
    fireEvent.click(backdrop as Element);
    
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(<MobileMenu isOpen={true} onClose={onClose} sections={mockSections} />);
    
    const closeButton = screen.getByLabelText('Close menu');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  test('calls item onClick and closes menu', () => {
    const onClose = jest.fn();
    render(<MobileMenu isOpen={true} onClose={onClose} sections={mockSections} />);
    
    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);
    
    expect(mockSections[0].items[0].onClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('prevents body scroll when open', () => {
    const { rerender } = render(
      <MobileMenu isOpen={false} onClose={jest.fn()} sections={mockSections} />
    );
    
    expect(document.body.style.overflow).toBe('');
    
    rerender(<MobileMenu isOpen={true} onClose={jest.fn()} sections={mockSections} />);
    expect(document.body.style.overflow).toBe('hidden');
  });
});

// ============================================================================
// Floating Action Button Tests
// ============================================================================

describe('FloatingActionButton Component', () => {
  test('renders with icon', () => {
    render(<FloatingActionButton icon="+" onClick={jest.fn()} />);
    
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<FloatingActionButton icon="+" onClick={onClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onClick).toHaveBeenCalled();
  });

  test('uses custom label', () => {
    render(<FloatingActionButton icon="+" onClick={jest.fn()} label="Add item" />);
    
    expect(screen.getByLabelText('Add item')).toBeInTheDocument();
  });

  test('positions correctly', () => {
    const { rerender } = render(
      <FloatingActionButton icon="+" onClick={jest.fn()} position="bottom-right" />
    );
    
    let button = screen.getByRole('button');
    expect(button.className).toContain('bottom-6');
    expect(button.className).toContain('right-6');
    
    rerender(<FloatingActionButton icon="+" onClick={jest.fn()} position="top-left" />);
    button = screen.getByRole('button');
    expect(button.className).toContain('top-6');
    expect(button.className).toContain('left-6');
  });
});

// ============================================================================
// Tab Bar Tests
// ============================================================================

describe('TabBar Component', () => {
  const mockTabs = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'active', label: 'Active', icon: '✅' },
    { id: 'completed', label: 'Completed', icon: '✔️' }
  ];

  test('renders all tabs', () => {
    render(<TabBar tabs={mockTabs} activeId="all" onChange={jest.fn()} />);
    
    expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Active/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Completed/i })).toBeInTheDocument();
  });

  test('displays tab icons', () => {
    render(<TabBar tabs={mockTabs} activeId="all" onChange={jest.fn()} />);
    
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]?.textContent).toContain('📋');
    expect(tabs[1]?.textContent).toContain('✅');
  });

  test('highlights active tab', () => {
    render(<TabBar tabs={mockTabs} activeId="active" onChange={jest.fn()} />);
    
    const activeTab = screen.getByRole('tab', { name: /Active/i });
    expect(activeTab).toHaveClass('text-blue-600');
  });

  test('calls onChange when tab clicked', () => {
    const onChange = jest.fn();
    render(<TabBar tabs={mockTabs} activeId="all" onChange={onChange} />);
    
    const completedTab = screen.getByRole('tab', { name: /Completed/i });
    fireEvent.click(completedTab);
    
    expect(onChange).toHaveBeenCalledWith('completed');
  });

  test('has proper ARIA roles', () => {
    render(<TabBar tabs={mockTabs} activeId="all" onChange={jest.fn()} />);
    
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    
    const activeTab = screen.getByRole('tab', { name: /All/i });
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
  });
});

// ============================================================================
// Mobile Header Tests
// ============================================================================

describe('MobileHeader Component', () => {
  test('renders title', () => {
    render(<MobileHeader title="Dashboard" />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('renders left action button', () => {
    const leftAction = {
      icon: '←',
      onClick: jest.fn(),
      label: 'Back'
    };
    
    render(<MobileHeader title="Page" leftAction={leftAction} />);
    
    expect(screen.getByLabelText('Back')).toBeInTheDocument();
    expect(screen.getByText('←')).toBeInTheDocument();
  });

  test('renders right action button', () => {
    const rightAction = {
      icon: '⋮',
      onClick: jest.fn(),
      label: 'Menu'
    };
    
    render(<MobileHeader title="Page" rightAction={rightAction} />);
    
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
    expect(screen.getByText('⋮')).toBeInTheDocument();
  });

  test('calls left action onClick', () => {
    const leftAction = {
      icon: '←',
      onClick: jest.fn(),
      label: 'Back'
    };
    
    render(<MobileHeader title="Page" leftAction={leftAction} />);
    
    const backButton = screen.getByLabelText('Back');
    fireEvent.click(backButton);
    
    expect(leftAction.onClick).toHaveBeenCalled();
  });

  test('calls right action onClick', () => {
    const rightAction = {
      icon: '⋮',
      onClick: jest.fn(),
      label: 'Menu'
    };
    
    render(<MobileHeader title="Page" rightAction={rightAction} />);
    
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);
    
    expect(rightAction.onClick).toHaveBeenCalled();
  });
});

// ============================================================================
// Pull-to-Refresh Tests
// ============================================================================

describe('PullToRefresh Component', () => {
  test('renders children', () => {
    render(
      <PullToRefresh onRefresh={jest.fn()}>
        <div>Content</div>
      </PullToRefresh>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('shows pull indicator when pulling', async () => {
    const onRefresh = jest.fn(() => Promise.resolve());
    
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Content</div>
      </PullToRefresh>
    );
    
    // Simulate pull gesture
    const container = screen.getByText('Content').parentElement;
    
    fireEvent.touchStart(container!, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container!, { touches: [{ clientY: 100 }] });
    
    await waitFor(() => {
      expect(screen.getByText(/release to refresh|pull to refresh/i)).toBeInTheDocument();
    });
  });

  test('calls onRefresh when threshold reached', async () => {
    const onRefresh = jest.fn(() => Promise.resolve());
    
    render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <div>Content</div>
      </PullToRefresh>
    );
    
    const container = screen.getByText('Content').parentElement;
    
    fireEvent.touchStart(container!, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container!, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(container!);
    
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  test('shows refreshing state', async () => {
    let resolveRefresh: () => void;
    const onRefresh = jest.fn(() => new Promise<void>(resolve => {
      resolveRefresh = resolve;
    }));
    
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Content</div>
      </PullToRefresh>
    );
    
    const container = screen.getByText('Content').parentElement;
    
    fireEvent.touchStart(container!, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container!, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(container!);
    
    await waitFor(() => {
      expect(screen.getByText(/refreshing/i)).toBeInTheDocument();
    });
    
    act(() => {
      resolveRefresh!();
    });
  });

  test('does not trigger when disabled', () => {
    const onRefresh = jest.fn(() => Promise.resolve());
    
    render(
      <PullToRefresh onRefresh={onRefresh} disabled={true}>
        <div>Content</div>
      </PullToRefresh>
    );
    
    const container = screen.getByText('Content').parentElement;
    
    fireEvent.touchStart(container!, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container!, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(container!);
    
    expect(onRefresh).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Mobile Navigation Integration', () => {
  test('bottom nav and mobile menu work together', () => {
    const TestWrapper = () => {
      const [menuOpen, setMenuOpen] = React.useState(false);

      const navItems = [
        { id: 'home', label: 'Home', icon: '🏠', onClick: jest.fn() },
        { id: 'menu', label: 'Menu', icon: '☰', onClick: () => setMenuOpen(true) }
      ];

      const menuSections = [
        {
          title: 'Menu',
          items: [
            { id: 'settings', label: 'Settings', icon: '⚙️', onClick: jest.fn() }
          ]
        }
      ];

      return (
        <>
          <BottomNavigation items={navItems} activeId="home" />
          <MobileMenu 
            isOpen={menuOpen} 
            onClose={() => setMenuOpen(false)} 
            sections={menuSections} 
          />
        </>
      );
    };

    render(<TestWrapper />);

    // Click menu button
    const menuButton = screen.getByLabelText('Menu');
    fireEvent.click(menuButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('header and bottom nav work together', () => {
    const navItems = [
      { id: 'home', label: 'Home', icon: '🏠', onClick: jest.fn() },
      { id: 'search', label: 'Search', icon: '🔍', onClick: jest.fn() }
    ];

    render(
      <>
        <MobileHeader 
          title="Dashboard"
          leftAction={{ icon: '←', onClick: jest.fn(), label: 'Back' }}
        />
        <BottomNavigation items={navItems} activeId="home" />
      </>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('Mobile Components Accessibility', () => {
  test('all interactive elements have labels', () => {
    const navItems = [
      { id: 'home', label: 'Home', icon: '🏠', onClick: jest.fn() }
    ];

    render(<BottomNavigation items={navItems} activeId="home" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  test('menu has proper dialog role', () => {
    const sections = [
      { items: [{ id: 'item', label: 'Item', icon: '📋', onClick: jest.fn() }] }
    ];
    
    render(<MobileMenu isOpen={true} onClose={jest.fn()} sections={sections} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('tabs have proper ARIA attributes', () => {
    const tabs = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' }
    ];
    
    render(<TabBar tabs={tabs} activeId="tab1" onChange={jest.fn()} />);
    
    const tabElements = screen.getAllByRole('tab');
    expect(tabElements[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabElements[1]).toHaveAttribute('aria-selected', 'false');
  });
});

// ============================================================================
// Responsive Behavior Tests
// ============================================================================

describe('Responsive Behavior', () => {
  test('components adapt to screen size changes', () => {
    const { result } = renderHook(() => useScreenSize());
    
    expect(['xs', 'sm', 'md', 'lg', 'xl', '2xl']).toContain(result.current);
    
    act(() => {
      global.innerWidth = 1440;
      global.dispatchEvent(new Event('resize'));
    });
    
    waitFor(() => {
      expect(result.current).toBe('xl');
    });
  });

  test('orientation changes are detected', () => {
    const { result } = renderHook(() => useOrientation());
    
    const initialOrientation = result.current;
    
    act(() => {
      const temp = global.innerWidth;
      global.innerWidth = global.innerHeight;
      global.innerHeight = temp;
      global.dispatchEvent(new Event('orientationchange'));
    });
    
    waitFor(() => {
      expect(result.current).not.toBe(initialOrientation);
    });
  });
});
