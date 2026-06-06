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
 * NOTE: This provider intentionally does not enable LazyMotion `strict` mode.
 * The app still contains many route-level imports of `motion` from
 * framer-motion. Strict mode throws a runtime exception for those imports,
 * which can put entire interactive pages behind the global error boundary and
 * make controls such as wallet connect buttons appear dead. Keeping strict off
 * preserves LazyMotion for components that use `m` while avoiding app-wide
 * crashes until every legacy `motion` import is migrated.
 */
'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
