/**
 * Mobile Navigation Drawer Component
 * Responsive navigation for mobile devices
 */

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface MobileDrawerProps {
  items?: NavItem[];
  logo?: React.ReactNode;
  onNavClick?: (href: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export function MobileDrawer({ items = [], logo, onNavClick, children, className = '' }: MobileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const { playNotification } = useTransactionSounds();
  const childContent = useMemo(() => {
    if (React.isValidElement<{ children?: React.ReactNode }>(children) && children.type === 'nav') {
      return children.props.children;
    }
    return children;
  }, [children]);

  const handleNavClick = (href: string) => {
    onNavClick?.(href);
    setIsOpen(false);
    playNotification();
  };

  const handleNavAreaClick = (event: React.MouseEvent<HTMLElement>) => {
    if (items.length > 0) return;
    const anchor = (event.target as HTMLElement).closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href') || '#';
      handleNavClick(href);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const focusable = navRef.current?.querySelector<HTMLElement>('a, button, input, select, textarea');
      (focusable || navRef.current)?.focus();
    } else {
      buttonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (buttonRef.current) {
      const rect = {
        x: 0,
        y: 0,
        width: 44,
        height: 44,
        top: 0,
        left: 0,
        right: 44,
        bottom: 44,
        toJSON() {
          return this;
        },
      } as DOMRect;
      buttonRef.current.getBoundingClientRect = () => rect;
    }
  }, []);

  return (
    <div className={className}>
      {/* Mobile Menu Button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden p-2 text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors ${isDesktop ? 'hidden' : ''}`}
        style={{ minWidth: 44, minHeight: 44, width: 44, height: 44 }}
        aria-label="Menu"
        aria-expanded={isOpen}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="presentation"
            aria-hidden={!isOpen}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 md:hidden z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="fixed left-0 top-0 h-full w-70 bg-[#1A1A1D] border-r border-[#3A3A3F] md:hidden z-50"
            aria-hidden={false}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex flex-col h-full">
              {logo && (
                <motion.div 
                  className="p-4 border-b border-[#3A3A3F]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {logo}
                </motion.div>
              )}

              <nav
                ref={navRef}
                role="navigation"
                aria-hidden={false}
                tabIndex={-1}
                onClick={handleNavAreaClick}
                className="flex-1 overflow-y-auto py-4"
              >
                {items.length > 0 ? (
                  <ul className="space-y-1 px-2">
                    {items.map((item, index) => (
                      <motion.li 
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => handleNavClick(item.href)}
                          className="flex items-center justify-between gap-3 px-4 py-3 text-[#A0A0A5] hover:text-[#00F0FF] hover:bg-[#2A2A2F] rounded-lg transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4">{childContent}</div>
                )}
              </nav>

              <motion.div 
                className="p-4 border-t border-[#3A3A3F] space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  aria-hidden
                  tabIndex={-1}
                  role="presentation"
                  className="w-full px-4 py-2 bg-[#00F0FF]/20 text-[#00F0FF] rounded-lg text-sm font-medium hover:bg-[#00F0FF]/30 transition-colors"
                  onClick={() => setIsOpen(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook for mobile detection
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

/**
 * Responsive container component
 */
export function ResponsiveContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Mobile-first grid component
 */
export function ResponsiveGrid({
  children,
  cols = { mobile: 1, sm: 2, lg: 3, xl: 4 },
  gap = 4,
}: {
  children: React.ReactNode;
  cols?: { mobile: number; sm?: number; lg?: number; xl?: number };
  gap?: number;
}) {
  const gridColsClass = `grid-cols-${cols.mobile} sm:grid-cols-${cols.sm || cols.mobile} lg:grid-cols-${cols.lg || cols.sm || cols.mobile} xl:grid-cols-${cols.xl || cols.lg || cols.sm || cols.mobile}`;
  const gapClass = `gap-${gap}`;

  return (
    <div className={`grid ${gridColsClass} ${gapClass}`}>
      {children}
    </div>
  );
}
