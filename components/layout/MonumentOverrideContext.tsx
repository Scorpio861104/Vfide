'use client';

/**
 * MonumentOverrideContext
 *
 * Lets any page temporarily override the global fixed MonumentBackdrop's
 * intensity and vertex colour. Designed for the ProofScore simulator:
 * dragging the slider calls setOverride({ score: 6500 }) and the monument
 * reacts immediately without a round-trip to the chain.
 *
 * Override is cleared automatically when the component that set it unmounts.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

interface MonumentOverride {
  /** 0–10000 — mapped to 0.1..0.9 intensity inside GlobalMonument */
  score: number;
}

interface MonumentOverrideCtx {
  override: MonumentOverride | null;
  setOverride: (v: MonumentOverride | null) => void;
}

const Ctx = createContext<MonumentOverrideCtx>({
  override: null,
  setOverride: () => {},
});

export function MonumentOverrideProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<MonumentOverride | null>(null);
  return <Ctx.Provider value={{ override, setOverride }}>{children}</Ctx.Provider>;
}

export function useMonumentOverride() {
  return useContext(Ctx);
}
