/**
 * Adaptive Performance Layer
 * 
 * Detects device capability and network conditions.
 * Components use this to decide what to render:
 * - High-end: full animations, high-res images, particle effects
 * - Mid-range: CSS animations only, medium images
 * - Low-end: no animations, compressed images, simplified layouts
 * 
 * Usage:
 *   const { tier, prefersReducedMotion, connectionSpeed, canAnimate } = useDeviceCapability();
 *   
 *   {canAnimate ? <motion.div animate={...} /> : <div />}
 *   <img src={getImageUrl(url, tier)} />
 */
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export type DeviceTier = 'high' | 'mid' | 'low';
export type ConnectionSpeed = 'fast' | 'medium' | 'slow' | 'offline';
export type ImageQuality = 'high' | 'medium' | 'low' | 'thumbnail';

interface DeviceCapability {
  tier: DeviceTier;
  connectionSpeed: ConnectionSpeed;
  isOnline: boolean;
  deviceMemory: number | null;       // GB
  hardwareConcurrency: number | null; // CPU cores
  prefersReducedMotion: boolean;
  saveData: boolean;                  // User has data saver enabled
  canAnimate: boolean;                // Should we show animations?
  canAutoplay: boolean;               // Should we autoplay video/audio?
  imageQuality: ImageQuality;         // What quality images to request
  isLowEnd: boolean;                  // Quick check
  isTouchDevice: boolean;
}

// ── Detection ───────────────────────────────────────────────────────────────

function detectDeviceMemory(): number | null {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    return (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
  }
  return null;
}

function detectConcurrency(): number | null {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  return null;
}

function detectConnectionSpeed(): ConnectionSpeed {
  if (typeof navigator === 'undefined') return 'fast';
  if (!navigator.onLine) return 'offline';

  const conn = (navigator as Navigator & { connection?: {
    effectiveType?: string;
    saveData?: boolean;
    downlink?: number;
  } }).connection;

  if (!conn) return 'fast'; // Can't detect, assume good

  const effectiveType = conn.effectiveType;
  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'medium';
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'slow';

  // Fallback to downlink speed
  if (conn.downlink !== undefined) {
    if (conn.downlink >= 5) return 'fast';
    if (conn.downlink >= 1) return 'medium';
    return 'slow';
  }

  return 'fast';
}

function detectSaveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData ?? false;
}

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function calculateTier(memory: number | null, cores: number | null, speed: ConnectionSpeed): DeviceTier {
  // If save data is on, treat as low
  if (detectSaveData()) return 'low';

  let score = 0;

  // Memory scoring
  if (memory !== null) {
    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else if (memory >= 2) score += 1;
    // <2GB or unknown = 0
  } else {
    score += 1; // Unknown, assume mid
  }

  // CPU scoring
  if (cores !== null) {
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else if (cores >= 2) score += 1;
  } else {
    score += 1;
  }

  // Connection scoring
  if (speed === 'fast') score += 2;
  else if (speed === 'medium') score += 1;
  // slow/offline = 0

  // Tier boundaries
  if (score >= 6) return 'high';
  if (score >= 3) return 'mid';
  return 'low';
}

function getImageQuality(tier: DeviceTier, speed: ConnectionSpeed): ImageQuality {
  if (speed === 'slow' || speed === 'offline') return 'thumbnail';
  if (tier === 'low') return 'low';
  if (tier === 'mid') return 'medium';
  return 'high';
}

// ── Context ─────────────────────────────────────────────────────────────────

const DeviceContext = createContext<DeviceCapability | null>(null);

export function AdaptiveProvider({ children }: { children: ReactNode }) {
  const [capability, setCapability] = useState<DeviceCapability>(() => {
    // Server-side defaults
    return {
      tier: 'mid',
      connectionSpeed: 'fast',
      isOnline: true,
      deviceMemory: null,
      hardwareConcurrency: null,
      prefersReducedMotion: false,
      saveData: false,
      canAnimate: true,
      canAutoplay: true,
      imageQuality: 'medium',
      isLowEnd: false,
      isTouchDevice: false,
    };
  });

  useEffect(() => {
    const memory = detectDeviceMemory();
    const cores = detectConcurrency();
    const speed = detectConnectionSpeed();
    const reducedMotion = detectReducedMotion();
    const saveData = detectSaveData();
    const tier = calculateTier(memory, cores, speed);
    const imageQuality = getImageQuality(tier, speed);

    setCapability({
      tier,
      connectionSpeed: speed,
      isOnline: navigator.onLine,
      deviceMemory: memory,
      hardwareConcurrency: cores,
      prefersReducedMotion: reducedMotion,
      saveData,
      canAnimate: !reducedMotion && tier !== 'low' && !saveData,
      canAutoplay: tier === 'high' && speed === 'fast' && !saveData,
      imageQuality,
      isLowEnd: tier === 'low',
      isTouchDevice: detectTouch(),
    });

    // Update on connectivity changes
    const onOnline = () => setCapability(prev => ({ ...prev, isOnline: true, connectionSpeed: detectConnectionSpeed() }));
    const onOffline = () => setCapability(prev => ({ ...prev, isOnline: false, connectionSpeed: 'offline' }));
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Update on reduced motion preference change
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (e: MediaQueryListEvent) => {
      setCapability(prev => ({ ...prev, prefersReducedMotion: e.matches, canAnimate: !e.matches && prev.tier !== 'low' }));
    };
    mq.addEventListener('change', onMotionChange);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      mq.removeEventListener('change', onMotionChange);
    };
  }, []);

  return (
    <DeviceContext.Provider value={capability}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDeviceCapability(): DeviceCapability {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDeviceCapability must be used within AdaptiveProvider');
  return ctx;
}

// ── Utility Components ──────────────────────────────────────────────────────

/**
 * Only renders children on devices at or above the given tier.
 * 
 * <ForTier min="high">
 *   <ParticleBackground />
 * </ForTier>
 */
export function ForTier({ min, children, fallback }: {
  min: DeviceTier;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { tier } = useDeviceCapability();
  const tiers: DeviceTier[] = ['low', 'mid', 'high'];
  const deviceLevel = tiers.indexOf(tier);
  const minLevel = tiers.indexOf(min);

  if (deviceLevel >= minLevel) return <>{children}</>;
  return fallback ? <>{fallback}</> : null;
}

/**
 * Get the optimal image URL based on device capability.
 * Assumes your image CDN supports quality/width params.
 * 
 * Adjust the URL pattern to match your CDN (Cloudflare, Vercel, imgix, etc.)
 */
export function getAdaptiveImageUrl(
  url: string,
  quality: ImageQuality,
  width?: number
): string {
  if (!url || url.startsWith('data:')) return url;

  const qualityMap: Record<ImageQuality, { q: number; w: number }> = {
    high: { q: 85, w: width || 800 },
    medium: { q: 70, w: width || 600 },
    low: { q: 50, w: width || 400 },
    thumbnail: { q: 30, w: width || 200 },
  };

  const { q, w } = qualityMap[quality];

  // Next.js Image Optimization API
  if (url.startsWith('/')) {
    return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`;
  }

  // For external URLs, return as-is (Next.js <Image> component handles optimization)
  return url;
}
