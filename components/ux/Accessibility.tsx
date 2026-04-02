'use client';

/**
 * Accessibility Enhancements
 * 
 * Components and utilities for improved accessibility including
 * screen reader support, focus indicators, skip links, and
 * reduced motion support.
 */

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { usePrefersReducedMotion } from '@/lib/ux/uxUtils';
import { safeLocalStorage } from '@/lib/utils';

// ==================== TYPES ====================

interface A11yContextType {
  announcements: string[];
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  reducedMotion: boolean;
  highContrast: boolean;
  toggleHighContrast: () => void;
  focusVisible: boolean;
}

// ==================== CONTEXT ====================

const A11yContext = createContext<A11yContextType | null>(null);

export function useA11y() {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error('useA11y must be used within an A11yProvider');
  }
  return context;
}

// ==================== PROVIDER ====================

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [highContrast, setHighContrast] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Detect keyboard vs mouse navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Load high contrast preference
  useEffect(() => {
    const saved = safeLocalStorage.getItem('vfide-high-contrast');
    if (saved === 'true') {
      setHighContrast(true);
      document.documentElement.classList.add('high-contrast');
    }
  }, []);

  const announce = useCallback((message: string, _priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements((prev) => [...prev, message]);
    // Clean up after announcement is made
    setTimeout(() => {
      setAnnouncements((prev) => prev.slice(1));
    }, 1000);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const newValue = !prev;
      safeLocalStorage.setItem('vfide-high-contrast', String(newValue));
      if (newValue) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
      return newValue;
    });
  }, []);

  // Apply focus-visible class
  useEffect(() => {
    if (focusVisible) {
      document.body.classList.add('focus-visible');
    } else {
      document.body.classList.remove('focus-visible');
    }
  }, [focusVisible]);

  return (
    <A11yContext.Provider value={{
      announcements,
      announce,
      reducedMotion,
      highContrast,
      toggleHighContrast,
      focusVisible,
    }}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        {children}
        
        {/* Live Region for Screen Readers */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcements[announcements.length - 1]}
        </div>
      </MotionConfig>
    </A11yContext.Provider>
  );
}

// ==================== SKIP LINK ====================

export function SkipLink({ 
  href = '#main-content',
  children = 'Skip to main content',
}: { 
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-9999
        px-4 py-2 bg-cyan-500 text-white font-medium rounded-lg
        focus:outline-none focus:ring-2 focus:ring-white
        transition-transform duration-200
      "
    >
      {children}
    </a>
  );
}

// ==================== FOCUS INDICATOR ====================

export function FocusRing({ 
  children,
  className = '',
  disabled = false,
}: { 
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`
      relative rounded-lg
      ${!disabled ? 'focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

// ==================== VISUALLY HIDDEN ====================

export function VisuallyHidden({
  children,
  as: Component = 'span',
}: {
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

// ==================== KEYBOARD NAVIGATION HINT ====================

export function KeyboardHint({
  shortcut,
  description,
  className = '',
}: {
  shortcut: string;
  description: string;
  className?: string;
}) {
  const keys = shortcut.split('+').map((k) => k.trim());

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-400 ${className}`}>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <React.Fragment key={key}>
            {i > 0 && <span>+</span>}
            <kbd className="
              px-2 py-1 bg-gray-800 border border-gray-600 rounded
              font-mono text-xs text-gray-300
            ">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
      <span>{description}</span>
    </div>
  );
}

// ==================== REDUCED MOTION WRAPPER ====================

export function ReducedMotionWrapper({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion && fallback) {
    return <>{fallback}</>;
  }

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      {children}
    </MotionConfig>
  );
}

// ==================== ACCESSIBLE ICON ====================

export function AccessibleIcon({
  icon: Icon,
  label,
  className = '',
  size = 20,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  className?: string;
  size?: number;
}) {
  return (
    <span role="img" aria-label={label}>
      <Icon className={className} size={size} aria-hidden="true" />
    </span>
  );
}

// ==================== FOCUS TRAP ====================

export function FocusTrap({
  children,
  active = true,
  returnFocus = true,
}: {
  children: React.ReactNode;
  active?: boolean;
  returnFocus?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (returnFocus && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [active, returnFocus]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}

// ==================== ANNOUNCE ON MOUNT ====================

export function AnnounceOnMount({
  message,
  priority = 'polite',
}: {
  message: string;
  priority?: 'polite' | 'assertive';
}) {
  const { announce } = useA11y();

  useEffect(() => {
    announce(message, priority);
  }, [announce, message, priority]);

  return null;
}

// ==================== LOADING ANNOUNCEMENT ====================

export function LoadingAnnouncement({
  loading,
  loadingMessage = 'Loading...',
  completeMessage = 'Content loaded',
}: {
  loading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
}) {
  const { announce } = useA11y();
  const wasLoading = useRef(loading);

  useEffect(() => {
    if (loading && !wasLoading.current) {
      announce(loadingMessage);
    } else if (!loading && wasLoading.current) {
      announce(completeMessage);
    }
    wasLoading.current = loading;
  }, [loading, loadingMessage, completeMessage, announce]);

  return null;
}

// ==================== ACCESSIBLE MODAL ====================

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const reducedMotion = usePrefersReducedMotion();

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby={description ? 'modal-description' : undefined}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <FocusTrap active={isOpen}>
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              className={`
                relative w-full ${sizes[size]}
                bg-gray-900 border border-gray-700 rounded-2xl
                shadow-xl p-6
              `}
            >
              <h2 id="modal-title" className="text-xl font-bold text-white">
                {title}
              </h2>
              {description && (
                <p id="modal-description" className="mt-2 text-gray-400">
                  {description}
                </p>
              )}
              <div className="mt-4">
                {children}
              </div>
            </motion.div>
          </FocusTrap>
        </div>
      )}
    </AnimatePresence>
  );
}

// ==================== ACCESSIBLE TABS ====================

export function AccessibleTabs({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: {
  tabs: Array<{ id: string; label: string; content: React.ReactNode; disabled?: boolean }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}) {
  const tabListRef = useRef<HTMLDivElement>(null);
  const { announce } = useA11y();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);

    let newIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      newIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = enabledTabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const newTab = enabledTabs[newIndex];
    if (!newTab) return;
    
    onTabChange(newTab.id);
    announce(`${newTab.label} tab selected`);

    // Focus the new tab button
    const tabButton = tabListRef.current?.querySelector(`[data-tab-id="${newTab.id}"]`) as HTMLButtonElement;
    tabButton?.focus();
  };

  return (
    <div className={className}>
      {/* Tab list */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Tabs"
        onKeyDown={handleKeyDown}
        className="flex border-b border-gray-700"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            data-tab-id={tab.id}
            disabled={tab.disabled}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => {
              onTabChange(tab.id);
              announce(`${tab.label} tab selected`);
            }}
            className={`
              relative px-4 py-3 text-sm font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-inset
              ${activeTab === tab.id 
                ? 'text-cyan-400' 
                : tab.disabled 
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-200'
              }
            `}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="focus:outline-none"
        >
          {activeTab === tab.id && tab.content}
        </div>
      ))}
    </div>
  );
}

// ==================== ACCESSIBLE TOOLTIP ====================

export function AccessibleTooltip({
  children,
  content,
  position = 'top',
  delay = 300,
}: {
  children: React.ReactElement;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const id = React.useId();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-describedby={isVisible ? id : undefined}
      >
        {children}
      </span>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            id={id}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
              absolute z-50 ${positions[position]}
              px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
              text-sm text-white whitespace-nowrap shadow-xl
            `}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default {
  A11yProvider,
  useA11y,
  SkipLink,
  FocusRing,
  VisuallyHidden,
  KeyboardHint,
  ReducedMotionWrapper,
  AccessibleIcon,
  FocusTrap,
  AnnounceOnMount,
  LoadingAnnouncement,
  AccessibleModal,
  AccessibleTabs,
  AccessibleTooltip,
};
