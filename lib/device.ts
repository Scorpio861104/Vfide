/**
 * Device Adaptation — Making VFIDE fast on a $60 Android
 *
 * Detects device capability and adjusts UI behavior:
 *   - Low-end: disable animations, reduce image quality, virtual scroll
 *   - Mid-range: reduce animation count, standard quality
 *   - High-end: full experience
 */
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export type DeviceTier = 'low' | 'mid' | 'high';

export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'mid';
  const nav = navigator as any;
  const memory = nav.deviceMemory || 4;
  const cores = nav.hardwareConcurrency || 4;
  const connection = nav.connection?.effectiveType || '4g';
  if (memory <= 2 || cores <= 4 || connection === 'slow-2g' || connection === '2g') return 'low';
  if (memory >= 6 && cores >= 6) return 'high';
  return 'mid';
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>('mid');
  useEffect(() => { setTier(detectDeviceTier()); }, []);
  return tier;
}

export function useAnimationBudget() {
  const tier = useDeviceTier();
  const reducedMotion = useReducedMotion();

  return useMemo(() => ({
    enabled: !reducedMotion && tier !== 'low',
    maxAnimated: tier === 'high' ? 10 : tier === 'mid' ? 5 : 2,
    durationScale: tier === 'high' ? 1.0 : tier === 'mid' ? 0.7 : 0.3,
    useSpring: tier !== 'low',
    useBlur: tier === 'high',
    useParticles: tier === 'high',
    useGradients: tier !== 'low',
    imageQuality: tier === 'high' ? 85 : tier === 'mid' ? 70 : 50,
  }), [tier, reducedMotion]);
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}

export function useDeferredRender(delay = 100): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(() => setReady(true), { timeout: delay * 3 });
      return () => (window as any).cancelIdleCallback(id);
    }
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return ready;
}

export function useInView(threshold = 0.1): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        setInView(true);
        obs.disconnect();
      }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

export function useVirtualScroll<T>(items: T[], itemHeight: number, overscan = 3) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

  const visibleItems = useMemo(() =>
    items.slice(startIndex, endIndex + 1).map((item, i) => ({
      item, index: startIndex + i,
      style: { position: 'absolute' as const, top: (startIndex + i) * itemHeight, height: itemHeight, left: 0, right: 0 },
    })), [items, startIndex, endIndex, itemHeight]);

  return {
    containerRef,
    onScroll: useCallback(() => { if (containerRef.current) setScrollTop(containerRef.current.scrollTop); }, []),
    visibleItems, totalHeight,
  };
}
