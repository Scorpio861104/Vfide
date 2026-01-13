/**
 * Accessibility Provider Component
 * 
 * Provides accessibility features throughout the app including
 * route announcements, focus management, and keyboard navigation.
 */

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRouteAnnouncement, SkipToContent } from '@/lib/accessibility';

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Announce route changes
  useRouteAnnouncement(pathname);

  // Add focus-visible polyfill behavior
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('user-is-tabbing');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('user-is-tabbing');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return (
    <>
      <SkipToContent />
      {children}
    </>
  );
}

/**
 * Landmark regions helper
 */
export function MainContent({ children, id = 'main-content' }: { 
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <main id={id} role="main" className="focus:outline-none" tabIndex={-1}>
      {children}
    </main>
  );
}

export function Navigation({ children, label }: { 
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <nav role="navigation" aria-label={label}>
      {children}
    </nav>
  );
}

export function Aside({ children, label }: { 
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <aside role="complementary" aria-label={label}>
      {children}
    </aside>
  );
}
