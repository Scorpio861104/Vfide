/**
 * MotionProvider — wraps the app shell in framer-motion's LazyMotion.
 *
 * Why: importing `motion` from 'framer-motion' bundles the full feature
 * set (~34KB gzipped). LazyMotion with domAnimation defers everything
 * except the core DOM features (~6KB gzipped) — a ~28KB saving on the
 * initial JS bundle, applied to every page load regardless of route.
 *
 * Shell components must use `m` from 'framer-motion' instead of `motion`:
 *   import { m, AnimatePresence } from 'framer-motion';  // ← m, not motion
 *   <m.div animate={{ opacity: 1 }} />                   // identical API
 *
 * domAnimation covers all patterns used in the shell: HTML/SVG animation,
 * layout, drag, hover, tap, AnimatePresence, useMotionValue, useSpring.
 *
 * `strict` mode enforces that no child accidentally imports `motion` back
 * (it will throw in dev to catch regressions).
 */
'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
