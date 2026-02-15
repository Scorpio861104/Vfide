'use client';

/**
 * Page Transitions
 * 
 * Smooth animated transitions between pages for a polished UX.
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';

// ==================== TRANSITION VARIANTS ====================

export const pageTransitions = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
    transition: { duration: 0.25 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
    transition: { duration: 0 },
  },
} as const;

export type TransitionType = keyof typeof pageTransitions;

// ==================== STAGGER CHILDREN ====================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2 }
  },
};

// ==================== PAGE TRANSITION CONTEXT ====================

interface PageTransitionContextValue {
  transition: TransitionType;
  setTransition: (type: TransitionType) => void;
  isTransitioning: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextValue>({
  transition: 'slideUp',
  setTransition: () => {},
  isTransitioning: false,
});

export function usePageTransition() {
  return useContext(PageTransitionContext);
}

// ==================== PAGE TRANSITION PROVIDER ====================

export interface PageTransitionProviderProps {
  children: ReactNode;
  defaultTransition?: TransitionType;
}

export function PageTransitionProvider({
  children,
  defaultTransition = 'slideUp',
}: PageTransitionProviderProps) {
  const pathname = usePathname();
  const [transition, setTransition] = useState<TransitionType>(defaultTransition);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsTransitioning(true);
    }, 0);
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, [pathname]);

  return (
    <PageTransitionContext.Provider value={{ transition, setTransition, isTransitioning }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={pageTransitions[transition].initial}
          animate={pageTransitions[transition].animate}
          exit={pageTransitions[transition].exit}
          transition={pageTransitions[transition].transition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </PageTransitionContext.Provider>
  );
}

// ==================== ANIMATED PAGE WRAPPER ====================

export interface AnimatedPageProps {
  children: ReactNode;
  transition?: TransitionType;
  className?: string;
}

export function AnimatedPage({
  children,
  transition = 'slideUp',
  className = '',
}: AnimatedPageProps) {
  return (
    <motion.div
      initial={pageTransitions[transition].initial}
      animate={pageTransitions[transition].animate}
      exit={pageTransitions[transition].exit}
      transition={pageTransitions[transition].transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ==================== STAGGERED LIST ====================

export interface StaggeredListProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StaggeredList({ children, className = '', delay = 0 }: StaggeredListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ==================== REVEAL ON SCROLL ====================

export interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  once?: boolean;
}

export function RevealOnScroll({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  once = true,
}: RevealOnScrollProps) {
  const directionOffset = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ==================== PARALLAX SCROLL ====================

export interface ParallaxProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function Parallax({ children, speed = 0.5, className = '' }: ParallaxProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div
      style={{ y: scrollY * speed }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default PageTransitionProvider;
